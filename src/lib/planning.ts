// 딥테크 정부지원사업 기술기획 · 사업계획서 자동 완성 엔진
// 참고 방법론: 첨부 문서(딥테크 기술기획 Step 1~4 + 계획서 완성)의 흐름을 그대로 구현한다.
//   Step 1: 사업 소개 + 문제점 → AI가 5개 딥테크 아이디어 도출
//   Step 2: 아이디어 선택      → AI가 시스템 아키텍처(4계층 + 모듈별 상세) 설계
//   Step 3: 선정이력/특허       → AI가 차별화 포인트(핵심 알고리즘·IP) 도출
//   Step 4: 대표/팀 이력        → AI가 연구개발 기획 초안 조립
//   Plan  : 위 전체            → 정부 R&D 사업계획서 양식으로 완성
//
// grader.ts 와 동일하게, ANTHROPIC_API_KEY 가 있으면 Claude(도구호출)로 생성하고
// 없으면 입력 기반 데모 생성으로 완전히 동작한다(데모 모드).

import Anthropic from "@anthropic-ai/sdk";
import { env, features } from "./env";
import { modelSelectionGuide, WINNING_PLAN_STYLE } from "./aiModels";

// ---------------------------------------------------------------------------
// 데이터 모델
// ---------------------------------------------------------------------------

export interface PlanningInput {
  // Step 1
  businessIntro: string; // 사업 소개
  problems: string[]; // 해결하고 싶은 문제(페인포인트)
  // Step 2
  selectedIdeaIds: number[]; // 선택한 아이디어 번호(1~5). 비어있으면 전체 통합
  // Step 3
  history: string; // 선정이력·특허·수상 등 (없으면 "없음")
  // Step 4
  founder: string; // 대표자 이력
  team: string; // 팀원 구성/이력
}

export const EMPTY_INPUT: PlanningInput = {
  businessIntro: "",
  problems: [""],
  selectedIdeaIds: [],
  history: "",
  founder: "",
  team: "",
};

export interface DeepTechIdea {
  id: number;
  title: string; // 아이디어 제목(과제형)
  summary: string; // 설명 + 해결하는 문제 매핑
  aiTech: string; // 핵심 AI 기술 (ASR/NLP/RL/CV ...)
  novelty: string; // R&D 과제로서의 신규성·난이도
  solvedProblems: string[]; // 해결하는 문제 요약
  metrics?: string; // 정량 성능 목표(선택)
}

export interface ArchModule {
  id: string; // "모듈1" | "M1"
  name: string; // 엔진/모듈명
  role: string; // 역할/정의
  aiModels: string; // 적용 AI 모델 (구체 모델명, 콤마 구분)
  input: string;
  processing: string;
  output: string;
  learningMethod: string; // 학습·개발 방식
  metrics?: string; // 정량 성능 목표 (표준 지표 + 수치)
  rationale?: string; // 모델 선정 근거 (검토한 대안 대비 선택 이유)
}

export interface Architecture {
  systemName: string; // 통합 시스템명
  overview: string; // 아키텍처 개요
  layers: { name: string; description: string }[]; // 4계층
  modules: ArchModule[]; // 핵심 모듈
  dataFlow: string; // 모듈 간 데이터 흐름 요약(텍스트)
  techStack: { layer: string; tech: string }[]; // 기술 스택 요약
}

export interface Differentiator {
  id: number;
  title: string; // 자사 고유 알고리즘 명
  description: string;
  rationale: string; // 근거(신규성·특허 출원 가능성)
}

export interface NecessitySection {
  heading: string;
  body: string;
}

export interface RnDDraft {
  projectTitle: string; // 연구개발 과제명
  necessity: NecessitySection[]; // 연구개발의 필요성
  processModules: ArchModule[]; // 연구개발 과정 프로세스(모듈별)
}

export interface BusinessPlan {
  titleCandidates: string[]; // 과제명 후보
  summaryTable: ArchModule[]; // 모듈별 요약표
  necessity: NecessitySection[]; // 연구개발의 필요성
  systemFlow: string; // 운영 시스템 흐름
  processDetail: ArchModule[]; // 연구개발 프로세스(모듈별 상세)
  marketStrategy: string; // 사업화·시장 전략
  teamPlan: string; // 추진 체계·팀 구성
  engine: "claude" | "demo";
}

// 프로젝트 전체 산출물(단계별 누적)
export interface PlanningArtifacts {
  ideas?: DeepTechIdea[];
  architecture?: Architecture;
  differentiators?: Differentiator[];
  draft?: RnDDraft;
  plan?: BusinessPlan;
  announcement?: string; // 발표연습용 정부지원사업 공고문 원문(사용자 업로드)
}

export type GenerateAction =
  | "ideas"
  | "architecture"
  | "differentiators"
  | "draft"
  | "plan";

// ---------------------------------------------------------------------------
// Claude 공통 헬퍼
// ---------------------------------------------------------------------------

