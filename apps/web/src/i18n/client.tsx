"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createFormat, type Format } from "./format";
import type { Messages } from "./messages/en";
import { makeTranslator, type Translator } from "./translate";

interface I18n {
  locale: Locale;
  t: Translator;
  fmt: Format;
}

const I18nContext = createContext<I18n | null>(null);

/** Set once in the root layout with the request's language; client components read it with useI18n(). */
export function I18nProvider({
  locale,
  organizationLocale,
  messages,
  children,
}: {
  locale: Locale;
  /** The signed-in organization's language, for the order of patient names. */
  organizationLocale?: Locale;
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(() => {
    const t = makeTranslator(messages, locale);
    return { locale, t, fmt: createFormat(t, organizationLocale) };
  }, [locale, organizationLocale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n() outside I18nProvider");
  return value;
}
