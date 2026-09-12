"use client";

import { useState } from "react";
import { Grid3x3, Trophy, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Wheel } from "./Wheel";
import { TeamQuiz } from "./TeamQuiz";
import type { QuizQuestion } from "@/lib/books/quiz-pool";
import { BingoGenerator } from "./BingoGenerator";

type Tab = "wheel" | "quiz" | "bingo";

const TABS: { key: Tab; label: string; hint: string; icon: typeof Wand2 }[] = [
  { key: "wheel", label: "🎡 Charxpalak", hint: "Navbat yoki savol tanlash", icon: Wand2 },
  { key: "quiz", label: "🏆 Guruhlar viktorinasi", hint: "Kahoot uslubida ball yig'ish", icon: Trophy },
  { key: "bingo", label: "🎟 Bingo kartalari", hint: "Chop etib tarqatish", icon: Grid3x3 },
];

export function ClassroomTabs({
  studentNames,
  questionPools,
  bookWords,
}: {
  studentNames: string[];
  questionPools: { bookId: string; bookTitle: string; questions: QuizQuestion[] }[];
  bookWords: { book: string; words: string[] }[];
}) {
  const [tab, setTab] = useState<Tab>("wheel");

  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-3 print:hidden">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
              tab === t.key
                ? "border-indigo-500 bg-indigo-50"
                : "border-slate-200 bg-white hover:border-indigo-300"
            )}
          >
            <t.icon className={cn("h-5 w-5", tab === t.key ? "text-indigo-600" : "text-slate-400")} />
            <span>
              <span className="block text-sm font-semibold text-slate-800">{t.label}</span>
              <span className="block text-xs text-slate-500">{t.hint}</span>
            </span>
          </button>
        ))}
      </div>

      {tab === "wheel" ? <Wheel studentNames={studentNames} bookWords={bookWords} /> : null}
      {tab === "quiz" ? <TeamQuiz pools={questionPools} /> : null}
      {tab === "bingo" ? <BingoGenerator bookWords={bookWords} /> : null}
    </div>
  );
}
