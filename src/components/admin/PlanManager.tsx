"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2, Loader2, Star, GripVertical } from "lucide-react";
import type { Plan } from "@/lib/plans";

interface Draft extends Plan {
  featuresText: string;
  _key: string;
}

const toDraft = (p: Plan, i: number): Draft => ({
  ...p,
  featuresText: (p.features || []).join("\n"),
  _key: p.id || `new-${i}`,
});

export function PlanManager({ plans, canSave }: { plans: Plan[]; canSave: boolean }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Draft[]>(() => plans.map(toDraft));
  const [busy, setBusy] = useState<string | null>(null);

  function update(key: string, patch: Partial<Draft>) {
    setDrafts((ds) => ds.map((d) => (d._key === key ? { ...d, ...patch } : d)));
  }

  function addNew() {
    setDrafts((ds) => [
      ...ds,
      toDraft(
        { id: "", name: "새 요금제", price: 0, period: "1회 결제", kind: "credit", credits: 0, features: [], highlight: false, sortOrder: ds.length, active: true },
        ds.length
      ),
    ]);
  }

  async function save(d: Draft) {
    if (!canSave) return alert("요금제 저장은 Supabase 연결 시 가능합니다. (배포 환경에서 동작)");
    setBusy(d._key);
    try {
      const plan: Plan = {
        id: d.id,
        name: d.name,
        price: Number(d.price) || 0,
        period: d.period,
        kind: d.kind,
        credits: Number(d.credits) || 0,
        features: d.featuresText.split("\n").map((s) => s.trim()).filter(Boolean),
        highlight: !!d.highlight,
        sortOrder: Number(d.sortOrder) || 0,
        active: d.active !== false,
      };
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", plan }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "저장 실패");
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "저장 중 오류");
    } finally {
      setBusy(null);
    }
  }

  async function remove(d: Draft) {
    if (!d.id) {
      // 저장 전 새 카드 → 로컬 제거
      setDrafts((ds) => ds.filter((x) => x._key !== d._key));
      return;
    }
    if (!confirm(`"${d.name}" 요금제를 삭제할까요?`)) return;
    setBusy(d._key);
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", id: d.id }),
      });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error || "삭제 실패");
      setDrafts((ds) => ds.filter((x) => x._key !== d._key));
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "삭제 중 오류");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      {!canSave && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          현재 화면은 미리보기입니다. 실제 저장·수정은 <b>Supabase가 연결된 배포 환경</b>에서 동작합니다.
        </div>
      )}

      <div className="flex justify-end">
        <button onClick={addNew} className="btn-outline">
          <Plus className="h-4 w-4" /> 새 요금제 추가
        </button>
      </div>

      <div className="space-y-4">
        {drafts.map((d) => (
          <div key={d._key} className="card p-5">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-slate-300" />
              <span className="text-xs font-mono text-slate-400">{d.id || "(새 요금제 · 저장 시 ID 자동생성)"}</span>
              <div className="ml-auto flex items-center gap-2">
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={!!d.highlight} onChange={(e) => update(d._key, { highlight: e.target.checked })} />
                  <Star className="h-3.5 w-3.5" /> 인기
                </label>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input type="checkbox" checked={d.active !== false} onChange={(e) => update(d._key, { active: e.target.checked })} />
                  노출
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2">
                <label className="label">요금제 이름</label>
                <input className="input" value={d.name} onChange={(e) => update(d._key, { name: e.target.value })} />
              </div>
              <div>
                <label className="label">가격 (원)</label>
                <input type="number" className="input" value={d.price} onChange={(e) => update(d._key, { price: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">결제 주기</label>
                <input className="input" value={d.period} onChange={(e) => update(d._key, { period: e.target.value })} placeholder="예: 1회 결제 / 월 구독" />
              </div>
              <div>
                <label className="label">유형</label>
                <select className="input" value={d.kind} onChange={(e) => update(d._key, { kind: e.target.value as Plan["kind"] })}>
                  <option value="free">무료(free)</option>
                  <option value="credit">이용권(credit)</option>
                  <option value="subscription">구독(subscription)</option>
                </select>
              </div>
              <div>
                <label className="label">지급 이용권 (회)</label>
                <input type="number" className="input" value={d.credits} onChange={(e) => update(d._key, { credits: Number(e.target.value) })} />
              </div>
              <div>
                <label className="label">정렬 순서</label>
                <input type="number" className="input" value={d.sortOrder ?? 0} onChange={(e) => update(d._key, { sortOrder: Number(e.target.value) })} />
              </div>
              <div className="sm:col-span-2 lg:col-span-4">
                <label className="label">혜택 (한 줄에 하나씩)</label>
                <textarea
                  className="input min-h-24"
                  value={d.featuresText}
                  onChange={(e) => update(d._key, { featuresText: e.target.value })}
                  placeholder={"계획서 완성·발표 채점 10회\nAI 정밀 기획·작성"}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button onClick={() => remove(d)} disabled={busy === d._key} className="btn-ghost text-rose-600 hover:bg-rose-50">
                <Trash2 className="h-4 w-4" /> 삭제
              </button>
              <button onClick={() => save(d)} disabled={busy === d._key} className="btn-primary">
                {busy === d._key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} 저장
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-slate-400">
        · 유형이 <b>이용권(credit)</b>이면 결제 시 위 이용권 수만큼 지급됩니다. <b>구독(subscription)</b>이면 Pro(무제한)로 전환됩니다.
        <br />· 가격을 바꾸면 결제창 금액과 서버 검증 금액이 모두 이 값으로 적용됩니다.
      </p>
    </div>
  );
}
