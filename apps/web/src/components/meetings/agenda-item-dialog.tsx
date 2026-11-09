"use client";

import { Button } from "@ccr/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { NativeSelect } from "@ccr/ui/components/native-select";
import { Textarea } from "@ccr/ui/components/textarea";
import { PencilIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import { addAgendaItemAction, updateAgendaItemAction } from "@/server/actions/meetings";

export interface AgendaCaseOption {
  id: string;
  label: string;
  /** Active members of the case's care team: who can present it. */
  members: Array<{ id: string; name: string }>;
}

export interface AgendaItemValues {
  id: string;
  caseRoomId: string;
  label: string;
  presenterId: string | null;
  question: string;
  members: Array<{ id: string; name: string }>;
}

/** Add a case to the agenda (`cases` to choose from), or edit an item (`item`). */
export function AgendaItemDialog({ meetingId, cases, item }: { meetingId: string; cases?: AgendaCaseOption[]; item?: AgendaItemValues }) {
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [caseId, setCaseId] = useState(item?.caseRoomId ?? "");
  const [presenterId, setPresenterId] = useState(item?.presenterId ?? "");
  const [question, setQuestion] = useState(item?.question ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const members = item?.members ?? cases?.find((c) => c.id === caseId)?.members ?? [];

  function submit() {
    setError(null);
    if (!item && !caseId) {
      setError(t("meetings.agenda.chooseCase"));
      return;
    }
    startTransition(async () => {
      const result = item
        ? await updateAgendaItemAction(meetingId, item.id, { presenterId: presenterId || null, question })
        : await addAgendaItemAction(meetingId, { caseRoomId: caseId, presenterId: presenterId || null, question });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(item ? t("meetings.agenda.saved") : t("meetings.agenda.added"));
      setOpen(false);
      if (!item) {
        setCaseId("");
        setPresenterId("");
        setQuestion("");
      }
      router.refresh();
    });
  }

  return (
    <>
      {item ? (
        <Button variant="ghost" size="icon-sm" aria-label={t("meetings.agenda.edit")} onClick={() => setOpen(true)}>
          <PencilIcon />
        </Button>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <PlusIcon />
          {t("meetings.agenda.add")}
        </Button>
      )}
      <Dialog open={open} onOpenChange={(value) => (pending ? undefined : setOpen(value))}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{item ? t("meetings.agenda.editTitle", { name: item.label }) : t("meetings.agenda.addTitle")}</DialogTitle>
            <DialogDescription>{t("meetings.agenda.dialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!item && (
              <div className="space-y-1.5">
                <Label htmlFor="agenda-case">{t("meetings.agenda.case")}</Label>
                {cases && cases.length > 0 ? (
                  <NativeSelect
                    id="agenda-case"
                    value={caseId}
                    onChange={(e) => {
                      setCaseId(e.target.value);
                      setPresenterId("");
                    }}
                  >
                    <option value="">{t("meetings.agenda.chooseCase")}</option>
                    {cases.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </NativeSelect>
                ) : (
                  <p className="text-[13px] text-muted-foreground">{t("meetings.agenda.noCases")}</p>
                )}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="agenda-presenter">{t("meetings.agenda.presenter")}</Label>
              <NativeSelect id="agenda-presenter" value={presenterId} onChange={(e) => setPresenterId(e.target.value)} disabled={!item && !caseId}>
                <option value="">{t("meetings.form.notSet")}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="agenda-question">{t("meetings.agenda.question")}</Label>
              <Textarea
                id="agenda-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={t("meetings.agenda.questionPlaceholder")}
                className="min-h-20"
              />
            </div>
            {error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={pending}>
              {pending && <Spinner />}
              {item ? t("meetings.form.save") : t("meetings.agenda.addSubmit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
