"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Plus, Loader2, UserCog } from "lucide-react";
import type { OrgRow } from "@/lib/crm";

interface MiniMember { id: string; name: string; email: string; orgId: string | null; role: string }

export function OrgManager({ orgs, members }: { orgs: OrgRow[]; members: MiniMember[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [memo, setMemo] = useState("");

  async function call(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "처리 실패");
      router.refresh();
      return true;
    } catch (e) {
      alert(e instanceof Error ? e.message : "오류");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function createOrg() {
    if (!name.trim()) return alert("기관명을 입력하세요.");
    const ok = await call({ action: "createOrg", name, contactEmail: email, contactPhone: phone, memo });
    if (ok) {
      setName(""); setEmail(""); setPhone(""); setMemo("");
    }
  }

  return (
    <div className="space-y-6">
      {/* 기관 등록 */}
      <div className="card p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Plus className="h-4 w-4 text-brand-600" /> 기관 등록
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">기관명 *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="예: OO대학교 창업지원단" />
          </div>
          <div>
            <label className="label">담당자 이메일</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@example.com" />
          </div>
          <div>
            <label className="label">연락처</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="02-000-0000" />
          </div>
          <div>
            <label className="label">메모</label>
            <input className="input" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="계약 정보 등" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={createOrg} disabled={busy} className="btn-primary">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} 기관 등록
          </button>
        </div>
      </div>

      {/* 기관 목록 */}
      <div className="space-y-4">
        {orgs.map((o) => (
          <OrgCard key={o.id} org={o} members={members} onCall={call} busy={busy} />
        ))}
        {!orgs.length && (
          <div className="card p-8 text-center text-slate-400">등록된 기관이 없습니다.</div>
        )}
      </div>
    </div>
  );
}

function OrgCard({
  org,
  members,
  onCall,
  busy,
}: {
  org: OrgRow;
  members: MiniMember[];
  onCall: (b: Record<string, unknown>) => Promise<boolean>;
  busy: boolean;
}) {
  const [pick, setPick] = useState("");
  const admins = members.filter((m) => m.orgId === org.id && m.role === "org_admin");

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <Building2 className="h-5 w-5 text-brand-600" /> {org.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {org.contactEmail || "이메일 없음"} · {org.contactPhone || "연락처 없음"}
          </p>
          {org.memo && <p className="mt-1 text-xs text-slate-400">{org.memo}</p>}
        </div>
        <span className="chip bg-slate-100 text-slate-600">회원 {org.memberCount ?? 0}명</span>
      </div>

      {/* 기관 관리자 */}
      <div className="mt-4 rounded-xl bg-slate-50 p-4">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <UserCog className="h-4 w-4" /> 기관 관리자
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {admins.length ? (
            admins.map((a) => (
              <span key={a.id} className="chip bg-white text-xs text-slate-700">
                {a.name || a.email}
                <button
                  onClick={() => onCall({ action: "setOrgAdmin", userId: a.id, orgId: null })}
                  className="ml-1 text-slate-400 hover:text-rose-500"
                  title="해제"
                >
                  ✕
                </button>
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">지정된 관리자 없음</span>
          )}
        </div>
        <div className="mt-3 flex gap-2">
          <select className="input py-1.5" value={pick} onChange={(e) => setPick(e.target.value)}>
            <option value="">회원 선택…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name || m.email} ({m.email})</option>
            ))}
          </select>
          <button
            disabled={busy || !pick}
            onClick={async () => {
              if (await onCall({ action: "setOrgAdmin", userId: pick, orgId: org.id })) setPick("");
            }}
            className="btn-outline shrink-0 py-1.5"
          >
            관리자 지정
          </button>
        </div>
      </div>
    </div>
  );
}
