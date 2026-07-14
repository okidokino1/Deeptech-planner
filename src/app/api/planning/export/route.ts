import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/planningStore";
import { buildPlanDocx } from "@/lib/planningDocx";

export const runtime = "nodejs";

// GET /api/planning/export?projectId=... → 사업계획서 .docx 다운로드
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("인증이 필요합니다.", { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return new Response("projectId 필요", { status: 400 });

  const project = await getProject(user.id, projectId);
  if (!project) return new Response("프로젝트 없음", { status: 404 });

  const buffer = await buildPlanDocx(project);
  const rawName = (project.artifacts.plan?.titleCandidates?.[0] || project.title || "사업계획서")
    .replace(/[\\/:*?"<>|]/g, " ")
    .slice(0, 80);
  const fileName = `${rawName}.docx`;
  const encoded = encodeURIComponent(fileName);

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="plan.docx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
