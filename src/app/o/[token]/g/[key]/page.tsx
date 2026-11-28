import { resolveStudentByToken } from "@/lib/portal/store";
import { buildPortalCatalog, dailyGameFor, isGameLockedByDaily, portalInfoFor, resolveCatalogGame } from "@/lib/portal/catalog";
import Link from "next/link";
import { PortalPlay } from "@/components/portal/PortalPlay";
import { PortalLinkError } from "@/components/portal/PortalLinkError";

export const dynamic = "force-dynamic";

// ============================================================================
// O'yin sahifasi — /o/<token>/g/<kalit>
// Kalit serverda qayta tekshiriladi: yaroqsiz kalit → savollar chiqmaydi.
// ============================================================================

export default async function PortalGamePage({
  params,
}: {
  params: Promise<{ token: string; key: string }>;
}) {
  const { token, key: rawKey } = await params;
  const key = decodeURIComponent(rawKey);
  const student = await resolveStudentByToken(token);
  if (!student) {
    return (
      <PortalLinkError
        title="Bu havola ishlamaydi 😔"
        description="Havola noto'g'ri, bekor qilingan yoki yangilangan. O'qituvchingizga murojaat qiling."
      />
    );
  }

  // KUNLIK MAJBURIY O'YIN TEKSHIRUVI (server tomonda — clientni aldash mumkin emas):
  // bugungi majburiy bajarilmaguncha boshqa o'yin sahifasi OCHILMAYDI.
  const info = portalInfoFor(student);
  const catalog = await buildPortalCatalog(info);
  const daily = await dailyGameFor(info, catalog);
  if (isGameLockedByDaily(key, daily)) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-2xl px-4 py-10">
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-6 text-center">
          <p className="text-4xl" aria-hidden>🔒</p>
          <p className="mt-3 text-lg font-bold text-amber-900">Bu o'yin hozircha yopiq</p>
          <p className="mt-2 text-sm text-amber-800">
            Avval bugungi majburiy o'yinni tugatng:{" "}
            <b>
              {daily?.entry.emoji} {daily?.entry.title}
            </b>
          </p>
          <Link
            href={`/o/${token}/g/${encodeURIComponent(daily!.entry.key)}`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white hover:bg-amber-600 min-h-[50px]"
          >
            ▶ Majburiy o'yinni boshlash
          </Link>
          <Link href={`/o/${token}`} className="mt-3 block text-xs font-medium text-indigo-600">
            Bosh sahifaga qaytish
          </Link>
        </div>
      </div>
    );
  }

  // Savollarni hozir generatsiya qilmaymiz (bosilganda server amal yasaydi) —
  // faqat o'yin mavjudligini tasdiqlaymiz
  const preview = await resolveCatalogGame(key, 1);
  if (!preview) {
    return (
      <PortalLinkError
        title="O'yin topilmadi 🎮"
        description="Bu o'yin o'chirilgan yoki sizga ko'rinmaydi. Boshqa o'yinlarni sinab ko'ring."
      />
    );
  }

  return (
    <PortalPlay
      token={token}
      entry={{
        key,
        title: preview.title,
        instructions: preview.instructions,
        boardKind: preview.boardKind,
        emoji: preview.emoji,
        subject: preview.subject,
        subjectKey: preview.subject,
        source: key.startsWith("practice:") ? "practice" : key.startsWith("custom:") ? "custom" : "book",
        practice: key.startsWith("practice:"),
        savollar: preview.questions.length,
        origin:
          key.startsWith("practice:")
            ? "Tayyor mashq o'yini"
            : key.startsWith("custom:")
              ? "O'qituvchi o'yini"
              : "Kitob o'yini",
      }}
    />
  );
}
