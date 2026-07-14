"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Lightbulb,
  Network,
  Sparkles,
  Users,
  FileCheck2,
  Loader2,
  Plus,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Cpu,
} from "lucide-react";
import type { PlanningProject } from "@/lib/planningStore";
import type {
  PlanningInput,
  PlanningArtifacts,
  GenerateAction,
  ArchModule,
} from "@/lib/planning";

const STEPS = [
  { n: 1, label: "문제 정의", icon: Lightbulb },
  { n: 2, label: "아키텍처", icon: Network },
  { n: 3, label: "차별화", icon: Sparkles },
  { n: 4, label: "팀·초안", icon: Users },
  { n: 5, label: "계획서 완성", icon: FileCheck2 },
];

export function PlanningWizard({ project }: { project: PlanningProject }) {
  const router = useRouter();
  const [input, setInput] = useState<PlanningInput>(() => ({
    businessIntro: project.input.businessIntro || "",
    problems: project.input.problems?.length ? project.input.problems : [""],
    selectedIdeaIds: project.input.selectedIdeaIds || [],
    history: project.input.history || "",
    founder: project.input.founder || "",
    team: project.input.team || "",
  }));
  const [artifacts, setArtifacts] = useState<PlanningArtifacts>(project.artifacts || {});
  const [step, setStep] = useState<number>(project.step || 1);
  const [loading, setLoading] = useState<GenerateAction | null>(null);
  const [error, setError] = useState("");

  function patch(p: Partial<PlanningInput>) {
    setInput((prev) => ({ ...prev, ...p }));
  }

  async function generate(action: GenerateAction, nextStep?: number) {
    setLoading(action);
    setError("");
    try {
      const res = await fetch("/api/planning/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, action, input, step: nextStep ?? step }),
      });
      if (res.status === 402) {
        router.push("/pricing");
        return;
      }
      if (!res.ok) throw new Error((await res.json()).error || "생성 실패");
      const data = await res.json();
      setArtifacts(data.artifacts);
      if (nextStep) setStep(nextStep);
      if (action === "plan") {
        router.push(`/studio/${project.id}/plan`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  async function saveAndGo(nextStep: number) {
    setStep(nextStep);
    try {
      await fetch("/api/planning/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", projectId: project.id, patch: { input, step: nextStep } }),
      });
    } catch {}
  }

  const busy = loading !== null;

  return (
    <div className="space-y-6">
      {/* Stepper */}
      <div className="card p-4">
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {STEPS.map((s, i) => {
            const active = step === s.n;
            const done = step > s.n;
            const Icon = s.icon;
            return (
              <div key={s.n} className="flex flex-1 items-center">
                <button
                  onClick={() => s.n <= step && setStep(s.n)}
                  className={`flex min-w-0 flex-col items-center gap-1 px-1 ${
                    s.n <= step ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-xl ${
                      active
                        ? "bg-brand-600 text-white"
                        : done
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span
                    className={`whitespace-nowrap text-[11px] font-medium ${
                      active ? "text-brand-700" : "text-slate-500"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <span className={`mx-1 h-px flex-1 ${done ? "bg-brand-300" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      {/* Step body */}
      {step === 1 && (
        <Step1
          input={input}
          patch={patch}
          artifacts={artifacts}
          loading={loading}
          onGenerateIdeas={() => generate("ideas")}
          onNext={() => generate("architecture", 2)}
        />
      )}
      {step === 2 && (
        <Step2
          artifacts={artifacts}
          loading={loading}
          onRegenerate={() => generate("architecture")}
          onBack={() => setStep(1)}
          onNext={() => saveAndGo(3)}
        />
      )}
      {step === 3 && (
        <Step3
          input={input}
          patch={patch}
          artifacts={artifacts}
          loading={loading}
          onGenerate={() => generate("differentiators")}
          onBack={() => setStep(2)}
          onNext={() => saveAndGo(4)}
        />
      )}
      {step === 4 && (
        <Step4
          input={input}
          patch={patch}
          artifacts={artifacts}
          loading={loading}
          onGenerate={() => generate("draft")}
          onBack={() => setStep(3)}
          onNext={() => saveAndGo(5)}
        />
      )}
      {step === 5 && (
        <Step5
          artifacts={artifacts}
          loading={loading}
          onGenerate={() => generate("plan")}
          onBack={() => setStep(4)}
        />
      )}

      {busy && (
        <p className="flex items-center justify-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> AI가 작업 중입니다. 최대 1~2분 걸릴 수 있어요…
        </p>
      )}
    </div>
  );
}

// --- Step 1: 문제 정의 + 아이디어 --------------------------------------------
function Step1({
  input,
  patch,
  artifacts,
  loading,
  onGenerateIdeas,
  onNext,
}: {
  input: PlanningInput;
  patch: (p: Partial<PlanningInput>) => void;
  artifacts: PlanningArtifacts;
  loading: GenerateAction | null;
  onGenerateIdeas: () => void;
  onNext: () => void;
}) {
  const ideas = artifacts.ideas || [];
  const toggleIdea = (id: number) => {
    const set = new Set(input.selectedIdeaIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patch({ selectedIdeaIds: [...set] });
  };
  const setProblem = (i: number, v: string) => {
    const arr = [...input.problems];
    arr[i] = v;
    patch({ problems: arr });
  };
  const canGenerate = input.businessIntro.trim() && input.problems.some((p) => p.trim());

  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Step 1. 사업 소개와 문제 정의</h2>
        <p className="mt-1 text-sm text-slate-500">
          어떤 사업이고, 어떤 문제가 해결되면 좋을지 적어주세요. AI가 이를 딥테크 R&D 아이디어로 바꿔드립니다.
        </p>

        <div className="mt-5">
          <label className="label">사업 소개</label>
          <textarea
            value={input.businessIntro}
            onChange={(e) => patch({ businessIntro: e.target.value })}
            placeholder="예: 나는 토익 고득점을 만드는 학습 플랫폼을 운영하는 사업자입니다."
            className="input min-h-20 resize-none"
          />
        </div>

        <div className="mt-4">
          <label className="label">해결하고 싶은 문제 (여러 개 추가 가능)</label>
          <div className="space-y-2">
            {input.problems.map((p, i) => (
              <div key={i} className="flex gap-2">
                <textarea
                  value={p}
                  onChange={(e) => setProblem(i, e.target.value)}
                  placeholder={`문제 ${i + 1}. 예: 고득점 강사를 구하기 어렵고 인건비가 비싸다.`}
                  className="input min-h-11 resize-none"
                />
                {input.problems.length > 1 && (
                  <button
                    onClick={() => patch({ problems: input.problems.filter((_, x) => x !== i) })}
                    className="shrink-0 rounded-lg px-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => patch({ problems: [...input.problems, ""] })}
            className="btn-ghost mt-2 px-3 py-1.5 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> 문제 추가
          </button>
        </div>

        <button
          onClick={onGenerateIdeas}
          disabled={!canGenerate || loading !== null}
          className="btn-primary mt-5"
        >
          {loading === "ideas" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
          {ideas.length ? "아이디어 다시 생성" : "AI 딥테크 아이디어 5개 생성"}
        </button>
      </div>

      {ideas.length > 0 && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">딥테크 아이디어 (진행할 아이디어를 선택하세요)</h3>
          <p className="mt-1 text-xs text-slate-500">
            여러 개를 선택하면 통합 시스템으로 설계됩니다. 선택하지 않으면 전체를 통합합니다.
          </p>
          <div className="mt-4 space-y-3">
            {ideas.map((idea) => {
              const selected = input.selectedIdeaIds.includes(idea.id);
              return (
                <button
                  key={idea.id}
                  onClick={() => toggleIdea(idea.id)}
                  className={`w-full rounded-xl border p-4 text-left transition-colors ${
                    selected ? "border-brand-500 bg-brand-50" : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded ${
                        selected ? "bg-brand-600 text-white" : "border border-slate-300"
                      }`}
                    >
                      {selected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {idea.id}. {idea.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{idea.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="chip bg-slate-100 text-slate-600">
                          <Cpu className="h-3 w-3" /> {idea.aiTech}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-5 flex justify-end">
            <button onClick={onNext} disabled={loading !== null} className="btn-primary">
              {loading === "architecture" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              다음: 시스템 아키텍처 설계
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- 모듈 카드 (재사용) ------------------------------------------------------
function ModuleCard({ m }: { m: ArchModule }) {
  const rows: [string, string][] = [
    ["역할", m.role],
    ["AI 모델", m.aiModels],
    ["Input", m.input],
    ["Processing", m.processing],
    ["학습·개발", m.learningMethod],
    ["Output", m.output],
  ];
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">
        {m.id}. {m.name}
      </p>
      <dl className="mt-2 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[84px_1fr] gap-2">
            <dt className="font-medium text-slate-500">{k}</dt>
            <dd className="text-slate-700">{v || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

// --- Step 2: 아키텍처 --------------------------------------------------------
function Step2({
  artifacts,
  loading,
  onRegenerate,
  onBack,
  onNext,
}: {
  artifacts: PlanningArtifacts;
  loading: GenerateAction | null;
  onRegenerate: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const arch = artifacts.architecture;
  if (!arch) {
    return (
      <div className="card p-8 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-brand-600" />
        <p className="mt-3 text-sm text-slate-500">아키텍처를 생성하고 있습니다…</p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Step 2. 시스템 아키텍처</h2>
        <p className="mt-2 text-xl font-bold text-brand-700">{arch.systemName}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{arch.overview}</p>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {arch.layers.map((l) => (
            <div key={l.name} className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-800">{l.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{l.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="font-bold text-slate-900">핵심 AI 모듈 ({arch.modules.length}개)</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {arch.modules.map((m) => (
            <ModuleCard key={m.id} m={m} />
          ))}
        </div>
        {arch.dataFlow && (
          <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
            <p className="mb-1 font-semibold text-slate-800">모듈 간 데이터 흐름</p>
            {arch.dataFlow}
          </div>
        )}
        {arch.techStack?.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-800">기술 스택</p>
            <div className="flex flex-wrap gap-1.5">
              {arch.techStack.map((s) => (
                <span key={s.layer} className="chip bg-brand-50 text-brand-700">
                  {s.layer}: {s.tech}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextLabel="다음: 차별화 전략"
        onRegenerate={onRegenerate}
        regenerating={loading === "architecture"}
        disabled={loading !== null}
      />
    </div>
  );
}

// --- Step 3: 차별화 ----------------------------------------------------------
function Step3({
  input,
  patch,
  artifacts,
  loading,
  onGenerate,
  onBack,
  onNext,
}: {
  input: PlanningInput;
  patch: (p: Partial<PlanningInput>) => void;
  artifacts: PlanningArtifacts;
  loading: GenerateAction | null;
  onGenerate: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const diffs = artifacts.differentiators || [];
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Step 3. 차별화 포인트 · 핵심 IP</h2>
        <p className="mt-1 text-sm text-slate-500">
          정부·특허·수상 등 선정이력이 있으면 적어주세요. 없어도 괜찮습니다. AI가 자사 고유 알고리즘(핵심 IP)을 도출합니다.
        </p>
        <div className="mt-4">
          <label className="label">선정이력 · 특허 · 수상 (선택)</label>
          <textarea
            value={input.history}
            onChange={(e) => patch({ history: e.target.value })}
            placeholder="예: 아직 없음 / 또는 2024 창업도약패키지 선정, 특허출원 1건 등"
            className="input min-h-20 resize-none"
          />
        </div>
        <button onClick={onGenerate} disabled={loading !== null} className="btn-primary mt-4">
          {loading === "differentiators" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {diffs.length ? "다시 생성" : "차별화 전략 생성"}
        </button>
      </div>

      {diffs.length > 0 && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">핵심 차별화 알고리즘</h3>
          <div className="mt-4 space-y-3">
            {diffs.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  {d.id}. {d.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{d.description}</p>
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  <span className="font-semibold">근거: </span>
                  {d.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextLabel="다음: 팀·기획 초안"
        disabled={loading !== null || diffs.length === 0}
      />
    </div>
  );
}

// --- Step 4: 팀 & 초안 -------------------------------------------------------
function Step4({
  input,
  patch,
  artifacts,
  loading,
  onGenerate,
  onBack,
  onNext,
}: {
  input: PlanningInput;
  patch: (p: Partial<PlanningInput>) => void;
  artifacts: PlanningArtifacts;
  loading: GenerateAction | null;
  onGenerate: () => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const draft = artifacts.draft;
  return (
    <div className="space-y-5">
      <div className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">Step 4. 대표자·팀 이력 & 기획 초안</h2>
        <p className="mt-1 text-sm text-slate-500">
          대표자와 팀의 경력·성과를 적어주세요. AI가 이를 반영해 연구개발 기획 초안을 조립합니다.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">대표자 이력</label>
            <textarea
              value={input.founder}
              onChange={(e) => patch({ founder: e.target.value })}
              placeholder="예: 교육상담 10,000건, 어학원 대표, TOEIC/IELTS 코칭 프로그램 개발…"
              className="input min-h-28 resize-none"
            />
          </div>
          <div>
            <label className="label">팀원 구성 · 이력</label>
            <textarea
              value={input.team}
              onChange={(e) => patch({ team: e.target.value })}
              placeholder="예: 총괄 매니저 1, 고객관리 1, 개발자 2명 채용 예정…"
              className="input min-h-28 resize-none"
            />
          </div>
        </div>
        <button onClick={onGenerate} disabled={loading !== null} className="btn-primary mt-4">
          {loading === "draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Users className="h-4 w-4" />}
          {draft ? "다시 생성" : "연구개발 기획 초안 생성"}
        </button>
      </div>

      {draft && (
        <div className="card p-6">
          <h3 className="font-bold text-slate-900">연구개발 기획 초안</h3>
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase text-slate-400">연구개발 과제명</p>
            <p className="mt-1 font-semibold text-brand-700">{draft.projectTitle}</p>
          </div>
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase text-slate-400">연구개발의 필요성</p>
            <div className="mt-2 space-y-2">
              {draft.necessity.map((n, i) => (
                <div key={i} className="rounded-lg bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">{n.heading}</p>
                  <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <NavRow
        onBack={onBack}
        onNext={onNext}
        nextLabel="다음: 사업계획서 완성"
        disabled={loading !== null || !draft}
      />
    </div>
  );
}

// --- Step 5: 계획서 완성 -----------------------------------------------------
function Step5({
  artifacts,
  loading,
  onGenerate,
  onBack,
}: {
  artifacts: PlanningArtifacts;
  loading: GenerateAction | null;
  onGenerate: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="card flex flex-col items-center p-8 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
          <FileCheck2 className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-lg font-bold text-slate-900">사업계획서 완성하기</h2>
        <p className="mt-1 max-w-md text-sm text-slate-500">
          지금까지의 기술기획을 정부 딥테크 R&D 사업계획서 양식으로 완성합니다.
          모듈별 요약표, 과제명 후보, 연구개발 필요성, 운영 흐름, 모듈별 상세, 사업화 전략까지 자동 작성됩니다.
        </p>
        <p className="mt-2 text-xs text-amber-600">※ 사업계획서 완성 시 이용권 1회가 사용됩니다.</p>
        <button onClick={onGenerate} disabled={loading !== null} className="btn-primary mt-5 px-8 py-3 text-base">
          {loading === "plan" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
          사업계획서 완성하기
        </button>
        {artifacts.plan && (
          <p className="mt-3 text-xs text-slate-400">이미 완성된 계획서가 있습니다. 다시 생성하면 갱신됩니다.</p>
        )}
      </div>
      <div className="flex justify-start">
        <button onClick={onBack} disabled={loading !== null} className="btn-outline">
          <ArrowLeft className="h-4 w-4" /> 이전
        </button>
      </div>
    </div>
  );
}

// --- 공통 네비게이션 행 ------------------------------------------------------
function NavRow({
  onBack,
  onNext,
  nextLabel,
  onRegenerate,
  regenerating,
  disabled,
}: {
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
  onRegenerate?: () => void;
  regenerating?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <button onClick={onBack} disabled={disabled} className="btn-outline">
        <ArrowLeft className="h-4 w-4" /> 이전
      </button>
      <div className="flex gap-2">
        {onRegenerate && (
          <button onClick={onRegenerate} disabled={disabled} className="btn-ghost">
            {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            다시 생성
          </button>
        )}
        <button onClick={onNext} disabled={disabled} className="btn-primary">
          {nextLabel} <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
