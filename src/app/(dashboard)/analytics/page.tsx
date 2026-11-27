// ============================================================================
// Tahlil — Reports (Task 3, jadval shaklida)
// Monthly attendance, subject & class performance, per-student overview.
// ============================================================================

import { BarChart3, CalendarRange, GraduationCap, Users } from "lucide-react";
import { AttendanceAreaChart } from "@/components/dashboard/DashboardCharts";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardHeader } from "@/components/ui";
import { repo } from "@/lib/repo";
import {
  classPerformance,
  dailyAttendance,
  monthlyAttendance,
  studentStats,
  subjectPerformance,
} from "@/lib/analytics";
import { addDays, cn, num, pct, todayStr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const today = todayStr();
  const since = addDays(today, -89); // ~3 oylik tahlil

  const [students, attendance, grades] = await Promise.all([
    repo.listStudents(),
    repo.listAttendance(since),
    repo.listGrades(since),
  ]);

  const trend14 = dailyAttendance(attendance, 14, today);
  const months = monthlyAttendance(attendance);
  const subjects = subjectPerformance(grades);
  const classes = classPerformance(students, grades, attendance);
  const perStudent = studentStats(students, attendance, grades).sort(
    (a, b) => (b.average_grade ?? -1) - (a.average_grade ?? -1)
  );

  return (
    <div>
      <PageHeader
        title="Tahlil"
        description="Davomat foizlari, o'rtacha baholar va o'quvchilar kesimida batafsil hisobotlar."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 14-day attendance trend */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Davomat dinamikasi (14 kun)"
            subtitle="Kunlik davomat foizi"
            icon={<BarChart3 className="h-4 w-4" />}
          />
          {trend14.length === 0 ? (
            <p className="px-5 py-16 text-center text-sm text-slate-400">Ma'lumot yo'q</p>
          ) : (
            <AttendanceAreaChart data={trend14} />
          )}
        </Card>

        {/* Monthly attendance table (v_monthly_attendance) */}
        <Card>
          <CardHeader title="Oylik davomat" subtitle="v_monthly_attendance" icon={<CalendarRange className="h-4 w-4" />} />
          <div className="thin-scroll max-h-64 overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0">
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Oy</th>
                  <th className="px-3 py-2.5 font-medium">Yozuvlar</th>
                  <th className="px-5 py-2.5 font-medium">Davomat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {months.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-xs text-slate-400">
                      Ma'lumot yo'q
                    </td>
                  </tr>
                ) : (
                  months
                    .slice()
                    .reverse()
                    .map((m) => (
                      <tr key={m.month}>
                        <td className="px-5 py-2.5 font-medium text-slate-800">{m.month}</td>
                        <td className="px-3 py-2.5 text-slate-600">{m.total}</td>
                        <td className={cn("px-5 py-2.5 font-medium", (m.rate ?? 0) >= 85 ? "text-emerald-600" : "text-amber-600")}>
                          {pct(m.rate)}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Subject performance (v_subject_performance) */}
      <Card className="mt-5">
        <CardHeader title="Fanlar bo'yicha baholash tahlili" subtitle="v_subject_performance" icon={<GraduationCap className="h-4 w-4" />} />
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Fan</th>
                <th className="px-4 py-3 font-medium">Baholar soni</th>
                <th className="px-4 py-3 font-medium">O'quvchilar</th>
                <th className="px-4 py-3 font-medium">O'rtacha</th>
                <th className="px-4 py-3 font-medium">Eng yuqori</th>
                <th className="px-5 py-3 font-medium">Eng past</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-400">
                    Baholar yo'q
                  </td>
                </tr>
              ) : (
                subjects.map((s) => (
                  <tr key={s.subject} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-semibold text-slate-800">{s.subject}</td>
                    <td className="px-4 py-3 text-slate-600">{s.count}</td>
                    <td className="px-4 py-3 text-slate-600">—</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <span
                            className="block h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, Math.max(0, s.average))}%` }}
                          />
                        </span>
                        <span className="font-medium text-slate-700">{num(s.average)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-emerald-600">{s.highest}</td>
                    <td className="px-5 py-3 text-red-500">{s.lowest}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Per-student overview (v_student_overview) */}
      <Card className="mt-5">
        <CardHeader
          title="O'quvchilar bo'yicha umumiy ko'rsatkichlar"
          subtitle={`v_student_overview — so'nggi ~3 oy (${perStudent.length} o'quvchi)`}
          icon={<Users className="h-4 w-4" />}
        />
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">O'quvchi</th>
                <th className="px-3 py-3 font-medium">Sinf</th>
                <th className="px-3 py-3 font-medium">Keldi</th>
                <th className="px-3 py-3 font-medium">Kelmadi</th>
                <th className="px-3 py-3 font-medium">Sababli</th>
                <th className="px-3 py-3 font-medium">Sababsiz</th>
                <th className="px-3 py-3 font-medium">Davomat %</th>
                <th className="px-5 py-3 font-medium">O'rtacha baho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {perStudent.map((s) => (
                <tr key={s.student.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-900">{s.student.full_name}</td>
                  <td className="px-3 py-3 text-slate-600">{s.student.class_name}</td>
                  <td className="px-3 py-3 text-emerald-600">{s.present_days}</td>
                  <td className="px-3 py-3 text-red-500">{s.absent_days}</td>
                  <td className="px-3 py-3 text-amber-600">{s.excused_days}</td>
                  <td className="px-3 py-3 text-orange-500">{s.unexcused_days}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "font-medium",
                        s.attendance_rate == null
                          ? "text-slate-400"
                          : s.attendance_rate >= 90
                            ? "text-emerald-600"
                            : s.attendance_rate >= 75
                              ? "text-amber-600"
                              : "text-red-600"
                      )}
                    >
                      {pct(s.attendance_rate)}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-slate-800">{num(s.average_grade)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-center text-xs text-slate-400">
        Ko'rsatkichlar SQL ko'rinishlari (v_daily_attendance, v_monthly_attendance,
        v_subject_performance, v_student_overview) bilan bir xil formulada hisoblanadi.
      </p>
    </div>
  );
}
