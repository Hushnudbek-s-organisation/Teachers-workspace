// ============================================================================
// Kitobni mavzularga (bo'limlarga) bo'lish
//
// Uch xil strategiya, ishonchlilik tartibida:
//   1) MUNDARIJA  — kitobning "Mundarija" sahifasidagi "Mavzu .... 12" qatorlari
//   2) SARLAVHA   — matn ichidagi "12-MAVZU", "1-dars", KATTA HARFLI sarlavhalar
//   3) FALLBACK   — sahifa o'lchami bo'yicha bo'lish (har doim ishlaydi)
// ============================================================================

import { cleanExtractedText, foldWord, splitLines, stripNumbering } from "./text";

export interface BookPage {
  /** 1 dan boshlanadigan PDF sahifa raqami */
  page: number;
  text: string;
}

export interface RawTopic {
  title: string;
  section?: string;
  pageStart: number;
  pageEnd: number;
  text: string;
  source: "toc" | "heading" | "fallback";
}

export interface SegmentReport {
  strategy: "toc" | "heading" | "fallback";
  topics: number;
  pages: number;
  chars: number;
  scannedPdf: boolean;
  notes: string[];
}

// ---------------------------------------------------------------------------
// 1) Mundarijani o'qish
// ---------------------------------------------------------------------------

export interface TocEntry {
  title: string;
  /** Kitobda bosilgan sahifa raqami (null = bo'lim sarlavhasi) */
  page: number | null;
  /** Bo'lim (chapter) nomi */
  section?: string;
}

/** "Mavzu nomi .......... 12" ko'rinishidagi qatorlar */
const TOC_LINE = /^(.{3,90}?)[\s.·•·]{2,}(\d{1,4})\s*$/;

/** Mundarija sahifalarini aniqlaydi (kamida 2 ta "nuqtali" qator bo'lgan betlar) */
export function findTocPages(bookPages: BookPage[], maxScanPages = 24): Set<number> {
  const out = new Set<number>();
  for (const p of bookPages.slice(0, maxScanPages)) {
    let hits = 0;
    for (const line of splitLines(cleanExtractedText(p.text))) {
      if (TOC_LINE.test(line)) hits++;
    }
    if (hits >= 2) out.add(p.page);
  }
  return out;
}

export function parseToc(bookPages: BookPage[], maxScanPages = 24): TocEntry[] {
  const scan = bookPages.slice(0, maxScanPages);
  const candidates: Array<{ title: string; page: number; atPage: number }> = [];

  for (const p of scan) {
    const rawLines = splitLines(cleanExtractedText(p.text));
    // Mundarijada sarlavha bir qatorda, sahifa raqami keyingi qatorda bo'lsa - birlashtiramiz
    const lines: string[] = [];
    for (let i = 0; i < rawLines.length; i++) {
      const cur = rawLines[i];
      const next = rawLines[i + 1];
      if (/[.\s]{4,}$/.test(cur) && next && /^\d{1,4}$/.test(next.trim())) {
        lines.push(`${cur.trim()} ${next.trim()}`);
        i++;
      } else {
        lines.push(cur);
      }
    }
    for (const raw of lines) {
      const m = raw.match(TOC_LINE);
      if (!m) continue;
      const title = m[1].replace(/[.·•\s]+$/, "").trim();
      const page = Number(m[2]);
      if (title.length < 3 || /^\d+$/.test(title)) continue;
      if (page < 1 || page > bookPages.length + 25) continue;
      if (foldWord(title).length < 3) continue;
      candidates.push({ title, page, atPage: p.page });
    }
  }

  if (candidates.length < 4) return [];

  // Sahifa raqamlari o'sib borishi kerak (kamida 60% hollarda)
  let increasing = 0;
  for (let i = 1; i < candidates.length; i++) {
    if (candidates[i].page >= candidates[i - 1].page) increasing++;
  }
  if (increasing / Math.max(1, candidates.length - 1) < 0.6) return [];

  // Katta harfli bo'lim sarlavhalarini aniqlash (sahifa raqamisiz qatorlar)
  const sectionByAtPage = new Map<number, string[]>();
  for (const p of scan) {
    const lines = splitLines(cleanExtractedText(p.text));
    const sections: string[] = [];
    for (const line of lines) {
      if (TOC_LINE.test(line)) continue;
      const t = stripNumbering(line);
      const isCaps =
        t.length >= 5 &&
        t.length <= 70 &&
        /[A-ZO'G'SHCH]/.test(t) &&
        t === t.toUpperCase() &&
        /[A-Z]/.test(t) &&
        !/\d{2,}/.test(t);
      if (isCaps) sections.push(t);
    }
    if (sections.length) sectionByAtPage.set(p.page, sections);
  }

  const entries: TocEntry[] = [];
  let currentSection: string | undefined;
  for (const c of candidates) {
    const sections = sectionByAtPage.get(c.atPage);
    if (sections && sections.length) currentSection = sections[sections.length - 1];
    entries.push({ title: c.title, page: c.page, section: currentSection });
  }
  return dedupeToc(entries);
}

