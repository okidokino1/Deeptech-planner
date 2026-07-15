import { redirect } from "next/navigation";
import { Users, UserCheck, TrendingUp, Wallet, FolderKanban, FileCheck2 } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { getKpis } from "@/lib/crm";
import { AdminNav } from "@/components/admin/AdminNav";
import { KpiTrend } from "@/components/admin/KpiTrend";
import { CrmNotice } from "@/components/admin/CrmNotice";

export const dynamic = "force-dynamic";

export default async function AdminHomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isStaff) redirect("/dashboard");
  const isPlatform = !!user.isAdmin;

  const kpis = await getKpis({ role: user.role, orgId: user.orgId, isAdmin: user.isAdmin });

  const cards = [
    { label: "총 회원", value: `${kpis.totalMembers.toLocaleString()}명`, icon: Users, tone: "brand" as const, sub: `최근 7일 +${kpis.newMembers7d}` },
    { label: "유료 회원", value: `${kpis.paidMembers.toLocaleString()}명`, icon: UserCheck, tone: "emerald" as const, sub: `전환율 ${kpis.conversionRate}%` },
    { label: "총 매출", value: `${kpis.totalRevenue.toLocaleString()}원`, icon: Wallet, tone: "violet" as const, sub: `최근 7일 ${kpis.revenue7d.toLocaleString()}원` },
    { label: "총 프로젝트", value: `${kpis.totalProjects.toLocaleString()}개`, icon: FolderKanban, tone: "sky" as const, sub: "누적 기술기획" },
    { label: "완성 계획서", value: `${kpis.completedPlans.toLocaleString()}건`, icon: FileCheck2, tone: "amber" as const, sub: "사업계획서 완성" },
    { label: "전환율", value: `${kpis.conversionRate}%`, icon: TrendingUp, tone: "rose" as const, sub: "무료→유료" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM · 개요</h1>
          <p className="mt-1 text-slate-500">
            {isPlatform ? "전체 고객·매출 현황" : "우리 기관 회원 현황"}을 한눈에 확인합니다.
          </p>
        </div>
        <AdminNav isPlatformAdmin={isPlatform} />
      </div>

      {!features.supabase ? (
        <CrmNotice />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {cards.map((c) => {
              const tones: Record<string, string> = {
                brand: "bg-brand-50 text-brand-600",
                emerald: "bg-emerald-50 text-emerald-600",
                violet: "bg-violet-50 text-violet-600",
                sky: "bg-sky-50 text-sky-600",
                amber: "bg-amber-50 text-amber-600",
                rose: "bg-rose-50 text-rose-600",
              };
              return (
                <div key={c.label} className="card p-4">
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${tones[c.tone]}`}>
                    <c.icon className="h-4 w-4" />
                  </span>
                  <p className="mt-2 text-xl font-bold text-slate-900">{c.value}</p>
                  <p className="text-xs font-medium text-slate-600">{c.label}</p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
                </div>
              );
            })}
          </div>

          <div className="card p-6">
            <h2 className="font-bold text-slate-900">최근 14일 · 가입 & 매출 추이</h2>
            <div className="mt-2">
              <KpiTrend data={kpis.trend} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
