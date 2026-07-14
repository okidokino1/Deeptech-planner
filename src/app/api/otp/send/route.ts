import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { features } from "@/lib/env";
import { generateCode, isValidKoreanMobile, normalizePhone, sendVerifyCode } from "@/lib/sms";

export const runtime = "nodejs";

const OTP_COOKIE = "sp_otp";

// 휴대폰 인증번호 발송
export async function POST(req: Request) {
  const { phone } = await req.json();
  if (!isValidKoreanMobile(phone)) {
    return NextResponse.json({ error: "올바른 휴대폰 번호를 입력해 주세요." }, { status: 400 });
  }
  const p = normalizePhone(phone);
  const code = generateCode();
  const exp = Date.now() + 3 * 60 * 1000; // 3분

  const store = await cookies();
  store.set(OTP_COOKIE, Buffer.from(JSON.stringify({ p, code, exp })).toString("base64"), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 200,
  });

  const mode = await sendVerifyCode(p, code); // kakao > sms > test

  // 실제 발송(kakao/sms) 시엔 코드를 반환하지 않음. 테스트 모드에서만 화면 표시용으로 반환.
  const configured = features.kakao || features.sms;
  return NextResponse.json({
    ok: true,
    mode,
    devCode: mode === "test" && !configured ? code : undefined,
  });
}
