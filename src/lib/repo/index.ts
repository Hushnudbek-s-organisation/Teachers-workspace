// ============================================================================
// Repository selector — Supabase when configured, in-memory demo otherwise.
// The whole app talks to this single entry point.
// ============================================================================

import { demoRepository } from "./demo";
import { supabaseRepository } from "./supabase";
import type { Repository } from "../types";

export function isSupabaseConfigured(): boolean {
  return validateSupabaseEnv().ok;
}

/**
 * Env qiymatlarini tekshiradi. Vercel'da o'zgaruvchi qo'yilgan, lekin
 * yarim / noto'g'ri bo'lsa (masalan "https://" yo'q yoki kalit bo'sh),
 * ilova Supabase rejimiga o'tib ishga tushishda xato berardi.
 * Endi bunday holatda xavfsiz demo rejimiga qaytamiz.
 */
export function validateSupabaseEnv(): { ok: boolean; problems: string[] } {
  const problems: string[] = [];
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
  const service = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  // Hech narsa berilmagan — bu xato emas, shunchaki demo rejimi.
  if (!url && !anon && !service) return { ok: false, problems };

  if (!url) {
    problems.push("NEXT_PUBLIC_SUPABASE_URL berilmagan.");
  } else if (!/^https:\/\/[^\s/]+\.[^\s/]+/.test(url)) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_URL to'liq emas — u 'https://xxxx.supabase.co' ko'rinishida bo'lishi kerak."
    );
  }

  if (!anon && !service) {
    problems.push(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY yoki SUPABASE_SERVICE_ROLE_KEY dan kamida bittasi kerak."
    );
  }

  if (problems.length > 0) {
    console.warn(
      `[repo] Supabase sozlamalari to'liq emas, demo rejimi yoqildi:\n - ${problems.join("\n - ")}`
    );
    return { ok: false, problems };
  }

  return { ok: true, problems };
}

export const repo: Repository = isSupabaseConfigured() ? supabaseRepository : demoRepository;

export const dataMode: "supabase" | "demo" = repo.mode;
