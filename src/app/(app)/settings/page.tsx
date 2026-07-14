import { redirect } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { features } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const integrations = [
    { name: "Supabase (계정·DB)", on: features.supabase, env: "NEXT_PUBLIC_SUPABASE_URL / ANON_KEY" },
    { name: "OpenAI Whisper (발표 음성 전사)", on: features.whisper, env: "OPENAI_API_KEY" },
    { name: "Claude (AI 기획·채점)", on: features.claude, env: "ANTHROPIC_API_KEY" },
    { name: "PortOne (결제)", on: features.portone, env: "NEXT_PUBLIC_PORTONE_STORE_ID / CHANNEL_KEY" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">설정</h1>
        <p className="mt-1 text-slate-500">계정 정보와 서비스 연동 상태를 확인합니다.</p>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-slate-900">계정</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-sm text-slate-500">이름</dt>
            <dd className="text-slate-900">{user.name}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">이메일</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">요금제 / 권한</dt>
            <dd className="flex items-center gap-1.5">
              <span className={`chip ${user.plan === "pro" ? "bg-brand-50 text-brand-700" : "bg-slate-100 text-slate-600"}`}>
                {user.plan === "pro" ? "Pro" : "Free"}
              </span>
              {user.isAdmin && <span className="chip bg-brand-600 text-white">관리자</span>}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-slate-500">남은 이용권</dt>
            <dd className="text-slate-900">
              {user.isAdmin ? "무제한 (관리자)" : user.plan === "pro" ? "무제한" : `${user.credits}회`}
            </dd>
          </div>
        </dl>
      </div>

      <div className="card p-6">
        <h2 className="font-bold text-slate-900">서비스 연동 상태</h2>
        <p className="mt-1 text-sm text-slate-500">
          아래 항목의 환경변수를 설정하면 데모 모드에서 실제 서비스로 자동 전환됩니다.
        </p>
        <ul className="mt-4 space-y-3">
          {integrations.map((it) => (
            <li key={it.name} className="flex items-center justify-between rounded-xl border border-slate-200 p-4">
              <div>
                <p className="font-medium text-slate-800">{it.name}</p>
                <p className="mt-0.5 font-mono text-xs text-slate-400">{it.env}</p>
              </div>
              {it.on ? (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" /> 연결됨
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400">
                  <XCircle className="h-4 w-4" /> 데모 모드
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
