import { Button } from "@ccr/ui/components/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@ccr/ui/components/card";
import { AlarmClockIcon, CheckSquareIcon, FolderHeartIcon, PlusIcon, PresentationIcon, ScaleIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { CaseCard } from "@/components/cases/case-card";
import { TaskTabs } from "@/components/dashboard/task-tabs";
import { PageContainer } from "@/components/layout/page-header";
import { DecisionStatusBadge } from "@/components/shared/badges";
import { EmptyState } from "@/components/shared/empty-state";
import { LocalDateTime, TimeAgo } from "@/components/shared/misc";
import { TaskRow } from "@/components/tasks/task-row";
import { INTL_LOCALE } from "@/i18n/config";
import { rich } from "@/i18n/rich";
import { getI18n } from "@/i18n/server";
import { shortName } from "@/lib/activity";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { getDashboard } from "@/server/services/dashboard";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.dashboard") };
}

function greetingKey() {
  const hour = new Date().getHours();
  return hour < 12 ? "dashboard.greeting.morning" : hour < 18 ? "dashboard.greeting.afternoon" : "dashboard.greeting.evening";
}

export default async function DashboardPage() {
  const user = await requireUser();
  const data = await getDashboard(user);
  const canCreate = can(user, "case.create");
  const { t, fmt, locale } = await getI18n();

  const stats = [
    { label: t("dashboard.activeCases"), value: data.stats.activeCases, icon: FolderHeartIcon, tone: "text-primary bg-primary/10" },
    { label: t("dashboard.awaitingApproval"), value: data.stats.pendingApprovals, icon: ScaleIcon, tone: "text-amber-700 bg-amber-50" },
    { label: t("dashboard.openTasks"), value: data.stats.openTasks, icon: CheckSquareIcon, tone: "text-emerald-700 bg-emerald-50" },
    {
      label: t("dashboard.overdue"),
      value: data.stats.overdueTasks,
      icon: AlarmClockIcon,
      tone: data.stats.overdueTasks ? "text-red-700 bg-red-50" : "text-muted-foreground bg-muted",
    },
  ];

  const taskList = (tasks: typeof data.tasks.open) => (
    <div className="space-y-0.5">
      {tasks.slice(0, 8).map((task) => (
        <TaskRow key={task.id} task={task} canManage={can(user, "task.manage")} />
      ))}
    </div>
  );

  return (
    <PageContainer>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[13px] text-muted-foreground">
            {new Date().toLocaleDateString(INTL_LOCALE[locale], { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("dashboard.greetingName", { greeting: t(greetingKey()), name: shortName(user.name) })}</h1>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/cases/new">
              <PlusIcon />
              {t("dashboard.newCase")}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5">
            <div className={`flex size-9 items-center justify-center rounded-lg ${stat.tone}`}>
              <stat.icon className="size-4.5" />
            </div>
            <div>
              <div className="text-xl leading-none font-semibold tabular-nums">{stat.value}</div>
              <div className="mt-1 text-xs text-muted-foreground">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("dashboard.activeCases")}</h2>
              <Link href="/cases" className="text-[13px] font-medium text-primary hover:underline">
                {t("dashboard.viewAll")}
              </Link>
            </div>
            {data.activeCases.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {data.activeCases.slice(0, 6).map((room) => (
                  <CaseCard key={room.id} room={room} />
                ))}
              </div>
            ) : (
              <EmptyState icon={FolderHeartIcon} title={t("dashboard.noActive.title")} description={t("dashboard.noActive.text")} />
            )}
          </section>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.pending.title")}</CardTitle>
              <CardDescription>{t("dashboard.pending.description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.pendingApprovals.length === 0 && (
                <div className="rounded-lg border border-dashed px-4 py-6 text-center text-[13px] text-muted-foreground">{t("dashboard.pending.none")}</div>
              )}
              {data.pendingApprovals.map(({ decision }) => {
                const approved = decision.approvals.filter((a) => a.status === "APPROVED").length;
                return (
                  <div key={decision.id} className="flex flex-wrap items-center gap-3 rounded-lg border px-3.5 py-3">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                      <ScaleIcon className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold">{t("decision.number", { number: decision.number })}</span>
                        <DecisionStatusBadge status={decision.status} />
                      </div>
                      <div className="truncate text-[13px] text-foreground/90">{decision.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {rich(
                          t("dashboard.pending.meta", {
                            patient: fmt.patientName(decision.caseRoom.patient),
                            name: shortName(decision.createdBy.name),
                            approvals: t("dashboard.pending.approvals", { approved, total: decision.approvals.length }),
                          }),
                          { time: <TimeAgo date={decision.createdAt} /> },
                        )}
                      </div>
                    </div>
                    <Button size="sm" asChild>
                      <Link href={`/cases/${decision.caseRoom.id}/decisions#decision-${decision.id}`}>{t("dashboard.review")}</Link>
                    </Button>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {data.nextMeeting && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                  <PresentationIcon className="size-4 text-primary" />
                  {t("dashboard.nextMeeting")}
                </CardTitle>
                <CardAction>
                  <Link href="/meetings" className="text-[13px] font-medium text-primary hover:underline">
                    {t("dashboard.allMeetings")}
                  </Link>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href={`/meetings/${data.nextMeeting.id}`} className="block space-y-0.5 hover:underline">
                  <div className="text-[14px] font-semibold">{data.nextMeeting.title}</div>
                  <div className="text-[13px] text-muted-foreground">
                    <LocalDateTime date={data.nextMeeting.scheduledAt} />
                    {data.nextMeeting.location ? ` · ${data.nextMeeting.location}` : ""}
                  </div>
                </Link>
                <ul className="space-y-1 text-[13px]">
                  {data.nextMeeting.agendaItems.map((item) => (
                    <li key={item.id}>
                      <Link href={`/cases/${item.caseRoom.id}`} className="hover:underline">
                        {fmt.patientName(item.caseRoom.patient)}
                      </Link>
                      <span className="text-muted-foreground"> · {item.caseRoom.title}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle>{t("nav.tasks")}</CardTitle>
              <CardAction>
                <Link href="/tasks" className="text-[13px] font-medium text-primary hover:underline">
                  {t("dashboard.allTasks")}
                </Link>
              </CardAction>
            </CardHeader>
            <TaskTabs
              tabs={[
                { key: "mine", label: t("dashboard.tab.mine"), count: data.tasks.open.length, content: taskList(data.tasks.open) },
                { key: "overdue", label: t("dashboard.overdue"), count: data.tasks.overdue.length, tone: "danger", content: taskList(data.tasks.overdue) },
                { key: "upcoming", label: t("dashboard.tab.upcoming"), count: data.tasks.upcoming.length, content: taskList(data.tasks.upcoming) },
              ]}
            />
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("dashboard.recent")}</CardTitle>
              <CardDescription>{t("dashboard.recentDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivityFeed items={data.activity} compact />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
