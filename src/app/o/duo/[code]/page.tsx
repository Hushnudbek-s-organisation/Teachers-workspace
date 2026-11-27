import { portalRoomPageState } from "@/app/portal/actions";
import { DuoJoin } from "@/components/portal/DuoJoin";
import { PortalLinkError } from "@/components/portal/PortalLinkError";

export const dynamic = "force-dynamic";

// ============================================================================
// TAKLIF LINKI — /o/duo/<kod>
//
// Bu havola shaxsiy o'quvchi linkidan MUTLAQO ALOHIDA: faqat bitta xona,
// muddati bor (2 soat), uchinchi o'yinchi qabul qilinmaydi.
// ============================================================================

export default async function DuoRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const state = await portalRoomPageState(code);

  if (!state.found) {
    return (
      <PortalLinkError
        title={state.reason === "cancelled" ? "Xona yopilgan 😔" : "Xona topilmadi 🤷"}
        description={
          state.reason === "cancelled"
            ? "Bu taklif bekor qilingan yoki muddati (2 soat) tugagan. Do'stingizdan yangi taklif linki so'rang."
            : "Taklif kodi noto'g'ri. Do'stingizdan havolani qayta yuborishini so'rang."
        }
      />
    );
  }

  return <DuoJoin code={code} initial={{ status: state.status, gameTitle: state.gameTitle, total: state.total }} />;
}
