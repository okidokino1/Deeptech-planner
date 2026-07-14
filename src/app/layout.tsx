import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "딥테크 플래너 · AI 기술기획 · 사업계획서",
  description:
    "딥테크 정부지원사업을 위한 기술기획 → 사업계획서 완성(Word) → 발표(PT) 연습까지. AI가 아이디어·아키텍처·차별화·계획서를 한 흐름으로 만들어 드립니다.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
