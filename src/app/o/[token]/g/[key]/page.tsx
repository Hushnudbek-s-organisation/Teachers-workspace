import { resolveStudentByToken } from "@/lib/portal/store";
import { portalInfoFor, resolveCatalogGame } from "@/lib/portal/catalog";
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

  const info = portalInfoFor(student);
  void info;

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
