import type { Metadata } from "next";
import "./globals.css";
import { MobileNav, Sidebar } from "@/components/Sidebar";
import { DbAlert } from "@/components/DbAlert";
import { dataMode } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Teachers Workspace — Maktab boshqaruv tizimi",
  description:
    "O'quvchilar, ota-onalar, o'qituvchilar, dars jadvali, davomat va baholash tizimi bilan to'liq maktab boshqaruv paneli.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <DbAlert />
        <div className="flex min-h-screen flex-col md:flex-row">
          <MobileNav />
          <Sidebar mode={dataMode} />
          <main className="min-w-0 flex-1">
            <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
