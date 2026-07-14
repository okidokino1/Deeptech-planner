import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { features } from "@/lib/env";
import { DEMO_COOKIE_NAME } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  if (features.supabase) {
    const supabase = await getSupabaseServer();
    await supabase.auth.signOut();
  } else {
    const store = await cookies();
    store.delete(DEMO_COOKIE_NAME);
  }
  return NextResponse.redirect(new URL("/login", req.url));
}
