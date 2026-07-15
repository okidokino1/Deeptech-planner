"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Check } from "lucide-react";
import type { MemberDetail } from "@/lib/crm";

export function MemberEditor({
  member,
  orgs,
  isPlatform,
}: {
  member: MemberDetail;
  orgs: { id: string; name: string }[];
  isPlatform: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(member.name);
  const [plan, setPlan] = useState(member.plan);
  const [credits, setCredits] = useState(member.credits);
  const [status, setStatus] = useState(member.status);
  const [tags, setTags] = useState(member.tags.join(", "));
  const [memo, setMemo] = useState(member.memo || "");
  const [orgId, setOrgId] = useState(member.orgId || "");
  const [role, setRole] = useState(member.role);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const patch: Record<string, unknown> = {
        name,
        plan,
        credits: Number(credits),
        status,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        memo,
      };
      if (isPlatform) {
        patch.orgId = orgId || null;
        patch.role = role;
      }
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateMember", id: member.id, patch }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "저장 실패");
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 중 오류");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="font-bold text-slate-900">회원 정보 수정</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">이름</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">상태</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">활성</option>
            <option value="dormant">휴면</option>
          </select>
        </div>
        <div>
          <label className="label">요금제</label>
          <select className="input" value={plan} onChange={(e) => setPlan(e.target.value as "free" | "pro")}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </div>
        <div>
          <label className="label">이용권 (회)</label>
          <input type="number" className="input" value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
        </div>
        <div className="sm:col-span-2">
          <label className="label">태그 (쉼표로 구분)</label>
          <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: VIP, 이탈위험, 재구매" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">관리 메모</label>
          <textarea className="input min-h-24" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="상담 내용, 특이사항 등" />
        </div>

        {isPlatform && (
          <>
            <div>
              <label className="label">소속 기관</label>
              <select className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
                <option value="">(없음)</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">역할</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as MemberDetail["role"])}>
                <option value="member">회원</option>
                <option value="org_admin">기관 관리자</option>
                <option value="admin">플랫폼 관리자</option>
              </select>
            </div>
          </>
        )}
      </div>

      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving} className="btn-primary">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          저장
        </button>
      </div>
    </div>
  );
}
