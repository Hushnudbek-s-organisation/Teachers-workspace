"use client";

// ============================================================================
// O'qituvchi menyusi — tushunarli GURUHLARGA ajratilgan.
// Mavjud sahifalar va URL'lar SAQLANGAN: /, /students, /parents, /teachers,
// /schedule, /daily, /books, /games, /games/stats, /classroom, /analytics,
// /setup. Sessiya o'qituvchisi tepada ko'rinadi, "Chiqish" tugmasi bor.
// ============================================================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Presentation,
  Trophy,
  Wand2,
  ClipboardCheck,
  GraduationCap,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  School,
  Users,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { actionLogout } from "@/app/auth-actions";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Umumiy",
    items: [
      { href: "/", label: "Boshqaruv paneli", icon: LayoutDashboard },
      { href: "/analytics", label: "Tahlil", icon: BarChart3 },
    ],
  },
  {
    label: "Maktab kundaligi",
    items: [
      { href: "/students", label: "O'quvchilar", icon: Users },
      { href: "/parents", label: "Ota-onalar", icon: UserRound },
      { href: "/teachers", label: "O'qituvchilar", icon: GraduationCap },
      { href: "/schedule", label: "Dars jadvali", icon: CalendarDays },
      { href: "/daily", label: "Kunlik davomat", icon: ClipboardCheck },
    ],
  },
  {
    label: "O'yinlar va o'rganish",
    items: [
      { href: "/books", label: "Kitoblar & O'yinlar", icon: BookOpen },
      { href: "/games", label: "O'yin yasash", icon: Wand2 },
      { href: "/games/stats", label: "O'yin statistikasi", icon: Trophy },
      { href: "/classroom", label: "Sinf bilan o'ynash", icon: Presentation },
    ],
  },
  {
    label: "Tizim",
    items: [{ href: "/setup", label: "Sozlash tekshiruvi", icon: LifeBuoy }],
  },
];

const ALL_HREFS = NAV_GROUPS.flatMap((g) => g.items.map((i) => i.href));

/**
 * Faol bo'limni aniqlash: bir nechta havola mos kelsa (masalan /games va
 * /games/stats) eng uzuni tanlanadi — aks holda ikkalasi ham yonib turardi.
 */
function activeHref(pathname: string): string | null {
  const matches = ALL_HREFS.filter((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)
  );
  return matches.sort((a, b) => b.length - a.length)[0] ?? null;
}

function NavLinks({ orientation, session }: { orientation: "vertical" | "horizontal"; session: { email: string; role: string } | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const current = activeHref(pathname);

  const logout = () => {
    startTransition(async () => {
      await actionLogout();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <>
      <nav
        className={cn(
          orientation === "vertical" ? "flex flex-col gap-1 px-3" : "flex gap-1 overflow-x-auto px-3 pb-1"
        )}
      >
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className={orientation === "vertical" ? "mb-1.5" : "contents"}>
            {orientation === "vertical" ? (
              <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {group.label}
              </p>
            ) : null}
            <div className={orientation === "vertical" ? "flex flex-col gap-0.5" : "contents"}>
              {group.items.map(({ href, label, icon: Icon }) => {
                const active = href === current;
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
            </div>
          </div>
        ))}
      </nav>
      {orientation === "vertical" && session ? (
        <div className="mx-3 mb-2 rounded-lg bg-slate-800/60 px-3 py-2.5">
          <p className="truncate text-xs font-medium text-slate-200">{session.email}</p>
          <p className="text-[10px] text-slate-400">
            {session.role === "admin" ? "Administrator" : "O'qituvchi"}
          </p>
          <button
            onClick={logout}
            disabled={pending}
            className="mt-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {pending ? "Chiqilmoqda..." : "Chiqish"}
          </button>
        </div>
      ) : null}
    </>
  );
}

export function Sidebar({
  mode,
  session,
}: {
  mode: "supabase" | "demo";
  session: { email: string; role: string } | null;
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col overflow-y-auto bg-slate-900 md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="rounded-xl bg-indigo-600 p-2">
          <School className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">Teachers Workspace</p>
          <p className="text-xs text-slate-400">Maktab boshqaruv tizimi</p>
        </div>
      </div>
      <NavLinks orientation="vertical" session={session} />
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

export function MobileNav({ session = null }: { session?: { email: string; role: string } | null }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const logout = () => {
    startTransition(async () => {
      await actionLogout();
      router.push("/login");
      router.refresh();
    });
  };

  return (
    <div className="border-b border-slate-800 bg-slate-900 py-2 md:hidden">
      <div className="mb-2 flex items-center justify-between px-4 pt-1">
        <div className="flex items-center gap-2">
          <School className="h-4 w-4 text-indigo-400" />
          <span className="text-sm font-bold text-white">Teachers Workspace</span>
        </div>
        {session ? (
          <button
            onClick={logout}
            disabled={pending}
            className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-red-400 disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            Chiqish
          </button>
        ) : null}
      </div>
      <NavLinks orientation="horizontal" session={session ?? null} />
    </div>
  );
}
