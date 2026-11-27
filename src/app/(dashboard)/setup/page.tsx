import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, Database, Globe2, Table2, XCircle } from "lucide-react";
import { RecheckButton } from "@/components/setup/RecheckButton";
import { EXPECTED_TABLES, EXPECTED_VIEWS, runDiagnostics, type CheckRow } from "@/lib/diagnostics";

// ============================================================================
// /setup — "Sozlash tekshiruvi"
//
// Production'da sahifa 500 bo'lganda foydalanuvchi faqat digest ko'rar edi.
// Bu sahifa aniq javob beradi: ulanish bormi, qaysi jadval/VIEW yo'q,
// kalit to'g'rimi — va nima qilish kerak.
// ============================================================================

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sozlash tekshiruvi — Teachers Workspace",
};

const STATUS_ICON = {
  ok: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  missing: <XCircle className="h-4 w-4 text-red-600" />,
  error: <XCircle className="h-4 w-4 text-amber-600" />,
} as const;

const STATUS_LABEL = { ok: "bor", missing: "topilmadi", error: "xato" } as const;

export default async function SetupPage() {
  const report = await runDiagnostics();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sozlash tekshiruvi</h1>
          <p className="mt-1 text-sm text-slate-600">
            Ma'lumotlar bazasi ulanishi va sxemasi (10 jadval + 7 VIEW) tekshiriladi. Xato bo'lsa
            haqiqiy xabar matni va tuzatish yo'li ko'rsatiladi.
          </p>
        </div>
        <RecheckButton />
      </div>

      {/* ------------------------------ Umumiy holat ------------------------------ */}
      <section
        className={
          report.ok
            ? "mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
            : "mt-6 rounded-2xl border border-red-200 bg-red-50 p-5"
        }
      >
        <div className="flex items-start gap-3">
          {report.ok ? (
            <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
          ) : (
            <XCircle className="mt-0.5 h-6 w-6 shrink-0 text-red-600" />
          )}
          <div className="min-w-0">
            <p className={report.ok ? "text-sm font-bold text-emerald-900" : "text-sm font-bold text-red-900"}>
              {report.ok
                ? report.mode === "demo"
                  ? "Demo rejimi — Supabase sozlanmagan"
                  : "Hammasi ishlayapti"
                : "Muammo topildi"}
            </p>
            <p className={report.ok ? "mt-1 text-sm text-emerald-800" : "mt-1 text-sm text-red-800"}>
              {report.mode === "supabase"
                ? `Ulanish: ${report.connection.ok ? "bor" : "yo'q"} · jadval/VIEW tekshiruvi: ${
                    report.skippedSchema ? "o'tkazib yuborildi" : `${report.tables.length + report.views.length} ta`
                  } · ${report.durationMs} ms`
                : "Ilova xotiradagi demo ma'lumotlar bilan ishlayapti."}
            </p>
            {report.connection.message ? (
              <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 font-mono text-xs text-red-800">
                {report.connection.message}
              </p>
            ) : null}
            {report.connection.hint ? (
              <p className="mt-2 text-sm text-red-800">💡 {report.connection.hint}</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* --------------------------------- env --------------------------------- */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Globe2 className="h-4 w-4 text-indigo-600" />
          Sozlamalar (.env.local)
        </h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-slate-500">NEXT_PUBLIC_SUPABASE_URL</dt>
            <dd className="font-mono text-slate-900">{report.env.url || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">NEXT_PUBLIC_SUPABASE_ANON_KEY</dt>
            <dd className="text-slate-900">{report.env.hasAnonKey ? "✅ berilgan" : "❌ yo'q"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">SUPABASE_SERVICE_ROLE_KEY</dt>
            <dd className="text-slate-900">{report.env.hasServiceKey ? "✅ berilgan" : "❌ yo'q"}</dd>
          </div>
        </dl>
        {report.env.problems.length ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-red-700">
            {report.env.problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        ) : null}
      </section>

      {/* --------------------------- Jadval va VIEW'lar --------------------------- */}
      {!report.skippedSchema ? (
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Database className="h-4 w-4 text-indigo-600" />
            Baza obyektlari ({EXPECTED_TABLES.length} jadval · {EXPECTED_VIEWS.length} VIEW)
          </h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                <tr>
                  <th className="py-2 pr-3 font-medium">Nomi</th>
                  <th className="py-2 pr-3 font-medium">Turi</th>
                  <th className="py-2 pr-3 font-medium">Holat</th>
                  <th className="py-2 pr-3 font-medium">Qator</th>
                  <th className="py-2 pr-3 font-medium">ms</th>
                  <th className="py-2 font-medium">Xato / maslahat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...report.tables, ...report.views].map((row) => (
                  <Row key={row.name} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <p className="font-semibold">Jadval va VIEW'lar tekshirilmadi</p>
          <p className="mt-1">
            Avval ulanish masalasi hal qilinishi kerak — aks holda 17 ta so'rov ham xato qaytaradi va
            asl sabab ko'rinmay qoladi.
          </p>
        </section>
      )}

      {/* ------------------------------- Nima qilish ------------------------------ */}
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Table2 className="h-4 w-4 text-indigo-600" />
          Nima qilish kerak
        </h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-slate-700">
          {report.nextSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-slate-500">
          Xuddi shu holat JSON ko'rinishida:{" "}
          <Link href="/api/health" className="font-mono text-indigo-600 hover:underline">
            /api/health
          </Link>{" "}
          (monitoring uchun; muammo bo'lsa HTTP 503 qaytaradi).
        </p>
      </section>
    </div>
  );
}

function Row({ row }: { row: CheckRow }) {
  return (
    <tr>
      <td className="py-2 pr-3 font-mono text-slate-900">{row.name}</td>
      <td className="py-2 pr-3 text-slate-500">{row.kind === "view" ? "VIEW" : "jadval"}</td>
      <td className="py-2 pr-3">
        <span className="inline-flex items-center gap-1.5 text-slate-700">
          {STATUS_ICON[row.status]}
          {STATUS_LABEL[row.status]}
        </span>
      </td>
      <td className="py-2 pr-3 text-slate-600">{row.rows ?? "—"}</td>
      <td className="py-2 pr-3 text-slate-400">{row.ms}</td>
      <td className="py-2 text-xs text-slate-600">
        {row.message ? (
          <>
            <span className="font-mono text-red-700">{row.message}</span>
            {row.hint ? <span className="mt-1 block text-slate-500">💡 {row.hint}</span> : null}
          </>
        ) : (
          "—"
        )}
      </td>
    </tr>
  );
}
