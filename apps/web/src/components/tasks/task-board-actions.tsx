"use client";

import { Button } from "@ccr/ui/components/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@ccr/ui/components/dropdown-menu";
import { TASK_STATUSES, type TaskStatus } from "@ccr/types";
import { ArrowRightIcon, ListPlusIcon, MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { updateTaskStatusAction } from "@/server/actions/tasks";
import { useCaseActions } from "../case/case-actions";

export function NewTaskButton() {
  const { openCreateTask, permissions } = useCaseActions();
  const { t } = useI18n();
  if (!permissions.manageTasks) return null;
  return (
    <Button size="sm" onClick={() => openCreateTask()}>
      <ListPlusIcon />
      {t("tasks.add")}
    </Button>
  );
}

export function MoveTaskMenu({ taskId, status }: { taskId: string; status: TaskStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" disabled={pending} aria-label={t("tasks.move")}>
          <MoreHorizontalIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>{t("tasks.moveTo")}</DropdownMenuLabel>
        {TASK_STATUSES.filter((s) => s !== status).map((next) => (
          <DropdownMenuItem
            key={next}
            onSelect={() =>
              startTransition(async () => {
                const result = await updateTaskStatusAction(taskId, next);
                if (!result.ok) toast.error(result.error);
                else {
                  toast.success(t("tasks.movedTo", { status: t(`enum.taskStatus.${next}`) }));
                  router.refresh();
                }
              })
            }
          >
            <ArrowRightIcon />
            {t(`enum.taskStatus.${next}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
