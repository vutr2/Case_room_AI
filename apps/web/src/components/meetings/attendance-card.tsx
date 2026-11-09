"use client";

import { Button } from "@ccr/ui/components/button";
import { Checkbox } from "@ccr/ui/components/checkbox";
import { Spinner } from "@ccr/ui/components/misc";
import { SaveIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { setAttendanceAction } from "@/server/actions/meetings";

interface Person {
  id: string;
  name: string;
  specialty: string | null;
}

/** Who attended (listed in the minutes). Read-only for people who cannot manage meetings. */
export function AttendanceCard({ meetingId, members, attendeeIds, editable }: { meetingId: string; members: Person[]; attendeeIds: string[]; editable: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const [selected, setSelected] = useState(() => new Set(attendeeIds));
  const [pending, startTransition] = useTransition();
  const changed = selected.size !== attendeeIds.length || attendeeIds.some((id) => !selected.has(id));

  if (!editable) {
    const present = members.filter((member) => attendeeIds.includes(member.id));
    return present.length === 0 ? (
      <p className="text-[13px] text-muted-foreground">{t("meetings.attendance.none")}</p>
    ) : (
      <ul className="space-y-1 text-[13px]">
        {present.map((member) => (
          <li key={member.id}>
            {member.name}
            {member.specialty && <span className="text-muted-foreground"> · {member.specialty}</span>}
          </li>
        ))}
      </ul>
    );
  }

  function save() {
    startTransition(async () => {
      const result = await setAttendanceAction(meetingId, [...selected]);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(t("meetings.attendance.saved"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <ul className="max-h-72 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
        {members.map((member) => (
          <li key={member.id}>
            <label className="flex cursor-pointer items-start gap-2 text-[13px]">
              <Checkbox
                className="mt-0.5"
                checked={selected.has(member.id)}
                onCheckedChange={(checked) =>
                  setSelected((previous) => {
                    const next = new Set(previous);
                    if (checked === true) next.add(member.id);
                    else next.delete(member.id);
                    return next;
                  })
                }
              />
              <span>
                {member.name}
                {member.specialty && <span className="text-muted-foreground"> · {member.specialty}</span>}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button size="sm" variant="outline" disabled={!changed || pending} onClick={save}>
        {pending ? <Spinner /> : <SaveIcon />}
        {t("meetings.attendance.save", { count: selected.size })}
      </Button>
    </div>
  );
}
