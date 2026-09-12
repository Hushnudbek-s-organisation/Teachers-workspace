"use client";

// ============================================================================
// PDF'ni BRAUZERDA o'qish (pdf.js)
//
// Nega brauzerda? 200 betli, 30 MB'lik darslikni serverga yuklash shart emas:
// matn shu yerning o'zida ajratib olinadi va serverga faqat matn yuboriladi.
// ============================================================================

import type { BookPage } from "./segment";
import { SCANNED_PDF_CHARS_PER_PAGE } from "@/lib/config";

export interface ExtractProgress {
  page: number;
  total: number;
  chars: number;
}

export interface PdfExtractResult {
  pages: BookPage[];
  totalPages: number;
  chars: number;
  /** Matn qatlami juda kam — skanerlangan PDF bo'lishi mumkin */
  scanWarn: boolean;
  title?: string;
}

interface PdfTextItem {
  str: string;
  transform: number[];
  width?: number;
  height?: number;
}

let workerReady = false;

async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    workerReady = true;
  }
  return pdfjs;
}

/**
 * PDF sahifalaridan matnni qatorlarga guruhlab oladi.
 * Har bir sahifa alohida {page, text} ko'rinishida qaytadi.
 */
export async function extractPdfPages(
  file: File | ArrayBuffer,
  onProgress?: (p: ExtractProgress) => void
): Promise<PdfExtractResult> {
  const pdfjs = await loadPdfjs();
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;

  const pages: BookPage[] = [];
  let totalChars = 0;
  let metaTitle: string | undefined;

  try {
    const meta = await doc.getMetadata();
    const info = meta?.info as { Title?: string } | undefined;
    if (info?.Title && info.Title.trim().length > 2) metaTitle = info.Title.trim();
  } catch {
    /* metama'lumot bo'lmasa ham davom etamiz */
  }

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    let text = "";
    try {
      const content = await page.getTextContent();
      text = itemsToLines(content.items as unknown as PdfTextItem[]);
    } catch {
      text = "";
    }
    totalChars += text.length;
    pages.push({ page: i, text });
    if (onProgress) onProgress({ page: i, total: doc.numPages, chars: totalChars });
    // UI "qotib qolmasligi" uchun navbatni bo'shatamiz
    if (i % 5 === 0) await new Promise((r) => setTimeout(r, 0));
  }

  return {
    pages,
    totalPages: doc.numPages,
    chars: totalChars,
    scanWarn: totalChars < doc.numPages * SCANNED_PDF_CHARS_PER_PAGE,
    title: metaTitle,
  };
}

/** pdf.js matn elementlarini Y koordinatasi bo'yicha qatorlarga birlashtiradi */
function itemsToLines(items: PdfTextItem[]): string {
  const rows = new Map<number, PdfTextItem[]>();
  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const y = Math.round((it.transform?.[5] ?? 0) / 3) * 3;
    const list = rows.get(y);
    if (list) list.push(it);
    else rows.set(y, [it]);
  }

  const sortedRows = [...rows.entries()].sort((a, b) => b[0] - a[0]); // yuqoridan pastga
  const lines: string[] = [];

  for (const [, rowItems] of sortedRows) {
    rowItems.sort((a, b) => (a.transform?.[0] ?? 0) - (b.transform?.[0] ?? 0));
    let line = "";
    let lastEnd = -1;
    let lastH = 12;
    for (const it of rowItems) {
      const x = it.transform?.[4] ?? 0;
      const h = it.height || lastH; // bo'shliq elementlarida height = 0 bo'ladi
      // pdf.js ustunlar orasidagi katta bo'shliqni ALOHIDA bo'sh element qilib
      // beradi (eni 200pt bo'shliq). Uni bitta bo'shliqqa yig'ib yuborsak,
      // mundarijadagi "...." ham, jadval lug'atlardagi "so'z   tarjima" ham
      // yo'qoladi. Shuning uchun katta bo'shliq ikki bo'shliq bo'lib qoladi.
      if (it.str.trim() === "") {
        const span = it.width ?? 0;
        if (span > h * 1.6) line = line.replace(/\s+$/, "") + "  ";
        else if (!line.endsWith(" ")) line += " ";
        lastEnd = x + span;
        continue;
      }
      if (lastEnd >= 0) {
        const gap = x - lastEnd;
        if (gap > h * 1.6) line += "  "; // katta bo'shliq (mundarijadagi "...." o'rnida)
        else if (gap > h * 0.25 && !line.endsWith(" ")) line += " ";
      }
      line += it.str;
      lastEnd = x + (it.width ?? it.str.length * h * 0.5);
      lastH = h;
    }
    const trimmed = line.trim();
    if (trimmed) lines.push(trimmed);
  }

  return lines.join("\n");
}
