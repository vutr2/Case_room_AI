import { INTL_LOCALE, type Locale } from "./config";
import type { MessageKey, Messages, PluralKey } from "./messages/en";

export type TranslateParams = Record<string, string | number>;

export interface Translator {
  (key: MessageKey, params?: TranslateParams): string;
  /** `${key}.one` or `${key}.other`, chosen by the language's plural rules; `{count}` is filled in. */
  plural(key: PluralKey, count: number, params?: TranslateParams): string;
  readonly locale: Locale;
}

/** Replace `{name}` placeholders; unknown placeholders are left as they are. */
export function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (Object.hasOwn(params, name) ? String(params[name]) : match));
}

/** Works on server and client: the dictionary is passed in, so client bundles carry only the active language. */
export function makeTranslator(messages: Messages, locale: Locale): Translator {
  const rules = new Intl.PluralRules(INTL_LOCALE[locale]);
  const translate = (key: MessageKey, params?: TranslateParams) => interpolate(messages[key], params);
  return Object.assign(translate, {
    plural: (key: PluralKey, count: number, params?: TranslateParams) =>
      interpolate(messages[`${key}.${rules.select(count) === "one" ? "one" : "other"}` as MessageKey], { count, ...params }),
    locale,
  });
}