const SYSTEM_BASE = `당신은 딥테크(첨단기술) 정부지원사업 전문 컨설턴트이자 R&D 기획 전문가입니다.
중소벤처기업부·창업진흥원·정보통신기획평가원(IITP) 등 정부 R&D 과제의 심사 기준(기술성·신규성·사업성·개발가능성)을 정확히 이해하고 있습니다.
목표는 5억원 이상 규모의 딥테크 지원사업 서류를 통과시키는 것입니다.
모든 서술은 한국어로, 심사위원을 설득하는 구체적·기술적·정량적 문장으로 작성합니다.
과장된 형용사 대신 기술 용어(모델명·알고리즘·지표)와 논리적 근거를 사용합니다.

${WINNING_PLAN_STYLE}`;

async function callClaude<T>(
  system: string,
  userPrompt: string,
  toolName: string,
  schema: Record<string, unknown>,
  maxTokens = 8000
): Promise<T> {
  const client = new Anthropic({ apiKey: env.anthropicKey });
  // 한국어 계획서는 출력 토큰 소모가 커서 max_tokens 를 넉넉히 잡는다.
  // 큰 max_tokens 로 비스트리밍 요청을 보내면 HTTP 타임아웃 위험이 있으므로 스트리밍으로 받는다.
  const stream = client.messages.stream({
    model: env.claudeModel,
    max_tokens: maxTokens,
    system: `${SYSTEM_BASE}\n\n${system}`,
    tools: [{ name: toolName, description: "결과 제출", input_schema: schema as Anthropic.Tool.InputSchema }],
    tool_choice: { type: "tool", name: toolName },
    messages: [{ role: "user", content: userPrompt }],
  });
  const resp = await stream.finalMessage();

  // 출력이 잘리면 tool_use JSON 이 불완전해져 뒤쪽 필드가 통째로 사라진다.
  // 조용히 데모로 폴백하지 않도록 반드시 로그로 남긴다.
  if (resp.stop_reason === "max_tokens") {
    console.error(
      `[planning] ${toolName}: max_tokens(${maxTokens}) 도달 — 출력이 잘렸습니다. ` +
        `출력 토큰=${resp.usage?.output_tokens}`
    );
  }

  const tu = resp.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!tu) throw new Error(`no tool_use (stop_reason=${resp.stop_reason})`);
  return tu.input as T;
}

// Claude 도구호출(tool_use)이 배열 필드를 배열이 아닌 형태로 돌려주는 경우가 있다.
//   - JSON 문자열:  { "ideas": "[{...},{...}]" }
//   - 객체 맵:      { "ideas": { "0": {...}, "1": {...} } }
//   - 단일 객체:    { "ideas": {...} }
// 어떤 형태로 와도 배열로 복원한다. (복원 실패 시에만 데모로 폴백)
function asArray<T>(v: unknown): T[] {
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed as T[];
      if (parsed && typeof parsed === "object") return [parsed as T];
    } catch {
      /* 파싱 불가 → 빈 배열 */
    }
    return [];
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    const keys = Object.keys(o);
    // { "0": {...}, "1": {...} } 형태만 값 배열로 펼친다
    if (keys.length > 0 && keys.every((k) => /^\d+$/.test(k))) return Object.values(o) as T[];
    return [o as T];
  }
  return [];
}

function problemsBlock(input: PlanningInput): string {
  const ps = input.problems.filter((p) => p.trim());
  return ps.map((p, i) => `문제${i + 1}. ${p}`).join("\n");
}

// ---------------------------------------------------------------------------
// Step 1 · 5개 딥테크 아이디어
// ---------------------------------------------------------------------------

export async function generateIdeas(input: PlanningInput): Promise<DeepTechIdea[]> {
  if (features.claude) {
    try {
      const system = `[작업] 사업 소개와 문제점(페인포인트)을 바탕으로, 정부 딥테크 R&D 과제로 제안 가능한 5개의 딥테크 아이디어를 도출하세요.
각 아이디어는 (1) AI/첨단기술로 문제를 해결하고 (2) R&D 과제로서 기술 난이도·신규성이 있어야 합니다.
각 아이디어가 어떤 문제(문제1, 문제2 ...)를 해결하는지 명시하세요.
5개 아이디어는 서로 다른 과업 유형(예: 인식/생성/예측/최적화/추천)을 다루도록 다양하게 구성하고,
aiTech 에는 반드시 구체적인 모델명을 쓰세요.

${modelSelectionGuide()}`;
      const user = `[사업 소개]\n${input.businessIntro}\n\n[해결하고 싶은 문제]\n${problemsBlock(input)}`;
      const out = await callClaude<{ ideas: DeepTechIdea[] }>(
        system,
        user,
        "submit_ideas",
        IDEAS_SCHEMA
      );
      const ideas = asArray<DeepTechIdea>(out?.ideas)
        .slice(0, 5)
        .map((it, i) => ({ ...it, id: i + 1, solvedProblems: asArray<string>(it?.solvedProblems) }));
      if (ideas.length) return ideas;
      console.error("[planning] generateIdeas: 결과가 비어 있어 데모 대체");
    } catch (e) {
      console.error("[planning] generateIdeas Claude 실패, 데모 대체:", e);
    }
  }
  return demoIdeas(input);
}

