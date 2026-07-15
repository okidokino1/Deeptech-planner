import Link from "next/link";
import { Check, Rocket, ArrowLeft } from "lucide-react";
import { listPlans } from "@/lib/plans";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { CheckoutButton } from "@/components/CheckoutButton";

export const dynamic = "force-dynamic";

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const user = await getSessionUser();
  const { reason } = await searchParams;
  const plans = await listPlans();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Rocket className="h-5 w-5" />
            </span>
            <span className="font-bold text-slate-900">딥테크 플래너</span>
          </Link>
          <Link href={user ? "/dashboard" : "/"} className="inline-flex items-center gap-1.5 text-sm text-slate-500">
            <ArrowLeft className="h-4 w-4" /> {user ? "대시보드" : "홈"}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="text-center">
          {reason === "out-of-credits" && (
            <div className="mx-auto mb-6 max-w-lg rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
              무료 이용권을 모두 사용하셨습니다. 계속 이용하려면 이용권을 구매하거나 구독해 주세요.
            </div>
          )}
          <h1 className="text-3xl font-bold text-slate-900">요금제</h1>
          <p className="mt-2 text-slate-500">필요한 만큼만. 무료로 시작하고 언제든 업그레이드하세요.</p>
          {!features.portone && (
            <p className="mx-auto mt-4 inline-block rounded-full bg-amber-50 px-4 py-1.5 text-xs text-amber-700">
              현재 데모 모드입니다. PortOne 키를 연결하면 실제 카드·간편결제가 활성화됩니다.
            </p>
          )}
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`card relative flex flex-col p-7 ${
                plan.highlight ? "ring-2 ring-brand-500" : ""
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 chip bg-brand-600 text-white">
                  인기
                </span>
              )}
              <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">
                  {plan.price.toLocaleString()}
                </span>
                <span className="text-slate-500">원</span>
                <span className="ml-1 text-sm text-slate-400">/ {plan.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                {!user && plan.kind !== "free" ? (
                  <Link href="/login" className={plan.highlight ? "btn-primary w-full" : "btn-outline w-full"}>
                    로그인 후 결제
                  </Link>
                ) : (
                  <CheckoutButton plan={plan} />
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-slate-400">
          결제 관련 문의: (주)비지리츠 · 표시 금액은 부가세 포함 · 구독은 언제든 해지 가능
        </p>
      </div>
    </div>
  );
}
