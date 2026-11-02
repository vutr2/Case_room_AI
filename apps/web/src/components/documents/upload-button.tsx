"use client";

import { Button } from "@ccr/ui/components/button";
import { FileUpIcon } from "lucide-react";
import { useI18n } from "@/i18n/client";
import { useCaseActions } from "../case/case-actions";

export function UploadButton({ label }: { label?: string }) {
  const { openUpload, permissions } = useCaseActions();
  const { t } = useI18n();
  if (!permissions.uploadDocument) return null;
  return (
    <Button size="sm" onClick={openUpload}>
      <FileUpIcon />
      {label ?? t("case.upload")}
    </Button>
  );
}
