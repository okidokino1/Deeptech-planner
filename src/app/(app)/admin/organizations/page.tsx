import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";
import { listOrganizations, listMembers } from "@/lib/crm";
import { AdminNav } from "@/components/admin/AdminNav";
import { OrgManager } from "@/components/admin/OrgManager";
import { CrmNotice } from "@/components/admin/CrmNotice";

export const dynamic = "force-dynamic";

export default async function OrganizationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // 기관 관리는 플랫폼 관리자 전용
  if (!user.isAdmin) redirect("/admin");
  const viewer = { role: user.role, orgId: user.orgId, isAdmin: user.isAdmin };

  const [orgs, members] = features.supabase
    ? await Promise.all([listOrganizations(viewer), listMembers(viewer)])
    : [[], []];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">CRM · 기관</h1>
          <p className="mt-1 text-slate-500">기관(대학·기업·기관)을 등록하고 기관 관리자를 지정합니다.</p>
        </div>
        <AdminNav isPlatformAdmin />
      </div>

      {features.supabase ? (
        <OrgManager
          orgs={orgs}
          members={members.map((m) => ({ id: m.id, name: m.name, email: m.email, orgId: m.orgId, role: m.role }))}
        />
      ) : (
        <CrmNotice />
      )}
    </div>
  );
}
