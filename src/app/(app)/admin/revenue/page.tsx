import { redirect } from "next/navigation";
import { Wallet, CalendarClock, UserCheck, TrendingUp } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { getKpis, listPayments } from "@/lib/crm";
import { AdminNav } from "@/components/admin/AdminNav";
import { KpiTrend } from "@/components/admin/KpiTrend";
import { CrmNotice } from "@/components/admin/CrmNotice";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isStaff) redirect("/dashboard");
  const viewer = { role: user.role, orgId: user.orgId, isAdmin: user.isAdmin };

  const [kpis, payments] = features.supabase
    ? await Promise.all([getKpis(viewer), listPayments(viewer)])
    : [null, []];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM · 매출</h1>
          <p className="mt-1 text-slate-500">결제·매출 현황과 내역을 분석합니다.</p>
        </div>
        <AdminNav isPlatformAdmin={!!user.isAdmin} />
      </div>

      {!features.supabase || !kpis ? (
        <CrmNotice />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: "총 매출", v: `${kpis.totalRevenue.toLocaleString()}원`, icon: Wallet, t: "violet" },
              { l: "최근 7일 매출", v: `${kpis.revenue7d.toLocaleString()}원`, icon: CalendarClock, t: "brand" },
              { l: "유료 회원", v: `${kpis.paidMembers}명`, icon: UserCheck, t: "emerald" },
              { l: "전환율", v: `${kpis.conversionRate}%`, icon: TrendingUp, t: "amber" },
            ].map((c) => {
              const tones: Record<string, string> = {
                violet: "bg-violet-50 text-violet-600",
                brand: "bg-brand-50 text-brand-600",
                emerald: "bg-emerald-50 text-emerald-600",
                amber: "bg-amber-50 text-amber-600",
              };
              return (
                <div key={c.l} className="card p-4">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[c.t]}`}>
                    <c.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-xl font-bold text-slate-900">{c.v}</p>
                  <p className="text-xs text-slate-500">{c.l}</p>
                </div>
              );
            })}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-slate-900">최근 14일 매출 추이</h2>
            <div className="mt-2">
              <KpiTrend data={kpis.trend} />
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-bold text-slate-900">결제 내역 <span className="text-sm font-normal text-slate-400">({payments.length}건)</span></h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">회원</th>
                    <th className="px-5 py-3 font-medium">금액</th>
                    <th className="px-5 py-3 font-medium">수단</th>
                    <th className="px-5 py-3 font-medium">결제일시</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium text-slate-700">{p.userName}</td>
                      <td className="px-5 py-3 font-semibold text-slate-900">{p.amount.toLocaleString()}원</td>
                      <td className="px-5 py-3">
                        <span className="chip bg-slate-100 text-slate-600">{p.provider || "-"}</span>
                      </td>
                      <td className="px-5 py-3 text-slate-500">{p.paidAt ? formatDate(p.paidAt) : "-"}</td>
                    </tr>
                  ))}
                  {!payments.length && (
                    <tr>
                      <td colSpan={4} className="px-5 py-10 text-center text-slate-400">결제 내역이 없습니다.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
