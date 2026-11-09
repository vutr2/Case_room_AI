import { Button } from "@ccr/ui/components/button";
import { cn } from "@ccr/ui/lib/utils";
import { prisma, toIsoDate } from "@ccr/database";
import { ChevronLeftIcon, ChevronRightIcon, FileTextIcon, InfoIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GenerateBriefButton } from "@/components/briefs/generate-brief-button";
import { CaseActionsProvider } from "@/components/case/case-actions";
import { CaseRealtimeProvider } from "@/components/case/realtime-provider";
import { MeetingStatusBadge } from "@/components/meetings/meeting-badges";
import { OutcomePanel } from "@/components/meetings/outcome-panel";
import { PresentKeys } from "@/components/meetings/present-keys";
import { AIGeneratedBadge, DecisionStatusBadge, DocumentTypeBadge, DraftBadge, HumanApprovedBadge, SyntheticPatientBadge } from "@/components/shared/badges";
import { LocalDateTime } from "@/components/shared/misc";
import { RichText, SourceChip } from "@/components/shared/sources";
import { getI18n } from "@/i18n/server";
import { ageFromDob } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { casePermissions } from "@/server/case-permissions";
import { listBriefs } from "@/server/services/briefs";
import { getCaseRoomOverview } from "@/server/services/cases";
import { listDecisions } from "@/server/services/decisions";
import { getMeeting } from "@/server/services/meetings";

export async function generateMetadata({ params }: { params: Promise<{ meetingId: string }> }): Promise<Metadata> {
  const { meetingId } = await params;
  const user = await requireUser();
  const { t } = await getI18n();
  const meeting = await getMeeting(user, meetingId);
  return { title: meeting ? `${t("meetings.present")} · ${meeting.title}` : t("nav.meetings") };
}

/**
 * Presentation mode for the meeting room screen: one agenda case at a time,
 * with the board's question, the latest tumor board brief, open decisions and
 * key documents, and the outcome panel. The case's realtime stream keeps it
 * current while other clinicians work on the case.
 */
