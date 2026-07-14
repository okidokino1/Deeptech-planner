import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { hasCredit, consumeCredit } from "@/lib/credits";
import { getProject, saveProject } from "@/lib/planningStore";
import {
  generateIdeas,
  generateArchitecture,
  generateDifferentiators,
  generateDraft,
  generatePlan,
  type GenerateAction,
  type PlanningInput,
  type PlanningArtifacts,
} from "@/lib/planning";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  projectId: string;
  action: GenerateAction;
  input: PlanningInput;
  step?: number;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body?.projectId || !body?.action || !body?.input) {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const project = await getProject(user.id, body.projectId);
  if (!project) return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });

  // 사업계획서 완성(plan)은 이용권 1회 차감 (핵심 산출물). 나머지 단계는 무료.
  if (body.action === "plan" && !hasCredit(user)) {
    return NextResponse.json(
      { error: "이용권이 모두 소진되었습니다.", needsPayment: true },
      { status: 402 }
    );
  }

  const input = body.input;
  const artifacts: PlanningArtifacts = { ...project.artifacts };

  try {
    switch (body.action) {
      case "ideas":
        artifacts.ideas = await generateIdeas(input);
        break;
      case "architecture": {
        const ideas = artifacts.ideas || (await generateIdeas(input));
        artifacts.ideas = ideas;
        artifacts.architecture = await generateArchitecture(input, ideas);
        break;
      }
      case "differentiators": {
        if (!artifacts.architecture)
          return NextResponse.json({ error: "먼저 아키텍처를 생성하세요." }, { status: 400 });
        artifacts.differentiators = await generateDifferentiators(input, artifacts.architecture);
        break;
      }
      case "draft": {
        if (!artifacts.architecture)
          return NextResponse.json({ error: "먼저 아키텍처를 생성하세요." }, { status: 400 });
        const diffs = artifacts.differentiators || (await generateDifferentiators(input, artifacts.architecture));
        artifacts.differentiators = diffs;
        artifacts.draft = await generateDraft(input, artifacts.architecture, diffs);
        break;
      }
      case "plan": {
        artifacts.plan = await generatePlan(input, artifacts);
        break;
      }
      default:
        return NextResponse.json({ error: "알 수 없는 action." }, { status: 400 });
    }
  } catch (e) {
    console.error("[planning/generate] 실패:", e);
    return NextResponse.json({ error: "생성 중 오류가 발생했습니다." }, { status: 500 });
  }

  const updated = await saveProject(user.id, body.projectId, {
    input,
    artifacts,
    step: body.step ?? project.step,
  });

  if (body.action === "plan") await consumeCredit(user);

  return NextResponse.json({ artifacts, project: updated });
}
