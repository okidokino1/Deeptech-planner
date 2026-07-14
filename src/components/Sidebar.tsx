"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Rocket,
  CreditCard,
  Settings,
  LogOut,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard },
  { href: "/studio", label: "기술기획 스튜디오", icon: Rocket },
  { href: "/pricing", label: "요금제", icon: CreditCard },
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar({ user }: { user: Profile }) {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 text-slate-300">
      <div className="px-6 pt-6 pb-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
            <Rocket className="h-5 w-5" />
          </span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-white">딥테크 플래너</span>
            <span className="block text-[11px] text-slate-400">기술기획 · 사업계획서</span>
          </span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mx-3 mb-3 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-4 text-white">
        <Sparkles className="h-5 w-5" />
        <p className="mt-2 text-sm font-semibold leading-snug">AI로 사업계획서까지 한 번에</p>
        <p className="mt-1 text-xs text-brand-100">
          기술기획부터 발표연습까지 딥테크 지원사업을 준비하세요.
        </p>
        <Link
          href="/studio"
          className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/15 px-3 py-2 text-xs font-semibold hover:bg-white/25"
        >
          새 기획 시작 →
        </Link>
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-slate-700 text-sm font-bold text-white">
            {user.name.slice(0, 1)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
              {user.name}
              {user.isAdmin && (
                <span className="chip bg-brand-500 px-1.5 py-0.5 text-[10px] text-white">관리자</span>
              )}
            </p>
            <p className="truncate text-xs text-slate-400">{user.email}</p>
          </div>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="text-slate-400 hover:text-white" title="로그아웃">
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}
