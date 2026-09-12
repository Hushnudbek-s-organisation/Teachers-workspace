// ============================================================================
// Kitob o'yinlaridan doskada o'ynash uchun savollar havzasi yig'ish
// (Kahoot uslubidagi guruhlar viktorinasi uchun)
// ============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  source: string;
}

/**
 * Elementdan savol-javob ko'rinishini oladi.
 *
 * Diqqat: element turiga qarab `answer` MA'NOSI farq qiladi:
 *   • quiz / findmistake  → `answer` — variant indeksi
 *   • fill / missingletter→ `answer` — to'g'ri so'z/harf (variant matni)
 *   • math / pop          → `answer` — sonning o'zi (indeks emas!)
 * Shuning uchun har bir tur alohida ishlanadi.
 */
function toQuestion(raw: unknown, source: string): QuizQuestion | null {
  const it = raw as Record<string, unknown>;
  if (!Array.isArray(it.options)) return null;

  const options = (it.options as unknown[]).map((o) => String(o ?? "").trim());
  if (options.length < 2 || options.some((o) => !o)) return null;

  const question = String(it.question ?? it.sentence ?? it.display ?? it.expression ?? "")
    .trim()
    .replace(/_{2,}/g, "______");
  if (!question) return null;

  // 1) Sonli hisoblash (math/pop): javob — son, indeksni o'zimiz topamiz
  if (typeof it.expression === "string" || typeof it.answer === "number") {
    const idx = options.findIndex((o) => o === String(it.answer));
    if (idx >= 0) return { question, options, answer: idx, source };
    // `answer` son bo'lib, variantlar orasida topilmasa — element yaroqsiz
    if (typeof it.answer === "number" && typeof it.expression === "string") return null;
  }

  // 2) Matnli javob (fill/missingletter): `answer` — variant matni
  if (typeof it.answer === "string") {
    const idx = options.findIndex((o) => o === String(it.answer).trim());
    if (idx < 0) return null;
    return { question, options, answer: idx, source };
  }

  // 3) Test (quiz/findmistake): `answer` — variant indeksi
  if (typeof it.answer === "number") {
    if (it.answer < 0 || it.answer >= options.length) return null;
    return { question, options, answer: it.answer, source };
  }

  return null;
}

export function collectQuestions(
  games: { type: string; title: string; items: unknown[] }[]
): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const g of games) {
    for (const raw of g.items) {
      const it = raw as Record<string, unknown>;

      if (Array.isArray(it.options)) {
        const q = toQuestion(it, g.title);
        if (q) out.push(q);
      } else if (typeof it.isTrue === "boolean" && typeof it.statement === "string") {
        out.push({
          question: it.statement,
          options: ["✅ To'g'ri", "❌ Noto'g'ri"],
          answer: it.isTrue ? 0 : 1,
          source: g.title,
        });
      }
      if (out.length >= 80) return out;
    }
  }
  return out;
}
