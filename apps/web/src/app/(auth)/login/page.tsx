import { prisma } from "@ccr/database";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isLocale, LOCALE_NAMES } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { safePath } from "@/lib/safe-path";
import { getSessionUser } from "@/server/auth/session";
import { LoginForm, type DemoTeam } from "./login-form";

/** Synthetic demo organizations whose clinicians the sign-in page offers (one email domain each). */
const DEMO_TEAMS = [
  { emailDomain: "@riverside.demo", organization: "Riverside" },
  { emailDomain: "@benhvien.demo", organization: "Bệnh viện Đa khoa Sông Xanh" },
];

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("login.title") };
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  if (await getSessionUser()) redirect(safePath(callbackUrl));

  const { locale } = await getI18n();
  // Demo accounts are listed only for the synthetic demo organizations (not, e.g., Dr. Nguyen's Lakeside membership).
  const accounts =
    process.env.DEMO_LOGIN === "false"
      ? []
      : await prisma.user.findMany({
          where: { OR: DEMO_TEAMS.map((team) => ({ email: { endsWith: team.emailDomain }, organization: { name: { startsWith: team.organization } } })) },
          select: { id: true, name: true, email: true, title: true, role: true, organization: { select: { id: true, name: true, locale: true } } },
          orderBy: { createdAt: "asc" },
        });
  const teams = new Map<string, DemoTeam>();
  for (const { organization, ...account } of accounts) {
    const team = teams.get(organization.id) ?? { id: organization.id, name: organization.name, language: isLocale(organization.locale) ? LOCALE_NAMES[organization.locale] : organization.locale, accounts: [] };
    team.accounts.push(account);
    teams.set(organization.id, team);
  }
  // The hospital working in the visitor's language first.
  const demoTeams = [...teams.values()].sort((a, b) => Number(b.language === LOCALE_NAMES[locale]) - Number(a.language === LOCALE_NAMES[locale]));

  return <LoginForm callbackUrl={safePath(callbackUrl)} demoTeams={demoTeams} />;
}
