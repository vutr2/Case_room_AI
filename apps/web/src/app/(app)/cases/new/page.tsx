import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { getI18n } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listOrganizationMembers } from "@/server/services/cases";
import { NewCaseForm } from "./new-case-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("newCase.title") };
}

export default async function NewCasePage() {
  const user = await requireUser();
  if (!can(user, "case.create")) redirect("/cases");
  const members = await listOrganizationMembers(user);
  const { t } = await getI18n();
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title={t("newCase.title")} description={t("newCase.description")} />
      <NewCaseForm members={members.filter((m) => m.id !== user.id)} organizationId={user.organizationId} />
    </PageContainer>
  );
}
