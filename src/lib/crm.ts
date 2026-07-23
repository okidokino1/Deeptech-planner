// 딥테크 플래너 · CRM 데이터층
// 회원(profiles) · 기술기획 프로젝트(planning_projects) · 결제(payments) · 기관(organizations)을
// service_role로 집계한다. (앱 레벨 권한 스코핑: 플랫폼 관리자 = 전체, 기관 관리자 = 자기 조직)

import { env, features } from "./env";
import { getSupabaseAdmin } from "./supabase/server";
import type { Profile, Role } from "./types";

const hasAdmin = () => features.supabase && !!env.supabaseServiceKey;

// ---- 타입 ----
export interface OrgRow {
  id: string;
  name: string;
  contactEmail: string | null;
  contactPhone: string | null;
  memo: string | null;
  createdAt: string | null;
  memberCount?: number;
}

export interface MemberRow {
  id: string;
  email: string;
  name: string;
  plan: "free" | "pro";
  credits: number;
  role: Role;
  status: string;
  tags: string[];
  memo: string | null;
  orgId: string | null;
  orgName: string | null;
  createdAt: string | null;
  projectCount: number; // 기술기획 프로젝트 수
  completedPlans: number; // 완성된 사업계획서 수
  totalSpend: number;
  lastActive: string | null;
  phone: string | null;
  birthdate: string | null;
  gender: string | null;
  address: string | null;
  phoneVerified: boolean;
}

export interface PaymentRow {
  userId: string;
  userName: string;
  amount: number;
  provider: string | null;
  paidAt: string | null;
}

export interface Kpis {
  totalMembers: number;
  paidMembers: number;
  conversionRate: number; // %
  totalRevenue: number;
  totalProjects: number;
  completedPlans: number;
  newMembers7d: number;
  revenue7d: number;
  trend: { date: string; signups: number; revenue: number }[]; // 최근 14일
}

// ---- 내부: 뷰어 범위로 데이터 로드 ----
type Viewer = Pick<Profile, "role" | "orgId" | "isAdmin">;

type Row = Record<string, unknown>;

async function loadScoped(viewer: Viewer) {
  const sb = getSupabaseAdmin();
  const orgScope = viewer.role === "org_admin" ? viewer.orgId : null;

  let pq = sb
    .from("profiles")
    .select("id,email,name,plan,credits,created_at,org_id,role,memo,tags,status,phone,birthdate,gender,address,phone_verified")
    .order("created_at", { ascending: false });
  if (orgScope) pq = pq.eq("org_id", orgScope);
  const { data: profiles } = await pq;
  const profs = (profiles || []) as Row[];
  const ids = profs.map((p) => p.id as string);
  const inIds = ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];

  // 프로젝트: 개수·최근활동용 (경량 컬럼만)
  const { data: projects } = await sb
    .from("planning_projects")
    .select("user_id,updated_at")
    .in("user_id", inIds);
  // 완성 계획서: artifacts.plan 이 존재하는 프로젝트만
  const { data: donePlans } = await sb
    .from("planning_projects")
    .select("user_id")
    .not("artifacts->plan", "is", null)
    .in("user_id", inIds);
  const { data: payments } = await sb
    .from("payments")
    .select("user_id,amount,status,provider,paid_at")
    .eq("status", "paid")
    .in("user_id", inIds);
  const { data: orgs } = await sb.from("organizations").select("id,name");

  return {
    profs,
    projects: (projects || []) as Row[],
    donePlans: (donePlans || []) as Row[],
    payments: (payments || []) as Row[],
    orgMap: new Map((orgs || []).map((o: Row) => [o.id as string, o.name as string])),
  };
}