export default async function PresentPage({ params, searchParams }: { params: Promise<{ meetingId: string }>; searchParams: Promise<{ item?: string }> }) {
  const { meetingId } = await params;
  const { item: itemId } = await searchParams;
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const meeting = await getMeeting(user, meetingId);
  if (!meeting || meeting.status === "CANCELLED" || meeting.agendaItems.length === 0) notFound();

  const items = meeting.agendaItems;
  // The requested case, else the first one not yet discussed.
  const item = items.find((i) => i.id === itemId) ?? items.find((i) => i.status === "PENDING") ?? items[0]!;
  const position = items.indexOf(item);
  const hrefFor = (i: number) => (i >= 0 && i < items.length ? `/meetings/${meeting.id}/present?item=${items[i]!.id}` : null);

  const caseId = item.caseRoomId;
  const [room, documents, briefs, decisions] = await Promise.all([
    getCaseRoomOverview(user, caseId),
    prisma.clinicalDocument.findMany({ where: { caseRoomId: caseId }, select: { id: true, title: true, type: true, documentDate: true }, orderBy: { documentDate: "desc" } }),
    listBriefs(user, caseId, "TUMOR_BOARD"),
    listDecisions(user, caseId),
  ]);
  const brief = briefs[0];
  const sections = brief?.parsed?.kind === "sections" ? brief.parsed : null;
  const openDecisions = decisions.filter((d) => d.status === "PROPOSED" || d.status === "UNDER_REVIEW");
  const patient = room.patient;
  // Plain text for the minutes: without the inline citation markers ("[1]") of the brief.
  const caseSummary = (sections?.sections.find((s) => s.key === "caseSummary")?.body ?? "").replace(/\s*\[\d+(?:\s*,\s*\d+)*\]/g, "");

  return (
    <CaseRealtimeProvider caseId={caseId} currentUser={{ id: user.id, name: user.name }} version={room.updatedAt.toISOString()}>
      <CaseActionsProvider
        data={{
          caseId,
          caseTitle: room.title,
          patientName: fmt.patientName(patient),
          currentUser: { id: user.id, name: user.name, role: user.role },
          permissions: casePermissions(user),
          members: room.members.map((m) => m.user),
          documents: documents.map((d) => ({ id: d.id, title: d.title, type: d.type, date: toIsoDate(d.documentDate) })),
          organizationMembers: [],
        }}
      >
        <PresentKeys previousHref={hrefFor(position - 1)} nextHref={hrefFor(position + 1)} />
        <div className="flex h-full min-h-0 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-card px-6 py-2.5">
            <div className="flex min-w-0 items-center gap-2 text-[13px]">
              <span className="truncate font-semibold">{meeting.title}</span>
              <MeetingStatusBadge status={meeting.status} />
              <span className="text-muted-foreground">{t("meetings.presentPosition", { position: position + 1, total: items.length })}</span>
            </div>
            <nav className="flex items-center gap-1" aria-label={t("meetings.agenda.title")}>
              {items.map((entry, i) => (
                <Link
                  key={entry.id}
                  href={hrefFor(i)!}
                  aria-current={i === position ? "page" : undefined}
                  title={fmt.patientName(entry.caseRoom.patient)}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full border text-xs font-medium",
                    i === position ? "border-primary bg-primary text-primary-foreground" : entry.status === "PENDING" ? "bg-card" : "border-approved-border bg-approved-soft text-approved",
                  )}
                >
                  {i + 1}
                </Link>
              ))}
              <Button asChild variant="ghost" size="icon-sm" aria-label={t("meetings.previous")} className={cn(position === 0 && "pointer-events-none opacity-40")}>
                <Link href={hrefFor(position - 1) ?? "#"}>
                  <ChevronLeftIcon />
                </Link>
              </Button>
              <Button asChild variant="ghost" size="icon-sm" aria-label={t("meetings.next")} className={cn(position === items.length - 1 && "pointer-events-none opacity-40")}>
                <Link href={hrefFor(position + 1) ?? "#"}>
                  <ChevronRightIcon />
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm" className="ml-2">
                <Link href={`/meetings/${meeting.id}`}>
                  <XIcon />
                  {t("meetings.exitPresentation")}
                </Link>
              </Button>
            </nav>
          </header>

          <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_400px]">
            <main className="min-h-0 space-y-6 overflow-y-auto px-8 py-6 scrollbar-thin">
              <section className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">{fmt.patientName(patient)}</h1>
                  <SyntheticPatientBadge />
                </div>
                <p className="text-base text-muted-foreground">
                  {t("case.ageSex", { age: ageFromDob(patient.dateOfBirth), sex: t(`enum.sex.${patient.sex}`) })} · {patient.syntheticMedicalRecordNumber} · {patient.primaryDiagnosis}
                </p>
                <p className="text-sm text-muted-foreground">
                  {room.title}
                  {item.presenter ? ` · ${t("meetings.agenda.presentedBy", { name: item.presenter.name })}` : ""}
                </p>
              </section>

              <section className="rounded-xl border border-primary/30 bg-primary/5 px-5 py-4">
                <h2 className="text-xs font-semibold tracking-wider text-primary uppercase">{t("meetings.agenda.question")}</h2>
                <p className="mt-1 text-lg leading-relaxed">{item.question}</p>
              </section>

              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold">{brief ? brief.title : t("meetings.present.brief")}</h2>
                    {brief && <AIGeneratedBadge />}
                    {brief && (brief.status === "APPROVED" ? <HumanApprovedBadge /> : <DraftBadge />)}
                  </div>
                  {brief && (
                    <span className="text-xs text-muted-foreground">
                      <LocalDateTime date={brief.createdAt} />
                    </span>
                  )}
                </div>
                {sections ? (
                  <div className="divide-y rounded-xl border bg-card">
                    {sections.sections
                      .filter((section) => section.body.trim())
                      .map((section) => (
                        <section key={section.key} className="grid gap-2 px-5 py-4 md:grid-cols-[200px_minmax(0,1fr)]">
                          <h3 className="pt-1 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{section.title}</h3>
                          <div className="min-w-0 space-y-2">
                            <RichText text={section.body} caseId={caseId} sources={section.sources} className="text-[15px] leading-relaxed" />
                            {section.sources.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {section.sources.map((source, i) => (
                                  <SourceChip key={`${source.kind}-${source.id}`} caseId={caseId} source={source} index={i + 1} />
                                ))}
                              </div>
                            )}
                          </div>
                        </section>
                      ))}
                    <p className="flex items-start gap-2 px-5 py-3 text-xs text-muted-foreground">
                      <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
                      <span>
                        {sections.limitations} {t("ai.reviewRequired")}
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 rounded-xl border border-dashed bg-card px-5 py-6 text-[13px] text-muted-foreground">
                    <p>{t("meetings.present.noBrief")}</p>
                    {can(user, "brief.generate") && <GenerateBriefButton caseId={caseId} type="TUMOR_BOARD" label={t("brief.TUMOR_BOARD.generate")} />}
                  </div>
                )}
              </section>

              {openDecisions.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-base font-semibold">{t("meetings.present.openDecisions")}</h2>
                  <ul className="space-y-2">
                    {openDecisions.map((decision) => (
                      <li key={decision.id} className="rounded-xl border bg-card px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <DecisionStatusBadge status={decision.status} />
                          <span className="font-medium">
                            {t("activity.decisionNumber", { number: decision.number })}: {decision.title}
                          </span>
                        </div>
                        <p className="mt-1 text-[13px] text-muted-foreground">
                          {t("meetings.present.approvals", {
                            approved: decision.approvals.filter((a) => a.status === "APPROVED").length,
                            total: decision.approvals.length,
                          })}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className="space-y-2">
                <h2 className="text-base font-semibold">{t("meetings.present.documents")}</h2>
                <ul className="grid gap-2 md:grid-cols-2">
                  {documents.slice(0, 8).map((document) => (
                    <li key={document.id}>
                      <Link href={`/cases/${caseId}/documents?doc=${document.id}`} className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-[13px] hover:bg-accent">
                        <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1 truncate">{document.title}</span>
                        <DocumentTypeBadge type={document.type} />
                        <span className="shrink-0 text-xs text-muted-foreground">{fmt.date(document.documentDate)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            </main>

            <aside className="min-h-0 overflow-y-auto border-l bg-muted/20 p-5 scrollbar-thin">
              <OutcomePanel
                key={item.id}
                meetingId={meeting.id}
                meetingStatus={meeting.status}
                canManage={can(user, "meeting.manage")}
                defaultSummary={caseSummary}
                item={{ id: item.id, caseRoomId: caseId, status: item.status, summary: item.summary, conclusion: item.conclusion, decision: item.decision }}
              />
            </aside>
          </div>
        </div>
      </CaseActionsProvider>
    </CaseRealtimeProvider>
  );
}
