// 기술기획 프로젝트 저장소 (Supabase + 데모 인메모리)
// store.ts 와 동일한 이중 모드: Supabase 설정 시 DB, 아니면 dev 수명 동안 메모리 유지.

import { randomUUID } from "crypto";
import { features } from "./env";
import { getSupabaseServer } from "./supabase/server";
import type { PlanningInput, PlanningArtifacts, BusinessPlan } from "./planning";
import { EMPTY_INPUT, sanitizeArtifacts } from "./planning";

export interface RehearsalRecord {
  id: string;
  createdAt: string;
  overall: number;
  engine: "claude" | "demo";
  result: unknown; // RehearsalResult (rehearsal.ts)
}

export interface PlanningProject {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  step: number; // 진행 단계 1~5 (5 = 계획서 완성)
  input: PlanningInput;
  artifacts: PlanningArtifacts;
  rehearsals: RehearsalRecord[];
}

// --- 데모 인메모리 저장소 -----------------------------------------------------
const g = globalThis as unknown as { __planningStore?: Map<string, PlanningProject[]> };
if (!g.__planningStore) g.__planningStore = new Map();
const demoStore = g.__planningStore;

function newProject(userId: string, title?: string): PlanningProject {
  const now = new Date().toISOString();
  return {
    id: randomUUID(),
    userId,
    title: title || "새 기술기획 프로젝트",
    createdAt: now,
    updatedAt: now,
    step: 1,
    input: { ...EMPTY_INPUT, problems: [""] },
    artifacts: {},
    rehearsals: [],
  };
}

// 저장된 산출물이 깨져 있어도 화면이 죽지 않도록, 읽어서 내보내기 직전에 정화한다.
function safe(p: PlanningProject): PlanningProject {
  return { ...p, artifacts: sanitizeArtifacts(p.artifacts, p.title) };
}

// --- 공개 API ----------------------------------------------------------------

export async function listProjects(userId: string): Promise<PlanningProject[]> {
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("planning_projects")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false });
    return (data || []).map((r) => safe(mapRow(r)));
  }
  return [...(demoStore.get(userId) || [])]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .map(safe);
}

export async function getProject(userId: string, id: string): Promise<PlanningProject | null> {
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("planning_projects")
      .select("*")
      .eq("user_id", userId)
      .eq("id", id)
      .single();
    return data ? safe(mapRow(data)) : null;
  }
  const found = (demoStore.get(userId) || []).find((p) => p.id === id);
  return found ? safe(found) : null;
}

export async function createProject(userId: string, title?: string): Promise<PlanningProject> {
  const project = newProject(userId, title);
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    const { data } = await supabase
      .from("planning_projects")
      .insert({
        user_id: userId,
        title: project.title,
        step: 1,
        input: project.input,
        artifacts: project.artifacts,
        rehearsals: project.rehearsals,
      })
      .select("*")
      .single();
    if (data) return mapRow(data);
    return project;
  }
  if (!demoStore.has(userId)) demoStore.set(userId, []);
  demoStore.get(userId)!.push(project);
  return project;
}

export interface ProjectPatch {
  title?: string;
  step?: number;
  input?: PlanningInput;
  artifacts?: PlanningArtifacts;
}

export async function saveProject(
  userId: string,
  id: string,
  patch: ProjectPatch
): Promise<PlanningProject | null> {
  const existing = await getProject(userId, id);
  if (!existing) return null;
  const merged: PlanningProject = {
    ...existing,
    title: patch.title ?? existing.title,
    step: patch.step ?? existing.step,
    input: patch.input ?? existing.input,
    artifacts: patch.artifacts ?? existing.artifacts,
    updatedAt: new Date().toISOString(),
  };
  // 계획서 제목이 생성되면 프로젝트 제목 자동 반영
  if (patch.artifacts?.plan?.titleCandidates?.[0] && existing.title === "새 기술기획 프로젝트") {
    merged.title = patch.artifacts.plan.titleCandidates[0];
  }
  return persist(userId, merged);
}

export async function addRehearsal(
  userId: string,
  id: string,
  record: RehearsalRecord
): Promise<PlanningProject | null> {
  const existing = await getProject(userId, id);
  if (!existing) return null;
  const merged: PlanningProject = {
    ...existing,
    rehearsals: [record, ...(existing.rehearsals || [])].slice(0, 50),
    updatedAt: new Date().toISOString(),
  };
  return persist(userId, merged);
}

export async function deleteProject(userId: string, id: string): Promise<boolean> {
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    await supabase.from("planning_projects").delete().eq("user_id", userId).eq("id", id);
    return true;
  }
  const arr = demoStore.get(userId);
  if (!arr) return false;
  demoStore.set(userId, arr.filter((p) => p.id !== id));
  return true;
}

// --- 내부 -------------------------------------------------------------------

async function persist(userId: string, project: PlanningProject): Promise<PlanningProject> {
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    await supabase
      .from("planning_projects")
      .update({
        title: project.title,
        step: project.step,
        input: project.input,
        artifacts: project.artifacts,
        rehearsals: project.rehearsals,
        updated_at: project.updatedAt,
      })
      .eq("user_id", userId)
      .eq("id", project.id);
    return project;
  }
  const arr = demoStore.get(userId) || [];
  const idx = arr.findIndex((p) => p.id === project.id);
  if (idx >= 0) arr[idx] = project;
  else arr.push(project);
  demoStore.set(userId, arr);
  return project;
}

function mapRow(row: Record<string, unknown>): PlanningProject {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    title: (row.title as string) || "새 기술기획 프로젝트",
    createdAt: (row.created_at as string) || new Date().toISOString(),
    updatedAt: (row.updated_at as string) || new Date().toISOString(),
    step: (row.step as number) || 1,
    input: (row.input as PlanningInput) || { ...EMPTY_INPUT },
    artifacts: (row.artifacts as PlanningArtifacts) || {},
    rehearsals: (row.rehearsals as RehearsalRecord[]) || [],
  };
}

export type { BusinessPlan };
