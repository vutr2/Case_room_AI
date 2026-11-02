"use client";

import { Button } from "@ccr/ui/components/button";
import { AlertTriangleIcon } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useI18n } from "@/i18n/client";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n();
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-danger-soft text-danger">
        <AlertTriangleIcon className="size-5" />
      </div>
      <h1 className="text-lg font-semibold">{t("error.title")}</h1>
      <p className="max-w-md text-[13px] text-muted-foreground">{t("error.text")}</p>
      {error.digest && <p className="font-mono text-[11px] text-muted-foreground">{t("error.reference", { digest: error.digest })}</p>}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          {t("common.tryAgain")}
        </Button>
        <Button size="sm" asChild>
          <Link href="/dashboard">{t("nav.dashboard")}</Link>
        </Button>
      </div>
    </div>
  );
}
