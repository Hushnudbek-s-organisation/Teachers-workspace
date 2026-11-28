import "server-only";

// ============================================================================
// O'quvchi portali katalogi — SERVER tomonda yig'iladi.
//
//   • Kitoblardan o'yinlar   — o'quvchi sinf darajasiga mos kitoblardan
//                              AVTOMATIK (yangi kitob qo'shilsa o'zi chiqadi)
//   • O'qituvchi o'yinlari   — custom_games (grade mos + for_students ≠ false)
//   • Mashq o'yinlari        — alohida belgilangan 3 ta tayyor mashq o'yini
//
// Filtrlash qoidalari:
//   • Sinf darajasi noma'lum (sinf nomida raqam yo'q) → kitob/o'qituvchi
//     materiallari AVTOMATIK ochilmaydi (faqat mashq o'yinlari ko'rinadi)
//   • Bingo kabi sinf formatlari portalga chiqmaydi (ular /classroom da)
//   • "Faqat sinf uchun" (for_students=false) o'yinlar ochilmaydi
//   • Bir xil (title+type) takrorlar katalogda bir marta ko'rinadi
// ============================================================================

import { getBook } from "@/lib/books/store";
import { getCustomGame, listCustomGames } from "@/lib/books/custom";
import { listClosedGameKeys } from "@/lib/portal/visibility";
import { listBookMetas } from "@/lib/books/store";
import type { BookMeta, Game } from "@/lib/books/types";
import { SUBJECTS, type SubjectKey } from "@/lib/books/types";
import { buildQuestionsFromGame, gameBoardEmoji } from "@/lib/portal/questions";
import { pointsForSubject } from "@/lib/portal/points";
import { studentTodayGameKeys } from "@/lib/portal/store";
import {
  generatePracticeQuestions,
  practiceMeta,
  PRACTICE_GAMES,
} from "@/lib/portal/practice";
import type { CatalogEntry, ServerQuestion } from "@/lib/portal/types";

/** "3-A" → 3; raqam bo'lmasa null (sinf darajasi noma'lum) */
export function gradeFromClass(className: string): number | null {
  const m = /(\d+)/.exec(className ?? "");
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 11 ? n : null;
}

export interface StudentPortalInfo {
  id: string;
  firstName: string;
  classLabel: string;
  grade: number | null;
}

export function portalInfoFor(student: {
  id: string;
  full_name: string;
  class_name: string;
}): StudentPortalInfo {
  return {
    id: student.id,
    firstName: (student.full_name ?? "").trim().split(/\s+/)[0] ?? "",
    classLabel: student.class_name ?? "",
    grade: gradeFromClass(student.class_name ?? ""),
  };
}

const SUBJECT_EMOJI: Record<string, string> = {
  matematika: "🔢",
  "ona-tili": "📗",
  oqish: "📚",
  "tabiiy-fanlar": "🌱",
  "ingliz-tili": "🇬🇧",
  "rus-tili": "🇷🇺",
  boshqa: "🎒",
};

function subjectLabel(key: string): string {
  return SUBJECTS[key as SubjectKey]?.label ?? key;
}

function subjectEmoji(key: string): string {
  return SUBJECT_EMOJI[key] ?? "🎮";
}

function dedupeKey(title: string, type: string): string {
  return `${(title ?? "").toLowerCase().trim()}|${type}`;
}

