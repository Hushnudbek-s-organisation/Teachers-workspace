"use client";

// ============================================================================
// O'quvchilar — Students CRUD + SHAXSIY LINK BOSHQARUVI.
//
//   • Qidiruv + sinf bo'yicha filtr (telefonda ham oson topish)
//   • Yangi o'quvchi qo'shilgach: "O'quvchi linkini nusxalash" muvaffaqiyat oynasi
//   • Ro'yxatda har o'quvchi uchun: link holati, Nusxalash (yangi berilganda),
//     Yangilash (eski kirish o'ladi), Bekor qilish
//   • Eski o'quvchi yozuvlari qayta YOZILMAYDI — link alohida jadvalda
//   • Telefon uchun kartalar, desktop uchun jadval
// ============================================================================

import { useMemo, useState, useTransition } from "react";
import {
  Cake,
  Check,
  Copy,
  KeyRound,
  Link2Off,
  MessageCircle,
  Pencil,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  Send,
  Trash2,
  Users,
} from "lucide-react";
import {
  actionIssueClassLinks,
  actionIssueStudentLink,
  actionRevokeStudentLink,
  actionRotateStudentLink,
  deleteStudent,
  saveStudent,
} from "@/app/actions";
import type { StudentStat } from "@/lib/analytics";
import type { Student } from "@/lib/types";
import {
  age,
  cn,
  formatDateUz,
  isBirthdayToday,
  num,
  pct,
  todayStr,
} from "@/lib/utils";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Textarea,
} from "@/components/ui";

export interface LinkStatusView {
  active: boolean;
  createdAt: string | null;
  revokedAt: string | null;
}

interface IssuedCard {
  studentId: string;
  fullName: string;
  url: string;
  qr: string;
}

interface ClassLinksView {
  className: string;
  issued: IssuedCard[];
  alreadyActive: number;
}

