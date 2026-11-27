// ============================================================================
// Portalning "xato/havola yaroqsiz" ekranlari — bolaga tushunarli, xavfsiz:
// hech qanday ma'lumot, ID, ism ko'rsatilmaydi.
// ============================================================================

import { Gamepad2 } from "lucide-react";

export function PortalLinkError({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 px-4">
      <div className="w-full max-w-md rounded-2xl border-2 border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
          <Gamepad2 className="h-8 w-8" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
        <p className="mt-6 text-xs text-slate-400">
          Teachers Workspace · O'yin portali
        </p>
      </div>
    </div>
  );
}
