"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import type { MemberRow } from "@/lib/crm";
import { formatDate, relativeTime } from "@/lib/utils";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700",
  dormant: "bg-slate-100 text-slate-500",
};
const ROLE_LABEL: Record<string, string> = { member: "회원", org_admin: "기관관리자", admin: "관리자" };

export function MembersTable({ members }: { members: MemberRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [plan, setPlan] = useState("all");

  const rows = useMemo(() => {
    return members.filter((m) => {
      if (status !== "all" && m.status !== status) return false;
      if (plan !== "all" && m.plan !== plan) return false;
      if (q) {
        const s = q.toLowerCase();
        if (!m.email.toLowerCase().includes(s) && !(m.name || "").toLowerCase().includes(s) && !(m.orgName || "").toLowerCase().includes(s))
          return false;
      }
      return true;
    });
  }, [members, q, status, plan]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="이름·이메일·기관 검색"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">상태 전체</option>
          <option value="active">활성</option>
          <option value="dormant">휴면</option>
        </select>
        <select className="input w-auto" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="all">요금제 전체</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
        </select>
        <span className="ml-auto text-sm text-slate-500">{rows.length}명</span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[880px] text-sm">
          <thead className="bg-slate-50 text-left text-xs text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">회원</th>
              <th className="px-4 py-3 font-medium">기관</th>
              <th className="px-4 py-3 font-medium">요금제</th>
              <th className="px-4 py-3 font-medium">이용권</th>
              <th className="px-4 py-3 font-medium">프로젝트</th>
              <th className="px-4 py-3 font-medium">완성 계획서</th>
              <th className="px-4 py-3 font-medium">결제액</th>
              <th className="px-4 py-3 font-medium">상태</th>
              <th className="px-4 py-3 font-medium">최근활동</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 font-medium text-slate-800">
                    {m.name || "-"}
                    {m.role !== "member" && (
                      <span className="chip bg-brand-50 px-1.5 py-0.5 text-[10px] text-brand-700">{ROLE_LABEL[m.role]}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{m.email}</div>
                  {m.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {m.tags.map((t) => (
                        <span key={t} className="chip bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600">{t}</span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{m.orgName || "-"}</td>
                <td className="px-4 py-3">
                  <span className={`chip ${m.plan === "pro" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                    {m.plan === "pro" ? "Pro" : "Free"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{m.credits}회</td>
                <td className="px-4 py-3 text-slate-700">{m.projectCount}개</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{m.completedPlans}건</td>
                <td className="px-4 py-3 text-slate-700">{m.totalSpend.toLocaleString()}원</td>
                <td className="px-4 py-3">
                  <span className={`chip ${STATUS_STYLE[m.status] || STATUS_STYLE.active}`}>
                    {m.status === "dormant" ? "휴면" : "활성"}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500" title={m.lastActive ? formatDate(m.lastActive) : ""}>
                  {m.lastActive ? relativeTime(m.lastActive) : "-"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/members/${m.id}`} className="text-xs font-semibold text-brand-600">
                    상세 →
                  </Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
