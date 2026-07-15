// 요금제(플랜) — DB(plans 테이블) 기반. Supabase 미설정 시 기본값으로 동작.
// 공개 조회(listPlans/getPlan)와 관리자 편집(listAllPlans/savePlan/deletePlan)을 제공한다.
// 결제 금액·이용권은 항상 서버에서 이 값을 신뢰(authoritative)한다.

import { env, features } from "./env";
import { getSupabaseAdmin } from "./supabase/server";

export interface Plan {
  id: string;
  name: string;
  price: number; // KRW
  period: string;
  kind: "free" | "credit" | "subscription";
  credits: number; // 지급 이용권 (subscription은 무제한 표시)
  features: string[];
  highlight?: boolean;
  sortOrder?: number;
  active?: boolean;
}

// 기본값 (DB 미설정/미시드 시 폴백) — plans.sql 시드와 동일
export const DEFAULT_PLANS: Plan[] = [
  {
    id: "free",
    name: "무료 체험",
    price: 0,
    period: "가입 시",
    kind: "free",
    credits: 1,
    features: ["사업계획서 1건 무료 완성", "기술기획 마법사 전체", "발표연습 1회", "Word(.docx) 내보내기"],
    sortOrder: 0,
    active: true,
  },
  {
    id: "credit10",
    name: "이용권 10회",
    price: 49000,
    period: "1회 결제",
    kind: "credit",
    credits: 10,
    features: ["계획서 완성·발표 채점 10회", "AI 정밀 기획·작성", "차별화·핵심 IP 도출", "유효기간 없음"],
    highlight: true,
    sortOrder: 1,
    active: true,
  },
  {
    id: "pro",
    name: "Pro 무제한",
    price: 99000,
    period: "월 구독",
    kind: "subscription",
    credits: 9999,
    features: ["계획서 완성·발표 채점 무제한", "프로젝트 무제한 관리", "예상 Q&A 코칭", "우선 지원"],
    sortOrder: 2,
    active: true,
  },
];

const hasDb = () => features.supabase && !!env.supabaseServiceKey;

function mapRow(r: Record<string, unknown>): Plan {
  return {
    id: r.id as string,
    name: (r.name as string) || "",
    price: (r.price as number) ?? 0,
    period: (r.period as string) || "",
    kind: ((r.kind as string) || "credit") as Plan["kind"],
    credits: (r.credits as number) ?? 0,
    features: (r.features as string[]) || [],
    highlight: !!r.highlight,
    sortOrder: (r.sort_order as number) ?? 0,
    active: r.active !== false,
  };
}

// 공개: 요금제 페이지용 (활성 플랜, 정렬)
export async function listPlans(): Promise<Plan[]> {
  if (!hasDb()) return DEFAULT_PLANS.filter((p) => p.active !== false);
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("plans").select("*").eq("active", true).order("sort_order");
    if (data && data.length) return data.map(mapRow);
  } catch (e) {
    console.error("[plans] listPlans 실패, 기본값 사용:", e);
  }
  return DEFAULT_PLANS.filter((p) => p.active !== false);
}

// 결제/조회용 단일 플랜
export async function getPlan(id: string): Promise<Plan | undefined> {
  if (!hasDb()) return DEFAULT_PLANS.find((p) => p.id === id);
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("plans").select("*").eq("id", id).single();
    if (data) return mapRow(data);
  } catch {
    // 미존재 등 → 기본값 폴백
  }
  return DEFAULT_PLANS.find((p) => p.id === id);
}

// --- 관리자(플랫폼 관리자) ---
export async function listAllPlans(): Promise<Plan[]> {
  if (!hasDb()) return DEFAULT_PLANS;
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb.from("plans").select("*").order("sort_order");
    return (data && data.length ? data.map(mapRow) : DEFAULT_PLANS);
  } catch {
    return DEFAULT_PLANS;
  }
}

export async function savePlan(p: Plan): Promise<{ ok: boolean; id?: string }> {
  if (!hasDb()) return { ok: false };
  const sb = getSupabaseAdmin();
  // 새 플랜이면 id 자동 생성. 주문ID 인코딩(order_<id>_<uuid>)과 충돌하지 않도록 언더바 제거.
  const id = (p.id && p.id.trim() ? p.id : `plan-${Math.random().toString(36).slice(2, 8)}`)
    .replace(/_/g, "-")
    .trim();
  const kind: Plan["kind"] = ["free", "credit", "subscription"].includes(p.kind) ? p.kind : "credit";
  const { error } = await sb.from("plans").upsert({
    id,
    name: p.name || "새 요금제",
    price: Math.max(0, Math.round(p.price || 0)),
    period: p.period || "",
    kind,
    credits: Math.max(0, Math.round(p.credits || 0)),
    features: (p.features || []).filter((f) => f.trim()),
    highlight: !!p.highlight,
    sort_order: p.sortOrder ?? 0,
    active: p.active !== false,
  });
  if (error) {
    console.error("[plans] savePlan 실패:", error);
    return { ok: false };
  }
  return { ok: true, id };
}

export async function deletePlan(id: string): Promise<boolean> {
  if (!hasDb()) return false;
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("plans").delete().eq("id", id);
  return !error;
}
