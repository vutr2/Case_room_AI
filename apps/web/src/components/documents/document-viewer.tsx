"use client";

import { Button } from "@ccr/ui/components/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@ccr/ui/components/sheet";
import type { DocumentType, ProcessingStatus, TimelineEventType } from "@ccr/types";
import { CalendarClockIcon, DownloadIcon, SparklesIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/i18n/client";
import { DocumentTypeBadge, ProcessingBadge } from "../shared/badges";

export interface ViewerDocument {
  id: string;
  title: string;
  type: DocumentType;
  documentDate: string;
  uploadedBy: string;
  uploadedAt: string;
  rawText: string;
  fileName: string | null;
  processingStatus: ProcessingStatus;
  processingError: string | null;
  timelineEvents: Array<{ id: string; date: string; title: string; eventType: TimelineEventType; createdByAI: boolean }>;
}

/** Side panel showing a document's extracted text; controlled by the ?doc= query parameter. */
export function DocumentViewer({ caseId, document }: { caseId: string; document: ViewerDocument | null }) {
  const router = useRouter();
  const pathname = usePathname();
  const { t, fmt } = useI18n();

  return (
    <Sheet open={Boolean(document)} onOpenChange={(open) => !open && router.replace(pathname, { scroll: false })}>
      <SheetContent closeLabel={t("common.close")} className="sm:max-w-3xl">
        {document && (
          <>
            <SheetHeader>
              <div className="flex flex-wrap items-center gap-2">
                <DocumentTypeBadge type={document.type} />
                <ProcessingBadge status={document.processingStatus} />
              </div>
              <SheetTitle className="text-lg">{document.title}</SheetTitle>
              <SheetDescription>
                {t("viewer.meta", { date: fmt.date(document.documentDate), name: document.uploadedBy })}
                {document.fileName ? ` · ${document.fileName}` : ""}
              </SheetDescription>
              <div className="flex gap-2 pt-1">
                <Button variant="outline" size="xs" asChild>
                  <a href={`/api/cases/${caseId}/documents/${document.id}/file`} target="_blank" rel="noreferrer">
                    <DownloadIcon />
                    {t("viewer.original")}
                  </a>
                </Button>
              </div>
            </SheetHeader>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {document.timelineEvents.length > 0 && (
                <div className="border-b bg-ai-soft/40 px-6 py-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-ai">
                    <SparklesIcon className="size-3.5" />
                    {t.plural("viewer.extracted", document.timelineEvents.length)}
                  </div>
                  <ul className="space-y-1">
                    {document.timelineEvents.map((event) => (
                      <li key={event.id} className="flex items-center gap-2 text-[13px]">
                        <CalendarClockIcon className="size-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground tabular-nums">{fmt.date(event.date, { year: false })}</span>
                        <span className="font-medium">{event.title}</span>
                        <span className="text-xs text-muted-foreground">· {t(`enum.timelineType.${event.eventType}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {document.processingError && (
                <div className="border-b bg-danger-soft px-6 py-2 text-[13px] text-danger">{t("viewer.failed", { error: document.processingError })}</div>
              )}
              <pre className="flex-1 px-6 py-5 font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap text-foreground/90">{document.rawText}</pre>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
