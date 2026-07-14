import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getPlan } from "@/lib/plans";
import { newOrderId, createOrderRow } from "@/lib/payments";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const { planId } = await req.json();
  const plan = getPlan(planId);
  if (!plan || plan.kind === "free") {
    return NextResponse.json({ error: "잘못된 요금제입니다." }, { status: 400 });
  }

  const orderId = newOrderId(plan);
  await createOrderRow(user.id, plan, orderId); // 서버리스 안전망: DB에 'ready' 주문 기록
  return NextResponse.json({ orderId, amount: plan.price, planId: plan.id });
}
