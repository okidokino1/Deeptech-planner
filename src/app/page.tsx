import Link from "next/link";
import {
  Rocket,
  Lightbulb,
  Network,
  Sparkles,
  Users,
  FileCheck2,
  Presentation,
  ArrowRight,
  CheckCircle2,
  FileText,
  Bot,
} from "lucide-react";

const STEPS = [
  { icon: Lightbulb, t: "문제 정의", d: "사업 소개와 페인포인트 입력 → AI가 딥테크 아이디어 5개 도출" },
  { icon: Network, t: "시스템 아키텍처", d: "4계층 구조와 핵심 AI 모듈(모델·Input·Output)을 자동 설계" },
  { icon: Sparkles, t: "차별화·핵심 IP", d: "자사 고유 알고리즘과 특허 출원 포인트를 도출" },
  { icon: Users, t: "기획 초안", d: "대표·팀 이력을 반영한 연구개발 기획 초안 조립" },
  { icon: FileCheck2, t: "사업계획서 완성", d: "정부 R&D 양식으로 완성 · Word(.docx) 내보내기" },
  { icon: Presentation, t: "발표(PT) 연습", d: "발표 녹음 → 전달력·내용 채점 + 심사위원 예상 Q&A" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
              <Rocket className="h-5 w-5" />
            </span>
            <span className="font-bold text-slate-900">딥테크 플래너</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/pricing" className="btn-ghost hidden sm:inline-flex">
              요금제
            </Link>
            <Link href="/login" className="btn-ghost">
              로그인
            </Link>
            <Link href="/signup" className="btn-primary">
              무료로 시작하기
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-brand-50 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6">
          <span className="chip bg-brand-100 text-brand-700">
            <Bot className="h-3.5 w-3.5" /> 딥테크 정부지원사업 · 기술기획부터 발표까지
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
            딥테크 지원사업 서류,
            <br />
            <span className="text-brand-600">AI가 기획하고 계획서까지 완성합니다</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            5억원+ 규모의 딥테크 R&D 지원사업을 겨냥해, 사업 소개와 문제만 입력하면
            AI가 기술 아이디어·시스템 아키텍처·차별화 전략·사업계획서까지 만들어 드립니다.
            서류 합격 후 발표(PT) 연습과 예상 질문까지 한 곳에서.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">
              무료로 기획 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/pricing" className="btn-outline px-6 py-3 text-base">
              요금제 보기
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> 가입 시 1건 무료
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-emerald-500" /> Word(.docx) 내보내기
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Presentation className="h-4 w-4 text-emerald-500" /> 발표 연습·예상 Q&A
            </span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold text-slate-900">기획부터 발표까지, 한 흐름으로</h2>
        <p className="mt-2 text-center text-slate-500">
          검증된 딥테크 기술기획 방법론을 단계별 마법사로 구현했습니다.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.t} className="card p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <s.icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-slate-400">STEP {i + 1}</span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900">{s.t}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 px-8 py-14 text-center text-white">
          <h2 className="text-3xl font-bold">오늘 첫 기술기획을 시작하세요</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            회원가입 시 1건을 무료로 만들어볼 수 있습니다. 신용카드가 필요 없습니다.
          </p>
          <Link
            href="/signup"
            className="btn mt-7 bg-white px-7 py-3 text-base font-bold text-brand-700 hover:bg-brand-50"
          >
            무료로 시작하기 <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-slate-400 sm:px-6">
          © 2026 딥테크 플래너 · AI 기술기획 · 사업계획서 · 발표연습 플랫폼
        </div>
      </footer>
    </div>
  );
}
