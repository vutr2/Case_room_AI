import { Toaster } from "@ccr/ui/components/sonner";
import { TooltipProvider } from "@ccr/ui/components/tooltip";
import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/i18n/client";
import { getI18n, MESSAGES } from "@/i18n/server";
import "./globals.css";

// The "vietnamese" subset carries the precomposed letters with diacritics (ă, ơ, ư, ệ, ...).
const inter = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "vietnamese"], variable: "--font-mono-face", display: "swap" });

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { default: t("app.name"), template: `%s · ${t("app.name")}` },
    description: t("app.description"),
    robots: { index: false, follow: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#f8fafc",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, organizationLocale } = await getI18n();
  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable}`}>
      <body className="min-h-dvh font-sans text-sm">
        <I18nProvider locale={locale} organizationLocale={organizationLocale} messages={MESSAGES[locale]}>
          <TooltipProvider>
            {children}
            <Toaster />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
