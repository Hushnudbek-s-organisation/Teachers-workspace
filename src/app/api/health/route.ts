import { NextResponse } from "next/server";
import { runDiagnostics } from "@/lib/diagnostics";

// ============================================================================
// GET /api/health — sozlash tekshiruvi JSON ko'rinishida (monitoring uchun)
//
//   200 → baza bilan hammasi joyida (yoki ilova demo rejimida)
//   503 → ulanish/sxema muammosi (UptimeRobot kabi servislar shuni kutadi)
//
// Kalitlar hech qachon qaytarilmaydi — faqat "berilgan/yo'q".
// ============================================================================

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const report = await runDiagnostics();

  const body = {
    ok: report.ok,
    status: report.ok ? "healthy" : "unhealthy",
    mode: report.mode,
    checkedAt: report.checkedAt,
    durationMs: report.durationMs,
    env: report.env,
    connection: report.connection,
    schema: {
      checked: !report.skippedSchema,
      tables: report.tables,
      views: report.views,
      missing: [...report.tables, ...report.views].filter((r) => r.status === "missing").map((r) => r.name),
      errors: [...report.tables, ...report.views].filter((r) => r.status === "error").map((r) => r.name),
    },
    nextSteps: report.nextSteps,
  };

  return NextResponse.json(body, { status: report.ok ? 200 : 503 });
}
