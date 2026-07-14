// 어떤 외부 서비스가 설정되어 있는지 감지한다.
// 키가 없으면 앱은 "데모 모드"로 완전히 동작하고, 키가 채워지면 실제 서비스로 전환된다.

// 앞뒤 공백 제거 + 출력가능 ASCII만 허용.
// (Vercel Sensitive 마스킹 '•' 같은 비-ASCII 문자가 값에 섞이면 무효 처리하여 폴백 사용)
const clean = (v?: string) => {
  const s = (v || "").trim();
  return /[^\x20-\x7E]/.test(s) ? "" : s;
};

// 딥테크 플래너는 자체 Supabase 프로젝트를 사용한다.
// 환경변수가 없으면 값은 비어 있고, 앱은 데모 모드로 완전히 동작한다.
export const env = {
  supabaseUrl: clean(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceKey: clean(process.env.SUPABASE_SERVICE_ROLE_KEY),
  openaiKey: clean(process.env.OPENAI_API_KEY),
  anthropicKey: clean(process.env.ANTHROPIC_API_KEY),
  portoneStoreId: clean(process.env.NEXT_PUBLIC_PORTONE_STORE_ID),
  portoneChannelKey: clean(process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY),
  portoneApiSecret: clean(process.env.PORTONE_API_SECRET),
  // 인증 발송 (Solapi/쿨SMS) — 카카오 알림톡 우선, SMS 대체. 없으면 테스트 모드(코드 화면 표시)
  solapiApiKey: clean(process.env.SOLAPI_API_KEY),
  solapiApiSecret: clean(process.env.SOLAPI_API_SECRET),
  solapiSender: clean(process.env.SOLAPI_SENDER), // 발신번호(SMS 대체발송용)
  solapiPfId: clean(process.env.SOLAPI_PFID), // 카카오 채널(플러스친구) ID
  solapiTemplateId: clean(process.env.SOLAPI_TEMPLATE_ID), // 알림톡 템플릿 ID
  claudeModel: process.env.CLAUDE_MODEL || "claude-sonnet-5",
  // 관리자 이메일 (기본값 + ADMIN_EMAILS 환경변수로 추가 지정 가능, 콤마 구분)
  adminEmails: [
    "okidokino1@gmail.com",
    ...(process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  ],
};

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return env.adminEmails.includes(email.trim().toLowerCase());
}

export const features = {
  get supabase() {
    return Boolean(env.supabaseUrl && env.supabaseAnonKey);
  },
  get whisper() {
    return Boolean(env.openaiKey);
  },
  get claude() {
    return Boolean(env.anthropicKey);
  },
  get portone() {
    return Boolean(env.portoneStoreId && env.portoneChannelKey);
  },
  get sms() {
    return Boolean(env.solapiApiKey && env.solapiApiSecret && env.solapiSender);
  },
  get kakao() {
    return Boolean(env.solapiApiKey && env.solapiApiSecret && env.solapiPfId && env.solapiTemplateId);
  },
};

// 클라이언트 컴포넌트에서도 안전하게 노출 가능한 플래그
export const publicFeatures = {
  supabase: Boolean(env.supabaseUrl && env.supabaseAnonKey),
  portone: Boolean(env.portoneStoreId && env.portoneChannelKey),
};
