"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  Square,
  Loader2,
  AlertCircle,
  Presentation,
  Clock,
  RotateCcw,
  MessageCircleQuestion,
  Timer,
} from "lucide-react";
import type { RehearsalResult } from "@/lib/rehearsal";
import type { RehearsalRecord } from "@/lib/planningStore";
import { AnnouncementPanel } from "./AnnouncementPanel";

type Phase = "idle" | "recording" | "scoring" | "done";

const TONE = (s: number) =>
  s >= 85 ? "text-emerald-600" : s >= 70 ? "text-brand-600" : s >= 55 ? "text-amber-600" : "text-rose-600";

export function RehearsalStudio({
  projectId,
  projectTitle,
  whisperAvailable,
  initial,
  hasPlan,
  announcementChars,
  applicationChars,
}: {
  projectId: string;
  projectTitle: string;
  whisperAvailable: boolean;
  initial: RehearsalRecord[];
  hasPlan: boolean;
  announcementChars: number;
  applicationChars: number;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [targetMin, setTargetMin] = useState(5);
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<RehearsalResult | null>(null);
  const [error, setError] = useState("");
  const [micDenied, setMicDenied] = useState(false);
  const [history] = useState(initial);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recognitionRef = useRef<any>(null);
  const finalRef = useRef("");
  const wantRecogRef = useRef(false);
  const startRef = useRef(0);

  // 타이머
  useEffect(() => {
    if (phase !== "recording") return;
    const id = setInterval(() => setElapsed(Math.round((Date.now() - startRef.current) / 1000)), 500);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    return () => {
      wantRecogRef.current = false;
      try {
        const r = recognitionRef.current;
        if (r) { r.onend = null; r.abort?.(); }
      } catch {}
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 함수 선언식(호이스팅)으로 두어 onend 내부의 자기 재귀 참조가 안전하도록 한다.
  function startRecognition() {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      const prev = recognitionRef.current;
      if (prev) { prev.onend = null; prev.onresult = null; prev.abort?.(); }
    } catch {}
    const rec = new SR();
    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (ev: any) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = () => {};
    rec.onend = () => {
      if (!wantRecogRef.current) return;
      try { rec.start(); } catch { setTimeout(() => wantRecogRef.current && startRecognition(), 200); }
    };
    try { rec.start(); } catch { setTimeout(() => wantRecogRef.current && startRecognition(), 200); }
    recognitionRef.current = rec;
  }

  async function start() {
    setError("");
    setResult(null);
    setTranscript("");
    finalRef.current = "";
    chunksRef.current = [];
    setElapsed(0);
    wantRecogRef.current = true;
    startRef.current = Date.now();
    startRecognition();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      mr.start();
      mediaRecorderRef.current = mr;
    } catch {
      setMicDenied(true);
    }
    setPhase("recording");
  }

  function getBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") {
        resolve(chunksRef.current.length ? new Blob(chunksRef.current) : null);
        return;
      }
      mr.onstop = () => resolve(chunksRef.current.length ? new Blob(chunksRef.current, { type: "audio/webm" }) : null);
      mr.stop();
    });
  }

  async function stopAndScore() {
    const durationSec = Math.max(1, Math.round((Date.now() - startRef.current) / 1000));
    wantRecogRef.current = false;
    try {
      const r = recognitionRef.current;
      if (r) { r.onend = null; r.onresult = null; r.stop?.(); }
    } catch {}
    const blob = await getBlob();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setPhase("scoring");

    let finalTranscript = transcript.trim();
    let words: any = undefined;
    if (whisperAvailable && blob) {
      try {
        const fd = new FormData();
        fd.append("audio", blob, "rehearsal.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        const data = await res.json();
        if (data.transcript?.trim()) { finalTranscript = data.transcript; words = data.words; }
      } catch {}
    }

    try {
      const res = await fetch("/api/rehearsal/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          transcript: finalTranscript,
          durationSec,
          words,
          targetSec: targetMin * 60,
        }),
      });
      if (res.status === 402) { router.push("/pricing"); return; }
      if (!res.ok) throw new Error((await res.json()).error || "채점 실패");
      const data = await res.json();
      setResult(data.result);
      setPhase("done");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "채점 중 오류가 발생했습니다.");
      setPhase("idle");
    }
  }

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const over = elapsed > targetMin * 60;

  return (
    <div className="space-y-5">
      {/* 발표 전: 공고문 업로드 + 예상 질문 미리보기 */}
      {phase === "idle" && (
        <AnnouncementPanel
          projectId={projectId}
          hasPlan={hasPlan}
          announcementChars={announcementChars}
          applicationChars={applicationChars}
        />
      )}

      <div className="card p-6">
        <span className="chip bg-brand-100 text-brand-700">
          <Presentation className="h-3.5 w-3.5" /> 발표(PT) 연습
        </span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">{projectTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          심사위원 앞 발표를 대비해 실제로 소리 내어 발표하세요. 전달력·구성·내용·설득력·명료성을 AI가 채점하고,
          예상 질문(Q&A)까지 제시합니다.
        </p>

        {phase === "idle" && (
          <div className="mt-5">
            <label className="label">목표 발표 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={30}
                value={targetMin}
                onChange={(e) => setTargetMin(Math.max(1, Math.min(30, Number(e.target.value) || 5)))}
                className="input w-24"
              />
              <span className="text-sm text-slate-500">분</span>
            </div>
            <button onClick={start} className="btn-primary mt-5 px-6 py-3 text-base">
              <Mic className="h-5 w-5" /> 발표 시작
            </button>
            <p className="mt-2 text-xs text-slate-400">조용한 환경에서 마이크 권한을 허용해 주세요.</p>
          </div>
        )}

        {phase === "recording" && (
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <span className="chip bg-rose-100 text-rose-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" /> 녹음 중
              </span>
              <span className={`flex items-center gap-1.5 text-2xl font-bold tabular-nums ${over ? "text-rose-600" : "text-slate-900"}`}>
                <Clock className="h-5 w-5 text-slate-400" /> {mm(elapsed)}
                <span className="text-sm font-normal text-slate-400">/ {mm(targetMin * 60)}</span>
              </span>
            </div>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="발표를 시작하면 여기에 전사됩니다. (미지원 브라우저는 직접 입력 가능)"
              className="input mt-4 min-h-32 resize-none"
            />
            {micDenied && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4" /> 마이크 권한이 없어 텍스트 입력으로 진행합니다.
              </p>
            )}
            <button onClick={stopAndScore} className="btn-primary mt-4 bg-rose-600 hover:bg-rose-700">
              <Square className="h-4 w-4" /> 발표 종료 · 채점
            </button>
          </div>
        )}

        {phase === "scoring" && (
          <div className="mt-6 flex flex-col items-center py-8 text-center">
            <Loader2 className="h-9 w-9 animate-spin text-brand-600" />
            <p className="mt-3 font-semibold text-slate-800">발표를 채점하고 있습니다…</p>
            <p className="mt-1 text-sm text-slate-500">전달력·구성·내용·설득력·명료성과 예상 질문을 분석 중입니다.</p>
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-center gap-1.5 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4" /> {error}
          </p>
        )}
      </div>

      {phase === "done" && result && <ResultCard result={result} onRetry={() => { setPhase("idle"); setResult(null); }} />}

      {history.length > 0 && phase !== "done" && (
        <div className="card p-6">
          <h2 className="font-bold text-slate-900">이전 발표 연습 기록</h2>
          <div className="mt-3 space-y-2">
            {history.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-sm">
                <span className="text-slate-500">{new Date(r.createdAt).toLocaleString("ko-KR")}</span>
                <span className={`font-bold ${TONE(r.overall)}`}>{r.overall}점</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ result, onRetry }: { result: RehearsalResult; onRetry: () => void }) {
  const m = result.metrics;
  return (
    <>
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">종합 발표 점수</p>
            <p className={`text-4xl font-bold ${TONE(result.overall)}`}>{result.overall}<span className="text-lg text-slate-400">/100</span></p>
          </div>
          <button onClick={onRetry} className="btn-outline">
            <RotateCcw className="h-4 w-4" /> 다시 연습
          </button>
        </div>
        {result.engine === "demo" && (
          <p className="mt-2 text-xs text-amber-600">데모 채점 결과입니다. API 키 연결 시 Claude 정밀 채점이 제공됩니다.</p>
        )}

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {result.dimensions.map((d) => (
            <div key={d.key} className="rounded-xl bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500">{d.label}</p>
              <p className={`mt-1 text-xl font-bold ${TONE(d.score)}`}>{d.score}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="chip bg-slate-100 text-slate-600"><Timer className="h-3 w-3" /> {m.wordCount}어절</span>
          <span className="chip bg-slate-100 text-slate-600">{m.wpm} 어절/분</span>
          <span className="chip bg-slate-100 text-slate-600">간투사 {m.fillerCount}회</span>
          <span className="chip bg-slate-100 text-slate-600">멈춤 {m.pauseCount}회</span>
        </div>

        <p className="mt-4 rounded-xl bg-brand-50 p-4 text-sm leading-relaxed text-slate-700">{result.summary}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">영역별 코멘트</h3>
          <div className="mt-3 space-y-2">
            {result.dimensions.map((d) => (
              <div key={d.key} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-800">{d.label}</span>
                  <span className={`text-sm font-bold ${TONE(d.score)}`}>{d.score}</span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{d.comment}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">개선 포인트</h3>
          <ul className="mt-3 space-y-2">
            {result.improvements.map((s, i) => (
              <li key={i} className="flex gap-2 text-sm text-slate-700">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" /> {s}
              </li>
            ))}
          </ul>
          {result.strengths.length > 0 && (
            <>
              <h3 className="mt-5 font-bold text-slate-900">강점</h3>
              <ul className="mt-3 space-y-2">
                {result.strengths.map((s, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" /> {s}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {result.anticipatedQuestions.length > 0 && (
        <div className="card p-6">
          <h3 className="flex items-center gap-2 font-bold text-slate-900">
            <MessageCircleQuestion className="h-5 w-5 text-brand-600" /> 심사위원 예상 질문 (Q&A)
          </h3>
          <div className="mt-3 space-y-3">
            {result.anticipatedQuestions.map((qa, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">Q{i + 1}. {qa.question}</p>
                <p className="mt-1.5 text-sm text-slate-600">
                  <span className="font-semibold text-brand-700">답변 방향: </span>
                  {qa.suggestedAnswer}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
