// ============================================================================
// Kitob o'yinlaridan doskada o'ynash uchun savollar havzasini yig'ish
// (Kahoot uslubidagi guruhlar viktorinasi uchun)
// ============================================================================

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: number;
  source: string;
}

export function collectQuestions(
  games: { type: string; title: string; items: unknown[] }[]
): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const g of games) {
    for (const raw of g.items) {
      const it = raw as Record<string, unknown>;

      if (Array.isArray(it.options) && typeof it.answer === "number") {
        const options = (it.options as unknown[]).map(String).filter((o) => o.length > 0);
        const question = String(
          it.question ?? it.sentence ?? it.display ?? it.expression ?? ""
        ).trim();
        if (!question || options.length < 2) continue;
        const answer = Number(it.answer);
        if (answer < 0 || answer >= options.length) continue;
        out.push({ question, options, answer, source: g.title });
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
