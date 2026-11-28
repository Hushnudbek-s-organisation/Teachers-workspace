import { resolveStudentByToken } from "@/lib/portal/store";
import { buildPortalCatalog, dailyGameFor, isGameLockedByDaily, portalInfoFor } from "@/lib/portal/catalog";
import { PortalHome } from "@/components/portal/PortalHome";
import { PortalLinkError } from "@/components/portal/PortalLinkError";

export const dynamic = "force-dynamic";

// ============================================================================
// O'QUVCHI SHAXSIY LINKI — /o/<token>
//
//   • Parol YO'Q: linkning o'zi kalit (bazada faqat token xeshi bor)
//   • Bu sahifada o'qituvchi menyusi YO'Q, boshqa bolalar ma'lumotlari YO'Q
//   • Katalog SERVERDA yig'iladi: sinf darajasiga mos kitob/o'qituvchi
//     o'yinlari avtomatik + "Mashq o'yinlari"
// ============================================================================

export default async function StudentPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const student = await resolveStudentByToken(token);
  if (!student) {
    return (
      <PortalLinkError
        title="Bu havola ishlamaydi 😔"
        description="Havola noto'g'ri, bekor qilingan yoki yangilangan. O'qituvchingizga murojaat qiling — u yangi havola beradi."
      />
    );
  }

  const info = portalInfoFor(student);
  const catalog = await buildPortalCatalog(info);
  const daily = await dailyGameFor(info, catalog);
  const lockedKeys = daily
    ? catalog.filter((e) => isGameLockedByDaily(e.key, daily)).map((e) => e.key)
    : [];

  return (
    <PortalHome
      token={token}
      student={{ firstName: info.firstName, classLabel: info.classLabel }}
      catalog={catalog}
      daily={
        daily
          ? {
              key: daily.entry.key,
              title: daily.entry.title,
              emoji: daily.entry.emoji,
              points: daily.points,
              done: daily.done,
            }
          : null
      }
      lockedKeys={lockedKeys}
    />
  );
}
