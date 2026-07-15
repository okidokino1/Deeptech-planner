import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { listAllPlans } from "@/lib/plans";
import { AdminNav } from "@/components/admin/AdminNav";
import { PlanManager } from "@/components/admin/PlanManager";

export const dynamic = "force-dynamic";

export default async function AdminPlansPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // 요금제 관리는 플랫폼 관리자 전용
  if (!user.isAdmin) redirect("/admin");

  const plans = await listAllPlans();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM · 요금제 관리</h1>
          <p className="mt-1 text-slate-500">요금제의 가격·혜택·이용권을 직접 수정합니다. 저장 즉시 요금제 페이지·결제에 반영됩니다.</p>
        </div>
        <AdminNav isPlatformAdmin />
      </div>

      <PlanManager plans={plans} canSave={features.supabase} />
    </div>
  );
}
