/**
 * O'qituvchi o'yin yasash oqimini tekshirish (13 tur).
 *
 *   npm run test:games
 *
 * Server kerak emas: matn tahlili (custom-parse) va normallashtirish shu yerda
 * tekshiriladi — o'yin interfeysi kutgan ko'rinish to'g'ri yasalayotganini
 * bildiradi. Har bir tur uchun: variantlar soni, to'g'ri javob indeksi,
 * takrorlanuvchi variantlar, guruhlar va boshqalar.
 */
import { normalizeItems, parseCustomItems } from "../src/lib/books/custom-parse";
import { GAME_TYPES, type GameItem, type GameType } from "../src/lib/books/types";

const SAMPLES: Record<GameType, string> = {
  matching: "kitob — book\nsuv — water\nnon — bread\nolma — apple",
  memory: "kitob — book\nsuv — water\nnon — bread\nolma — apple",
  quiz: "Poytaxt qaysi shahar? | Toshkent | Samarqand | Buxoro | Andijon\nEng katta okean? | Tinch okean | Atlantika | Hind | Shimoliy\nEng katta qit'a? | Osiyo | Afrika | Yevropa | Amerika\nQaldirg'och qanday hayvon? | Qush | Baliq | Hasharot | Sutemizuvchi",
  truefalse: "Suv 100 gradusda qaynaydi | to'g'ri\nQuyosh kechasi chiqadi | noto'g'ri",
  fill: "Kitob — bilim ______ | manbai\nSuv 100 gradusda ______ | qaynaydi\nNon ______ pishiriladi | tandirda",
  order: "Gapni tartibla | Bugun | havo | juda | issiq\nGapni tartibla | Men | kitob | o'qiyman",
  math: "24 + 38 = 62\n100 - 45 = 55\n7 × 8 = 56\n81 : 9 = 9",
  pop: "15 + 27 = 42\n60 - 18 = 42\n9 × 6 = 54\n72 : 8 = 9",
  puzzle: "kitob | ki,tob\nmaktab | mak,tab\ndaftar | daf,tar",
  missingletter: "k_tob | kitob\nm_ktab | maktab\ns_v | suv\nn_n | non",
  findmistake: "kitob | kitab | ktob\nmaktab | maktap | mktab\nsuv | suv | su | sv",
  grouping: "chumoli — Hasharotlar\nasalari — Hasharotlar\nkaptar — Qushlar\nburgut — Qushlar\nmusicha — Qushlar",
  bingo: "kitob\nsuv\nnon\nolma\nuy\nmaktab\ngul\ndaraxt\nbahor",
};

let problems = 0;
const fail = (msg: string) => {
  problems++;
  console.log(`  ❌ ${msg}`);
};

/** Elementdan variantlar va to'g'ri javob indeksini oladi (interfeys mantig'i bilan bir xil) */
function optionsInfo(item: GameItem): { options: string[]; index: number } {
  const it = item as unknown as Record<string, unknown>;
  const options = Array.isArray(it.options) ? (it.options as unknown[]).map((o) => String(o)) : [];
  if (typeof it.expression === "string" || typeof it.answer === "number") {
    const byValue = options.findIndex((o) => o === String(it.answer));
    if (byValue >= 0 && typeof it.expression === "string") return { options, index: byValue };
  }
  if (typeof it.answer === "string") {
    return { options, index: options.findIndex((o) => o === String(it.answer)) };
  }
  return { options, index: typeof it.answer === "number" ? it.answer : -1 };
}

for (const type of Object.keys(GAME_TYPES) as GameType[]) {
  const raw = SAMPLES[type];
  const parsed = parseCustomItems(raw, type);
  const items = normalizeItems(parsed.items, type);
  console.log(`${GAME_TYPES[type].emoji} ${type} — ${items.length} element`);

  if (!items.length) fail("hech narsa o'qilmadi");
  for (const p of parsed.problems) console.log(`  ⚠️  ${p}`);

  if (type === "grouping") {
    const groups = new Set(items.map((it) => String((it as { right?: string }).right ?? "")));
    if (groups.size < 2) fail(`guruhlar 2 tadan kam: ${[...groups].join(", ")}`);
    if (groups.has("")) fail("bo'sh guruh nomi bor");
  }

  if (type === "puzzle") {
    for (const it of items as { answer: string; pieces: string[] }[]) {
      if (it.pieces.join("") !== it.answer) fail(`bo'laklar javobga yig'ilmaydi: ${it.pieces.join("|")} ≠ ${it.answer}`);
      if (it.pieces.length < 2) fail(`"${it.answer}" bitta bo'lakdan iborat`);
    }
  }

  if (type === "missingletter") {
    for (const it of items as { display: string; answer: string; options: string[] }[]) {
      if ((it.display.match(/_/g) ?? []).length !== 1) fail(`"${it.display}" — bo'sh joy bitta emas`);
      if (!it.options.includes(it.answer)) fail(`"${it.display}" variantlarida javob yo'q`);
    }
  }

  if (type === "truefalse") {
    const values = (items as { isTrue: boolean }[]).map((it) => it.isTrue);
    if (values.every((v) => v === values[0])) fail("hamma javob bir xil (to'g'ri/noto'g'ri aralashmagan)");
  }

  if (["quiz", "findmistake", "fill", "math", "pop"].includes(type)) {
    const indexes: number[] = [];
    for (const it of items) {
      const { options, index } = optionsInfo(it);
      if (options.length < 3) fail(`variantlar 3 tadan kam: ${JSON.stringify(options)}`);
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) fail(`takroriy variantlar: ${JSON.stringify(options)}`);
      if (index < 0 || index >= options.length) fail(`to'g'ri javob indeksi noto'g'ri: ${JSON.stringify(it)}`);
      indexes.push(index);
    }
    if (indexes.length >= 4 && new Set(indexes).size === 1) {
      fail(`to'g'ri javob doim bitta joyda (indeks ${indexes[0]}) — aralashtirish ishlamayapti`);
    }
  }
}

console.log(problems ? `\n${problems} ta muammo topildi` : "\n✅ Hamma tekshiruvlar o'tdi");
process.exit(problems ? 1 : 0);
