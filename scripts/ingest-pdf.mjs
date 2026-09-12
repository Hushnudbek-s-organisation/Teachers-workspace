#!/usr/bin/env node
/**
 * PDF darslikni serverga import qilish (CLI)
 *
 *   node scripts/ingest-pdf.mjs kitob.pdf --subject matematika --title "Matematika 3-sinf"
 *
 * Ishlash tartibi:
 *   1. PDF matni pdf.js orqali ajratib olinadi (pdfjs-dist, Node muhiti)
 *   2. Natija /api/books/ingest ga yuboriladi — server mavzularga bo'lib, o'yinlar yasaydi
 *
 * Foydali variantlar:
 *   --api http://localhost:3000   server manzili
 *   --grade 3                     sinf
 *   --subject matematika|ona-tili|oqish|tabiiy-fanlar|ingliz-tili|rus-tili
 *   --dry-run                     faqat matn ajratishni sinash (serverga yubormaydi)
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
  console.error("Ishlatish: node scripts/ingest-pdf.mjs <kitob.pdf> [--subject matematika] [--api URL]");
  process.exit(1);
}

const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const api = flag("api", "http://localhost:3000");
const grade = Number(flag("grade", "3"));
const subject = flag("subject", null);
const title = flag("title", path.basename(file).replace(/\.[^.]+$/, ""));
const dryRun = has("dry-run");

// --------------------------- PDF matnini ajratish ---------------------------

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs").catch(() => import("pdfjs-dist"));
const { getDocument } = pdfjs;

const data = new Uint8Array(await readFile(file));
const doc = await getDocument({ data, isEvalSupported: false }).promise;
console.log(`📖 ${path.basename(file)} · ${doc.numPages} bet`);

/** pdf.js elementlarini Y koordinatasi bo'yicha qatorlarga guruhlaydi */
function itemsToLines(items) {
  const rows = new Map();
  for (const it of items) {
    if (!it || typeof it.str !== "string") continue;
    const y = Math.round((it.transform?.[5] ?? 0) / 3) * 3;
    const list = rows.get(y);
    if (list) list.push(it);
    else rows.set(y, [it]);
  }
  const lines = [];
  for (const [, rowItems] of [...rows.entries()].sort((a, b) => b[0] - a[0])) {
    rowItems.sort((a, b) => (a.transform?.[0] ?? 0) - (b.transform?.[0] ?? 0));
    let line = "";
    let lastEnd = -1;
    let lastH = 12;
    for (const it of rowItems) {
      const x = it.transform?.[4] ?? 0;
      const h = it.height || lastH; // bo'shliq elementlarida height = 0 bo'ladi
      // pdf.js ustunlar orasidagi katta bo'shliqni ALOHIDA bo'sh element
      // qilib beradi (masalan "apple" va "olma" orasida eni 200pt bo'shliq).
      // Uni bitta bo'shliqqa yig'ib yuborsak jadval lug'atlar o'qilmaydi.
      if (it.str.trim() === "") {
        const span = it.width ?? 0;
        if (span > h * 1.6) line = line.replace(/\s+$/, "") + "  ";
        else if (!line.endsWith(" ")) line += " ";
        lastEnd = x + span;
        continue;
      }
      if (lastEnd >= 0) {
        const gap = x - lastEnd;
        if (gap > h * 1.6) line += "  ";
        else if (gap > h * 0.25 && !line.endsWith(" ")) line += " ";
      }
      line += it.str;
      lastEnd = x + (it.width ?? it.str.length * h * 0.5);
      lastH = h;
    }
    const t = line.trim();
    if (t) lines.push(t);
  }
  return lines.join("\n");
}

const pages = [];
let chars = 0;
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const content = await page.getTextContent();
  const text = itemsToLines(content.items);
  chars += text.length;
  pages.push({ page: i, text });
  if (i % 25 === 0 || i === doc.numPages) {
    process.stdout.write(`\r   sahifa ${i}/${doc.numPages} · ${Math.round(chars / 1000)} ming belgi`);
  }
}
process.stdout.write("\n");

if (chars < doc.numPages * 120) {
  console.log("⚠️  Matn juda kam — bu skanerlangan (rasm) PDF bo'lishi mumkin. Bunday holda server ham o'yin yasay olmaydi.");
}

if (dryRun) {
  console.log(`✅ Matn ajratildi: ${chars} belgi, ${pages.length} bet (serverga yuborilmadi)`);
  process.exit(0);
}

// ------------------------------ Serverga yuborish ---------------------------

console.log(`⬆️  ${api}/api/books/ingest ga yuborilmoqda…`);
const res = await fetch(`${api}/api/books/ingest`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title,
    grade,
    subject: subject ?? undefined,
    fileName: path.basename(file),
    pages,
  }),
});

const json = await res.json();
if (!res.ok) {
  console.error("❌ Xato:", json.error ?? res.statusText);
  process.exit(1);
}

console.log(`\n✅ Kitob qo'shildi: ${json.title} (id: ${json.bookId})`);
console.log(`   Usul: ${json.strategy} · mavzular: ${json.stats.topics} · o'yinlar: ${json.stats.games} · savollar: ${json.stats.items}`);
for (const n of json.notes ?? []) console.log(`   • ${n}`);
console.log("");
for (const t of json.topics.slice(0, 12)) {
  console.log(`   ${String(t.index).padStart(2)}. ${t.title.slice(0, 62)} [${t.pages}] → ${t.games.length} o'yin`);
}
if (json.topics.length > 12) console.log(`   … yana ${json.topics.length - 12} ta mavzu`);
console.log(`\n🌐 Ko'rish: ${api}/books/${json.bookId}`);
