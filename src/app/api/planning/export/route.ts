import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/planningStore";
import { buildPlanDocx } from "@/lib/planningDocx";
import { buildPlanRtf } from "@/lib/planningRtf";
import { buildPlanHwpx } from "@/lib/planningHwpx";

export const runtime = "nodejs";

// GET /api/planning/export?projectId=...&format=docx|hwpx|rtf
//   docx → Word(.docx)
//   hwpx → 한글 네이티브 포맷(.hwpx) — 한글 2014+에서 열림
//   rtf  → 한글/워드가 여는 RTF(.rtf) 폴백
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return new Response("인증이 필요합니다.", { status: 401 });

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const format = (searchParams.get("format") || "docx").toLowerCase();
  if (!projectId) return new Response("projectId 필요", { status: 400 });

  const project = await getProject(user.id, projectId);
  if (!project) return new Response("프로젝트 없음", { status: 404 });

  const rawName = (project.artifacts.plan?.titleCandidates?.[0] || project.title || "사업계획서")
    .replace(/[\\/:*?"<>|]/g, " ")
    .slice(0, 80);

  if (format === "hwpx") {
    const buf = await buildPlanHwpx(project);
    const encoded = encodeURIComponent(`${rawName}.hwpx`);
    return new Response(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type": "application/hwp+zip",
        "Content-Disposition": `attachment; filename="plan.hwpx"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (format === "hwp" || format === "rtf") {
    const rtf = buildPlanRtf(project);
    const encoded = encodeURIComponent(`${rawName}.rtf`);
    return new Response(rtf, {
      status: 200,
      headers: {
        // RTF: 한글(Hangul)·MS Word 모두 열림. 한글에서 .hwp로 다시 저장 가능.
        "Content-Type": "application/rtf; charset=utf-8",
        "Content-Disposition": `attachment; filename="plan.rtf"; filename*=UTF-8''${encoded}`,
        "Cache-Control": "no-store",
      },
    });
  }

  const buffer = await buildPlanDocx(project);
  const encoded = encodeURIComponent(`${rawName}.docx`);
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="plan.docx"; filename*=UTF-8''${encoded}`,
      "Cache-Control": "no-store",
    },
  });
}
