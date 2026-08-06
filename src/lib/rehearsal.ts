// 발표(PT) 연습 채점 엔진
// 정부지원사업 서류 합격 후의 대면 발표를 대비한다.
// 전달력(속도·필러워드·멈춤)과 내용(구성·기술성·설득력)을 함께 채점하고,
// 심사위원 예상 질문(Q&A)까지 생성한다.
//
// grader.ts 와 동일하게 Claude(도구호출) + 데모 폴백. 음성 지표는 metrics.ts 재사용.

import Anthropic from "@anthropic-ai/sdk";
import { env, features } from "./env";
import { computeMetrics, metricsSummary, type WordTs } from "./metrics";
import type { SpeechMetrics } from "./types";

export interface RehearsalInput {
  transcript: string;
  durationSec: number;
  words?: WordTs[];
  projectTitle?: string; // 발표 대상 과제명
  planSummary?: string; // 사업계획서 핵심 요약(맥락)
  targetSec?: number; // 목표 발표 시간(초). 기본 없음
  question?: string; // 특정 예상질문에 대한 답변 연습이면 지정
  announcement?: string; // 정부지원사업 공고문(심사 관점 반영용)
  application?: string; // 정부지원사업 사업 신청서(작성본)
}

// 공고문/신청서는 수십 페이지일 수 있어 프롬프트 토큰이 폭증한다.
// 심사 예상질문 생성에는 앞부분(사업목적·지원자격·평가지표·지원규모)만으로 충분하므로 상한을 둔다.
const DOC_MAX = 8000;
export function trimDoc(s?: string): string {
  const t = (s || "").trim();
  return t.length > DOC_MAX ? t.slice(0, DOC_MAX) : t;
}
// 하위호환 별칭
export const trimAnnouncement = trimDoc;

export type RehearsalDimKey =
  | "delivery" // 전달력 (발음·속도·필러워드)
  | "structure" // 구성 (논리 흐름·시간 배분)
  | "content" // 내용 충실도 (기술성·차별성)
  | "persuasion" // 설득력 (사업성·확신)
  | "clarity"; // 명료성 (이해 용이성)

export interface RehearsalDimension {
  key: RehearsalDimKey;
  label: string;
  score: number; // 0~100
  comment: string;
}

export interface AnticipatedQA {
  question: string;
  suggestedAnswer: string;
}

export interface RehearsalResult {
  overall: number;
  dimensions: RehearsalDimension[];
  metrics: SpeechMetrics;
  summary: string;
  strengths: string[];
  improvements: string[];
  anticipatedQuestions: AnticipatedQA[];
  engine: "claude" | "demo";
}

export const REHEARSAL_DIMS: { key: RehearsalDimKey; label: string }[] = [
  { key: "delivery", label: "전달력" },
  { key: "structure", label: "구성" },
  { key: "content", label: "내용 충실도" },
  { key: "persuasion", label: "설득력" },
  { key: "clarity", label: "명료성" },
];

// 간투사 집계는 metrics.ts 의 computeMetrics 가 담당한다(한국어·영어 모두).

// ---------------------------------------------------------------------------
export async function scoreRehearsal(input: RehearsalInput): Promise<RehearsalResult> {
  // 전사가 NFD(자모 분리) 한글로 들어오면 간투사·구조어("먼저/따라서" 등) 정규식이
  // 모두 빗나간다. 채점 전에 한 번만 NFC 로 합성해 전 경로에 같은 문자열을 넘긴다.
  const normalized: RehearsalInput = {
    ...input,
    transcript: (input.transcript || "").normalize("NFC"),
  };
  const metrics = computeMetrics(normalized.transcript, normalized.durationSec || 0, normalized.words);
  if (features.claude && normalized.transcript.trim()) {
    try {
      return await scoreWithClaude(normalized, metrics);
    } catch (e) {
      console.error("[rehearsal] Claude 채점 실패, 데모 대체:", e);
    }
  }
  return scoreWithDemo(normalized, metrics);
}

