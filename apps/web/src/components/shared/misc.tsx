"use client";

import { useSyncExternalStore } from "react";
import { useI18n } from "@/i18n/client";

/**
 * Client clock as an external store. The server snapshot is null, so the
 * server render and hydration agree, and times are formatted only on the
 * client (in the viewer's timezone).
 */
function subscribeToMinute(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}
const currentMinute = () => Math.floor(Date.now() / 60_000);
const serverSnapshot = () => null;
const subscribeNever = () => () => undefined;
const onClient = () => true;

/** Relative timestamp ("5m ago"), refreshed every minute. */
export function TimeAgo({ date, className }: { date: string | Date; className?: string }) {
  const { fmt } = useI18n();
  const iso = typeof date === "string" ? date : date.toISOString();
  const minute = useSyncExternalStore(subscribeToMinute, currentMinute, serverSnapshot);
  return (
    <time dateTime={iso} title={minute === null ? undefined : fmt.dateTime(iso)} className={className} suppressHydrationWarning>
      {minute === null ? " " : fmt.relative(iso)}
    </time>
  );
}

/** Absolute local date-time. */
export function LocalDateTime({ date, className, withYear = false }: { date: string | Date; className?: string; withYear?: boolean }) {
  const { fmt } = useI18n();
  const iso = typeof date === "string" ? date : date.toISOString();
  const client = useSyncExternalStore(subscribeNever, onClient, serverSnapshot);
  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {client ? fmt.dateTime(iso, { year: withYear }) : " "}
    </time>
  );
}
