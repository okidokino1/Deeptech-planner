import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileCheck2, Circle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getMember, listOrganizations } from "@/lib/crm";
import { MemberEditor } from "@/components/admin/MemberEditor";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEP_LABELS = ["문제정의", "아키텍처", "차별화", "기획초안", "계획서"];

export default async function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!user.isStaff) redirect("/dashboard");
  const viewer = { role: user.role, orgId: user.orgId, isAdmin: user.isAdmin };

  const member = await getMember(viewer, id);
  if (!member) notFound();
  const orgs = user.isAdmin ? await listOrganizations(viewer) : [];

  return (
    <div className="space-y-6">
      <Link href="/admin/members" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> 회원 목록
      </Link>

      {/* 요약 */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{member.name || "(이름 없음)"}</h1>
            <p className="mt-1 text-sm text-slate-500">{member.email}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-slate-400">가입일</p>
            <p className="font-medium text-slate-700">{member.createdAt ? formatDate(member.createdAt) : "-"}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { l: "요금제", v: member.plan === "pro" ? "Pro" : "Free" },
            { l: "이용권", v: `${member.credits}회` },
            { l: "프로젝트", v: `${member.projectCount}개` },
            { l: "완성 계획서", v: `${member.completedPlans}건` },
            { l: "총 결제액", v: `${member.totalSpend.toLocaleString()}원` },
            { l: "상태", v: member.status === "dormant" ? "휴면" : "활성" },
            { l: "기관", v: member.orgName || "-" },
            { l: "역할", v: member.role === "org_admin" ? "기관관리자" : member.role === "admin" ? "관리자" : "회원" },
          ].map((s) => (
            <div key={s.l} className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">{s.l}</p>
              <p className="mt-0.5 font-bold text-slate-900">{s.v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 가입 정보 */}
      <div className="card p-6">
        <h2 className="font-bold text-slate-900">가입 정보</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-slate-500">휴대폰</dt>
            <dd className="text-slate-800">
              {member.phone || "-"}
              {member.phone && member.phoneVerified && (
                <span className="ml-1 chip bg-emerald-50 px-1.5 py-0.5 text-[10px] text-emerald-700">인증</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">생년월일</dt>
            <dd className="text-slate-800">{member.birthdate || "-"}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">성별</dt>
            <dd className="text-slate-800">
              {member.gender === "male" ? "남성" : member.gender === "female" ? "여성" : member.gender === "other" ? "기타" : "-"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">집주소</dt>
            <dd className="text-slate-800">{member.address || "-"}</dd>
          </div>
        </dl>
      </div>

      {/* 편집 */}
      <MemberEditor member={member} orgs={orgs.map((o) => ({ id: o.id, name: o.name }))} isPlatform={!!user.isAdmin} />

      {/* 이력 */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">기술기획 프로젝트</h2>
          <div className="mt-3 space-y-2">
            {member.projects.length ? (
              member.projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700">{p.title}</span>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(p.updatedAt)}</span>
                  {p.done ? (
                    <span className="chip shrink-0 bg-emerald-50 text-emerald-700">
                      <FileCheck2 className="h-3 w-3" /> 완성
                    </span>
                  ) : (
                    <span className="chip shrink-0 bg-slate-100 text-slate-500">
                      <Circle className="h-3 w-3" /> {STEP_LABELS[Math.min(4, Math.max(0, (p.step || 1) - 1))]}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">프로젝트 없음</p>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-bold text-slate-900">결제 이력</h2>
          <div className="mt-3 space-y-2">
            {member.payments.length ? (
              member.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{p.amount.toLocaleString()}원</span>
                  <span className="chip bg-slate-100 text-slate-500">{p.provider || "-"}</span>
                  <span className="text-slate-500">{p.paidAt ? formatDate(p.paidAt) : "-"}</span>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-slate-400">결제 이력 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
