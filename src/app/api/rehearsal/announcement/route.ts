import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getProject, saveProject } from "@/lib/planningStore";
import { extractHwp, extractHwpx } from "@/lib/hwp";

export const runtime = "nodejs";
export const maxDuration = 60;

// 정부지원사업 공고문 저장 + (PDF 업로드 시) 텍스트 추출.
//  - multipart/form-data: file(PDF/txt) 업로드 → 서버에서 텍스트 추출 후 저장
//  - application/json: { projectId, text } 붙여넣기 텍스트 저장
// 저장 위치: planning_projects.artifacts.announcement (DB 스키마 변경 불필요)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });

  const contentType = req.headers.get("content-type") || "";

  let projectId = "";
  let text = "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      projectId = String(form.get("projectId") || "");
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
      }
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: "파일이 너무 큽니다. (최대 15MB)" }, { status: 400 });
      }
      const name = file.name.toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());

      if (name.endsWith(".pdf")) {
        text = await extractPdf(buf);
      } else if (name.endsWith(".hwpx")) {
        text = await extractHwpx(buf);
      } else if (name.endsWith(".hwp")) {
        text = await extractHwp(buf);
      } else if (name.endsWith(".txt") || name.endsWith(".md") || file.type.startsWith("text/")) {
        text = buf.toString("utf8");
      } else {
        return NextResponse.json(
          { error: "PDF, 한글(.hwp/.hwpx), 텍스트(.txt) 파일을 지원합니다." },
          { status: 400 }
        );
      }
    } else {
      const body = (await req.json()) as { projectId?: string; text?: string };
      projectId = String(body.projectId || "");
      text = String(body.text || "");
    }
  } catch (e) {
    console.error("[rehearsal/announcement] 파싱 실패:", e);
    const msg = e instanceof Error ? e.message : "";
    return NextResponse.json(
      { error: `파일을 읽지 못했습니다${msg ? ` (${msg})` : ""}. 내용을 복사해 붙여넣어 주세요.` },
      { status: 400 }
    );
  }

  if (!projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });

  const project = await getProject(user.id, projectId);
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!cleaned) {
    return NextResponse.json(
      { error: "추출된 텍스트가 없습니다. (스캔 PDF일 수 있어요. 내용을 복사해 붙여넣어 주세요.)" },
      { status: 400 }
    );
  }

  // 저장 상한: 공고문 전체를 DB에 다 넣을 필요는 없다 (질문 생성엔 앞부분으로 충분).
  const stored = cleaned.length > 20000 ? cleaned.slice(0, 20000) : cleaned;

  await saveProject(user.id, projectId, {
    artifacts: { ...project.artifacts, announcement: stored },
  });

  return NextResponse.json({ ok: true, chars: stored.length, preview: stored.slice(0, 400) });
}

// 공고문 삭제
export async function DELETE(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId 필요" }, { status: 400 });

  const project = await getProject(user.id, projectId);
  if (!project) return NextResponse.json({ error: "프로젝트 없음" }, { status: 404 });

  const next = { ...project.artifacts };
  delete next.announcement;
  await saveProject(user.id, projectId, { artifacts: next });
  return NextResponse.json({ ok: true });
}

async function extractPdf(buf: Buffer): Promise<string> {
  // pdf-parse v2 는 PDFParse 클래스 API. (require 서브패스가 막혀 있어 default import 사용)
  const mod = (await import("pdf-parse")) as unknown as {
    PDFParse: new (opts: { data: Uint8Array }) => { getText: () => Promise<{ text: string }> };
  };
  const parser = new mod.PDFParse({ data: new Uint8Array(buf) });
  const r = await parser.getText();
  return r.text || "";
}
