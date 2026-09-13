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
import { GAME_TYPES, type GameItem, type GameResult, type GameType } from "../src/lib/books/types";
import {
  clampSetup,
  dealBoards,
  dealRound,
  dealSequence,
  defaultSetup,
  formatClock,
  groupOfItem,
  itemsPerRound,
  percentOf,
  plannedRounds,
  standings,
  starsFor,
  type PlayerCount,
} from "../src/lib/books/multiplayer";
import { playerName, summarizeGameResults } from "../src/lib/books/game-stats";
import { MULTIPLAYER_DEFAULT_MINUTES, MULTIPLAYER_TIMED_ROUND_ITEMS } from "../src/lib/config";

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


// ===========================================================================
// 👥 KO'P KISHILIK REJIM (1/2/3 o'yinchi — bo'lingan ekran)
//
// Tekshiriladi: har o'yinchiga TENG miqdor, bir vaqtda HAR XIL savol,
// to'plamning adolatli bo'linishi, sozlama chegaralari, o'rinlar va
// natijalar statistikasi.
// ===========================================================================

console.log("\n👥 Ko'p kishilik rejim (bo'lingan ekran)");

// ---- 1. Ketma-ket savollar: teng miqdor + bir slotda har xil savol ----
{
  const pool = Array.from({ length: 12 }, (_, i) => `savol-${i}`);
  for (const players of [2, 3] as PlayerCount[]) {
    const perPlayer = 6;
    const decks = dealSequence(pool, players, perPlayer, 42);
    if (decks.length !== players) fail(`dealSequence: ${players} o'yinchi uchun ${decks.length} to'plam qaytdi`);
    for (const [i, deck] of decks.entries()) {
      if (deck.length !== perPlayer) {
        fail(`dealSequence: ${i + 1}-o'yinchida ${deck.length} ta savol (${perPlayer} kutilgan) — adolatsiz`);
      }
    }
    for (let k = 0; k < perPlayer; k++) {
      const slot = decks.map((d) => d[k]);
      if (new Set(slot).size !== players) {
        fail(`dealSequence: ${k}-slotda takroriy savol (${slot.join(", ")}) — ikki o'yinchi bir xil misol ishlayapti`);
      }
    }
  }

  // Butun to'plam ishlatiladi (8 savol · 2 o'yinchi · 4 tadan = hammasi bir marta)
  const small = Array.from({ length: 8 }, (_, i) => `q${i}`);
  const used = new Set(dealSequence(small, 2, 4, 7).flat());
  if (used.size !== small.length) {
    fail(`dealSequence: to'plam to'liq tarqatilmadi (${used.size}/${small.length})`);
  }

  // Bir xil seed → bir xil natija, har xil seed → har xil natija
  const a = JSON.stringify(dealSequence(small, 2, 4, 99));
  if (a !== JSON.stringify(dealSequence(small, 2, 4, 99))) fail("dealSequence: bir xil seed har xil natija berdi");
  if (a === JSON.stringify(dealSequence(small, 2, 4, 1234))) fail("dealSequence: har xil seed bir xil natija berdi");

  // To'plam o'yinchilardan kichik bo'lsa ham ishlashi kerak (chegara holat)
  const tiny = dealSequence(["a", "b"], 3, 4, 5);
  if (tiny.length !== 3 || tiny.some((d) => d.length !== 4)) {
    fail("dealSequence: kichik to'plamda (2 savol / 3 o'yinchi) teng miqdor saqlanmadi");
  }
}

