import { Button } from "@ccr/ui/components/button";
import { Input } from "@ccr/ui/components/input";
import { cn } from "@ccr/ui/lib/utils";
import { CASE_STATUSES, type CaseStatus } from "@ccr/types";
import { CheckSquareIcon, FileTextIcon, FolderHeartIcon, PlusIcon, ScaleIcon, SearchIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { CaseStatusBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { TimeAgo } from "@/components/shared/misc";
import { AvatarStack } from "@/components/shared/user-avatar";
import { getI18n } from "@/i18n/server";
import { ageFromDob } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listCases } from "@/server/services/cases";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.cases") };
}

export default async function CasesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const { status: rawStatus, q } = await searchParams;
  const status = CASE_STATUSES.includes(rawStatus as CaseStatus) ? (rawStatus as CaseStatus) : undefined;
  const [cases, all] = await Promise.all([listCases(user, { status, query: q }), listCases(user)]);
  const counts = Object.fromEntries(CASE_STATUSES.map((s) => [s, all.filter((c) => c.status === s).length])) as Record<CaseStatus, number>;
  const link = (next?: CaseStatus) => {
    const params = new URLSearchParams();
    if (next) params.set("status", next);
    if (q) params.set("q", q);
    const query = params.toString();
    return query ? `/cases?${query}` : "/cases";
  };

  return (
    <PageContainer>
      <PageHeader
        title={t("nav.cases")}
        description={user.role === "ORG_ADMIN" ? t("cases.descriptionAdmin") : t("cases.descriptionMember")}
        actions={
          can(user, "case.create") && (
            <Button asChild>
              <Link href="/cases/new">
                <PlusIcon />
                {t("dashboard.newCase")}
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Link href={link()} className={cn("rounded-full border px-3 py-1 text-xs font-medium", !status ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground")}>
            {t("cases.all", { count: all.length })}
          </Link>
          {CASE_STATUSES.map((s) => (
            <Link
              key={s}
              href={link(s)}
              className={cn("rounded-full border px-3 py-1 text-xs font-medium", status === s ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground")}
            >
              {t(`enum.caseStatus.${s}`)} · {counts[s]}
            </Link>
          ))}
        </div>
        <form action="/cases" className="relative w-72">
          {status && <input type="hidden" name="status" value={status} />}
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input name="q" defaultValue={q} placeholder={t("cases.searchPlaceholder")} className="pl-8" />
        </form>
      </div>

      {cases.length === 0 ? (
        <EmptyState icon={FolderHeartIcon} title={t("cases.empty.title")} description={q ? t("cases.empty.search") : t("cases.empty.create")} />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-[13px]">
            <thead className="border-b bg-muted/40 text-left text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5">{t("cases.col.patient")}</th>
                <th className="px-3 py-2.5">{t("cases.col.diagnosis")}</th>
                <th className="px-3 py-2.5">{t("cases.col.status")}</th>
                <th className="px-3 py-2.5">{t("cases.col.careTeam")}</th>
                <th className="px-3 py-2.5">{t("cases.col.activity")}</th>
                <th className="px-4 py-2.5 text-right">{t("cases.col.updated")}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {cases.map((room) => (
                <tr key={room.id} className="group hover:bg-accent/40">
                  <td className="px-4 py-3">
                    <Link href={`/cases/${room.id}`} className="block">
                      <div className="font-semibold group-hover:text-primary">
                        {fmt.patientName(room.patient)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("patient.ageSexMrn", {
                          age: ageFromDob(room.patient.dateOfBirth),
                          sex: t(`enum.sex.${room.patient.sex}`),
                          mrn: room.patient.syntheticMedicalRecordNumber,
                        })}
                      </div>
                    </Link>
                  </td>
                  <td className="max-w-sm px-3 py-3">
                    <div className="truncate font-medium">{room.patient.primaryDiagnosis}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {room.title} · {t(`enum.specialty.${room.specialty}`)}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <CaseStatusBadge status={room.status} />
                  </td>
                  <td className="px-3 py-3">
                    <AvatarStack users={room.members.map((m) => m.user)} max={4} size="sm" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1" title={t("cases.documents")}>
                        <FileTextIcon className="size-3.5" />
                        {room._count.documents}
                      </span>
                      <span className="inline-flex items-center gap-1" title={t("cases.openTasks")}>
                        <CheckSquareIcon className="size-3.5" />
                        {room._count.tasks}
                      </span>
                      <span className={cn("inline-flex items-center gap-1", room._count.decisions > 0 && "font-medium text-amber-700")} title={t("cases.decisionsAwaiting")}>
                        <ScaleIcon className="size-3.5" />
                        {room._count.decisions}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                    <TimeAgo date={room.updatedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageContainer>
  );
}