const IDEAS_SCHEMA = {
  type: "object" as const,
  properties: {
    ideas: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "아이디어 제목(개발 과제형, ~ 시스템/플랫폼 개발)" },
          summary: { type: "string", description: "2~3문장 설명. 기존 한계와 차별점 포함" },
          aiTech: {
            type: "string",
            description:
              "핵심 AI 기술 — 구체적인 모델명으로 쓸 것 (예: 'Whisper large-v3 + pyannote 화자분리', " +
              "'HRNet-W48 키포인트 검출', 'LightGBM 이탈예측'). '딥러닝'·'NLP' 같은 뭉뚱그린 표현 금지.",
          },
          novelty: { type: "string", description: "R&D 과제로서의 신규성·기술 난이도" },
          solvedProblems: { type: "array", items: { type: "string" } },
        },
        required: ["title", "summary", "aiTech", "novelty", "solvedProblems"],
      },
    },
  },
  required: ["ideas"],
};

// ---------------------------------------------------------------------------
// Step 2 · 시스템 아키텍처
// ---------------------------------------------------------------------------

export async function generateArchitecture(
  input: PlanningInput,
  ideas: DeepTechIdea[]
): Promise<Architecture> {
  const selected = pickIdeas(input, ideas);
  if (features.claude) {
    try {
      const system = `[작업] 선택된 딥테크 아이디어를 통합하는 시스템 아키텍처를 설계하세요.
- 4계층(UI Layer, Service Layer, AI Engine Layer, Data Layer) 구조로 설명
- 핵심 AI 엔진 모듈 4~6개를 정의(각 모듈: 역할, 적용 AI 모델, Input, Processing, Output,
  학습·개발 방식, 정량 성능 목표, 모델 선정 근거)
- 모듈 간 데이터 흐름을 서술
- 계층별 기술 스택 제시(모델 서빙·최적화 방식 포함)

${modelSelectionGuide()}`;
      const user = `[사업 소개]\n${input.businessIntro}\n\n[문제점]\n${problemsBlock(input)}\n\n[선택된 아이디어]\n${selected
        .map((i) => `- ${i.title}: ${i.summary}`)
        .join("\n")}`;
      const out = await callClaude<Architecture>(
        system,
        user,
        "submit_architecture",
        ARCH_SCHEMA,
        12000
      );
      const arch = normalizeArch(out);
      if (arch.modules.length) return arch;
      console.error("[planning] generateArchitecture: 모듈이 비어 있어 데모 대체");
    } catch (e) {
      console.error("[planning] generateArchitecture Claude 실패, 데모 대체:", e);
    }
  }
  return demoArchitecture(input, selected);
}

const MODULE_PROPS = {
  id: { type: "string", description: "모듈1, 모듈2 ..." },
  name: { type: "string" },
  role: { type: "string", description: "역할/정의" },
  aiModels: {
    type: "string",
    description:
      "적용 AI 모델. 반드시 구체적인 모델명(예: HRNet-W48, BiRefNet, Whisper large-v3, LightGBM). " +
      "'딥러닝'·'AI 모델' 같은 뭉뚱그린 표현 금지. 모듈마다 과업에 맞는 서로 다른 모델을 선택할 것.",
  },
  input: { type: "string" },
  processing: { type: "string" },
  output: { type: "string" },
  learningMethod: { type: "string", description: "학습·개발 방식(파인튜닝 기법·데이터 확보·검수 포함)" },
  metrics: {
    type: "string",
    description:
      "정량 성능 목표. 해당 과업의 표준 지표와 수치를 함께 제시(예: 'IoU 0.85 이상, 추론 p95 200ms 이하').",
  },
  rationale: {
    type: "string",
    description:
      "모델 선정 근거. 검토한 대안 모델 1~2개를 명시하고 왜 그 대안이 아니라 이 모델을 선택했는지 " +
      "데이터 특성·정확도·지연시간·비용 관점에서 설명.",
  },
};
const MODULE_REQUIRED = [
  "id", "name", "role", "aiModels", "input", "processing", "output", "learningMethod", "metrics", "rationale",
];

const ARCH_SCHEMA = {
  type: "object" as const,
  properties: {
    systemName: { type: "string" },
    overview: { type: "string" },
    layers: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, description: { type: "string" } },
        required: ["name", "description"],
      },
    },
    modules: {
      type: "array",
      minItems: 4,
      items: { type: "object", properties: MODULE_PROPS, required: MODULE_REQUIRED },
    },
    dataFlow: { type: "string" },
    techStack: {
      type: "array",
      items: {
        type: "object",
        properties: { layer: { type: "string" }, tech: { type: "string" } },
        required: ["layer", "tech"],
      },
    },
  },
  required: ["systemName", "overview", "layers", "modules", "dataFlow", "techStack"],
};

// ---------------------------------------------------------------------------
// Step 3 · 차별화 포인트(핵심 알고리즘·IP)
// ---------------------------------------------------------------------------

