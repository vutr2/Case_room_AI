import { Button } from "@ccr/ui/components/button";
import { ArrowLeftIcon, FileTextIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/meetings/print-button";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime } from "@/components/shared/misc";
import { getI18n } from "@/i18n/server";
import { ageFromDob } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { getMeetingMinutes } from "@/server/services/meetings";

export async function generateMetadata({ params }: { params: Promise<{ meetingId: string }> }): Promise<Metadata> {
  const { meetingId } = await params;
  const user = await requireUser();
  const { t } = await getI18n();
  const meeting = await getMeetingMinutes(user, meetingId);
  return { title: meeting ? `${t("minutes.title")} · ${meeting.title}` : t("nav.meetings") };
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[190px_minmax(0,1fr)]">
      <dt className="font-semibold">{label}</dt>
      <dd className="whitespace-pre-line">{children}</dd>
    </div>
  );
}

/**
 * Printable tumor board minutes: one page per case the reader may see, built
 * from what was recorded in the meeting. Clinicians check them, print and sign.
 */
export default async function MinutesPage({ params }: { params: Promise<{ meetingId: string }> }) {
  const { meetingId } = await params;
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const meeting = await getMeetingMinutes(user, meetingId);
  if (!meeting || meeting.status === "CANCELLED") notFound();
  const items = meeting.agendaItems.filter((item) => item.status !== "PENDING");
  const attendees = meeting.attendees.map((a) => (a.user.specialty ? `${a.user.name} (${a.user.specialty})` : a.user.name));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-6 py-6 print:max-w-none print:p-0">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/meetings/${meeting.id}`}>
            <ArrowLeftIcon />
            {meeting.title}
          </Link>
        </Button>
        {items.length > 0 && <PrintButton />}
      </div>
      <p className="no-print text-[13px] text-muted-foreground">{t("minutes.notice")}</p>

      {items.length === 0 ? (
        <EmptyState icon={FileTextIcon} title={t("minutes.emptyTitle")} description={t("minutes.emptyDescription")} />
      ) : (
        items.map((item) => {
          const patient = item.caseRoom.patient;
          const tasks = item.decision ? meeting.tasks.filter((task) => task.decisionId === item.decision!.id) : [];
          return (
            <article key={item.id} className="space-y-5 rounded-xl border bg-card px-8 py-8 text-[13.5px] leading-relaxed break-after-page print:rounded-none print:border-0 print:px-0">
              <header className="space-y-1 text-center">
                <p className="text-xs tracking-wider text-muted-foreground uppercase">{user.organizationName}</p>
                <h1 className="text-xl font-bold tracking-wide uppercase">{t("minutes.title")}</h1>
                <p className="text-[13px] text-muted-foreground">{meeting.title}</p>
                <p className="text-[11.5px] font-medium text-draft">{t("minutes.synthetic")}</p>
              </header>

              <dl className="space-y-2">
                <Field label={t("minutes.patient")}>
                  {fmt.patientName(patient)} · {t("case.ageSex", { age: ageFromDob(patient.dateOfBirth), sex: t(`enum.sex.${patient.sex}`) })} ·{" "}
                  {patient.syntheticMedicalRecordNumber}
                </Field>
                <Field label={t("minutes.diagnosis")}>{patient.primaryDiagnosis}</Field>
                <Field label={t("minutes.time")}>
                  <LocalDateTime date={meeting.startedAt ?? meeting.scheduledAt} withYear />
                  {meeting.location ? ` · ${meeting.location}` : ""}
                </Field>
                <Field label={t("meetings.chair")}>{meeting.chair?.name ?? "—"}</Field>
                <Field label={t("meetings.secretary")}>{meeting.secretary?.name ?? "—"}</Field>
                <Field label={t("minutes.attendees")}>{attendees.length > 0 ? attendees.join(", ") : "—"}</Field>
                <Field label={t("meetings.agenda.presenter")}>{item.presenter?.name ?? "—"}</Field>
              </dl>

              <section className="space-y-1">
                <h2 className="font-semibold">{t("meetings.agenda.question")}</h2>
                <p className="whitespace-pre-line">{item.question}</p>
              </section>
              <section className="space-y-1">
                <h2 className="font-semibold">{t("meetings.outcome.summary")}</h2>
                <p className="whitespace-pre-line">{item.summary || "—"}</p>
              </section>
              <section className="space-y-1">
                <h2 className="font-semibold">{t("meetings.outcome.conclusion")}</h2>
                <p className="whitespace-pre-line">{item.status === "DEFERRED" ? t("minutes.deferred") : item.conclusion || "—"}</p>
              </section>
              {item.decision && (
                <section className="space-y-1">
                  <h2 className="font-semibold">{t("minutes.decision")}</h2>
                  <p>
                    {t("activity.decisionNumber", { number: item.decision.number })}: {item.decision.title} ({t(`enum.decisionStatus.${item.decision.status}`)})
                  </p>
                </section>
              )}
              {tasks.length > 0 && (
                <section className="space-y-1">
                  <h2 className="font-semibold">{t("minutes.followUps")}</h2>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {tasks.map((task) => (
                      <li key={task.id}>
                        {task.title}
                        {task.assignedTo ? ` · ${task.assignedTo.name}` : ""}
                        {task.dueDate ? ` · ${fmt.date(task.dueDate)}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <footer className="grid grid-cols-2 gap-8 pt-10 text-center">
                <div className="space-y-12">
                  <p className="font-semibold">{t("meetings.secretary")}</p>
                  <p>{meeting.secretary?.name ?? ""}</p>
                </div>
                <div className="space-y-12">
                  <p className="font-semibold">{t("meetings.chair")}</p>
                  <p>{meeting.chair?.name ?? ""}</p>
                </div>
              </footer>
            </article>
          );
        })
      )}
    </div>
  );
}
