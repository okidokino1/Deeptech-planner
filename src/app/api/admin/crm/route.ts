import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  updateMember,
  createOrganization,
  updateOrganization,
  setOrgAdmin,
} from "@/lib/crm";

export const runtime = "nodejs";

// 관리자/기관관리자 전용 CRM 변경 API (단일 라우트, action 디스패치)
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user?.isStaff) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  const viewer = { role: user.role, orgId: user.orgId, isAdmin: user.isAdmin };
  const body = await req.json();
  const { action } = body as { action: string };

  try {
    switch (action) {
      case "updateMember": {
        const ok = await updateMember(viewer, body.id, body.patch || {});
        return NextResponse.json({ ok });
      }
      case "createOrg": {
        const id = await createOrganization(viewer, {
          name: body.name,
          contactEmail: body.contactEmail,
          contactPhone: body.contactPhone,
          memo: body.memo,
        });
        return NextResponse.json({ ok: !!id, id });
      }
      case "updateOrg": {
        const ok = await updateOrganization(viewer, body.id, body.patch || {});
        return NextResponse.json({ ok });
      }
      case "setOrgAdmin": {
        const ok = await setOrgAdmin(viewer, body.userId, body.orgId ?? null);
        return NextResponse.json({ ok });
      }
      default:
        return NextResponse.json({ error: "알 수 없는 action" }, { status: 400 });
    }
  } catch (e) {
    console.error("[crm] action 실패:", e);
    return NextResponse.json({ error: "처리 중 오류가 발생했습니다. (Supabase 연결 확인)" }, { status: 500 });
  }
}
