import { prisma } from "@ccr/database";
import { cn } from "@ccr/ui/lib/utils";
import { LockIcon } from "lucide-react";
import Link from "next/link";
import { AuditTable } from "@/components/audit/audit-table";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { loadCasePage } from "@/server/case-page";

const FILTERS: ReadonlyArray<{ key: string; label: MessageKey }> = [
  { key: "", label: "auditFilter.all" },
  { key: "ai.", label: "auditFilter.ai" },
  { key: "decision.", label: "auditFilter.decisions" },
  { key: "document.", label: "auditFilter.documents" },
  { key: "task.", label: "auditFilter.tasks" },
  { key: "brief.", label: "auditFilter.briefs" },
  { key: "case.", label: "auditFilter.case" },
];

export default async function CaseAuditPage({ params, searchParams }: { params: Promise<{ caseId: string }>; searchParams: Promise<{ filter?: string }> }) {
  const { caseId } = await loadCasePage(params);
  const { filter = "" } = await searchParams;
  const active = FILTERS.find((f) => f.key === filter)?.key ?? "";
  const { t } = await getI18n();

  const rows = await prisma.auditEvent.findMany({
    where: { caseRoomId: caseId, ...(active ? { action: { startsWith: active } } : {}) },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-6 py-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{t("auditPage.title")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("auditPage.caseIntro")}</p>
        </div>
        <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
          <LockIcon className="size-3.5" />
          {t("auditPage.appendOnlyLong")}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/cases/${caseId}/audit?filter=${f.key}` : `/cases/${caseId}/audit`}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-medium",
              active === f.key ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {t(f.label)}
          </Link>
        ))}
      </div>

      <AuditTable rows={rows} />
    </div>
  );
}