async function scoreWithClaude(
  input: RehearsalInput,
  metrics: SpeechMetrics
): Promise<RehearsalResult> {
  const client = new Anthropic({ apiKey: env.anthropicKey });
  const system = `당신은 정부 R&D·창업 지원사업(딥테크 5억원+) 발표 심사 경험이 풍부한 전문 심사위원이자 IR 발표 코치입니다.
지원자의 발표(스크립트 전사)를 아래 5개 영역으로 0~100점 채점합니다.
- delivery(전달력): 말하기 속도, 멈춤, 필러워드, 자신감 있는 어조
- structure(구성): 서론-본론-결론 흐름, 핵심 우선 배치, 시간 배분
- content(내용 충실도): 기술성·차별성·개발 가능성이 구체적으로 전달되는가
- persuasion(설득력): 시장성·사업화·성장 가능성에 대한 확신
- clarity(명료성): 비전문 심사위원도 이해할 만큼 쉽고 명확한가
또한 심사위원이 실제로 물어볼 법한 예리한 예상 질문 4~6개와 모범 답변 방향을 제시합니다.
모든 서술은 한국어. 코멘트는 구체적 개선점을 담습니다. 반드시 submit_rehearsal 도구를 호출하세요.`;

  const ann = trimDoc(input.announcement);
  const app = trimDoc(input.application);
  const ctx = [
    input.projectTitle ? `[발표 과제] ${input.projectTitle}` : "",
    input.planSummary ? `[사업계획 요약] ${input.planSummary}` : "",
    ann ? `[정부지원사업 공고문]\n${ann}` : "",
    app ? `[제출한 사업 신청서]\n${app}` : "",
    ann || app
      ? "※ 위 공고문·신청서·계획서를 교차로 검토해, 세 문서 간의 불일치나 공고 평가지표 대비 미흡한 부분을 파고드는 예상 질문을 뽑을 것."
      : "",
    input.question ? `[답변 대상 예상질문] ${input.question}` : "",
    input.targetSec ? `[목표 발표시간] ${input.targetSec}초` : "",
    `[음성 지표] ${metricsSummary(metrics)}`,
    `[발표 전사]\n${input.transcript}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const resp = await client.messages.create({
    model: env.claudeModel,
    max_tokens: 2500,
    system,
    tools: [{ name: "submit_rehearsal", description: "발표 채점 결과 제출", input_schema: REHEARSAL_SCHEMA }],
    tool_choice: { type: "tool", name: "submit_rehearsal" },
    messages: [{ role: "user", content: ctx }],
  });
  const tu = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!tu) throw new Error("no tool_use");
  const p = tu.input as Record<string, unknown>;

  const dims = normalizeDims((p.dimensions as RehearsalDimension[]) || []);
  const overall =
    typeof p.overall === "number"
      ? clamp(p.overall)
      : Math.round(dims.reduce((s, d) => s + d.score, 0) / dims.length);

  return {
    overall,
    dimensions: dims,
    metrics,
    summary: (p.summary as string) || "",
    strengths: (p.strengths as string[]) || [],
    improvements: (p.improvements as string[]) || [],
    anticipatedQuestions: normalizeQuestions(p.anticipatedQuestions),
    engine: "claude",
  };
}

const REHEARSAL_SCHEMA = {
  type: "object" as const,
  properties: {
    dimensions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          key: { type: "string", enum: ["delivery", "structure", "content", "persuasion", "clarity"] },
          score: { type: "number" },
          comment: { type: "string" },
        },
        required: ["key", "score", "comment"],
      },
    },
    overall: { type: "number" },
    summary: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    improvements: { type: "array", items: { type: "string" } },
    anticipatedQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          suggestedAnswer: { type: "string" },
        },
        required: ["question", "suggestedAnswer"],
      },
    },
  },
  required: ["dimensions", "overall", "summary", "strengths", "improvements", "anticipatedQuestions"],
};

// ---------------------------------------------------------------------------
// 발표 전 · 공고문 + 사업계획서 기반 예상 질문 생성 (녹음 없이 독립 실행)
// ---------------------------------------------------------------------------
export interface QuestionsInput {
  projectTitle?: string;
  planSummary?: string; // 사업계획서 상세 맥락
  announcement?: string; // 정부지원사업 공고문
  application?: string; // 제출한 사업 신청서
}

export async function generateAnticipatedQuestions(
  input: QuestionsInput
): Promise<{ questions: AnticipatedQA[]; engine: "claude" | "demo" }> {
  if (features.claude) {
    try {
      const client = new Anthropic({ apiKey: env.anthropicKey });
      const ann = trimDoc(input.announcement);
      const app = trimDoc(input.application);
      const system = `당신은 정부 R&D·창업 지원사업(딥테크) 대면 발표의 심사위원입니다.
지원자가 제출한 자료(공고문·사업 신청서·사업계획서)를 근거로, 실제 심사 현장에서 나올 법한
날카로운 예상 질문 6~8개와 각 질문에 대한 모범 답변 방향을 제시합니다.
- 세 문서를 교차 검토하세요:
  · 공고문 → 그 사업의 평가지표·지원목적·심사기준을 정확히 반영
    (예: 공고가 '사업화 성공 가능성'을 크게 본다면 매출·고객 검증 질문을, '기술 혁신성'을
     본다면 신규성·특허 질문을 우선 배치)
  · 사업 신청서 → 지원자가 실제로 써낸 목표·예산·일정·정량지표에서 근거가 약하거나
    과장된 부분, 공고 요건과 어긋나는 부분을 파고들기
  · 사업계획서 → 기술 구성·모델 선정·차별성의 구체적 허점
- 세 문서 간 불일치(예: 신청서 매출목표 vs 계획서 시장규모)가 있으면 반드시 질문으로 만드세요.
- 기술 타당성, 차별성, 시장성, 팀 역량, 예산·일정 리스크를 고르게 다루세요.
- 두루뭉술한 질문이 아니라, 제출 자료의 구체적 약점을 파고드는 질문을 만드세요.
- 각 질문에는 어떤 근거(공고문/신청서/계획서)에서 나온 질문인지 자연스럽게 드러나면 좋습니다.
모든 서술은 한국어. 반드시 submit_questions 도구를 호출하세요.`;
      const ctx = [
        input.projectTitle ? `[과제명] ${input.projectTitle}` : "",
        ann ? `[정부지원사업 공고문]\n${ann}` : "[공고문] (미제출)",
        app ? `[제출한 사업 신청서]\n${app}` : "[사업 신청서] (미제출)",
        input.planSummary ? `[사업계획서 요약]\n${input.planSummary}` : "[사업계획서] (미완성)",
      ]
        .filter(Boolean)
        .join("\n\n");

      const resp = await client.messages.create({
        model: env.claudeModel,
        max_tokens: 3000,
        system,
        tools: [{ name: "submit_questions", description: "예상 질문 목록 제출", input_schema: QUESTIONS_SCHEMA }],
        tool_choice: { type: "tool", name: "submit_questions" },
        messages: [{ role: "user", content: ctx }],
      });
      const tu = resp.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      if (!tu) throw new Error("no tool_use");
      const raw = (tu.input as { questions?: unknown })?.questions;
      const questions = normalizeQuestions(raw);
      if (questions.length) return { questions, engine: "claude" };
      console.error("[rehearsal] generateAnticipatedQuestions: 결과가 비어 데모 대체");
    } catch (e) {
      console.error("[rehearsal] generateAnticipatedQuestions Claude 실패, 데모 대체:", e);
    }
  }
  return {
    questions: demoQuestions({ transcript: "", durationSec: 0, projectTitle: input.projectTitle }),
    engine: "demo",
  };
}

const QUESTIONS_SCHEMA = {
  type: "object" as const,
  properties: {
    questions: {
      type: "array",
      minItems: 6,
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          suggestedAnswer: { type: "string", description: "모범 답변 방향(구체적으로)" },
        },
        required: ["question", "suggestedAnswer"],
      },
    },
  },
  required: ["questions"],
};

// tool_use 가 배열을 문자열/객체맵으로 돌려줘도 복원한다 (planning.asArray 와 동일 취지).
function normalizeQuestions(v: unknown): AnticipatedQA[] {
  let arr: unknown[] = [];
  if (Array.isArray(v)) arr = v;
  else if (typeof v === "string") {
    try {
      const p = JSON.parse(v);
      arr = Array.isArray(p) ? p : [p];
    } catch {
      arr = [];
    }
  } else if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    arr = keys.length && keys.every((k) => /^\d+$/.test(k)) ? Object.values(o) : [o];
  }
  return arr
    .map((q) => q as Partial<AnticipatedQA>)
    .filter((q) => q?.question)
    .map((q) => ({ question: q.question || "", suggestedAnswer: q.suggestedAnswer || "" }));
}

function normalizeDims(dims: RehearsalDimension[]): RehearsalDimension[] {
  return REHEARSAL_DIMS.map((d) => {
    const f = dims.find((x) => x.key === d.key);
    return { key: d.key, label: d.label, score: f ? clamp(f.score) : 60, comment: f?.comment || "" };
  });
}

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

// ---------------------------------------------------------------------------
// 데모 채점 (키 없이도 현실적 결과)
// ---------------------------------------------------------------------------
function scoreWithDemo(input: RehearsalInput, metrics: SpeechMetrics): RehearsalResult {
  const t = input.transcript.trim();
  const fillers = metrics.fillerCount; // 한국어 간투사 포함 (metrics.ts)
  const chars = t.replace(/\s/g, "").length;

  // 전달력: 속도 적정(한국어 발표 250~350자/분 근사) + 필러/멈춤 감점
  const cpm = input.durationSec ? (chars / input.durationSec) * 60 : 0;
  const speedScore = cpm ? 100 - Math.min(45, Math.abs(300 - cpm) * 0.12) : 55;
  const delivery = clamp(speedScore - fillers * 3 - metrics.pauseCount * 1.5);

  // 구성: 접속/구조 표현 + 시간 목표 부합
  const structureWords = (t.match(/(먼저|첫째|둘째|셋째|다음으로|마지막|결론|요약|따라서|그래서)/g) || []).length;
  const timeFit = input.targetSec
    ? 100 - Math.min(40, (Math.abs(input.durationSec - input.targetSec) / input.targetSec) * 100)
    : 72;
  const structure = clamp(50 + structureWords * 6 + (timeFit - 72) * 0.4);

  // 내용: 기술/사업 키워드 밀도 + 길이
  const contentWords = (t.match(/(기술|알고리즘|AI|모델|데이터|특허|시장|매출|차별|개발|성능|정확도|고객)/g) || []).length;
  const content = clamp(48 + Math.min(30, contentWords * 3) + Math.min(12, chars / 120));

  // 설득력: 정량·성과·확신 표현
  const persWords = (t.match(/(\d+%|\d+억|\d+명|\d+배|목표|달성|검증|확보|계약|출시|선정)/g) || []).length;
  const persuasion = clamp(50 + persWords * 5 + Math.min(10, contentWords));

  // 명료성: 문장 길이·필러 역가중
  const sentences = t.split(/[.!?。]|다\.|요\./).filter((s) => s.trim().length > 3).length;
  const clarity = clamp(62 + Math.min(16, sentences * 2) - fillers * 2);

  const dims: RehearsalDimension[] = [
    { key: "delivery", label: "전달력", score: delivery, comment: deliveryComment(delivery, metrics, fillers, cpm) },
    { key: "structure", label: "구성", score: structure, comment: structure >= 72 ? "논리 흐름이 잡혀 있습니다." : "먼저/다음으로/결론 같은 구조 신호어로 흐름을 명확히 하세요." },
    { key: "content", label: "내용 충실도", score: content, comment: content >= 72 ? "기술·사업 내용이 구체적입니다." : "핵심 기술과 차별점을 수치와 함께 더 구체적으로 담으세요." },
    { key: "persuasion", label: "설득력", score: persuasion, comment: persuasion >= 72 ? "정량 근거로 설득력이 있습니다." : "목표 수치·성과·검증 계획 등 정량 근거를 추가하세요." },
    { key: "clarity", label: "명료성", score: clarity, comment: clarity >= 72 ? "이해하기 쉽게 전달됩니다." : "한 문장을 짧게 끊고 전문용어에 짧은 설명을 덧붙이세요." },
  ];
  const filtered = t ? dims : dims.map((d) => ({ ...d, score: 0, comment: "발표 음성이 감지되지 않았습니다. 마이크와 녹음 상태를 확인하세요." }));
  const overall = Math.round(filtered.reduce((s, d) => s + d.score, 0) / filtered.length);

  return {
    overall,
    dimensions: filtered,
    metrics,
    summary: t
      ? `약 ${input.durationSec}초 동안 ${metrics.wordCount}어절을 발표했습니다. 전달력과 구성은 다듬을 여지가 있으며, 핵심 기술·차별성·사업성을 정량 근거와 함께 앞쪽에 배치하면 설득력이 높아집니다. (데모 채점 결과이며, API 키 연결 시 Claude 정밀 채점·맞춤 Q&A가 제공됩니다.)`
      : "발표 음성이 감지되지 않았습니다.",
    strengths: t ? ["과제 내용을 자신의 언어로 전달함"] : [],
    improvements: [
      fillers >= 3 ? `필러워드(음/어/그 등) ${fillers}회 — 짧은 침묵으로 대체하세요.` : "도입 10초 안에 '무엇을·왜'가 드러나도록 첫 문장을 강화하세요.",
      "결론에서 목표 성과와 사업화 계획을 한 문장으로 요약하세요.",
    ],
    anticipatedQuestions: demoQuestions(input),
    engine: "demo",
  };
}

function deliveryComment(score: number, m: SpeechMetrics, fillers: number, cpm: number): string {
  const speed = cpm ? `말속도 약 ${Math.round(cpm)}자/분` : `${m.wpm} 어절/분`;
  return `${speed} · 필러 ${fillers}회 · 멈춤 ${m.pauseCount}회. ${
    score >= 72 ? "안정적인 전달입니다." : "속도를 일정하게 하고 불필요한 멈춤·간투사를 줄이세요."
  }`;
}

function demoQuestions(input: RehearsalInput): AnticipatedQA[] {
  const title = input.projectTitle || "본 과제";
  return [
    {
      question: `${title}의 기술이 기존 솔루션과 근본적으로 다른 점은 무엇입니까?`,
      suggestedAnswer: "핵심 알고리즘의 신규성(어떤 데이터로 무엇을 어떻게)과 특허 출원 계획, 정량적 성능 우위를 근거로 제시하세요.",
    },
    {
      question: "핵심 AI 모델의 성능(정확도)을 어떻게 검증하고 목표치는 얼마입니까?",
      suggestedAnswer: "검증 데이터셋·평가지표·베이스라인 대비 목표 수치와 검증 방법(교차검증, 전문가 검수)을 구체적으로 답하세요.",
    },
    {
      question: "학습 데이터는 어떻게 확보하며 편향·품질 문제는 어떻게 해결합니까?",
      suggestedAnswer: "보유 데이터·수집 계획·라벨링 체계와 Human-in-the-Loop 검수, 데이터 증강 전략을 제시하세요.",
    },
    {
      question: "사업화 모델과 목표 시장 규모, 초기 고객 확보 방안은 무엇입니까?",
      suggestedAnswer: "TAM/SAM/SOM, 수익모델(구독·라이선스), 보유 채널 기반 초기 검증 계획을 수치로 답하세요.",
    },
    {
      question: "개발 인력과 일정이 목표 대비 현실적입니까? 리스크 대응은?",
      suggestedAnswer: "단계별 마일스톤, 인력 채용·역할, 주요 기술 리스크와 대안(fallback)을 제시하세요.",
    },
  ];
}
