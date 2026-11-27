import { PortalLinkError } from "@/components/portal/PortalLinkError";

export const dynamic = "force-dynamic";

// Yordamchi sahifa — o'quvchi taklif/xato ekranidan qaytishi mumkin bo'lgan joy.
// Haqiqiy bosh sahifasi faqat shaxsiy link orqali (/o/<token>) ochiladi.
export default function PortalHelpPage() {
  return (
    <PortalLinkError
      title="Shaxsiy havolangiz bilan kiring 🔗"
      description="Bu yerga to'g'ridan-to'g'ri o'yin boshlab bo'lmaydi. O'qituvchidan olingan shaxsiy havolangizni oching — o'yinlar shu yerda kutadi."
    />
  );
}
