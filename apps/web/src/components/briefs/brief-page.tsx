import { cn } from "@ccr/ui/lib/utils";
import type { BriefType } from "@ccr/types";
import { ClipboardListIcon, HistoryIcon, PresentationIcon } from "lucide-react";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { shortName } from "@/lib/activity";
import { aiProviderLabel } from "@/lib/ai-provider";
import type { SessionUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listBriefs } from "@/server/services/briefs";
import { EmptyState } from "../shared/empty-state";
import { LocalDateTime } from "../shared/misc";
import { BriefEditor } from "./brief-editor";
import { GenerateBriefButton } from "./generate-brief-button";

const ICON = { TUMOR_BOARD: PresentationIcon, HANDOFF: ClipboardListIcon } as const;

export async function BriefPage({ user, caseId, type, selectedId }: { user: SessionUser; caseId: string; type: Exclude<BriefType, "CASE_SUMMARY">; selectedId?: string }) {
  const { t } = await getI18n();
  const briefs = await listBriefs(user, caseId, type);
  const latest = briefs[0];
  const selected = (selectedId && briefs.find((b) => b.id === selectedId)) || latest;
  const canGenerate = can(user, type === "TUMOR_BOARD" ? "brief.generate" : "handoff.generate");
  const canApprove = can(user, type === "TUMOR_BOARD" ? "brief.approve" : "handoff.approve");
  const base = `/cases/${caseId}/${type === "TUMOR_BOARD" ? "tumor-board" : "handoff"}`;

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-6 py-6 lg:px-8">
      <div className="no-print flex items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="text-base font-semibold">{t(`brief.${type}.heading`)}</h2>
          <p className="text-[13px] text-muted-foreground">{t(`brief.${type}.description`)}</p>
        </div>
        {canGenerate && latest && <GenerateBriefButton caseId={caseId} type={type} label={t(`brief.${type}.regenerate`)} variant="ai-outline" />}
      </div>

      {!selected || selected.parsed?.kind !== "sections" ? (
        <EmptyState
          icon={ICON[type]}
          title={t(`brief.${type}.empty`)}
          description={t(`brief.${type}.emptyDescription`)}
          action={canGenerate ? <GenerateBriefButton caseId={caseId} type={type} label={t(`brief.${type}.generate`)} /> : undefined}
        />
      ) : (
        <div className="space-y-3">
          {briefs.length > 1 && (
            <div className="no-print flex flex-wrap items-center gap-1.5">
              <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                <HistoryIcon className="size-3.5" /> {t("brief.versions")}
              </span>
              {briefs.map((brief) => (
                <Link
                  key={brief.id}
                  href={brief.id === latest?.id ? base : `${base}?brief=${brief.id}`}
                  scroll={false}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs hover:bg-accent",
                    brief.id === selected.id && "border-primary/40 bg-primary/5 text-primary",
                  )}
                >
                  <LocalDateTime date={brief.createdAt} />
                  <span className={cn("size-1.5 rounded-full", brief.status === "APPROVED" ? "bg-approved" : "bg-draft")} />
                  {brief.id === latest?.id && <span className="text-muted-foreground">{t("brief.latest")}</span>}
                </Link>
              ))}
            </div>
          )}
          <BriefEditor
            key={selected.id}
            caseId={caseId}
            type={type}
            isLatest={selected.id === latest?.id}
            canEdit={canGenerate}
            canApprove={canApprove}
            brief={{
              id: selected.id,
              version: selected.version,
              title: selected.title,
              status: selected.status,
              content: selected.parsed,
              createdAt: selected.createdAt.toISOString(),
              requestedBy: selected.requestedBy ? shortName(selected.requestedBy.name) : null,
              editedBy: selected.editedBy ? shortName(selected.editedBy.name) : null,
              editedAt: selected.editedAt?.toISOString() ?? null,
              approvedBy: selected.approvedBy ? shortName(selected.approvedBy.name) : null,
              approvedAt: selected.approvedAt?.toISOString() ?? null,
              provider: aiProviderLabel(selected.aiProvider, t),
            }}
          />
        </div>
      )}
    </div>
  );
}