function countByUser(rows: Row[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.user_id as string;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

// ---- KPI ----
export async function getKpis(viewer: Viewer): Promise<Kpis> {
  const empty: Kpis = {
    totalMembers: 0, paidMembers: 0, conversionRate: 0, totalRevenue: 0,
    totalProjects: 0, completedPlans: 0, newMembers7d: 0, revenue7d: 0, trend: [],
  };
  if (!hasAdmin()) return empty;
  const { profs, projects, donePlans, payments } = await loadScoped(viewer);

  const totalMembers = profs.length;
  const paidMembers = new Set(payments.map((p) => p.user_id as string)).size;
  const totalRevenue = payments.reduce((s, p) => s + ((p.amount as number) || 0), 0);
  const totalProjects = projects.length;
  const completedPlans = donePlans.length;

  const now = Date.now();
  const day = 86400000;
  const newMembers7d = profs.filter((p) => now - +new Date(p.created_at as string) < 7 * day).length;
  const revenue7d = payments
    .filter((p) => p.paid_at && now - +new Date(p.paid_at as string) < 7 * day)
    .reduce((s, p) => s + ((p.amount as number) || 0), 0);

  const trend: Kpis["trend"] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * day);
    const key = d.toISOString().slice(0, 10);
    const signups = profs.filter((p) => (p.created_at as string)?.slice(0, 10) === key).length;
    const revenue = payments
      .filter((p) => (p.paid_at as string)?.slice(0, 10) === key)
      .reduce((s, p) => s + ((p.amount as number) || 0), 0);
    trend.push({ date: key.slice(5), signups, revenue });
  }

  return {
    totalMembers,
    paidMembers,
    conversionRate: totalMembers ? Math.round((paidMembers / totalMembers) * 100) : 0,
    totalRevenue,
    totalProjects,
    completedPlans,
    newMembers7d,
    revenue7d,
    trend,
  };
}

// ---- 회원 목록 (enriched) ----
export async function listMembers(viewer: Viewer): Promise<MemberRow[]> {
  if (!hasAdmin()) return [];
  const { profs, projects, donePlans, payments, orgMap } = await loadScoped(viewer);

  const projByUser = new Map<string, Row[]>();
  for (const r of projects) {
    const k = r.user_id as string;
    if (!projByUser.has(k)) projByUser.set(k, []);
    projByUser.get(k)!.push(r);
  }
  const doneByUser = countByUser(donePlans);
  const payByUser = new Map<string, Row[]>();
  for (const r of payments) {
    const k = r.user_id as string;
    if (!payByUser.has(k)) payByUser.set(k, []);
    payByUser.get(k)!.push(r);
  }

  return profs.map((p) => {
    const uid = p.id as string;
    const projs = projByUser.get(uid) || [];
    const pays = payByUser.get(uid) || [];
    const lastActive = projs
      .map((a) => a.updated_at as string)
      .sort()
      .slice(-1)[0] || null;
    return {
      id: uid,
      email: (p.email as string) || "",
      name: (p.name as string) || "",
      plan: ((p.plan as string) || "free") as "free" | "pro",
      credits: (p.credits as number) ?? 0,
      role: ((p.role as string) || "member") as Role,
      status: (p.status as string) || "active",
      tags: (p.tags as string[]) || [],
      memo: (p.memo as string) || null,
      orgId: (p.org_id as string) || null,
      orgName: p.org_id ? orgMap.get(p.org_id as string) || null : null,
      createdAt: (p.created_at as string) || null,
      projectCount: projs.length,
      completedPlans: doneByUser.get(uid) || 0,
      totalSpend: pays.reduce((s, x) => s + ((x.amount as number) || 0), 0),
      lastActive,
      phone: (p.phone as string) || null,
      birthdate: (p.birthdate as string) || null,
      gender: (p.gender as string) || null,
      address: (p.address as string) || null,
      phoneVerified: !!p.phone_verified,
    };
  });
}

// ---- 회원 상세 (프로젝트·결제 이력 포함) ----
export interface MemberProject {
  id: string;
  title: string;
  step: number;
  done: boolean; // 사업계획서 완성 여부
  updatedAt: string;
}

export interface CreditLogRow {
  delta: number;
  before: number;
  after: number;
  reason: string | null;
  actorEmail: string | null;
  createdAt: string | null;
}

export interface MemberDetail extends MemberRow {
  projects: MemberProject[];
  payments: { amount: number; provider: string | null; paidAt: string | null }[];
  creditLogs: CreditLogRow[];
}

