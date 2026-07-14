import { randomUUID } from "crypto";
import { env, features } from "./env";
import { getPlan, type Plan } from "./plans";
import { getSupabaseAdmin } from "./supabase/server";
import type { Profile } from "./types";

// 관리자(service_role) 기반 결제 DB 작업 가능 여부
const hasAdmin = () => features.supabase && !!env.supabaseServiceKey;

// 주문 ID에 planId를 인코딩 → 서버리스에서 별도 조회 없이도 플랜/금액 검증 가능.
// 형식: order_<planId>_<uuid>
export function newOrderId(plan: Plan): string {
  return `order_${plan.id}_${randomUUID()}`;
}

export function planIdFromOrder(orderId: string): string {
  return orderId.split("_")[1] || "";
}

// 데모/쿠키 경로용 혜택 계산
export function applyBenefits(user: Profile, plan: Plan): Profile {
  if (plan.kind === "subscription") return { ...user, plan: "pro" };
  if (plan.kind === "credit") return { ...user, credits: (user.credits ?? 0) + plan.credits };
  return user;
}

// 결제 준비: DB에 'ready' 주문 기록 (service_role 있을 때). 실패해도 결제 준비를 막지 않는다.
export async function createOrderRow(userId: string, plan: Plan, orderId: string) {
  if (!hasAdmin()) return;
  try {
    const sb = getSupabaseAdmin();
    await sb.from("payments").insert({
      user_id: userId,
      order_id: orderId,
      amount: plan.price,
      status: "ready",
      provider: "portone",
    });
  } catch (e) {
    console.error("[payments] createOrderRow 실패:", e);
  }
}

// 결제 확정(멱등): 이미 paid면 무시, 아니면 혜택 부여 후 paid 처리.
// complete 라우트와 웹훅 양쪽에서 호출되어도 1회만 반영된다.
export async function settleOrder(
  orderId: string,
  provider: string
): Promise<{ ok: boolean; already?: boolean }> {
  if (!hasAdmin()) return { ok: false };
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("payments")
    .select("user_id, amount, status")
    .eq("order_id", orderId)
    .single();
  if (!row) return { ok: false };
  if (row.status === "paid") return { ok: true, already: true };

  const plan = getPlan(planIdFromOrder(orderId));
  if (!plan) return { ok: false };

  const { data: prof } = await sb
    .from("profiles")
    .select("credits")
    .eq("id", row.user_id)
    .single();

  if (plan.kind === "subscription") {
    await sb.from("profiles").update({ plan: "pro" }).eq("id", row.user_id);
  } else if (plan.kind === "credit") {
    await sb
      .from("profiles")
      .update({ credits: (prof?.credits ?? 0) + plan.credits })
      .eq("id", row.user_id);
  }
  await sb.from("payments").update({ status: "paid", provider }).eq("order_id", orderId);
  return { ok: true };
}
