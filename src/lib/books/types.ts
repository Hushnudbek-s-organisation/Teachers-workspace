// ============================================================================
// "Kitob → O'yin" moduli tiplari
//
// Oqim:  PDF → matn → mavzular (bo'limlar) → misollar/nazariya → o'yinlar
// ============================================================================

// ------------------------------ Fan (subject) ------------------------------

export type SubjectKey =
  | "matematika"
  | "ona-tili"
  | "oqish"
  | "tabiiy-fanlar"
  | "ingliz-tili"
  | "rus-tili"
  | "boshqa";

export interface SubjectMeta {
  key: SubjectKey;
  label: string;
  emoji: string;
  /** Tailwind classes: badge, gradient for cards */
  badge: string;
  gradient: string;
  /** Fan uchun xos o'yin strategiyasi */
  strategy: "math" | "language" | "reading" | "science" | "foreign" | "generic";
}

export const SUBJECTS: Record<SubjectKey, SubjectMeta> = {
  matematika: {
    key: "matematika",
    label: "Matematika",
    emoji: "🔢",
    badge: "border-sky-200 bg-sky-50 text-sky-700",
    gradient: "from-sky-500 to-indigo-500",
    strategy: "math",
  },
  "ona-tili": {
    key: "ona-tili",
    label: "Ona tili",
    emoji: "📗",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    gradient: "from-emerald-500 to-teal-500",
    strategy: "language",
  },
  oqish: {
    key: "oqish",
    label: "O'qish savodxonligi",
    emoji: "📚",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    gradient: "from-violet-500 to-fuchsia-500",
    strategy: "reading",
  },
  "tabiiy-fanlar": {
    key: "tabiiy-fanlar",
    label: "Tabiiy fanlar",
    emoji: "🌱",
    badge: "border-lime-200 bg-lime-50 text-lime-700",
    gradient: "from-lime-500 to-emerald-600",
    strategy: "science",
  },
  "ingliz-tili": {
    key: "ingliz-tili",
    label: "Ingliz tili",
    emoji: "🇬🇧",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    gradient: "from-rose-500 to-orange-500",
    strategy: "foreign",
  },
  "rus-tili": {
    key: "rus-tili",
    label: "Rus tili",
    emoji: "🇷🇺",
    badge: "border-cyan-200 bg-cyan-50 text-cyan-700",
    gradient: "from-cyan-500 to-blue-600",
    strategy: "foreign",
  },
  boshqa: {
    key: "boshqa",
    label: "Boshqa fan",
    emoji: "🎒",
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    gradient: "from-slate-500 to-slate-700",
    strategy: "generic",
  },
};

export const SUBJECT_LIST: SubjectMeta[] = Object.values(SUBJECTS);

