"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Rocket,
  Plus,
  Trash2,
  FileText,
  Presentation,
  Loader2,
  ArrowRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import type { PlanningProject } from "@/lib/planningStore";

const STEP_LABELS = ["문제 정의", "아키텍처", "차별화", "기획 초안", "계획서 완성"];

export function StudioList({ initial }: { initial: PlanningProject[] }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function createProject() {
    setCreating(true);
    try {
      const res = await fetch("/api/planning/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const data = await res.json();
      if (data.project) router.push(`/studio/${data.project.id}`);
    } finally {
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 프로젝트를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setDeleting(id);
    try {
      await fetch("/api/planning/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", projectId: id }),
      });
      setProjects((p) => p.filter((x) => x.id !== id));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="chip bg-brand-100 text-brand-700">
            <Rocket className="h-3.5 w-3.5" /> 딥테크 기술기획 스튜디오
          </span>
          <h1 className="mt-3 text-2xl font-bold text-slate-900">기술기획 프로젝트</h1>
          <p className="mt-1 text-slate-500">
            정부 딥테크 지원사업(5억원+)을 위한 기술기획 → 사업계획서 완성 → 발표연습을 한 흐름으로 진행합니다.
          </p>
        </div>
        <button onClick={createProject} disabled={creating} className="btn-primary">
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          새 기획 시작
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="card flex flex-col items-center p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-600 text-white">
            <Rocket className="h-7 w-7" />
          </span>
          <h2 className="mt-4 text-lg font-bold text-slate-900">첫 기술기획을 시작하세요</h2>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            사업 소개와 해결하고 싶은 문제만 입력하면, AI가 5개 딥테크 아이디어부터 시스템 아키텍처,
            차별화 전략, 완성된 사업계획서까지 만들어 드립니다.
          </p>
          <button onClick={createProject} disabled={creating} className="btn-primary mt-6">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            새 기획 시작
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const done = p.artifacts?.plan;
            return (
              <div key={p.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/studio/${p.id}`} className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-slate-900 hover:text-brand-700">
                      {p.title}
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {new Date(p.updatedAt).toLocaleDateString("ko-KR")} 수정
                    </p>
                  </Link>
                  <button
                    onClick={() => remove(p.id)}
                    disabled={deleting === p.id}
                    className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title="삭제"
                  >
                    {deleting === p.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {/* 단계 진행 표시 */}
                <div className="mt-4 flex items-center gap-1.5">
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
                          <span className={`h-px w-4 ${active ? "bg-brand-300" : "bg-slate-200"}`} />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link href={`/studio/${p.id}`} className="btn-outline px-3 py-2 text-xs">
                    <ArrowRight className="h-3.5 w-3.5" /> 이어서 작성
                  </Link>
                  {done && (
                    <>
                      <Link href={`/studio/${p.id}/plan`} className="btn-outline px-3 py-2 text-xs">
                        <FileText className="h-3.5 w-3.5" /> 사업계획서
                      </Link>
                      <Link href={`/studio/${p.id}/rehearsal`} className="btn-outline px-3 py-2 text-xs">
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
  );
}
