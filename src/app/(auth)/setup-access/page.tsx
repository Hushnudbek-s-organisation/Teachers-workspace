import { countAccounts, listAccounts } from "@/lib/auth";
import { dataMode } from "@/lib/repo";
import { FirstAdminForm, AccountsOverview } from "@/components/auth/SetupAccessClient";

// ============================================================================
// /setup-access — xavfsiz egalik sozlash
//
//   • HISOBLAR YO'Q bo'lsa: birinchi ADMIN hisobini yaratish formasi ko'rinadi.
//     Bu yagona "bootstrap" nuqta: birinchi hisobdan keyin sahifa formani
//     yopadi va faqat admin qo'shimcha hisoblar haqida ma'lumot ko'radi.
//   • Egalik AVTOMATIK biriktirilmaydi: admin o'qituvchilar sahifasida har
//     bir hisobga sinf huquqlarini ANIQ beradi (teacher_class_access).
// ============================================================================

export const dynamic = "force-dynamic";

export default async function SetupAccessPage() {
  const total = await countAccounts();
  const accounts = total > 0 ? await listAccounts() : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-white">Kirish nazoratini sozlash</h2>
        <p className="mt-1 text-xs leading-relaxed text-slate-400">
          O'qituvchi hisoblari baza xeshlari bilan saqlanadi (parol scrypt, sessiya tokeni SHA-256).
          {dataMode === "demo"
            ? " Hozir demo rejimi yoqilgan — hisob xotirada saqlanadi (faqat sinov uchun)."
            : " Hisoblar Supabase'da teacher_accounts jadvalida saqlanadi."}
        </p>
      </div>

      {total === 0 ? (
        <FirstAdminForm />
      ) : (
        <AccountsOverview accounts={accounts} />
      )}
    </div>
  );
}
