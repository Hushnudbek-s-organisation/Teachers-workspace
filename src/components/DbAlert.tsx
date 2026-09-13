import Link from "next/link";
import { AlertTriangle, LifeBuoy } from "lucide-react";
import { headers } from "next/headers";
import { getDbIssues } from "@/lib/db-status";
import { getDbStatusSummary } from "@/lib/diagnostics";

// ============================================================================
// DbAlert — har sahifaning tepasida ko'rinadigan ogohlantirish
//
// Supabase javob bermasa sahifalar endi YIQILMAYDI: o'qish so'rovlari bo'sh
// ro'yxat qaytaradi (src/lib/db-status.ts), bu komponent esa nima bo'lganini
// va qayerda tuzatishni aytadi.
// ============================================================================

export async function DbAlert() {
  const list = await headers();
  const path = list.get("next-url") ?? list.get("x-invoke-path") ?? "";
  // Sozlash tekshiruvi sahifasida o'z hisoboti bor — takrorlamaymiz
  if (path.startsWith("/setup")) return null;

  const issues = getDbIssues();
  const summary = await getDbStatusSummary();
  if (summary.ok && !issues.length) return null;

  const issue = issues[0];
  const title = issue?.message ?? summary.title;
  // issue bo'lsa uning o'zi yetarli; aks holda probe xulosasi ko'rsatiladi
  const detail = issue ? undefined : summary.detail;
  const hint = issue?.hint ?? summary.hint;

  const fatal = !summary.ok;

  return (
    <div
      role="alert"
      className={
        fatal
          ? "border-b border-red-200 bg-red-50"
          : "border-b border-amber-200 bg-amber-50"
      }
    >
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className={fatal ? "mt-0.5 h-5 w-5 shrink-0 text-red-600" : "mt-0.5 h-5 w-5 shrink-0 text-amber-600"}
          />
          <div className="min-w-0">
            <p className={fatal ? "text-sm font-semibold text-red-900" : "text-sm font-semibold text-amber-900"}>
              {fatal ? "Ma'lumotlar bazasi bilan muammo" : "Ma'lumotlar to'liq ko'rsatilmagan bo'lishi mumkin"}
            </p>
            <p className={fatal ? "mt-0.5 text-sm text-red-800" : "mt-0.5 text-sm text-amber-800"}>{title}</p>
            {detail ? (
              <p className={fatal ? "mt-1 text-xs text-red-700" : "mt-1 text-xs text-amber-700"}>{detail}</p>
            ) : null}
            {hint ? (
              <p className={fatal ? "mt-1 text-xs font-medium text-red-700" : "mt-1 text-xs font-medium text-amber-700"}>
                💡 {hint}
              </p>
            ) : null}
            {issue ? (
              <p className={fatal ? "mt-1 text-xs text-red-600" : "mt-1 text-xs text-amber-600"}>
                Manba: <code>{issue.source}</code>
              </p>
            ) : null}
          </div>
        </div>
        <Link
          href="/setup"
          className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50"
        >
          <LifeBuoy className="h-4 w-4" />
          Sozlash tekshiruvi
        </Link>
      </div>
    </div>
  );
}
