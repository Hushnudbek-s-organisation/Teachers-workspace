// ============================================================================
// Matn bilan ishlash yordamchilari (kitob tahlili uchun)
//   • PDF'dan olingan "xom" matnni tozalash
//   • gaplarga / so'zlarga bo'lish
//   • kalit so'zlarni aniqlash
//   • takrorlanuvchan tasodifiy sonlar (deterministik o'yinlar uchun)
// ============================================================================

// ------------------------------- Normalizatsiya -----------------------------

/**
 * PDF'dan olingan matnni tozalaydi:
 *  - yumshoq defis (soft hyphen) va buzilgan qator ko'chirishlarni tiklaydi
 *  - apostrof variantlarini birlashtiradi (ʻ ʼ ‘ ’ ` → ')
 *  - qo'shtirnoqlarni birlashtiradi (" " „ “ ” → ")
 *  - faqat raqamdan iborat qatorlarni (sahifa raqami) olib tashlaydi
 */
export function cleanExtractedText(raw: string): string {
  let t = raw.replace(/\r\n?/g, "\n");
  t = t.replace(/\u00AD/g, ""); // soft hyphen
  // "so'z-\nning" ko'rinishidagi bo'linishni tiklash (o'zbek/rus lotin)
  t = t.replace(/([A-Za-zА-Яа-яЁёʻʼ''-])-\n[ \t]*([a-zа-яёʻʼ'])/g, "$1$2");
  t = t.replace(/[ʻʼ‘’`´]/g, "'");
  t = t.replace(/[“”„«»]/g, '"');
  t = t.replace(/[–—−]/g, "—");
  t = t.replace(/\u00A0/g, " ");

  const lines = t.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim());
  const out: string[] = [];
  for (const line of lines) {
    // Sahifa raqami: "12", "- 12 -", "12-bet"
    if (/^[-–—\s]*\d{1,4}[-–—\s]*$/.test(line)) continue;
    if (/^\d{1,3}\s*-?\s*(bet|sahifa|page)?\.?$/i.test(line)) continue;
    // Faqat tinish belgilaridan iborat qator
    if (/^[.,;:!?•·\-–—_=*]+$/.test(line)) continue;
    out.push(line);
  }

  let cleaned = out.join("\n");
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  return cleaned.trim();
}

/** Qator boshidagi raqamlashni olib tashlaydi: "12. Matn" → "Matn" */
export function stripNumbering(line: string): string {
  return line
    .replace(/^\s*\(?\d{1,3}[.)]\s*/, "")
    .replace(/^\s*[•·▪–—]\s*/, "")
    .replace(/^\s*[a-ya-h]\)\s*/i, "")
    .trim();
}

/** Qator raqamlangan topshiriqmi? → raqamni qaytaradi */
export function numberedItemNumber(line: string): number | null {
  const m = line.match(/^\s*\(?(\d{1,3})[.)]\s+\S/);
  return m ? Number(m[1]) : null;
}

/** Taqqoslash uchun so'zni "yassilash": kichik harf, apostrof bir xil */
export function foldWord(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ʻʼ‘’`´']/g, "'")
    .replace(/[^a-zа-яё0-9'\s]/gi, "")
    .trim();
}

export function sameWord(a: string, b: string): boolean {
  return foldWord(a) === foldWord(b);
}

// ---------------------------------- Gaplar ----------------------------------

const SENTENCE_END = /([.!?…]+)(\s|$)/g;

/** Matnni gaplarga bo'ladi (qisqartmalar va raqamlarni hisobga oladi) */
export function splitSentences(text: string): string[] {
  const t = text.replace(/\n+/g, " ").replace(/\s{2,}/g, " ").trim();
  if (!t) return [];
  const parts: string[] = [];
  let last = 0;
  SENTENCE_END.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SENTENCE_END.exec(t))) {
    // "3." yoki "1.2" kabi raqamli nuqtalarni gap oxiri deb hisoblamaymiz
    const before = t.slice(Math.max(0, m.index - 1), m.index + 1);
    if (/^\d[.)]$/.test(before) && m[1] === ".") continue;
    const end = m.index + m[1].length;
    const chunk = t.slice(last, end).trim();
    if (chunk) parts.push(chunk);
    last = end;
  }
  const tail = t.slice(last).trim();
  if (tail) parts.push(tail);
  return parts.filter((s) => s.length > 1);
}

/** Qatorlarga bo'lish (bo'sh qatorlarni tashlab) */
export function splitLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

// ---------------------------------- So'zlar ---------------------------------

export const STOPWORDS = new Set<string>(
  (
    "va ham bilan uchun bu shu o'sha u bu men sen biz siz ular u lar bir ikki " +
    "yana juda ham oz ko'p kop eng yoki ammo lekin chunki agar esa edi ekan emas " +
    "bor yo'q yoq kerak mumkin kerakmi qanday qanaqa nima nega kim qachon qayerda " +
    "qaysi nechta shunday bunday mazkur quyidagi yuqoridagi keyin oldin orasida " +
    "ustida ostida ichida tashqarida haqida to'g'risida deb degan deydi dedi " +
    "the a an and or of to in is are was were be been for on at with by from as it " +
    "this that these those he she they we you i not no yes do does did have has had " +
    "и в во не на что он она оно они мы вы я ты это а но да для из к с по о у же бы " +
    "the your you're"
  ).split(/\s+/)
);

/** Matndan mazmunli so'zlarni ajratadi */
export function wordsOf(text: string): string[] {
  return text
    .split(/[^A-Za-zА-Яа-яЁё0-9'ʻʼ]+/)
    .filter((w) => w.length > 1);
}

/** Kalit so'zlar: eng ko'p uchraydigan mazmunli so'zlar + ikki so'zli birikmalar */
export function keyphrases(text: string, limit = 12): string[] {
  const words = wordsOf(text)
    .map((w) => foldWord(w))
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w) && !/^\d+$/.test(w));

  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);

  const sorted = [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([w]) => w);

  const out: string[] = [];
  for (const w of sorted) {
    if (out.length >= limit) break;
    out.push(w);
  }
  return out;
}

/** Matndagi eng uzun gaplar (o'qish/o'yin uchun material) */
export function longestSentences(text: string, minWords = 5, limit = 10): string[] {
  return splitSentences(text)
    .map((s) => ({ s, n: wordsOf(s).length }))
    .filter((x) => x.n >= minWords)
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map((x) => x.s);
}

/** Gapdan mazmunli so'zni tanlash (bo'sh joy o'yinlari uchun) */
export function pickClozableWord(sentence: string, minLen = 5): string | null {
  const cands = wordsOf(sentence)
    .map((w) => w.replace(/[^\w'ʻʼ]/g, ""))
    .filter((w) => w.length >= minLen && !STOPWORDS.has(foldWord(w)) && !/^\d+$/.test(w));
  if (!cands.length) return null;
  // eng uzuni — eng "ma'noli" so'z
  return cands.sort((a, b) => b.length - a.length)[0];
}

// ------------------------------ Deterministik RNN ---------------------------

/** String'dan 32-bitli seed */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — kichik, tez, takrorlanuvchan generator */
export function makeRng(seed: string | number) {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seed'ga bog'liq aralashtirish (Fisher–Yates) */
export function shuffleSeeded<T>(arr: readonly T[], seed: string | number): T[] {
  const rng = makeRng(seed);
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Takrorlanmas tasodifiy tanlov */
export function pickSeeded<T>(arr: readonly T[], count: number, seed: string | number): T[] {
  return shuffleSeeded(arr, seed).slice(0, count);
}

// ------------------------------- Kichik util --------------------------------

export function uniq<T>(arr: readonly T[]): T[] {
  return [...new Set(arr)];
}

export function titleCaseUz(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** "1 000", "1,5" → son */
export function parseNumber(s: string): number | null {
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  return Number(cleaned);
}

/** Sonni chiroyli ko'rsatish */
export function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ",");
}

/** Javoblar uchun "yaqin" lekin noto'g'ri sonlar */
export function numericDistractors(answer: number, count = 3, seed = "d"): number[] {
  const out = new Set<number>();
  const rng = makeRng(`${seed}:${answer}`);
  const deltas = [-10, -5, -3, -2, -1, 1, 2, 3, 5, 10, 20, 100];
  let guard = 0;
  while (out.size < count && guard++ < 60) {
    const d = deltas[Math.floor(rng() * deltas.length)];
    const scale = answer > 200 ? 10 : answer > 50 ? 5 : 1;
    const cand = answer + d * scale;
    if (cand !== answer && cand >= 0 && Number.isFinite(cand)) out.add(Math.round(cand));
  }
  let k = 1;
  while (out.size < count) out.add(answer + k++ * 7);
  return [...out];
}
