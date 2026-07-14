// 공용 타입 (딥테크 플래너)

export interface SpeechMetrics {
  wordCount: number;
  wpm: number; // 분당 단어 수
  fillerCount: number; // um, uh, like ...
  fillerRatio: number;
  pauseCount: number;
  longestPauseSec: number;
  speakingRatio: number; // 발화 시간 / 전체 시간
}

export type Role = "member" | "org_admin" | "admin";

export interface Profile {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
  credits: number;
  targetScore?: string;
  isAdmin?: boolean; // 플랫폼 관리자 (전체 접근)
  isStaff?: boolean; // 관리자 또는 기관 관리자
  role?: Role;
  orgId?: string | null;
}