function dedupeToc(entries: TocEntry[]): TocEntry[] {
  const seen = new Set<string>();
  const out: TocEntry[] = [];
  for (const e of entries) {
    const key = foldWord(e.title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

/**
 * Mundarijadagi sahifa raqamlari odatda kitobning bosma raqami bo'ladi,
 * PDF sahifasi esa muqova/himoya varaqlari hisobiga surilgan bo'ladi.
 * Offset'ni sarlavha matnini kitobdan qidirib aniqlaymiz.
 */
export function calibrateTocOffset(entries: TocEntry[], bookPages: BookPage[], tocPages?: Set<number>): number {
  const offsets: number[] = [];
  const skip = tocPages ?? findTocPages(bookPages);
  for (const e of entries.slice(0, 40)) {
    if (e.page == null) continue;
    const needle = foldWord(e.title).replace(/\s+/g, " ").slice(0, 26);
    if (needle.length < 6) continue;
    for (const p of bookPages) {
      if (skip.has(p.page)) continue;
      const hay = foldWord(p.text).replace(/\s+/g, " ");
      if (hay.includes(needle)) {
        offsets.push(p.page - e.page);
        break;
      }
    }
  }
  if (offsets.length < 3) return 0;
  offsets.sort((a, b) => a - b);
  return offsets[Math.floor(offsets.length / 2)];
}

// ---------------------------------------------------------------------------
// 2) Matn ichidagi sarlavhalarni aniqlash
// ---------------------------------------------------------------------------

const STRONG_HEADING =
  /^\s*(?:(\d{1,3})\s*[.)-]?\s*(mavzu|dars|боб|тема|§)\b|(mavzu|dars|§)\s*[-–]?\s*(\d{1,3})\b)/i;

const NON_TOPIC_HEADING =
  /^(mundarija|contents|содержание|mavzu nomi|bet|sahifa|kirish so'zi|so'z boshi|shartli belgilar)\b/;

export interface HeadingHit {
  page: number;
  line: number;
  title: string;
  score: number;
}

/** Sarlavhani chiroyli ko'rinishga keltiradi */
function cleanHeading(line: string): string {
  return line
    .replace(/[\s.:;,-]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 120);
}

/** Matn ichidan mavzu sarlavhalarini topadi */
export function findHeadings(bookPages: BookPage[]): HeadingHit[] {
  const hits: HeadingHit[] = [];
  for (const p of bookPages) {
    const lines = splitLines(cleanExtractedText(p.text));
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > 90) continue;
      // Mundarija qatorlari ("Mavzu .... 12") sarlavha emas
      if (TOC_LINE.test(line)) continue;

      if (NON_TOPIC_HEADING.test(foldWord(line))) continue;

      let score = 0;
      let title = line;

      const strong = line.match(STRONG_HEADING);
      if (strong) {
        score = 0.95;
        title = cleanHeading(line);
      } else if (
        line.length >= 5 &&
        line.length <= 64 &&
        line === line.toUpperCase() &&
        /[A-ZO'G'SHCH]/.test(line) &&
        /[A-Z]/.test(line) &&
        !/^\d/.test(line) &&
        !/[.!?,;:]$/.test(line) &&
        !/\d{3,}/.test(line)
      ) {
        score = 0.72;
        title = cleanHeading(line);
      } else if (
        line.length >= 6 &&
        line.length <= 50 &&
        /^[A-ZO'G'SHCH]/.test(line) &&
        !/[.!?,;:]$/.test(line) &&
        !/\d/.test(line) &&
        line.split(/\s+/).length <= 6 &&
        (i === 0 || lines[i - 1] === "" || /[.!?]$/.test(lines[i - 1] ?? ""))
      ) {
        score = 0.42;
        title = cleanHeading(line);
      }

      if (score > 0) {
        hits.push({ page: p.page, line: i, title: title.trim(), score });
      }
    }
  }
  return hits;
}

