import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { createFormat } from "./format";
import { en, type Messages } from "./messages/en";
import { vi } from "./messages/vi";
import { makeTranslator } from "./translate";

export const MESSAGES: Record<Locale, Messages> = { en, vi };

/**
 * Translator and formatters for a given language: no request needed (services,
 * emails, AI prompts). Patient names follow the organization's language when given.
 */
export function i18nFor(locale: Locale, organization?: Locale) {
  const t = makeTranslator(MESSAGES[locale], locale);
  return { locale, organizationLocale: organization, t, fmt: createFormat(t, organization) };
}

/** The organization's language for its AI output, emails and case text; "en" when unset or unknown. */
export function organizationLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

/**
 * Text written into a case (system messages, generated timeline entries) is
 * shared by the whole care team, so it uses the organization's language, not
 * the interface language of the person who acted.
 */
export function caseTextFor(user: { organizationLocale: string }) {
  return i18nFor(organizationLocale(user.organizationLocale)).t;
}

/** A label inside a sentence: lower case in English ("pathology report"), first letter only in Vietnamese. */
export function lowerLabel(text: string): string {
  return /^[A-Z][a-z]/.test(text) && text === text.charAt(0) + text.slice(1).toLowerCase() ? text.toLowerCase() : text.charAt(0).toLowerCase() + text.slice(1);
}
