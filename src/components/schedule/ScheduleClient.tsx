"use client";

// ============================================================================
// Dars jadvali — Class schedule CRUD (Task 2)
// Weekly grid grouped by weekday; each lesson shows subject, teacher and time.
// ============================================================================

import { useState, useTransition } from "react";
import { CalendarDays, Clock, DoorOpen, Pencil, Plus, Trash2, User } from "lucide-react";
import { deleteSchedule, saveSchedule } from "@/app/actions";
import type { ScheduleItem, Teacher } from "@/lib/types";
import { DAY_NAMES } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, Modal, Select } from "@/components/ui";

function ScheduleForm({
  item,
  teachers,
  classes,
  onDone,
}: {
  item?: ScheduleItem;
  teachers: Teacher[];
  classes: string[];
  onDone: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await saveSchedule(fd);
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Sinf *">
          <Input name="class_name" required list="schedule-classes" defaultValue={item?.class_name} placeholder="6-A" />
        </Field>
        <Field label="Fan *">
          <Input name="subject" required defaultValue={item?.subject} placeholder="Matematika" />
        </Field>
      </div>
      <Field label="O'qituvchi *">
        <Select name="teacher_id" required defaultValue={item?.teacher_id ?? ""}>
          <option value="" disabled>
            Tanlang...
          </option>
          {teachers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.full_name} {t.subject ? `— ${t.subject}` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Kun *">
          <Select name="day_of_week" required defaultValue={item?.day_of_week ?? 1}>
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i + 1}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Xona">
          <Input name="room" defaultValue={item?.room ?? ""} placeholder="201-xona" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Boshlanish *">
          <Input type="time" name="start_time" required defaultValue={item?.start_time ?? "08:00"} />
        </Field>
        <Field label="Tugash *">
          <Input type="time" name="end_time" required defaultValue={item?.end_time ?? "08:45"} />
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

export function ScheduleClient({
  schedules,
  teachers,
  classes,
}: {
  schedules: ScheduleItem[];
  teachers: Teacher[];
  classes: string[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduleItem | null>(null);
  const [deleting, setDeleting] = useState<ScheduleItem | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const teacherById = new Map(teachers.map((t) => [t.id, t]));
  const activeClass = classes[0] ?? "";
  const [selectedClass, setSelectedClass] = useState(activeClass);

  const byDay = new Map<number, ScheduleItem[]>();
  for (const item of schedules) {
    if (item.class_name !== selectedClass) continue;
    const arr = byDay.get(item.day_of_week) ?? [];
    arr.push(item);
    byDay.set(item.day_of_week, arr);
  }

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteSchedule(deleting.id);
        setDeleting(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "O'chirishda xatolik");
      }
    });
  }

  return (
    <>
      <datalist id="schedule-classes">
        {classes.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Haftalik dars jadvali</h3>
              <p className="text-xs text-slate-500">{selectedClass} sinfi</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              {classes.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedClass(c)}
                  className={
                    "px-3 py-1.5 text-xs font-medium transition-colors " +
                    (c === selectedClass
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 hover:bg-slate-50")
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <Button
              onClick={() => {
                setEditing(null);
                setModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Yangi dars
            </Button>
          </div>
        </div>

        {schedules.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-6 w-6" />}
            title="Dars jadvali bo'sh"
            description="Dars qo'shish uchun «Yangi dars» tugmasini bosing."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {DAY_NAMES.map((day, i) => {
              const items = (byDay.get(i + 1) ?? []).sort((a, b) => a.start_time.localeCompare(b.start_time));
              return (
                <div key={day} className="rounded-xl border border-slate-200 bg-slate-50/40">
                  <div className="border-b border-slate-200 px-4 py-2.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{day}</p>
                  </div>
                  {items.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-400">Dars yo'q</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {items.map((item) => {
                        const teacher = teacherById.get(item.teacher_id);
                        return (
                          <li key={item.id} className="group flex items-center justify-between gap-2 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{item.subject}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {item.start_time}–{item.end_time}
                                </span>
                                {teacher ? (
                                  <span className="inline-flex items-center gap-1">
                                    <User className="h-3 w-3" /> {teacher.full_name}
                                  </span>
                                ) : null}
                                {item.room ? (
                                  <span className="inline-flex items-center gap-1">
                                    <DoorOpen className="h-3 w-3" /> {item.room}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="ghost"
                                className="p-1.5"
                                title="Tahrirlash"
                                onClick={() => {
                                  setEditing(item);
                                  setModalOpen(true);
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                                title="O'chirish"
                                onClick={() => setDeleting(item)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "Darsni tahrirlash" : "Yangi dars qo'shish"}
        onClose={() => setModalOpen(false)}
      >
        <ScheduleForm
          key={editing?.id ?? "new"}
          item={editing ?? undefined}
          teachers={teachers}
          classes={classes}
          onDone={() => setModalOpen(false)}
        />
      </Modal>

      <Modal open={deleting !== null} title="O'chirishni tasdiqlash" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">
            {deleting?.subject} ({deleting?.start_time}–{deleting?.end_time})
          </span>{" "}
          darsi o'chirilsinmi?
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
