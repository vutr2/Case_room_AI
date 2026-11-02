import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { getSessionIdentity, getSessionUser } from "@/server/auth/session";
import { SignOutButton } from "./sign-out-button";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("inactive.title") };
}

/** Signed in, but every membership of this account is deactivated. */
export default async function AccountInactivePage() {
  if (!(await getSessionIdentity())) redirect("/login");
  if (await getSessionUser()) redirect("/dashboard");
  const { t } = await getI18n();
  return (
    <div className="w-full max-w-md space-y-4">
      <h2 className="text-2xl font-semibold tracking-tight">{t("inactive.title")}</h2>
      <p className="text-[13px] text-muted-foreground">{t("inactive.text")}</p>
      <SignOutButton />
    </div>
  );
}
