// ============================================================================
// SINF BO'YICHA HAVOLA CHIQARISH — QR kartochkalar bilan.
//
//   • Havola = bolaning "akkaunti": parol yo'q, faqat shu link bilan kiriladi
//   • Faqat AKTIV linki YO'Q o'quvchilarga yangi token beriladi — mavjud
//     faol linklar QAYTA YOZILMAYDI (eski havolalar ishlashda qoladi)
//   • QR kod serverda yasaladi (qrcode → data:image/png)
//   • URL faqat JAVOBDA bir marta qaytadi — bazada faqat SHA-256 xesh qoladi
//   • "use server" EMAS — oddiy modul, testlar to'g'ridan-to'g'ri chaqiradi
// ============================================================================

import QRCode from "qrcode";
import { repo } from "@/lib/repo";
import { allowedClasses, type TeacherSession } from "@/lib/auth-core";
import { getLinkStatuses, issueStudentLink } from "@/lib/portal/store";

export interface IssuedStudentLinkCard {
  studentId: string;
  fullName: string;
  className: string;
  url: string;
  /** QR kod (data:image/png;base64,...) */
  qr: string;
}

export interface ClassLinksResult {
  className: string;
  issued: IssuedStudentLinkCard[];
  /** Allaqachon faol link bor o'quvchilar soni (ular qayta yozilmadi) */
  alreadyActive: number;
}

/** Havola URL'idan QR kod (PNG data URL) */
export async function qrDataUrl(text: string): Promise<string> {
  return QRCode.toDataURL(text, {
    width: 260,
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
}

/**
 * Bir sinfda hamma link-siz o'quvchiga havola beradi (o'qituvchi huquqlari
 * bilan). URL faqat shu javobda qaytadi — keyin qayta ko'rsatib bo'lmaydi.
 */
export async function issueClassLinks(
  session: TeacherSession,
  className: string,
  baseUrl: string
): Promise<ClassLinksResult> {
  const scope = await allowedClasses(session);
  if (scope !== null && !scope.includes(className)) {
    throw new Error("Bu sinf uchun ruxsatingiz yo'q.");
  }

  const students = (await repo.listStudents()).filter((s) => s.class_name === className);
  const statuses = await getLinkStatuses(students.map((s) => s.id));

  const issued: IssuedStudentLinkCard[] = [];
  let alreadyActive = 0;
  for (const s of students) {
    if (statuses.get(s.id)?.active) {
      alreadyActive++;
      continue;
    }
    const link = await issueStudentLink(s.id, baseUrl);
    issued.push({
      studentId: s.id,
      fullName: s.full_name,
      className: s.class_name,
      url: link.url,
      qr: await qrDataUrl(link.url),
    });
  }
  return { className, issued, alreadyActive };
}
