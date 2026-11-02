import type { Metadata } from "next";
import Link from "next/link";
import { getI18n, localizeServerMessage } from "@/i18n/server";
import { signupAvailability } from "@/server/services/accounts";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("signup.title") };
}
// Availability depends on the runtime configuration (PUBLIC_SIGNUP, email), not the build.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const availability = signupAvailability();
  if (!availability.open) {
    const { t } = await getI18n();
    return (
      <div className="w-full max-w-md space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{t("signup.unavailable")}</h2>
        <p className="text-[13px] text-muted-foreground">{await localizeServerMessage(availability.reason)}</p>
        <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">
          {t("auth.goToSignIn")}
        </Link>
      </div>
    );
  }
  return <SignupForm />;
}
