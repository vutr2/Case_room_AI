"use client";

import { cn } from "@ccr/ui/lib/utils";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { setLocaleAction } from "@/server/actions/locale";

/** Switch the interface language, then re-render the page in it. */
export function useSetLocale() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const setLocale = (locale: Locale) =>
    startTransition(async () => {
      await setLocaleAction(locale);
      router.refresh();
    });
  return { setLocale, pending };
}

/** Compact EN | VI toggle (sign-in and other public pages). */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const { setLocale, pending } = useSetLocale();
  return (
    <div role="group" aria-label={t("language.label")} className={cn("inline-flex rounded-md border bg-card p-0.5 text-[11px] font-semibold", className)}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          aria-label={LOCALE_NAMES[option]}
          title={LOCALE_NAMES[option]}
          aria-pressed={option === locale}
          disabled={pending}
          onClick={() => option !== locale && setLocale(option)}
          className={cn(
            "cursor-pointer rounded px-2 py-0.5 tracking-wide transition-colors disabled:cursor-default",
            option === locale ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
