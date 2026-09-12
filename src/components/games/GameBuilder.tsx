"use client";

// ============================================================================
// O'QITUVCHI O'YIN YASASH MUHARRIRI
//
// O'qituvchi o'z so'zlari, misollari, savollari bilan istalgan turdagi o'yinni
// yasay oladi. Ikki usul:
//   1. Tez usul   — qatorlarga yozib tashlash ("kitob — book"), tizim tahlil qiladi
//   2. Jadval     — har bir savol/juftlikni alohida kiritish
// ============================================================================

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Table2,
  Trash2,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  GAME_TYPES,
  SUBJECT_LIST,
  type BookMeta,
  type GameItem,
  type GameType,
  type SubjectKey,
} from "@/lib/books/types";
import { Badge, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import { actionSaveCustomGame, type SaveCustomInput } from "@/app/games/actions";
import { normalizeItems, parseCustomItems } from "@/lib/books/custom-parse";

interface Props {
  books: { id: string; title: string; topics: { id: string; title: string }[] }[];
  /** Tahrirlash rejimi */
  initial?: {
    id: string;
    title: string;
    type: GameType;
    subject: SubjectKey;
    grade: number;
    instructions?: string;
    note?: string;
    items: GameItem[];
    groups?: string[];
  };
}

type Mode = "quick" | "table";

/** O'yin turini tanlash uchun guruhlar */
const BUILDER_GROUPS: { label: string; types: GameType[] }[] = [
  { label: "Savol-javob", types: ["quiz", "truefalse", "findmistake", "fill", "missingletter"] },
  { label: "Juftlash va yig'ish", types: ["matching", "memory", "puzzle", "grouping", "order"] },
  { label: "Hisoblash va sinf", types: ["math", "pop", "bingo"] },
];

export function GameBuilder({ books, initial }: Props) {
  const router = useRouter();
  const editing = !!initial;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [type, setType] = useState<GameType>(initial?.type ?? "matching");
  const [subject, setSubject] = useState<SubjectKey>(initial?.subject ?? "ona-tili");
  const [grade, setGrade] = useState(initial?.grade ?? 3);
  const [instructions, setInstructions] = useState(initial?.instructions ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [groupsRaw, setGroupsRaw] = useState((initial?.groups ?? []).join("\n"));
  const [raw, setRaw] = useState(() => (initial ? itemsToRaw(initial.items, initial.type) : ""));
  const [items, setItems] = useState<GameItem[]>(initial?.items ?? []);
  const [problems, setProblems] = useState<string[]>([]);
  const [mode, setMode] = useState<Mode>("quick");
  const [busy, setBusy] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [bookId, setBookId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [error, setError] = useState<string | null>(null);

  /** Matnni darhol (brauzerda) tahlil qilish — server kutmasdan */
  const analyze = (text: string, gameType: GameType) => {
    const parsed = parseCustomItems(text, gameType);
    const normalized = normalizeItems(parsed.items, gameType);
    setItems(normalized);
    setProblems(parsed.problems);
    return normalized;
  };

  // Matn o'zgarganda avtomatik tahlil (debounce)
  useEffect(() => {
    if (!raw.trim()) return;
    const t = setTimeout(() => analyze(raw, type), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, type]);

  const preview = async () => {
    setPreviewing(true);
    setError(null);
    try {
      const items = analyze(raw, type);
      if (!items.length) {
        setError(
          `Qatorlardan hech narsa o'qilmadi. Namunadagi ko'rinishga qarab yozing:\n${formatSample(type)}`
        );
      }
    } finally {
      setPreviewing(false);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const payload: SaveCustomInput = {
        title: title || "Mening o'yinim",
        type,
        subject,
        grade,
        instructions,
        groups: groupsRaw
          .split(/[\n,]+/)
          .map((g) => g.trim())
          .filter(Boolean),
        raw,
        items,
        note,
        bookId: bookId || undefined,
        topicId: topicId || undefined,
      };
      const res = await actionSaveCustomGame(payload);
      setSaved(res.id);
      router.push(`/games/${res.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Saqlashda xato");
    } finally {
      setBusy(false);
    }
  };

  const selectedType = GAME_TYPES[type];
  const selectedBook = books.find((b) => b.id === bookId);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/games")}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> O'yinlarim
        </button>
        <span className="text-sm text-slate-400">
          {editing ? "O'yinni tahrirlash" : "Yangi o'yin yasash"}
        </span>
      </div>

      {/* -------------------------- 1. O'yin turi -------------------------- */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-slate-900">1. O'yin turini tanlang</p>
        <div className="space-y-4">
          {BUILDER_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">{group.label}</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {group.types.map((t) => {
                  const meta = GAME_TYPES[t];
                  const active = type === t;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setType(t);
                        setItems([]);
                        setProblems([]);
                      }}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
                        active
                          ? "border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100"
                          : "border-slate-200 bg-white hover:border-indigo-300"
                      )}
                    >
                      <span className="text-2xl">{meta.emoji}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-800">{meta.label}</span>
                        <span className="block text-xs leading-snug text-slate-500">{meta.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ------------------------ 2. Asosiy ma'lumot ----------------------- */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-slate-900">2. O'yin haqida</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="O'yin nomi">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Masalan: ${selectedType.label} — mevalar`}
            />
          </Field>
          <Field label="Fan">
            <Select value={subject} onChange={(e) => setSubject(e.target.value as SubjectKey)}>
              {SUBJECT_LIST.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.emoji} {s.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sinf">
            <Select value={grade} onChange={(e) => setGrade(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                <option key={g} value={g}>
                  {g}-sinf
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Qiyinlik">
            <Select
              value={(initial as { difficulty?: number } | undefined)?.difficulty ?? 2}
              onChange={() => undefined}
              disabled
            >
              <option value={2}>⭐️⭐️ O'rta</option>
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Qo'shimcha izoh (o'yin kartida ko'rinadi)" hint="Masalan: 3-mavzu, uyga vazifa uchun">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ixtiyoriy" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Ko'rsatma (o'quvchi o'yin boshida ko'radi)" hint="Bo'sh qoldirsangiz, standart ko'rsatma ishlatiladi">
              <Input
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder={selectedType.hint}
              />
            </Field>
          </div>
        </div>
      </Card>

      {/* ---------------------------- 3. Material -------------------------- */}
      <Card className="p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-900">3. Materialni kiriting</p>
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            {(
              [
                { key: "quick", label: "Tez usul", icon: Wand2 },
                { key: "table", label: "Jadval", icon: Table2 },
              ] as const
            ).map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  mode === m.key ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"
                )}
              >
                <m.icon className="h-3.5 w-3.5" /> {m.label}
              </button>
            ))}
          </div>
        </div>

        {type === "grouping" ? (
          <div className="mb-3">
            <Field label="Guruhlar nomi (har birini yangi qatorga yozing)" hint="Kamida 2 ta guruh kerak">
              <Textarea
                value={groupsRaw}
                onChange={(e) => setGroupsRaw(e.target.value)}
                className="min-h-[70px]"
                placeholder={"Mevalar\nSabzavotlar"}
              />
            </Field>
          </div>
        ) : null}

        {mode === "quick" ? (
          <div className="space-y-3">
            <Field
              label="Material (har bir qator — bitta savol yoki juftlik)"
              hint={`Ko'rinish namunasi:\n${formatSample(type)}`}
            >
              <Textarea
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                className="min-h-[190px] font-mono text-xs leading-relaxed"
                placeholder={formatSample(type)}
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={preview} disabled={previewing || !raw.trim()}>
                {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Tekshirib ko'rish
              </Button>
              {items.length ? (
                <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  <Check className="h-3 w-3" /> {items.length} ta element o'qildi
                </Badge>
              ) : null}
            </div>
          </div>
        ) : (
          <TableEditor type={type} items={items} groups={splitGroups(groupsRaw)} onChange={setItems} />
        )}

        {problems.length ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5" /> Quyidagi qatorlar tushunilmadi (o'yinda ishlatilmaydi):
            </p>
            <ul className="space-y-0.5 text-xs text-amber-700">
              {problems.slice(0, 6).map((p, i) => (
                <li key={i}>• {p}</li>
              ))}
              {problems.length > 6 ? <li>… yana {problems.length - 6} ta</li> : null}
            </ul>
          </div>
        ) : null}
      </Card>

      {/* -------------------------- 4. Kitobga bog'lash --------------------- */}
      <Card className="p-5">
        <p className="mb-3 text-sm font-semibold text-slate-900">
          4. Kitobga bog'lash <span className="font-normal text-slate-400">(ixtiyoriy)</span>
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Kitob">
            <Select
              value={bookId}
              onChange={(e) => {
                setBookId(e.target.value);
                setTopicId("");
              }}
            >
              <option value="">— bog'lanmagan —</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mavzu">
            <Select value={topicId} onChange={(e) => setTopicId(e.target.value)} disabled={!selectedBook}>
              <option value="">— mavzu tanlanmagan —</option>
              {selectedBook?.topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Bog'langan o'yin kitob sahifasida ham paydo bo'ladi — o'quvchilar o'sha yerda topadi.
        </p>
      </Card>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={save}
          disabled={busy || (!items.length && !raw.trim())}
          className="px-6 py-2.5 text-base"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? "Saqlash" : "O'yinni yasash"}
        </Button>
        {saved ? (
          <span className="text-sm text-emerald-600">
            <Check className="mr-1 inline h-4 w-4" /> Saqlandi
          </span>
        ) : null}
        <span className="text-xs text-slate-400">
          {items.length ? `${items.length} ta element` : "Avval materialni tekshirib ko'ring"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function splitGroups(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map((g) => g.trim())
    .filter(Boolean);
}

/** O'yin turi uchun matn namunasi */
export function formatSample(type: GameType): string {
  switch (type) {
    case "matching":
    case "memory":
      return "kitob — book\nquyosh — sun\nmaktab — school";
    case "grouping":
      return "olma — Mevalar\nuzum — Mevalar\nkartoshka — Sabzavotlar\nsabzi — Sabzavotlar";
    case "truefalse":
      return "Suv 100°C da qaynaydi | to'g'ri\nQuyosh sovuq yulduz | noto'g'ri";
    case "fill":
      return "Kitob — bilim ______ . | manbai\nBahorda qorlar ______ . | eriydi";
    case "missingletter":
      return "k_tob | kitob\nm_ktab | maktab\nd_raxt | daraxt";
    case "puzzle":
      return "kitob | ki,tob\nmaktab | mak,tab\nbahor | ba,hor";
    case "order":
      return "Gapni tartibla | Bugun | havo | juda | issiq\nAlifbo tartibi | anor | behi | olma";
    case "math":
    case "pop":
      return "24 + 38 = 62\n350 - 125\n6 × 7\n72 : 8";
    case "bingo":
      return "olma\nuzum\nanor\nnok\nbehi\nshaftoli\nanjir\nolcha\nxurmo";
    case "findmistake":
      return "kitob | kitab | ktob | kitobp";
    default:
      return "Poytaxti qaysi shahar? | Toshkent | Samarqand | Buxoro | Namangan\n2 + 2 nechaga teng? | 4 | 3 | 5 | 6";
  }
}

/** Mavjud elementlarni matn ko'rinishiga qaytarish (tahrirlash uchun) */
function itemsToRaw(items: GameItem[], type: GameType): string {
  return items
    .map((it) => {
      if ("left" in it) {
        const m = it as { left: string; right: string };
        return `${m.left} — ${m.right}`;
      }
      if ("statement" in it) {
        const t = it as { statement: string; isTrue: boolean };
        return `${t.statement} | ${t.isTrue ? "to'g'ri" : "noto'g'ri"}`;
      }
      if ("display" in it) {
        const m = it as { display: string; answer: string };
        return `${m.display} | ${m.answer}`;
      }
      if ("pieces" in it) {
        const p = it as { answer: string; pieces: string[] };
        return `${p.answer} | ${p.pieces.join(",")}`;
      }
      if ("tokens" in it) {
        const p = it as { prompt: string; tokens: string[] };
        return `${p.prompt} | ${p.tokens.join(" | ")}`;
      }
      if ("sentence" in it) {
        const f = it as { sentence: string; answer: string };
        return `${f.sentence} | ${f.answer}`;
      }
      if ("expression" in it) {
        const m = it as { expression: string };
        return m.expression.replace("= ?", "").trim();
      }
      if ("text" in it) return String((it as { text: string }).text);
      const q = it as { question: string; options: string[]; answer: number };
      const [correct, ...rest] = [q.options[q.answer ?? 0], ...q.options.filter((_, i) => i !== (q.answer ?? 0))];
      return [q.question, correct, ...rest].join(" | ");
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// JADVAL REJIMI — har bir elementni alohida kiritish
// ---------------------------------------------------------------------------

function TableEditor({
  type,
  items,
  groups,
  onChange,
}: {
  type: GameType;
  items: GameItem[];
  groups: string[];
  onChange: (items: GameItem[]) => void;
}) {
  const addRow = () => onChange([...items, emptyItem(type, groups)]);
  const update = (i: number, value: GameItem) => onChange(items.map((x, j) => (j === i ? value : x)));
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div className="space-y-2">
      <div className="space-y-2">
        {items.map((it, i) => (
          <ItemRow key={i} type={type} item={it} groups={groups} onChange={(v) => update(i, v)} onRemove={() => remove(i)} />
        ))}
      </div>

      <Button variant="secondary" onClick={addRow}>
        <Plus className="h-4 w-4" /> Qator qo'shish
      </Button>

      {!items.length ? (
        <p className="text-xs text-slate-400">
          Hozircha bo'sh. «Qator qo'shish» tugmasini bosing yoki «Tez usul»dan foydalaning.
        </p>
      ) : null}
    </div>
  );
}

function emptyItem(type: GameType, groups: string[]): GameItem {
  switch (type) {
    case "matching":
    case "memory":
      return { left: "", right: "" };
    case "grouping":
      return { left: "", right: groups[0] ?? "" };
    case "truefalse":
      return { statement: "", isTrue: true };
    case "fill":
      return { sentence: "", answer: "", options: [] };
    case "missingletter":
      return { display: "", answer: "", options: [] };
    case "puzzle":
      return { prompt: "Bo'laklardan yig'ing", answer: "", pieces: [] };
    case "order":
      return { prompt: "", tokens: [] };
    case "math":
    case "pop":
      return { expression: "", answer: 0, options: [] };
    case "bingo":
      return { text: "" };
    default:
      return { question: "", options: ["", "", "", ""], answer: 0 };
  }
}

function ItemRow({
  type,
  item,
  groups,
  onChange,
  onRemove,
}: {
  type: GameType;
  item: GameItem;
  groups: string[];
  onChange: (v: GameItem) => void;
  onRemove: () => void;
}) {
  const cell = "w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm focus:border-indigo-500 focus:outline-none";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
      {"left" in item ? (
        <>
          <input
            className={cn(cell, "flex-1")}
            placeholder="Chap (so'z / tushuncha)"
            value={(item as { left: string }).left}
            onChange={(e) => onChange({ ...(item as object), left: e.target.value } as GameItem)}
          />
          {type === "grouping" ? (
            <select
              className={cn(cell, "w-40")}
              value={(item as { right: string }).right}
              onChange={(e) => onChange({ ...(item as object), right: e.target.value } as GameItem)}
            >
              <option value="">— guruh —</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={cn(cell, "flex-1")}
              placeholder="O'ng (ma'nosi / juftligi)"
              value={(item as { right: string }).right}
              onChange={(e) => onChange({ ...(item as object), right: e.target.value } as GameItem)}
            />
          )}
        </>
      ) : "statement" in item ? (
        <>
          <input
            className={cn(cell, "flex-1")}
            placeholder="Fikr (gap)"
            value={(item as { statement: string }).statement}
            onChange={(e) => onChange({ ...(item as object), statement: e.target.value } as GameItem)}
          />
          <select
            className={cn(cell, "w-32")}
            value={(item as { isTrue: boolean }).isTrue ? "1" : "0"}
            onChange={(e) => onChange({ ...(item as object), isTrue: e.target.value === "1" } as GameItem)}
          >
            <option value="1">✅ To'g'ri</option>
            <option value="0">❌ Noto'g'ri</option>
          </select>
        </>
      ) : "display" in item ? (
        <>
          <input
            className={cn(cell, "flex-1")}
            placeholder="k_tob"
            value={(item as { display: string }).display}
            onChange={(e) =>
              onChange({
                ...(item as { display: string; answer: string }),
                display: e.target.value,
                options: [],
              } as unknown as GameItem)
            }
          />
          <input
            className={cn(cell, "w-40")}
            placeholder="javob: kitob"
            value={(item as { answer: string }).answer}
            onChange={(e) =>
              onChange({
                ...(item as { display: string; answer: string }),
                answer: e.target.value,
                options: [],
              } as unknown as GameItem)
            }
          />
        </>
      ) : "pieces" in item ? (
        <>
          <input
            className={cn(cell, "w-40")}
            placeholder="javob: kitob"
            value={(item as { answer: string }).answer}
            onChange={(e) => onChange({ ...(item as object), answer: e.target.value } as GameItem)}
          />
          <input
            className={cn(cell, "flex-1")}
            placeholder="bo'laklar: ki,tob"
            value={(item as { pieces: string[] }).pieces.join(",")}
            onChange={(e) =>
              onChange({
                ...(item as object),
                prompt: "Bo'laklardan yig'ing",
                pieces: e.target.value.split(",").map((p) => p.trim()).filter(Boolean),
              } as GameItem)
            }
          />
        </>
      ) : "tokens" in item ? (
        <>
          <input
            className={cn(cell, "w-48")}
            placeholder="Topshiriq nomi"
            value={(item as { prompt: string }).prompt}
            onChange={(e) => onChange({ ...(item as object), prompt: e.target.value } as GameItem)}
          />
          <input
            className={cn(cell, "flex-1")}
            placeholder="To'g'ri tartib: birinchi | ikkinchi | uchinchi"
            value={(item as { tokens: string[] }).tokens.join(" | ")}
            onChange={(e) =>
              onChange({
                ...(item as object),
                tokens: e.target.value.split("|").map((t) => t.trim()).filter(Boolean),
              } as GameItem)
            }
          />
        </>
      ) : "sentence" in item ? (
        <>
          <input
            className={cn(cell, "flex-1")}
            placeholder="Gap (bo'sh joy uchun _____ qo'ying)"
            value={(item as { sentence: string }).sentence}
            onChange={(e) => onChange({ ...(item as object), sentence: e.target.value } as GameItem)}
          />
          <input
            className={cn(cell, "w-40")}
            placeholder="javob"
            value={(item as { answer: string }).answer}
            onChange={(e) => onChange({ ...(item as object), answer: e.target.value } as GameItem)}
          />
        </>
      ) : "expression" in item ? (
        <>
          <input
            className={cn(cell, "w-48")}
            placeholder="24 + 38"
            value={(item as { expression: string }).expression}
            onChange={(e) => {
              const expr = e.target.value;
              const m = expr.match(/(\d+)\s*([+\-:×*])\s*(\d+)/);
              let answer = 0;
              if (m) {
                const a = Number(m[1]);
                const b = Number(m[3]);
                answer =
                  m[2] === "+" ? a + b : m[2] === "-" ? a - b : m[2] === ":" ? (b ? a / b : 0) : a * b;
              }
              onChange({ ...(item as object), expression: expr, answer, options: [] } as GameItem);
            }}
          />
          <span className="text-xs text-slate-500">
            = {(item as { answer: number }).answer}
          </span>
        </>
      ) : "text" in item ? (
        <input
          className={cn(cell, "flex-1")}
          placeholder="Karta matni yoki so'z"
          value={(item as { text: string }).text}
          onChange={(e) => onChange({ ...(item as object), text: e.target.value } as GameItem)}
        />
      ) : (
        <>
          <input
            className={cn(cell, "flex-1")}
            placeholder="Savol"
            value={(item as { question: string }).question}
            onChange={(e) => onChange({ ...(item as object), question: e.target.value } as GameItem)}
          />
          {[0, 1, 2, 3].map((oi) => (
            <input
              key={oi}
              className={cn(cell, "w-32", (item as { answer: number }).answer === oi && "border-emerald-400 bg-emerald-50")}
              placeholder={`${String.fromCharCode(65 + oi)}${oi === 0 ? " (to'g'ri)" : ""}`}
              value={(item as { options: string[] }).options[oi] ?? ""}
              onChange={(e) => {
                const opts = [...((item as { options: string[] }).options ?? [])];
                opts[oi] = e.target.value;
                onChange({ ...(item as object), options: opts, answer: (item as { answer: number }).answer ?? 0 } as GameItem);
              }}
            />
          ))}
          <select
            className={cn(cell, "w-32")}
            value={(item as { answer: number }).answer ?? 0}
            onChange={(e) => onChange({ ...(item as object), answer: Number(e.target.value) } as GameItem)}
          >
            {["A", "B", "C", "D"].map((l, i) => (
              <option key={l} value={i}>
                To'g'ri: {l}
              </option>
            ))}
          </select>
        </>
      )}

      <button
        onClick={onRemove}
        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
        title="O'chirish"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

export { Sparkles };