/** Sarlavhalarni filtrlab, mavzular chegarasini aniqlaydi */
function selectHeadings(hits: HeadingHit[], pagesCount: number): HeadingHit[] {
  const strong = hits.filter((h) => h.score >= 0.7);
  const pool = strong.length >= 4 ? strong : hits.filter((h) => h.score >= 0.42);

  const out: HeadingHit[] = [];
  let lastPage = -99;
  for (const h of pool) {
    // Bir sahifada bir nechta sarlavha — faqat eng ishonchlisi
    if (h.page === lastPage) {
      const prevIdx = out.findLastIndex((x) => x.page === h.page);
      if (prevIdx >= 0 && out[prevIdx].score < h.score) {
        out[prevIdx] = h;
      }
      continue;
    }
    // Juda uzun bo'limlar bo'lsa ham qabul qilamiz, lekin juda tez-tez uchrasa tashlaymiz
    out.push(h);
    lastPage = h.page;
  }

  // Oxirgi 5 sahifada 1 tadan ko'p sarlavha bo'lmasa — uni tashlaymiz
  return out.filter((h) => h.page <= pagesCount);
}

// ---------------------------------------------------------------------------
// 3) Asosiy funksiya
// ---------------------------------------------------------------------------

export function segmentBook(bookPages: BookPage[], bookTitle = ""): { topics: RawTopic[]; report: SegmentReport } {
  const pages = bookPages
    .map((p) => ({ page: p.page, text: cleanExtractedText(p.text) }))
    .filter((p) => p.text.length > 0);

  const notes: string[] = [];
  const totalChars = pages.reduce((s, p) => s + p.text.length, 0);
  const pagesCount = bookPages.length || pages.length;
  const scannedPdf = totalChars < pagesCount * 120 && pages.length > 0;
  if (scannedPdf) {
    notes.push(
      "PDF'dan matn juda kam chiqdi — bu skanerlangan kitob bo'lishi mumkin. OCR yoki \"matn joylash\" usulidan foydalaning."
    );
  }

  if (!pages.length) {
    return {
      topics: [],
      report: { strategy: "fallback", topics: 0, pages: pagesCount, chars: 0, scannedPdf, notes: ["Matn topilmadi."] },
    };
  }

  // --- 1) Mundarija ---
  const toc = parseToc(pages);
  if (toc.length >= 4) {
    const tocPages = findTocPages(pages);
    const offset = calibrateTocOffset(toc, pages, tocPages);
    const topics = topicsFromToc(toc, offset, pages, pagesCount, tocPages);
    if (topics.length >= 3) {
      notes.push(
        `Mundarija topildi: ${toc.length} ta yozuv${offset ? `, sahifa siljishi ${offset > 0 ? "+" : ""}${offset}` : ""}.`
      );
      return {
        topics,
        report: {
          strategy: "toc",
          topics: topics.length,
          pages: pagesCount,
          chars: totalChars,
          scannedPdf,
          notes,
        },
      };
    }
  }

  // --- 2) Sarlavhalar ---
  const headings = selectHeadings(findHeadings(pages), pagesCount);
  if (headings.length >= 3) {
    const topics = topicsFromHeadings(headings, pages, pagesCount);
    if (topics.length >= 3) {
      notes.push(`Mundarija topilmadi — matn ichidagi ${headings.length} ta sarlavha asosida bo'lindi.`);
      return {
        topics,
        report: {
          strategy: "heading",
          topics: topics.length,
          pages: pagesCount,
          chars: totalChars,
          scannedPdf,
          notes,
        },
      };
    }
  }

  // --- 3) Fallback: sahifalar bo'yicha ---
  const topics = fallbackTopics(pages, pagesCount);
  notes.push(
    "Mundarija ham, sarlavhalar ham aniqlanmadi — kitob sahifa oralig'i bo'yicha teng bo'laklarga bo'lindi. Mavzu nomini qo'lda tahrirlashingiz mumkin."
  );
  return {
    topics,
    report: { strategy: "fallback", topics: topics.length, pages: pagesCount, chars: totalChars, scannedPdf, notes },
  };
}

// ----------------------------- Mundarija bo'yicha ---------------------------

