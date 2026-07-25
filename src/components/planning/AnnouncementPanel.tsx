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
  Megaphone,
  ClipboardList,
} from "lucide-react";
import type { AnticipatedQA } from "@/lib/rehearsal";

type DocKind = "announcement" | "application";

// 발표 전: 심사 자료(공고문 + 사업 신청서) 업로드 + 세 문서 기반 예상질문 미리 생성
export function AnnouncementPanel({
  projectId,
  hasPlan,
  announcementChars,
  applicationChars,
}: {
  projectId: string;
  hasPlan: boolean;
  announcementChars: number;
  applicationChars: number;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<AnticipatedQA[] | null>(null);
  const [qEngine, setQEngine] = useState<"claude" | "demo" | null>(null);
  const [srcNote, setSrcNote] = useState("");

  async function generateQuestions() {
    setBusy(true);
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
      const src = [
        d.hasAnnouncement && "공고문",
        d.hasApplication && "사업 신청서",
        hasPlan && "사업계획서",
      ].filter(Boolean);
      setSrcNote(src.length ? `${src.join(" · ")} 기반으로 생성했습니다.` : "일반 심사 관점으로 생성했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "질문 생성 중 오류가 발생했습니다.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-6">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <FileUp className="h-4 w-4 text-brand-600" /> 심사 자료 (예상 질문용)
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        지원 사업의 <b>공고문</b>과 실제 제출한 <b>사업 신청서</b>를 올리면, 공고문·신청서·사업계획서를
        <b> 교차 검토</b>해 심사위원 예상 질문을 뽑아드립니다. 한글(.hwp/.hwpx)·PDF·텍스트를 지원합니다.
      </p>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <DocUploader
          projectId={projectId}
          kind="announcement"
          title="정부지원사업 공고문"
          icon={<Megaphone className="h-4 w-4 text-brand-600" />}
          placeholder="공고문 내용을 붙여넣으세요. (사업목적, 지원자격, 평가지표, 지원규모 등)"
          initialChars={announcementChars}
          disabledAll={busy}
        />
        <DocUploader
          projectId={projectId}
          kind="application"
          title="제출한 사업 신청서"
          icon={<ClipboardList className="h-4 w-4 text-brand-600" />}
          placeholder="제출한 신청서 내용을 붙여넣으세요. (목표, 예산, 일정, 정량 지표 등)"
          initialChars={applicationChars}
          disabledAll={busy}
        />
      </div>

      {/* 예상 질문 미리 생성 */}
      <div className="mt-5 border-t border-slate-100 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 font-semibold text-slate-800">
            <MessageCircleQuestion className="h-4 w-4 text-brand-600" /> 심사위원 예상 질문 미리보기
          </h3>
          <button onClick={generateQuestions} disabled={busy} className="btn-primary">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {questions ? "다시 생성" : "예상 질문 생성"}
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          공고문·신청서 없이도 생성되지만, 함께 올리면 질문이 훨씬 날카로워집니다. (이용권 미차감)
        </p>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </p>
        )}

        {questions && (
          <div className="mt-4">
            <p className="mb-2 text-xs text-slate-500">
              ✅ {srcNote}
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

// 문서 1종(공고문 또는 신청서) 업로드/붙여넣기/삭제
function DocUploader({
  projectId,
  kind,
  title,
  icon,
  placeholder,
  initialChars,
  disabledAll,
}: {
  projectId: string;
  kind: DocKind;
  title: string;
  icon: React.ReactNode;
  placeholder: string;
  initialChars: number;
  disabledAll: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [savedChars, setSavedChars] = useState(initialChars);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<"upload" | "save" | "delete" | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const has = savedChars > 0;
  const lock = disabledAll || busy !== null;

  async function uploadFile(file: File) {
    setBusy("upload");
    setError("");
    setNotice("");
    try {
      const fd = new FormData();
      fd.append("projectId", projectId);
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/rehearsal/announcement", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "업로드 실패");
      setSavedChars(d.chars || 0);
      setNotice(`저장 완료 (${(d.chars || 0).toLocaleString()}자 추출)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveText() {
    if (!paste.trim()) {
      setError("붙여넣을 내용을 입력하세요.");
      return;
    }
    setBusy("save");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/rehearsal/announcement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, kind, text: paste }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "저장 실패");
      setSavedChars(d.chars || 0);
      setPaste("");
      setNotice(`저장 완료 (${(d.chars || 0).toLocaleString()}자)`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("delete");
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/rehearsal/announcement?projectId=${projectId}&kind=${kind}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "삭제 실패");
      setSavedChars(0);
      setNotice("삭제했습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 중 오류가 발생했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          {icon} {title}
        </p>
        {has && (
          <span className="chip bg-emerald-50 text-emerald-700">
            <Check className="h-3 w-3" /> {savedChars.toLocaleString()}자
          </span>
        )}
      </div>

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
      <button onClick={() => fileRef.current?.click()} disabled={lock} className="btn-outline mt-3 w-full justify-center">
        {busy === "upload" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
        파일 선택 (.hwp/.hwpx/PDF)
      </button>

      <textarea
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        placeholder={placeholder}
        className="input mt-2 min-h-20 resize-none text-sm"
      />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={saveText} disabled={lock} className="btn-primary flex-1 justify-center py-2 text-sm">
          {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          붙여넣기 저장
        </button>
        {has && (
          <button onClick={remove} disabled={lock} className="btn-ghost px-2 py-2 text-rose-600 hover:bg-rose-50">
            {busy === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      )}
      {notice && !error && <p className="mt-2 text-xs text-emerald-600">{notice}</p>}
    </div>
  );
}
