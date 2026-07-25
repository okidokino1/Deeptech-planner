"use client";

import { useRef, useState } from "react";
import {
  FileUp,
  Loader2,
  Check,
  Trash2,
  AlertCircle,
  MessageCircleQuestion,
  Sparkles,
  FileText,
} from "lucide-react";
import type { AnticipatedQA } from "@/lib/rehearsal";

// 발표 전: 정부지원사업 공고문 업로드 + 공고문·계획서 기반 예상질문 미리 생성
export function AnnouncementPanel({
  projectId,
  hasPlan,
  initialChars,
}: {
  projectId: string;
  hasPlan: boolean;
  initialChars: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedChars, setSavedChars] = useState(initialChars);
  const [pasteText, setPasteText] = useState("");
  const [busy, setBusy] = useState<"upload" | "save" | "delete" | "questions" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [questions, setQuestions] = useState<AnticipatedQA[] | null>(null);
  const [qEngine, setQEngine] = useState<"claude" | "demo" | null>(null);
  const [qUsedAnn, setQUsedAnn] = useState(false);

  const hasAnnouncement = savedChars > 0;

  async function uploadFile(file: File) {
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("file", file);
      const res = await fetch("/api/rehearsal/announcement", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "업로드 실패");
      setSavedChars(d.chars || 0);
      setNotice(`공고문 저장 완료 (${(d.chars || 0).toLocaleString()}자 추출)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveText() {
    if (!pasteText.trim()) {
      setError("붙여넣을 공고문 내용을 입력하세요.");
      return;
    }
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/rehearsal/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, text: pasteText }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "저장 실패");
      setSavedChars(d.chars || 0);
      setPasteText("");
      setNotice(`공고문 저장 완료 (${(d.chars || 0).toLocaleString()}자)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function removeAnnouncement() {
    setBusy("delete");
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/rehearsal/announcement?projectId=${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error || "삭제 실패");
      setSavedChars(0);
      setNotice("공고문을 삭제했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function generateQuestions() {
    setBusy("questions");
    setError("");
    try {
      const res = await fetch("/api/rehearsal/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "질문 생성 실패");
      setQuestions(d.questions || []);
      setQEngine(d.engine || null);
      setQUsedAnn(!!d.hasAnnouncement);
    } catch (e) {
      setError(e instanceof Error ? e.message : "질문 생성 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <FileUp className="h-4 w-4 text-brand-600" /> 정부지원사업 공고문
        </h2>
        {hasAnnouncement && (
          <span className="chip bg-emerald-50 text-emerald-700">
            <Check className="h-3 w-3" /> 등록됨 · {savedChars.toLocaleString()}자
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-slate-500">
        지원하는 사업의 공고문을 올리면, 그 사업의 <b>평가지표·심사 관점</b>에 맞춰 심사위원 예상 질문을 뽑아드립니다.
        <b>한글(.hwp/.hwpx)</b>·PDF·텍스트 파일을 올리거나 내용을 붙여넣으세요.
      </p>

      {/* 업로드 / 붙여넣기 */}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-dashed border-slate-300 p-4">
          <p className="text-sm font-semibold text-slate-700">파일 업로드</p>
          <p className="mt-1 text-xs text-slate-400">한글(.hwp/.hwpx) · PDF · .txt (최대 15MB)</p>
          <input
            ref={fileRef}
            type="file"
            accept=".hwp,.hwpx,.pdf,.txt,.md,text/plain,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy !== null}
            className="btn-outline mt-3"
          >
            {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            파일 선택
          </button>
          <p className="mt-2 text-xs text-slate-400">
            정부지원 공고문 한글 파일을 그대로 올리면 됩니다.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700">내용 붙여넣기</p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="공고문 내용을 붙여넣으세요. (사업목적, 지원자격, 평가지표, 지원규모 등)"
            className="input mt-2 min-h-24 resize-none text-sm"
          />
          <button onClick={saveText} disabled={busy !== null} className="btn-primary mt-2">
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            공고문 저장
          </button>
        </div>
      </div>

      {hasAnnouncement && (
        <button
          onClick={removeAnnouncement}
          disabled={busy !== null}
          className="btn-ghost mt-3 px-2 py-1 text-xs text-rose-600 hover:bg-rose-50"
        >
          {busy === "delete" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          공고문 삭제
        </button>
      )}

      {error && (
        <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {notice && !error && (
        <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p>
      )}

      {/* 예상 질문 미리 생성 */}
      <div className="mt-5 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-semibold text-slate-800">
            <MessageCircleQuestion className="h-4 w-4 text-brand-600" /> 심사위원 예상 질문 미리보기
          </h3>
          <button onClick={generateQuestions} disabled={busy !== null || !hasPlan} className="btn-primary">
            {busy === "questions" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {questions ? "다시 생성" : "예상 질문 생성"}
          </button>
        </div>
        {!hasPlan && (
          <p className="mt-2 text-xs text-amber-600">
            사업계획서를 먼저 완성하면 계획서 내용까지 반영한 정밀한 질문이 생성됩니다.
          </p>
        )}
        <p className="mt-1 text-xs text-slate-400">
          발표 준비용 무료 기능입니다. (이용권이 차감되지 않습니다)
        </p>

        {questions && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">
              {qUsedAnn ? "✅ 업로드한 공고문의 평가 관점을 반영했습니다." : "공고문 없이 일반 심사 관점으로 생성했습니다."}
              {qEngine === "demo" && " (데모 결과 — API 키 연결 시 정밀 생성)"}
            </p>
            {questions.length ? (
              <div className="space-y-3">
                {questions.map((qa, i) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-4">
                    <p className="font-semibold text-slate-900">
                      Q{i + 1}. {qa.question}
                    </p>
                    <p className="mt-1.5 text-sm text-slate-600">
                      <span className="font-semibold text-brand-700">답변 방향: </span>
                      {qa.suggestedAnswer}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-4 text-center text-sm text-slate-400">질문을 생성하지 못했습니다. 다시 시도해 주세요.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
