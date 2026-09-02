"use client";

// ============================================================================
// Ota-onalar — Parents CRUD (Task 2)
// Contract details + home address, linked to a student.
// ============================================================================

import { useState, useTransition } from "react";
import { FileText, Home, Pencil, Phone, Plus, Trash2, UserRound } from "lucide-react";
import { deleteParent, saveParent } from "@/app/actions";
import type { Parent, Student } from "@/lib/types";
import { formatDateUz, initials } from "@/lib/utils";
import { Button, Card, EmptyState, Field, Input, Modal, Select } from "@/components/ui";

function ParentForm({
  parent,
  students,
  onDone,
}: {
  parent?: Parent;
  students: Student[];
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
        await saveParent(fd);
        onDone();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Saqlashda xatolik yuz berdi");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {parent ? <input type="hidden" name="id" value={parent.id} /> : null}
      <Field label="F.I.Sh *">
        <Input name="full_name" required defaultValue={parent?.full_name} placeholder="Masalan: Karim Ismoilov" />
      </Field>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Telefon">
          <Input name="phone" defaultValue={parent?.phone ?? ""} placeholder="+998 90 111-22-33" />
        </Field>
        <Field label="O'quvchi">
          <Select name="student_id" defaultValue={parent?.student_id ?? ""}>
            <option value="">— bog'lanmagan —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name} ({s.class_name})
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Shartnoma raqami">
          <Input name="contract_number" defaultValue={parent?.contract_number ?? ""} placeholder="SH-2026-001" />
        </Field>
        <Field label="Shartnoma sanasi">
          <Input type="date" name="contract_date" defaultValue={parent?.contract_date ?? ""} />
        </Field>
      </div>
      <Field label="Uy manzili">
        <Input name="home_address" defaultValue={parent?.home_address ?? ""} placeholder="Toshkent sh., Chilonzor 9-kvartal, 14-uy" />
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

export function ParentsClient({ parents, students }: { parents: Parent[]; students: Student[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Parent | null>(null);
  const [deleting, setDeleting] = useState<Parent | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const studentById = new Map(students.map((s) => [s.id, s]));

  function handleDelete() {
    if (!deleting) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteParent(deleting.id);
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
              <UserRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Ota-onalar ro'yxati</h3>
              <p className="text-xs text-slate-500">Jami {parents.length} ta yozuv</p>
            </div>
          </div>
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Yangi ota-ona
          </Button>
        </div>

        {parents.length === 0 ? (
          <EmptyState
            icon={<UserRound className="h-6 w-6" />}
            title="Ota-onalar yo'q"
            description="Ota-ona ma'lumotlarini qo'shish uchun «Yangi ota-ona» tugmasini bosing."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-2 xl:grid-cols-3">
            {parents.map((parent) => {
              const student = parent.student_id ? studentById.get(parent.student_id) : undefined;
              return (
                <div
                  key={parent.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                        {initials(parent.full_name)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{parent.full_name}</p>
                        {student ? (
                          <p className="text-xs text-slate-500">
                            {student.full_name} ({student.class_name}) ota-onasi
                          </p>
                        ) : (
                          <p className="text-xs text-slate-400">O'quvchi bog'lanmagan</p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        className="p-1.5"
                        title="Tahrirlash"
                        onClick={() => {
                          setEditing(parent);
                          setModalOpen(true);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600"
                        title="O'chirish"
                        onClick={() => setDeleting(parent)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {parent.phone ? (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-slate-400" /> {parent.phone}
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                      {parent.contract_number
                        ? `Shartnoma: ${parent.contract_number}${parent.contract_date ? ` (${formatDateUz(parent.contract_date)})` : ""}`
                        : "Shartnoma mavjud emas"}
                    </p>
                    <p className="flex items-start gap-1.5">
                      <Home className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                      {parent.home_address || "Manzil kiritilmagan"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Modal
        open={modalOpen}
        title={editing ? "Ota-onani tahrirlash" : "Yangi ota-ona qo'shish"}
        onClose={() => setModalOpen(false)}
      >
        <ParentForm
          key={editing?.id ?? "new"}
          parent={editing ?? undefined}
          students={students}
          onDone={() => setModalOpen(false)}
        />
      </Modal>

      <Modal open={deleting !== null} title="O'chirishni tasdiqlash" onClose={() => setDeleting(null)}>
        <p className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{deleting?.full_name}</span> o'chirilsinmi?
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
