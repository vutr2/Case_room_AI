"use client";

import { Button } from "@ccr/ui/components/button";
import { Spinner } from "@ccr/ui/components/misc";
import { ClipboardListIcon, PresentationIcon } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { generateHandoffAction, generateTumorBoardAction } from "@/server/actions/briefs";
import { useAIAction } from "../case/case-header";

export function GenerateBriefButton({ caseId, type, label, variant = "ai" }: { caseId: string; type: "TUMOR_BOARD" | "HANDOFF"; label: string; variant?: "ai" | "ai-outline" }) {
  const ai = useAIAction();
  const { t } = useI18n();
  const Icon = type === "TUMOR_BOARD" ? PresentationIcon : ClipboardListIcon;
  return (
    <Button
      variant={variant}
      size="sm"
      disabled={ai.pending}
      onClick={() =>
        type === "TUMOR_BOARD"
          ? ai.run(t("ai.preparingTumorBoard"), () => generateTumorBoardAction(caseId), t("ai.tumorBoardDrafted"))
          : ai.run(t("ai.draftingHandoff"), () => generateHandoffAction(caseId), t("ai.handoffDrafted"))
      }
    >
      {ai.pending ? <Spinner /> : <Icon />}
      {label}
    </Button>
  );
}
