// ============================================================================
// Kitob matnidan o'quv materiallarini ajratib olish
//   • arifmetik misollar (20 · 3 = 60)
//   • masalalar / topshiriqlar / savollar
//   • qoidalar va ta'riflar ("Ot — bu ...")
//   • lug'at juftliklari (apple — olma)
//   • o'lchov birliklari (1 km = 1000 m)
// ============================================================================

import type { ExampleKind, SubjectKey, TopicExample } from "./types";
import { splitSentences, splitLines, stripNumbering, numberedItemNumber, wordsOf, foldWord } from "./text";

// ------------------------------ 1. Arifmetika -------------------------------

export interface MathExpr {
  expression: string;
  operator: string;
  a: number;
  b: number;
  answer: number;
  /** Kitobda yozilgan javob (bo'lsa) */
  printed?: number;
}

const MATH_RE = /(\d{1,4})\s*([+\-—:×·*÷])\s*(\d{1,4})\s*(?:=\s*(\d{1,6}))?/g;

/** Matndagi arifmetik misollarni topadi */
export function extractMath(text: string, limit = 40): MathExpr[] {
  const out: MathExpr[] = [];
  const seen = new Set<string>();
  MATH_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MATH_RE.exec(text))) {
    const a = Number(m[1]);
    const b = Number(m[3]);
    const op = m[2];
    const printed = m[4] != null ? Number(m[4]) : undefined;

    // "-" chiziqcha bo'lishi mumkin: faqat natija mantiqiy bo'lsa qabul qilamiz
    let answer: number;
    switch (op) {
      case "+":
        answer = a + b;
        break;
      case "-":
      case "—":
        if (a < b) continue;
        answer = a - b;
        break;
      case "×":
      case "·":
      case "*":
        answer = a * b;
        break;
      case ":":
      case "÷":
        if (b === 0 || a % b !== 0) continue;
        answer = a / b;
        break;
      default:
        continue;
    }

    const truth = printed != null ? printed : answer;
    if (!Number.isFinite(truth) || truth < 0 || truth > 1_000_000) continue;
    if (printed != null && printed !== answer) continue; // noto'g'ri o'qilgan qatorni tashlaymiz
    if (a > 10000 || b > 10000) continue;

    const expression = `${a} ${op} ${b}`;
    if (seen.has(expression)) continue;
    seen.add(expression);
    out.push({ expression, operator: op, a, b, answer: truth, printed });
    if (out.length >= limit) break;
  }
  return out;
}

// ------------------------------- 2. Ta'riflar -------------------------------

export interface Pair {
  left: string;
  right: string;
}

const DEF_LINE = /^(.{2,48}?)\s*(?:—|–|--|:)\s+(.{4,220})$/;
const DEF_SENTENCE = /^(.{2,48}?)\s+(?:—|bu)\s+(.{4,220})$/;

const BAD_TERM = /^(misol|masala|mashq|topshiriq|savol|javob|qoida|eslatma|yodda|esda|jadval|rasm|chizma|1|2|3)\b/i;

/** Topshiriq fe'llari — bunday qatorlar "ta'rif" emas */
const TASK_VERB =
  /\b(yozing|toping|ayting|hisoblang|o'qing|ko'chiring|to'ldiring|tuzing|belgilang|taqqoslang|aniqlang|bajaring|tekshiring|javob bering|davom ettiring|ochib bering|tenglashtiring|qo'ying|sanang|eslab qoling|ifodalang|tanlang|ajrating|keltiring|aytib bering|hisoblab)\b/i;

/** "Termin — izoh" juftliklarini topadi (qoida, ta'rif, lug'at) */
export function extractDefinitions(text: string, limit = 30): Pair[] {
  const out: Pair[] = [];
  const seen = new Set<string>();

  const push = (left: string, right: string) => {
    const l = left.replace(/^[\d\s.)-]+/, "").trim();
    const r = right.trim();
    if (!l || !r) return;
    if (BAD_TERM.test(l)) return;
    if (TASK_VERB.test(l)) return;
    if (wordsOf(l).length > 5) return;
    if (l.length > 48) return;
    if (/[.!?]$/.test(l)) return;
    const key = foldWord(l);
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ left: l, right: r.replace(/\s+/g, " ") });
  };

  for (const line of splitLines(text)) {
    const clean = stripNumbering(line);
    if (clean.length < 8 || clean.length > 260) continue;
    const m = clean.match(DEF_LINE);
    if (m) push(m[1], m[2]);
  }

  if (out.length < 3) {
    for (const s of splitSentences(text)) {
      const m = s.match(DEF_SENTENCE);
      if (m) push(m[1], m[2]);
    }
  }

  return out.slice(0, limit);
}

