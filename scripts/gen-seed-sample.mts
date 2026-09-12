/**
 * `supabase/seed.sql` ichidagi namuna kitob/o'yinlar SQL'ini yasaydi.
 *
 *   NODE_OPTIONS="--conditions=react-server" npx tsx scripts/gen-seed-sample.mts
 *
 * Chiqqan SQL ni seed.sql'dagi "KITOB → O'YIN" bo'limiga qo'ying. Bu skript
 * kitobni ilovaning haqiqiy dvigateli (`ingestBook`) va o'yin muharriri
 * (`parseCustomItems`) orqali yasaydi — ya'ni seed'dagi ma'lumot ilova
 * kutgan ko'rinishda bo'ladi.
 */
import { ingestBook } from "./src/lib/books/store";
import { normalizeItems, parseCustomItems } from "./src/lib/books/custom-parse";
import type { GameType } from "./src/lib/books/types";

const topics: Array<{ title: string; text: string }> = [
  {
    title: "1-MAVZU. SONLARNI QO'SHISH VA AYIRISH",
    text: `SONLARNI QO'SHISH VA AYIRISH

Qoida: Yig'indini topish uchun qo'shiluvchilarni qo'shamiz.
Misol: 245 + 132 = 377
Misol: 460 - 125 = 335
Qoida: Ayirishda kamayuvchidan ayriluvchi ayiriladi.
Masala: Do'konda 345 ta daftar bor edi. 17 tasi sotildi. Nechta daftar qoldi?
Yechish: 345 - 17 = 328
Javob: 328 ta daftar qoldi.
Masala: Maktab kutubxonasida 240 ta kitob bor edi. Yana 60 ta kitob keltirildi. Jami nechta kitob bo'ldi?
Yechish: 240 + 60 = 300
Javob: 300 ta kitob.`,
  },
  {
    title: "2-MAVZU. KO'PAYTIRISH VA BO'LISH",
    text: `KO'PAYTIRISH VA BO'LISH

Qoida: Ko'paytirish - bir xil qo'shiluvchilarni qisqacha yozish.
Misol: 12 x 4 = 48
Misol: 25 x 3 = 75
Misol: 15 x 6 = 90
Misol: 72 : 8 = 9
Misol: 96 : 6 = 16
Misol: 120 : 4 = 30
Masala: Har bir qutiga 6 tadan olma solindi. 8 ta qutida nechta olma bor?
Yechish: 6 x 8 = 48
Javob: 48 ta olma.
Masala: 45 ta konfet 9 ta bolaga teng bo'lindi. Har bir bolaga nechtadan konfet tegdi?
Yechish: 45 : 9 = 5
Javob: 5 tadan konfet.`,
  },
  {
    title: "3-MAVZU. GEOMETRIK FIGURALAR",
    text: `GEOMETRIK FIGURALAR

Ta'rif: Kvadrat - hamma tomonlari teng bo'lgan to'rtburchak.
Ta'rif: Uchburchak - uchta tomoni va uchta burchagi bor figura.
Ta'rif: To'g'ri to'rtburchak - qarama-qarshi tomonlari teng figura.
Qoida: To'g'ri to'rtburchakning yuzi = bo'yi x eni.
Qoida: Perimetr - hamma tomonlar uzunliklarining yig'indisi.
Misol: Bo'yi 8 sm, eni 5 sm bo'lgan to'rtburchak yuzi: 8 x 5 = 40 kv.sm.
Masala: Tomonlari 6 sm va 9 sm bo'lgan to'g'ri to'rtburchakning perimetrini toping.
Yechish: 2 x (6 + 9) = 30
Javob: 30 sm.`,
  },
  {
    title: "4-MAVZU. O'LCHOV BIRLIKLARI",
    text: `O'LCHOV BIRLIKLARI

Qoida: 1 metr = 100 santimetr.
Qoida: 1 kilometr = 1000 metr.
Qoida: 1 kilogramm = 1000 gramm.
Qoida: 1 tonna = 1000 kilogramm.
Misol: 3 m 40 sm = 340 sm
Misol: 2 kg 500 g = 2500 g
Masala: Arqonning uzunligi 4 metr edi. Undan 150 santimetr kesib olindi. Necha santimetr qoldi?
Yechish: 400 - 150 = 250
Javob: 250 sm arqon qoldi.`,
  },
  {
    title: "5-MAVZU. VAQTNI O'LCHASH",
    text: `VAQTNI O'LCHASH

Qoida: 1 soat = 60 minut.
Qoida: 1 minut = 60 sekund.
Qoida: 1 kunda 24 soat bor.
Misol: 2 soat 30 minut = 150 minut
Masala: Dars ertalab soat 8:00 da boshlandi va 45 minut davom etdi. Dars soat nechada tugadi?
Yechish: 8 soat + 45 minut = 8:45
Javob: dars soat 8:45 da tugadi.`,
  },
];

// Har mavzu alohida betda; mundarija esa 1-betda (sahifa raqamlari mos bo'lsin).
const tocLines = topics.map((t, i) => `${t.title.split(". ")[1].slice(0, 40)} ${".".repeat(6)} ${i + 2}`).join("\n");
const pages = [{ page: 1, text: `MUNDARIJA\n\n${tocLines}` }, ...topics.map((t, i) => ({ page: i + 2, text: t.text }))];

