"use client";

import { Badge } from "@ccr/ui/components/badge";
import { cn } from "@ccr/ui/lib/utils";
import type {
  ApprovalStatus,
  CaseStatus,
  DecisionStatus,
  DocumentType,
  ProcessingStatus,
  TaskPriority,
  TaskStatus,
} from "@ccr/types";
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  CheckCircle2Icon,
  CircleDashedIcon,
  CircleDotIcon,
  ClockIcon,
  FlaskConicalIcon,
  LoaderIcon,
  MessageSquareWarningIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XCircleIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/client";

/* ─────────────── AI vs human labels (safety design) ─────────────── */

export function AIGeneratedBadge({ className, label }: { className?: string; label?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="ai" className={className}>
      <SparklesIcon />
      {label ?? t("badge.aiGenerated")}
    </Badge>
  );
}

export function DraftBadge({ className }: { className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="draft" className={className}>
      <CircleDashedIcon />
      {t("badge.draft")}
    </Badge>
  );
}

export function HumanApprovedBadge({ className, label }: { className?: string; label?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="approved" className={className}>
      <ShieldCheckIcon />
      {label ?? t("badge.humanApproved")}
    </Badge>
  );
}

export function SyntheticPatientBadge({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={cn("border-dashed font-semibold tracking-wide text-muted-foreground uppercase", className)}>
      <FlaskConicalIcon />
      {compact ? t("badge.synthetic") : t("badge.syntheticPatient")}
    </Badge>
  );
}

/* ─────────────── Status badges ─────────────── */

const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  OPEN: "border-transparent bg-sky-50 text-sky-700",
  REVIEWING: "border-transparent bg-indigo-50 text-indigo-700",
  DECISION_PENDING: "border-transparent bg-amber-50 text-amber-800",
  CLOSED: "border-transparent bg-slate-100 text-slate-600",
};

export function CaseStatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={cn(CASE_STATUS_STYLE[status], className)}>
      <CircleDotIcon />
      {t(`enum.caseStatus.${status}`)}
    </Badge>
  );
}

export function DecisionStatusBadge({ status, className }: { status: DecisionStatus; className?: string }) {
  const { t } = useI18n();
  if (status === "APPROVED") return <HumanApprovedBadge className={className} />;
  const variant = status === "REJECTED" ? "danger" : status === "UNDER_REVIEW" ? "default" : "draft";
  const Icon = status === "REJECTED" ? XCircleIcon : status === "UNDER_REVIEW" ? ClockIcon : CircleDashedIcon;
  return (
    <Badge variant={variant} className={className}>
      <Icon />
      {t(`enum.decisionStatus.${status}`)}
    </Badge>
  );
}

export function ApprovalStatusBadge({ status }: { status: ApprovalStatus }) {
  const { t } = useI18n();
  const config = {
    PENDING: { variant: "muted", Icon: ClockIcon },
    APPROVED: { variant: "approved", Icon: CheckCircle2Icon },
    REJECTED: { variant: "danger", Icon: XCircleIcon },
    NEEDS_CHANGES: { variant: "draft", Icon: MessageSquareWarningIcon },
  } as const;
  const { variant, Icon } = config[status];
  return (
    <Badge variant={variant}>
      <Icon />
      {t(`enum.approvalStatus.${status}`)}
    </Badge>
  );
}

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: "border-transparent bg-slate-100 text-slate-600",
  MEDIUM: "border-transparent bg-sky-50 text-sky-700",
  HIGH: "border-transparent bg-orange-50 text-orange-700",
  URGENT: "border-transparent bg-red-50 text-red-700",
};

export function TaskPriorityBadge({ priority, className }: { priority: TaskPriority; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={cn(PRIORITY_STYLE[priority], className)}>
      {priority === "URGENT" && <AlertTriangleIcon />}
      {t(`enum.taskPriority.${priority}`)}
    </Badge>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useI18n();
  const variant = status === "DONE" ? "approved" : status === "IN_PROGRESS" ? "default" : "muted";
  return <Badge variant={variant}>{t(`enum.taskStatus.${status}`)}</Badge>;
}

const DOC_STYLE: Record<DocumentType, string> = {
  CLINICAL_NOTE: "bg-slate-100 text-slate-700",
  LAB_RESULT: "bg-emerald-50 text-emerald-700",
  IMAGING_REPORT: "bg-sky-50 text-sky-700",
  PATHOLOGY_REPORT: "bg-fuchsia-50 text-fuchsia-700",
  DISCHARGE_SUMMARY: "bg-amber-50 text-amber-800",
  OTHER: "bg-slate-100 text-slate-600",
};

export function DocumentTypeBadge({ type, className }: { type: DocumentType; className?: string }) {
  const { t } = useI18n();
  return (
    <Badge variant="outline" className={cn("border-transparent", DOC_STYLE[type], className)}>
      {t(`enum.documentType.${type}`)}
    </Badge>
  );
}

export function ProcessingBadge({ status }: { status: ProcessingStatus }) {
  const { t } = useI18n();
  if (status === "COMPLETED") {
    return (
      <Badge variant="ai">
        <BadgeCheckIcon />
        {t("badge.aiProcessed")}
      </Badge>
    );
  }
  if (status === "FAILED") {
    return (
      <Badge variant="danger">
        <XCircleIcon />
        {t("badge.aiFailed")}
      </Badge>
    );
  }
  return (
    <Badge variant="ai">
      <LoaderIcon className="animate-spin" />
      {status === "PENDING" ? t("badge.aiQueued") : t("badge.aiProcessing")}
    </Badge>
  );
}
