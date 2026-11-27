// ============================================================================
// "Mashq o'yinlari" generatorlari — 3-sinf uchun 3 ta yangi o'yin:
//
//   1. "Ko'paytirish zinasi"  — ko'paytirish jadvali bo'yicha tez hisob (mc)
//   2. "So'z yasash"          — bo'laklardan (bo'g'inlardan) so'z yig'ish (order)
//   3. "Soatni top"           — analog soat rasmlaridan to'g'risini topish (clock)
//
// Ularning HAMMASI server tomonda tekshiriladi: bu fayl javoblar bilan
// ServerQuestion qaytaradi; brauzerga faqat `q` (javobsiz qism) yuboriladi.
//
// Bu fayl SOF (React'siz, server'siz) — testlarda ham ishlatiladi.
// Mavjud o'yinlar ma'lumotlarini ALMASHTIRMAYDI: alohida "practice" manba.
// ============================================================================

import type {
  ClockFace,
  ClockQuestion,
  McQuestion,
  OrderQuestion,
  ServerQuestion,
} from "./types";

/** Tasodifiy son [min, max] (seed bilan takrorlanuvchi RNG) */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed bilan aralashtirish (duo o'yinda ikkala o'yinchiga bir xil tartib) */
export function shuffleWithSeed<T>(arr: readonly T[], seed: number): T[] {
  const out = [...arr];
  const rnd = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function uniqueOptions(correct: string, pool: string[], rnd: () => number, count = 4): string[] {
  const opts = [correct];
  const rest = pool.filter((p) => p !== correct);
  while (opts.length < count && rest.length) {
    const i = Math.floor(rnd() * rest.length);
    opts.push(rest.splice(i, 1)[0]!);
  }
  return opts;
}

// ---------------------------------------------------------------------------
// 1. KO'PAYTIRISH ZINASI — 2..9 × 2..9
// ---------------------------------------------------------------------------
export const PRACTICE_MULTIPLICATION = "kopaytirish-zinasi";

function multiplicationStairs(count: number, seed: number): ServerQuestion[] {
  const rnd = mulberry32(seed * 7919 + 11);
  const used = new Set<string>();
  const out: ServerQuestion[] = [];

  for (let n = 0; n < count * 30 && out.length < count; n++) {
    const a = 2 + Math.floor(rnd() * 8); // 2..9
    const b = 2 + Math.floor(rnd() * 8); // 2..9
    const key = `${a}x${b}`;
    if (used.has(key)) continue;
    used.add(key);

    const answer = a * b;
    const pool = [answer + 1, answer - 1, answer + 10, answer - 10, answer + a, answer - b, answer + 2]
      .filter((v) => v > 0 && v !== answer)
      .map(String);
    const options = uniqueOptions(String(answer), pool, rnd, 4);
    // Variantlarni ham aralashtiramiz (o'quvchi joyini yodlab qolmasin)
    const shuffled = shuffleWithSeed(options, seed + n * 131 + a * 7 + b);
    const q: McQuestion = {
      kind: "mc",
      prompt: `${a} × ${b} = ?`,
      options: shuffled,
    };
    out.push({ q, a: shuffled.indexOf(String(answer)) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// 2. SO'Z YASASH — bo'g'inlardan so'z yig'ish
// ---------------------------------------------------------------------------

/** 3-sinf uchun o'zbek so'zlari (bo'g'inlarga bo'lingan) */
export const WORD_BANK: Array<{ word: string; pieces: string[] }> = [
  { word: "kitob", pieces: ["ki", "tob"] },
  { word: "daftar", pieces: ["daf", "tar"] },
  { word: "maktab", pieces: ["mak", "tab"] },
  { word: "olma", pieces: ["ol", "ma"] },
  { word: "quyosh", pieces: ["qu", "yosh"] },
  { word: "qalam", pieces: ["qa", "lam"] },
  { word: "darslik", pieces: ["dars", "lik"] },
  { word: "bahor", pieces: ["ba", "hor"] },
  { word: "mamlakat", pieces: ["mam", "la", "kat"] },
  { word: "toshbaqa", pieces: ["tosh", "ba", "qa"] },
  { word: "qishloq", pieces: ["qish", "loq"] },
  { word: "o'rmon", pieces: ["o'r", "mon"] },
  { word: "tarvuz", pieces: ["tar", "vuz"] },
  { word: "samarqand", pieces: ["sa", "mar", "qand"] },
  { word: "o'quvchi", pieces: ["o'", "quv", "chi"] },
  { word: "paxta", pieces: ["pax", "ta"] },
  { word: "do'stlik", pieces: ["do'st", "lik"] },
  { word: "sevimli", pieces: ["se", "vim", "li"] },
  { word: "o'rik", pieces: ["o'", "rik"] },
  { word: "gulzor", pieces: ["gul", "zor"] },
  { word: "mustaqil", pieces: ["mus", "ta", "qil"] },
];

export const PRACTICE_WORD_BUILD = "soz-yasash";

function wordBuilding(count: number, seed: number): ServerQuestion[] {
  const rnd = mulberry32(seed * 6151 + 29);
  const bank = WORD_BANK.filter((w) => w.pieces.length >= 2);
  const picked = shuffleWithSeed(bank, seed).slice(0, Math.min(count, bank.length));
  const out: ServerQuestion[] = [];

  for (let n = 0; n < picked.length; n++) {
    const item = picked[n]!;
    // Bo'laklarni aralashtiramiz — agar asl tartibida qolib ketsa yana bir bor
    let shuffled = shuffleWithSeed(item.pieces, seed + n * 977 + item.word.length);
    if (shuffled.join("|") === item.pieces.join("|")) {
      shuffled = [...shuffled.slice(1), shuffled[0]!];
    }
    const q: OrderQuestion = {
      kind: "order",
      prompt: `Bo'laklarni tartibga solib «${maskWord(item.word)}» so'zini yasang`,
      pieces: shuffled,
    };
    // Javob — to'g'ri bo'laklar tartibi (bo'lak matnlari bo'yicha solishtiriladi)
    out.push({ q, a: item.pieces });
  }
  return out;
}

/** So'zning birinchi harfini ko'rsatib, qolganini yashirish: k•••• */
function maskWord(word: string): string {
  if (word.length <= 2) return word;
  return word[0]! + "•".repeat(word.length - 1);
}

// ---------------------------------------------------------------------------
// 3. SOATNI TOP — analog soat variantlari ichidan to'g'risini topish
// ---------------------------------------------------------------------------
export const PRACTICE_CLOCK = "soatni-top";

function clockLabel(h: number, m: number): string {
  return `${h}:${String(m).padStart(2, "0")}`;
}

function randomTime(rnd: () => number): ClockFace {
  const h = 1 + Math.floor(rnd() * 12); // 1..12
  const minuteRoll = rnd();
  const m = minuteRoll < 0.4 ? 0 : minuteRoll < 0.7 ? 30 : minuteRoll < 0.85 ? 15 : 45;
  return { h, m };
}

function findClock(count: number, seed: number): ServerQuestion[] {
  const rnd = mulberry32(seed * 4409 + 17);
  const out: ServerQuestion[] = [];
  const used = new Set<string>();

  for (let n = 0; n < count * 30 && out.length < count; n++) {
    const target = randomTime(rnd);
    const key = clockLabel(target.h, target.m);
    if (used.has(key)) continue;
    used.add(key);

    // 3 ta chalg'ituvchi soat: o'xshash, lekin boshqa vaqt
    const opts: ClockFace[] = [target];
    let guard = 0;
    while (opts.length < 4 && guard++ < 100) {
      const wrong = randomTime(rnd);
      if (wrong.h === target.h && wrong.m === target.m) continue;
      if (opts.some((o) => o.h === wrong.h && o.m === wrong.m)) continue;
      opts.push(wrong);
    }
    const shuffled = shuffleWithSeed(opts, seed + n * 313);
    const q: ClockQuestion = {
      kind: "clock",
      prompt: `Soat ${clockLabel(target.h, target.m)} bo'ldi. Qaysi soat shu vaqtni ko'rsatadi?`,
      options: shuffled,
    };
    out.push({ q, a: shuffled.findIndex((o) => o.h === target.h && o.m === target.m) });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Umumiy kirish nuqtasi
// ---------------------------------------------------------------------------

export interface PracticeMeta {
  slug: string;
  title: string;
  instructions: string;
  emoji: string;
  /** Bitta sessiyadagi savollar soni */
  items: number;
}

export const PRACTICE_GAMES: PracticeMeta[] = [
  {
    slug: PRACTICE_MULTIPLICATION,
    title: "Ko'paytirish zinasi",
    instructions:
      "Har bir to'g'ri javob — zinapoyada bir pog'ona yuqoriga! Misolni yechib, to'g'ri javobni bosing. Vaqt bosimi yo'q — o'zingizga qulay tezlikda o'ynang.",
    emoji: "🪜",
    items: 5,
  },
  {
    slug: PRACTICE_WORD_BUILD,
    title: "So'z yasash",
    instructions:
      "Bo'laklarni to'g'ri tartibda bosib, so'zni yasang. Birinchi harf maslahat sifatida ko'rsatilgan.",
    emoji: "🧩",
    items: 5,
  },
  {
    slug: PRACTICE_CLOCK,
    title: "Soatni top",
    instructions:
      "Soat nechani ko'rsatayotganini toping: to'rtta analog soat ichidan to'g'ri vaqtni ko'rsatganini bosing.",
    emoji: "🕐",
    items: 5,
  },
];

export function practiceMeta(slug: string): PracticeMeta | null {
  return PRACTICE_GAMES.find((g) => g.slug === slug) ?? null;
}

/** Mashq o'yini savollarini generatsiya qilish (javob kaliti bilan) */
export function generatePracticeQuestions(slug: string, seed: number, count?: number): ServerQuestion[] {
  const meta = practiceMeta(slug);
  const n = Math.max(1, Math.min(count ?? meta?.items ?? 5, 12));
  switch (slug) {
    case PRACTICE_MULTIPLICATION:
      return multiplicationStairs(n, seed);
    case PRACTICE_WORD_BUILD:
      return wordBuilding(n, seed);
    case PRACTICE_CLOCK:
      return findClock(n, seed);
    default:
      return [];
  }
}