// ---- 2. Taxta o'yinlari: bo'lish yoki har xil tartib ----
{
  const pairs = Array.from({ length: 8 }, (_, i) => ({ left: `l${i}`, right: `r${i}` }));
  const split = dealBoards(pairs, "matching", 2, 11);
  if (!split.split) fail("dealBoards: yetarli juftlik bo'lsa ham taxta bo'linmadi");
  if (split.decks[0].length !== split.decks[1].length) fail("dealBoards: bo'lingan taxtalar teng emas");
  if (split.decks[0].some((x) => split.decks[1].includes(x))) {
    fail("dealBoards: bo'lingan taxtalarda takroriy element bor (ikkisi bir xil juftlikni yig'adi)");
  }

  // Kichik to'plam → bo'linmaydi, lekin tartibi har xil
  const few = Array.from({ length: 4 }, (_, i) => ({ left: `l${i}`, right: `r${i}` }));
  const shared = dealBoards(few, "memory", 3, 11);
  if (shared.split) fail("dealBoards: kichik to'plam (4 juftlik / 3 o'yinchi) bo'linib qoldi");
  if (shared.decks.some((d) => d.length !== few.length)) fail("dealBoards: bo'linmagan taxtada element yo'qoldi");
  if (JSON.stringify(shared.decks[0]) === JSON.stringify(shared.decks[1])) {
    fail("dealBoards: bo'linmagan taxtalar bir xil tartibda (o'yinchilar bir xil ko'rinishni oladi)");
  }

  // Bingo: hammaga bir xil so'zlar, har xil karta
  const words = Array.from({ length: 12 }, (_, i) => ({ text: `w${i}` }));
  const bingo = dealBoards(words, "bingo", 2, 5);
  if (bingo.split) fail("dealBoards: bingo so'zlari bo'linib qoldi (o'qituvchi hammasini aytadi)");
  const cardA = bingo.decks[0].map((w) => w.text).sort().join(",");
  const cardB = bingo.decks[1].map((w) => w.text).sort().join(",");
  if (cardA !== cardB) fail("dealBoards: bingo kartalarida har xil so'zlar to'plami");
  if (JSON.stringify(bingo.decks[0]) === JSON.stringify(bingo.decks[1])) {
    fail("dealBoards: ikki o'yinchining bingo kartasi bir xil tartibda");
  }

  // Grouping: har taxtada kamida 2 ta guruh qolishi kerak
  const grouped = Array.from({ length: 18 }, (_, i) => ({
    left: `so'z-${i}`,
    right: ["Hasharotlar", "Qushlar", "Baliqlar"][i % 3] as string,
  }));
  const grouping = dealBoards(grouped, "grouping", 3, 3, groupOfItem);
  for (const [i, deck] of grouping.decks.entries()) {
    const groups = new Set(deck.map(groupOfItem));
    if (groups.size < 2) fail(`dealBoards: ${i + 1}-o'yinchi grouping taxtasida ${groups.size} ta guruh qoldi`);
    if (!deck.length) fail(`dealBoards: ${i + 1}-o'yinchi grouping taxtasi bo'sh`);
  }
  if (grouping.split && new Set(grouping.decks.map((d) => d.length)).size !== 1) {
    fail("dealBoards: grouping taxtalari teng miqdorda emas");
  }
}

// ---- 3. Sozlama: standartlar va chegaralar ----
{
  const base = defaultSetup("quiz", 10);
  if (base.players !== 1) fail("defaultSetup: standart rejim 1 kishi emas");
  if (base.perPlayer !== 10) fail(`defaultSetup: standart savollar soni ${base.perPlayer} (10 kutilgan)`);
  if (base.names[0] !== "1-o'yinchi" || base.names[2] !== "3-o'yinchi") {
    fail("defaultSetup: standart o'yinchi ismlari noto'g'ri");
  }

  const clamped = clampSetup(
    { ...base, players: 9 as PlayerCount, perPlayer: 0, minutes: 0, names: ["", "Bo'sh"] },
    "quiz",
    10
  );
  if (clamped.players !== 3) fail(`clampSetup: 9 o'yinchi ${clamped.players} ga chegaralandi (3 kutilgan)`);
  if (clamped.perPlayer < 1) fail("clampSetup: savollar soni 1 dan kam bo'lib qoldi");
  if (clamped.minutes !== MULTIPLAYER_DEFAULT_MINUTES) fail("clampSetup: 0 minut standartga qaytmadi");
  if (clamped.names.length !== 3) fail("clampSetup: ismlar soni o'yinchilar soniga mos emas");
  if (clamped.names[0] !== "1-o'yinchi") fail("clampSetup: bo'sh ism standart nomga almashtirilmadi");
  if (clamped.names[1] !== "Bo'sh") fail("clampSetup: kiritilgan ism yo'qoldi");
  if (clamped.studentIds.length !== 3) fail("clampSetup: studentIds uzunligi mos emas");

  const board = clampSetup({ ...defaultSetup("matching", 6), players: 2 }, "matching", 6);
  if (plannedRounds("matching", board) !== 1) fail("plannedRounds: taxta o'yinida standart 1 raund emas");
  if (itemsPerRound("matching", 6, board) !== 6) fail("itemsPerRound: taxta o'yinida butun to'plam kutilgan");
}

