import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEMO_COOKIE_NAME, encodeDemoUser } from "@/lib/auth";
import type { Profile } from "@/lib/types";

// 데모 로그인/회원가입: 이메일만으로 세션 쿠키 발급 (Supabase 미설정 시)
export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim() || "guest@demo.ai";
  const name =
    String(form.get("name") || "").trim() || email.split("@")[0] || "학습자";

  const user: Profile = {
    id: "demo-" + hash(email),
    email,
    name,
    plan: "free",
    credits: 1, // 회원가입 시 무료 1세트
  };

  const store = await cookies();
  store.set(DEMO_COOKIE_NAME, encodeDemoUser(user), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.redirect(new URL("/dashboard", req.url), { status: 303 });
}

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff;
  return Math.abs(h).toString(36);
}
