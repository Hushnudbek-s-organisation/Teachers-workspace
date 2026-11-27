import { MobileNav, Sidebar } from "@/components/Sidebar";
import { DbAlert } from "@/components/DbAlert";
import { dataMode } from "@/lib/repo";
import { requireTeacher } from "@/lib/auth";

// ============================================================================
// O'QITUVCHI PANELI LAYOUTI
//
// Bu layout HAMMA o'qituvchi sahifalariga qo'llanadi: sessiya tekshiruvi
// SERVERDA bajariladi (menu yashirish emas). Sessiya yo'q bo'lsa — /login.
// URL'lar o'zgarmagan: /students, /books, /games/stats va h.k.
// ============================================================================

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireTeacher();

  return (
    <>
      <DbAlert />
      <div className="flex min-h-screen flex-col md:flex-row">
        <MobileNav />
        <Sidebar mode={dataMode} session={session} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </>
  );
}