// ---- 4. Rejimlar: "savollar soni" va "vaqt bo'yicha" ----
{
  const countSetup = clampSetup({ ...defaultSetup("quiz", 12), players: 3, perPlayer: 4 }, "quiz", 12);
  if (itemsPerRound("quiz", 12, countSetup) !== 4) fail("itemsPerRound: count rejimida 4 savol kutilgan");
  if (plannedRounds("quiz", countSetup) !== 1) fail("plannedRounds: count rejimida 1 raund kutilgan");

  const timeSetup = clampSetup({ ...countSetup, mode: "time", minutes: 3 }, "quiz", 12);
  if (plannedRounds("quiz", timeSetup) !== null) fail("plannedRounds: vaqt rejimida cheksiz (null) kutilgan");
  if (itemsPerRound("quiz", 12, timeSetup) !== MULTIPLAYER_TIMED_ROUND_ITEMS) {
    fail("itemsPerRound: vaqt rejimida raund hajmi noto'g'ri");
  }

  // Har raundda har xil savollar (vaqt rejimida savollar takrorlanib turadi)
  const items = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}` }));
  const seen: Array<Array<{ id: string }>> = [0, 1, 2].map((round) => dealRound(items, "quiz", timeSetup, 0, round));
  for (const [i, deck] of seen.entries()) {
    if (deck.length !== MULTIPLAYER_TIMED_ROUND_ITEMS) {
      fail(`dealRound: ${i}-raundda ${deck.length} ta savol (${MULTIPLAYER_TIMED_ROUND_ITEMS} kutilgan)`);
    }
  }
  if (JSON.stringify(seen[0]) === JSON.stringify(seen[1])) {
    fail("dealRound: 2-raund 1-raund bilan bir xil (vaqt rejimida savollar yangilanmayapti)");
  }

  // Bir raundda uch o'yinchi — har xil savol
  for (const round of [0, 1, 2]) {
    const decks = [0, 1, 2].map((i) => dealRound(items, "quiz", timeSetup, i, round));
    for (let k = 0; k < decks[0].length; k++) {
      const slot = decks.map((d) => d[k]?.id);
      if (new Set(slot).size !== 3) fail(`dealRound: ${round}-raund ${k}-slotida takroriy savol`);
    }
  }
}

// ---- 5. O'rinlar: g'olib, durrang, foiz bo'yicha tenglashtirish ----
{
  const st = standings([
    { index: 0, name: "Ali", score: 7, total: 10 },
    { index: 1, name: "Vali", score: 9, total: 10 },
    { index: 2, name: "Salim", score: 7, total: 8 },
  ]);
  if (st.winners.length !== 1 || st.winners[0] !== 1) fail(`standings: g'olib noto'g'ri (${st.winners.join(",")})`);
  if (st.draw) fail("standings: yagona g'olib bo'lsa ham durrang deb topildi");
  if (st.order[0] !== 1) fail("standings: birinchi o'rin noto'g'ri");
  if (st.place[2] !== 2 || st.place[0] !== 3) {
    fail(`standings: o'rinlar noto'g'ri (7/8 → 2-o'rin, 7/10 → 3-o'rin), ${JSON.stringify(st.place)}`);
  }

  const draw = standings([
    { index: 0, name: "A", score: 5, total: 10 },
    { index: 1, name: "B", score: 5, total: 10 },
  ]);
  if (!draw.draw || draw.winners.length !== 2) fail("standings: durrang aniqlanmadi");

  if (formatClock(125) !== "2:05") fail(`formatClock: 125 → ${formatClock(125)} (2:05 kutilgan)`);
  if (formatClock(-5) !== "0:00") fail("formatClock: manfiy vaqt");
  if (percentOf(3, 0) !== 0) fail("percentOf: nolga bo'lish");
  if (percentOf(9, 10) !== 90) fail("percentOf: 9/10 ≠ 90%");
  if (starsFor(95) !== 3 || starsFor(75) !== 2 || starsFor(50) !== 1 || starsFor(10) !== 0) {
    fail("starsFor: yulduzlar chegarasi noto'g'ri");
  }
}

