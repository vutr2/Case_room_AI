"use client";

import { Button } from "@ccr/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Spinner } from "@ccr/ui/components/misc";
import type { MeetingStatus } from "@ccr/types";
import { FlagIcon, PlayIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { cancelMeetingAction, completeMeetingAction, startMeetingAction } from "@/server/actions/meetings";

type Step = "complete" | "cancel" | null;

/** Start, end or cancel a meeting. Ending and cancelling ask for confirmation. */
export function MeetingControls({ meetingId, status, pendingCount }: { meetingId: string; status: MeetingStatus; pendingCount: number }) {
  const router = useRouter();
  const { t } = useI18n();
  const [confirm, setConfirm] = useState<Step>(null);
  const [pending, startTransition] = useTransition();

  function run(action: (id: string) => ReturnType<typeof startMeetingAction>, success: string) {
    startTransition(async () => {
      const result = await action(meetingId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(success);
      setConfirm(null);
      router.refresh();
    });
  }

  if (status === "COMPLETED" || status === "CANCELLED") return null;

  return (
    <>
      {status === "SCHEDULED" && (
        <>
          <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => setConfirm("cancel")}>
            <XIcon />
            {t("meetings.cancel")}
          </Button>
          <Button size="sm" disabled={pending} onClick={() => run(startMeetingAction, t("meetings.started"))}>
            {pending ? <Spinner /> : <PlayIcon />}
            {t("meetings.start")}
          </Button>
        </>
      )}
      {status === "IN_PROGRESS" && (
        <Button size="sm" variant="approve" onClick={() => setConfirm("complete")}>
          <FlagIcon />
          {t("meetings.complete")}
        </Button>
      )}
      <Dialog open={confirm !== null} onOpenChange={(open) => !pending && !open && setConfirm(null)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{confirm === "cancel" ? t("meetings.cancelTitle") : t("meetings.completeTitle")}</DialogTitle>
            <DialogDescription>
              {confirm === "cancel"
                ? t("meetings.cancelDescription")
                : pendingCount > 0
                  ? t.plural("meetings.completeDescriptionPending", pendingCount)
                  : t("meetings.completeDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirm(null)}>
              {t("common.cancel")}
            </Button>
            {confirm === "cancel" ? (
              <Button variant="destructive" disabled={pending} onClick={() => run(cancelMeetingAction, t("meetings.cancelled"))}>
                {pending ? <Spinner /> : <XIcon />}
                {t("meetings.cancel")}
              </Button>
            ) : (
              <Button variant="approve" disabled={pending} onClick={() => run(completeMeetingAction, t("meetings.completed"))}>
                {pending ? <Spinner /> : <FlagIcon />}
                {t("meetings.complete")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
