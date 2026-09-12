import type { AttendanceStatus, DismissalMethod } from "./types";

// ============================================================================
// Uzbek labels & colors for the static/categorical data
// ============================================================================

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["keldi", "kelmadi", "sababli", "sababsiz"];

export const ATTENDANCE_LABELS: Record<AttendanceStatus, string> = {
  keldi: "Keldi",
  kelmadi: "Kelmadi",
  sababli: "Sababli",
  sababsiz: "Sababsiz",
};

/** Tailwind classes (chart-friendly hex values live in chart components) */
export const ATTENDANCE_CLASSES: Record<AttendanceStatus, string> = {
  keldi: "bg-emerald-100 text-emerald-800 border-emerald-300",
  kelmadi: "bg-red-100 text-red-800 border-red-300",
  sababli: "bg-amber-100 text-amber-800 border-amber-300",
  sababsiz: "bg-orange-100 text-orange-800 border-orange-300",
};

export const DISMISSAL_METHODS: DismissalMethod[] = ["ozi_ketdi", "olib_ketishdi", "avtobusda"];

export const DISMISSAL_LABELS: Record<DismissalMethod, string> = {
  ozi_ketdi: "O'zi ketdi",
  olib_ketishdi: "Olib ketishdi",
  avtobusda: "Avtobusda",
};

export const DISMISSAL_CLASSES: Record<DismissalMethod, string> = {
  ozi_ketdi: "bg-sky-100 text-sky-800 border-sky-300",
  olib_ketishdi: "bg-violet-100 text-violet-800 border-violet-300",
  avtobusda: "bg-amber-100 text-amber-800 border-amber-300",
};

/** 1 = Dushanba … 6 = Shanba */
export const DAY_NAMES = ["Dushanba", "Seshanba", "Chorshanba", "Payshanba", "Juma", "Shanba"];
export const DAY_SHORT = ["Du", "Se", "Cho", "Pay", "Ju", "Sha"];

export const MONTHS_UZ = [
  "yanvar", "fevral", "mart", "aprel", "may", "iyun",
  "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr",
];

// ============================================================================
// Date helpers (all dates are handled as ISO strings: YYYY-MM-DD)
// ============================================================================

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2013-04-12" -> "12 aprel, 2013" */
export function formatDateUz(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d}-${oy(m)}, ${y}`;
}

function oy(m: number): string {
  return MONTHS_UZ[m - 1] ?? String(m);
}

/** Age in completed years */
export function age(dateOfBirth: string, at: string = todayStr()): number {
  const b = new Date(dateOfBirth + "T00:00:00Z");
  const t = new Date(at + "T00:00:00Z");
  let age = t.getUTCFullYear() - b.getUTCFullYear();
  const beforeBirthday =
    t.getUTCMonth() < b.getUTCMonth() ||
    (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate());
  if (beforeBirthday) age--;
  return age;
}

/** Month+day equality — used for the birthday alert */
export function isBirthdayToday(dateOfBirth: string, today: string = todayStr()): boolean {
  const [, bm, bd] = dateOfBirth.split("-").map(Number);
  const [, tm, td] = today.split("-").map(Number);
  return bm === tm && bd === td;
}

/** Days until the next birthday (0 = today) */
/** ISO date -> "Du", "Se", … for chart axis labels */
export function dayShortLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00Z");
  const iso = d.getUTCDay(); // 0=Sunday
  return DAY_SHORT[(iso + 6) % 7] ?? dateStr.slice(5);
}

// ============================================================================
// Misc helpers
// ============================================================================

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function pct(n: number | null | undefined): string {
  return n == null ? "—" : `${Math.round(n * 10) / 10}%`;
}

export function num(n: number | null | undefined): string {
  return n == null ? "—" : String(Math.round(n * 10) / 10);
}

export function initials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
