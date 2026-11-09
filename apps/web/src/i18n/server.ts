import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { getSessionUser } from "@/server/auth/session";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, localeFromAcceptLanguage, type Locale } from "./config";
import { translateServerMessage } from "./server-messages";
import { i18nFor, organizationLocale } from "./translator-for";

export { caseTextFor, i18nFor, MESSAGES, organizationLocale } from "./translator-for";

/**
 * Interface language of this request: the language the person picked, else
 * their organization's language, else the browser's, else English.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  const user = await getSessionUser();
  if (user && isLocale(user.organizationLocale)) return user.organizationLocale;
  return localeFromAcceptLanguage((await headers()).get("accept-language")) ?? DEFAULT_LOCALE;
});

/** Translator and formatters in the language of this request (server components, actions). */
export const getI18n = cache(async () => {
  const user = await getSessionUser();
  return i18nFor(await getLocale(), user ? organizationLocale(user.organizationLocale) : undefined);
});

/**
 * A user-facing message from the server (written in English by the services)
 * in the language of this request. Outside a request (tests, background
 * work) it stays in English.
 */
export async function localizeServerMessage(message: string): Promise<string> {
  try {
    const { t } = await getI18n();
    return translateServerMessage(message, t);
  } catch {
    return message;
  }
}

/** A form state with its error in the language of this request. */
export async function localizeFormState<T extends { error: string | null }>(state: T): Promise<T> {
  return state.error ? { ...state, error: await localizeServerMessage(state.error) } : state;
}
