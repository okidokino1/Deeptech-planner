import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser, encodeDemoUser, DEMO_COOKIE_NAME } from "@/lib/auth";
import { env, features } from "@/lib/env";
import { getPlan } from "@/lib/plans";
import { applyBenefits, settleOrder } from "@/lib/payments";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { orderId, paymentId, planId, demo } = await req.json();
  const plan = getPlan(planId);
  if (!plan || plan.kind === "free") {
    return NextResponse.json({ error: "유효하지 않은 요금제입니다." }, { status: 400 });
  }

  // 실 결제: PortOne 서버 검증 (결제금액이 해당 플랜 가격과 일치하는지)
  if (features.portone && !demo) {
    if (!env.portoneApiSecret) {
      const raw = process.env.PORTONE_API_SECRET || "";
      console.error(
        `[pay] PORTONE_API_SECRET 무효. rawLen=${raw.length} (0=미설정, >0=비ASCII손상)`
      );
      return NextResponse.json(
        { error: "결제 검증 설정 오류: API Secret이 없습니다. 관리자에게 문의하세요." },
        { status: 500 }
      );
    }
    try {
      const verify = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
        { headers: { Authorization: `PortOne ${env.portoneApiSecret}` } }
      );
      const payment = await verify.json();
      const paidAmount = payment?.amount?.total;
      console.log(
        "[pay] verify",
        JSON.stringify({
          http: verify.status,
          status: payment?.status,
          paidAmount,
          expected: plan.price,
          paymentId,
          secretLen: env.portoneApiSecret.length,
          msg: payment?.message || payment?.type,
        })
      );
      if (payment?.status !== "PAID" || paidAmount !== plan.price) {
        return NextResponse.json(
          {
            error: `결제 검증 실패 (status=${payment?.status ?? "?"}, amount=${
              paidAmount ?? "?"
            }/${plan.price})`,
          },
          { status: 400 }
        );
      }
    } catch (e) {
      console.error("[pay] verify 예외:", e);
      return NextResponse.json({ error: "결제 검증 중 오류가 발생했습니다." }, { status: 500 });
    }
  }

  // 혜택 반영 (멱등: 웹훅과 중복 호출돼도 1회만)
  if (features.supabase) {
    await settleOrder(orderId, features.portone && !demo ? "portone" : "demo");
  } else {
    const updated = applyBenefits(user, plan);
    const store = await cookies();
    store.set(DEMO_COOKIE_NAME, encodeDemoUser(updated), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  return NextResponse.json({ ok: true });
}
