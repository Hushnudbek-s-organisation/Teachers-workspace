// ============================================================================
// Mavzu matnidan o'yinlar yasash (fan bo'yicha alohida strategiya)
//
//   matematika  → Tez hisob, tenglama To'g'ri/Noto'g'ri, o'lchov juftliklari,
//                 masala yechish testi
//   ona tili    → Bo'sh joyni to'ldir, alifbo tartibi, qoida testlari, juftini top
//   o'qish      → Matn bo'yicha to'ldirish, gap tartibi, to'g'ri/noto'g'ri,
//                 "qaysi so'z matnda bor?", muallif-asari juftliklari
//   tabiiy fan  → Ta'riflarni ulash, testlar, faktlarni tekshirish
//   chet tili   → Lug'at juftliklari, tarjima testi, xotira kartalari, imlo
// ============================================================================

import type { Game, GameItem, SubjectKey, Topic, TopicExample } from "./types";
import { SUBJECTS } from "./types";
import {
  DEFAULT_MAX_ITEMS,
  MAX_GAMES_PER_TOPIC,
  MAX_ITEMS_PER_GAME,
  MAX_WORD_PROBLEM_CHARS,
  UZ_ALPHABET,
  UZ_VOWELS,
} from "../config";
import type { RawTopic } from "./segment";
import {
  extractBlanks,
  extractDefinitions,
  extractGlossary,
  extractLists,
  extractMath,
  extractTasks,
  extractUnitPairs,
  toExamples,
  type Pair,
  type TaskLine,
} from "./extract";
import {
  foldWord,
  keyphrases,
  longestSentences,
  splitLines,
  numericDistractors,
  pickClozableWord,
  shuffleSeeded,
  splitSentences,
  uniq,
  wordsOf,
  formatNumber,
  clamp,
} from "./text";

export interface BookLevelPair {
  left: string;
  right: string;
}

interface Ctx {
  raw: RawTopic;
  pages: Array<{ page: number; text: string }>;
  subject: SubjectKey;
  seed: string;
  math: ReturnType<typeof extractMath>;
  defs: Pair[];
  units: Pair[];
  glossary: Pair[];
  tasks: TaskLine[];
  lists: ReturnType<typeof extractLists>;
  blanks: ReturnType<typeof extractBlanks>;
  authorPairs: BookLevelPair[];
  /** Kitobning boshqa mavzularidan olingan ta'riflar — "yolg'on" variantlar uchun */
  otherDefs: Pair[];
  /** Mavzuning kalit so'zlari */
  keywords: string[];
  /** Kitobning boshqa mavzularidagi so'zlar (chalg'ituvchi variantlar uchun) */
  poolWords: string[];
}

/** O'yin turi bo'yicha elementlar soni (config'dan olinadi) */
const MAX_ITEMS = MAX_ITEMS_PER_GAME as Record<Game["type"], number>;

// ---------------------------------------------------------------------------
// Asosiy kirish nuqtasi
// ---------------------------------------------------------------------------

export function analyzeTopic(
  raw: RawTopic,
  subject: SubjectKey,
  seedBase: string,
  extras?: { otherDefs?: Pair[]; authorPairs?: BookLevelPair[]; poolWords?: string[] }
): Topic {
  const pages = splitIntoPages(raw);
  const seed = `${seedBase}:${raw.title}:${raw.pageStart}`;

  const ctx: Ctx = {
    raw,
    pages,
    subject,
    seed,
    math: extractMath(raw.text),
    defs: extractDefinitions(raw.text),
    units: extractUnitPairs(raw.text),
    glossary: extractGlossary(raw.text),
    tasks: extractTasks(pages, subject),
    lists: extractLists(pages),
    blanks: extractBlanks(pages),
    authorPairs: extras?.authorPairs ?? [],
    otherDefs: extras?.otherDefs ?? [],
    keywords: keyphrases(raw.text, 26),
    poolWords: extras?.poolWords ?? [],
  };

  const strategy = SUBJECTS[subject]?.strategy ?? "generic";
  let games: Game[] = [];
  switch (strategy) {
    case "math":
      games = mathGames(ctx);
      break;
    case "language":
      games = languageGames(ctx);
      break;
    case "reading":
      games = readingGames(ctx);
      break;
    case "science":
      games = scienceGames(ctx);
      break;
    case "foreign":
      games = foreignGames(ctx);
      break;
    default:
      games = genericGames(ctx);
  }

  // Bitta mavzudagi o'yinlar soni chegaradan oshmasin
  games = games.slice(0, MAX_GAMES_PER_TOPIC);

  // Har qanday fanga foydali qo'shimchalar
  if (games.length < MAX_GAMES_PER_TOPIC) {
    const bingo = buildBingoGame(ctx);
    if (bingo && !games.some((g) => g.type === "bingo")) games.push(bingo);
  }

  const examples = toExamples(ctx.tasks).slice(0, 40);

  return {
    id: `${seedBase}-t${raw.pageStart}`,
    index: 0,
    title: raw.title,
    section: raw.section,
    pageStart: raw.pageStart,
    pageEnd: raw.pageEnd,
    text: raw.text,
    keywords: keyphrases(raw.text, 14),
    examples,
    games,
  };
}

function splitIntoPages(raw: RawTopic): Array<{ page: number; text: string }> {
  const out: Array<{ page: number; text: string }> = [];
  const chunks = raw.text.split(/\n{2,}/);
  let page = raw.pageStart;
  const span = Math.max(1, raw.pageEnd - raw.pageStart + 1);
  const perPage = Math.max(1, Math.ceil(chunks.length / span));
  chunks.forEach((c, i) => {
    const p = clamp(raw.pageStart + Math.floor(i / perPage), raw.pageStart, raw.pageEnd);
    const existing = out.find((x) => x.page === p);
    if (existing) existing.text += "\n" + c;
    else out.push({ page: p, text: c });
  });
  if (!out.length) out.push({ page, text: raw.text });
  return out;
}

// ---------------------------------------------------------------------------
// O'yin yasash yordamchilari
// ---------------------------------------------------------------------------