function topicsFromToc(
  toc: TocEntry[],
  offset: number,
  pages: BookPage[],
  pagesCount: number,
  tocPages: Set<number>
): RawTopic[] {
  const positioned = toc.filter((e) => e.page != null) as Array<TocEntry & { page: number }>;
  if (!positioned.length) return [];

  positioned.sort((a, b) => a.page - b.page);
  const lastPage = pagesCount || Math.max(...pages.map((p) => p.page));

  const out: RawTopic[] = [];
  for (let i = 0; i < positioned.length; i++) {
    const entry = positioned[i];
    const start = clampPage(entry.page + offset, 1, lastPage);
    const nextStart = i + 1 < positioned.length ? clampPage(positioned[i + 1].page + offset, 1, lastPage + 1) : lastPage + 1;
    const end = Math.max(start, Math.min(lastPage, nextStart - 1));
    const text = pages
      .filter((p) => p.page >= start && p.page <= end)
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text.length < 40 && positioned.length > 8) continue; // bo'sh yozuvlar (faqat sarlavha takrori)
    out.push({
      title: entry.title,
      section: entry.section,
      pageStart: start,
      pageEnd: end,
      text,
      source: "toc",
    });
  }

  // Juda katta bo'laklarni o'z ichida sarlavhalar bo'yicha maydalash
  return splitOversizedTopics(out, pages, tocPages);
}

/** 30 betdan katta "mavzu"larni ichki sarlavhalar bo'yicha bo'lish */
function splitOversizedTopics(topics: RawTopic[], pages: BookPage[], tocPages?: Set<number>): RawTopic[] {
  const MAX_PAGES = 14;
  const out: RawTopic[] = [];
  for (const t of topics) {
    if (t.pageEnd - t.pageStart + 1 <= MAX_PAGES) {
      out.push(t);
      continue;
    }
    const inner = pages.filter((p) => p.page >= t.pageStart && p.page <= t.pageEnd);
    const headings = selectHeadings(findHeadings(inner), inner.length).filter(
      (h) => h.page > t.pageStart && !(tocPages?.has(h.page) ?? false)
    );
    if (headings.length < 2) {
      out.push(t);
      continue;
    }
    let idx = 0;
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i];
      const next = i + 1 < headings.length ? headings[i + 1].page : t.pageEnd + 1;
      const text = pages
        .filter((p) => p.page >= h.page && p.page < next)
        .map((p) => p.text)
        .join("\n")
        .trim();
      if (text.length < 40) continue;
      out.push({
        title: `${t.title} · ${h.title}`.slice(0, 140),
        section: t.section,
        pageStart: h.page,
        pageEnd: Math.max(h.page, next - 1),
        text,
        source: t.source,
      });
      idx++;
    }
    if (idx === 0) out.push(t);
  }
  return out;
}

// ----------------------------- Sarlavha bo'yicha ----------------------------

function topicsFromHeadings(headings: HeadingHit[], pages: BookPage[], pagesCount: number): RawTopic[] {
  const out: RawTopic[] = [];
  const lastPage = pagesCount || Math.max(...pages.map((p) => p.page));
  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const next = i + 1 < headings.length ? headings[i + 1].page : lastPage + 1;
    const end = Math.max(h.page, Math.min(lastPage, next - 1));
    const text = pages
      .filter((p) => p.page >= h.page && p.page <= end)
      .map((p) => p.text)
      .join("\n")
      .trim();
    if (text.length < 40) continue;
    out.push({
      title: h.title.slice(0, 140),
      pageStart: h.page,
      pageEnd: end,
      text,
      source: "heading",
    });
  }
  return out;
}

// -------------------------------- Fallback ----------------------------------

function fallbackTopics(pages: BookPage[], pagesCount: number): RawTopic[] {
  const PER_TOPIC_CHARS = 2600;
  const out: RawTopic[] = [];
  let buf: BookPage[] = [];
  let chars = 0;

  const flush = () => {
    if (!buf.length) return;
    const n = out.length + 1;
    out.push({
      title: `${n}-mavzu (${buf[0].page}–${buf[buf.length - 1].page}-betlar)`,
      pageStart: buf[0].page,
      pageEnd: buf[buf.length - 1].page,
      text: buf.map((p) => p.text).join("\n").trim(),
      source: "fallback",
    });
    buf = [];
    chars = 0;
  };

  for (const p of pages) {
    buf.push(p);
    chars += p.text.length;
    if (chars >= PER_TOPIC_CHARS) flush();
  }
  flush();

  // Bo'sh natija bo'lsa — kitobning o'zini bitta mavzu qilib qaytaramiz
  if (!out.length && pages.length) {
    out.push({
      title: "1-mavzu (butun kitob)",
      pageStart: 1,
      pageEnd: pagesCount || pages[pages.length - 1].page,
      text: pages.map((p) => p.text).join("\n"),
      source: "fallback",
    });
  }
  return out;
}

function clampPage(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
