import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  listProjects,
  createProject,
  saveProject,
  deleteProject,
  type ProjectPatch,
} from "@/lib/planningStore";

export const runtime = "nodejs";

// 목록 조회
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const projects = await listProjects(user.id);
  return NextResponse.json({ projects });
}

interface Body {
  action: "create" | "save" | "delete";
  projectId?: string;
  title?: string;
  patch?: ProjectPatch;
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const body = (await req.json()) as Body;
  switch (body.action) {
    case "create": {
      const project = await createProject(user.id, body.title);
      return NextResponse.json({ project });
    }
    case "save": {
      if (!body.projectId || !body.patch)
        return NextResponse.json({ error: "projectId/patch 필요" }, { status: 400 });
      const project = await saveProject(user.id, body.projectId, body.patch);
      if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });
      return NextResponse.json({ project });
    }
    case "delete": {
      if (!body.projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });
      await deleteProject(user.id, body.projectId);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
  }
}
