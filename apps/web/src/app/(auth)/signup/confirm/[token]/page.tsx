import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { describeSignupRequest } from "@/server/services/accounts";
import { CompleteSignupForm } from "./complete-signup-form";

// The token is in the URL: do not send it to other sites in the Referer header.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("confirmSignup.title"), referrer: "no-referrer" };
}

export default async function ConfirmSignupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const request = await describeSignupRequest(token);
  const { t } = await getI18n();

  if (!request) {
    return (
      <div className="w-full max-w-md space-y-3">
        <h2 className="text-xl font-semibold">{t("auth.linkInvalid")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("confirmSignup.invalid")}</p>
        <div className="flex gap-4 text-[13px]">
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("confirmSignup.restart")}
          </Link>
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.signInLink")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t("confirmSignup.create", { organization: request.organizationName })}</h2>
        <p className="text-[13px] text-muted-foreground">
          {rich(t("confirmSignup.confirmed", { organization: request.organizationName }), {
            email: <span className="font-medium text-foreground">{request.email}</span>,
          })}
        </p>
      </div>
      <CompleteSignupForm token={token} />
    </div>
  );
}
