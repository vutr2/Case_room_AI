import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ccr/ui/components/card";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SwitchOrganizationButton } from "@/components/layout/organization-switcher";
import { PageContainer } from "@/components/layout/page-header";
import { getI18n } from "@/i18n/server";
import { safePath } from "@/lib/safe-path";
import { requireUser } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("switchOrg.title") };
}

/** Shown when a link points to another organization of the signed-in person. */
export default async function SwitchOrganizationPage({ searchParams }: { searchParams: Promise<{ organization?: string; next?: string }> }) {
  const user = await requireUser();
  const { organization, next } = await searchParams;
  const target = user.organizations.find((o) => o.id === organization);
  if (!target) notFound();
  const { t, locale } = await getI18n();
  const role = t(`enum.role.${target.role}`);

  return (
    <PageContainer>
      <Card className="mx-auto mt-16 max-w-md">
        <CardHeader>
          <CardTitle>
            <h1>{t("switchOrg.heading", { organization: target.name })}</h1>
          </CardTitle>
          <CardDescription>
            {t("switchOrg.description", {
              organization: target.name,
              role: locale === "en" ? role.toLowerCase() : role.charAt(0).toLowerCase() + role.slice(1),
              current: user.organizationName,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SwitchOrganizationButton organizationId={target.id} next={safePath(next)} label={t("switchOrg.button", { organization: target.name })} />
        </CardContent>
      </Card>
    </PageContainer>
  );
}