/** WhatsApp/Telegram orqali ota-onaga yuborish (matnda ism YO'Q — ota-ona biladi) */
function waHref(url: string): string {
  return `https://wa.me/?text=${encodeURIComponent(`🎮 Senga o'yin havolasi! Och va o'ynashni boshla: ${url}`)}`;
}
function tgHref(url: string): string {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent("🎮 O'yin havolasi — och va o'ynashni boshla!")}`;
}

const PRINT_CSS = `@media print {
  body * { visibility: hidden !important; }
  .classlink-print-area, .classlink-print-area * { visibility: visible !important; }
  .classlink-print-area { position: fixed !important; inset: 0 !important; overflow: visible !important; background: #fff !important; padding: 6mm !important; }
  .classlink-print-card { break-inside: avoid; page-break-inside: avoid; border-color: #cbd5e1 !important; }
  .classlink-screen-only { display: none !important; }
}`;

// ------------------------------- Forma -------------------------------------

function StudentForm({
  student,
  onDone,
}: {
  student?: Student;
  onDone: (link: { url: string; qr: string } | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveStudent(fd);
        onDone(res?.linkUrl ? { url: res.linkUrl, qr: res.qr ?? "" } : null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {student ? <input type="hidden" name="id" value={student.id} /> : null}
      <Field label="F.I.Sh *">
        <Input name="full_name" required defaultValue={student?.full_name} placeholder="Masalan: Alisher Karimov" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Tug'ilgan sana *">
          <Input type="date" name="date_of_birth" required defaultValue={student?.date_of_birth} />
        </Field>
        <Field label="Sinf *" hint="Mavjud sinflar avtomatik taklif qilinadi">
          <Input name="class_name" required list="class-list" defaultValue={student?.class_name} placeholder="3-A" />
        </Field>
      </div>
      <Field label="Telefon">
        <Input name="phone" defaultValue={student?.phone ?? ""} placeholder="+998 90 123-45-67" />
      </Field>
      <Field label="Izoh">
        <Textarea name="notes" defaultValue={student?.notes ?? ""} placeholder="Qo'shimcha ma'lumot..." />
      </Field>
      {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={() => onDone(null)}>
          Bekor qilish
        </Button>
        {/* onDone(null) — link yaratilmadi holati ham xuddi shu yo'l bilan */}
        <Button type="submit" disabled={pending}>
          {pending ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
    </form>
  );
}

// --------------------------- Link oynasi / dialog ---------------------------

function LinkSuccessDialog({
  studentName,
  linkUrl,
  qr,
  onClose,
}: {
  studentName: string;
  linkUrl: string;
  qr?: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(linkUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Nusxalash ishlamadi — havolani qo'lda tanlab nusxalang.");
    }
  };

  return (
    <Modal open title="O'quvchi qo'shildi! 🎉" onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-emerald-50 px-4 py-3">
          <p className="text-sm font-semibold text-emerald-800">
            <Check className="mr-1 inline h-4 w-4" />
            {studentName} saqlandi. Endi unga shaxsiy o'yin linki beramiz:
          </p>
        </div>
        <p className="text-xs leading-relaxed text-slate-500">
          Bu havola <b>faqat shu o'quvchiga</b> tegishli: unda ism, telefon yoki ID <b>yo'q</b> —
          taxmin qilib bo'lmaydigan maxfiy kod bor. Havolani o'quvchining telefoniga yuboring
          (masalan, WhatsApp) — u parolsiz o'yin portali ga kiradi.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            readOnly
            value={linkUrl}
            onFocus={(e) => e.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-700"
          />
          <button
            onClick={copy}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 min-h-[44px]"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Nusxalandi!" : "O'quvchi linkini nusxalash"}
          </button>
        </div>
        {qr ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR kod" className="h-40 w-40" />
            <p className="text-center text-[11px] text-slate-500">
              Telefon kamerasini shu kvadratga tutganda o'yin portali ochiladi — parol so'ralmaydi.
            </p>
          </div>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          <a
            href={waHref(linkUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </a>
          <a
            href={tgHref(linkUrl)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-sky-600"
          >
            <Send className="h-4 w-4" /> Telegram
          </a>
        </div>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
          Keyinroq ro'yxatda havolani <b>yangilash</b> (eski havola o'ladi) yoki <b>bekor qilish</b> mumkin.
          Havolani qayta ko'rsatib bo'lmaydi — xavfsizlik uchun bazada faqat uning maxfiy xeshi saqlanadi.
        </p>
        <div className="flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Yopish
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// --------------------------- Link amallari (ro'yxatda) ----------------------

function LinkActions({
  studentId,
  studentName,
  status,
  onChanged,
  onIssued,
}: {
  studentId: string;
  studentName: string;
  status: LinkStatusView | undefined;
  onChanged: () => void;
  onIssued: (info: { name: string; url: string; qr: string | null }) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const issueOrRotate = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const res = status?.active ? await actionRotateStudentLink(studentId) : await actionIssueStudentLink(studentId);
      if (res.ok && res.url) {
        onIssued({ name: studentName, url: res.url, qr: res.qr ?? null });
        onChanged();
      } else if (!res.ok) {
        setProblem(res.error ?? "Amal bajarilmadi");
      }
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    setBusy(true);
    setProblem(null);
    try {
      const res = await actionRevokeStudentLink(studentId);
      if (res.ok) {
        setConfirmRevoke(false);
        onChanged();
      } else {
        setProblem(res.error ?? "Bekor qilinmadi");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1.5">
      <div className="flex flex-wrap items-center gap-1">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
            status?.active
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-slate-50 text-slate-500"
          )}
        >
          <KeyRound className="h-3 w-3" />
          {status?.active ? "Faol" : status?.createdAt ? "Bekor qilingan" : "Yo'q"}
        </span>
        <button
          onClick={issueOrRotate}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
          title={status?.active ? "Yangi token berish — eski link ishlamaydi" : "Shaxsiy link berish"}
        >
          <RefreshCw className="h-3 w-3" />
          {status?.active ? "Yangilash" : "Link berish"}
        </button>
        {status?.active ? (
          <button
            onClick={() => setConfirmRevoke(true)}
            disabled={busy}
            className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-2 py-1 text-[11px] font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Linkni bekor qilish — eski kirish darhol o'ladi"
          >
            <Link2Off className="h-3 w-3" />
            Bekor
          </button>
        ) : null}
      </div>
      {problem ? <span className="text-[10px] text-red-600">{problem}</span> : null}

      {confirmRevoke ? (
        <Modal open title="Linkni bekor qilish" onClose={() => setConfirmRevoke(false)}>
          <p className="text-sm text-slate-600">
            <b>{studentName}</b> ning o'yin havolasi bekor qilinsinmi? Bu havola orqali kirgan o'quvchi
            darhol o'yinlarni o'ynay olmaydi. O'quvchi yozuvlari o'chmaydi.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setConfirmRevoke(false)}>
              Bekor qilish
            </Button>
            <Button variant="danger" onClick={revoke} disabled={busy}>
              {busy ? "..." : "Ha, bekor qilish"}
            </Button>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

// ------------------------------- Asosiy komponent ---------------------------

export function StudentsClient({
  stats,
  classes,
  linkStatuses,
}: {
  stats: StudentStat[];
  classes: string[];
  linkStatuses: Record<string, LinkStatusView>;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [issued, setIssued] = useState<{ name: string; url: string; qr: string | null } | null>(null);
  const [linksModal, setLinksModal] = useState(false);
  const [linksResult, setLinksResult] = useState<ClassLinksView | null>(null);
  const [version, setVersion] = useState(0);

  // Qidiruv + sinf filtri
  const [query, setQuery] = useState("");
  const [classFilter, setClassFilter] = useState<string>("all");

  const today = todayStr();
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stats.filter((s) => {
      if (classFilter !== "all" && s.student.class_name !== classFilter) return false;
      if (!q) return true;
      return (
        s.student.full_name.toLowerCase().includes(q) ||
        s.student.class_name.toLowerCase().includes(q)
      );
    });
  }, [stats, query, classFilter]);

  const birthdays = stats.filter((s) => isBirthdayToday(s.student.date_of_birth, today));

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(deleting.id);
        setDeleting(null);
        setVersion((v) => v + 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      }
    });
  }

  function refreshLinks() {
    setVersion((v) => v + 1);
    window.location.reload();
  }

  return (
    <>
      <datalist id="class-list">
        {classes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      {/* Yo'riqnoma: bolalarga havolani qanday yuborish */}
      <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/70 px-5 py-4">
        <p className="text-sm font-semibold text-indigo-900">
          <QrCode className="mr-1 inline h-4 w-4" /> Bolalarga o'yin linkini qanday yuboraman?
        </p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-700">
          <li>
            <b>Havola = bolaning akkaunti.</b> Parol yo'q — havolani ochishi bilan o'z o'yinlarini
            ko'radi. Har havola faqat <b>BITTA</b> bolaga tegishli, boshqa bola ma'lumoti ko'rinmaydi.
          </li>
          <li>
            <b>Bitta bolaga:</b> qatorni topib <b>«Link berish»</b> tugmasini bosing → ochilgan
            oynada havolani nusxalab <b>WhatsApp / Telegram</b> bilan ota-onasiga yuboring yoki QR ni skanerlating.
          </li>
          <li>
            <b>Butun sinfga bir yo'la:</b> <b>«Havolalarni chiqarish»</b> → sinf tanlanadi → har bola
            uchun QR kartochka → <b>Chop etish</b> bilan kesib tarqating yoki skanerlating.
          </li>
          <li>
            Havola yo'qolgan bo'lsa — qatordagi <b>«Yangilash»</b> eski linkni o'chirib yangisini beradi;
            <b> «Bekor»</b> esa umuman yopadi. Havolalar bazada faqat maxfiy xesh bo'lib saqlanadi.
          </li>
        </ol>
      </div>

      {birthdays.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-rose-50 px-5 py-4">
          <span className="rounded-full bg-amber-100 p-2 text-amber-600">
            <Cake className="h-5 w-5" />
          </span>
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Bugun tug'ilgan kuni:</span>{" "}
            {birthdays.map((b) => `${b.student.full_name} (${b.student.class_name})`).join(", ")} 🎉
          </p>
        </div>
      ) : null}

      <Card>
        <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">O'quvchilar ro'yxati</h3>
                <p className="text-xs text-slate-500">Jami {stats.length} nafar · ko'rinmoqda {filtered.length}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setLinksModal(true)}>
                <QrCode className="h-4 w-4" /> Havolalarni chiqarish
              </Button>
              <Button
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" /> Yangi o'quvchi
              </Button>
            </div>
          </div>

          {/* Qidiruv + sinf bo'yicha filtr — telefonda ham qulay */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ism yoki sinf bo'yicha qidirish..."
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none"
              aria-label="Sinf bo'yicha filtrlash"
            >
              <option value="all">Hamma sinflar</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {stats.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="O'quvchilar yo'q"
            description="Birinchi o'quvchini qo'shish uchun «Yangi o'quvchi» tugmasini bosing."
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="Mos o'quvchi topilmadi"
            description="Qidiruv yoki sinf filtrini o'zgartirib ko'ring."
          />
        ) : (
          <>
            {/* Desktop jadval */}
            <div className="thin-scroll hidden overflow-x-auto md:block" key={`t-${version}`}>
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3 font-medium">O'quvchi</th>
                    <th className="px-4 py-3 font-medium">Sinf</th>
                    <th className="px-4 py-3 font-medium">Tug'ilgan sana</th>
                    <th className="px-4 py-3 font-medium">Davomat (30 kun)</th>
                    <th className="px-4 py-3 font-medium">O'rtacha baho</th>
                    <th className="px-4 py-3 font-medium">Shaxsiy link</th>
                    <th className="px-4 py-3 text-right font-medium">Amallar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(({ student, attendance_rate, average_grade }) => {
                    const isBirthday = isBirthdayToday(student.date_of_birth, today);
                    return (
                      <tr key={student.id} className="hover:bg-slate-50/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={student.full_name} />
                            <div>
                              <p className="font-medium text-slate-900">{student.full_name}</p>
                              <p className="text-xs text-slate-500">{age(student.date_of_birth)} yosh</p>
                            </div>
                            {isBirthday ? (
                              <Badge className="border-amber-300 bg-amber-100 text-amber-800">
                                <Cake className="h-3 w-3" /> Bugun!
                              </Badge>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                            {student.class_name}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{formatDateUz(student.date_of_birth)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "font-medium",
                              attendance_rate == null
                                ? "text-slate-400"
                                : attendance_rate >= 90
                                  ? "text-emerald-600"
                                  : attendance_rate >= 75
                                    ? "text-amber-600"
                                    : "text-red-600"
                            )}
                          >
                            {pct(attendance_rate)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">{num(average_grade)}</td>
                        <td className="px-4 py-3">
                          <LinkActions
                            studentId={student.id}
                            studentName={student.full_name}
                            status={linkStatuses[student.id]}
                            onChanged={refreshLinks}
                            onIssued={setIssued}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              className="p-2"
                              title="Tahrirlash"
                              onClick={() => {
                                setEditing(student);
                                setModalOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                              title="O'chirish"
                              onClick={() => setDeleting(student)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Telefon kartalari — 360–390px uchun ham qulay */}
            <div className="divide-y divide-slate-100 md:hidden" key={`c-${version}`}>
              {filtered.map(({ student, attendance_rate, average_grade }) => (
                <div key={student.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar name={student.full_name} />
                      <div>
                        <p className="font-medium text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-500">
                          {student.class_name} · {age(student.date_of_birth)} yosh · {formatDateUz(student.date_of_birth)}
                        </p>
                        <p className="text-xs text-slate-400">
                          Davomat: {pct(attendance_rate)} · O'rtacha: {num(average_grade)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="p-2"
                        title="Tahrirlash"
                        onClick={() => {
                          setEditing(student);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="p-2 text-red-500"
                        title="O'chirish"
                        onClick={() => setDeleting(student)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <LinkActions
                      studentId={student.id}
                      studentName={student.full_name}
                      status={linkStatuses[student.id]}
                      onChanged={refreshLinks}
                      onIssued={setIssued}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish"}
        onClose={() => setModalOpen(false)}
      >
        <StudentForm
          key={editing?.id ?? "new"}
          student={editing ?? undefined}
          onDone={(link) => {
            setModalOpen(false);
            if (link) {
              setIssued({ name: editing?.full_name ?? "O'quvchi", url: link.url, qr: link.qr || null });
            }
          }}
        />
      </Modal>

      {issued ? (
        <LinkSuccessDialog
          studentName={issued.name}
          linkUrl={issued.url}
          qr={issued.qr}
          onClose={() => setIssued(null)}
        />
      ) : null}

      {linksModal ? (
        <ClassLinkIssueModal
          classes={classes}
          defaultClass={classFilter}
          onClose={() => setLinksModal(false)}
          onIssued={(res) => {
            setLinksModal(false);
            setLinksResult(res);
          }}
        />
      ) : null}

      {linksResult ? <ClassLinkCardsView result={linksResult} onClose={() => setLinksResult(null)} /> : null}

      <Modal open={deleting !== null} title="O'chirishni tasdiqlash" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{deleting?.full_name}</span> o'chirilsinmi? Unga
          bog'liq davomat, baholar, uyga ketish yozuvlari, ota-ona ma'lumotlari va shaxsiy link xeshi ham o'chadi.
        </p>
        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Bekor qilish
          </Button>
          <Button variant="danger" disabled={pending} onClick={handleDelete}>
            {pending ? "O'chirilmoqda..." : "Ha, o'chirish"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ------------------- Sinf uchun havola chiqarish (QR kartochkalar) ----------

function ClassLinkIssueModal({
  classes,
  defaultClass,
  onClose,
  onIssued,
}: {
  classes: string[];
  defaultClass: string;
  onClose: () => void;
  onIssued: (res: ClassLinksView) => void;
}) {
  const [cls, setCls] = useState(defaultClass !== "all" ? defaultClass : (classes[0] ?? ""));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    if (!cls) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await actionIssueClassLinks(cls);
        if (!res.ok) {
          setError(res.error ?? "Havolalarni chiqarib bo'lmadi.");
          return;
        }
        onIssued({
          className: res.className ?? cls,
          issued: res.issued ?? [],
          alreadyActive: res.alreadyActive ?? 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Havolalarni chiqarib bo'lmadi.");
      }
    });
  }

  return (
    <Modal open title="Sinf uchun havolalar chiqarish" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-xs leading-relaxed text-slate-500">
          Tanlangan sinfdagi <b>havolasi yo'q</b> hamma o'quvchiga shaxsiy o'yin havolasi beriladi
          (QR kartochka shaklida). Allaqachon faol havolasi bor o'quvchilarga <b>tegilmaydi</b> —
          ularning eski havolalari ishlashda qoladi.
        </p>
        <Field label="Sinf">
          <select
            value={cls}
            onChange={(e) => setCls(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-indigo-500 focus:outline-none"
            aria-label="Sinf tanlash"
          >
            {classes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        {error ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Bekor qilish
          </Button>
          <Button onClick={go} disabled={pending || !cls}>
            <QrCode className="h-4 w-4" /> {pending ? "Chiqarilmoqda..." : "Chiqarish"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const SHARE_BTN =
  "inline-flex h-9 min-w-[36px] items-center justify-center gap-1 rounded-md px-2 text-[11px] font-medium";

function ClassLinkCardsView({ result, onClose }: { result: ClassLinksView; onClose: () => void }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copy = async (id: string, url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 2500);
    } catch {
      window.prompt("Havolani qo'lda nusxalang:", url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      <div className="mx-auto w-full max-w-4xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            QR kartochkalar — {result.className}
          </h3>
          <div className="classlink-screen-only flex items-center gap-2">
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Chop etish
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Yopish
            </Button>
          </div>
        </div>

        <div className="classlink-screen-only space-y-3 px-5 pt-4">
          <p className="rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
            ⚠️ Bu havolalar <b>faqat HOZIR</b> ko'rinadi (bazada faqat maxfiy xesh saqlanadi).
            Nusxalash / WhatsApp / Telegram / chop etishni shu oynada bajaring. Keyinroq kerak
            bo'lsa — qatordagi «Yangilash» yangi havola beradi.
          </p>
          {result.alreadyActive > 0 ? (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              {result.alreadyActive} o'quvchida allaqachon faol havola bor — ularga tegilmadi
              (eski havolalari ishlashda qolgan).
            </p>
          ) : null}
          {result.issued.length === 0 ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-xs text-emerald-800">
              Bu sinfda havolasi yo'q o'quvchi yo'q — hammada faol havola bor.
            </p>
          ) : null}
        </div>

        {result.issued.length > 0 ? (
          <div className="classlink-print-area grid grid-cols-2 gap-4 p-5 sm:grid-cols-3">
            {result.issued.map((c) => (
              <div
                key={c.studentId}
                className="classlink-print-card rounded-xl border border-slate-200 p-3 text-center"
              >
                <p className="truncate text-sm font-bold text-slate-900">{c.fullName}</p>
                <p className="text-[11px] text-slate-500">{result.className} · o'yin portali</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.qr} alt={`${c.fullName} — o'yin havolasi QR`} className="mx-auto my-2 h-36 w-36" />
                <div className="classlink-screen-only flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => copy(c.studentId, c.url)}
                    className={`${SHARE_BTN} border border-indigo-200 bg-white text-indigo-700 hover:bg-indigo-50`}
                    title="Havolani nusxalash"
                  >
                    {copiedId === c.studentId ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedId === c.studentId ? "Nusxalandi" : "Nusxa"}
                  </button>
                  <a
                    href={waHref(c.url)}
                    target="_blank"
                    rel="noreferrer"
                    className={`${SHARE_BTN} bg-emerald-600 text-white hover:bg-emerald-700`}
                    title="WhatsApp'da yuborish"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WA
                  </a>
                  <a
                    href={tgHref(c.url)}
                    target="_blank"
                    rel="noreferrer"
                    className={`${SHARE_BTN} bg-sky-500 text-white hover:bg-sky-600`}
                    title="Telegramda yuborish"
                  >
                    <Send className="h-3.5 w-3.5" /> TG
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        <p className="classlink-screen-only border-t border-slate-100 px-5 py-3 text-[11px] text-slate-500">
          Kartochkalarni chop etib kesing — har bolaga O'Z kartochkasi. Havola ism/telefonsiz:
          taxmin qilib topib bo'lmaydi. Yo'qolgan bo'lsa ro'yxatda «Yangilash» bosing.
        </p>
      </div>
    </div>
  );
}
