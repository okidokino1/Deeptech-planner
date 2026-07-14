import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Rocket,
  FileText,
  Presentation,
  Plus,
  CheckCircle2,
  Circle,
  FolderKanban,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { listProjects } from "@/lib/planningStore";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STEP_LABELS = ["문제 정의", "아키텍처", "차별화", "기획 초안", "계획서 완성"];

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const projects = await listProjects(user.id);
  const completed = projects.filter((p) => p.artifacts?.plan).length;
  const rehearsals = projects.reduce((s, p) => s + (p.rehearsals?.length || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">안녕하세요, {user.name}님! 👋</h1>
          <p className="mt-1 text-slate-500">
            딥테크 지원사업 기술기획을 시작하고, 사업계획서와 발표까지 준비해 보세요.
          </p>
        </div>
        <Link href="/studio" className="btn-primary">
          <Plus className="h-4 w-4" /> 새 기획 시작
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat icon={FolderKanban} label="전체 프로젝트" value={`${projects.length}개`} tone="brand" />
        <Stat icon={FileText} label="완성된 계획서" value={`${completed}개`} tone="emerald" />
        <Stat icon={Presentation} label="발표 연습" value={`${rehearsals}회`} tone="amber" />
        <Stat
          icon={CheckCircle2}
          label="이용권"
          value={user.plan === "pro" ? "무제한" : `${user.credits ?? 0}회`}
          tone="violet"
        />
      </div>

      {/* Projects */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900">내 기술기획 프로젝트</h2>
          <Link href="/studio" className="text-sm font-semibold text-brand-600">
            전체 보기 →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="mt-6 flex flex-col items-center rounded-2xl bg-slate-50 py-12 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
              <Rocket className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-slate-700">아직 프로젝트가 없습니다</p>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              사업 소개와 해결하고 싶은 문제만 입력하면, AI가 딥테크 아이디어부터 사업계획서까지 만들어 드립니다.
            </p>
            <Link href="/studio" className="btn-primary mt-5">
              첫 기획 시작하기 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {projects.slice(0, 4).map((p) => {
              const done = !!p.artifacts?.plan;
              return (
                <div key={p.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <Link href={`/studio/${p.id}`} className="min-w-0 flex-1">
                      <h3 className="truncate font-bold text-slate-900 hover:text-brand-700">{p.title}</h3>
                      <p className="mt-0.5 text-xs text-slate-400">{formatDate(p.updatedAt)} 수정</p>
                    </Link>
                  </div>
                  <div className="mt-3 flex items-center gap-1.5">
                    {STEP_LABELS.map((label, i) => {
                      const active = (p.step || 1) > i || (done && i === 4);
                      return (
                        <div key={i} className="flex items-center gap-1.5" title={label}>
                          {active ? (
                            <CheckCircle2 className="h-4 w-4 text-brand-600" />
                          ) : (
                            <Circle className="h-4 w-4 text-slate-300" />
                          )}
                          {i < STEP_LABELS.length - 1 && (
                            <span className={`h-px w-3 ${active ? "bg-brand-300" : "bg-slate-200"}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Link href={`/studio/${p.id}`} className="btn-outline px-3 py-1.5 text-xs">
                      이어서 작성
                    </Link>
                    {done && (
                      <>
                        <Link href={`/studio/${p.id}/plan`} className="btn-outline px-3 py-1.5 text-xs">
                          <FileText className="h-3.5 w-3.5" /> 계획서
                        </Link>
                        <Link href={`/studio/${p.id}/rehearsal`} className="btn-outline px-3 py-1.5 text-xs">
                          <Presentation className="h-3.5 w-3.5" /> 발표연습
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: "brand" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="card p-4 text-center">
      <span className={`mx-auto grid h-9 w-9 place-items-center rounded-xl ${tones[tone]}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}
