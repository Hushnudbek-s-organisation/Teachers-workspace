"use client";

// ============================================================================
// O'qituvchilar — Teachers CRUD (Task 2)
// Full name + phone (+ subject shown in the schedule).
// ============================================================================

import { useState, useTransition } from "react";
import { BookOpen, GraduationCap, Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { deleteTeacher, saveTeacher } from "@/app/actions";
import type { ScheduleItem, Teacher } from "@/lib/types";
import { initials } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, Modal } from "@/components/ui";

function TeacherForm({ teacher, onDone }: { teacher?: Teacher; onDone: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        const res = await saveTeacher(fd);
        if (res && res.ok === false) {
          setError(res.error + (res.hint ? " " + res.hint : ""));
          return;
        }
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {teacher ? <input type="hidden" name="id" value={teacher.id} /> : null}
      <Field label="F.I.Sh *">
        <Input name="full_name" required defaultValue={teacher?.full_name} placeholder="Masalan: Dilshod Rahimov" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Telefon *">
          <Input name="phone" required defaultValue={teacher?.phone} placeholder="+998 90 123-45-67" />
        </Field>
        <Field label="Fan">
          <Input name="subject" defaultValue={teacher?.subject} placeholder="Matematika" />
        </Field>
      </div>
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

export function TeachersClient({
  teachers,
  schedules,
}: {
  teachers: Teacher[];
  schedules: ScheduleItem[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const lessonCount = new Map<string, number>();
  for (const s of schedules) {
    lessonCount.set(s.teacher_id, (lessonCount.get(s.teacher_id) ?? 0) + 1);
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      try {
        const res = await deleteTeacher(deleting.id);
        if (res && res.ok === false) {
          setError(res.error + (res.hint ? " " + res.hint : ""));
          return;
        }
        setDeleting(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      }
    });
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <GraduationCap className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">O'qituvchilar ro'yxati</h3>
              <p className="text-xs text-slate-500">Jami {teachers.length} nafar</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yangi o'qituvchi
          </Button>
        </div>

        {teachers.length === 0 ? (
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title="O'qituvchilar yo'q"
            description="Birinchi o'qituvchini qo'shish uchun «Yangi o'qituvchi» tugmasini bosing."
          />
        ) : (
          <div className="thin-scroll overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3 font-medium">O'qituvchi</th>
                  <th className="px-4 py-3 font-medium">Fan</th>
                  <th className="px-4 py-3 font-medium">Telefon</th>
                  <th className="px-4 py-3 font-medium">Darslar (jadvalda)</th>
                  <th className="px-4 py-3 text-right font-medium">Amallar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/60">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                          {initials(teacher.full_name)}
                        </div>
                        <p className="font-medium text-slate-900">{teacher.full_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {teacher.subject ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <BookOpen className="h-3 w-3" /> {teacher.subject}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {teacher.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lessonCount.get(teacher.id) ?? 0} ta dars</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          className="p-2"
                          title="Tahrirlash"
                          onClick={() => {
                            setEditing(teacher);
                            setModalOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          className="p-2 text-red-500 hover:bg-red-50 hover:text-red-600"
                          title="O'chirish"
                          onClick={() => setDeleting(teacher)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "O'qituvchini tahrirlash" : "Yangi o'qituvchi qo'shish"}
        onClose={() => setModalOpen(false)}
      >
        <TeacherForm key={editing?.id ?? "new"} teacher={editing ?? undefined} onDone={() => setModalOpen(false)} />
      </Modal>

      <Modal open={deleting !== null} title="O'chirishni tasdiqlash" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{deleting?.full_name}</span> o'chirilsinmi? Unga
          bog'liq dars jadvali yozuvlari ham o'chadi.
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
