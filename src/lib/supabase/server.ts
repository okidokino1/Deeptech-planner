import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { env } from "../env";

// 요청 컨텍스트용 Supabase 서버 클라이언트 (RLS 적용, 쿠키 세션)
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Server Component에서 호출된 경우 무시 (middleware가 갱신)
        }
      },
    },
  });
}

// service role (RLS 우회) — 서버 전용, 웹훅/관리 작업에만 사용
export function getSupabaseAdmin() {
  return createClient(env.supabaseUrl, env.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