/** O'quvchi uchun to'liq katalog (server component renderida ishlatiladi) */
export async function buildPortalCatalog(info: StudentPortalInfo): Promise<CatalogEntry[]> {
  const entries: CatalogEntry[] = [];
  const seen = new Set<string>();
  let closed: Set<string> | null = null;
  try {
    closed = await listClosedGameKeys();
  } catch {
    closed = new Set();
  }

  // ------------------------ Mashq o'yinlari (doim ko'rinadi) ------------------------
  for (const p of PRACTICE_GAMES) {
    entries.push({
      key: `practice:${p.slug}`,
      title: p.title,
      instructions: p.instructions,
      boardKind: p.slug === "soatni-top" ? "clock" : p.slug === "soz-yasash" ? "order" : "mc",
      emoji: p.emoji,
      subject: "Mashq o'yinlari",
      subjectKey: "practice",
      source: "practice",
      practice: true,
      savollar: p.items,
      origin: "Tayyor mashq o'yini",
    });
  }

  // --------------- O'qituvchi o'yinlari — HAMMASI ko'rinadi -----------------
  // Foydalanuvchi talabi: o'qituvchi yasagan barcha o'yinlar bolalarga
  // ko'rinadi (sinf darajasidan qat'i nazar). Cheklovlar faqat:
  // for_students=false («Faqat sinf uchun») va bingo (doska formati).
  const customGames = (await listCustomGames()).filter(
    (g) => g.forStudents !== false && g.type !== "bingo"
  );
  for (const game of customGames) {
    if (!portalQuestionsReady(game)) continue;
    if (closed?.has(`custom:${game.id}`)) continue;
    entries.push({
      key: `custom:${game.id}`,
      title: game.title,
      instructions: game.instructions,
      boardKind: boardKindFor(game),
      emoji: gameBoardEmoji(game.type),
      subject: subjectLabel(game.subject),
      subjectKey: game.subject,
      source: "custom",
      practice: false,
      savollar: Math.min(game.items.length, 10),
      origin: "O'qituvchi o'yini",
    });
  }

  const grade = info.grade;
  if (grade === null) return entries; // sinf darajasi noma'lum — kitoblar OCHILMAYDI

  // --------------------------- Kitob o'yinlari (grade mos) --------------------------
  const books = (await listBookMetas()).filter((b) => b.grade === grade);
  for (const book of books) {
    const full = await getBook(book.id);
    if (!full) continue;
    for (const topic of full.topics) {
      for (const game of topic.games) {
        if (game.type === "bingo") continue; // sinf formati — portalga chiqmaydi
        if (closed?.has(`book:${book.id}:${topic.id}:${game.id}`)) continue;
        const key = dedupeKey(game.title, game.type);
        if (seen.has(key)) continue; // takror oldini olish
        if (!portalQuestionsReady(game)) continue;
        seen.add(key);
        entries.push({
          key: `book:${book.id}:${topic.id}:${game.id}`,
          title: game.title,
          instructions: game.instructions || `Mavzu: ${topic.title}`,
          boardKind: boardKindFor(game),
          emoji: gameBoardEmoji(game.type),
          subject: subjectLabel(book.subject),
          subjectKey: book.subject,
          source: "book",
          practice: false,
          savollar: Math.min(game.items.length, 10),
          origin: book.title,
        });
      }
    }
  }

  // ------------------------- O'qituvchi o'yinlari (eski blok — o'chirildi) -----------------------

  return entries;
}

/** O'yin masshtablanadigan savollarga ega ekanini tez tekshirish */
function portalQuestionsReady(game: Game): boolean {
  return game.items.some((i) => {
    if ("tokens" in i || "pieces" in i) return true;
    if ("left" in i) return true;
    if ("expression" in i) return true;
    if ("sentence" in i) return true;
    if ("statement" in i) return true;
    if ("display" in i) return true;
    if ("question" in i && "options" in i) return true;
    return false;
  });
}

function boardKindFor(game: Game): "mc" | "order" | "clock" | "mixed" {
  const kinds = new Set(
    game.items.map((i) => ("tokens" in i || "pieces" in i ? "order" : "mc"))
  );
  if (kinds.size > 1) return "mixed";
  return kinds.has("order") ? "order" : "mc";
}

// ---------------------------------------------------------------------------
// KUNLIK MAJBURIY O'YIN (foydalanuvchi talabi)
//   • Har kuni avtomatik randomize (sana + sinf darajasi bo'yicha qat'iy)
//   • Har 10 ta randomdan ~6 tasi ONA TILI (vazn 6:4)
//   • Buni o'ynamaguncha boshqa o'yinlar yopiq bo'ladi
// ---------------------------------------------------------------------------

export interface DailyGameView {
  entry: CatalogEntry;
  done: boolean;
  points: number;
}