function makeGame(
  type: Game["type"],
  title: string,
  instructions: string,
  items: GameItem[],
  ctx: Ctx,
  difficulty: 1 | 2 | 3 = 2,
  note = ""
): Game | null {
  const min = type === "memory" ? 4 : 3;
  // Takrorlanuvchi elementlarni (bir xil savol/juftlik) olib tashlaymiz
  const seen = new Set<string>();
  const clean = items.filter(Boolean).filter((it) => {
    const key = JSON.stringify(it);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (clean.length < min) return null;
  const limit = MAX_ITEMS[type] ?? DEFAULT_MAX_ITEMS;
  const pages = uniq(ctx.pages.map((p) => p.page)).slice(0, 6);
  return {
    id: `${ctx.seed.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${type}`,
    type,
    title,
    instructions,
    difficulty,
    items: clean.slice(0, limit),
    builtFrom: { note: note || `${clean.length} ta material asosida`, pages },
  };
}

/** To'g'ri javob + chalg'ituvchilardan variantlar tayyorlaydi */
function buildOptions(correct: string, distractors: string[], seed: string): { options: string[]; answer: number } {
  const uniqDistractors = uniq(
    distractors
      .map((d) => d.trim())
      .filter((d) => d.length > 0 && foldWord(d) !== foldWord(correct))
  ).slice(0, 3);
  const all = [correct, ...uniqDistractors];
  const shuffled = shuffleSeeded(all, seed);
  return { options: shuffled, answer: shuffled.findIndex((o) => foldWord(o) === foldWord(correct)) };
}

function difficultyOf(items: { length?: number }[], ctx: Ctx): 1 | 2 | 3 {
  if (ctx.raw.pageEnd - ctx.raw.pageStart > 6) return 3;
  if (items.length >= 8) return 2;
  return 1;
}

/** Gap ichida boshqa variant ham to'g'ri bo'lib qolmasligini tekshiradi */
function safeDistractors(sentence: string, correct: string, pool: string[]): string[] {
  const hay = ` ${foldWord(sentence)} `;
  return pool.filter((w) => {
    const f = foldWord(w);
    if (!f || f === foldWord(correct)) return false;
    if (hay.includes(` ${f} `)) return false;
    if (f.includes(" ") ) return false;
    return true;
  });
}

// ---------------------------------------------------------------------------
// MATEMATIKA
// ---------------------------------------------------------------------------

function mathGames(ctx: Ctx): Game[] {
  const out: Game[] = [];
  const { math, seed } = ctx;

  // 1) Tez hisob — kitobdagi misollar
  if (math.length >= 3) {
    const items = math.slice(0, MAX_ITEMS.math).map((m) => {
      const distractors = numericDistractors(m.answer, 3, seed + m.expression);
      const options = shuffleSeeded([m.answer, ...distractors], seed + "opt" + m.expression);
      return { expression: `${m.expression} = ?`, answer: m.answer, options };
    });
    out.push(
      makeGame(
        "math",
        "Tez hisob",
        "Misolni yechib, to'g'ri javobni bosing. Har bir to'g'ri javob uchun 1 ball!",
        items,
        ctx,
        math.some((m) => m.answer > 500) ? 3 : math.some((m) => m.answer > 100) ? 2 : 1,
        `Kitobdagi ${items.length} ta misol`
      )!
    );
  }

  // 2) To'g'ri / noto'g'ri — tenglamalar
  if (math.length >= 4) {
    const half = math.slice(0, 6);
    const items = half.map((m, i) => {
      const isTrue = i % 2 === 0;
      const shown = isTrue ? m.answer : numericDistractors(m.answer, 1, seed + "tf" + i)[0];
      return {
        statement: `${m.expression} = ${formatNumber(shown)}`,
        isTrue,
        reason: isTrue ? "Bu kitobdagi misol — to'g'ri yechilgan." : `${m.expression} = ${formatNumber(m.answer)} bo'lishi kerak.`,
      };
    });
    out.push(
      makeGame(
        "truefalse",
        "Tenglamani tekshir",
        "Har bir tenglama to'g'rimi? To'g'ri bo'lsa ✅, xato bo'lsa ❌ ni bosing.",
        shuffleSeeded(items, seed + "tf"),
        ctx,
        2,
        "Kitobdagi misollar asosida"
      )!
    );
  }

  // 3) O'lchov birliklari — juftini top
  if (ctx.units.length >= 3) {
    out.push(
      makeGame(
        "matching",
        "O'lchov birliklari",
        "Chapdagi o'lchovni o'ngdagi teng qiymati bilan ulang.",
        shuffleSeeded(ctx.units, seed + "u").slice(0, MAX_ITEMS.matching),
        ctx,
        2,
        "Kitobdagi o'lchov munosabatlari"
      )!
    );
  }

  // 4) Masalalar — yechimni topish testi
  const problems = solveWordProblems(ctx);
  if (problems.length >= 3) {
    out.push(
      makeGame(
        "quiz",
        "Masalani yech",
        "Masalani o'qing, yechimni topib to'g'ri javobni tanlang.",
        problems,
        ctx,
        3,
        `Kitobdagi ${problems.length} ta masala`
      )!
    );
  }

  // 4.5) 🎈 Balonni ot — vaqtli hisoblash o'yini
  const pop = buildPopGame(ctx);
  if (pop) out.push(pop);

  // 5) Tushuncha va izoh (geometriya, kasrlar kabi mavzularda yaxshi ishlaydi)
  if (ctx.defs.length >= 3) {
    out.push(
      makeGame(
        "matching",
        "Tushuncha va izoh",
        "Chapdagi tushunchani o'ngdagi izohi bilan ulang.",
        shuffleSeeded(ctx.defs, seed + "def").slice(0, MAX_ITEMS.matching),
        ctx,
        2,
        "Mavzudagi ta'riflar"
      )!
    );
  }

  // 6) Sonlarni tartibla
  const numbersInText = uniq(
    (ctx.raw.text.match(/\b\d{1,4}\b/g) ?? []).map(Number).filter((n) => n > 3 && n < 10000)
  );
  if (numbersInText.length >= 4) {
    const chosen = shuffleSeeded(numbersInText, seed + "num").slice(0, 5);
    const sorted = [...chosen].sort((a, b) => a - b);
    out.push(
      makeGame(
        "order",
        "Sonlarni tartibla",
        "Sonlarni o'sish tartibida joylashtiring (kichigidan kattasiga).",
        [{ prompt: "O'sish tartibi", tokens: sorted.map(String) }],
        ctx,
        1,
        "Kitobdagi sonlar"
      )!
    );
  }

  // Yetarli o'yin chiqmasa — matn asosidagi umumiy o'yinlar bilan to'ldiramiz
  if (out.length < 2) {
    const cloze = buildClozeItems(ctx, 8);
    if (cloze.length >= 3) {
      out.push(
        makeGame("fill", "Qoidani to'ldir", "Mavzudagi gapdan tushib qolgan so'zni toping.", cloze, ctx, 2, "Mavzu matni")!
      );
    }
    const tf = buildTextTrueFalse(ctx);
    if (tf.length >= 3) {
      out.push(makeGame("truefalse", "Mavzuni tekshir", "Fikr to'g'rimi?", tf, ctx, 2, "Mavzu matni")!);
    }
  }

  return out.filter(Boolean) as Game[];
}

/** Sodda matnli masalalarni yechadi (jami / qoldi / necha marta) */
function solveWordProblems(ctx: Ctx): Array<{ question: string; options: string[]; answer: number }> {
  const out: Array<{ question: string; options: string[]; answer: number }> = [];
  const problems = ctx.tasks
    .filter((t) => t.kind === "masala" || t.kind === "savol")
    .map((t) => t.text)
    .concat(unitsOf(ctx.raw.text).filter((s) => s.endsWith("?") && /\d/.test(s)));

  const seenProblems = new Set<string>();
  for (const p of problems) {
    if (p.length > MAX_WORD_PROBLEM_CHARS || p.length < 12) continue;
    if (!p.includes("?")) continue;
    if (seenProblems.has(p.replace(/\s+/g, " ").trim())) continue;
    seenProblems.add(p.replace(/\s+/g, " ").trim());

    const clean = p.replace(/^\s*\d{1,3}[.)]\s*/, "").replace(/\s+/g, " ").trim();
    const nums = (clean.match(/\d{1,3}(?:[ \u00A0]?\d{3})*(?:,\d+)?/g) ?? [])
      .map((n) => Number(n.replace(/\s|\u00A0/g, "").replace(",", ".")))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (nums.length < 2 || nums.length > 3) continue;

    const low = foldWord(clean);
    let answer: number | null = null;

    if (/\bnecha marta\b|\bnecha barobar\b/.test(low) && nums.length === 2 && nums[1] !== 0 && nums[0] % nums[1] === 0) {
      answer = nums[0] / nums[1];
    } else if (
      /\b(tadan|har biri|har bir|har birida|bir xil)\b/.test(low) &&
      nums.length === 2
    ) {
      // "Har birida 20 tadan ... 3 ta qutida nechta?" → ko'paytirish
      const [x, y] = nums;
      const small = Math.min(x, y);
      answer = small <= 12 ? x * y : null;
    } else if (/\b(jami|hammasi|birgalikda)\b/.test(low) && nums.length === 2) {
      answer = nums[0] + nums[1];
    } else if (/\b(qoldi|qoldiq|kamaydi|qancha kam)\b/.test(low) && nums.length === 2) {
      answer = nums[0] - nums[1];
    }
    if (answer == null || answer < 0 || !Number.isFinite(answer)) continue;

    const distractors = numericDistractors(answer, 3, ctx.seed + p.slice(0, 20));
    const options = shuffleSeeded([answer, ...distractors], ctx.seed + "wo" + p.slice(0, 20)).map((n) =>
      formatNumber(n)
    );
    out.push({
      question: clean,
      options,
      answer: options.findIndex((o) => o === formatNumber(answer)),
    });
    if (out.length >= MAX_ITEMS.quiz) break;
  }
  return out.filter((p) => p.answer >= 0);
}

// ---------------------------------------------------------------------------
// ONA TILI
// ---------------------------------------------------------------------------

function languageGames(ctx: Ctx): Game[] {
  const out: Game[] = [];
  const { seed } = ctx;

  // 1) Kitobdagi bo'sh joy topshiriqlari
  if (ctx.blanks.length >= 3) {
    const pool = uniq(ctx.blanks.map((b) => b.answer));
    const items = ctx.blanks.slice(0, MAX_ITEMS.fill).map((b, i) => {
      const distractors = shuffleSeeded(pool.filter((p) => foldWord(p) !== foldWord(b.answer)), seed + i).slice(0, 3);
      return { sentence: b.sentence, answer: b.answer, options: shuffleSeeded([b.answer, ...distractors], seed + "b" + i) };
    });
    out.push(
      makeGame(
        "fill",
        "Bo'sh joyni to'ldir",
        "Kitobdagi mashqlardagi tushib qolgan so'zni toping.",
        items,
        ctx,
        2,
        "Kitob mashqlari asosida"
      )!
    );
  }

  // 2) Matnli gaplardan to'ldirish (cloze)
  const cloze = buildClozeItems(ctx, 8);
  if (cloze.length >= 3) {
    out.push(
      makeGame(
        "fill",
        "So'zni topib qo'ying",
        "Gapdagi tushib qolgan so'zni variantlardan tanlang.",
        cloze,
        ctx,
        2,
        "Mavzu matnidagi gaplar"
      )!
    );
  }

  // 3) Alifbo tartibi
  const wordLists = ctx.lists.filter((l) => l.items.length >= 4);
  if (wordLists.length) {
    const items = wordLists.slice(0, MAX_ITEMS.order).map((l) => ({
      prompt: l.label ? `${l.label} — alifbo tartibida` : "So'zlarni alifbo tartibida joylashtiring",
      tokens: [...l.items].sort((a, b) => a.localeCompare(b, "uz")),
    }));
    out.push(
      makeGame(
        "order",
        "Alifbo tartibi",
        "So'zlarni alifbo tartibida to'g'ri joylashtiring.",
        items,
        ctx,
        2,
        "Kitobdagi so'z ro'yxatlari"
      )!
    );
  }

  // 4) Juftini top — ta'riflar
  if (ctx.defs.length >= 3) {
    out.push(
      makeGame(
        "matching",
        "Tushuncha va izoh",
        "Chapdagi tushunchani o'ngdagi izohi bilan ulang.",
        shuffleSeeded(ctx.defs, seed + "m").slice(0, MAX_ITEMS.matching),
        ctx,
        2,
        "Kitobdagi ta'rif va qoidalar"
      )!
    );
  }

  // 5) To'g'ri / noto'g'ri — qoidalar
  const ruleItems = buildRuleTrueFalse(ctx);
  if (ruleItems.length >= 3) {
    out.push(
      makeGame(
        "truefalse",
        "Qoidani tekshir",
        "Qoida to'g'ri aytilganmi? ✅ yoki ❌ ni bosing.",
        ruleItems,
        ctx,
        3,
        "Kitobdagi qoidalar"
      )!
    );
  }

  // 6) 🔤 Tushib qolgan harf (imlo uchun juda mos)
  const missing = buildMissingLetterItems(ctx, MAX_ITEMS.missingletter);
  if (missing.length >= 3) {
    out.push(
      makeGame(
        "missingletter",
        "Tushib qolgan harfni top",
        "So'zdagi yashirilgan harfni topib, to'g'ri variantni bosing.",
        missing,
        ctx,
        2,
        "Mavzudagi so'zlar"
      )!
    );
  }

  // 7) 🔍 Xatoni top (imlo)
  const mistakes = buildFindMistakeWords(ctx, MAX_ITEMS.findmistake);
  if (mistakes.length >= 3) {
    out.push(
      makeGame(
        "findmistake",
        "Xatoni top: so'zlar",
        "Variantlar ichidan to'g'ri yozilgan so'zni toping.",
        mistakes,
        ctx,
        2,
        "Mavzudagi so'zlar"
      )!
    );
  }

  // 8) 🔍 Xatoni top (gaplar tartibi)
  const sentenceMistakes = buildFindMistakeSentences(ctx, MAX_ITEMS.findmistake);
  const combined = [...mistakes, ...sentenceMistakes];
  if (combined.length >= 3 && mistakes.length < 3) {
    out.push(
      makeGame(
        "findmistake",
        "Xatoni top",
        "Variantlar ichidan to'g'ri yozilganini toping.",
        combined.slice(0, MAX_ITEMS.findmistake),
        ctx,
        3,
        "Mavzu matnidagi gaplar"
      )!
    );
  }

  // 9) "Qaysi so'z to'g'ri yozilgan?" — eski imlo testi (zaxira)
  const spelling = buildSpellingQuiz(ctx);
  if (spelling.length >= 3 && mistakes.length < 3) {
    out.push(
      makeGame(
        "findmistake",
        "Imlo testi",
        "So'zning to'g'ri yozilgan variantini tanlang.",
        spelling,
        ctx,
        2,
        "Mavzudagi so'zlar"
      )!
    );
  }

  return out.filter(Boolean) as Game[];
}

// ---------------------------------------------------------------------------
// O'QISH SAVODXONLIGI
// ---------------------------------------------------------------------------

function readingGames(ctx: Ctx): Game[] {
  const out: Game[] = [];
  const { seed } = ctx;

  // 1) Matn bo'yicha to'ldirish
  const cloze = buildClozeItems(ctx, 8);
  if (cloze.length >= 3) {
    out.push(
      makeGame(
        "fill",
        "Matn bo'yicha to'ldir",
        "Matnni o'qib, gapdagi tushib qolgan so'zni toping.",
        cloze,
        ctx,
        2,
        "Matndagi gaplar"
      )!
    );
  }

  // 2) Gap tartibini tiklash
  const orderItems = buildSentenceOrder(ctx);
  if (orderItems.length >= 1) {
    out.push(
      makeGame(
        "order",
        "Gaplar tartibi",
        "Matn mazmuniga mos tartibda gaplarni joylashtiring.",
        orderItems,
        ctx,
        3,
        "Matn parchalari"
      )!
    );
  }

  // 3) Matn bo'yicha to'g'ri / noto'g'ri
  const tf = buildTextTrueFalse(ctx);
  if (tf.length >= 3) {
    out.push(
      makeGame(
        "truefalse",
        "Matn bo'yicha savollar",
        "Fikr matnga mos kelsa ✅, mos kelmasa ❌ ni tanlang.",
        tf,
        ctx,
        3,
        "Matn mazmuni"
      )!
    );
  }

  // 4) Asar va muallif juftliklari (faqat shu mavzuda uchraydiganlari)
  const topicFold = foldWord(ctx.raw.text);
  const localAuthors = ctx.authorPairs.filter((p) => topicFold.includes(foldWord(p.left)));
  if (localAuthors.length >= 3) {
    out.push(
      makeGame(
        "matching",
        "Asar va muallif",
        "Asar nomini uning muallifi bilan ulang.",
        shuffleSeeded(localAuthors, seed + "ap").slice(0, MAX_ITEMS.matching),
        ctx,
        3,
        "Asar-muallif juftliklari"
      )!
    );
  }

  // 5) "Qaysi so'z matnda bor?"
  const present = buildWordPresenceQuiz(ctx);
  if (present.length >= 3) {
    out.push(
      makeGame(
        "quiz",
        "Matnda bor so'zni top",
        "Berilgan so'zlardan qaysi biri matnda uchraydi?",
        present,
        ctx,
        2,
        "Matn lug'ati"
      )!
    );
  }

  // 6) 🧩 Bo'laklardan so'z yig'ish
  const puzzle = buildPuzzleItems(ctx, MAX_ITEMS.puzzle);
  if (puzzle.length >= 3) {
    out.push(
      makeGame(
        "puzzle",
        "Bo'laklardan so'z yig'",
        "Bo'g'in yoki bo'laklarni to'g'ri tartibda bosib, so'zni yig'ing.",
        puzzle,
        ctx,
        2,
        "Matndagi so'zlar"
      )!
    );
  }

  // 7) 🔤 Tushib qolgan harf
  const missing = buildMissingLetterItems(ctx, MAX_ITEMS.missingletter);
  if (missing.length >= 3) {
    out.push(
      makeGame(
        "missingletter",
        "Tushib qolgan harf",
        "So'zdagi yashirilgan harfni toping.",
        missing,
        ctx,
        2,
        "Matndagi so'zlar"
      )!
    );
  }

  // 8) 🎟 Bingo kartasi (sinf bilan)
  const bingo = buildBingoGame(ctx);
  if (bingo) out.push(bingo);

  return out.filter(Boolean) as Game[];
}

// ---------------------------------------------------------------------------
// TABIIY FANLAR
// ---------------------------------------------------------------------------

function scienceGames(ctx: Ctx): Game[] {
  const out: Game[] = [];
  const { seed } = ctx;

  // 1) Juftini top — tushuncha va izoh
  if (ctx.defs.length >= 3) {
    out.push(
      makeGame(
        "matching",
        "Tushuncha va izoh",
        "Chapdagi tushunchani uning izohi bilan ulang.",
        shuffleSeeded(ctx.defs, seed + "m").slice(0, MAX_ITEMS.matching),
        ctx,
        2,
        "Mavzudagi ta'riflar"
      )!
    );
  }

  // 2) Test — "Bu nima?"
  const quiz = buildDefinitionQuiz(ctx);
  if (quiz.length >= 3) {
    out.push(
      makeGame(
        "quiz",
        "Tushunchani aniqlang",
        "Savolga 4 ta variantdan to'g'ri javobni tanlang.",
        quiz,
        ctx,
        3,
        "Mavzudagi ta'riflar"
      )!
    );
  }

  // 3) To'g'ri / noto'g'ri — faktlar
  const tf = buildTextTrueFalse(ctx);
  if (tf.length >= 3) {
    out.push(
      makeGame(
        "truefalse",
        "Faktni tekshir",
        "Ma'lumot to'g'rimi? ✅ yoki ❌ ni bosing.",
        tf,
        ctx,
        2,
        "Mavzudagi ma'lumotlar"
      )!
    );
  }

  // 4) Xotira kartalari (juftliklar yodda saqlash)
  if (ctx.defs.length >= 4) {
    out.push(
      makeGame(
        "memory",
        "Xotira kartalari",
        "Kartalarni navbat bilan ochib, tushuncha va izohni juftlab toping.",
        shuffleSeeded(ctx.defs, seed + "mem").slice(0, MAX_ITEMS.memory),
        ctx,
        2,
        "Ta'riflar juftligi"
      )!
    );
  }

  // 5) To'ldirish
  const cloze = buildClozeItems(ctx, 8);
  if (cloze.length >= 3) {
    out.push(
      makeGame(
        "fill",
        "Bo'sh joyni to'ldir",
        "Gapdagi tushib qolgan so'zni toping.",
        cloze,
        ctx,
        2,
        "Mavzu matnidagi gaplar"
      )!
    );
  }

  // 6) 🗂 Guruhlarni ajratish (hayvonlar, o'simliklar, fasllar...)
  const grouping = buildGroupingGame(ctx);
  if (grouping) out.push(grouping);

  // 7) 🧩 Bo'laklardan so'z yig'ish
  const puzzle = buildPuzzleItems(ctx, MAX_ITEMS.puzzle);
  if (puzzle.length >= 3) {
    out.push(
      makeGame(
        "puzzle",
        "Bo'laklardan so'z yig'",
        "Bo'laklarni to'g'ri tartibda bosib, atamani yig'ing.",
        puzzle,
        ctx,
        2,
        "Mavzudagi atamalar"
      )!
    );
  }

  // 8) 🎟 Bingo kartasi
  const bingo = buildBingoGame(ctx);
  if (bingo) out.push(bingo);

  return out.filter(Boolean) as Game[];
}

// ---------------------------------------------------------------------------
// CHET TILLARI
// ---------------------------------------------------------------------------

function foreignGames(ctx: Ctx): Game[] {
  const out: Game[] = [];
  const { seed } = ctx;
  const g = ctx.glossary;

  // 1) Juftini top — so'z va tarjima
  if (g.length >= 3) {
    out.push(
      makeGame(
        "matching",
        "So'z va tarjima",
        "Inglizcha so'zni o'zbekcha tarjimasi bilan ulang.",
        shuffleSeeded(g, seed + "m").slice(0, MAX_ITEMS.matching),
        ctx,
        1,
        "Kitobdagi lug'at"
      )!
    );
  }

  // 2) Xotira kartalari
  if (g.length >= 4) {
    out.push(
      makeGame(
        "memory",
        "Xotira kartalari",
        "Kartalarni ochib, so'z va tarjima juftliklarini toping.",
        shuffleSeeded(g, seed + "mem").slice(0, MAX_ITEMS.memory),
        ctx,
        2,
        "Lug'at juftliklari"
      )!
    );
  }

  // 3) Tarjima testi
  if (g.length >= 4) {
    const items: GameItem[] = [];
    const answers = g.map((p) => p.right);
    for (const p of g.slice(0, 4)) {
      const opts = buildOptions(
        p.right,
        answers.filter((a) => foldWord(a) !== foldWord(p.right)).slice(0, 3),
        seed + "q" + p.left
      );
      items.push({ question: `"${p.left}" so'zining tarjimasi qaysi?`, options: opts.options, answer: opts.answer });
    }
    for (const p of g.slice(0, 4)) {
      const opts = buildOptions(
        p.left,
        g.map((x) => x.left).filter((a) => foldWord(a) !== foldWord(p.left)).slice(0, 3),
        seed + "q2" + p.right
      );
      items.push({ question: `"${p.right}" ingliz tilida qanday yoziladi?`, options: opts.options, answer: opts.answer });
    }
    out.push(
      makeGame("quiz", "Tarjima testi", "To'g'ri tarjimani tanlang.", shuffleSeeded(items, seed + "quiz"), ctx, 2, "Lug'at")!
    );
  }

  // 4) Harflardan so'z yasash (imlo)
  const longWords = uniq(g.map((p) => p.left).filter((w) => /^[a-zA-Z]{4,10}$/.test(w)));
  if (longWords.length >= 3) {
    const items = shuffleSeeded(longWords, seed + "sp")
      .slice(0, MAX_ITEMS.order)
      .map((w) => ({
        prompt: "Harflarni tartibga solib so'z tuzing",
        tokens: [...w.toUpperCase()],
      }));
    out.push(
      makeGame("order", "So'z tuzing", "Harflarni to'g'ri tartibda joylashtiring.", items, ctx, 2, "Lug'at so'zlari")!
    );
  }

  // 5) 🧩 Harflardan so'z yig'ish (puzzle)
  if (longWords.length >= 3) {
    const items = shuffleSeeded(longWords, seed + "pz")
      .slice(0, MAX_ITEMS.puzzle)
      .map((w) => ({
        prompt: "Bo'laklardan so'zni tiklang",
        answer: w,
        pieces: chunkWord(w, w.length <= 4 ? 2 : 3),
      }));
    out.push(
      makeGame(
        "puzzle",
        "So'zni tiklash",
        "Bo'laklarni to'g'ri tartibda bosib, inglizcha so'zni yig'ing.",
        items,
        ctx,
        2,
        "Lug'at so'zlari"
      )!
    );
  }

  // 6) 🔤 Tushib qolgan harf
  const missing = buildMissingLetterItems(ctx, MAX_ITEMS.missingletter);
  if (missing.length >= 3) {
    out.push(
      makeGame(
        "missingletter",
        "Tushib qolgan harf",
        "Inglizcha so'zdagi yashirilgan harfni toping.",
        missing,
        ctx,
        2,
        "Lug'at so'zlari"
      )!
    );
  }

  // 7) Bo'sh joyni to'ldir
  if (ctx.blanks.length >= 3) {
    const pool = uniq(ctx.blanks.map((b) => b.answer));
    const items = ctx.blanks.slice(0, MAX_ITEMS.fill).map((b, i) => {
      const distractors = shuffleSeeded(pool.filter((p) => foldWord(p) !== foldWord(b.answer)), seed + i).slice(0, 3);
      return { sentence: b.sentence, answer: b.answer, options: shuffleSeeded([b.answer, ...distractors], seed + "b" + i) };
    });
    out.push(makeGame("fill", "Bo'sh joyni to'ldir", "Gapga mos so'zni tanlang.", items, ctx, 2, "Kitob mashqlari")!);
  }

  return out.filter(Boolean) as Game[];
}

// ---------------------------------------------------------------------------
// UMUMIY (boshqa fanlar)
// ---------------------------------------------------------------------------

function genericGames(ctx: Ctx): Game[] {
  const out: Game[] = [];
  const { seed } = ctx;

  const cloze = buildClozeItems(ctx, 8);
  if (cloze.length >= 3) out.push(makeGame("fill", "Bo'sh joyni to'ldir", "Gapdagi so'zni toping.", cloze, ctx)!);

  const tf = buildTextTrueFalse(ctx);
  if (tf.length >= 3) out.push(makeGame("truefalse", "To'g'ri / noto'g'ri", "Fikrni tekshiring.", tf, ctx)!);

  if (ctx.defs.length >= 3)
    out.push(
      makeGame("matching", "Tushuncha va izoh", "Juftliklarni ulang.", shuffleSeeded(ctx.defs, seed + "m").slice(0, 6), ctx)!
    );

  const present = buildWordPresenceQuiz(ctx);
  if (present.length >= 3) out.push(makeGame("quiz", "Matndagi so'z", "Matnda uchraydigan so'zni toping.", present, ctx)!);

  const order = buildSentenceOrder(ctx);
  if (order.length) out.push(makeGame("order", "Tartiblash", "To'g'ri tartibga soling.", order, ctx)!);

  const puzzle = buildPuzzleItems(ctx, MAX_ITEMS.puzzle);
  if (puzzle.length >= 3) {
    out.push(makeGame("puzzle", "Bo'laklardan yig'", "So'zni bo'laklardan yig'ing.", puzzle, ctx)!);
  }

  const bingo = buildBingoGame(ctx);
  if (bingo) out.push(bingo);

  return out.filter(Boolean) as Game[];
}

// ---------------------------------------------------------------------------
// Umumiy quruvchilar
// ---------------------------------------------------------------------------

/** Gaplardan "bo'sh joy" o'yinini yasaydi */
function buildClozeItems(ctx: Ctx, limit: number): GameItem[] {
  const sentences = unitsOf(ctx.raw.text)
    .map((u) => ({ u, n: wordsOf(u).length }))
    .filter((x) => x.n >= 5 && x.n <= 26 && x.u.length < 200)
    .sort((a, b) => b.n - a.n)
    .map((x) => x.u);
  const pool = keyphrases(ctx.raw.text, 24);
  const out: GameItem[] = [];
  const used = new Set<string>();

  for (const s of sentences) {
    const word = pickClozableWord(s, 5);
    if (!word) continue;
    const key = foldWord(word);
    if (used.has(key)) continue;
    used.add(key);

    const masked = s.replace(new RegExp(`\\b${escapeRe(word)}\\b`, "gi"), "_____");
    if (masked === s) continue;

    const distractors = safeDistractors(s, word, pool).slice(0, 3);
    if (distractors.length < 3) continue;

    out.push({
      sentence: masked,
      answer: word,
      options: shuffleSeeded([word, ...distractors], ctx.seed + key),
    });
    if (out.length >= limit) break;
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Matnni "birlik"larga bo'ladi (gap yoki darslik qatori).
 * Darsliklarda har bir qator alohida ma'no beradi (Misol:, Qoida:, 1. ...),
 * shuning uchun qatorni ham to'liq gap sifatida qabul qilamiz.
 */
const LABEL_LINE = /^(misol|mashq|topshiriq|masala|savol|qoida|eslatma|ta'rif|javob|izoh|esda tuting|yodda tuting)\b/i;

export function unitsOf(text: string): string[] {
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => {
    if (!buf.length) return;
    out.push(...splitSentences(buf.join(" ")));
    buf = [];
  };
  for (const line of splitLines(text)) {
    if (line.length > 240) {
      flush();
      out.push(...splitSentences(line));
      continue;
    }
    const standalone = /[.!?…]$/.test(line) || LABEL_LINE.test(line) || /^\s*\d{1,3}[.)]\s/.test(line);
    if (standalone) {
      flush();
      out.push(...splitSentences(line));
    } else {
      buf.push(line);
    }
  }
  flush();
  return out.map((s) => s.replace(/\s+/g, " ").trim()).filter((s) => s.length > 1);
}

/** Matnga mos / mos kelmaydigan fikrlar */
function buildTextTrueFalse(ctx: Ctx): GameItem[] {
  const statements = unitsOf(ctx.raw.text)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => {
      const n = wordsOf(s).length;
      return n >= 4 && n <= 18 && s.length <= 160 && !s.includes("?");
    });

  const keywords = keyphrases(ctx.raw.text, 20);
  const out: GameItem[] = [];
  const used = new Set<string>();

  statements.forEach((s, i) => {
    if (out.length >= MAX_ITEMS.truefalse) return;
    const key = foldWord(s).slice(0, 60);
    if (used.has(key)) return;
    used.add(key);

    const makeFalse = i % 3 === 2 && keywords.length > 3;
    if (!makeFalse) {
      out.push({ statement: s, isTrue: true });
      return;
    }
    // Noto'g'ri variant: gapdagi mazmunli so'zni boshqa so'zga almashtiramiz
    const words = wordsOf(s).filter((w) => w.length >= 4 && !/^\d+$/.test(w));
    const target = words.sort((a, b) => b.length - a.length)[0];
    if (!target) {
      out.push({ statement: s, isTrue: true });
      return;
    }
    const replacement = keywords.find(
      (k) => foldWord(k) !== foldWord(target) && !foldWord(s).includes(foldWord(k)) && k.length >= 4
    );
    if (!replacement) {
      out.push({ statement: s, isTrue: true });
      return;
    }
    const swapped = s.replace(new RegExp(escapeRe(target), "i"), replacement);
    out.push({ statement: swapped, isTrue: false, reason: `To'g'risi: ${s}` });
  });

  return out;
}

/** Qoidalardan to'g'ri/noto'g'ri o'yini */
function buildRuleTrueFalse(ctx: Ctx): GameItem[] {
  const rules = ctx.tasks.filter((t) => t.kind === "qoida").map((t) => t.text);
  const defs = ctx.defs;
  const out: GameItem[] = [];
  const all = uniq([...rules, ...defs.map((d) => `${d.left} — ${d.right}`)]).slice(0, MAX_ITEMS.truefalse);

  all.forEach((r, i) => {
    const numbered = r.match(/\d{1,5}/);
    if (i % 2 === 1 && numbered) {
      // Sonni almashtirib "noto'g'ri" variant yasaymiz
      const n = Number(numbered[0]);
      const wrong = n * (n > 10 ? 2 : 3);
      out.push({
        statement: r.replace(numbered[0], String(wrong)),
        isTrue: false,
        reason: `To'g'ri javob: ${numbered[0]}.`,
      });
      return;
    }
    out.push({ statement: r, isTrue: true });
  });

  // Ta'riflarni almashtirib noto'g'ri variantlar
  if (defs.length >= 2) {
    for (let i = 0; i < Math.min(2, defs.length - 1); i++) {
      const a = defs[i];
      const b = defs[(i + 1) % defs.length];
      out.push({
        statement: `${a.left} — ${b.right}`,
        isTrue: false,
        reason: `To'g'risi: ${a.left} — ${a.right}`,
      });
    }
  }

  return shuffleSeeded(out, ctx.seed + "rtf").slice(0, MAX_ITEMS.truefalse);
}

/** "X nima?" ko'rinishidagi test */
function buildDefinitionQuiz(ctx: Ctx): GameItem[] {
  const defs = ctx.defs;
  if (defs.length < 3) return [];
  const out: GameItem[] = [];
  for (const d of defs.slice(0, 6)) {
    if (d.right.length < 8 || d.right.length > 140) continue;
    const others = defs
      .filter((x) => foldWord(x.left) !== foldWord(d.left))
      .map((x) => x.right)
      .filter((r) => r.length >= 8 && r.length <= 140);
    if (others.length < 3) continue;
    const opts = buildOptions(d.right, others, ctx.seed + d.left);
    out.push({ question: `"${d.left}" — bu nima?`, options: opts.options, answer: opts.answer });
  }
  return out;
}

/** "Qaysi so'z matnda bor?" testi */
function buildWordPresenceQuiz(ctx: Ctx): GameItem[] {
  const inText = keyphrases(ctx.raw.text, 20).filter((w) => w.length >= 5);
  if (inText.length < 2) return [];

  // Chalg'ituvchi so'zlar — kitobning BOSHQA mavzularidan olinadi
  // (qotib qolgan so'z ro'yxati o'rniga kitobning o'z lug'ati ishlatiladi)
  const topicFold = foldWord(ctx.raw.text);
  const notInText = uniq([
    ...ctx.poolWords,
    ...ctx.otherDefs.map((d) => foldWord(d.left)),
  ]).filter((w) => w.length >= 5 && !topicFold.includes(w) && !inText.map(foldWord).includes(w));

  if (notInText.length < 3) return [];

  const out: GameItem[] = [];
  for (let i = 0; i < Math.min(6, inText.length); i++) {
    const correct = inText[i];
    const distractors = shuffleSeeded(notInText, ctx.seed + correct + i).slice(0, 3);
    const opts = buildOptions(correct, distractors, ctx.seed + "wp" + correct);
    out.push({ question: "Qaysi so'z matnda uchraydi?", options: opts.options, answer: opts.answer, hint: "Matnni eslab qoling!" });
  }
  return out;
}

/** Gaplar tartibini tiklash o'yini */
function buildSentenceOrder(ctx: Ctx): GameItem[] {
  const sentences = unitsOf(ctx.raw.text).filter((s) => wordsOf(s).length >= 4 && s.length <= 140);

  if (sentences.length < 3) return [];

  const out: GameItem[] = [];
  const groups = Math.min(MAX_ITEMS.order, Math.floor(sentences.length / 3));
  for (let gi = 0; gi < groups; gi++) {
    const chunk = sentences.slice(gi * 3, gi * 3 + 3);
    if (chunk.length < 3) break;
    out.push({ prompt: `${gi + 1}-topshiriq: gaplarni matn tartibida joylashtiring`, tokens: chunk });
  }
  return out;
}

/** "Otlar — alifbo/imlo" uchun: to'g'ri yozilgan so'zni tanlash */
function buildSpellingQuiz(ctx: Ctx): GameItem[] {
  const words = keyphrases(ctx.raw.text, 30).filter((w) => w.length >= 5 && /^[a-z']+$/.test(w));
  if (words.length < 2) return [];
  const out: GameItem[] = [];
  for (const w of words.slice(0, 4)) {
    const variants = uniq([
      w,
      w.replace(/(.)\1/, "$1"),
      w.split("").reverse().join("").slice(0, w.length),
      w.replace("o'", "o").replace("g'", "g"),
      w.replace(/i/, "ii"),
    ]).filter((v) => v !== w && v.length >= 3);
    if (variants.length < 3) continue;
    const opts = buildOptions(w, variants.slice(0, 3), ctx.seed + w);
    out.push({ question: "Qaysi so'z to'g'ri yozilgan?", options: opts.options, answer: opts.answer });
  }
  return out;
}


// ---------------------------------------------------------------------------
// YANGI O'YIN TURLARI
//   🎈 pop · 🧩 puzzle · 🔤 missingletter · 🔍 findmistake · 🗂 grouping · 🎟 bingo
// ---------------------------------------------------------------------------

/** So'zni bo'g'inlarga bo'lish (o'zbek tili qoidalariga yaqin evristika) */
export function splitSyllables(word: string): string[] {
  if (word.length < 3) return [word];
  // "o'" va "g'" digraflarini bitta harfga aylantiramiz
  const marked = word
    .replace(/[oO][ʻʼ'’]/g, (m) => (m[0] === "O" ? "Ø" : "ø"))
    .replace(/[gG][ʻʼ'’]/g, (m) => (m[0] === "G" ? "Ğ" : "ğ"));
  const isVowel = (c: string) => "aeiouøØAEIOU".includes(c);
  const chars = [...marked];
  const splits: number[] = [];

  for (let i = 0; i < chars.length; i++) {
    if (!isVowel(chars[i])) continue;
    // unlidan keyingi undoshlar sonini sanaymiz
    let c = 0;
    while (i + 1 + c < chars.length && !isVowel(chars[i + 1 + c])) c++;
    const nextIsVowel = i + 1 + c < chars.length;
    if (!nextIsVowel) continue;
    if (c === 1) splits.push(i + 1); // ki|tob
    else if (c >= 2) splits.push(i + 2); // mak|tab
  }

  const parts: string[] = [];
  let last = 0;
  for (const s of splits) {
    if (s <= last || s >= chars.length) continue;
    parts.push(chars.slice(last, s).join(""));
    last = s;
  }
  parts.push(chars.slice(last).join(""));

  const restore = (t: string) =>
    t.replace(/ø/g, "o'").replace(/Ø/g, "O'").replace(/ğ/g, "g'").replace(/Ğ/g, "G'");
  const out = parts.map(restore).filter((p) => p.length > 0);
  return out.length > 1 ? out : [word];
}

/** 🧩 Bo'laklardan yig'ish — so'z bo'g'inlar yoki bo'laklardan tuziladi */
function buildPuzzleItems(ctx: Ctx, limit: number, mode: "syllable" | "chunk" = "syllable"): GameItem[] {
  const source = uniq([
    ...ctx.keywords,
    ...ctx.defs.map((d) => foldWord(d.left)),
    ...(ctx.glossary.length ? ctx.glossary.map((g) => g.left.toLowerCase()) : []),
  ]);
  const words = source.filter((w) => {
    const base = w.replace(/[^a-zа-яё']/gi, "");
    if (base.length < 4 || base.length > 12) return false;
    if (base.includes(" ") || /\d/.test(base)) return false;
    return true;
  });

  const out: GameItem[] = [];
  for (const w of shuffleSeeded(words, ctx.seed + "pz")) {
    const pieces = mode === "syllable" ? splitSyllables(w) : chunkWord(w, 3);
    if (pieces.length < 2 || pieces.length > 4) continue;
    if (pieces.some((p) => p.length === 0)) continue;
    out.push({
      prompt:
        mode === "syllable"
          ? "Bo'g'inlardan so'zni yig'ing"
          : "Bo'laklardan so'zni tiklang",
      answer: w,
      pieces,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** So'zni teng bo'laklarga bo'lish (bo'g'in chiqmasa) */
function chunkWord(word: string, parts: number): string[] {
  const n = Math.min(parts, Math.max(2, Math.round(word.length / 3)));
  const size = Math.ceil(word.length / n);
  const out: string[] = [];
  for (let i = 0; i < word.length; i += size) out.push(word.slice(i, i + size));
  return out;
}

/** 🔤 Tushib qolgan harf: "k_tob" → kitob */
function buildMissingLetterItems(ctx: Ctx, limit: number): GameItem[] {
  const words = uniq([
    ...ctx.keywords,
    ...(ctx.glossary.length ? ctx.glossary.map((g) => g.left.toLowerCase()) : []),
  ]).filter((w) => /^[a-zа-яё'ʻʼ]{4,12}$/i.test(w) && !w.includes("'"));

  const alphabet = UZ_ALPHABET;
  const out: GameItem[] = [];

  for (const w of shuffleSeeded(words, ctx.seed + "ml")) {
    // ko'pincha unli harfni yashiramiz (imlo uchun muhim)
    const vowelIdx = [...w]
      .map((c, i) => (UZ_VOWELS.includes(c.toLowerCase()) ? i : -1))
      .filter((i) => i > 0);
    const idx = vowelIdx.length ? vowelIdx[Math.floor(vowelIdx.length / 2)] : Math.floor(w.length / 2);
    const letter = w[idx];
    if (!letter) continue;
    const display = w.slice(0, idx) + "_" + w.slice(idx + 1);
    const distractors = shuffleSeeded(
      alphabet.filter((c) => c !== letter.toLowerCase()),
      ctx.seed + letter + idx
    ).slice(0, 3);
    out.push({
      display,
      answer: letter,
      options: shuffleSeeded([letter, ...distractors], ctx.seed + "o" + display),
    });
    if (out.length >= limit) break;
  }
  return out;
}

/** 🔍 Xatoni top: to'g'ri yozilgan so'zni tanlash */
function buildFindMistakeWords(ctx: Ctx, limit: number): GameItem[] {
  const words = uniq(ctx.keywords.concat(ctx.defs.map((d) => foldWord(d.left)))).filter(
    (w) => w.length >= 5 && /^[a-z']+$/.test(w)
  );

  const out: GameItem[] = [];
  for (const w of words.slice(0, limit)) {
    const variants = uniq([
      w.replace(/(.)\1/, "$1"),
      [...w].reverse().join(""),
      w.replace(/[aeiou]/, "i"),
      w.replace("o'", "o").replace("g'", "g"),
      w.slice(0, -1) + w[w.length - 1] + w[w.length - 1],
    ]).filter((v) => v !== w && v.length >= 3);
    if (variants.length < 2) continue;
    const opts = buildOptions(w, variants.slice(0, 3), ctx.seed + w);
    out.push({
      question: "Qaysi so'z to'g'ri yozilgan?",
      options: opts.options,
      answer: opts.answer,
      hint: "Imloga diqqat qiling",
    });
  }
  return out;
}

/** 🔍 Gaplar ichidan to'g'ri yozilganini topish */
function buildFindMistakeSentences(ctx: Ctx, limit: number): GameItem[] {
  const sentences = unitsOf(ctx.raw.text).filter((s) => {
    const n = wordsOf(s).length;
    return n >= 4 && n <= 12 && s.length <= 110;
  });

  const out: GameItem[] = [];
  for (let i = 0; i < sentences.length && out.length < limit; i += 2) {
    const correct = sentences[i];
    const words = correct.replace(/[.!?]+$/, "").split(/\s+/);
    if (words.length < 4) continue;

    // Xato variant: qo'shni so'zlarni almashtiramiz
    const broken = [...words];
    const j = Math.max(0, Math.floor(words.length / 2) - 1);
    [broken[j], broken[j + 1]] = [broken[j + 1], broken[j]];
    const brokenSentence = broken.join(" ") + (correct.match(/[.!?]$/)?.[0] ?? ".");

    if (brokenSentence === correct) continue;
    const opts = buildOptions(correct, [brokenSentence], ctx.seed + "fs" + i);
    if (opts.options.length < 2) continue;
    out.push({
      question: "Qaysi gap to'g'ri tuzilgan?",
      options: opts.options,
      answer: opts.answer,
      hint: "So'zlar tartibiga e'tibor bering",
    });
  }
  return out;
}

const TASK_LABEL = /\b(yozing|toping|ayting|hisoblang|o'qing|to'ldiring|tuzing|tanlang|ajrating|bajaring|tekshiring|javob|savol|misol|masala|mashq|topshiriq|jadval|rasm)\b/i;

/** 🗂 Guruhlarga ajratish — kitobdagi "Guruh: a, b, c" ro'yxatlaridan */
function buildGroupingGame(ctx: Ctx): Game | null {
  const labeled = ctx.lists.filter((l) => {
    const label = l.label?.trim();
    if (!label || label.length < 3 || label.length > 32) return false;
    if (TASK_LABEL.test(label)) return false;
    if (/\d/.test(label)) return false;
    return l.items.length >= 3;
  });
  if (labeled.length < 2) return null;

  // "Hasharotlar" ⊄ "Foydali hasharotlar": umumiy nomni olib tashlab, aniqroqlarini qoldiramiz
  const allLabels = uniq(labeled.map((l) => l.label!.trim()));
  const specific = allLabels.filter(
    (label) => !allLabels.some((other) => other !== label && foldWord(other).includes(foldWord(label)))
  );
  const groups = (specific.length >= 2 ? specific : allLabels).slice(0, 3);
  if (groups.length < 2) return null;

  const items: GameItem[] = [];
  for (const g of groups) {
    const list = labeled.find((l) => l.label!.trim() === g)!;
    for (const it of list.items.slice(0, 4)) {
      items.push({ left: it, right: g });
    }
  }
  if (items.length < 6) return null;

  const game = makeGame(
    "grouping",
    "Guruhlarga ajrat",
    "So'zlarni sudrab (yoki bosib) tegishli guruhga joylang.",
    shuffleSeeded(items, ctx.seed + "gr"),
    ctx,
    2,
    `Kitobdagi ${groups.length} ta ro'yxat asosida`
  );
  if (game) game.groups = groups;
  return game;
}

/** 🎟 Bingo kartasi — mavzu so'zlari/raqamlaridan */
function buildBingoGame(ctx: Ctx, cells = 9): Game | null {
  const pool = uniq([
    ...ctx.keywords,
    ...keyphrases(ctx.raw.text, 26),
    ...(ctx.raw.text.match(/\b\d{1,4}\b/g) ?? []).map(String),
  ]).filter((w) => w.length >= 3);

  if (pool.length < cells) return null;
  const chosen = shuffleSeeded(pool, ctx.seed + "bingo").slice(0, cells);

  const game = makeGame(
    "bingo",
    "Bingo kartasi",
    "Kartani chop eting yoki doskaga chiqaring: o'qituvchi so'z aytadi, o'quvchilar belgilaydi.",
    chosen.map((text) => ({ text })),
    ctx,
    1,
    "Mavzu so'zlari"
  );
  return game;
}

/** 🎈 Balonni ot — to'g'ri javobli balonni yorish (vaqt bilan) */
function buildPopGame(ctx: Ctx): Game | null {
  if (ctx.math.length < 4) return null;
  const items = ctx.math.slice(0, MAX_ITEMS.pop).map((m) => {
    const distractors = numericDistractors(m.answer, 4, ctx.seed + "pop" + m.expression);
    const options = shuffleSeeded([m.answer, ...distractors], ctx.seed + "popo" + m.expression);
    return { expression: `${m.expression} = ?`, answer: m.answer, options };
  });
  return makeGame(
    "pop",
    "Balonni ot",
    "Har bir misol uchun to'g'ri javob yozilgan balonni topib bosing. Vaqt ketmoqda!",
    items,
    ctx,
    2,
    `Kitobdagi ${items.length} ta misol`
  );
}

/** Kitobda "Asar nomi. Muallif" ko'rinishidagi juftliklarni topadi */
export function extractAuthorPairs(text: string, limit = 24): BookLevelPair[] {
  const out: BookLevelPair[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\n+/)) {
    const clean = line.replace(/^\s*\d{1,3}[.)]\s*/, "").trim();
    if (clean.length < 8 || clean.length > 70) continue;
    const m = clean.match(/^([A-ZO'G'SHCH][^.?!]{2,44}?)\.\s+([A-ZO'G'SHCH'][a-zа-я'ʻʼ]+(?:\s+[A-ZO'G'SHCH'][a-zа-я'ʻʼ]+){0,2})\.?$/);
    if (!m) continue;
    const work = m[1].trim();
    const author = m[2].trim();
    if (wordsOf(work).length < 1 || wordsOf(author).length < 2) continue;
    if (/\d/.test(work) || /\d/.test(author)) continue;
    const key = foldWord(work);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ left: work, right: author });
    if (out.length >= limit) break;
  }
  return out;
}

export type { TopicExample };
