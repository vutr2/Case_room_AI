"use client";

import { Button } from "@ccr/ui/components/button";
import { Checkbox } from "@ccr/ui/components/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { Textarea } from "@ccr/ui/components/textarea";
import { DOCUMENT_TYPES, type DocumentType } from "@ccr/types";
import { ScaleIcon, ShieldCheckIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import type { DocumentOption, UserSummary } from "@/lib/dto";
import { useI18n } from "@/i18n/client";
import { createDecisionAction, reviseDecisionAction } from "@/server/actions/decisions";
import { UserAvatar } from "../../shared/user-avatar";

export interface DecisionPrefill {
  title?: string;
  description?: string;
  rationale?: string;
  sourceDocumentIds?: string[];
  reviewerIds?: string[];
  sourceMessageId?: string | null;
  /** Tumor board agenda item whose outcome the decision records; the dialog then stays on the current page. */
  agendaItemId?: string | null;
}

const CLINICAL_ROLES = new Set(["DOCTOR", "SPECIALIST"]);

export function DecisionDialog({
  mode,
  decisionId,
  revision,
  caseId,
  open,
  onOpenChange,
  prefill,
  members,
  documents,
  currentUserId,
}: {
  mode: "create" | "revise";
  decisionId?: string;
  /** Revision being edited (revise mode); the server refuses the edit if it changed meanwhile. */
  revision?: number;
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: DecisionPrefill;
  members: UserSummary[];
  documents: DocumentOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const eligible = members.filter((m) => m.id !== currentUserId && CLINICAL_ROLES.has(m.role));
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [description, setDescription] = useState(prefill?.description ?? "");
  const [rationale, setRationale] = useState(prefill?.rationale ?? "");
  const [sources, setSources] = useState<Set<string>>(new Set(prefill?.sourceDocumentIds ?? []));
  const [reviewers, setReviewers] = useState<Set<string>>(new Set(prefill?.reviewerIds ?? eligible.map((m) => m.id)));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Captured when the dialog mounts, so a refresh while editing cannot silently retarget the edit.
  const [editedRevision] = useState(revision ?? 1);
  const { t, fmt } = useI18n();

  const toggle = (set: Set<string>, update: (next: Set<string>) => void, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    update(next);
  };

  function submit() {
    setError(null);
    startTransition(async () => {
      const fields = { title, description, rationale, sourceDocumentIds: [...sources], reviewerIds: [...reviewers] };
      const result =
        mode === "create"
          ? await createDecisionAction(caseId, { ...fields, sourceMessageId: prefill?.sourceMessageId ?? null, agendaItemId: prefill?.agendaItemId ?? null })
          : await reviseDecisionAction(caseId, decisionId!, { ...fields, expectedRevision: editedRevision });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(mode === "create" ? t("decisionDialog.proposed") : t("decisionDialog.revised"));
      onOpenChange(false);
      if (mode === "create" && !prefill?.agendaItemId) router.push(`/cases/${caseId}/decisions`);
      else router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (pending ? undefined : onOpenChange(value))}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScaleIcon className="size-4 text-primary" />
            {mode === "create" ? t("decisionDialog.createTitle") : t("decisionDialog.reviseTitle")}
          </DialogTitle>
          <DialogDescription>{t("decisionDialog.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="decision-title">{t("decisionDialog.decision")}</Label>
            <Input id="decision-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("decisionDialog.decisionPlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="decision-description">{t("timeline.description")}</Label>
            <Textarea
              id="decision-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-20"
              placeholder={t("decisionDialog.descriptionPlaceholder")}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="decision-rationale">{t("decisions.rationale")}</Label>
            <Textarea
              id="decision-rationale"
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              className="min-h-20"
              placeholder={t("decisionDialog.rationalePlaceholder")}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("decisionDialog.sources")}</Label>
              <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border p-1">
                {documents.length === 0 && <p className="p-3 text-xs text-muted-foreground">{t("decisionDialog.noDocuments")}</p>}
                {documents.map((doc) => (
                  <label key={doc.id} className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                    <Checkbox className="mt-0.5" checked={sources.has(doc.id)} onCheckedChange={() => toggle(sources, setSources, doc.id)} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{doc.title}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {(DOCUMENT_TYPES as readonly string[]).includes(doc.type) ? t(`enum.documentType.${doc.type as DocumentType}`) : doc.type} · {fmt.date(doc.date)}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t("decisionDialog.reviewers")}</Label>
              <div className="max-h-52 space-y-0.5 overflow-y-auto rounded-lg border p-1">
                {eligible.length === 0 && <p className="p-3 text-xs text-muted-foreground">{t("decisionDialog.noReviewers")}</p>}
                {eligible.map((member) => (
                  <label key={member.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                    <Checkbox checked={reviewers.has(member.id)} onCheckedChange={() => toggle(reviewers, setReviewers, member.id)} />
                    <UserAvatar user={member} size="sm" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{member.name}</span>
                      <span className="block text-[11px] text-muted-foreground">{member.specialty}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg border border-approved-border bg-approved-soft px-3 py-2 text-xs text-approved">
            <ShieldCheckIcon className="mt-0.5 size-3.5 shrink-0" />
            {t.plural("decisionDialog.humanApproval", reviewers.size)}
          </div>

          {error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Spinner />}
            {mode === "create" ? t("decisionDialog.propose") : t("decisionDialog.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
