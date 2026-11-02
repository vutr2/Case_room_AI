"use client";

import { Button } from "@ccr/ui/components/button";
import { Checkbox } from "@ccr/ui/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Input } from "@ccr/ui/components/input";
import { Spinner } from "@ccr/ui/components/misc";
import { NativeSelect } from "@ccr/ui/components/native-select";
import { TASK_PRIORITIES, type TaskPriority } from "@ccr/types";
import { SparklesIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import type { UserSummary } from "@/lib/dto";
import { createFollowUpTasksAction, suggestFollowUpTasksAction } from "@/server/actions/decisions";

interface Suggestion {
  selected: boolean;
  title: string;
  description: string;
  priority: TaskPriority;
  assigneeId: string | null;
  dueDate: string | null;
}

/** AI proposes follow-up tasks for an approved decision; a human selects and edits them before creation. */
export function FollowUpTasks({ caseId, decisionId, number, members }: { caseId: string; decisionId: string; number: number; members: UserSummary[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const { t } = useI18n();

  function suggest() {
    startLoading(async () => {
      const result = await suggestFollowUpTasksAction(decisionId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setProvider(result.data.provider);
      setSuggestions(result.data.suggestions.map((s) => ({ ...s, selected: true })));
      setOpen(true);
    });
  }

  function update(index: number, patch: Partial<Suggestion>) {
    setSuggestions((previous) => previous.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function create() {
    const tasks = suggestions.filter((s) => s.selected).map(({ title, description, priority, assigneeId, dueDate }) => ({ title, description, priority, assigneeId, dueDate }));
    startSaving(async () => {
      const result = await createFollowUpTasksAction(caseId, decisionId, { tasks });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.plural("followUp.created", tasks.length), { description: t("followUp.createdDescription") });
      setOpen(false);
      router.refresh();
    });
  }

  const selectedCount = suggestions.filter((s) => s.selected).length;
  return (
    <>
      <Button variant="ai-outline" size="sm" onClick={suggest} disabled={loading}>
        {loading ? <Spinner /> : <SparklesIcon />}
        {t("followUp.suggest")}
      </Button>
      <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
        <DialogContent closeLabel={t("common.close")} className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-ai" />
              {t("followUp.title", { number })}
            </DialogTitle>
            <DialogDescription>{t("followUp.description", { provider })}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[55vh] space-y-2 overflow-y-auto">
            {suggestions.length === 0 && <p className="py-6 text-center text-[13px] text-muted-foreground">{t("followUp.none")}</p>}
            {suggestions.map((suggestion, index) => (
              <div key={index} className="flex gap-3 rounded-lg border p-3 data-[off=true]:opacity-50" data-off={!suggestion.selected}>
                <Checkbox className="mt-2" checked={suggestion.selected} onCheckedChange={(checked) => update(index, { selected: checked === true })} />
                <div className="min-w-0 flex-1 space-y-2">
                  <Input value={suggestion.title} onChange={(e) => update(index, { title: e.target.value })} className="h-8 font-medium" />
                  <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    <NativeSelect value={suggestion.assigneeId ?? ""} onChange={(e) => update(index, { assigneeId: e.target.value || null })} className="h-8 text-xs">
                      <option value="">{t("followUp.unassigned")}</option>
                      {members.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </NativeSelect>
                    <NativeSelect value={suggestion.priority} onChange={(e) => update(index, { priority: e.target.value as TaskPriority })} className="h-8 text-xs">
                      {TASK_PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {t("followUp.priority", { priority: t(`enum.taskPriority.${p}`) })}
                        </option>
                      ))}
                    </NativeSelect>
                    <Input type="date" value={suggestion.dueDate ?? ""} onChange={(e) => update(index, { dueDate: e.target.value || null })} className="h-8 text-xs" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t("common.cancel")}
            </Button>
            <Button onClick={create} disabled={saving || selectedCount === 0}>
              {saving && <Spinner />}
              {t.plural("followUp.create", selectedCount)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
