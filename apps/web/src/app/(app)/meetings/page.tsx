import { PresentationIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { MeetingStatusBadge } from "@/components/meetings/meeting-badges";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/misc";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listOrganizationMembers } from "@/server/services/cases";
import { listMeetings, type MeetingListItem } from "@/server/services/meetings";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.meetings") };
}

export default async function MeetingsPage() {
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const canManage = can(user, "meeting.manage");
  const [upcoming, past, members] = await Promise.all([
    listMeetings(user, "upcoming"),
    listMeetings(user, "past"),
    canManage ? listOrganizationMembers(user) : Promise.resolve([]),
  ]);

  const list = (meetings: MeetingListItem[]) => (
    <ul className="divide-y rounded-xl border bg-card">
      {meetings.map((meeting) => (
        <li key={meeting.id}>
          <Link href={`/meetings/${meeting.id}`} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3.5 hover:bg-accent/50">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-semibold">{meeting.title}</span>
                <MeetingStatusBadge status={meeting.status} />
              </div>
              <div className="text-[13px] text-muted-foreground">
                <LocalDateTime date={meeting.scheduledAt} />
                {meeting.location ? ` · ${meeting.location}` : ""}
                {meeting.chair ? ` · ${t("meetings.chairedBy", { name: meeting.chair.name })}` : ""}
              </div>
              {meeting.agendaItems.length > 0 && (
                <div className="text-[13px]">{meeting.agendaItems.map((item) => fmt.patientName(item.caseRoom.patient)).join(" · ")}</div>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{t.plural("meetings.caseCount", meeting.agendaItems.length)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader
        title={t("nav.meetings")}
        description={t("meetings.description")}
        actions={canManage ? <MeetingFormDialog organizationId={user.organizationId} members={members} /> : undefined}
      />
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">{t("meetings.upcoming")}</h2>
        {upcoming.length > 0 ? (
          list(upcoming)
        ) : (
          <EmptyState icon={PresentationIcon} title={t("meetings.emptyTitle")} description={canManage ? t("meetings.emptyManage") : t("meetings.emptyView")} />
        )}
      </section>
      {past.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">{t("meetings.past")}</h2>
          {list(past)}
        </section>
      )}
    </PageContainer>
  );
}
