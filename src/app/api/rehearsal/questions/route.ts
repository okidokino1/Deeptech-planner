import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/planningStore";
import { generateAnticipatedQuestions } from "@/lib/rehearsal";

export const runtime = "nodejs";
export const maxDuration = 60;

// 발표 전 · 공고문 + 사업계획서로 심사위원 예상 질문을 미리 생성한다.
// 발표 채점과 달리 이용권을 차감하지 않는다(발표 준비를 돕는 무료 기능).
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as { projectId?: string };
  if (!body?.projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });

  const project = await getProject(user.id, body.projectId);
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const plan = project.artifacts.plan;
  // 계획서 상세를 맥락으로 넘긴다 (필요성·모듈·차별화·시장전략).
  const planSummary = plan
    ? [
        plan.titleCandidates?.[0],
        plan.necessity?.map((n) => `${n.heading}: ${n.body}`).join("\n"),
        plan.processDetail?.map((m) => `${m.name}(${m.aiModels})`).join(", "),
        plan.marketStrategy,
        plan.teamPlan,
      ]
        .filter(Boolean)
        .join("\n\n")
    : project.artifacts.architecture?.overview || "";

  const { questions, engine } = await generateAnticipatedQuestions({
    projectTitle: plan?.titleCandidates?.[0] || project.title,
    planSummary,
    announcement: project.artifacts.announcement,
  });

  return NextResponse.json({ questions, engine, hasAnnouncement: !!project.artifacts.announcement });
}
