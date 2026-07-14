"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { publicFeatures, env } from "@/lib/env";
import type { Plan } from "@/lib/plans";

export function CheckoutButton({ plan }: { plan: Plan }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (plan.kind === "free") {
    return (
      <button onClick={() => router.push("/signup")} className="btn-outline w-full">
        무료로 시작하기
      </button>
    );
  }

  async function pay() {
    setLoading(true);
    setMsg("");
    try {
      // 1) 주문 생성
      const prep = await fetch("/api/payments/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      }).then((r) => r.json());

      if (!prep.orderId) throw new Error(prep.error || "주문 생성 실패");

      if (publicFeatures.portone) {
        // 2) PortOne 결제창 호출
        const PortOne = (await import("@portone/browser-sdk/v2")).default;
        const resp = await PortOne.requestPayment({
          storeId: env.portoneStoreId,
          channelKey: env.portoneChannelKey,
          paymentId: prep.orderId,
          orderName: plan.name,
          totalAmount: plan.price,
          currency: "CURRENCY_KRW",
          payMethod: "CARD",
        });
        if (resp?.code) throw new Error(resp.message || "결제가 취소되었습니다.");

        // 3) 서버 검증
        const done = await fetch("/api/payments/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: prep.orderId, paymentId: resp?.paymentId, planId: plan.id }),
        }).then((r) => r.json());
        if (!done.ok) throw new Error(done.error || "결제 검증 실패");
      } else {
        // 데모 모드: 결제창 없이 이용권 지급
        const done = await fetch("/api/payments/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: prep.orderId, planId: plan.id, demo: true }),
        }).then((r) => r.json());
        if (!done.ok) throw new Error(done.error || "처리 실패");
      }

      setMsg("완료되었습니다! 이용권이 적용되었어요.");
      router.refresh();
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "결제 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={pay}
        disabled={loading}
        className={plan.highlight ? "btn-primary w-full" : "btn-outline w-full"}
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {publicFeatures.portone ? "결제하기" : "이용권 받기 (데모)"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-slate-500">{msg}</p>}
    </div>
  );
}
