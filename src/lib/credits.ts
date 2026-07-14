// 이용권(크레딧) 게이팅·차감 공통 헬퍼.
// score/route.ts 의 인라인 로직을 재사용 가능하게 추출. Pro는 무제한.

import { cookies } from "next/headers";
import { features } from "./env";
import { encodeDemoUser, DEMO_COOKIE_NAME } from "./auth";
import { getSupabaseServer } from "./supabase/server";
import type { Profile } from "./types";

export function hasCredit(user: Profile): boolean {
  return user.plan === "pro" || (user.credits ?? 0) > 0;
}

// 이용권 1회 차감 (Pro 제외). 데모 모드는 쿠키, Supabase는 profiles 갱신.
export async function consumeCredit(user: Profile): Promise<void> {
  if (user.plan === "pro") return;
  const next = Math.max(0, (user.credits ?? 0) - 1);
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    await supabase.from("profiles").update({ credits: next }).eq("id", user.id);
  } else {
    const store = await cookies();
    store.set(DEMO_COOKIE_NAME, encodeDemoUser({ ...user, credits: next }), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
}
