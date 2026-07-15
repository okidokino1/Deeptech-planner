import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { listMembers } from "@/lib/crm";
import { AdminNav } from "@/components/admin/AdminNav";
import { MembersTable } from "@/components/admin/MembersTable";
import { CrmNotice } from "@/components/admin/CrmNotice";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isStaff) redirect("/dashboard");

  const members = features.supabase
    ? await listMembers({ role: user.role, orgId: user.orgId, isAdmin: user.isAdmin })
    : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM · 회원</h1>
          <p className="mt-1 text-slate-500">회원별 기술기획·결제·활동을 확인하고 관리합니다.</p>
        </div>
        <AdminNav isPlatformAdmin={!!user.isAdmin} />
      </div>

      {features.supabase ? <MembersTable members={members} /> : <CrmNotice />}
    </div>
  );
}
