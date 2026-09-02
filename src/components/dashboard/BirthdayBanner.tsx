import { Cake } from "lucide-react";
import Link from "next/link";
import type { Student } from "@/lib/types";
import { formatDateUz } from "@/lib/utils";

/**
 * Birthday alert (Task 2 requirement):
 * highlights students whose birthday is TODAY, plus upcoming birthdays.
 */
export function BirthdayBanner({
  birthdays,
  upcoming,
}: {
  birthdays: Student[];
  upcoming: Array<{ student: Student; daysLeft: number }>;
}) {
  if (birthdays.length === 0 && upcoming.length === 0) return null;

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 shadow-sm">
      <div className="flex items-start gap-4 px-5 py-4">
        <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
          <Cake className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {birthdays.length > 0 ? (
            <>
              <p className="text-sm font-bold text-slate-800">
                🎉 Bugun tug'ilgan kun ({birthdays.length}):
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-2">
                {birthdays.map((s) => (
                  <li
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 shadow-sm"
                  >
                    🎂 {s.full_name}
                    <span className="text-slate-400">· {s.class_name}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-700">Yaqin tug'ilgan kunlar</p>
          )}

          {upcoming.length > 0 ? (
            <p className="mt-2 text-xs text-slate-600">
              <span className="font-medium">Yaqin 7 kunda: </span>
              {upcoming
                .map(
                  ({ student, daysLeft }) =>
                    `${student.full_name} — ${formatDateUz(student.date_of_birth).split(",")[0]} (${daysLeft} kundan keyin)`
                )
                .join(" · ")}
            </p>
          ) : null}
        </div>
        <Link
          href="/students"
          className="shrink-0 self-center rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-50"
        >
          Barcha o'quvchilar
        </Link>
      </div>
    </div>
  );
}