/** Toshkent (UTC+5) sanasi — yangi kun 00:00 da boshlanadi */
function uzbekTodayKey(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function strHash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export async function dailyGameFor(info: StudentPortalInfo, catalog: CatalogEntry[]): Promise<DailyGameView | null> {
  // Faqat real o'yinlar (mashq o'yinlari doim ochiq — majburiylik ularga tegishli emas)
  const candidates = catalog.filter((e) => !e.practice);
  if (!candidates.length) return null;

  const dateKey = uzbekTodayKey();
  const seed = strHash(`${dateKey}|${info.grade ?? 0}`);
  // Har 10 tadan 6 tasi ona tili chiqishi kerak → ona-tili vazni 6, boshqalar 4
  const weightOf = (e: CatalogEntry) => (e.subjectKey === "ona-tili" || e.subjectKey === "oqish" ? 6 : 4);
  const total = candidates.reduce((acc, e) => acc + weightOf(e), 0);
  let r = seed % total;
  let picked = candidates[0]!;
  for (const e of candidates) {
    r -= weightOf(e);
    if (r < 0) {
      picked = e;
      break;
    }
  }

  let done = false;
  try {
    const doneKeys = await studentTodayGameKeys(info.id);
    done = doneKeys.has(picked.key);
  } catch {
    done = false;
  }
  return { entry: picked, done, points: pointsForSubject(picked.subjectKey) };
}

/** Bu o'yin hozir o'ynashga yopiqmi? (kunlik majburiy bajarilmagan bo'lsa) */
export function isGameLockedByDaily(
  key: string,
  daily: DailyGameView | null
): boolean {
  if (!daily) return false;
  if (key.startsWith("practice:")) return false; // mashq o'yinlari doim ochiq
  if (key === daily.entry.key) return false;    // bugungi majburiy o'yin ochiq
  return !daily.done;                            // majburiy bajarilmaguncha yopiq
}

// ---------------------------------------------------------------------------
// Katalog kaliti → savollar (javob kaliti bilan, FAQAT SERVERDA)
// ---------------------------------------------------------------------------

export interface ResolvedCatalogGame {
  title: string;
  instructions: string;
  emoji: string;
  boardKind: "mc" | "order" | "clock" | "mixed";
  gameType: string;
  subject: string;
  grade: number | null;
  questions: ServerQuestion[];
}

export async function resolveCatalogGame(
  key: string,
  seed: number
): Promise<ResolvedCatalogGame | null> {
  const parts = key.split(":");

  if (parts[0] === "practice" && parts[1]) {
    const meta = practiceMeta(parts[1]);
    if (!meta) return null;
    const questions = generatePracticeQuestions(parts[1], seed, meta.items);
    if (!questions.length) return null;
    return {
      title: meta.title,
      instructions: meta.instructions,
      emoji: meta.emoji,
      boardKind: parts[1] === "soatni-top" ? "clock" : parts[1] === "soz-yasash" ? "order" : "mc",
      gameType: "practice",
      subject: "Mashq o'yinlari",
      grade: 3,
      questions,
    };
  }

  if (parts[0] === "book" && parts.length >= 4) {
    const [, bookId, topicId, gameId] = parts;
    const book = await getBook(bookId!);
    if (!book) return null;
    const topic = book.topics.find((t) => t.id === topicId);
    const game = topic?.games.find((g) => g.id === gameId);
    if (!game || game.type === "bingo") return null;
    const built = buildQuestionsFromGame(game, seed);
    if (!built.questions.length) return null;
    return {
      title: game.title,
      instructions: game.instructions,
      emoji: gameBoardEmoji(game.type),
      boardKind: built.boardKind,
      gameType: game.type,
      subject: subjectLabel(book.subject),
      grade: book.grade,
      questions: built.questions,
    };
  }

  if (parts[0] === "custom" && parts[1]) {
    const game = await getCustomGame(parts[1]);
    if (!game || game.type === "bingo" || game.forStudents === false) return null;
    const built = buildQuestionsFromGame(game, seed);
    if (!built.questions.length) return null;
    return {
      title: game.title,
      instructions: game.instructions,
      emoji: gameBoardEmoji(game.type),
      boardKind: built.boardKind,
      gameType: game.type,
      subject: subjectLabel(game.subject),
      grade: game.grade,
      questions: built.questions,
    };
  }

  return null;
}

/** Katalog kartasi uchun mavjudlikni tekshirish (play sahifasi oldidan) */
export async function catalogEntryByKey(key: string): Promise<CatalogEntry | null> {
  const parts = key.split(":");
  if (parts[0] === "practice") {
    const meta = practiceMeta(parts[1] ?? "");
    if (!meta) return null;
    return {
      key,
      title: meta.title,
      instructions: meta.instructions,
      boardKind: parts[1] === "soatni-top" ? "clock" : parts[1] === "soz-yasash" ? "order" : "mc",
      emoji: meta.emoji,
      subject: "Mashq o'yinlari",
      subjectKey: "practice",
      source: "practice",
      practice: true,
      savollar: meta.items,
      origin: "Tayyor mashq o'yini",
    };
  }
  // Boshqa manbalar uchun to'liq katalogdan qidirish (oddiylik uchun)
  const catalog = await buildPortalCatalog({ id: "", firstName: "", classLabel: "", grade: 3 });
  return catalog.find((e) => e.key === key) ?? null;
}

export type { BookMeta };
