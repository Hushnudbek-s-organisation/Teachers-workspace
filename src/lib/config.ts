// ============================================================================
// Ilova konfiguratsiyasi
//
// Ilgari bu qiymatlar kod ichida har xil joyda "qotib qolgan" edi
// (masalan, hamma joyda 3-sinf, alifbo ro'yxati takrorlangan, limitlar
// funksiyalar ichida yashiringan). Endi hammasi shu yerda — bir joydan
// o'zgartirish kifoya.
// ============================================================================

import type { SubjectKey } from "./books/types";

// ------------------------------- Sinf (grade) -------------------------------

export const GRADES: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

/** Yangi kitob/o'yin qo'shganda taklif qilinadigan sinf */
export const DEFAULT_GRADE = 3;

export function isGrade(value: unknown): value is number {
  return typeof value === "number" && GRADES.includes(value);
}

export function normalizeGrade(value: unknown): number {
  const n = Number(value);
  return isGrade(n) ? n : DEFAULT_GRADE;
}

// ---------------------------------- Fan -------------------------------------

/** Fan tanlanmagan bo'lsa ishlatiladigan qiymat */
export const DEFAULT_SUBJECT: SubjectKey = "ona-tili";

// --------------------------- O'zbek lotin alifbosi --------------------------

/** O'zbek lotin alifbosidagi harflar (digraflar alohida emas) */
export const UZ_ALPHABET = [
  "a", "b", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m",
  "n", "o", "p", "q", "r", "s", "t", "u", "v", "x", "y", "z",
].join("").split("");

/** Unli harflar — imlo o'yinlarida ustuvor yashiriladi */
export const UZ_VOWELS = ["a", "e", "i", "o", "u"];

// ------------------------------- Kitob yuklash ------------------------------

/** PDF'dan olingan matn shu hajmdagi "sahifa"larga bo'linadi (sahifasiz matn uchun) */
export const TEXT_PAGE_CHARS = 2500;

/** Serverga bir chaqiruvda yuboriladigan sahifalar soni */
export const UPLOAD_BATCH_PAGES = 20;

/** Kitob sahifasida ko'rsatiladigan matn ko'rinishi (belgi) */
export const BOOK_TEXT_PREVIEW_CHARS = 1200;

/** PDF matn qatlami shu belgidan kam bo'lsa — skanerlangan PDF deb hisoblanadi */
export const SCANNED_PDF_CHARS_PER_PAGE = 120;

/** Yuklash sessiyasi qancha vaqt saqlanadi (ms) */
/** Kitob bo'yicha "chalg'ituvchi" variantlar uchun so'z boyligi hajmi */
export const BOOK_KEYWORD_POOL = 80;

export const UPLOAD_SESSION_TTL_MS = 60 * 60 * 1000;

/** Saqlanadigan o'yin natijalarining eng ko'p soni */
export const MAX_SAVED_RESULTS = 2000;

/** Saqlanadigan o'qituvchi o'yinlarining eng ko'p soni */
export const MAX_CUSTOM_GAMES = 500;

// --------------------------------- O'yinlar ---------------------------------

/** O'yin turi bo'yicha elementlar soni chegarasi */
export const MAX_ITEMS_PER_GAME: Record<string, number> = {
  quiz: 8,
  matching: 6,
  fill: 8,
  truefalse: 8,
  order: 5,
  math: 12,
  memory: 6,
  pop: 10,
  puzzle: 6,
  missingletter: 8,
  findmistake: 6,
  grouping: 12,
  bingo: 16,
};

/** O'yinning standart element soni (ro'yxatda yo'q tur uchun) */
export const DEFAULT_MAX_ITEMS = 8;

/** Bitta mavzudan ko'pi bilan shuncha o'yin chiqadi */
export const MAX_GAMES_PER_TOPIC = 7;

/** "Balonni ot" o'yinida har bir savolga beriladigan vaqt (sekund) */
export const POP_SECONDS_PER_ITEM = 15;

/** Guruhlar viktorinasida har bir savolga beriladigan vaqt (sekund) */
export const QUIZ_SECONDS_PER_QUESTION = 30;

/** Matnli masalani yechish uchun eng katta hajm (belgi) */
export const MAX_WORD_PROBLEM_CHARS = 300;

// --------------------- Bir qurilmada birga o'ynash (1/2/3) ------------------

/** Bir qurilmada bir vaqtda o'ynay oladigan eng ko'p o'yinchi */
export const MULTIPLAYER_MAX_PLAYERS = 3;

/** "Savollar soni" rejimida taklif qilinadigan standart savollar soni */
export const MULTIPLAYER_DEFAULT_QUESTIONS = 10;

/** Sozlamada kiritish mumkin bo'lgan eng katta savollar soni */
export const MULTIPLAYER_MAX_QUESTIONS = 40;

/** Taxta o'yinlarida (matching/memory/grouping/bingo) standart raundlar soni */
export const MULTIPLAYER_DEFAULT_ROUNDS = 1;

/** "Vaqt bo'yicha" rejimida taklif qilinadigan minutlar */
export const MULTIPLAYER_MINUTE_OPTIONS = [1, 2, 3, 5, 10];

/** "Vaqt bo'yicha" rejimining standart davomiyligi (minut) */
export const MULTIPLAYER_DEFAULT_MINUTES = 2;

/** "Vaqt bo'yicha" rejimida bir raundda beriladigan savollar soni */
export const MULTIPLAYER_TIMED_ROUND_ITEMS = 8;

/**
 * Taxta o'yinini o'yinchilar o'rtasida BO'LISH uchun har biriga kerak bo'lgan
 * eng kam element. Yetarli bo'lmasa hammaga bir xil to'plam (lekin har xil
 * tartibda) beriladi — o'yin juda mayda bo'lib qolmasligi uchun.
 */
export const MULTIPLAYER_MIN_BOARD_ITEMS: Record<string, number> = {
  matching: 4,
  memory: 4,
  grouping: 6,
  bingo: 9,
};

/** Bo'lingan taxtada qoladigan eng kam element (kichik to'plamlar uchun) */
export const MULTIPLAYER_MIN_BOARD_ITEMS_FALLBACK = 3;

// ------------------------------ O'qituvchi muharriri ------------------------

/** Bitta o'yinda ko'pi bilan shuncha element */
export const MAX_CUSTOM_ITEMS = 40;

/** Bir vaqtda API orqali yasash mumkin bo'lgan o'yinlar soni */
export const MAX_BULK_CUSTOM_GAMES = 50;
