import { cookies } from "next/headers";
import { features, isAdminEmail } from "./env";
import { getSupabaseServer } from "./supabase/server";
import type { Profile } from "./types";

const DEMO_COOKIE = "sp_demo_user";

// 현재 로그인 사용자(Profile) 반환. 없으면 null.
export async function getSessionUser(): Promise<Profile | null> {
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    const role = (profile?.role as Profile["role"]) || "member";
    const admin = isAdminEmail(user.email) || role === "admin";
    const isStaff = admin || role === "org_admin";
    return {
      id: user.id,
      email: user.email || "",
      name: profile?.name || user.email?.split("@")[0] || "학습자",
      plan: admin ? "pro" : profile?.plan || "free",
      credits: profile?.credits ?? 1,
      targetScore: profile?.target_score || undefined,
      isAdmin: admin,
      isStaff,
      role: admin ? "admin" : role,
      orgId: profile?.org_id || null,
    };
  }
  // 데모 모드: 쿠키 기반
  const store = await cookies();
  const raw = store.get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    const admin = isAdminEmail(parsed.email);
    return {
      id: parsed.id,
      email: parsed.email,
      name: parsed.name,
      plan: admin ? "pro" : parsed.plan || "free",
      credits: parsed.credits ?? 1,
      targetScore: parsed.targetScore,
      isAdmin: admin,
      isStaff: admin,
      role: admin ? "admin" : "member",
      orgId: null,
    };
  } catch {
    return null;
  }
}

// 데모 로그인 쿠키 생성용 인코딩
export function encodeDemoUser(p: Profile): string {
  return Buffer.from(JSON.stringify(p), "utf8").toString("base64");
}

export const DEMO_COOKIE_NAME = DEMO_COOKIE;