// ---------------------------- 3. O'lchov birliklari --------------------------

const UNIT_RE =
  /(\d{1,5})\s*(km|m|dm|sm|mm|kg|g|t|s|min|soat|kun|yil|oy|mm²|sm²|m²|km²|ml|l|gradus|°)\s*(?:=|—|–|-)\s*(\d{1,7})\s*(km|m|dm|sm|mm|kg|g|t|s|min|soat|kun|yil|oy|mm²|sm²|m²|km²|ml|l|gradus|°)/gi;

/** "1 km = 1000 m" ko'rinishidagi munosabatlarni topadi */
export function extractUnitPairs(text: string, limit = 12): Pair[] {
  const out: Pair[] = [];
  const seen = new Set<string>();
  UNIT_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = UNIT_RE.exec(text))) {
    const left = `${m[1]} ${m[2]}`;
    const right = `${m[3]} ${m[4]}`;
    const key = `${left}->${right}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ left, right });
    if (out.length >= limit) break;
  }
  return out;
}

// ------------------------------- 4. Lug'atlar -------------------------------

const LATIN_WORD = /^[A-Za-z][A-Za-z' -]{1,22}$/;
const UZ_WORD = /^[a-zA-Zа-яА-ЯёЁʻʼ''-][a-zA-Zа-яА-ЯёЁʻʼ'\s-]{1,26}$/;

/**
 * Chet tili darsliklaridagi "apple — olma" juftliklarini topadi.
 * Shuningdek jadval ko'rinishidagi "so'z: tarjima" qatorlarini ham oladi.
 */
export function extractGlossary(text: string, limit = 40): Pair[] {
  const out: Pair[] = [];
  const seen = new Set<string>();

  for (const line of splitLines(text)) {
    const clean = stripNumbering(line).replace(/[.;]$/, "").trim();
    if (clean.length < 6 || clean.length > 90) continue;
    const m = clean.match(/^(.{1,30}?)\s*(?:—|–|-|:)\s*(.{1,30})$/);
    if (!m) continue;
    const left = m[1].trim();
    const right = m[2].trim();
    if (!LATIN_WORD.test(left)) continue;
    if (!UZ_WORD.test(right)) continue;
    if (!/[a-zA-Z]/.test(right)) continue;
    if (wordsOf(left).length > 3 || wordsOf(right).length > 4) continue;
    // ikkala tomon ham bir xil yozuvda bo'lsa (masalan "cat - cat") — tashlaymiz
    if (foldWord(left) === foldWord(right)) continue;
    const key = foldWord(left);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ left, right });
    if (out.length >= limit) break;
  }
  return out;
}

// ------------------------- 5. Topshiriq / masalalar -------------------------

const TASK_MARKERS =
  /\b(misol|misollarni|masala|masalani|mashq|topshiriq|topshiriqni|savol|savollarga|javob|yozing|hisoblang|toping|ayting|o'qing|ko'chiring|to'ldiring|tuzing|belgilang|taqqoslang|aniqlang|bajaring|tekshiring|eslab|gap tuzing)\b/i;

const RULE_MARKERS =
  /^(qoida|eslatma|yodda tuting|esda tuting|ta'rif|ta'rifi|shuni bilish kerakki|muhim)\b/i;

export interface TaskLine {
  kind: ExampleKind;
  text: string;
  page: number;
  number?: number;
}

/** Matndan topshiriq/masala/qoida qatorlarini ajratadi */
export function extractTasks(
  pages: Array<{ page: number; text: string }>,
  subject: SubjectKey,
  limit = 60
): TaskLine[] {
  const out: TaskLine[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    const lines = splitLines(p.text);
    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      if (raw.length < 8) continue;

      const num = numberedItemNumber(raw);
      const clean = stripNumbering(raw);
      if (clean.length < 8 || clean.length > 320) continue;

      let kind: ExampleKind | null = null;
      if (RULE_MARKERS.test(clean)) kind = "qoida";
      else if (/^\d+\s*[+\-:×·*]\s*\d+/.test(clean) || /(\d+\s*[+\-:×·*]\s*\d+\s*=)/.test(clean))
        kind = "arifmetika";
      else if (clean.endsWith("?") && clean.length < 200) kind = "savol";
      else if (/\b(masala|masalani)\b/i.test(clean)) kind = "masala";
      else if (num != null && (TASK_MARKERS.test(clean) || subject === "matematika")) {
        // Raqamlangan qatorlar ko'p darsliklarda topshiriq bo'ladi
        kind = TASK_MARKERS.test(clean) ? "topshiriq" : wordsOf(clean).length >= 5 ? "masala" : null;
      } else if (TASK_MARKERS.test(clean) && wordsOf(clean).length >= 4) {
        kind = "topshiriq";
      }

      if (!kind) continue;
      const key = foldWord(clean).slice(0, 80);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({ kind, text: clean, page: p.page, number: num ?? undefined });
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ------------------------------- 6. Ro'yxatlar ------------------------------

export interface ListGroup {
  /** "Mevali daraxtlar: olma, nok, ..." — guruh nomi */
  label?: string;
  items: string[];
  page: number;
}

/** Vergul bilan ajratilgan ro'yxatlarni topadi (o'yin uchun material) */
export function extractLists(pages: Array<{ page: number; text: string }>, limit = 20): ListGroup[] {
  const out: ListGroup[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    for (const line of splitLines(p.text)) {
      const clean = stripNumbering(line).replace(/\s+/g, " ");
      if (clean.length < 12 || clean.length > 300) continue;

      const m = clean.match(/^(.{3,60}?)\s*[:—-]\s*(.+)$/);
      const label = m ? m[1].trim() : undefined;
      const body = m ? m[2] : clean;
      if (!body.includes(",")) continue;

      const items = body
        .split(/[,;]/)
        .map((s) => s.replace(/[.!?]+$/, "").trim())
        .filter((s) => s.length >= 1 && s.length <= 34 && wordsOf(s).length <= 4);

      if (items.length < 4) continue;
      // Faqat sonlardan iborat ro'yxatlar boshqa o'yinlarda ishlatiladi
      if (items.every((i) => /^\d+$/.test(i))) continue;
      const key = items.slice(0, 3).join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ label, items: items.slice(0, 10), page: p.page });
      if (out.length >= limit) break;
    }
  }
  return out;
}

// ------------------------- 7. To'ldirish topshiriqlari -----------------------

export interface ClozeCandidate {
  /** "___" bilan belgilangan gap */
  sentence: string;
  answer: string;
  page: number;
}

const BLANK_RE = /(_{2,}|\.{3,}|…)/;

/** Darslikdagi "nuqtalar o'rniga ... qo'ying" topshiriqlarini topadi */
export function extractBlanks(
  pages: Array<{ page: number; text: string }>,
  limit = 40
): ClozeCandidate[] {
  const out: ClozeCandidate[] = [];
  const seen = new Set<string>();

  for (const p of pages) {
    for (const sentence of splitSentences(p.text.replace(/\n+/g, " "))) {
      if (!BLANK_RE.test(sentence)) continue;
      if (sentence.length < 12 || sentence.length > 220) continue;

      // Javob qavs ichida berilgan bo'lishi mumkin: "Kitob — (bilim) manbasi"
      const inParens = sentence.match(/\(([^)]{2,30})\)/);
      const parts = sentence.split(BLANK_RE);
      const beforeAfter = parts.filter((x) => x && !BLANK_RE.test(x));
      if (!beforeAfter.length) continue;

      let answer = inParens ? inParens[1].trim() : "";
      if (!answer) continue; // javobsiz bo'sh joy — o'yin uchun yaroqsiz
      if (wordsOf(answer).length > 3) continue;

      const sentenceText = sentence
        .replace(/\([^)]*\)/, "___")
        .replace(BLANK_RE, "___")
        .replace(/\s+/g, " ")
        .trim();

      const key = foldWord(sentenceText).slice(0, 70);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ sentence: sentenceText, answer, page: p.page });
      if (out.length >= limit) break;
    }
  }
  return out;
}

// ------------------------------ Yordamchi: misollar -------------------------

let exampleCounter = 0;

export function toExamples(tasks: TaskLine[]): TopicExample[] {
  return tasks.map((t) => ({
    id: `ex${++exampleCounter}`,
    kind: t.kind,
    text: t.text,
    page: t.page,
  }));
}
