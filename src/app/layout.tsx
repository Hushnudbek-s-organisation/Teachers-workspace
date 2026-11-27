import type { Metadata } from "next";
import "./globals.css";

// ============================================================================
// ROOT LAYOUT — minimal: o'qituvchi paneli `(dashboard)` guruhida yon panel
// bilan, o'quvchi portali (/o/...) esa umuman o'qituvchi menyusisiz ishlaydi.
// ============================================================================

export const metadata: Metadata = {
  title: "Teachers Workspace — Maktab boshqaruv tizimi",
  description:
    "O'quvchilar, ota-onalar, o'qituvchilar, dars jadvali, davomat va baholash tizimi bilan to'liq maktab boshqaruv paneli.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz">
      <body>{children}</body>
    </html>
  );
}