export async function generateDifferentiators(
  input: PlanningInput,
  arch: Architecture
): Promise<Differentiator[]> {
  if (features.claude) {
    try {
      const system = `[작업] 아키텍처의 핵심 모듈을 근거로, 자사 고유의 차별화 알고리즘(핵심 IP) 3~5개를 도출하세요.
각 항목은 (1) 알고리즘 명, (2) 무엇을 어떻게 하는지, (3) 왜 기존 기술과 다르고 특허 출원/권리화가 가능한지(근거)를 포함합니다.
선정이력·특허가 없다면, 이 알고리즘들이 향후 특허 출원 대상이 됨을 강조하세요.
설명에는 어떤 오픈소스 모델 위에 어떤 자사 고유 로직을 결합했는지 구체 모델명과 함께 쓰고,
가능하면 기존 기술 대비 정량적 우위(지표·수치)를 제시하세요.

${modelSelectionGuide()}`;
      const user = `[시스템명]\n${arch.systemName}\n\n[핵심 모듈]\n${arch.modules
        .map((m) => `- ${m.name}: ${m.role} (AI: ${m.aiModels})`)
        .join("\n")}\n\n[선정이력·특허]\n${input.history || "없음"}`;
      const out = await callClaude<{ differentiators: Differentiator[] }>(
        system,
        user,
        "submit_diff",
        DIFF_SCHEMA
      );
      const diffs = asArray<Differentiator>(out?.differentiators)
        .filter((d) => d && (d.title || d.description))
        .map((d, i) => ({
          id: i + 1,
          title: d.title || `차별화 알고리즘 ${i + 1}`,
          description: d.description || "",
          rationale: d.rationale || "",
        }));
      if (diffs.length) return diffs;
      console.error("[planning] generateDifferentiators: 결과가 비어 있어 데모 대체");
    } catch (e) {
      console.error("[planning] generateDifferentiators Claude 실패, 데모 대체:", e);
    }
  }
  return demoDifferentiators(arch);
}

const DIFF_SCHEMA = {
  type: "object" as const,
  properties: {
    differentiators: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          rationale: { type: "string", description: "신규성·특허 출원 가능성 근거" },
        },
        required: ["title", "description", "rationale"],
      },
    },
  },
  required: ["differentiators"],
};

// ---------------------------------------------------------------------------
// Step 4 · 연구개발 기획 초안
// ---------------------------------------------------------------------------

export async function generateDraft(
  input: PlanningInput,
  arch: Architecture,
  diffs: Differentiator[]
): Promise<RnDDraft> {
  if (features.claude) {
    try {
      const system = `[작업] 아래 정보를 모두 취합하여 정부 R&D 연구개발 기획 초안을 작성하세요.
- projectTitle: 핵심 기술을 담은 연구개발 과제명 1개
- necessity: 연구개발의 필요성 3개 항목(각 heading + body 3~5문장). 시장/구조적 문제 + 정량 근거
- processModules: 연구개발 과정 프로세스를 모듈별로 정리(각 모듈: 정의(role), 적용 AI 모델, Input,
  Processing, Output, 학습·개발 방식, 정량 성능 목표(metrics), 모델 선정 근거(rationale)).
  대표/팀의 보유 데이터·경험을 학습데이터 확보·검수(Human-in-the-Loop)에 활용하는 점을 반영

${modelSelectionGuide()}`;
      const user = `[시스템명] ${arch.systemName}\n[개요] ${arch.overview}\n\n[핵심 모듈]\n${arch.modules
        .map((m) => `- ${m.id} ${m.name}: ${m.role} / AI: ${m.aiModels} / 학습: ${m.learningMethod}`)
        .join("\n")}\n\n[차별화 알고리즘]\n${diffs
        .map((d) => `- ${d.title}: ${d.description}`)
        .join("\n")}\n\n[대표자 이력]\n${input.founder}\n\n[팀원]\n${input.team}\n\n[문제점]\n${problemsBlock(input)}`;
      const out = await callClaude<RnDDraft>(system, user, "submit_draft", DRAFT_SCHEMA, 12000);
      const necessity = asArray<NecessitySection>(out?.necessity).filter((n) => n?.heading || n?.body);
      const processModules = asArray<Partial<ArchModule>>(out?.processModules).map(normalizeModule);
      if (out?.projectTitle && necessity.length) {
        return {
          projectTitle: out.projectTitle,
          necessity,
          processModules: processModules.length ? processModules : arch.modules,
        };
      }
      console.error("[planning] generateDraft: 결과가 비어 있어 데모 대체");
    } catch (e) {
      console.error("[planning] generateDraft Claude 실패, 데모 대체:", e);
    }
  }
  return demoDraft(input, arch, diffs);
}

const DRAFT_SCHEMA = {
  type: "object" as const,
  properties: {
    projectTitle: { type: "string" },
    necessity: {
      type: "array",
      minItems: 3,
      items: {
        type: "object",
        properties: { heading: { type: "string" }, body: { type: "string" } },
        required: ["heading", "body"],
      },
    },
    processModules: {
      type: "array",
      minItems: 4,
      items: { type: "object", properties: MODULE_PROPS, required: MODULE_REQUIRED },
    },
  },
  required: ["projectTitle", "necessity", "processModules"],
};

// ---------------------------------------------------------------------------
// 사업계획서 완성
// ---------------------------------------------------------------------------

