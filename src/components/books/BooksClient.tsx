"use client";

// ============================================================================
// Kitoblar bo'limi: yuklash paneli + kitoblar ro'yxati
// ============================================================================

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileText,
  Gamepad2,
  Layers,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECT_LIST, SUBJECTS, guessSubject, type BookMeta, type SubjectKey } from "@/lib/books/types";
import { extractPdfPages, type ExtractProgress } from "@/lib/books/pdf-client";
import {
  actionAppendPages,
  actionCreateFromText,
  actionDeleteBook,
  actionFinishUpload,
  actionStartUpload,
} from "@/app/books/actions";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import {
  DEFAULT_GRADE,
  DEFAULT_SUBJECT,
  GRADES,
  TEXT_PAGE_CHARS,
  UPLOAD_BATCH_PAGES,
  normalizeGrade,
} from "@/lib/config";

type JobStatus = "waiting" | "reading" | "uploading" | "analyzing" | "done" | "error";

interface Job {
  id: string;
  fileName: string;
  sizeBytes: number;
  title: string;
  subject: SubjectKey;
  grade: number;
  status: JobStatus;
  progress: string;
  percent: number;
  result?: { bookId: string; topics: number; games: number; strategy: string };
  error?: string;
}


export function BooksClient({ books }: { books: BookMeta[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<SubjectKey | "all">("all");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [dragging, setDragging] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteTitle, setPasteTitle] = useState("");
  const [pasteSubject, setPasteSubject] = useState<SubjectKey>(DEFAULT_SUBJECT);
  const [pasteGrade, setPasteGrade] = useState(DEFAULT_GRADE);
  const [uploadGrade, setUploadGrade] = useState(DEFAULT_GRADE);
  const [pasteText, setPasteText] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(
    () => (filter === "all" ? books : books.filter((b) => b.subject === filter)),
    [books, filter]
  );

  const totals = useMemo(
    () => ({
      books: books.length,
      topics: books.reduce((s, b) => s + b.stats.topics, 0),
      games: books.reduce((s, b) => s + b.stats.games, 0),
      items: books.reduce((s, b) => s + b.stats.items, 0),
    }),
    [books]
  );

  const updateJob = (id: string, patch: Partial<Job>) =>
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, ...patch } : j)));

  const addFiles = (files: FileList | File[]) => {
    const list = Array.from(files).filter((f) => /\.(pdf|txt|md)$/i.test(f.name));
    if (!list.length) return;
    const newJobs: Job[] = list.map((f, i) => {
      const title = f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
      return {
        id: `job-${Date.now()}-${i}`,
        fileName: f.name,
        sizeBytes: f.size,
        title,
        subject: guessSubject(f.name),
        grade: uploadGrade,
        status: "waiting",
        progress: "Navbatda",
        percent: 0,
      };
    });
    setJobs((prev) => [...newJobs, ...prev]);
    void runJobs(newJobs, list);
  };

  const runJobs = async (newJobs: Job[], files: File[]) => {
    for (let i = 0; i < newJobs.length; i++) {
      const job = newJobs[i];
      const file = files[i];
      try {
        let pages: { page: number; text: string }[] = [];
        let kind: "pdf" | "matn" = "pdf";
        let title = job.title;

        if (/\.pdf$/i.test(file.name)) {
          updateJob(job.id, { status: "reading", progress: "PDF o'qilmoqda…", percent: 2 });
          const result = await extractPdfPages(file, (p: ExtractProgress) => {
            updateJob(job.id, {
              status: "reading",
              progress: `Sahifa ${p.page}/${p.total} o'qildi · ${Math.round(p.chars / 1000)} ming belgi`,
              percent: Math.round((p.page / p.total) * 55),
            });
          });
          pages = result.pages.filter((p) => p.text.trim().length > 0);
          if (!pages.length) throw new Error("PDF'dan matn topilmadi (skanerlangan rasm bo'lishi mumkin).");
          if (result.title && result.title.length > 3 && title.length < 6) {
            title = result.title;
            updateJob(job.id, { title });
          }
        } else {
          kind = "matn";
          const text = await file.text();
          for (let c = 0, page = 1; c < text.length; c += TEXT_PAGE_CHARS, page++) {
            const chunk = text.slice(c, c + TEXT_PAGE_CHARS);
            if (chunk.trim()) pages.push({ page, text: chunk });
          }
          if (!pages.length) throw new Error("Fayl bo'sh.");
        }

        updateJob(job.id, { status: "uploading", progress: "Serverga yuborilmoqda…", percent: 58 });
        const started = await actionStartUpload({
          title,
          grade: job.grade,
          subject: job.subject,
          fileName: job.fileName,
          sizeBytes: job.sizeBytes,
          kind,
        });
        if (started.ok === false) throw new Error(started.error + (started.hint ? " " + started.hint : ""));
        const uploadId = started.data.uploadId;

        for (let p = 0; p < pages.length; p += UPLOAD_BATCH_PAGES) {
          const batch = pages.slice(p, p + UPLOAD_BATCH_PAGES);
          const appended = await actionAppendPages(uploadId, batch);
          if (appended.ok === false) {
            throw new Error(appended.error + (appended.hint ? " " + appended.hint : ""));
          }
          const percent = 58 + Math.round(((p + batch.length) / pages.length) * 27);
          updateJob(job.id, {
            status: "uploading",
            progress: `${Math.min(p + batch.length, pages.length)}/${pages.length} sahifa yuborildi`,
            percent,
          });
        }

        updateJob(job.id, { status: "analyzing", progress: "Mavzular va o'yinlar yasalmoqda…", percent: 88 });
        const res = await actionFinishUpload(uploadId);
        if (res.ok === false) throw new Error(res.error + (res.hint ? " " + res.hint : ""));
        updateJob(job.id, {
          status: "done",
          percent: 100,
          progress: `${res.data.topics} mavzu · ${res.data.games} o'yin tayyor`,
          result: {
            bookId: res.data.bookId,
            topics: res.data.topics,
            games: res.data.games,
            strategy: res.data.strategy,
          },
        });
        router.refresh();
      } catch (e) {
        updateJob(job.id, {
          status: "error",
          percent: 100,
          error: e instanceof Error ? e.message : "Noma'lum xato",
        });
      }
    }
  };

  const createFromText = async () => {
    setPasteError(null);
    if (pasteText.trim().length < 200) {
      setPasteError("Matn juda qisqa — kamida 200 ta belgi kiriting (shunda mavzular va o'yinlar yasaladi).");
      return;
    }
    setPasting(true);
    try {
      const res = await actionCreateFromText({
        title: pasteTitle.trim() || "Qo'lda kiritilgan kitob",
        grade: pasteGrade,
        subject: pasteSubject,
        text: pasteText,
      });
      if (res.ok === false) {
        setPasteError(res.error + (res.hint ? " " + res.hint : ""));
        return;
      }
      setPasteText("");
      setPasteTitle("");
      setShowPaste(false);
      router.push(`/books/${res.data.bookId}`);
    } catch (e) {
      setPasteError(e instanceof Error ? e.message : "Kitob yasashda xato yuz berdi.");
    } finally {
      setPasting(false);
    }
  };

  const remove = async (id: string) => {
    setListError(null);
    try {
      const res = await actionDeleteBook(id);
      if (res && res.ok === false) {
        setListError(res.error + (res.hint ? " " + res.hint : ""));
        return;
      }
      router.refresh();
    } catch (e) {
      setListError(e instanceof Error ? e.message : "O'chirishda xatolik");
    }
  };

  return (
    <div className="space-y-6">
      {/* ------------------------------- Statistika ------------------------------ */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={<BookOpen className="h-4 w-4" />} label="Kitoblar" value={totals.books} />
        <StatCard icon={<Layers className="h-4 w-4" />} label="Mavzular" value={totals.topics} />
        <StatCard icon={<Gamepad2 className="h-4 w-4" />} label="O'yinlar" value={totals.games} />
        <StatCard icon={<Sparkles className="h-4 w-4" />} label="Savollar" value={totals.items} />
      </div>

      {/* -------------------------------- Yuklash -------------------------------- */}
      <Card className="overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Upload className="h-4 w-4 text-indigo-600" /> Kitob yuklash (PDF yoki matn)
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Darslik PDF'ini tashlang — tizim uni <b>mavzularga bo'ladi</b> va har bir mavzudagi misol,
            qoida va matnlardan <b>o'yinlar yasaydi</b>. 200 betli kitob ham muammo emas: PDF brauzeringizda
            o'qiladi, serverga faqat matn yuboriladi.
          </p>
        </div>

        <div className="p-5">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              Sinf:
              <Select
                value={uploadGrade}
                onChange={(e) => setUploadGrade(normalizeGrade(e.target.value))}
                className="w-28 py-1.5"
              >
                {GRADES.map((g) => (
                  <option key={g} value={g}>
                    {g}-sinf
                  </option>
                ))}
              </Select>
            </label>
            <span className="text-xs text-slate-400">
              Fan nomi fayl nomidan aniqlanadi (masalan: «3-sinf matematika.pdf»)
            </span>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors",
              dragging ? "border-indigo-400 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:border-indigo-300"
            )}
          >
            <div className="rounded-full bg-white p-3 shadow-sm">
              <Upload className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Fayllarni bu yerga tashlang</p>
            <p className="text-xs text-slate-500">
              Bir nechta kitobni birdan yuklashingiz mumkin · PDF, TXT · har biri 200+ bet bo'lishi mumkin
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.md"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) addFiles(files);
                // Bir xil faylni qayta tanlash ham ishlashi uchun tozalaymiz
                e.target.value = "";
              }}
            />
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={() => setShowPaste((v) => !v)}
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              {showPaste ? "− Matn joylashni yopish" : "+ Skanerlangan kitob? Matnni qo'lda joylang"}
            </button>
          </div>

          {showPaste ? (
            <div className="mt-3 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Kitob nomi">
                  <Input
                    value={pasteTitle}
                    onChange={(e) => setPasteTitle(e.target.value)}
                    placeholder="Masalan: Matematika 3-sinf"
                  />
                </Field>
                <Field label="Fan">
                  <Select value={pasteSubject} onChange={(e) => setPasteSubject(e.target.value as SubjectKey)}>
                    {SUBJECT_LIST.map((s) => (
                      <option key={s.key} value={s.key}>
                        {s.emoji} {s.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Sinf">
                  <Select value={pasteGrade} onChange={(e) => setPasteGrade(normalizeGrade(e.target.value))}>
                    {GRADES.map((g) => (
                      <option key={g} value={g}>
                        {g}-sinf
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <Field label="Kitob matni" hint="Mavzu sarlavhalarini alohida qatorga yozsangiz, tizim ularni aniq ajratadi.">
                <Textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  className="min-h-[140px] font-mono text-xs"
                  placeholder={"1-MAVZU. Sonlarni qo'shish\nMisol: 24 + 38 = 62\nQoida: ..."}
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={createFromText} disabled={pasting || pasteText.trim().length < 200}>
                  {pasting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                  Matndan kitob yasash
                </Button>
                <span className="text-xs text-slate-400">
                  {pasteText.trim().length < 200
                    ? `${pasteText.trim().length}/200 belgi — kamida 200 belgi kerak`
                    : `${pasteText.trim().length} belgi tayyor`}
                </span>
              </div>
              {pasteError ? <p className="text-xs text-red-600">{pasteError}</p> : null}
            </div>
          ) : null}

          {/* Yuklash jarayoni */}
          {jobs.length ? (
            <div className="mt-4 space-y-2">
              {jobs.map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{job.fileName}</span>
                    <Badge className={SUBJECTS[job.subject].badge}>
                      {SUBJECTS[job.subject].emoji} {SUBJECTS[job.subject].label}
                    </Badge>
                    <span className="text-xs text-slate-400">{job.grade}-sinf</span>
                    {job.status === "done" ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Tayyor ✓</Badge>
                    ) : job.status === "error" ? (
                      <Badge className="border-red-200 bg-red-50 text-red-700">Xato</Badge>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                    )}
                  </div>

                  {job.status !== "done" && job.status !== "error" ? (
                    <div className="mt-2">
                      <div className="mb-1 flex justify-between text-xs text-slate-500">
                        <span>{job.progress}</span>
                        <span>{job.percent}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${job.percent}%` }}
                        />
                      </div>
                    </div>
                  ) : null}

                  {job.status === "done" && job.result ? (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-600">
                        {job.result.topics} mavzu · {job.result.games} o'yin · usul:{" "}
                        {job.result.strategy === "toc"
                          ? "mundarija bo'yicha"
                          : job.result.strategy === "heading"
                            ? "sarlavhalar bo'yicha"
                            : "sahifalar bo'yicha"}
                      </span>
                      <Link href={`/books/${job.result.bookId}`}>
                        <Button variant="success" className="px-2 py-1 text-xs">
                          <Gamepad2 className="h-3.5 w-3.5" /> O'yinlarni ochish
                        </Button>
                      </Link>
                    </div>
                  ) : null}

                  {job.error ? <p className="mt-1 text-xs text-red-600">{job.error}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      {/* ------------------------------ Kitoblar ro'yxati ------------------------ */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Barchasi ({books.length})
          </FilterChip>
          {SUBJECT_LIST.map((s) => {
            const count = books.filter((b) => b.subject === s.key).length;
            if (!count) return null;
            return (
              <FilterChip key={s.key} active={filter === s.key} onClick={() => setFilter(s.key)}>
                {s.emoji} {s.label} ({count})
              </FilterChip>
            );
          })}
        </div>

        {listError ? (
          <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{listError}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((b) => (
            <BookCard key={b.id} book={b} onDelete={() => remove(b.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BookCard({ book, onDelete }: { book: BookMeta; onDelete: () => void }) {
  const meta = SUBJECTS[book.subject];
  const [confirming, setConfirming] = useState(false);

  return (
    <Card className="flex flex-col overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn("bg-gradient-to-r px-4 py-3 text-white", meta.gradient)}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{book.title}</p>
            <p className="text-xs text-white/80">
              {book.grade}-sinf · {book.stats.pages} bet · {book.source.kind === "pdf" ? "PDF" : "matn"}
            </p>
          </div>
          <span className="text-2xl">{meta.emoji}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge className="border-slate-200 bg-slate-50 text-slate-600">
            <Layers className="h-3 w-3" /> {book.stats.topics} mavzu
          </Badge>
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <Gamepad2 className="h-3 w-3" /> {book.stats.games} o'yin
          </Badge>
          <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
            <Sparkles className="h-3 w-3" /> {book.stats.items} savol
          </Badge>
        </div>

        <ul className="space-y-1 text-xs text-slate-500">
          {book.topicTitles.slice(0, 3).map((t, i) => (
            <li key={i} className="truncate">
              {i + 1}. {t}
            </li>
          ))}
          {book.stats.topics > 3 ? <li className="text-slate-400">… yana {book.stats.topics - 3} ta mavzu</li> : null}
        </ul>

        <div className="mt-auto flex items-center gap-2 pt-1">
          <Link href={`/books/${book.id}`} className="flex-1">
            <Button className="w-full">
              <Gamepad2 className="h-4 w-4" /> O'yinlarni ko'rish
            </Button>
          </Link>
          {confirming ? (
              <div className="flex gap-1">
                <Button variant="danger" className="px-2 py-1 text-xs" onClick={onDelete}>
                  O'chirish
                </Button>
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setConfirming(false)}>
                  Yo'q
                </Button>
              </div>
            ) : (
              <Button variant="ghost" onClick={() => setConfirming(true)} title="Kitobni o'chirish">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
        </div>
      </div>
    </Card>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
      )}
    >
      {children}
    </button>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="flex items-center gap-3 px-4 py-3">
      <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600">{icon}</div>
      <div>
        <p className="text-lg font-bold leading-none text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </Card>
  );
}