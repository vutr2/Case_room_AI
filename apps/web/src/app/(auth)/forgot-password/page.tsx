import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { emailEnabled } from "@/server/email";
import { ForgotPasswordForm } from "./forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("forgot.title") };
}
// Depends on the runtime email configuration, not the build.
export const dynamic = "force-dynamic";

export default async function ForgotPasswordPage() {
  if (!emailEnabled()) {
    const { t } = await getI18n();
    return (
      <div className="w-full max-w-md space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight">{t("forgot.title")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("forgot.unavailable")}</p>
        <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }
  return <ForgotPasswordForm />;
}