/** Darslik nomidan fanni taxmin qilish (fayl nomi: "3-sinf matematika.pdf") */
export function guessSubject(text: string): SubjectKey {
  const t = text.toLowerCase();
  if (/matematika|математика|algebra/.test(t)) return "matematika";
  if (/ona\s?tili|ona-tili|родной язык|o'zbek tili/.test(t)) return "ona-tili";
  if (/o.?qish|savodxonlik|adabiyot|чтение|mutolaa/.test(t)) return "oqish";
  if (/tabiiy|tabiatshunoslik|природовед|ботаника|биология|atrof-muhit/.test(t))
    return "tabiiy-fanlar";
  if (/ingliz|english/.test(t)) return "ingliz-tili";
  if (/rus tili|russian|русский/.test(t)) return "rus-tili";
  return "boshqa";
}

// -------------------------------- O'yinlar ---------------------------------

export type GameType = "quiz" | "matching" | "fill" | "truefalse" | "order" | "math" | "memory";

export interface GameTypeMeta {
  key: GameType;
  label: string;
  emoji: string;
  hint: string;
  color: string;
}

export const GAME_TYPES: Record<GameType, GameTypeMeta> = {
  quiz: {
    key: "quiz",
    label: "Test",
    emoji: "❓",
    hint: "Savolga 4 ta javobdan bittasini tanlang",
    color: "border-indigo-200 bg-indigo-50 text-indigo-700",
  },
  matching: {
    key: "matching",
    label: "Juftini top",
    emoji: "🔗",
    hint: "Chap va o'ng ustundagi mos juftliklarni ulang",
    color: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  fill: {
    key: "fill",
    label: "Bo'sh joyni to'ldir",
    emoji: "✏️",
    hint: "Gapdagi tushib qolgan so'zni toping",
    color: "border-amber-200 bg-amber-50 text-amber-700",
  },
  truefalse: {
    key: "truefalse",
    label: "To'g'ri / noto'g'ri",
    emoji: "⚖️",
    hint: "Fikr to'g'rimi yoki noto'g'rimi?",
    color: "border-sky-200 bg-sky-50 text-sky-700",
  },
  order: {
    key: "order",
    label: "Tartibla",
    emoji: "🔀",
    hint: "So'zlar/gaplarni to'g'ri tartibga soling",
    color: "border-violet-200 bg-violet-50 text-violet-700",
  },
  math: {
    key: "math",
    label: "Tez hisob",
    emoji: "⚡",
    hint: "Misolni tez hisoblab, to'g'ri javobni bosing",
    color: "border-orange-200 bg-orange-50 text-orange-700",
  },
  memory: {
    key: "memory",
    label: "Xotira kartalari",
    emoji: "🧠",
    hint: "Kartalarni ochib, mos juftliklarni yodda saqlang",
    color: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
  },
};

// ---- O'yin elementlari (game items) ----

export interface QuizItem {
  question: string;
  options: string[];
  answer: number;
  hint?: string;
}

export interface MatchingItem {
  left: string;
  right: string;
}

export interface FillItem {
  /** Tushib qolgan so'z "___" bilan belgilanadi */
  sentence: string;
  answer: string;
  options: string[];
}

export interface TrueFalseItem {
  statement: string;
  isTrue: boolean;
  reason?: string;
}

export interface OrderItem {
  prompt: string;
  /** To'g'ri tartibdagi elementlar */
  tokens: string[];
}

export interface MathItem {
  expression: string;
  answer: number;
  options: number[];
}

export type GameItem =
  | QuizItem
  | MatchingItem
  | FillItem
  | TrueFalseItem
  | OrderItem
  | MathItem;

export interface Game {
  id: string;
  type: GameType;
  title: string;
  instructions: string;
  difficulty: 1 | 2 | 3;
  items: GameItem[];
  builtFrom: {
    note: string;
    pages: number[];
  };
}

// --------------------------- Kitob ichidagi mavzu --------------------------

export type ExampleKind =
  | "arifmetika"
  | "masala"
  | "topshiriq"
  | "savol"
  | "qoida"
  | "ta'rif"
  | "lugat"
  | "matn"
  | "sana";

export const EXAMPLE_LABELS: Record<ExampleKind, string> = {
  arifmetika: "Misol",
  masala: "Masala",
  topshiriq: "Topshiriq",
  savol: "Savol",
  qoida: "Qoida",
  "ta'rif": "Ta'rif",
  lugat: "Lug'at",
  matn: "Matn",
  sana: "Sana/tarix",
};

export interface TopicExample {
  id: string;
  kind: ExampleKind;
  text: string;
  /** Kitobdagi sahifa raqami */
  page: number;
  /** Mos keladigan o'yin (agar shu misoldan o'yin yasalgan bo'lsa) */
  usedIn?: string;
}

export interface Topic {
  id: string;
  /** 1 dan boshlanadigan tartib raqami */
  index: number;
  title: string;
  /** Bo'lim (chapter) nomi — ixtiyoriy */
  section?: string;
  pageStart: number;
  pageEnd: number;
  /** Mavzu matni (tozalangan) */
  text: string;
  keywords: string[];
  examples: TopicExample[];
  games: Game[];
}

// --------------------------------- Kitob -----------------------------------

export type BookMode = "namuna" | "yuklangan";

export interface BookSource {
  kind: "pdf" | "matn";
  fileName: string;
  sizeBytes: number;
  pages: number;
  /** PDF'dan olingan matnning umumiy belgi soni */
  chars: number;
  /** Matn qatlami juda kam bo'lsa — skanerlangan PDF */
  scanWarn?: boolean;
}

export interface BookStats {
  topics: number;
  games: number;
  items: number;
  pages: number;
  chars: number;
}

export interface Book {
  id: string;
  title: string;
  grade: number;
  subject: SubjectKey;
  subjectLabel: string;
  language: "uz" | "ru" | "en" | "boshqa";
  author?: string;
  mode: BookMode;
  source: BookSource;
  createdAt: string;
  topics: Topic[];
  stats: BookStats;
}

/** Ro'yxat sahifasi uchun yengil ko'rinish (mavzularsiz) */
export interface BookMeta {
  id: string;
  title: string;
  grade: number;
  subject: SubjectKey;
  subjectLabel: string;
  author?: string;
  mode: BookMode;
  createdAt: string;
  source: BookSource;
  stats: BookStats;
  /** Kitobdagi birinchi 6 mavzu nomi (karta uchun) */
  topicTitles: string[];
}

// ----------------------------- O'yin natijalari ----------------------------

export interface GameResult {
  id: string;
  bookId: string;
  topicId: string;
  topicTitle: string;
  gameId: string;
  gameTitle: string;
  gameType: GameType;
  studentId?: string | null;
  studentName?: string | null;
  score: number;
  total: number;
  timeSec: number;
  createdAt: string;
}

export interface TopicWithBook {
  book: BookMeta;
  topic: Topic;
}