const { book } = ingestBook({
  title: "Matematika 3-sinf (namuna)",
  grade: 3,
  subject: "matematika" as never,
  fileName: "matematika-3-namuna.pdf",
  sizeBytes: pages.reduce((n, p) => n + p.text.length, 0),
  kind: "pdf",
  pages,
});
book.id = "demo-matematika-3";
book.createdAt = new Date().toISOString();

// O'qituvchi o'zi yasagan o'yinlar — muharrirning haqiqiy funksiyasi orqali
const custom: Array<{ id: string; title: string; type: GameType; grade: number; subject: string; instructions: string; difficulty: number; raw: string }> = [
  {
    id: "demo-ona-tili-juftlik",
    title: "So'z va tarjima (Ona tili)",
    type: "matching",
    grade: 3,
    subject: "ona-tili",
    instructions: "Chapdagi so'zni o'ngdagi ma'nosi bilan ulang.",
    difficulty: 1,
    raw: "kitob — book\nmaktab — school\nqalam — pen\ndaftar — notebook\no'qituvchi — teacher\no'quvchi — pupil",
  },
  {
    id: "demo-matematika-tez-hisob",
    title: "Tez hisob: qo'shish va ayirish",
    type: "math",
    grade: 3,
    subject: "matematika",
    instructions: "Misolni yechib, to'g'ri javobni bosing.",
    difficulty: 2,
    raw: "24 + 38\n100 - 45\n56 + 27\n90 - 36\n145 + 55\n200 - 120",
  },
  {
    id: "demo-tabiat-togri-notogri",
    title: "Tabiat: to'g'ri yoki noto'g'ri",
    type: "truefalse",
    grade: 3,
    subject: "tabiiy-fanlar",
    instructions: "Fikr to'g'ri bo'lsa ✅, noto'g'ri bo'lsa ❌ ni bosing.",
    difficulty: 1,
    raw: "Suv 100 gradusda qaynaydi | to'g'ri\nQuyosh kechasi chiqadi | noto'g'ri\nBaliq suvda yashaydi | to'g'ri\nDaraxtlar qishda yashil bo'ladi | noto'g'ri\nMuz suvdan yengil | to'g'ri",
  },
  {
    id: "demo-missing-letter",
    title: "Tushib qolgan harfni top",
    type: "missingletter",
    grade: 3,
    subject: "ona-tili",
    instructions: "So'zdagi tushib qolgan harfni tanlang.",
    difficulty: 1,
    raw: "k_tob | kitob\nm_ktab | maktab\nqal_m | qalam\nd_ftar | daftar\nsuv_ | suvli",
  },
];

const q = (v: unknown) => `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
const titles = book.topics.slice(0, 6).map((t) => `'${t.title.replace(/'/g, "''")}'`).join(", ");

console.log(`insert into books (id, title, grade, subject, subject_label, language, source, stats, topic_titles, topics)
values (
  '${book.id}',
  '${book.title}',
  ${book.grade},
  '${book.subject}',
  '${book.subjectLabel}',
  '${book.language}',
  ${q(book.source)},
  ${q(book.stats)},
  array[${titles}],
  ${q(book.topics)}
)
on conflict (id) do update set title = excluded.title, topics = excluded.topics, stats = excluded.stats, topic_titles = excluded.topic_titles;`);
const customSql = custom
  .map((c) => {
    const parsed = parseCustomItems(c.raw, c.type);
    if (parsed.problems.length) console.error(`  ⚠ ${c.id}:`, parsed.problems);
    const items = normalizeItems(parsed.items, c.type);
    return `insert into custom_games (id, title, type, subject, grade, instructions, difficulty, items, groups, built_from)
values (
  '${c.id}',
  '${c.title.replace(/'/g, "''")}',
  '${c.type}',
  '${c.subject}',
  ${c.grade},
  '${c.instructions.replace(/'/g, "''")}',
  ${c.difficulty},
  ${q(items)},
  ${c.type === "grouping" ? q(["1-guruh", "2-guruh"]) : "null"},
  ${q({ note: "O'qituvchi tomonidan yaratilgan (namuna)", pages: [] })}
)
on conflict (id) do update set title = excluded.title, items = excluded.items, instructions = excluded.instructions;`;
  })
  .join("\n\n");

console.log(`\n-- O'qituvchi yasagan o'yinlar (Namuna o'yinlar bo'limi uchun)\n${customSql}`);
console.error(`(demo o'yinlar: ${custom.length} ta — ` + custom.map((c) => `${c.type} ${normalizeItems(parseCustomItems(c.raw, c.type).items, c.type).length} ta savol`).join(", ") + ")");
if (process.env.SEED_VERBOSE !== "0") console.error(
  `(demo kitob: ${book.stats.topics} mavzu, ${book.stats.games} o'yin, ${book.stats.items} savol) -> ` +
    book.topics.map((t) => t.title.split(": ")[0]).join(" | ")
);
