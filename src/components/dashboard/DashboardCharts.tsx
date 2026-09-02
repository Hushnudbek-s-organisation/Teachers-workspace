"use client";

// ============================================================================
// Tahlil paneli — Analytics dashboard charts (Task 3, Recharts)
//  1. Weekly attendance trend (stacked statuses + rate line)
//  2. Subject grade averages (bar)
//  3. Dismissal methods breakdown (pie)
// ============================================================================

import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ATTENDANCE_LABELS, DISMISSAL_LABELS } from "@/lib/utils";
import type { DayAttendancePoint, SubjectPerformance } from "@/lib/analytics";
import type { DismissalMethod } from "@/lib/types";

export const STATUS_COLORS: Record<string, string> = {
  keldi: "#10b981", // emerald
  sababli: "#f59e0b", // amber
  kelmadi: "#ef4444", // red
  sababsiz: "#f97316", // orange
};

const DISMISSAL_COLORS: Record<DismissalMethod, string> = {
  olib_ketishdi: "#8b5cf6", // violet
  ozi_ketdi: "#0ea5e9", // sky
  avtobusda: "#f59e0b", // amber
};

const tooltipStyle = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 12px rgba(15,23,42,0.08)",
  fontSize: 12,
};

// ---------------------------------------------------------------------------
// 1. Haftalik davomat — Present vs Absent ratio over the week
// ---------------------------------------------------------------------------
export function AttendanceTrendChart({ data }: { data: DayAttendancePoint[] }) {
  return (
    <div className="h-72 px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="counts" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} allowDecimals={false} />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `${v}%`}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) =>
              name === "Davomat %" ? [`${value}%`, name] : [value, name]
            }
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar yAxisId="counts" dataKey="keldi" name={ATTENDANCE_LABELS.keldi} stackId="att" fill={STATUS_COLORS.keldi} radius={[0, 0, 0, 0]} />
          <Bar yAxisId="counts" dataKey="sababli" name={ATTENDANCE_LABELS.sababli} stackId="att" fill={STATUS_COLORS.sababli} />
          <Bar yAxisId="counts" dataKey="kelmadi" name={ATTENDANCE_LABELS.kelmadi} stackId="att" fill={STATUS_COLORS.kelmadi} />
          <Bar yAxisId="counts" dataKey="sababsiz" name={ATTENDANCE_LABELS.sababsiz} stackId="att" radius={[4, 4, 0, 0]} fill={STATUS_COLORS.sababsiz} />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="rate"
            name="Davomat %"
            stroke="#4f46e5"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#4f46e5" }}
            activeDot={{ r: 5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Fanlar bo'yicha o'rtacha baholar
// ---------------------------------------------------------------------------
export function SubjectGradesChart({ data }: { data: SubjectPerformance[] }) {
  const colors = ["#6366f1", "#8b5cf6", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#ec4899"];
  return (
    <div className="h-72 px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} interval={0} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
          <Bar dataKey="average" name="O'rtacha baho" radius={[6, 6, 0, 0]} maxBarSize={48}>
            {data.map((entry, i) => (
              <Cell key={entry.subject} fill={colors[i % colors.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Uyga ketish usullari taqsimoti (bugun/oxirgi kun)
// ---------------------------------------------------------------------------
export function DismissalPieChart({
  data,
}: {
  data: Array<{ method: DismissalMethod; count: number }>;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const chartData = data.map((d) => ({
    name: DISMISSAL_LABELS[d.method],
    value: d.count,
    color: DISMISSAL_COLORS[d.method],
    share: total ? Math.round((d.count / total) * 100) : 0,
  }));
  return (
    <div className="flex h-72 flex-col px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={3}
            strokeWidth={2}
          >
            {chartData.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number, name: string) => [`${value} o'quvchi`, name]} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Kichik maydon grafigi — umumiy davomat dinamikasi (ixtiyoriy blok)
// ---------------------------------------------------------------------------
export function AttendanceAreaChart({ data }: { data: DayAttendancePoint[] }) {
  return (
    <div className="h-56 px-2 pb-2 pt-4">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="rateFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `${v}%`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`${value}%`, "Davomat"]} />
          <Area type="monotone" dataKey="rate" stroke="#4f46e5" strokeWidth={2} fill="url(#rateFill)" name="Davomat %" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
