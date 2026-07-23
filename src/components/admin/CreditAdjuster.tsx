"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ticket, Plus, Minus, History, AlertCircle } from "lucide-react";
import type { CreditLogRow } from "@/lib/crm";
import { formatDate } from "@/lib/utils";

const QUICK = [1, 3, 5, 10];

export function CreditAdjuster({
  memberId,
  credits,
  plan,
  logs,
}: {
  memberId: string;
  credits: number;
  plan: "free" | "pro";
  logs: CreditLogRow[];
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"give" | "take" | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function apply(sign: 1 | -1) {
    const n = Math.floor(Number(amount));
    if (!n || n < 1) {
      setError("조정할 수량을 1 이상으로 입력하세요.");
      return;
    }
    setBusy(sign === 1 ? "give" : "take");
    setError("");
    setDone("");
    try {
      const res = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adjustCredits", id: memberId, delta: sign * n, reason }),
      });
      const d = await res.json();
      if (!d.ok) throw new Error(d.error || "조정에 실패했습니다.");
      setDone(`${sign === 1 ? "지급" : "차감"} 완료 — 현재 잔여 ${d.credits}회`);
      setReason("");
      router.refresh();
      setTimeout(() => setDone(""), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "조정 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Ticket className="h-4 w-4 text-brand-600" /> 이용권 조정
        </h2>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs text-slate-500">현재 잔여</span>
          <span className="text-2xl font-bold text-brand-700">{credits}</span>
          <span className="text-sm text-slate-500">회</span>
        </div>
      </div>

      {plan === "pro" && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          이 회원은 <b>Pro(무제한)</b>라 이용권이 차감되지 않습니다. 잔여 수치는 Free 전환 시 적용됩니다.
        </p>
      )}

      {/* 수량 선택 */}
      <div className="mt-4">
        <label className="label">조정 수량</label>
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setAmount(q)}
              className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                amount === q
                  ? "border-brand-500 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {q}회
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="input w-24"
            aria-label="직접 입력"
          />
        </div>
      </div>

      {/* 사유 */}
      <div className="mt-4">
        <label className="label">사유 (이력에 함께 저장됩니다)</label>
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="예: 생성 오류 보상, 프로모션 지급, 오지급 회수"
        />
      </div>

      {/* 실행 */}
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => apply(1)} disabled={busy !== null} className="btn-primary">
          {busy === "give" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {amount}회 지급
        </button>
        <button onClick={() => apply(-1)} disabled={busy !== null} className="btn-outline">
          {busy === "take" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Minus className="h-4 w-4" />}
          {amount}회 차감
        </button>
      </div>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {done && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{done}</p>
      )}

      {/* 이력 */}
      <div className="mt-6 border-t border-slate-100 pt-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <History className="h-3.5 w-3.5" /> 조정 이력
        </h3>
        <div className="mt-3 space-y-1.5">
          {logs.length ? (
            logs.map((l, i) => (
              <div
                key={i}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-slate-100 px-3 py-2 text-sm"
              >
                <span
                  className={`shrink-0 font-bold ${l.delta > 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {l.delta > 0 ? "+" : ""}
                  {l.delta}회
                </span>
                <span className="shrink-0 text-xs text-slate-400">
                  {l.before} → {l.after}
                </span>
                <span className="min-w-0 flex-1 truncate text-slate-600">{l.reason || "(사유 없음)"}</span>
                <span className="shrink-0 text-xs text-slate-400">{l.actorEmail || "-"}</span>
                <span className="shrink-0 text-xs text-slate-400">
                  {l.createdAt ? formatDate(l.createdAt) : "-"}
                </span>
              </div>
            ))
          ) : (
            <p className="py-5 text-center text-sm text-slate-400">조정 이력 없음</p>
          )}
        </div>
      </div>
    </div>
  );
}
