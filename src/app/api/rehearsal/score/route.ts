import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { hasCredit, consumeCredit } from "@/lib/credits";
import { getProject, addRehearsal } from "@/lib/planningStore";
import { scoreRehearsal } from "@/lib/rehearsal";
import type { WordTs } from "@/lib/metrics";

export const runtime = "nodejs";
export const maxDuration = 120;

interface Body {
  projectId: string;
  transcript: string;
  durationSec: number;
  words?: WordTs[];
  targetSec?: number;
  question?: string;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as Body;
  if (!body?.projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });

  const project = await getProject(user.id, body.projectId);
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  if (!hasCredit(user)) {
    return NextResponse.json(
      { error: "이용권이 모두 소진되었습니다.", needsPayment: true },
      { status: 402 }
    );
  }

  const plan = project.artifacts.plan;
  const planSummary = plan
    ? `${plan.titleCandidates?.[0] || ""} · ${plan.necessity?.map((n) => n.heading).join(", ")}`
    : project.artifacts.architecture?.overview;

  const result = await scoreRehearsal({
    transcript: body.transcript || "",
    durationSec: body.durationSec || 0,
    words: body.words,
    targetSec: body.targetSec,
    question: body.question,
    projectTitle: plan?.titleCandidates?.[0] || project.title,
    planSummary,
  });

  const record = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    overall: result.overall,
    engine: result.engine,
    result,
  };
  await addRehearsal(user.id, body.projectId, record);
  await consumeCredit(user);

  return NextResponse.json({ result, recordId: record.id });
}
