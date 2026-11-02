import { cn } from "@ccr/ui/lib/utils";
import { TIMELINE_EVENT_TYPES, type TimelineEventType } from "@ccr/types";
import { CalendarClockIcon, FileTextIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { AIGeneratedBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { TimelineActions } from "@/components/timeline/timeline-actions";
import { TimelineEventIcon } from "@/components/timeline/event-icon";
import { INTL_LOCALE } from "@/i18n/config";
import { getI18n } from "@/i18n/server";
import { shortName } from "@/lib/activity";
import { loadCasePage } from "@/server/case-page";
import { listTimeline } from "@/server/services/timeline";

export default async function TimelinePage({
  params,
  searchParams,
}: {
  params: Promise<{ caseId: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { user, caseId } = await loadCasePage(params);
  const { type } = await searchParams;
  const { t, locale } = await getI18n();
  const tag = INTL_LOCALE[locale];
  const all = await listTimeline(user, caseId);
  const filter = TIMELINE_EVENT_TYPES.includes(type as TimelineEventType) ? (type as TimelineEventType) : null;
  const events = filter ? all.filter((event) => event.eventType === filter) : all;
  const presentTypes = TIMELINE_EVENT_TYPES.filter((eventType) => all.some((event) => event.eventType === eventType));

  const groups = new Map<string, typeof events>();
  for (const event of events) {
    const key = event.date.toLocaleDateString(tag, { month: "long", year: "numeric", timeZone: "UTC" });
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-6 py-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{t("timeline.title")}</h2>
          <p className="text-[13px] text-muted-foreground">{t("timeline.intro")}</p>
        </div>
        <TimelineActions caseId={caseId} />
      </div>

      {presentTypes.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={`/cases/${caseId}/timeline`}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", !filter ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground")}
          >
            {t("cases.all", { count: all.length })}
          </Link>
          {presentTypes.map((eventType) => (
            <Link
              key={eventType}
              href={`/cases/${caseId}/timeline?type=${eventType}`}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs font-medium",
                filter === eventType ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`enum.timelineType.${eventType}`)}
            </Link>
          ))}
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState icon={CalendarClockIcon} title={t("timeline.empty.title")} description={t("timeline.empty.text")} />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([month, monthEvents]) => (
            <section key={month}>
              <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{month}</h3>
              <ol className="relative space-y-3">
                <span aria-hidden className="absolute top-2 bottom-2 left-[89px] w-px bg-border" />
                {monthEvents.map((event) => (
                  <li key={event.id} id={`event-${event.id}`} className="relative flex scroll-mt-24 gap-4">
                    <div className="w-[70px] shrink-0 pt-1.5 text-right">
                      <div className="text-[13px] font-semibold tabular-nums">
                        {event.date.toLocaleDateString(tag, { month: "short", day: "numeric", timeZone: "UTC" })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {event.date.toLocaleDateString(tag, { weekday: "short", timeZone: "UTC" })}
                      </div>
                    </div>
                    <TimelineEventIcon type={event.eventType} className="relative z-10 mt-0.5 ring-4 ring-background" />
                    <div className="min-w-0 flex-1 rounded-xl border bg-card px-4 py-3 target:ring-2 target:ring-primary/40">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="text-[13.5px] font-semibold leading-snug">{event.title}</div>
                        <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t(`enum.timelineType.${event.eventType}`)}</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-foreground/85">{event.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        {event.sourceDocument && (
                          <Link
                            href={`/cases/${caseId}/documents?doc=${event.sourceDocument.id}`}
                            className="inline-flex items-center gap-1.5 rounded-md border border-source-border bg-source-soft px-2 py-0.5 text-xs font-medium text-source hover:underline"
                          >
                            <FileTextIcon className="size-3.5" />
                            {event.sourceDocument.title}
                          </Link>
                        )}
                        {event.createdByAI ? (
                          <AIGeneratedBadge />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                            <UserIcon className="size-3" />
                            {t("timeline.addedBy", { name: event.createdBy ? shortName(event.createdBy.name) : t("timeline.theCareTeam") })}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
