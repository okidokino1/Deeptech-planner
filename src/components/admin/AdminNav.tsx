"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, Building2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminNav({ isPlatformAdmin }: { isPlatformAdmin: boolean }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", label: "개요", icon: LayoutGrid, exact: true },
    { href: "/admin/members", label: "회원", icon: Users },
    ...(isPlatformAdmin ? [{ href: "/admin/organizations", label: "기관", icon: Building2 }] : []),
    { href: "/admin/revenue", label: "매출", icon: CreditCard },
  ];
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {items.map((it) => {
        const active = it.exact ? pathname === it.href : pathname.startsWith(it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors",
              active ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
