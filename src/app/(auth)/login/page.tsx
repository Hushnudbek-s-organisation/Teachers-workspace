import { dataMode } from "@/lib/repo";
import { ensureDemoAdmin } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";

// ============================================================================
// /login — o'qituvchi kirish sahifasi (server component).
// Demo rejimida standart demo admin avtomatik tayyorlanadi (faqat sinov).
// ============================================================================

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (dataMode === "demo") {
    await ensureDemoAdmin();
  }
  return <LoginForm demoMode={dataMode === "demo"} />;
}