export async function generatePlan(
  input: PlanningInput,
  artifacts: PlanningArtifacts
): Promise<BusinessPlan> {
  const arch = artifacts.architecture;
  const draft = artifacts.draft;
  if (features.claude && arch) {
    try {
      const system = `[작업] 아래 기술기획 산출물을 정부 딥테크 R&D 사업계획서 양식으로 완성하세요. 반드시 다음을 포함:
- titleCandidates: 연구개발 과제명 후보 3개
- necessity: 연구개발의 필요성 3개 항목(heading + body)
- systemFlow: 운영 시스템 흐름(사용자 입력→모듈→출력) 서술
- processDetail: 연구개발 프로세스 모듈별 상세(각 모듈 정의/Input/Processing/AI모델/학습방법/Output/
  정량 성능 목표(metrics)/모델 선정 근거(rationale))
- marketStrategy: 사업화·시장진입·수익모델 전략(3~5문장). 목표시장 규모와 연평균성장률을
  가능하면 출처와 함께 제시하고, 초기 B2B 실증 → SaaS 구독 확장 단계로 서술
- teamPlan: 추진 체계·팀 구성·역량. (대표자 총괄 역량) → (내부 개발 인력의 담당 기술) →
  (외부 전문가 자문) 3단 구조로 쓰고, 보유 데이터·선행 경험을 학습데이터 확보와 연결

${modelSelectionGuide()}`;
      const user = `[시스템명] ${arch.systemName}\n[개요] ${arch.overview}\n\n[모듈]\n${arch.modules
        .map((m) => `${m.id} ${m.name}: 역할=${m.role}; AI=${m.aiModels}; In=${m.input}; Proc=${m.processing}; Out=${m.output}; 학습=${m.learningMethod}`)
        .join("\n")}\n\n[과제명 초안] ${draft?.projectTitle || arch.systemName}\n[필요성]\n${(draft?.necessity || [])
        .map((n) => `- ${n.heading}: ${n.body}`)
        .join("\n")}\n\n[대표] ${input.founder}\n[팀] ${input.team}`;
      const out = await callClaude<BusinessPlan>(system, user, "submit_plan", PLAN_SCHEMA, 14000);
      const titleCandidates = asArray<string>(out?.titleCandidates).filter(Boolean);
      const necessity = asArray<NecessitySection>(out?.necessity).filter((n) => n?.heading || n?.body);
      const processDetail = asArray<Partial<ArchModule>>(out?.processDetail).map(normalizeModule);
      // 요약표는 모듈 상세와 동일한 데이터이므로 중복 생성 대신 파생시킨다(출력 토큰 절반 절감).
      const summaryTable = processDetail;
      if (titleCandidates.length && necessity.length) {
        return {
          titleCandidates,
          summaryTable: summaryTable.length ? summaryTable : arch.modules,
          necessity,
          systemFlow: out?.systemFlow || "",
          processDetail: processDetail.length ? processDetail : arch.modules,
          marketStrategy: out?.marketStrategy || "",
          teamPlan: out?.teamPlan || "",
          engine: "claude",
        };
      }
      console.error("[planning] generatePlan: 결과가 비어 있어 데모 대체");
    } catch (e) {
      console.error("[planning] generatePlan Claude 실패, 데모 대체:", e);
    }
  }
  return demoPlan(input, artifacts);
}

// summaryTable 은 processDetail 과 동일한 모듈 데이터라 중복 생성하지 않는다.
// (한국어 모듈 표를 두 번 출력하면 출력 토큰이 두 배가 되어 JSON 이 잘린다 → 코드에서 파생)
const PLAN_SCHEMA = {
  type: "object" as const,
  properties: {
    titleCandidates: { type: "array", items: { type: "string" }, minItems: 3 },
    necessity: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: { type: "string" }, body: { type: "string" } },
        required: ["heading", "body"],
      },
    },
    systemFlow: { type: "string" },
    processDetail: {
      type: "array",
      items: { type: "object", properties: MODULE_PROPS, required: MODULE_REQUIRED },
    },
    marketStrategy: { type: "string" },
    teamPlan: { type: "string" },
  },
  required: ["titleCandidates", "necessity", "systemFlow", "processDetail", "marketStrategy", "teamPlan"],
};

// ---------------------------------------------------------------------------
// 유틸
// ---------------------------------------------------------------------------

export function pickIdeas(input: PlanningInput, ideas: DeepTechIdea[]): DeepTechIdea[] {
  if (!input.selectedIdeaIds?.length) return ideas;
  const sel = ideas.filter((i) => input.selectedIdeaIds.includes(i.id));
  return sel.length ? sel : ideas;
}

function normalizeModule(m: Partial<ArchModule>, i = 0): ArchModule {
  return {
    id: m.id || `모듈${i + 1}`,
    name: m.name || `모듈 ${i + 1}`,
    role: m.role || "",
    aiModels: m.aiModels || "",
    input: m.input || "",
    processing: m.processing || "",
    output: m.output || "",
    learningMethod: m.learningMethod || "",
    metrics: m.metrics || "",
    rationale: m.rationale || "",
  };
}

function normalizeArch(a: Architecture): Architecture {
  const layers = asArray<{ name: string; description: string }>(a?.layers).filter((l) => l?.name);
  const techStack = asArray<{ layer: string; tech: string }>(a?.techStack).filter((s) => s?.layer || s?.tech);
  return {
    systemName: a?.systemName || "통합 AI 플랫폼",
    overview: a?.overview || "",
    layers: layers.length ? layers : DEFAULT_LAYERS,
    modules: asArray<Partial<ArchModule>>(a?.modules).map((m, i) => normalizeModule(m, i)),
    dataFlow: a?.dataFlow || "",
    techStack: techStack.length ? techStack : DEFAULT_STACK,
  };
}