// ---- 6. Statistika: har o'yinchi alohida yozuv ----
{
  const results: GameResult[] = [
    {
      id: "r1",
      bookId: "b1",
      topicId: "t1",
      topicTitle: "Mavzu 1",
      gameId: "g1",
      gameTitle: "Test o'yini",
      gameType: "quiz",
      studentId: "s1",
      studentName: "Ali Valiyev",
      score: 8,
      total: 10,
      timeSec: 60,
      createdAt: "2026-09-13T09:00:00.000Z",
    },
    {
      id: "r2",
      bookId: "b1",
      topicId: "t1",
      topicTitle: "Mavzu 1",
      gameId: "g1",
      gameTitle: "Test o'yini",
      gameType: "quiz",
      studentId: null,
      studentName: "2-o'yinchi",
      score: 6,
      total: 10,
      timeSec: 60,
      createdAt: "2026-09-13T09:05:00.000Z",
    },
    {
      id: "r3",
      bookId: "",
      topicId: "custom",
      topicTitle: "O'qituvchi o'yini",
      gameId: "g2",
      gameTitle: "Xotira kartalari",
      gameType: "memory",
      studentId: "s2",
      studentName: "",
      score: 3,
      total: 6,
      timeSec: 90,
      createdAt: "2026-09-13T10:00:00.000Z",
    },
  ];

  const sum = summarizeGameResults(results, 2);
  if (sum.plays !== 3) fail(`summarize: ${sum.plays} ta o'ynash hisoblandi (3 kutilgan)`);
  if (sum.games !== 2) fail(`summarize: ${sum.games} ta o'yin hisoblandi (2 kutilgan)`);
  if (sum.percent !== 65) fail(`summarize: o'rtacha ${sum.percent}% (17/26 → 65% kutilgan)`);
  if (sum.withStudent !== 2 || sum.guest !== 1) {
    fail(`summarize: o'quvchiga bog'langan ${sum.withStudent}, ism bilan ${sum.guest} (2/1 kutilgan)`);
  }
  if (sum.byGame[0]?.gameId !== "g1" || sum.byGame[0]?.played !== 2) {
    fail("summarize: eng ko'p o'ynalgan o'yin noto'g'ri aniqlandi");
  }
  if (sum.byGame[0]?.players !== 2) fail("summarize: o'yindagi o'yinchilar soni noto'g'ri");
  if (sum.byPlayer.length !== 3) fail(`summarize: ${sum.byPlayer.length} ta o'yinchi (3 kutilgan)`);
  if (sum.byPlayer.some((p) => !p.name)) fail("summarize: ismsiz o'yinchi qatori bor");
  if (sum.recent.length !== 2) fail("summarize: oxirgi natijalar chegarasi ishlamadi");
  if (sum.recent[0]?.id !== "r3") fail("summarize: oxirgi natijalar sanasi bo'yicha tartiblanmagan");
  if (sum.byType.length !== 2) fail("summarize: turlar kesimi noto'g'ri");
  if (playerName(results[2]) !== "Mehmon") fail("playerName: bo'sh ism 'Mehmon'ga almashtirilmadi");
}

console.log(problems ? `\n${problems} ta muammo topildi` : "\n✅ Hamma tekshiruvlar o'tdi");
process.exit(problems ? 1 : 0);
