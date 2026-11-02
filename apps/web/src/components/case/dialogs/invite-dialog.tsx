"use client";

import { Button } from "@ccr/ui/components/button";
import { Checkbox } from "@ccr/ui/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Spinner } from "@ccr/ui/components/misc";
import { UserPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import type { UserSummary } from "@/lib/dto";
import { addCaseMembersAction } from "@/server/actions/cases";
import { UserAvatar } from "../../shared/user-avatar";

export function InviteDialog({
  caseId,
  open,
  onOpenChange,
  candidates,
}: {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: UserSummary[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      const result = await addCaseMembersAction(caseId, [...selected]);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t.plural("inviteDialog.added", result.data.added));
      setSelected(new Set());
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent closeLabel={t("common.close")}>
        <DialogHeader>
          <DialogTitle>{t("inviteDialog.title")}</DialogTitle>
          <DialogDescription>{t("inviteDialog.description")}</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-1 overflow-y-auto">
          {candidates.length === 0 && <p className="py-6 text-center text-[13px] text-muted-foreground">{t("inviteDialog.everyone")}</p>}
          {candidates.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-accent">
              <Checkbox checked={selected.has(member.id)} onCheckedChange={() => toggle(member.id)} />
              <UserAvatar user={member} size="md" />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{member.name}</div>
                <div className="text-xs text-muted-foreground">{member.specialty ?? member.title ?? t(`enum.role.${member.role}`)}</div>
              </div>
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending || selected.size === 0}>
            {pending ? <Spinner /> : <UserPlusIcon />}
            {t("inviteDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
