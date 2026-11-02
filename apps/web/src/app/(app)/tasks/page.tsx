import { cn } from "@ccr/ui/lib/utils";
import { CheckSquareIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { TaskRow } from "@/components/tasks/task-row";
import { getI18n } from "@/i18n/server";
import { daysFromToday } from "@/lib/format";
import { requireUser } from "@/server/auth/session";
import { can } from "@/server/authz/permissions";
import { listTasksForUser } from "@/server/services/tasks";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t("nav.tasks") };
}

const SCOPES = [
  { key: "mine", label: "dashboard.tab.mine" },
  { key: "created", label: "tasks.scope.created" },
  { key: "all", label: "tasks.scope.all" },
] as const;

export default async function TasksPage({ searchParams }: { searchParams: Promise<{ scope?: string }> }) {
  const user = await requireUser();
  const { t } = await getI18n();
  const { scope: rawScope } = await searchParams;
  const scope = SCOPES.find((s) => s.key === rawScope)?.key ?? "mine";
  const tasks = await listTasksForUser(user, scope);
  const open = tasks.filter((task) => task.status !== "DONE");
  const done = tasks.filter((task) => task.status === "DONE").slice(0, 10);

  const groups = [
    { key: "overdue", title: t("dashboard.overdue"), tone: "text-red-600", items: open.filter((task) => task.dueDate && daysFromToday(task.dueDate) < 0) },
    { key: "today", title: t("tasks.group.today"), tone: "text-amber-700", items: open.filter((task) => task.dueDate && daysFromToday(task.dueDate) === 0) },
    {
      key: "week",
      title: t("tasks.group.week"),
      tone: "text-foreground",
      items: open.filter((task) => task.dueDate && daysFromToday(task.dueDate) > 0 && daysFromToday(task.dueDate) <= 7),
    },
    { key: "later", title: t("tasks.group.later"), tone: "text-foreground", items: open.filter((task) => !task.dueDate || daysFromToday(task.dueDate) > 7) },
    { key: "done", title: t("tasks.group.done"), tone: "text-muted-foreground", items: done },
  ];
  const canManage = can(user, "task.manage");

  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title={t("nav.tasks")} description={t("tasks.description")} />
      <div className="flex gap-1.5">
        {SCOPES.map((s) => (
          <Link
            key={s.key}
            href={s.key === "mine" ? "/tasks" : `/tasks?scope=${s.key}`}
            className={cn("rounded-full border px-3 py-1 text-xs font-medium", scope === s.key ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground hover:text-foreground")}
          >
            {t(s.label)}
          </Link>
        ))}
      </div>
      {tasks.length === 0 ? (
        <EmptyState icon={CheckSquareIcon} title={t("tasks.empty.title")} description={t("tasks.empty.text")} />
      ) : (
        <div className="space-y-6">
          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <section key={group.key} className="rounded-xl border bg-card">
                <header className={cn("flex items-center gap-2 border-b px-4 py-2.5 text-[13px] font-semibold", group.tone)}>
                  {group.title}
                  <span className="rounded-full bg-muted px-1.5 text-[11px] font-medium text-muted-foreground">{group.items.length}</span>
                </header>
                <div className="p-2">
                  {group.items.map((task) => (
                    <TaskRow key={task.id} task={task} canManage={canManage} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
    </PageContainer>
  );
}
