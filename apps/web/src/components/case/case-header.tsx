"use client";

import { Button } from "@ccr/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ccr/ui/components/dropdown-menu";
import { cn } from "@ccr/ui/lib/utils";
import type { CaseSpecialty, CaseStatus, PatientSex } from "@ccr/types";
import { CASE_STATUSES } from "@ccr/types";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  ClipboardListIcon,
  FileUpIcon,
  ListPlusIcon,
  MoreHorizontalIcon,
  PresentationIcon,
  ScaleIcon,
  SparklesIcon,
  UserPlusIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { generateHandoffAction, generateSummaryAction, generateTumorBoardAction } from "@/server/actions/briefs";
import { updateCaseStatusAction } from "@/server/actions/cases";
import { SyntheticPatientBadge } from "../shared/badges";
import { AvatarStack } from "../shared/user-avatar";
import { useCaseActions } from "./case-actions";
import { useCaseRealtime } from "./realtime-provider";

const STATUS_DOT: Record<CaseStatus, string> = {
  OPEN: "bg-sky-500",
  REVIEWING: "bg-indigo-500",
  DECISION_PENDING: "bg-amber-500",
  CLOSED: "bg-slate-400",
};

export interface CaseHeaderProps {
  title: string;
  status: CaseStatus;
  specialty: CaseSpecialty;
  patient: { name: string; age: number; sex: PatientSex; mrn: string; dateOfBirth: string; primaryDiagnosis: string };
}

export function useAIAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  function run(label: string, action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, href?: string) {
    startTransition(async () => {
      const toastId = toast.loading(label, { description: t("ai.readingRecord") });
      const result = await action();
      if (!result.ok) {
        toast.error(result.error, { id: toastId, description: undefined });
        return;
      }
      toast.success(success, { id: toastId, description: t("ai.draftNotice") });
      if (href) router.push(href);
      else router.refresh();
    });
  }
  return { pending, run };
}

export function CaseHeader({ title, status, specialty, patient }: CaseHeaderProps) {
  const actions = useCaseActions();
  const realtime = useCaseRealtime();
  const router = useRouter();
  const ai = useAIAction();
  const [statusPending, startStatus] = useTransition();
  const { t, fmt } = useI18n();
  const { caseId, permissions } = actions;

  function changeStatus(next: CaseStatus) {
    startStatus(async () => {
      const result = await updateCaseStatusAction(caseId, next);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(t("case.statusChanged", { status: t(`enum.caseStatus.${next}`) }));
        router.refresh();
      }
    });
  }

  return (
    <header className="border-b bg-card px-6 pt-4 lg:px-8">
      <nav className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/cases" className="hover:text-foreground">
          {t("nav.cases")}
        </Link>
        <ChevronRightIcon className="size-3" />
        <span className="truncate">{title}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">{patient.name}</h1>
            <SyntheticPatientBadge />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
            <span>{t("case.ageSex", { age: patient.age, sex: t(`enum.sex.${patient.sex}`) })}</span>
            <span className="text-border">|</span>
            <span>{t("case.mrn", { mrn: patient.mrn })}</span>
            <span className="text-border">|</span>
            <span>{t("case.dob", { date: fmt.date(patient.dateOfBirth) })}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-medium text-foreground">{patient.primaryDiagnosis}</span>
            <span className="text-muted-foreground">· {t(`enum.specialty.${specialty}`)}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2.5">
          <div className="flex items-center gap-3">
            {permissions.manageCase ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={statusPending}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs font-medium shadow-xs hover:bg-accent disabled:opacity-60"
                  >
                    <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                    {t(`enum.caseStatus.${status}`)}
                    <ChevronDownIcon className="size-3 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("case.statusLabel")}</DropdownMenuLabel>
                  {CASE_STATUSES.map((value) => (
                    <DropdownMenuItem key={value} onSelect={() => value !== status && changeStatus(value)}>
                      <span className={cn("size-2 rounded-full", STATUS_DOT[value])} />
                      {t(`enum.caseStatus.${value}`)}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium">
                <span className={cn("size-2 rounded-full", STATUS_DOT[status])} />
                {t(`enum.caseStatus.${status}`)}
              </span>
            )}
            <button type="button" onClick={permissions.manageCase ? actions.openInvite : undefined} className="cursor-pointer" title={t("cases.col.careTeam")}>
              <AvatarStack users={actions.members} max={6} size="sm" onlineIds={realtime.onlineIds} />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {permissions.uploadDocument && (
              <Button variant="outline" size="sm" onClick={actions.openUpload}>
                <FileUpIcon />
                {t("case.upload")}
              </Button>
            )}
            {permissions.manageCase && (
              <Button variant="outline" size="sm" onClick={actions.openInvite}>
                <UserPlusIcon />
                {t("case.invite")}
              </Button>
            )}
            {permissions.generateBrief && (
              <Button
                variant="ai-outline"
                size="sm"
                disabled={ai.pending}
                onClick={() => ai.run(t("ai.generatingSummary"), () => generateSummaryAction(caseId), t("ai.summaryUpdated"), `/cases/${caseId}`)}
              >
                <SparklesIcon />
                {t("case.generateSummary")}
              </Button>
            )}
            {permissions.createDecision && (
              <Button size="sm" onClick={() => actions.openCreateDecision()}>
                <ScaleIcon />
                {t("case.createDecision")}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon-sm" aria-label={t("case.moreActions")}>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {permissions.generateBrief && (
                  <DropdownMenuItem
                    disabled={ai.pending}
                    onSelect={() =>
                      ai.run(t("ai.preparingTumorBoard"), () => generateTumorBoardAction(caseId), t("ai.tumorBoardDrafted"), `/cases/${caseId}/tumor-board`)
                    }
                  >
                    <PresentationIcon />
                    {t("case.prepareTumorBoard")}
                  </DropdownMenuItem>
                )}
                {permissions.generateHandoff && (
                  <DropdownMenuItem
                    disabled={ai.pending}
                    onSelect={() => ai.run(t("ai.draftingHandoff"), () => generateHandoffAction(caseId), t("ai.handoffDrafted"), `/cases/${caseId}/handoff`)}
                  >
                    <ClipboardListIcon />
                    {t("case.generateHandoff")}
                  </DropdownMenuItem>
                )}
                {permissions.manageTasks && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => actions.openCreateTask()}>
                      <ListPlusIcon />
                      {t("tasks.add")}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
