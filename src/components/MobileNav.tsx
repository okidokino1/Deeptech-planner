"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, Rocket } from "lucide-react";
import type { Profile } from "@/lib/types";

const NAV = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/studio", label: "기술기획 스튜디오" },
  { href: "/pricing", label: "요금제" },
  { href: "/settings", label: "설정" },
];

export function MobileNav({ user }: { user: Profile }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">
            <Rocket className="h-4 w-4" />
          </span>
          <span className="font-bold text-slate-900">딥테크 플래너</span>
        </Link>
        <button onClick={() => setOpen((v) => !v)} className="text-slate-700">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div className="border-b border-slate-200 bg-white px-4 py-2">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
          <div className="mt-1 flex items-center justify-between border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
            <span>{user.email}</span>
            <form action="/api/auth/signout" method="post">
              <button className="font-semibold text-brand-600">로그아웃</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
