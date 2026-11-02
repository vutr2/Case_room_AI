import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { describePasswordReset } from "@/server/services/accounts";
import { ResetPasswordForm } from "./reset-password-form";

// The token is in the URL: do not send it to other sites in the Referer header.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("reset.title"), referrer: "no-referrer" };
}

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const reset = await describePasswordReset(token);
  const { t } = await getI18n();

  if (!reset) {
    return (
      <div className="w-full max-w-md space-y-3">
        <h2 className="text-xl font-semibold">{t("auth.linkInvalid")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("reset.invalid")}</p>
        <Link href="/forgot-password" className="text-[13px] font-medium text-primary hover:underline">
          {t("reset.requestNew")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t("reset.title")}</h2>
        <p className="text-[13px] text-muted-foreground">{rich(t("reset.for"), { email: <span className="font-medium text-foreground">{reset.email}</span> })}</p>
      </div>
      <ResetPasswordForm token={token} />
    </div>
  );
}