function normalizeIdea(it: Partial<DeepTechIdea>, i: number): DeepTechIdea {
  return {
    id: typeof it?.id === "number" ? it.id : i + 1,
    title: it?.title || `아이디어 ${i + 1}`,
    summary: it?.summary || "",
    aiTech: it?.aiTech || "",
    novelty: it?.novelty || "",
    solvedProblems: asArray<string>(it?.solvedProblems).filter((s) => typeof s === "string"),
  };
}

function normalizeDiff(d: Partial<Differentiator>, i: number): Differentiator {
  return {
    id: i + 1,
    title: d?.title || `차별화 알고리즘 ${i + 1}`,
    description: d?.description || "",
    rationale: d?.rationale || "",
  };
}

function normalizeNecessity(v: unknown): NecessitySection[] {
  return asArray<NecessitySection>(v)
    .filter((n) => n?.heading || n?.body)
    .map((n) => ({ heading: n.heading || "", body: n.body || "" }));
}

function normalizeDraft(d: Partial<RnDDraft>): RnDDraft {
  return {
    projectTitle: d?.projectTitle || "",
    necessity: normalizeNecessity(d?.necessity),
    processModules: asArray<Partial<ArchModule>>(d?.processModules).map(normalizeModule),
  };
}

// 계획서를 화면·내보내기가 안전하게 쓸 수 있는 형태로 보정한다.
// titleCandidates[0]을 직접 참조하는 화면이 있으므로 절대 빈 배열이 되지 않게 보장한다.
export function normalizePlan(
  p: Partial<BusinessPlan> | undefined | null,
  fallbackTitle = "연구개발 과제"
): BusinessPlan {
  const titleCandidates = asArray<string>(p?.titleCandidates).filter(
    (t) => typeof t === "string" && t.trim()
  );
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  return {
    titleCandidates: titleCandidates.length ? titleCandidates : [fallbackTitle],
    summaryTable: asArray<Partial<ArchModule>>(p?.summaryTable).map(normalizeModule),
    necessity: normalizeNecessity(p?.necessity),
    systemFlow: str(p?.systemFlow),
    processDetail: asArray<Partial<ArchModule>>(p?.processDetail).map(normalizeModule),
    marketStrategy: str(p?.marketStrategy),
    teamPlan: str(p?.teamPlan),
    engine: p?.engine === "claude" ? "claude" : "demo",
  };
}

// 저장소에서 읽어온 산출물을 정화한다.
// 과거 버전이 배열 필드를 깨진 형태(문자열/undefined)로 저장한 기록이 있어,
// 읽는 지점에서 한 번 보정해야 계획서 화면이 500으로 죽지 않는다.
export function sanitizeArtifacts(
  a: PlanningArtifacts | undefined | null,
  fallbackTitle?: string
): PlanningArtifacts {
  if (!a || typeof a !== "object") return {};
  const out: PlanningArtifacts = {};

  const ideas = asArray<Partial<DeepTechIdea>>(a.ideas).map(normalizeIdea);
  if (ideas.length) out.ideas = ideas;

  if (a.architecture) out.architecture = normalizeArch(a.architecture);

  const diffs = asArray<Partial<Differentiator>>(a.differentiators).map(normalizeDiff);
  if (diffs.length) out.differentiators = diffs;

  if (a.draft) out.draft = normalizeDraft(a.draft);
  if (a.plan) out.plan = normalizePlan(a.plan, fallbackTitle);
  if (typeof a.announcement === "string" && a.announcement.trim()) {
    out.announcement = a.announcement;
  }

  return out;
}

const DEFAULT_LAYERS = [
  { name: "UI Layer (사용자 인터페이스)", description: "웹/모바일 대시보드, 입력·결과 화면, 알림" },
  { name: "Service Layer (서비스 제공)", description: "API 서버, 콘텐츠·리포트 제공, 비동기 처리" },
  { name: "AI Engine Layer (핵심 AI)", description: "핵심 AI 분석·처리 모듈, 중앙 프로파일 DB 공유" },
  { name: "Data Layer (데이터 수집·저장)", description: "행동 로그·원시 데이터·모델 학습 데이터 저장" },
];

const DEFAULT_STACK = [
  { layer: "Data Layer", tech: "PostgreSQL, MongoDB(로그), Redis(캐시), S3(파일)" },
  { layer: "AI Engine Layer", tech: "PyTorch/TensorFlow, HuggingFace, FastAPI(서빙), MLflow" },
  { layer: "Service Layer", tech: "Node.js/Spring Boot, 메시지 큐, Kubernetes" },
  { layer: "UI Layer", tech: "React/Next.js, Flutter, WebSocket" },
];

// ---------------------------------------------------------------------------
// 데모 생성 (키 없이도 흐름 시연) — 입력 기반 템플릿
// ---------------------------------------------------------------------------

function domainWord(input: PlanningInput): string {
  const t = (input.businessIntro || "").replace(/\s+/g, " ").trim();
  return t ? t.split(" ").slice(0, 6).join(" ") : "본 사업";
}

