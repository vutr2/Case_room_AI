import { cn } from "@ccr/ui/lib/utils";
import { LockIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuditTable } from "@/components/audit/audit-table";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import type { MessageKey } from "@/i18n/messages/en";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listOrganizationAudit } from "@/server/services/team";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("auditPage.title") };
}

const FILTERS: ReadonlyArray<{ key: string; label: MessageKey }> = [
  { key: "", label: "auditFilter.all" },
  { key: "auth.", label: "auditFilter.signIns" },
  { key: "org.", label: "auditFilter.organization" },
  { key: "case.", label: "auditFilter.cases" },
  { key: "ai.", label: "auditFilter.ai" },
  { key: "decision.", label: "auditFilter.decisions" },
  { key: "document.", label: "auditFilter.documents" },
  { key: "task.", label: "auditFilter.tasks" },
];

export default async function OrganizationAuditPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser();
  if (!can(user, "org.audit")) redirect("/settings");
  const { filter = "" } = await searchParams;
  const active = FILTERS.find((f) => f.key === filter)?.key ?? "";
  const rows = await listOrganizationAudit(user, { action: active || undefined });
  const { t } = await getI18n();

  return (
    <PageContainer>
      <PageHeader
        title={t("auditPage.orgTitle")}
        description={t("auditPage.orgIntro")}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <LockIcon className="size-3.5" /> {t("auditPage.appendOnly")}
          </span>
        }
      />
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/settings/audit?filter=${f.key}` : "/settings/audit"}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", active === f.key ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground")}
          >
            {t(f.label)}
          </Link>
        ))}
      </div>
      <AuditTable rows={rows} showCase />
    </PageContainer>
  );
}
