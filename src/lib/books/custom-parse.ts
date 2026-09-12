// ============================================================================
// O'qituvchi kiritgan matnni o'yin elementlariga aylantirish (SOF MANTIQ)
//
// Bu modul server va brauzerda bir xil ishlaydi — shuning uchun o'yin muharriri
// matnni darhol, serverga yubormasdan ham tekshirib ko'rsatishi mumkin.
// ============================================================================

import type { GameItem, GameType } from "./types";

// ---------------------------------------------------------------------------
// MATN JOYLASH → O'YIN  (o'qituvchi bir necha qator matn yozib o'yin yasaydi)
// ---------------------------------------------------------------------------

export interface ParsePreview {
  items: GameItem[];
  /** Tushunilmagan qatorlar (o'qituvchiga ko'rsatiladi) */
  problems: string[];
  type: GameType;
}

/**
 * Matnni o'yin elementlariga aylantiradi.
 *
 * Qo'llab-quvvatlanadigan ko'rinishlar:
 *   kitob — book            → juftlik (matching / memory / grouping)
 *   Kitob nima? *bilan*     → savol (quiz): to'g'ri javob *yulduzcha* bilan
 *   Ona — bu ...            → to'g'ri/noto'g'ri (truefalse)
 *   k_tob                   → tushib qolgan harf
 *   bo'g'in lar             → puzzle (bo'laklar probel bilan)
 */
