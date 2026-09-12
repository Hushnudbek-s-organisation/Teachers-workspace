"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Presentation,
  Wand2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  School,
  Users,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Boshqaruv paneli", icon: LayoutDashboard },
  { href: "/students", label: "O'quvchilar", icon: Users },
  { href: "/parents", label: "Ota-onalar", icon: UserRound },
  { href: "/teachers", label: "O'qituvchilar", icon: GraduationCap },
  { href: "/schedule", label: "Dars jadvali", icon: CalendarDays },
  { href: "/daily", label: "Kunlik davomat", icon: ClipboardCheck },
  { href: "/books", label: "Kitoblar & O'yinlar", icon: BookOpen },
  { href: "/games", label: "O'yin yasash", icon: Wand2 },
  { href: "/classroom", label: "Sinf bilan o'ynash", icon: Presentation },
  { href: "/analytics", label: "Tahlil", icon: BarChart3 },
];

function NavLinks({ orientation }: { orientation: "vertical" | "horizontal" }) {
  const pathname = usePathname();
  return (
    <nav
      className={cn(
        orientation === "vertical" ? "flex flex-col gap-1 px-3" : "flex gap-1 overflow-x-auto px-3 pb-1"
      )}
    >
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex shrink-0 items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-300 hover:bg-slate-800 hover:text-white",
              orientation === "horizontal" && "whitespace-nowrap"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ mode }: { mode: "supabase" | "demo" }) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-slate-900 md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="rounded-xl bg-indigo-600 p-2">
          <School className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Teachers Workspace</p>
          <p className="text-xs text-slate-400">Maktab boshqaruv tizimi</p>
        </div>
      </div>
      <NavLinks orientation="vertical" />
      <div className="mt-auto px-6 py-5">
        <Link
          href="/setup"
          className="mb-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <LifeBuoy className="h-4 w-4" />
          Sozlash tekshiruvi
        </Link>
        <div
          className={cn(
            "rounded-lg px-3 py-2 text-xs font-medium",
            mode === "supabase"
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-amber-500/10 text-amber-400"
          )}
        >
          {mode === "supabase"
            ? "● Supabase ulangan"
            : "● Demo rejimi — ma'lumotlar xotirada"}
        </div>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <div className="border-b border-slate-800 bg-slate-900 py-2 md:hidden">
      <div className="mb-2 flex items-center gap-2 px-4 pt-1">
        <School className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-bold text-white">Teachers Workspace</span>
      </div>
      <NavLinks orientation="horizontal" />
    </div>
  );
}
