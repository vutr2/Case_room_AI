import { FileSearchIcon, ShieldCheckIcon, SparklesIcon, UsersIcon } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LogoMark } from "@/components/layout/logo";
import { getI18n } from "@/i18n/server";

const PRINCIPLES = [
  { icon: UsersIcon, key: "multiplayer" },
  { icon: SparklesIcon, key: "ai" },
  { icon: FileSearchIcon, key: "evidence" },
  { icon: ShieldCheckIcon, key: "humans" },
] as const;

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <aside className="relative hidden overflow-hidden bg-slate-950 text-slate-100 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              "radial-gradient(60rem 30rem at 10% -10%, rgba(59,130,246,0.25), transparent 60%), radial-gradient(40rem 30rem at 110% 110%, rgba(139,92,246,0.22), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <LogoMark className="size-9" />
          <div>
            <div className="text-base font-semibold tracking-tight">{t("app.name")}</div>
            <div className="text-xs text-slate-400">{t("app.tagline")}</div>
          </div>
        </div>

        <div className="relative max-w-lg space-y-8">
          <div className="space-y-3">
            <h1 className="text-3xl leading-tight font-semibold tracking-tight text-balance">{t("auth.headline")}</h1>
            <p className="text-[15px] leading-relaxed text-slate-400">{t("auth.subheadline")}</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {PRINCIPLES.map((principle) => (
              <li key={principle.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <principle.icon className="mb-2 size-4 text-sky-300" />
                <div className="text-sm font-medium">{t(`auth.principle.${principle.key}.title`)}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">{t(`auth.principle.${principle.key}.text`)}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative text-xs text-slate-500">{t("auth.footer")}</div>
      </aside>
      <main className="relative flex items-center justify-center bg-background px-6 py-12">
        <LanguageSwitcher className="absolute top-4 right-4" />
        {children}
      </main>
    </div>
  );
}
