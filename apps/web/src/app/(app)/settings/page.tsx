import { Badge } from "@ccr/ui/components/badge";
import { Button } from "@ccr/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ccr/ui/components/card";
import { resolveAIConfig } from "@ccr/ai";
import { prisma } from "@ccr/database";
import { BrainCircuitIcon, DatabaseIcon, FileLockIcon, ScrollTextIcon, ShieldCheckIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PublicDemoNotice } from "@/components/layout/public-demo-notice";
import { LOCALE_NAMES } from "@/i18n/config";
import type { MessageKey } from "@/i18n/messages/en";
import { rich } from "@/i18n/rich";
import { getI18n, organizationLocale } from "@/i18n/server";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { getAIProviderInfo } from "@/server/services/ai";
import { ChangePasswordForm, OrganizationLanguageSelect, ProfileForm, RenameOrganizationForm } from "./account-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.settings") };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[160px_minmax(0,1fr)] gap-3 py-2 text-[13px]">
      <div className="text-muted-foreground">{label}</div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

const GUARANTEES: readonly MessageKey[] = [
  "settings.guarantee.label",
  "settings.guarantee.approval",
  "settings.guarantee.citations",
  "settings.guarantee.scope",
  "settings.guarantee.injection",
  "settings.guarantee.audit",
];

function Code({ children }: { children: React.ReactNode }) {
  return <code className="rounded bg-muted px-1">{children}</code>;
}

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const user = await requireUser();
  const { t, fmt } = await getI18n();
  const { password } = await searchParams;
  const organization = await prisma.organization.findUniqueOrThrow({ where: { id: user.organizationId } });
  const language = organizationLocale(organization.locale);
  const ai = getAIProviderInfo();
  const config = resolveAIConfig();
  const storage = process.env.S3_BUCKET ? t("settings.s3", { bucket: process.env.S3_BUCKET }) : t("settings.localDisk");
  const isAdmin = can(user, "org.manage");

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title={t("nav.settings")} description={t("settings.description")} />
      <PublicDemoNotice />
      {password === "changed" && (
        <p role="status" className="rounded-md border border-approved-border bg-approved-soft px-3 py-2 text-[13px] text-approved">
          {t("settings.passwordChanged")}
        </p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("nav.organization")}</CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label={t("settings.name")}>{isAdmin ? <RenameOrganizationForm organizationId={organization.id} name={organization.name} /> : organization.name}</Row>
          <Row label={t("settings.language")}>
            {isAdmin ? <OrganizationLanguageSelect organizationId={organization.id} locale={language} /> : <span>{LOCALE_NAMES[language]}</span>}
            <p className="mt-1 text-xs text-muted-foreground">{t("settings.languageHint")}</p>
          </Row>
          <Row label={t("settings.created")}>{fmt.date(organization.createdAt)}</Row>
          <Row label={t("settings.data")}>
            <Badge variant="outline">{t("settings.syntheticOnly")}</Badge>
          </Row>
          {can(user, "org.audit") && (
            <Row label={t("settings.audit")}>
              <Button asChild variant="outline" size="sm">
                <Link href="/settings/audit">
                  <ScrollTextIcon />
                  {t("auditPage.orgTitle")}
                </Link>
              </Button>
            </Row>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.profile")}</CardTitle>
          <CardDescription>
            {t("settings.profileLine", { email: user.email, role: t(`enum.role.${user.role}`), organization: user.organizationName })} ·{" "}
            <span className="font-mono">@{user.handle}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm organizationId={user.organizationId} name={user.name} title={user.title} specialty={user.specialty} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings.password")}</CardTitle>
          <CardDescription>{t("settings.passwordHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuitIcon className="size-4 text-ai" /> {t("settings.aiProvider")}
          </CardTitle>
          <CardDescription>{t("settings.aiHint")}</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label={t("settings.activeProvider")}>
            <span className="font-medium">{ai.isDemo ? t("ai.demoLabel") : ai.label}</span>
            {ai.isDemo && (
              <Badge variant="draft" className="ml-2">
                {t("settings.offlineRuleBased")}
              </Badge>
            )}
          </Row>
          <Row label={t("settings.model")}>{ai.model}</Row>
          <Row label={t("settings.selection")}>
            <span className="text-muted-foreground">
              {t("settings.selectionLine", {
                provider: process.env.AI_PROVIDER || t("settings.auto"),
                anthropic: config.anthropic.apiKey ? t("settings.keySet") : t("settings.keyNotSet"),
                openai: config.openai.apiKey ? t("settings.keySet") : t("settings.keyNotSet"),
                nvidia: config.nvidia.apiKey ? t("settings.keySet") : t("settings.keyNotSet"),
              })}
            </span>
          </Row>
          <Row label={t("settings.configure")}>
            <p className="text-xs text-muted-foreground">
              {rich(t("settings.configureText"), {
                anthropicKey: <Code>ANTHROPIC_API_KEY</Code>,
                model: config.anthropic.model,
                openaiKey: <Code>OPENAI_API_KEY</Code>,
                nvidiaKey: <Code>NVIDIA_API_KEY</Code>,
                env: <Code>.env</Code>,
              })}
            </p>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="size-4 text-approved" /> {t("settings.safety")}
          </CardTitle>
          <CardDescription>{t("settings.safetyHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {GUARANTEES.map((key) => (
              <li key={key} className="flex items-start gap-2 text-[13px]">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0 text-approved" />
                {t(key)}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DatabaseIcon className="size-4 text-muted-foreground" /> {t("settings.storage")}
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y">
          <Row label={t("settings.documents")}>{storage}</Row>
          <Row label={t("auditPage.title")}>
            <span className="inline-flex items-center gap-1.5">
              <FileLockIcon className="size-3.5" /> {t("settings.auditStorage")}
            </span>
          </Row>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
