"use client";

import { Button } from "@ccr/ui/components/button";
import { Spinner } from "@ccr/ui/components/misc";
import { SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { generateTumorBoardAction } from "@/server/actions/briefs";

/**
 * Generate the tumor board brief of every agenda case that has none, or whose
 * brief predates its newest document. One request per case (each counts toward
 * the AI limits like any brief), so no single request runs for minutes; it stops
 * at the first failure, for example when the daily AI limit is reached.
 */
export function PrepareAgendaButton({ cases }: { cases: Array<{ caseRoomId: string; label: string }> }) {
  const router = useRouter();
  const { t } = useI18n();
  const [progress, setProgress] = useState<{ done: number; current: string } | null>(null);

  async function prepare() {
    let done = 0;
    for (const item of cases) {
      setProgress({ done, current: item.label });
      const result = await generateTumorBoardAction(item.caseRoomId);
      if (!result.ok) {
        toast.error(t("meetings.prepare.failed", { name: item.label, error: result.error, done, total: cases.length }));
        setProgress(null);
        router.refresh();
        return;
      }
      done += 1;
    }
    toast.success(t.plural("meetings.prepare.done", done));
    setProgress(null);
    router.refresh();
  }

  if (cases.length === 0) return null;
  return (
    <Button variant="ai-outline" size="sm" disabled={progress !== null} onClick={prepare}>
      {progress ? <Spinner /> : <SparklesIcon />}
      {progress ? t("meetings.prepare.progress", { done: progress.done + 1, total: cases.length, name: progress.current }) : t.plural("meetings.prepare.button", cases.length)}
    </Button>
  );
}
