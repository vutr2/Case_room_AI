"use client";

import { Button } from "@ccr/ui/components/button";
import { PrinterIcon } from "lucide-react";
import { useI18n } from "@/i18n/client";

export function PrintButton() {
  const { t } = useI18n();
  return (
    <Button size="sm" onClick={() => window.print()}>
      <PrinterIcon />
      {t("brief.print")}
    </Button>
  );
}
