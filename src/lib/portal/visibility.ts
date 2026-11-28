// ============================================================================
// O'QUVCHI PORTALIDA O'YINLARNI YOPISH/OCHISH (foydalanuvchi talabi)
//
//   • O'qituvchi /games sahifasida har o'yin yonidagi tugma bilan o'yinni
//     bolalardan "berkilib" qo'ya oladi — portalda umuman ko'rinmaydi
//   • Faqat o'qituvchi (dashboard) ochadi — bolalarda bunday tugma yo'q
//   • Bazada faqat YOPILGAN o'yinlar kalitlari saqlanadi (portal_closed_games)
// ============================================================================

import "server-only";
import { cached, invalidateCache } from "@/lib/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseFetch } from "@/lib/supabase-fetch";
import { isSupabaseConfigured } from "@/lib/repo";

export interface ClosedGameRow {
  key: string;
  closed_at: string;
}

interface DemoVis {
  closed: Map<string, string>;
}

const gd = globalThis as unknown as { __portalClosedGames?: DemoVis };

function demo(): DemoVis {
  if (!gd.__portalClosedGames) gd.__portalClosedGames = { closed: new Map() };
  return gd.__portalClosedGames;
}

/** Testlar uchun */
export function resetVisibilityDemoStore(): void {
  gd.__portalClosedGames = undefined;
}

let sbClient: SupabaseClient | null = null;

function sb(): SupabaseClient {
  if (sbClient) return sbClient;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();
  sbClient = createClient(url, key, {
    auth: { persistSession: false },
    global: { fetch: supabaseFetch },
  });
  return sbClient;
}

/** Yopilgan o'yinlar kalitlari (katalog filtrlash uchun) — 10 s TTL kesh bilan */
export async function listClosedGameKeys(): Promise<Set<string>> {
  return cached("portal:closed", 10_000, async () => {
    if (!isSupabaseConfigured()) return new Set(demo().closed.keys());
    const res = await sb().from("portal_closed_games").select("key");
    const rows = (res.data ?? []) as Array<{ key: string }>;
    return new Set(rows.map((r) => r.key));
  });
}

export async function closePortalGame(key: string): Promise<void> {
  if (!key) return;
  invalidateCache("portal:closed");
  invalidateCache("portal:cat:");
  if (!isSupabaseConfigured()) {
    demo().closed.set(key, new Date().toISOString());
    return;
  }
  await sb().from("portal_closed_games").upsert({ key }, { onConflict: "key" });
}

export async function openPortalGame(key: string): Promise<void> {
  if (!key) return;
  invalidateCache("portal:closed");
  invalidateCache("portal:cat:");
  if (!isSupabaseConfigured()) {
    demo().closed.delete(key);
    return;
  }
  await sb().from("portal_closed_games").delete().eq("key", key);
}
