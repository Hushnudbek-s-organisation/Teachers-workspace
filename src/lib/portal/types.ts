// ============================================================================
// Portal tiplari — o'quvchi shaxsiy linkidan kiradigan o'yin portali.
//
// MUHIM: brauzerga faqat `PortalQuestion` yuboriladi — u JAVOBSIZ (answer
// maydoni yo'q). Javob kaliti (`ServerQuestion.answer`) FAQAT SERVERDA turadi.
// ============================================================================

// ------------------------------- Savollar ----------------------------------

/** Tanlovli savol (test / tez hisob / juftini top / to'g'ri-noto'g'ri / harf) */
export interface McQuestion {
  kind: "mc";
  prompt: string;
  /** Tanlanadigan javoblar (aralashtirilgan) */
  options: string[];
  /** tf=true → ikki katta tugma (To'g'ri/Noto'g'ri) ko'rinishida */
  tf?: boolean;
}

/** Bo'laklardan yig'ish (so'z yasash, tartiblash) */
export interface OrderQuestion {
  kind: "order";
  prompt: string;
  /** Aralashtirilgan bo'laklar — shu tartibda ko'rinadi */
  pieces: string[];
}

/** Soatni top — variantlar analog soat ko'rinishida */
export interface ClockQuestion {
  kind: "clock";
  prompt: string;
  options: ClockFace[];
}

export interface ClockFace {
  /** 0–23 */
  h: number;
  /** 0–59 */
  m: number;
}

export type PortalQuestion = McQuestion | OrderQuestion | ClockQuestion;

export function questionKind(q: PortalQuestion): "mc" | "order" | "clock" {
  return q.kind;
}

// --------------------------- Serverdagi savol ------------------------------

/** Javob kaliti: mc/clock → to'g'ri variant indeksi; order → to'g'ri bo'laklar tartibi (matnlar) */
export type QuestionAnswer = number | number[] | string[];

export interface ServerQuestion {
  q: PortalQuestion;
  a: QuestionAnswer;
}

// ------------------------------- Katalog -----------------------------------

export type CatalogSource = "book" | "custom" | "practice";

export interface CatalogEntry {
  /** URL xavfsiz kalit: book:<bookId>:<topicId>:<gameId> | custom:<id> | practice:<slug> */
  key: string;
  title: string;
  instructions: string;
  /** Portalda qanday chiziladi: mc | order | clock (aralash bo'lsa — mixed) */
  boardKind: "mc" | "order" | "clock" | "mixed";
  emoji: string;
  /** Fan yorlig'i */
  subject: string;
  subjectKey: string;
  source: CatalogSource;
  /** "Mashq o'yinlari" — alohida belgilangan mashq o'yini */
  practice: boolean;
  savollar: number;
  /** Qisqacha manba nomi (kitob nomi / o'qituvchi) */
  origin: string;
}

// ------------------------------- Sessiyalar --------------------------------

/** Server action qaytaradigan sessiya holati (javob kaltisiz!) */
export interface PortalSessionView {
  sessionId: string;
  title: string;
  instructions: string;
  emoji: string;
  boardKind: "mc" | "order" | "clock" | "mixed";
  questions: PortalQuestion[];
  mode: "solo" | "duo";
}

export interface AnswerFeedback {
  correct: boolean;
  /** Javob berilgandan KEYINGINA qaytariladi (ko'rsatish uchun) */
  answerIndex?: number;
  answerText?: string;
}

export interface FinishOutcome {
  saved: boolean;
  alreadySaved: boolean;
  score: number;
  total: number;
  percent: number;
  problem?: string;
}

// --------------------------------- Xonalar ---------------------------------

export type RoomStatus = "waiting" | "playing" | "finished" | "cancelled";

/** Polling / sahifa uchun xona holati — ISMLAR YUBORILMAYDI */
export interface RoomStateView {
  status: RoomStatus;
  slot: "host" | "guest";
  guestJoined: boolean;
  myScore: number;
  /** Qayta ulanishda davom etish uchun: javob berilgan savollar soni */
  myAnswered: number;
  myDone: boolean;
  opponentScore: number | null;
  opponentDone: boolean;
  expired: boolean;
  total: number;
  /** Yakunlanish rejimi: questions = hamma savol, race = birinchi tugatgan, time = vaqt bo'yicha */
  endMode: "questions" | "race" | "time";
  /** Vaqt bo'yicha rejim: minutlar (1..10) */
  timeLimitMin: number | null;
  /** Poyga rejimi: birinchi tugatgan o'yinchi */
  winnerSlot: "host" | "guest" | null;
}
