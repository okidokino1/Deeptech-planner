import { NextResponse } from "next/server";
import { env, features } from "@/lib/env";
import { getPlan } from "@/lib/plans";
import { planIdFromOrder, settleOrder } from "@/lib/payments";

export const runtime = "nodejs";

// PortOne 결제 완료 웹훅 — 결제 안전망.
// 사용자가 결제 후 브라우저를 닫아 complete가 호출되지 않아도, 웹훅이 혜택을 부여한다.
export async function POST(req: Request) {
  const body = await req.text();
  let payload: { paymentId?: string; data?: { paymentId?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // paymentId === orderId (requestPayment 시 orderId를 paymentId로 사용)
  const orderId = payload?.data?.paymentId || payload?.paymentId;
  if (!orderId) return NextResponse.json({ ok: false }, { status: 400 });

  if (features.portone) {
    try {
      const res = await fetch(
        `https://api.portone.io/payments/${encodeURIComponent(orderId)}`,
        { headers: { Authorization: `PortOne ${env.portoneApiSecret}` } }
      );
      const payment = await res.json();
      const plan = getPlan(planIdFromOrder(orderId));
      if (
        plan &&
        payment?.status === "PAID" &&
        payment?.amount?.total === plan.price
      ) {
        await settleOrder(orderId, "portone"); // 멱등: 이미 처리됐으면 무시
      }
    } catch {
      return NextResponse.json({ ok: false }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
