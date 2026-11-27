import { redirect } from "next/navigation";

// Hisob yaratish sahifasi ham olib tashlangan — login yo'q.
export default function SetupAccessPage() {
  redirect("/");
}