function demoIdeas(input: PlanningInput): DeepTechIdea[] {
  const d = domainWord(input);
  const ps = input.problems.filter((p) => p.trim());
  // 데모(키 미설정) 폴백도 과업 유형이 서로 다르도록 구성한다.
  // 실제 생성은 Claude 가 aiModels.ts 카탈로그에서 도메인에 맞는 모델을 직접 고른다.
  const patterns = [
    { t: "멀티모달 인식·자동 분석 시스템", tech: "ViT/DINOv2 백본, SAM2 세그멘테이션, RT-DETR 검출", nov: "원시 입력에서 구조적 특징을 자동 추출해 사람 판단 없이 정량 지표로 변환", met: "mAP 0.80 이상, IoU 0.85 이상" },
    { t: "정밀 진단·이상탐지 시스템", tech: "PatchCore 이상탐지, Anomaly Transformer, LightGBM 보정", nov: "정상 분포에서의 미세 이탈을 조기 검출하고 원인 구간을 역추적", met: "Image AUROC 0.95 이상, 오탐률 5% 이하" },
    { t: "근인(Root Cause) 분류·처방 시스템", tech: "KoELECTRA 분류, BGE-M3 임베딩 RAG, Reranker", nov: "표층·심층 원인을 2단계로 분류하고 근거 문서를 인용해 처방까지 연결", met: "Macro-F1 0.85 이상, 근거 인용률 90% 이상" },
    { t: "수요·이탈 예측 및 개입 최적화 시스템", tech: "LightGBM/CatBoost, Temporal Fusion Transformer, Contextual Bandit(Thompson)", nov: "예측에 그치지 않고 개입 전략을 온라인 학습으로 자기 진화", met: "AUC 0.82 이상, 대조군 대비 개선 15% 이상" },
    { t: "생성형 맞춤 콘텐츠·자동 산출물 시스템", tech: "LLM(Claude) + LoRA 파인튜닝, RAG, ControlNet 구조제어", nov: "도메인 지식을 반영한 산출물을 규격에 맞춰 자동 생성", met: "인간평가 승률 70% 이상, 환각률 3% 이하" },
  ];
  return patterns.map((p, i) => ({
    id: i + 1,
    title: `${d} 특화 ${p.t} 개발`,
    summary: `${d}의 핵심 문제를 해결하기 위해 ${p.tech}를 적용한다. 기존 방식과 달리 ${p.nov}으로 차별화한다.`,
    aiTech: p.tech,
    novelty: p.nov,
    solvedProblems: ps.length ? [ps[Math.min(i, ps.length - 1)].slice(0, 40)] : ["핵심 페인포인트"],
    metrics: p.met,
  }));
}

function demoArchitecture(input: PlanningInput, selected: DeepTechIdea[]): Architecture {
  const modules: ArchModule[] = selected.slice(0, 6).map((idea, i) => ({
    id: `모듈${i + 1}`,
    name: idea.title.replace(/ 개발$/, "").split(" ").slice(-3).join(" ") + " 엔진",
    role: idea.summary,
    aiModels: idea.aiTech,
    input: "사용자/도메인 원시 데이터, 이전 모듈 산출물, 프로파일 정보",
    processing: "수집·정제 → 특징 추출 → 모델 추론 → 결과 태깅 및 리포트 생성",
    output: "정량 지표, 취약점/기회 분석, 다음 단계 처방 및 콘텐츠",
    learningMethod: "공개 사전학습 가중치 위에 보유 데이터로 LoRA 파인튜닝 후 실사용 데이터로 온라인 학습(전문가 검수 Human-in-the-Loop)",
    metrics: idea.metrics || "핵심 지표 목표치를 실증 단계에서 확정",
    rationale: `${idea.aiTech}를 후보군과 비교한 결과, 본 도메인 데이터 특성과 실시간 처리 요구를 함께 만족하는 조합으로 선정`,
  }));
  if (!modules.length) {
    modules.push(...demoIdeas(input).slice(0, 4).map((idea, i) => ({
      id: `모듈${i + 1}`,
      name: idea.title + " 엔진",
      role: idea.summary,
      aiModels: idea.aiTech,
      input: "원시 데이터, 프로파일",
      processing: "전처리 → 추론 → 태깅",
      output: "지표·분석·처방",
      learningMethod: "사전학습 가중치 위에 LoRA 파인튜닝 후 온라인 학습",
      metrics: idea.metrics || "핵심 지표 목표치를 실증 단계에서 확정",
      rationale: `${idea.aiTech} 조합을 후보군 대비 정확도·지연시간·운영비용 관점에서 선정`,
    })));
  }
  return {
    systemName: `${domainWord(input)} 통합 AI 플랫폼`,
    overview:
      "본 플랫폼은 데이터 수집(Data), AI 분석·처리(AI Engine), 서비스 제공(Service), 사용자 인터페이스(UI)의 4계층으로 구성된다. 각 모듈은 독립 작동하면서 중앙 프로파일 DB를 공유하여 통합 진단과 맞춤 처방을 실현한다.",
    layers: DEFAULT_LAYERS,
    modules,
    dataFlow:
      "[Data Layer] → 원시 데이터 수집 → [핵심 모듈들] ↔ [중앙 프로파일 DB] → 분석 결과가 통합 진단 모듈로 피드백 → [Service Layer] → [UI Layer]로 개인화 결과 전달. 각 모듈의 산출물이 다른 모듈의 입력으로 순환하는 폐쇄 루프 구조.",
    techStack: DEFAULT_STACK,
  };
}

