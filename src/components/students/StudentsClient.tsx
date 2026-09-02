"use client";

// ============================================================================
// O'quvchilar — Students CRUD (Task 2)
// Table + add/edit modal + delete confirmation + today's-birthday indicator.
// ============================================================================

import { useState, useTransition } from "react";
import { Cake, Pencil, Plus, Trash2, Users } from "lucide-react";
import { deleteStudent, saveStudent } from "@/app/actions";
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

function StudentForm({ student, onDone }: { student?: Student; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await saveStudent(fd);
        onDone();
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
          <Input name="class_name" required list="class-list" defaultValue={student?.class_name} placeholder="6-A" />
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
        <Button type="button" variant="secondary" onClick={onDone}>
          Bekor qilish
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saqlanmoqda..." : "Saqlash"}
        </Button>
      </div>
    </form>
  );
}

export function StudentsClient({
  stats,
  classes,
}: {
  stats: StudentStat[];
  classes: string[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const today = todayStr();

  const birthdays = stats.filter((s) => isBirthdayToday(s.student.date_of_birth, today));

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteStudent(deleting.id);
        setDeleting(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      }
    });
  }

  return (
    <>
      <datalist id="class-list">
        {classes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

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
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">O'quvchilar ro'yxati</h3>
              <p className="text-xs text-slate-500">Jami {stats.length} nafar</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yangi o'quvchi
          </Button>
        </div>

        {stats.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title="O'quvchilar yo'q"
            description="Birinchi o'quvchini qo'shish uchun «Yangi o'quvchi» tugmasini bosing."
          />
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">O'quvchi</th>
                  <th className="px-4 py-3 font-medium">Sinf</th>
                  <th className="px-4 py-3 font-medium">Tug'ilgan sana</th>
                  <th className="px-4 py-3 font-medium">Davomat (30 kun)</th>
                  <th className="px-4 py-3 font-medium">O'rtacha baho</th>
                  <th className="px-4 py-3 text-right font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.map(({ student, attendance_rate, average_grade }) => {
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
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "O'quvchini tahrirlash" : "Yangi o'quvchi qo'shish"}
        onClose={() => setModalOpen(false)}
      >
        <StudentForm key={editing?.id ?? "new"} student={editing ?? undefined} onDone={() => setModalOpen(false)} />
      </Modal>

      <Modal open={deleting !== null} title="O'chirishni tasdiqlash" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{deleting?.full_name}</span> o'chirilsinmi? Unga
          bog'liq davomat, baholar, uyga ketish yozuvlari va ota-ona ma'lumotlari ham o'chadi.
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
