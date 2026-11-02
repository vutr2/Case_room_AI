"use client";

import { Button } from "@ccr/ui/components/button";
import { ScaleIcon } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useCaseActions } from "../case/case-actions";

export function NewDecisionButton() {
  const { openCreateDecision, permissions } = useCaseActions();
  const { t } = useI18n();
  if (!permissions.createDecision) return null;
  return (
    <Button size="sm" onClick={() => openCreateDecision()}>
      <ScaleIcon />
      {t("case.createDecision")}
    </Button>
  );
}
