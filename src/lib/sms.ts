import crypto from "crypto";
import { env, features } from "./env";

export function generateCode(): string {
  return String(crypto.randomInt(0, 1000000)).padStart(6, "0");
}

export function normalizePhone(p: string): string {
  return (p || "").replace(/[^0-9]/g, "");
}

export function isValidKoreanMobile(p: string): boolean {
  const d = normalizePhone(p);
  return /^01[0-9]{8,9}$/.test(d);
}

// Solapi 공통 인증 헤더
function solapiAuth(): Record<string, string> {
  const date = new Date().toISOString();
  const salt = crypto.randomBytes(24).toString("hex");
  const signature = crypto
    .createHmac("sha256", env.solapiApiSecret)
    .update(date + salt)
    .digest("hex");
  return {
    "Content-Type": "application/json",
    Authorization: `HMAC-SHA256 apiKey=${env.solapiApiKey}, date=${date}, salt=${salt}, signature=${signature}`,
  };
}

async function solapiSend(message: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch("https://api.solapi.com/messages/v4/send", {
      method: "POST",
      headers: solapiAuth(),
      body: JSON.stringify({ message }),
    });
    if (!res.ok) console.error("[solapi] 오류:", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("[solapi] 발송 실패:", e);
    return false;
  }
}

// 카카오 알림톡 (템플릿 변수 #{code}). 발신번호 있으면 실패 시 SMS 대체발송.
export async function sendKakao(to: string, code: string, fallbackText: string): Promise<boolean> {
  if (!features.kakao) return false;
  return solapiSend({
    to: normalizePhone(to),
    from: env.solapiSender ? normalizePhone(env.solapiSender) : undefined,
    text: fallbackText,
    kakaoOptions: {
      pfId: env.solapiPfId,
      templateId: env.solapiTemplateId,
      variables: { "#{code}": code },
      disableSms: !env.solapiSender,
    },
  });
}

// SMS 문자 발송
export async function sendSms(to: string, text: string): Promise<boolean> {
  if (!features.sms) return false;
  return solapiSend({ to: normalizePhone(to), from: normalizePhone(env.solapiSender), text });
}

// 인증번호 발송: 카카오 알림톡 우선 → SMS 대체 → 둘 다 없으면 테스트 모드(false).
export async function sendVerifyCode(
  to: string,
  code: string
): Promise<"kakao" | "sms" | "test"> {
  const text = `[딥테크 플래너] 인증번호 [${code}]를 입력해 주세요.`;
  if (features.kakao && (await sendKakao(to, code, text))) return "kakao";
  if (features.sms && (await sendSms(to, text))) return "sms";
  return "test";
}
