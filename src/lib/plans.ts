export interface Plan {
  id: string;
  name: string;
  price: number; // KRW
  period: string;
  kind: "free" | "credit" | "subscription";
  credits: number; // 지급 이용권 (subscription은 무제한 표시)
  features: string[];
  highlight?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "free",
    name: "무료 체험",
    price: 0,
    period: "가입 시",
    kind: "free",
    credits: 1,
    features: ["사업계획서 1건 무료 완성", "기술기획 마법사 전체", "발표연습 1회", "Word(.docx) 내보내기"],
  },
  {
    id: "credit10",
    name: "이용권 10회",
    price: 49000,
    period: "1회 결제",
    kind: "credit",
    credits: 10,
    features: ["계획서 완성·발표 채점 10회", "AI 정밀 기획·작성", "차별화·핵심 IP 도출", "유효기간 없음"],
    highlight: true,
  },
  {
    id: "pro",
    name: "Pro 무제한",
    price: 99000,
    period: "월 구독",
    kind: "subscription",
    credits: 9999,
    features: ["계획서 완성·발표 채점 무제한", "프로젝트 무제한 관리", "예상 Q&A 코칭", "우선 지원"],
  },
];

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}
