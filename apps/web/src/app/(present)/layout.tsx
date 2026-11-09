import { SafetyBanner } from "@/components/layout/safety-banner";
import { requireUser } from "@/server/auth/session";

/** Full-screen pages without the sidebar: meeting presentation and printable minutes. */
export default async function PresentLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background print:h-auto print:overflow-visible">
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin print:overflow-visible">{children}</div>
      <SafetyBanner />
    </div>
  );
}
