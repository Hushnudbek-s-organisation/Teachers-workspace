import { School } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="rounded-2xl bg-indigo-600 p-3">
            <School className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Teachers Workspace</h1>
            <p className="mt-1 text-sm text-slate-400">
              O'qituvchi paneli — faqat ruxsat berilgan hisoblar uchun
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">{children}</div>
        <p className="mt-6 text-center text-xs text-slate-500">
          O'quvchilar bu yerdan kirmaydi — ular shaxsiy linklari orqali o'yin portali ga kiradi.
        </p>
      </div>
    </div>
  );
}
