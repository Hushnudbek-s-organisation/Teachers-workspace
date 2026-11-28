// ============================================================================
// Kitob / o'qituvchi o'yini elementlarini → server-tekshiriladigan savollarga
// aylantirish (portal uchun).
//
// Qoida: brauzerga javob kaliti CHIQMAYDI. Har bir savol `ServerQuestion`
// ko'rinishida yaratiladi, mijozga faqat `q` yuboriladi, `a` serverda qoladi.
//
// Tur → savol xaritasi:
//   quiz / fill / math / findmistake / missingletter  → mc
//   truefalse                                          → mc (tf)
//   matching / memory / pop / grouping                 → mc (juftni topish)
//   order / puzzle                                     → order
//   bingo                                              → portalga CHIQMAYDI
// ============================================================================

import type {
  FillItem,
  Game,
  GameItem,
  MatchingItem,
  MathItem,
  MissingLetterItem,
  OrderItem,
  PuzzleItem,
  QuizItem,
  TrueFalseItem,
} from "@/lib/books/types";
import { shuffleWithSeed } from "./practice";
import type { McQuestion, OrderQuestion, ServerQuestion } from "./types";

const MAX_PORTAL_QUESTIONS = 10;

function num(v: number | undefined): string {
  return String(v);
}

/** Juftlik uchun chalg'ituvchi o'ng ustunlar tanlash */
function pairOptions(pairs: MatchingItem[], correctIndex: number): string[] {
  const correct = pairs[correctIndex]!.right;
  const others = pairs.filter((_, i) => i !== correctIndex).map((p) => p.right);
  const opts = [correct, ...others.slice(0, 3)];
  // Juftliklar kam bo'lsa — o'zidan foydalanib to'ldirish kerak emas (2 ta variant ham bo'ladi)
  return [...new Set(opts)];
}

/** "??"/"= ? = ?" kabi takrorlangan soroq belgilarini bittaga tushirish */
function normalizePrompt(text: string): string {
  return text
    .replace(/\s*=\s*(?:\?\s*)+=\s*\?/g, " = ?")   // "= ? = ?" → "= ?"
    .replace(/(?:\?\s*){2,}\?/g, " ?")            // "????" → "?"
    .replace(/\?{2,}/g, "?")                       // "??" → "?"
    .replace(/\s+\?/g, " ?")
    .trim();
}

function mcFromItem(item: GameItem, distractors: string[], seed: number, salt: number): ServerQuestion | null {
  let prompt = "";
  let correct = "";

  if ("expression" in item) {
    const m = item as MathItem;
    const e = m.expression.trim();
    prompt = e.includes("?") ? e : e.endsWith("=") ? `${e} ?` : `${e} = ?`;
    correct = num(m.answer);
    const wrongs = (m.options ?? []).filter((o) => o !== m.answer).map(String);
    distractors = [...wrongs, ...distractors];
  } else if ("sentence" in item) {
    const f = item as FillItem;
    prompt = f.sentence.replace(/_{2,}/g, "______");
    correct = f.answer;
    distractors = [...(f.options ?? []).filter((o) => o !== f.answer), ...distractors];
  } else if ("statement" in item && "isTrue" in item) {
    const tf = item as TrueFalseItem;
    const q: McQuestion = {
      kind: "mc",
      prompt: tf.statement,
      options: ["To'g'ri", "Noto'g'ri"],
      tf: true,
    };
    return { q, a: tf.isTrue ? 0 : 1 };
  } else if ("display" in item) {
    const ml = item as MissingLetterItem;
    prompt = `${ml.display.replace(/_/g, "__")} — tushib qolgan harf qaysi?`;
    correct = ml.answer;
    distractors = [...(ml.options ?? []).filter((o) => o !== ml.answer), ...distractors];
  } else if ("question" in item && "options" in item) {
    const qz = item as QuizItem;
    prompt = qz.question;
    correct = String(qz.options[qz.answer] ?? "");
    if (!correct) return null;
    distractors = [...qz.options.filter((_, i) => i !== qz.answer).map(String)];
  } else if ("left" in item) {
    const p = item as MatchingItem;
    prompt = p.left;
    correct = p.right;
    distractors = [];
  } else {
    return null;
  }

  if (!prompt || !correct) return null;
  prompt = normalizePrompt(prompt);
  const options = [...new Set([correct, ...distractors.filter((d) => d && d !== correct)])].slice(0, 4);
  if (options.length < 2) return null;
  // Juftlik savollari uchun chalg'ituvchilar yetarli bo'lmasa — 2 ta variant qoladi
  const shuffled = shuffleWithSeed(options, seed + salt * 613);
  return { q: { kind: "mc", prompt, options: shuffled }, a: shuffled.indexOf(correct) };
}