// 이용권 수동 조정 (지급/차감). 절대값 입력이 아니라 증감(delta)으로 처리해
// 동시 차감과 충돌해도 잔여가 어긋나지 않게 한다. 조정 내역은 항상 기록한다.
export async function adjustCredits(
  viewer: Viewer,
  userId: string,
  delta: number,
  reason: string,
  actor: { id: string; email: string }
): Promise<{ ok: boolean; credits?: number; error?: string }> {
  if (!hasAdmin()) return { ok: false, error: "관리자 설정(service_role)이 필요합니다." };
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: "증감량은 0이 아닌 정수여야 합니다." };
  if (Math.abs(delta) > 1000) return { ok: false, error: "한 번에 1000회를 초과해 조정할 수 없습니다." };

  // 뷰어 범위 밖(다른 기관 회원)이면 접근 불가
  const members = await listMembers(viewer);
  const target = members.find((m) => m.id === userId);
  if (!target) return { ok: false, error: "대상 회원을 찾을 수 없습니다." };

  const sb = getSupabaseAdmin();
  // 잔여는 항상 DB 최신값 기준으로 계산 (목록 캐시값을 신뢰하지 않는다)
  const { data: cur } = await sb.from("profiles").select("credits").eq("id", userId).single();
  const before = ((cur as Row | null)?.credits as number) ?? 0;
  const after = Math.max(0, before + delta);

  const { error } = await sb.from("profiles").update({ credits: after }).eq("id", userId);
  if (error) return { ok: false, error: "이용권 반영에 실패했습니다." };

  // 이력 기록 실패가 조정 자체를 되돌리진 않지만, 반드시 로그로 남긴다.
  const { error: logErr } = await sb.from("credit_adjustments").insert({
    user_id: userId,
    delta: after - before,
    before_credits: before,
    after_credits: after,
    reason: reason?.trim() || null,
    actor_id: actor.id,
    actor_email: actor.email,
  });
  if (logErr) {
    console.error("[crm] 이용권 조정 이력 기록 실패 (credit-adjustments.sql 실행 필요):", logErr.message);
  }

  return { ok: true, credits: after };
}

async function listCreditLogs(userId: string): Promise<CreditLogRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("credit_adjustments")
    .select("delta,before_credits,after_credits,reason,actor_email,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return []; // 테이블 미생성 시에도 화면이 죽지 않게 한다
  return ((data || []) as Row[]).map((r) => ({
    delta: (r.delta as number) || 0,
    before: (r.before_credits as number) || 0,
    after: (r.after_credits as number) || 0,
    reason: (r.reason as string) || null,
    actorEmail: (r.actor_email as string) || null,
    createdAt: (r.created_at as string) || null,
  }));
}

export async function getMember(viewer: Viewer, id: string): Promise<MemberDetail | null> {
  if (!hasAdmin()) return null;
  const members = await listMembers(viewer);
  const base = members.find((m) => m.id === id);
  if (!base) return null; // 범위 밖이면 접근 불가

  const sb = getSupabaseAdmin();
  const { data: projs } = await sb
    .from("planning_projects")
    .select("id,title,step,updated_at,artifacts")
    .eq("user_id", id)
    .order("updated_at", { ascending: false });
  const { data: pays } = await sb
    .from("payments")
    .select("amount,provider,paid_at,status")
    .eq("user_id", id)
    .eq("status", "paid")
    .order("paid_at", { ascending: false });

  return {
    ...base,
    projects: ((projs || []) as Row[]).map((a) => ({
      id: a.id as string,
      title: (a.title as string) || "새 기술기획 프로젝트",
      step: (a.step as number) || 1,
      done: !!(a.artifacts as Record<string, unknown>)?.plan,
      updatedAt: a.updated_at as string,
    })),
    payments: ((pays || []) as Row[]).map((p) => ({
      amount: (p.amount as number) || 0,
      provider: (p.provider as string) || null,
      paidAt: (p.paid_at as string) || null,
    })),
    creditLogs: await listCreditLogs(id),
  };
}

// ---- 회원 수정 ----
// 이용권(credits)은 여기서 다루지 않는다 — 이력이 남는 adjustCredits() 만 사용한다.
export interface MemberPatch {
  name?: string;
  plan?: "free" | "pro";
  status?: string;
  memo?: string;
  tags?: string[];
  orgId?: string | null;
  role?: Role;
}

