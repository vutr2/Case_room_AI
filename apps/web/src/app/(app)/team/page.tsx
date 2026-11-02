import { Badge } from "@ccr/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ccr/ui/components/card";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PublicDemoNotice } from "@/components/layout/public-demo-notice";
import { TimeAgo } from "@/components/shared/misc";
import { UserAvatar } from "@/components/shared/user-avatar";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { emailEnabled } from "@/server/email";
import { invitationLink, listInvitations, listMembers } from "@/server/services/team";
import { InvitationLinkButtons, InviteForm, MemberAccessButton, RevokeInvitationButton, RoleSelect } from "./team-admin";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.team") };
}

export default async function TeamPage() {
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const isAdmin = can(user, "org.manage");
  const [members, invitations] = await Promise.all([listMembers(user), listInvitations(user)]);
  const activeCount = members.filter((member) => !member.deactivatedAt).length;
  const canEmail = emailEnabled();

  return (
    <PageContainer>
      <PageHeader title={t("nav.team")} description={t.plural("team.description", activeCount, { organization: user.organizationName })} />
      <PublicDemoNotice />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead className="border-b bg-muted/40 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5">{t("team.col.member")}</th>
                <th className="px-3 py-2.5">{t("teamAdmin.role")}</th>
                <th className="px-3 py-2.5 text-right">{t("team.col.cases")}</th>
                <th className="px-4 py-2.5 text-right">{t("team.col.lastActive")}</th>
                {isAdmin && <th className="px-4 py-2.5 text-right">{t("team.col.access")}</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {members.map((member) => (
                <tr key={member.id} className={member.deactivatedAt ? "bg-muted/30 text-muted-foreground" : "hover:bg-accent/30"}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={member} size="md" />
                      <div className="min-w-0">
                        <div className="font-medium">
                          {member.name}
                          {member.id === user.id && <span className="font-normal text-muted-foreground"> {t("team.you")}</span>}
                          {member.deactivatedAt && (
                            <Badge variant="outline" className="ml-2">
                              {t("team.deactivatedOn", { date: fmt.date(member.deactivatedAt) })}
                            </Badge>
                          )}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {member.title ?? member.specialty ?? "·"} · {member.email} · <span className="font-mono">@{member.handle}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {isAdmin && member.id !== user.id && !member.deactivatedAt ? (
                      <RoleSelect memberId={member.id} memberName={member.name} role={member.role} />
                    ) : (
                      <Badge variant={member.role === "ORG_ADMIN" ? "solid" : "secondary"}>{t(`enum.role.${member.role}`)}</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{member._count.caseMemberships}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">
                    {member.lastLoginAt ? <TimeAgo date={member.lastLoginAt} /> : t("team.never")}
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-2.5 text-right">
                      {member.id !== user.id && <MemberAccessButton memberId={member.id} name={member.name} deactivated={Boolean(member.deactivatedAt)} />}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isAdmin ? (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("team.invite")}</CardTitle>
                <CardDescription>
                  {canEmail ? t("team.inviteEmail") : t("team.inviteLink")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InviteForm organizationId={user.organizationId} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{t("team.pending")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {invitations.length === 0 && <p className="text-[13px] text-muted-foreground">{t("team.noPending")}</p>}
                {invitations.map((invitation) => (
                  <div key={invitation.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium">{invitation.email}</div>
                      <div className="text-xs text-muted-foreground">
                        {t(`enum.role.${invitation.role}`)}
                        {invitation.specialty ? ` · ${invitation.specialty}` : ""} · {t("team.expires", { date: fmt.date(invitation.expiresAt) })}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center">
                      <InvitationLinkButtons link={invitationLink(invitation.token)} invitationId={invitation.id} canEmail={canEmail} />
                      <RevokeInvitationButton invitationId={invitation.id} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>{t("team.membership")}</CardTitle>
              <CardDescription>{t("team.membershipHint")}</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
