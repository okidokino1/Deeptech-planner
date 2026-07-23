import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, Presentation, Sparkles, FileText } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getProject } from "@/lib/planningStore";
import type { ArchModule } from "@/lib/planning";

export const dynamic = "force-dynamic";

function ModuleDetail({ m }: { m: ArchModule }) {
  const rows: [string, string][] = [
    ["정의", m.role],
    ["적용 AI 모델", m.aiModels],
    ["Input", m.input],
    ["Processing", m.processing],
    ["학습·개발 방식", m.learningMethod],
    ["Output", m.output],
  ];
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="font-semibold text-slate-900">
        {m.id}. {m.name}
      </p>
      <dl className="mt-2 space-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
            <dt className="font-medium text-slate-500">{k}</dt>
            <dd className="text-slate-700">{v || "-"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const project = await getProject(user.id, id);
  if (!project) notFound();

  const plan = project.artifacts.plan;
  const diffs = project.artifacts.differentiators || [];

  if (!plan) {
    return (
      <div className="card flex flex-col items-center p-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
          <FileText className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-lg font-bold text-slate-900">아직 사업계획서가 없습니다</h1>
        <p className="mt-1 text-sm text-slate-500">기술기획 마법사를 끝까지 완료하면 계획서가 생성됩니다.</p>
        <Link href={`/studio/${id}`} className="btn-primary mt-6">
          <Sparkles className="h-4 w-4" /> 기획 이어서 작성
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href={`/studio/${id}`} className="btn-ghost px-2 py-1.5 text-sm">
          <ArrowLeft className="h-4 w-4" /> 기획으로
        </Link>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/planning/export?projectId=${id}&format=docx`} className="btn-primary px-4 py-2 text-sm">
            <Download className="h-4 w-4" /> Word(.docx)
          </a>
          <a href={`/api/planning/export?projectId=${id}&format=hwpx`} className="btn-outline px-4 py-2 text-sm">
            <Download className="h-4 w-4" /> 한글(.hwpx)
          </a>
          <Link href={`/studio/${id}/rehearsal`} className="btn-outline px-4 py-2 text-sm">
            <Presentation className="h-4 w-4" /> 발표연습
          </Link>
        </div>
      </div>

      {/* 표지 */}
      <div className="card p-8 text-center">
        <span className="chip mx-auto bg-brand-100 text-brand-700">딥테크 정부지원사업 연구개발계획서</span>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">
          {plan.titleCandidates?.[0] || project.title}
        </h1>
        {plan.engine === "demo" && (
          <p className="mt-2 text-xs text-amber-600">
            데모 생성 결과입니다. ANTHROPIC_API_KEY 연결 시 Claude 정밀 작성이 제공됩니다.
          </p>
        )}
      </div>

      {/* 0. 모듈별 요약표 */}
      {plan.summaryTable?.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-bold text-slate-900">0. 모듈별 요약표</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs text-slate-500">
                  <th className="p-2">모듈</th>
                  <th className="p-2">Input</th>
                  <th className="p-2">Processing</th>
                  <th className="p-2">AI 모델</th>
                  <th className="p-2">학습방법</th>
                  <th className="p-2">Output</th>
                </tr>
              </thead>
              <tbody>
                {plan.summaryTable.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 align-top">
                    <td className="p-2 font-semibold text-slate-800">
                      {m.id}. {m.name}
                    </td>
                    <td className="p-2 text-slate-600">{m.input}</td>
                    <td className="p-2 text-slate-600">{m.processing}</td>
                    <td className="p-2 text-slate-600">{m.aiModels}</td>
                    <td className="p-2 text-slate-600">{m.learningMethod}</td>
                    <td className="p-2 text-slate-600">{m.output}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 1. 과제명 후보 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">1. 연구개발 과제명(후보)</h2>
        <ol className="mt-3 space-y-2">
          {(plan.titleCandidates || []).map((t, i) => (
            <li key={i} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <span className="font-semibold text-slate-500">후보 {i + 1}. </span>
              {t}
            </li>
          ))}
        </ol>
      </section>

      {/* 2. 필요성 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">2. 연구개발의 필요성</h2>
        <div className="mt-3 space-y-3">
          {(plan.necessity || []).map((n, i) => (
            <div key={i}>
              <p className="font-semibold text-slate-800">
                2-{i + 1}. {n.heading}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{n.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 3. 운영 흐름 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">3. 운영 시스템 흐름</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.systemFlow}</p>
      </section>

      {/* 4. 연구개발 프로세스 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">4. 연구개발 프로세스</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(plan.processDetail || []).map((m) => (
            <ModuleDetail key={m.id} m={m} />
          ))}
        </div>
      </section>

      {/* 5. 차별화 */}
      {diffs.length > 0 && (
        <section className="card p-6">
          <h2 className="text-lg font-bold text-slate-900">5. 기술 차별성 및 핵심 IP</h2>
          <div className="mt-3 space-y-3">
            {diffs.map((d) => (
              <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold text-slate-900">
                  {d.id}. {d.title}
                </p>
                <p className="mt-1 text-sm text-slate-600">{d.description}</p>
                <p className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
                  <span className="font-semibold">근거: </span>
                  {d.rationale}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 6·7. 사업화 / 팀 */}
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">6. 사업화 및 시장 진입 전략</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.marketStrategy}</p>
      </section>
      <section className="card p-6">
        <h2 className="text-lg font-bold text-slate-900">7. 추진 체계 및 팀 구성</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{plan.teamPlan}</p>
      </section>

      <div className="flex flex-col items-center gap-2 pb-4">
        <div className="flex flex-wrap justify-center gap-2">
          <a href={`/api/planning/export?projectId=${id}&format=docx`} className="btn-primary px-6 py-3">
            <Download className="h-4 w-4" /> Word(.docx)로 내려받기
          </a>
          <a href={`/api/planning/export?projectId=${id}&format=hwpx`} className="btn-outline px-6 py-3">
            <Download className="h-4 w-4" /> 한글(.hwpx)로 내려받기
          </a>
        </div>
        <p className="text-center text-xs text-slate-400">
          한글 파일은 <b>.hwpx(한글 개방 포맷)</b>으로 내려받습니다 — 한글 2014 이상에서 바로 열립니다.
          열어서 <b>다른 이름으로 저장 → .hwp</b>로 바꿔 제출하세요.
        </p>
      </div>
    </div>
  );
}
