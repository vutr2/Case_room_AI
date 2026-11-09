import { Button } from "@ccr/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ccr/ui/components/card";
import { ArrowLeftIcon, FileTextIcon, ListOrderedIcon, PresentationIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page-header";
import { AgendaItemDialog } from "@/components/meetings/agenda-item-dialog";
import { AgendaList } from "@/components/meetings/agenda-list";
import { AttendanceCard } from "@/components/meetings/attendance-card";
import { MeetingStatusBadge } from "@/components/meetings/meeting-badges";
import { MeetingControls } from "@/components/meetings/meeting-controls";
import { MeetingFormDialog } from "@/components/meetings/meeting-form-dialog";
import { PrepareAgendaButton } from "@/components/meetings/prepare-agenda-button";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/misc";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listOrganizationMembers } from "@/server/services/cases";
import { getMeeting, listCasesForAgenda } from "@/server/services/meetings";

export async function generateMetadata({ params }: { params: Promise<{ meetingId: string }> }): Promise<Metadata> {
  const { meetingId } = await params;
  const user = await requireUser();
  const { t } = await getI18n();
  const meeting = await getMeeting(user, meetingId);
  return { title: meeting?.title ?? t("nav.meetings") };
}

export default async function MeetingPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const meeting = await getMeeting(user, meetingId);
  if (!meeting) notFound();

  const active = meeting.status === "SCHEDULED" || meeting.status === "IN_PROGRESS";
  const canManage = can(user, "meeting.manage");
  const [members, candidates] = await Promise.all([
    listOrganizationMembers(user),
    canManage && active ? listCasesForAgenda(user, meeting.id) : Promise.resolve([]),
  ]);
  const toPrepare = can(user, "brief.generate") && active ? meeting.agendaItems.filter((item) => item.briefReadiness !== "ready") : [];

  return (
    <PageContainer className="max-w-6xl">
      <Link href="/meetings" className="inline-flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-3.5" />
        {t("nav.meetings")}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{meeting.title}</h1>
            <MeetingStatusBadge status={meeting.status} />
          </div>
          <p className="text-[13px] text-muted-foreground">
            <LocalDateTime date={meeting.scheduledAt} withYear />
            {meeting.durationMinutes ? ` · ${t("meetings.form.minutes", { count: meeting.durationMinutes })}` : ""}
            {meeting.location ? ` · ${meeting.location}` : ""}
          </p>
          <p className="text-[13px]">
            <span className="text-muted-foreground">{t("meetings.chair")}:</span> {meeting.chair?.name ?? t("meetings.form.notSet")}
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-muted-foreground">{t("meetings.secretary")}:</span> {meeting.secretary?.name ?? t("meetings.form.notSet")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && active && (
            <MeetingFormDialog
              organizationId={user.organizationId}
              members={members}
              meeting={{
                id: meeting.id,
                title: meeting.title,
                scheduledAt: meeting.scheduledAt.toISOString(),
                durationMinutes: meeting.durationMinutes,
                location: meeting.location,
                chairId: meeting.chairId,
                secretaryId: meeting.secretaryId,
              }}
            />
          )}
          {meeting.status !== "SCHEDULED" && meeting.status !== "CANCELLED" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/meetings/${meeting.id}/minutes`}>
                <FileTextIcon />
                {t("meetings.minutes")}
              </Link>
            </Button>
          )}
          {meeting.agendaItems.length > 0 && meeting.status !== "CANCELLED" && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/meetings/${meeting.id}/present`}>
                <PresentationIcon />
                {t("meetings.present")}
              </Link>
            </Button>
          )}
          {canManage && <MeetingControls meetingId={meeting.id} status={meeting.status} pendingCount={meeting.agendaItems.filter((item) => item.status === "PENDING").length} />}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("meetings.agenda.title")}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <PrepareAgendaButton cases={toPrepare.map((item) => ({ caseRoomId: item.caseRoomId, label: fmt.patientName(item.caseRoom.patient) }))} />
              {canManage && active && (
                <AgendaItemDialog
                  meetingId={meeting.id}
                  cases={candidates.map((room) => ({
                    id: room.id,
                    label: `${fmt.patientName(room.patient)} · ${room.title}`,
                    members: room.members.map((m) => ({ id: m.user.id, name: m.user.name })),
                  }))}
                />
              )}
            </div>
          </div>
          {meeting.agendaItems.length > 0 ? (
            <AgendaList
              meetingId={meeting.id}
              editable={canManage && active}
              rows={meeting.agendaItems.map((item) => ({
                id: item.id,
                caseRoomId: item.caseRoomId,
                patientName: fmt.patientName(item.caseRoom.patient),
                caseTitle: item.caseRoom.title,
                presenterId: item.presenterId,
                presenterName: item.presenter?.name ?? null,
                question: item.question,
                status: item.status,
                conclusion: item.conclusion,
                decision: item.decision,
                briefReadiness: item.briefReadiness,
                members: item.caseRoom.members.map((m) => ({ id: m.user.id, name: m.user.name })),
              }))}
            />
          ) : (
            <EmptyState icon={ListOrderedIcon} title={t("meetings.agenda.emptyTitle")} description={t("meetings.agenda.emptyDescription")} />
          )}
        </section>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t("meetings.attendance.title")}</CardTitle>
            <CardDescription>{t("meetings.attendance.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AttendanceCard
              meetingId={meeting.id}
              editable={canManage && meeting.status !== "CANCELLED"}
              members={members.map((m) => ({ id: m.id, name: m.name, specialty: m.specialty }))}
              attendeeIds={meeting.attendees.map((a) => a.userId)}
            />
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