export async function updateMember(viewer: Viewer, id: string, patch: MemberPatch): Promise<boolean> {
  if (!hasAdmin()) return false;
  const members = await listMembers(viewer);
  if (!members.find((m) => m.id === id)) return false;
  const isPlatform = viewer.isAdmin || viewer.role === "admin";

  const sb = getSupabaseAdmin();
  const u: Record<string, unknown> = {};
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.plan !== undefined) u.plan = patch.plan;
  if (patch.status !== undefined) u.status = patch.status;
  if (patch.memo !== undefined) u.memo = patch.memo;
  if (patch.tags !== undefined) u.tags = patch.tags;
  if (isPlatform && patch.orgId !== undefined) u.org_id = patch.orgId;
  if (isPlatform && patch.role !== undefined) u.role = patch.role;
  const { error } = await sb.from("profiles").update(u).eq("id", id);
  return !error;
}

// ---- 기관 ----
export async function listOrganizations(viewer: Viewer): Promise<OrgRow[]> {
  if (!hasAdmin()) return [];
  const sb = getSupabaseAdmin();
  let q = sb.from("organizations").select("id,name,contact_email,contact_phone,memo,created_at").order("created_at", { ascending: false });
  if (viewer.role === "org_admin" && viewer.orgId) q = q.eq("id", viewer.orgId);
  const { data } = await q;
  const orgs = (data || []) as Row[];
  const { data: profs } = await sb.from("profiles").select("org_id");
  const counts = new Map<string, number>();
  for (const p of (profs || []) as Row[]) {
    const oid = p.org_id as string;
    if (oid) counts.set(oid, (counts.get(oid) || 0) + 1);
  }
  return orgs.map((o) => ({
    id: o.id as string,
    name: o.name as string,
    contactEmail: (o.contact_email as string) || null,
    contactPhone: (o.contact_phone as string) || null,
    memo: (o.memo as string) || null,
    createdAt: (o.created_at as string) || null,
    memberCount: counts.get(o.id as string) || 0,
  }));
}

export async function createOrganization(
  viewer: Viewer,
  data: { name: string; contactEmail?: string; contactPhone?: string; memo?: string }
): Promise<string | null> {
  if (!hasAdmin() || !(viewer.isAdmin || viewer.role === "admin")) return null;
  const sb = getSupabaseAdmin();
  const { data: row, error } = await sb
    .from("organizations")
    .insert({
      name: data.name,
      contact_email: data.contactEmail || null,
      contact_phone: data.contactPhone || null,
      memo: data.memo || null,
    })
    .select("id")
    .single();
  if (error || !row) return null;
  return row.id as string;
}

export async function updateOrganization(
  viewer: Viewer,
  id: string,
  patch: { name?: string; contactEmail?: string; contactPhone?: string; memo?: string }
): Promise<boolean> {
  if (!hasAdmin()) return false;
  if (viewer.role === "org_admin" && viewer.orgId !== id) return false;
  const sb = getSupabaseAdmin();
  const u: Record<string, unknown> = {};
  if (patch.name !== undefined) u.name = patch.name;
  if (patch.contactEmail !== undefined) u.contact_email = patch.contactEmail;
  if (patch.contactPhone !== undefined) u.contact_phone = patch.contactPhone;
  if (patch.memo !== undefined) u.memo = patch.memo;
  const { error } = await sb.from("organizations").update(u).eq("id", id);
  return !error;
}

export async function setOrgAdmin(viewer: Viewer, userId: string, orgId: string | null): Promise<boolean> {
  if (!hasAdmin() || !(viewer.isAdmin || viewer.role === "admin")) return false;
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("profiles")
    .update({ role: orgId ? "org_admin" : "member", org_id: orgId })
    .eq("id", userId);
  return !error;
}

// ---- 매출/결제 ----
export async function listPayments(viewer: Viewer): Promise<PaymentRow[]> {
  if (!hasAdmin()) return [];
  const { profs, payments } = await loadScoped(viewer);
  const nameMap = new Map(profs.map((p) => [p.id as string, (p.name as string) || (p.email as string)]));
  return payments
    .map((p) => ({
      userId: p.user_id as string,
      userName: nameMap.get(p.user_id as string) || "(알 수 없음)",
      amount: (p.amount as number) || 0,
      provider: (p.provider as string) || null,
      paidAt: (p.paid_at as string) || null,
    }))
    .sort((a, b) => (b.paidAt || "").localeCompare(a.paidAt || ""));
}
