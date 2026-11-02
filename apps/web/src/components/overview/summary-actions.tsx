"use client";

import { Button } from "@ccr/ui/components/button";
import { Spinner } from "@ccr/ui/components/misc";
import { CheckIcon, RefreshCwIcon, SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { approveBriefAction, generateSummaryAction } from "@/server/actions/briefs";
import { useAIAction } from "../case/case-header";

export function GenerateSummaryButton({ caseId, regenerate = false }: { caseId: string; regenerate?: boolean }) {
  const ai = useAIAction();
  const { t } = useI18n();
  return (
    <Button
      variant={regenerate ? "ai-outline" : "ai"}
      size="sm"
      disabled={ai.pending}
      onClick={() => ai.run(t("ai.generatingSummary"), () => generateSummaryAction(caseId), t("ai.summaryUpdated"))}
    >
      {ai.pending ? <Spinner /> : regenerate ? <RefreshCwIcon /> : <SparklesIcon />}
      {regenerate ? t("summary.regenerate") : t("summary.generate")}
    </Button>
  );
}

export function MarkReviewedButton({
  caseId,
  briefId,
  version,
}: {
  caseId: string;
  briefId: string;
  /** The summary version on screen; marking reviewed applies only to it. */
  version: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <Button
      variant="approve"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await approveBriefAction(caseId, briefId, { expectedVersion: version });
          if (!result.ok) {
            toast.error(result.error);
            router.refresh();
          } else {
            toast.success(t("summary.markedReviewed"));
            router.refresh();
          }
        })
      }
    >
      {pending ? <Spinner /> : <CheckIcon />}
      {t("summary.markReviewed")}
    </Button>
  );
}
