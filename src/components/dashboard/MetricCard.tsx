import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** KPI metric card (server component). */
export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "indigo",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: "indigo" | "emerald" | "amber" | "violet" | "sky";
}) {
  const tones = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    sky: "bg-sky-50 text-sky-600",
  } as const;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className={cn("rounded-xl p-3", tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-2xl font-bold text-slate-900">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-xs text-slate-400">{hint}</p> : null}
      </div>
    </div>
  );
}