function orderFromItem(item: GameItem, seed: number, salt: number): ServerQuestion | null {
  if ("tokens" in item) {
    const o = item as OrderItem;
    const pieces = shuffleWithSeed(o.tokens, seed + salt * 271);
    if (pieces.join("|") === o.tokens.join("|")) pieces.push(pieces.shift()!);
    const q: OrderQuestion = { kind: "order", prompt: o.prompt || "Tartibga soling", pieces };
    return { q, a: o.tokens };
  }
  if ("pieces" in item) {
    const p = item as PuzzleItem;
    const pieces = shuffleWithSeed(p.pieces, seed + salt * 383);
    if (pieces.join("|") === p.pieces.join("|")) pieces.push(pieces.shift()!);
    const q: OrderQuestion = { kind: "order", prompt: p.prompt || "Bo'laklarni yig'ing", pieces };
    return { q, a: p.pieces };
  }
  return null;
}

/** Bir o'yin elementini server savoliga aylantirish (juftliklar konteksti bilan) */
function itemToQuestion(
  item: GameItem,
  allItems: GameItem[],
  seed: number,
  salt: number
): ServerQuestion | null {
  if ("tokens" in item || "pieces" in item) return orderFromItem(item, seed, salt);

  if ("left" in item) {
    // matching / memory / grouping — juftni tanlash ko'rinishida
    const pair = item as MatchingItem;
    const rights = allItems
      .filter((i) => "left" in i && (i as MatchingItem).right !== pair.right)
      .map((i) => (i as MatchingItem).right);
    const q0 = mcFromItem(item, rights, seed, salt);
    return q0;
  }
  return mcFromItem(item, [], seed, salt);
}

export interface BuiltQuestions {
  questions: ServerQuestion[];
  boardKind: "mc" | "order" | "clock" | "mixed";
}

/** Bir o'yindan (kitob yoki o'qituvchi o'yini) savollar to'plami yasaydi */
export function buildQuestionsFromGame(game: Game, seed: number, max = MAX_PORTAL_QUESTIONS): BuiltQuestions {
  const usable = game.items.filter(
    (i) => !("text" in i) && (i as { text?: unknown })?.text === undefined
  );
  const order: ServerQuestion[] = [];
  const mcs: ServerQuestion[] = [];

  usable.forEach((item, idx) => {
    const sq = itemToQuestion(item, usable, seed, idx);
    if (!sq) return;
    if (sq.q.kind === "order") order.push(sq);
    else mcs.push(sq);
  });

  const mixed = [...shuffleWithSeed(mcs, seed + 5), ...shuffleWithSeed(order, seed + 9)].slice(0, max);
  const kinds = new Set(mixed.map((m) => m.q.kind));
  const boardKind: BuiltQuestions["boardKind"] =
    kinds.size > 1 ? "mixed" : kinds.has("clock") ? "clock" : kinds.has("order") ? "order" : "mc";
  return { questions: mixed, boardKind };
}

export function gameBoardEmoji(type: Game["type"]): string {
  switch (type) {
    case "math":
    case "pop":
      return "⚡";
    case "matching":
    case "memory":
      return "🔗";
    case "quiz":
      return "❓";
    case "fill":
      return "✏️";
    case "truefalse":
      return "⚖️";
    case "order":
    case "puzzle":
      return "🧩";
    case "missingletter":
      return "🔤";
    case "findmistake":
      return "🔍";
    case "grouping":
      return "🗂";
    default:
      return "🎮";
  }
}
