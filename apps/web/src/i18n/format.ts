import { daysFromToday, patientName, toDate, type DateInput } from "@/lib/format";
import { FAMILY_NAME_FIRST, INTL_LOCALE, type Locale } from "./config";
import type { Translator } from "./translate";

export type DueTone = "overdue" | "today" | "soon" | "later";

/**
 * Dates in the interface language, and patient names in the order of the
 * organization's language (family name first in Vietnamese), on server and client.
 * Clinical dates (DOB, document date, due date) are date-only values stored at
 * UTC midnight, so they are always formatted in UTC to avoid off-by-one days.
 */
export function createFormat(t: Translator, organizationLocale?: Locale) {
  const tag = INTL_LOCALE[t.locale];

  function date(value: DateInput, options: { year?: boolean } = {}): string {
    return toDate(value).toLocaleDateString(tag, {
      month: "short",
      day: "numeric",
      ...(options.year === false ? {} : { year: "numeric" }),
      timeZone: "UTC",
    });
  }

  function shortDate(value: DateInput): string {
    return date(value, { year: false });
  }

  function dateTime(value: DateInput, options: { year?: boolean } = {}): string {
    return toDate(value).toLocaleString(tag, { month: "short", day: "numeric", ...(options.year ? { year: "numeric" } : {}), hour: "numeric", minute: "2-digit" });
  }

  function time(value: DateInput): string {
    return toDate(value).toLocaleTimeString(tag, { hour: "numeric", minute: "2-digit" });
  }

  /** "just now", "5m ago", "3h ago", "2d ago", else a date. */
  function relative(value: DateInput, now: Date = new Date()): string {
    const when = toDate(value);
    const seconds = Math.round((now.getTime() - when.getTime()) / 1000);
    if (seconds < 45) return t("time.justNow");
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return t("time.minutesAgo", { count: minutes });
    const hours = Math.round(minutes / 60);
    if (hours < 24) return t("time.hoursAgo", { count: hours });
    const days = Math.round(hours / 24);
    if (days < 7) return t("time.daysAgo", { count: days });
    return date(when, { year: when.getFullYear() !== now.getFullYear() });
  }

  function due(value: DateInput | null | undefined): { text: string; tone: DueTone } | null {
    if (!value) return null;
    const days = daysFromToday(value);
    if (days < 0) return { text: t("due.overdue", { count: Math.abs(days) }), tone: "overdue" };
    if (days === 0) return { text: t("due.today"), tone: "today" };
    if (days === 1) return { text: t("due.tomorrow"), tone: "soon" };
    if (days <= 7) return { text: t("due.inDays", { count: days }), tone: "soon" };
    return { text: t("due.on", { date: shortDate(value) }), tone: "later" };
  }

  function patient(value: { firstName: string; lastName: string }): string {
    return patientName(value, FAMILY_NAME_FIRST[organizationLocale ?? t.locale]);
  }

  return { date, shortDate, dateTime, time, relative, due, patientName: patient };
}

export type Format = ReturnType<typeof createFormat>;
