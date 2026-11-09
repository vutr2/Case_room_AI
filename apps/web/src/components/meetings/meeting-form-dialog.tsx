"use client";

import { Button } from "@ccr/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { NativeSelect } from "@ccr/ui/components/native-select";
import { CalendarPlusIcon, PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import type { UserSummary } from "@/lib/dto";
import { createMeetingAction, updateMeetingAction } from "@/server/actions/meetings";

export interface MeetingFormValues {
  id: string;
  title: string;
  scheduledAt: string;
  durationMinutes: number | null;
  location: string | null;
  chairId: string | null;
  secretaryId: string | null;
}

const DURATIONS = [30, 45, 60, 90, 120];

/** "YYYY-MM-DDTHH:mm" in the browser's time zone, for a datetime-local input. */
function toLocalInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function nextMorning(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(7, 30, 0, 0);
  return date;
}

/** Schedule a tumor board meeting, or edit one (`meeting` given). */
export function MeetingFormDialog({ organizationId, members, meeting }: { organizationId: string; members: UserSummary[]; meeting?: MeetingFormValues }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(meeting?.title ?? "");
  const [scheduledAt, setScheduledAt] = useState(() => toLocalInput(meeting ? new Date(meeting.scheduledAt) : nextMorning()));
  const [duration, setDuration] = useState(String(meeting?.durationMinutes ?? 60));
  const [location, setLocation] = useState(meeting?.location ?? "");
  const [chairId, setChairId] = useState(meeting?.chairId ?? "");
  const [secretaryId, setSecretaryId] = useState(meeting?.secretaryId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const when = new Date(scheduledAt);
    if (Number.isNaN(when.getTime())) {
      setError(t("meetings.form.chooseTime"));
      return;
    }
    const input = {
      title,
      scheduledAt: when.toISOString(),
      durationMinutes: duration ? Number(duration) : null,
      location: location || null,
      chairId: chairId || null,
      secretaryId: secretaryId || null,
    };
    startTransition(async () => {
      const result = meeting ? await updateMeetingAction(meeting.id, input) : await createMeetingAction(organizationId, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(meeting ? t("meetings.form.saved") : t("meetings.form.created"));
      setOpen(false);
      if (!meeting && result.data) router.push(`/meetings/${result.data.id}`);
      else router.refresh();
    });
  }

  return (
    <>
      {meeting ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <PencilIcon />
          {t("meetings.form.edit")}
        </Button>
      ) : (
        <Button onClick={() => setOpen(true)}>
          <CalendarPlusIcon />
          {t("meetings.form.new")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={(value) => (pending ? undefined : setOpen(value))}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{meeting ? t("meetings.form.editTitle") : t("meetings.form.newTitle")}</DialogTitle>
            <DialogDescription>{t("meetings.form.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-title">{t("meetings.form.title")}</Label>
              <Input id="meeting-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("meetings.form.titlePlaceholder")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px]">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-time">{t("meetings.form.time")}</Label>
                <Input id="meeting-time" type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-duration">{t("meetings.form.duration")}</Label>
                <NativeSelect id="meeting-duration" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  {DURATIONS.map((minutes) => (
                    <option key={minutes} value={minutes}>
                      {t("meetings.form.minutes", { count: minutes })}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting-location">{t("meetings.form.location")}</Label>
              <Input id="meeting-location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("meetings.form.locationPlaceholder")} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-chair">{t("meetings.chair")}</Label>
                <NativeSelect id="meeting-chair" value={chairId} onChange={(e) => setChairId(e.target.value)}>
                  <option value="">{t("meetings.form.notSet")}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="meeting-secretary">{t("meetings.secretary")}</Label>
                <NativeSelect id="meeting-secretary" value={secretaryId} onChange={(e) => setSecretaryId(e.target.value)}>
                  <option value="">{t("meetings.form.notSet")}</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </NativeSelect>
              </div>
            </div>
            {error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Spinner />}
              {meeting ? t("meetings.form.save") : t("meetings.form.create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
