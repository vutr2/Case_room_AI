"use client";

import { Badge } from "@ccr/ui/components/badge";
import type { AgendaItemStatus, MeetingStatus } from "@ccr/types";
import { CalendarClockIcon, CheckCircle2Icon, CircleDashedIcon, PauseCircleIcon, PlayCircleIcon, XCircleIcon } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function MeetingStatusBadge({ status, className }: { status: MeetingStatus; className?: string }) {
  const { t } = useI18n();
  const variant = status === "IN_PROGRESS" ? "ai" : status === "COMPLETED" ? "approved" : status === "CANCELLED" ? "muted" : "default";
  const Icon = status === "IN_PROGRESS" ? PlayCircleIcon : status === "COMPLETED" ? CheckCircle2Icon : status === "CANCELLED" ? XCircleIcon : CalendarClockIcon;
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {t(`enum.meetingStatus.${status}`)}
    </Badge>
  );
}

export function AgendaStatusBadge({ status, className }: { status: AgendaItemStatus; className?: string }) {
  const { t } = useI18n();
  const variant = status === "DISCUSSED" ? "approved" : status === "DEFERRED" ? "draft" : "muted";
  const Icon = status === "DISCUSSED" ? CheckCircle2Icon : status === "DEFERRED" ? PauseCircleIcon : CircleDashedIcon;
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {t(`enum.agendaStatus.${status}`)}
    </Badge>
  );
}

/** Whether the case has a tumor board brief that covers its newest document. */
export function BriefReadinessBadge({ readiness }: { readiness: "missing" | "stale" | "ready" }) {
  const { t } = useI18n();
  if (readiness === "ready") return <Badge variant="approved">{t("meetings.brief.ready")}</Badge>;
  return <Badge variant="draft">{readiness === "missing" ? t("meetings.brief.missing") : t("meetings.brief.stale")}</Badge>;
}
