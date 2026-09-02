// ============================================================================
// Repository selector — Supabase when configured, in-memory demo otherwise.
// The whole app talks to this single entry point.
// ============================================================================

import { demoRepository } from "./demo";
import { supabaseRepository } from "./supabase";
import type { Repository } from "../types";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export const repo: Repository = isSupabaseConfigured() ? supabaseRepository : demoRepository;

export const dataMode: "supabase" | "demo" = repo.mode;