function demoDifferentiators(arch: Architecture): Differentiator[] {
  // 아키텍처 모듈이 비어 있어도 절대 빈 배열을 돌려주지 않는다(화면이 멈춘 것처럼 보임 방지).
  const base: ArchModule[] = arch?.modules?.length
    ? arch.modules
    : ["데이터 분석", "정밀 진단", "맞춤 처방"].map((n, i) => ({
        id: `모듈${i + 1}`,
        name: `${n} 엔진`,
        role: `${arch?.systemName || "본 시스템"}의 ${n}을 담당하는 핵심 AI 모듈이다.`,
        aiModels: "딥러닝(CNN/LSTM), NLP, 강화학습",
        input: "원시 데이터, 프로파일",
        processing: "전처리 → 추론 → 태깅",
        output: "지표·분석·처방",
        learningMethod: "사전학습 후 온라인 파인튜닝",
      }));
  return base.slice(0, 4).map((m, i) => ({
    id: i + 1,
    title: `${m.name.replace(/ 엔진$/, "")} 특화 알고리즘`,
    description: `${m.role} 이를 위해 ${m.aiModels}를 결합하여, 일반 솔루션이 제공하지 못하는 정밀 분석·처방을 자동 수행하는 자사 고유 알고리즘이다.`,
    rationale:
      "기존 시장 솔루션은 단순 통계·규칙 기반에 그치나, 본 알고리즘은 도메인 특화 데이터로 원인을 정밀 추적하고 처방까지 자동 연결한다. 진단→원인분류→처방→효과검증→재진단의 폐쇄 루프 구조는 특허 청구항 구성이 명확하여 권리화 가능성이 높다.",
  }));
}

function demoDraft(input: PlanningInput, arch: Architecture, diffs: Differentiator[]): RnDDraft {
  return {
    projectTitle: `${arch.systemName} 개발 — ${diffs
      .slice(0, 2)
      .map((d) => d.title.replace(/ 특화 알고리즘$/, ""))
      .join("·")} 기반 AI 적응형 통합 시스템`,
    necessity: [
      {
        heading: "고비용·고의존 구조의 한계",
        body: "현재 시장은 소수 전문 인력에 의존하는 구조로 인건비 비중이 높고 수급이 어렵다. AI 기반 자동화로 인력 의존도를 낮추고 일관된 고품질 서비스를 저비용·대규모로 제공하는 기술 개발이 필요하다.",
      },
      {
        heading: "분절형 서비스와 지속 실패의 구조적 문제",
        body: "기존 서비스는 기능이 분리되어 통합 관리가 어렵고 사용자 이탈·지속 실패가 반복된다. 행동 데이터를 실시간 분석해 동기를 유지하고 전 영역을 통합 관리하는 AI 시스템 개발이 시급하다.",
      },
      {
        heading: "정밀 진단·분석 부재로 인한 비효율",
        body: "원인을 정확히 진단하지 못하면 동일 문제가 반복된다. 미세 단위 실패 검출, NLP 기반 근인 분석 등 정밀 진단 기술로 비효율을 근본 해소하는 R&D가 필요하다.",
      },
    ],
    processModules: arch.modules,
  };
}

function demoPlan(input: PlanningInput, artifacts: PlanningArtifacts): BusinessPlan {
  const arch = artifacts.architecture || demoArchitecture(input, artifacts.ideas || demoIdeas(input));
  const draft = artifacts.draft || demoDraft(input, arch, artifacts.differentiators || demoDifferentiators(arch));
  return {
    titleCandidates: [
      draft.projectTitle,
      `${arch.systemName} 개발`,
      `AI 기반 ${domainWord(input)} 자동화 솔루션 개발`,
    ],
    summaryTable: arch.modules,
    necessity: draft.necessity,
    systemFlow:
      "사용자가 웹/모바일에서 데이터를 입력하면, 각 AI 모듈이 순차적으로 수집·전처리 → 분석·평가 → 종합 판정 → 맞춤 피드백을 생성하고, 결과를 대시보드로 제공한다. " +
      arch.modules.map((m) => m.id).join(" → ") + " → 사용자 대시보드 출력.",
    processDetail: arch.modules,
    marketStrategy:
      "초기에는 자사 보유 고객·채널을 기반으로 서비스를 검증하고, 이후 B2C 구독 + B2B(기관) 라이선스로 확장한다. 데이터가 축적될수록 모델 정확도와 진입장벽이 강화되는 선순환 구조로 수익성과 방어력을 동시에 확보한다.",
    teamPlan:
      `대표자는 해당 도메인의 오랜 현장 경험과 데이터를 보유하고 있어 학습데이터 확보·검수(Human-in-the-Loop)에 강점이 있다. ${input.team || "AI 개발/운영 인력을 단계적으로 채용"}하여 개발-검증-운영 체계를 구축한다.`,
    engine: "demo",
  };
}
