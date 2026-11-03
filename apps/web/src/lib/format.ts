/**
 * Formatting helpers that are safe on server and client. Text in the
 * interface language comes from createFormat() in @/i18n/format.
 * Clinical dates (DOB, document date, due date) are date-only values stored at
 * UTC midnight, so they are always formatted in UTC to avoid off-by-one days.
 */

export type DateInput = Date | string;

export function toDate(value: DateInput): Date {
  return typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00Z` : value) : value;
}

export function ageFromDob(dob: DateInput, now: Date = new Date()): number {
  const birth = toDate(dob);
  let age = now.getUTCFullYear() - birth.getUTCFullYear();
  if (now.getUTCMonth() < birth.getUTCMonth() || (now.getUTCMonth() === birth.getUTCMonth() && now.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/** Calendar-day difference between a date-only value and today (negative = past). */
export function daysFromToday(value: DateInput, now: Date = new Date()): number {
  const date = toDate(value);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const target = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.round((target - today) / 86_400_000);
}

/** "Maria Gonzalez"; family name first ("Nguyễn Văn Thành") where names are written that way. */
export function patientName(patient: { firstName: string; lastName: string }, familyNameFirst = false): string {
  return familyNameFirst ? `${patient.lastName} ${patient.firstName}` : `${patient.firstName} ${patient.lastName}`;
}

export function initials(name: string): string {
  // Without the title: "Dr. Elena Park" → EP, "BS. Nguyễn Văn An" → NA, "ĐD. Ngô Thị Lan" → NL.
  const parts = name.replace(/^(Dr|BS|ThS|TS|ĐD)\.?\s+/i, "").split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "")).toUpperCase() || "?";
}
