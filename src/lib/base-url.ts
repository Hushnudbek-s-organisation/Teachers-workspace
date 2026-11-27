import "server-only";

// ============================================================================
// Ilovaning ommaviy bazaviy URL'i — o'quvchi linklari va taklif linklari uchun.
//   1. NEXT_PUBLIC_SITE_URL env (Vercel'da tavsiya etiladi)
//   2. X-Forwarded-Host / Host sarlavhalari (so'rov kontekstida)
//   3. http://localhost:3000 (tests / demo)
// ============================================================================

import { headers } from "next/headers";

export async function getBaseUrl(): Promise<string> {
  const envUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");

  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    // So'rov kontekstidan tashqarida (tests) — fallback
  }
  return "http://localhost:3000";
}
