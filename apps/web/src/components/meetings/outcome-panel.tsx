"use client";

import { Button } from "@ccr/ui/components/button";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { Textarea } from "@ccr/ui/components/textarea";
import type { AgendaItemStatus, DecisionStatus, MeetingStatus } from "@ccr/types";
import { CheckCircle2Icon, CheckSquareIcon, InfoIcon, PauseCircleIcon, ScaleIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { recordOutcomeAction } from "@/server/actions/meetings";
import { useCaseActions } from "../case/case-actions";
import { DecisionStatusBadge } from "../shared/badges";
import { AgendaStatusBadge } from "./meeting-badges";

interface OutcomePanelProps {
  meetingId: string;
  meetingStatus: MeetingStatus;
  canManage: boolean;
  item: {
    id: string;
    caseRoomId: string;
    status: AgendaItemStatus;
    summary: string | null;
    conclusion: string | null;
    decision: { id: string; number: number; title: string; status: DecisionStatus } | null;
  };
  /** Prefill for the summary: the brief's case summary section, until a clinician writes one. */
  defaultSummary: string;
}

function firstLine(text: string, max = 120): string {
  const line = text.split(/\n|(?<=\.)\s/)[0]?.trim() ?? "";
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
}

/** The board's outcome for the case on screen: summary, conclusion, decision and follow-up tasks. */
export function OutcomePanel({ meetingId, meetingStatus, canManage, item, defaultSummary }: OutcomePanelProps) {
  const router = useRouter();
  const { t } = useI18n();
  const { permissions, openCreateDecision, openCreateTask } = useCaseActions();
  const [summary, setSummary] = useState(item.summary ?? defaultSummary);
  const [conclusion, setConclusion] = useState(item.conclusion ?? "");
  const [pending, startTransition] = useTransition();
  const recording = meetingStatus === "IN_PROGRESS" || meetingStatus === "COMPLETED";
  const editable = canManage && recording;

  function save(status: "DISCUSSED" | "DEFERRED") {
    startTransition(async () => {
      const result = await recordOutcomeAction(meetingId, item.caseRoomId, item.id, { status, summary, conclusion });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(status === "DISCUSSED" ? t("meetings.outcome.savedDiscussed") : t("meetings.outcome.savedDeferred"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{t("meetings.outcome.title")}</h2>
        <AgendaStatusBadge status={item.status} />
      </div>

      {!recording && (
        <p className="flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-xs text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" />
          {t("meetings.outcome.startFirst")}
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="outcome-summary">{t("meetings.outcome.summary")}</Label>
        <Textarea
          id="outcome-summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          readOnly={!editable}
          className="min-h-28 text-[13px] leading-relaxed"
        />
        <p className="text-[11.5px] text-muted-foreground">{t("meetings.outcome.summaryHint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="outcome-conclusion">{t("meetings.outcome.conclusion")}</Label>
        <Textarea
          id="outcome-conclusion"
          value={conclusion}
          onChange={(e) => setConclusion(e.target.value)}
          readOnly={!editable}
          placeholder={t("meetings.outcome.conclusionPlaceholder")}
          className="min-h-28 text-[13px] leading-relaxed"
        />
      </div>

      {editable && (
        <div className="flex flex-wrap gap-2">
          <Button variant="approve" size="sm" disabled={pending} onClick={() => save("DISCUSSED")}>
            {pending ? <Spinner /> : <CheckCircle2Icon />}
            {t("meetings.outcome.markDiscussed")}
          </Button>
          <Button variant="outline" size="sm" disabled={pending} onClick={() => save("DEFERRED")}>
            <PauseCircleIcon />
            {t("meetings.outcome.defer")}
          </Button>
        </div>
      )}

      <div className="space-y-2 border-t pt-4">
        {item.decision ? (
          <Link href={`/cases/${item.caseRoomId}/decisions`} className="flex flex-wrap items-center gap-2 text-[13px] hover:underline">
            <DecisionStatusBadge status={item.decision.status} />
            <span className="font-medium">{t("activity.decisionNumber", { number: item.decision.number })}</span>
            <span className="text-muted-foreground">{item.decision.title}</span>
          </Link>
        ) : (
          permissions.createDecision &&
          item.status === "DISCUSSED" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                openCreateDecision({
                  title: firstLine(item.conclusion ?? conclusion),
                  description: item.conclusion ?? conclusion,
                  // The case as the board saw it; the conclusion itself when no summary was written.
                  rationale: (item.summary ?? summary).trim() || (item.conclusion ?? conclusion),
                  agendaItemId: item.id,
                })
              }
            >
              <ScaleIcon />
              {t("meetings.outcome.proposeDecision")}
            </Button>
          )
        )}
        {permissions.manageTasks && item.status === "DISCUSSED" && (
          <Button variant="outline" size="sm" onClick={() => openCreateTask({ description: item.conclusion ?? conclusion })}>
            <CheckSquareIcon />
            {t("meetings.outcome.createTask")}
          </Button>
        )}
        {item.status === "DISCUSSED" && !item.decision && <p className="text-[11.5px] text-muted-foreground">{t("meetings.outcome.decisionHint")}</p>}
      </div>
    </div>
  );
}
