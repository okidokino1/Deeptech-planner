import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { savePlan, deletePlan, type Plan } from "@/lib/plans";

export const runtime = "nodejs";

// 요금제 편집 — 플랫폼 관리자 전용
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const body = await req.json();
  const { action } = body as { action: string };

  try {
    if (action === "save") {
      const r = await savePlan(body.plan as Plan);
      if (!r.ok) return NextResponse.json({ error: "저장 실패 (Supabase 연결 확인)" }, { status: 500 });
      return NextResponse.json({ ok: true, id: r.id });
    }
    if (action === "delete") {
      const ok = await deletePlan(body.id);
      return NextResponse.json({ ok });
    }
    return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
  } catch (e) {
    console.error("[plans] action 실패:", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}
