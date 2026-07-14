import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { normalizePhone } from "@/lib/sms";

export const runtime = "nodejs";

const OTP_COOKIE = "sp_otp";
const OK_COOKIE = "sp_otp_ok";

// 인증번호 확인
export async function POST(req: Request) {
  const { phone, code } = await req.json();
  const store = await cookies();
  const raw = store.get(OTP_COOKIE)?.value;
  if (!raw) {
    return NextResponse.json({ error: "인증번호를 먼저 요청해 주세요." }, { status: 400 });
  }
  try {
    const { p, code: real, exp } = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    if (Date.now() > exp) {
      return NextResponse.json({ error: "인증번호가 만료되었습니다. 다시 요청해 주세요." }, { status: 400 });
    }
    if (normalizePhone(phone) !== p) {
      return NextResponse.json({ error: "휴대폰 번호가 일치하지 않습니다." }, { status: 400 });
    }
    if (String(code).trim() !== real) {
      return NextResponse.json({ error: "인증번호가 올바르지 않습니다." }, { status: 400 });
    }
    // 인증 완료 → 증표 쿠키 (10분)
    store.set(OK_COOKIE, Buffer.from(JSON.stringify({ p, exp: Date.now() + 10 * 60 * 1000 })).toString("base64"), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    store.delete(OTP_COOKIE);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "인증 처리 중 오류가 발생했습니다." }, { status: 400 });
  }
}
