"use client";

// ============================================================================
// global-error.tsx — ildiz layout'ning o'zi yiqilganda ishlaydigan oxirgi
// himoya chizig'i. Next.js bu holatda o'z <html>/<body>'sini talab qiladi.
// ============================================================================

import { AlertTriangle, LifeBuoy, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="uz">
      <body style={{ margin: 0, background: "#f8fafc", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "64px 20px" }}>
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-start",
              border: "1px solid #fecaca",
              background: "#fef2f2",
              borderRadius: 16,
              padding: 24,
            }}
          >
            <AlertTriangle size={24} color="#dc2626" />
            <div>
              <h1 style={{ margin: 0, fontSize: 18, color: "#7f1d1d" }}>
                Ilova ishlamay qoldi
              </h1>
              <p style={{ margin: "8px 0 0", fontSize: 14, color: "#991b1b" }}>
                Eng ko'p sabab — Supabase bilan ulanish yoki baza sxemasi (schema.sql) bilan bog'liq
                muammo. Sozlash tekshiruvi sahifasi aniq sababni ko'rsatadi.
              </p>
              {error.digest ? (
                <p
                  style={{
                    marginTop: 12,
                    padding: "8px 12px",
                    background: "rgba(255,255,255,.7)",
                    borderRadius: 8,
                    fontFamily: "monospace",
                    fontSize: 12,
                    color: "#b91c1c",
                  }}
                >
                  Xato kodi (digest): {error.digest}
                </p>
              ) : null}
              <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  onClick={reset}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#4f46e5",
                    color: "#fff",
                    border: 0,
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontSize: 14,
                    cursor: "pointer",
                  }}
                >
                  <RefreshCw size={16} />
                  Qayta urinish
                </button>
                <a
                  href="/setup"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    background: "#fff",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontSize: 14,
                    textDecoration: "none",
                  }}
                >
                  <LifeBuoy size={16} />
                  Sozlash tekshiruvi
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
