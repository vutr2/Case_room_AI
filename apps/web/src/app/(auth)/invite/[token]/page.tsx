import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { rich } from "@/i18n/rich";
import { getSessionIdentityId } from "@/server/auth/session";
import { describeInvitation } from "@/server/services/team";
import { AcceptInviteForm, JoinOrganizationButton, SwitchAccountButton } from "./accept-form";

// The token is in the URL: do not send it to other sites in the Referer header.
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("invite.title"), referrer: "no-referrer" };
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const view = await describeInvitation(token, await getSessionIdentityId());
  const { t } = await getI18n();

  if (view.state === "unavailable") {
    return (
      <div className="w-full max-w-md space-y-3 text-center">
        <h2 className="text-xl font-semibold">{t("invite.unavailable")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("invite.unavailableText")}</p>
        <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">
          {t("auth.goToSignIn")}
        </Link>
      </div>
    );
  }

  const { invitation } = view;
  const organizationName = invitation.organization.name;
  const role = t(`enum.role.${invitation.role}`) + (invitation.specialty ? ` (${invitation.specialty})` : "");
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t("invite.join", { organization: organizationName })}</h2>
        <p className="text-[13px] text-muted-foreground">
          {rich(t("invite.invitedAs", { inviter: invitation.invitedBy.name, role }), {
            email: <span className="font-medium text-foreground">{invitation.email}</span>,
          })}
        </p>
      </div>

      {view.state === "create-account" && <AcceptInviteForm token={token} />}

      {view.state === "sign-in" && (
        <div className="space-y-3 text-[13px]">
          <p className="text-muted-foreground">{t("invite.signInExisting", { organization: organizationName })}</p>
          <Link
            href={`/login?${new URLSearchParams({ callbackUrl: `/invite/${token}` })}`}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("invite.signInToAccept")}
          </Link>
        </div>
      )}

      {view.state === "join" && (
        <div className="space-y-3 text-[13px]">
          <p className="text-muted-foreground">
            {rich(t("invite.signedInAs"), { name: <span className="font-medium text-foreground">{view.signedInAs}</span> })}
          </p>
          <JoinOrganizationButton token={token} organizationName={organizationName} />
        </div>
      )}

      {view.state === "already-member" && (
        <div className="space-y-3 text-[13px] text-muted-foreground">
          <p>{t("invite.alreadyMember", { organization: organizationName })}</p>
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            {t("invite.goToDashboard")}
          </Link>
        </div>
      )}

      {view.state === "deactivated-member" && (
        <div className="space-y-3 text-[13px] text-muted-foreground">
          <p>{t("invite.deactivated", { organization: organizationName })}</p>
          <Link href="/dashboard" className="font-medium text-primary hover:underline">
            {t("invite.goToDashboard")}
          </Link>
        </div>
      )}

      {view.state === "wrong-account" && (
        <div className="space-y-3 text-[13px]">
          <p className="text-muted-foreground">
            {t("invite.wrongAccount", { email: invitation.email, name: view.signedInAs ?? t("invite.anotherAccount") })}
          </p>
          <SwitchAccountButton token={token} />
        </div>
      )}
    </div>
  );
}
