"use client";

import { Button } from "@ccr/ui/components/button";
import { Spinner } from "@ccr/ui/components/misc";
import { cn } from "@ccr/ui/lib/utils";
import type { AgendaItemStatus, DecisionStatus } from "@ccr/types";
import { ArrowDownIcon, ArrowUpIcon, PresentationIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { moveAgendaItemAction, removeAgendaItemAction } from "@/server/actions/meetings";
import { DecisionStatusBadge } from "../shared/badges";
import { AgendaItemDialog } from "./agenda-item-dialog";
import { AgendaStatusBadge, BriefReadinessBadge } from "./meeting-badges";

export interface AgendaRow {
  id: string;
  caseRoomId: string;
  patientName: string;
  caseTitle: string;
  presenterId: string | null;
  presenterName: string | null;
  question: string;
  status: AgendaItemStatus;
  conclusion: string | null;
  decision: { id: string; number: number; title: string; status: DecisionStatus } | null;
  briefReadiness: "missing" | "stale" | "ready";
  members: Array<{ id: string; name: string }>;
}

/** The meeting's agenda in order. Managers can reorder, edit and remove cases not yet discussed. */
export function AgendaList({ meetingId, rows, editable }: { meetingId: string; rows: AgendaRow[]; editable: boolean }) {
  const { t } = useI18n();
  return (
    <ol className="divide-y rounded-xl border bg-card">
      {rows.map((row, index) => (
        <li key={row.id} className="grid gap-3 px-4 py-3.5 sm:grid-cols-[28px_minmax(0,1fr)_auto]">
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[13px] font-semibold text-muted-foreground">{index + 1}</span>
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/cases/${row.caseRoomId}`} className="text-[14px] font-semibold hover:underline">
                {row.patientName}
              </Link>
              <span className="truncate text-[13px] text-muted-foreground">{row.caseTitle}</span>
            </div>
            <p className="text-[13px] leading-relaxed">
              <span className="font-medium text-muted-foreground">{t("meetings.agenda.questionShort")} </span>
              {row.question}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <AgendaStatusBadge status={row.status} />
              <Link href={`/cases/${row.caseRoomId}/tumor-board`} className="hover:opacity-80">
                <BriefReadinessBadge readiness={row.briefReadiness} />
              </Link>
              {row.decision && (
                <Link href={`/cases/${row.caseRoomId}/decisions`} className="inline-flex items-center gap-1.5 hover:opacity-80">
                  <DecisionStatusBadge status={row.decision.status} />
                  <span>{t("activity.decisionNumber", { number: row.decision.number })}</span>
                </Link>
              )}
              <span>· {t("meetings.agenda.presentedBy", { name: row.presenterName ?? t("meetings.form.notSet") })}</span>
            </div>
            {row.conclusion && (
              <p className="rounded-md border border-approved-border bg-approved-soft/50 px-3 py-2 text-[13px] leading-relaxed whitespace-pre-line">
                <span className="font-medium">{t("meetings.outcome.conclusion")}: </span>
                {row.conclusion}
              </p>
            )}
          </div>
          <div className="flex items-start gap-0.5">
            <Button asChild variant="ghost" size="icon-sm" aria-label={t("meetings.present")}>
              <Link href={`/meetings/${meetingId}/present?item=${row.id}`}>
                <PresentationIcon />
              </Link>
            </Button>
            {editable && (
              <>
                <MoveButton meetingId={meetingId} itemId={row.id} direction="up" disabled={index === 0} />
                <MoveButton meetingId={meetingId} itemId={row.id} direction="down" disabled={index === rows.length - 1} />
                <AgendaItemDialog
                  meetingId={meetingId}
                  item={{ id: row.id, caseRoomId: row.caseRoomId, label: row.patientName, presenterId: row.presenterId, question: row.question, members: row.members }}
                />
                {row.status === "PENDING" && !row.decision && <RemoveButton meetingId={meetingId} caseRoomId={row.caseRoomId} itemId={row.id} />}
              </>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}

function MoveButton({ meetingId, itemId, direction, disabled }: { meetingId: string; itemId: string; direction: "up" | "down"; disabled: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={direction === "up" ? t("meetings.agenda.moveUp") : t("meetings.agenda.moveDown")}
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          const result = await moveAgendaItemAction(meetingId, itemId, direction);
          if (!result.ok) toast.error(result.error);
          router.refresh();
        })
      }
    >
      {pending ? <Spinner /> : <Icon />}
    </Button>
  );
}

function RemoveButton({ meetingId, caseRoomId, itemId }: { meetingId: string; caseRoomId: string; itemId: string }) {
  const router = useRouter();
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn("text-danger hover:text-danger")}
      aria-label={t("meetings.agenda.remove")}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await removeAgendaItemAction(meetingId, caseRoomId, itemId);
          if (!result.ok) toast.error(result.error);
          else toast.success(t("meetings.agenda.removed"));
          router.refresh();
        })
      }
    >
      {pending ? <Spinner /> : <Trash2Icon />}
    </Button>
  );
}
