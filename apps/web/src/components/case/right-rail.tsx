import type { CaseSpecialty } from "@ccr/types";
import { BrainCircuitIcon, CheckSquareIcon, PresentationIcon, ScaleIcon, ShieldCheckIcon } from "lucide-react";
import Link from "next/link";
import { rich } from "@/i18n/rich";
import { getI18n } from "@/i18n/server";
import { DueChip } from "../tasks/task-row";
import { LocalDateTime, TimeAgo } from "../shared/misc";
import { AIActivityIndicator, CareTeamPanel } from "./right-rail-live";

export interface RightRailProps {
  caseId: string;
  specialty: CaseSpecialty;
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  pendingReviews: Array<{ decisionId: string; number: number; title: string }>;
  myTasks: Array<{ id: string; title: string; dueDate: Date | null; status: string }>;
  /** The upcoming tumor board meeting this case is on, if any. */
  upcomingMeeting?: { id: string; title: string; scheduledAt: Date } | null;
  ai: {
    label: string;
    model: string;
    isDemo: boolean;
    documents: number;
    timeline: number;
    decisions: number;
    tasks: number;
    messages: number;
    memoryUpdatedAt: Date | null;
    memoryVersion: number | null;
  };
}

function RailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{title}</h3>
      {children}
    </section>
  );
}

export async function CaseRightRail(props: RightRailProps) {
  const { caseId, ai } = props;
  const { t, fmt } = await getI18n();
  return (
    <aside className="no-print hidden w-80 shrink-0 space-y-6 overflow-y-auto border-l bg-card/60 px-5 py-5 scrollbar-thin xl:block">
      <RailSection title={t("case.statusLabel")}>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[12.5px]">
          <dt className="text-muted-foreground">{t("newCase.specialty")}</dt>
          <dd className="text-right font-medium">{t(`enum.specialty.${props.specialty}`)}</dd>
          <dt className="text-muted-foreground">{t("rail.opened")}</dt>
          <dd className="text-right">
            {fmt.date(props.createdAt)} · {props.createdBy}
          </dd>
          <dt className="text-muted-foreground">{t("rail.lastActivity")}</dt>
          <dd className="text-right">
            <TimeAgo date={props.updatedAt} />
          </dd>
        </dl>
      </RailSection>

      {props.upcomingMeeting && (
        <Link
          href={`/meetings/${props.upcomingMeeting.id}`}
          className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 text-[12.5px] hover:bg-primary/10"
        >
          <PresentationIcon className="mt-0.5 size-4 shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block font-semibold text-primary">{t("rail.tumorBoard")}</span>
            <span className="block">
              <LocalDateTime date={props.upcomingMeeting.scheduledAt} />
            </span>
            <span className="block truncate text-muted-foreground">{props.upcomingMeeting.title}</span>
          </span>
        </Link>
      )}

      <CareTeamPanel />

      <RailSection title={t("rail.pending")}>
        {props.pendingReviews.length === 0 && props.myTasks.length === 0 && <p className="text-[12.5px] text-muted-foreground">{t("rail.nothingPending")}</p>}
        <ul className="space-y-1.5">
          {props.pendingReviews.map((review) => (
            <li key={review.decisionId}>
              <Link
                href={`/cases/${caseId}/decisions#decision-${review.decisionId}`}
                className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[12.5px] text-amber-900 hover:bg-amber-100/70"
              >
                <ScaleIcon className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  <span className="font-semibold">{t("rail.reviewDecision", { number: review.number })}</span>
                  <span className="block text-amber-800/80">{review.title}</span>
                </span>
              </Link>
            </li>
          ))}
          {props.myTasks.map((task) => (
            <li key={task.id}>
              <Link href={`/cases/${caseId}/tasks#task-${task.id}`} className="flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[12.5px] hover:bg-accent">
                <CheckSquareIcon className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{task.title}</span>
                  <DueChip dueDate={task.dueDate} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </RailSection>

      <RailSection title={t("rail.aiContext")}>
        <div className="space-y-3 rounded-xl border border-ai-border bg-ai-soft/60 p-3">
          <div className="flex items-center gap-2 text-[12.5px] font-medium text-ai">
            <BrainCircuitIcon className="size-4" />
            {ai.isDemo ? t("ai.demoLabel") : ai.label}
          </div>
          <p className="text-[12px] leading-relaxed text-foreground/80">
            {t("rail.aiScope", {
              documents: t.plural("count.documents", ai.documents),
              timeline: t.plural("count.timelineEvents", ai.timeline),
              decisions: t.plural("count.decisions", ai.decisions),
              tasks: t.plural("count.tasks", ai.tasks),
              messages: t.plural("count.messages", ai.messages),
            })}
          </p>
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{t("rail.memory", { version: ai.memoryVersion ? `v${ai.memoryVersion}` : t("rail.memoryNotBuilt") })}</span>
            {ai.memoryUpdatedAt && <span>{rich(t("rail.memoryUpdated"), { time: <TimeAgo date={ai.memoryUpdatedAt} /> })}</span>}
          </div>
          {!ai.isDemo && <div className="text-[11px] text-muted-foreground">{t("rail.model", { model: ai.model })}</div>}
          <AIActivityIndicator />
        </div>
      </RailSection>

      <div className="flex items-start gap-2 rounded-xl border border-approved-border bg-approved-soft p-3 text-[12px] leading-relaxed text-approved">
        <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" />
        <span>
          <span className="font-semibold">{t("rail.humansDecide")}</span> {t("rail.humansDecideText")}
        </span>
      </div>
    </aside>
  );
}