export function parseCustomItems(raw: string, type: GameType): ParsePreview {
  const lines = raw
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  const items: GameItem[] = [];
  const problems: string[] = [];

  const splitPair = (line: string): [string, string] | null => {
    const m = line.match(/^(.{1,60}?)\s*(?:—|–|-{1,2}|=>|:|\|)\s*(.{1,80})$/);
    return m ? [m[1].trim(), m[2].trim()] : null;
  };

  for (const line of lines) {
    switch (type) {
      case "matching":
      case "memory":
      case "grouping": {
        const pair = splitPair(line);
        if (!pair) {
          problems.push(line);
          break;
        }
        items.push({ left: pair[0], right: pair[1] });
        break;
      }

      case "truefalse": {
        // "Matn | to'g'ri" yoki "Matn | noto'g'ri"
        const m = line.match(/^(.{3,200}?)\s*\|\s*(t|to'g'ri|true|ha|1|n|noto'g'ri|false|yo'q|0)\s*$/i);
        if (m) {
          const v = m[2].toLowerCase();
          const isTrue = ["t", "to'g'ri", "true", "ha", "1"].includes(v);
          items.push({ statement: m[1].trim(), isTrue });
          break;
        }
        const pair = splitPair(line);
        if (pair) {
          items.push({ statement: pair[0], isTrue: true });
          problems.push(`"${line}" — to'g'riligi ko'rsatilmagan, "to'g'ri" deb olindi`);
          break;
        }
        items.push({ statement: line, isTrue: true });
        problems.push(`"${line}" — to'g'riligi ko'rsatilmagan, "to'g'ri" deb olindi`);
        break;
      }

      case "fill": {
        // "Gap ___ bilan tugaydi | javob"
        const m = line.match(/^(.{3,220}?)\s*\|\s*(.{1,40})$/);
        if (m) {
          items.push({
            sentence: m[1].trim().replace(/_{2,}/, "_____"),
            answer: m[2].trim(),
            options: [],
          });
          break;
        }
        problems.push(line);
        break;
      }

      case "missingletter": {
        // "k_tob | kitob"  yoki faqat "k_tob" (javob harf ajratilgan joydan olinadi)
        const m = line.match(/^(\S*_\S*)\s*\|\s*(\S+)$/);
        const display = m ? m[1] : line;
        const answer = m ? m[2] : "";
        if (!display.includes("_")) {
          problems.push(line);
          break;
        }
        if (!answer) {
          problems.push(`${line} — javob ko'rsatilmagan (ko'rinish: "k_tob | kitob")`);
          break;
        }
        {
          const idx = display.indexOf("_");
          const letter = answer[idx] ?? "";
          items.push({ display, answer: letter || answer[0] || "", options: [] });
        }
        break;
      }

      case "puzzle": {
        // "ki|tob | kitob" yoki "kitob | ki,tob"
        const m = line.match(/^(.{2,60}?)\s*\|\s*(.{1,60})$/);
        if (!m) {
          problems.push(line);
          break;
        }
        const answer = m[1].trim();
        const pieces = m[2]
          .split(/[,|/+\s]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        if (pieces.length < 2) {
          problems.push(`${line} — kamida 2 bo'lak kerak`);
          break;
        }
        items.push({ prompt: "Bo'laklardan so'zni yig'ing", answer, pieces });
        break;
      }

      case "order": {
        const m = line.match(/^(.{2,90}?)\s*\|\s*(.+)$/);
        if (!m) {
          problems.push(line);
          break;
        }
        const tokens = m[2]
          .split(/[,|]+/)
          .map((t) => t.trim())
          .filter(Boolean);
        if (tokens.length < 2) {
          problems.push(`${line} — kamida 2 element kerak`);
          break;
        }
        items.push({ prompt: m[1].trim(), tokens });
        break;
      }

      case "math":
      case "pop": {
        // "24 + 38 = 62"  (javobni tizim o'zi tekshiradi)
        const m = line.match(/^(\d{1,4})\s*([+\-:×*·x/])\s*(\d{1,4})\s*(?:=\s*(\d{1,6}))?$/);
        if (!m) {
          problems.push(line);
          break;
        }
        const a = Number(m[1]);
        const b = Number(m[3]);
        const op = m[2] === "x" ? "×" : m[2] === "/" ? ":" : m[2];
        let answer: number;
        if (op === "+") answer = a + b;
        else if (op === "-") answer = a - b;
        else if (op === "×" || op === "*" || op === "·") answer = a * b;
        else answer = b === 0 ? NaN : a / b;
        if (!Number.isFinite(answer) || answer < 0) {
          problems.push(`${line} — natija manfiy yoki bo'lish nolga`);
          break;
        }
        items.push({ expression: `${a} ${op} ${b} = ?`, answer, options: [answer] });
        break;
      }

      case "bingo": {
        // Har bir qator — bitta karta matni
        items.push({ text: line });
        break;
      }

      default: {
        // quiz / findmistake: "Savol | to'g'ri | xato1 | xato2 | xato3"
        const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
        if (parts.length < 2) {
          problems.push(line);
          break;
        }
        if (parts.length >= 3) {
          const [question, correct, ...wrong] = parts;
          const options = [correct, ...wrong].slice(0, 4);
          items.push({ question, options, answer: 0 });
        } else {
          // 2 qism: savol | javob — qolgan variantlarni keyin to'ldiramiz
          items.push({ question: parts[0], options: [parts[1]], answer: 0 });
        }
      }
    }
  }

  return { items, problems, type };
}


/** O'yin turi bo'yicha matn ko'rinishining namunasini beradi */
export function formatHint(type: GameType): string {
  switch (type) {
    case "matching":
    case "memory":
      return "kitob — book\nmaktab — school\nquyosh — sun";
    case "grouping":
      return "Guruh nomini yuqoridagi maydonda yozing.\nolma — Mevali daraxtlar\nuzum — Mevali daraxtlar\nkartoshka — Sabzavotlar";
    case "truefalse":
      return "Quyosh — issiqlik manbai | to'g'ri\nSuv 100 gradusda muzlaydi | noto'g'ri";
    case "fill":
      return "Kitob — bilim manbai | manbai\nBahor keldi, qorlar ___ | eridi";
    case "missingletter":
      return "k_tob | kitob\nm_ktab | maktab";
    case "puzzle":
      return "kitob | ki,tob\nmaktab | mak,tab";
    case "order":
      return "Gapni tartibla | Bugun | havo | issiq";
    case "math":
    case "pop":
      return "24 + 38 = 62\n350 - 125 = 225";
    case "bingo":
      return "olma\nuzum\nanor\nnok\nbehi\nshaftoli\nanjir\nxurmo\nolcha";
    default:
      return "Poytaxti qaysi shahar? | Toshkent | Samarqand | Buxoro | Namangan\nEng katta okean? | Tinch okeani | Atlantika | Hind okeani | Shimoliy muz okeani";
  }
}

// ---------------------------------------------------------------------------
// NORMALLASHTIRISH — elementlarni o'yin interfeysi kutgan ko'rinishga keltiradi
// ---------------------------------------------------------------------------

const LATIN_LETTERS = "abcdefgijklmnopqrstuvxyz".split("");

/** Oddiy so'zni bo'g'inlarga bo'lish (custom-parse uchun yengil variant) */
export function simpleSyllables(word: string): string[] {
  if (word.length < 4) return [word];
  const isVowel = (c: string) => "aeiou".includes(c.toLowerCase());
  const chars = [...word];
  const splits: number[] = [];
  for (let i = 0; i < chars.length; i++) {
    if (!isVowel(chars[i])) continue;
    let c = 0;
    while (i + 1 + c < chars.length && !isVowel(chars[i + 1 + c])) c++;
    if (i + 1 + c >= chars.length) continue;
    splits.push(i + (c >= 2 ? 2 : 1));
  }
  const parts: string[] = [];
  let last = 0;
  for (const sp of splits) {
    if (sp <= last || sp >= chars.length) continue;
    parts.push(chars.slice(last, sp).join(""));
    last = sp;
  }
  parts.push(chars.slice(last).join(""));
  return parts.filter(Boolean).length > 1 ? parts.filter(Boolean) : [word];
}

function rnd(seed: number) {
  let s = (seed % 233280) + 1;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/** Variantlari yetmagan elementlarni to'ldiradi va turlar bo'yicha normallashtiradi */
export function normalizeItems(items: GameItem[], type: GameType, seed = 7): GameItem[] {
  const rand = rnd(seed * 31 + items.length);

  // Barcha matnli javoblar — chalg'ituvchilar uchun manba
  const allTexts = items
    .map((it) => {
      const anyIt = it as unknown as Record<string, unknown>;
      return String(anyIt.answer ?? anyIt.right ?? anyIt.text ?? "").trim();
    })
    .filter((x) => x.length > 0 && x.length < 40);

  const pickDistractors = (correct: string, count: number): string[] => {
    const out: string[] = [];
    const used = new Set<string>([correct.toLowerCase()]);
    const push = (cand: string) => {
      const c = cand.trim();
      if (!c || used.has(c.toLowerCase()) || out.length >= count) return;
      used.add(c.toLowerCase());
      out.push(c);
    };

    // 1) Boshqa savollarning javoblaridan olamiz
    const pool = allTexts.filter((t) => t.toLowerCase() !== correct.toLowerCase());
    const shuffled = [...pool].sort(() => rand() - 0.5);
    for (const cand of shuffled) {
      if (out.length >= count) break;
      if (Math.abs(cand.length - correct.length) > 12) continue;
      push(cand);
    }

    // 2) Son bo'lsa — yaqin sonlar
    const num = Number(correct.replace(",", "."));
    if (Number.isFinite(num) && /^-?\d+([.,]\d+)?$/.test(correct.trim())) {
      const deltas = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10];
      const step = num > 500 ? 50 : num > 100 ? 10 : num > 20 ? 5 : 1;
      let guard = 0;
      while (out.length < count && guard++ < 80) {
        const d = deltas[Math.floor(rand() * deltas.length)] * step;
        const cand = Math.round((num + d) * 100) / 100;
        if (cand >= 0) push(String(cand).replace(".", ","));
      }
    }

    // 3) So'z bo'lsa — o'xshash variantlar (harf almashtirish)
    if (out.length < count && /^[a-zа-яё'ʻʼ]+$/i.test(correct.trim())) {
      const mutations = [
        (w: string) => w.slice(0, -1) + (w.slice(-1) === "i" ? "a" : "i"),
        (w: string) => w.replace(/[aeiou]/gi, (m) => (m.toLowerCase() === "a" ? "o" : "a")),
        (w: string) => w + "lar",
        (w: string) => w.replace(/(.)\1/, "$1"),
        (w: string) => (w.length > 4 ? w.slice(0, -1) : w),
        (w: string) => w.replace(/[oʻʼ']/g, ""),
      ];
      for (const m of mutations) {
        if (out.length >= count) break;
        try {
          push(m(correct));
        } catch {
          /* e'tiborsiz */
        }
      }
    }

    // 4) Umumiy variantlar
    const generic = ["To'g'ri javob yo'q", "Boshqa javob", "Aniqlanmagan", "Hisoblanmadi"];
    for (const g of generic) {
      if (out.length >= count) break;
      push(g);
    }

    return out;
  };

  return items.map((it) => {
    switch (type) {
      case "missingletter": {
        const m = it as { display: string; answer: string; options: string[] };
        const opts = Array.isArray(m.options) && m.options.length >= 4
          ? m.options
          : (() => {
              const wrong = LATIN_LETTERS.filter((c) => c !== m.answer.toLowerCase());
              const picked: string[] = [];
              while (picked.length < 3 && wrong.length) {
                const c = wrong.splice(Math.floor(rand() * wrong.length), 1)[0];
                if (!picked.includes(c)) picked.push(c);
              }
              return [m.answer, ...picked].sort(() => rand() - 0.5);
            })();
        return { ...m, options: opts } as GameItem;
      }

      case "math":
      case "pop": {
        const m = it as { expression: string; answer: number; options: number[] };
        if (Array.isArray(m.options) && m.options.length >= 4) return it;
        const a = Number(m.answer);
        const deltas = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10];
        const opts = new Set<number>([a]);
        let guard = 0;
        while (opts.size < 4 && guard++ < 60) {
          const d = deltas[Math.floor(rand() * deltas.length)];
          const cand = a + d * (a > 200 ? 10 : a > 50 ? 5 : 1);
          if (cand !== a && cand >= 0) opts.add(Math.round(cand));
        }
        const options = [...opts].sort(() => rand() - 0.5);
        return { ...m, options } as GameItem;
      }

      case "fill": {
        const f = it as { sentence: string; answer: string; options: string[] };
        if (Array.isArray(f.options) && f.options.length >= 4) return it;
        const options = [f.answer, ...pickDistractors(f.answer, 3)].sort(() => rand() - 0.5);
        return { ...f, options } as GameItem;
      }

      case "puzzle": {
        const pz = it as { prompt: string; answer: string; pieces: string[] };
        const pieces =
          Array.isArray(pz.pieces) && pz.pieces.length >= 2 ? pz.pieces : simpleSyllables(pz.answer);
        return { ...pz, prompt: pz.prompt || "Bo'laklardan so'zni yig'ing", pieces } as GameItem;
      }

      case "quiz":
      case "findmistake": {
        const q = it as { question: string; options: string[]; answer: number };
        if (!Array.isArray(q.options)) return it;
        const correct = q.options[q.answer ?? 0];
        if (q.options.length >= 4 || !correct) return it;
        const options = [correct, ...pickDistractors(correct, 4 - q.options.length)];
        return { ...q, options, answer: 0 } as GameItem;
      }

      default:
        return it;
    }
  });
}

/** Eski nom bilan moslik uchun */
export const fillOptions = normalizeItems;
