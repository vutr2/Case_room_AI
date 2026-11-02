"use client";

import { Button } from "@ccr/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { NativeSelect } from "@ccr/ui/components/native-select";
import { Textarea } from "@ccr/ui/components/textarea";
import { cn } from "@ccr/ui/lib/utils";
import { DOCUMENT_TYPES, type DocumentType } from "@ccr/types";
import { ClipboardPasteIcon, FileUpIcon, SparklesIcon, UploadCloudIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";

function guessType(name: string): DocumentType {
  const lower = name.toLowerCase();
  // English and Vietnamese file names ("giai phau benh", "sieu am", ... without diacritics too).
  if (/path|biops|histo|giải phẫu|giai phau|sinh thiết|sinh thiet|mô bệnh|mo benh/.test(lower)) return "PATHOLOGY_REPORT";
  if (/\bct\b|mri|pet|x-?ray|ultrasound|radiol|imaging|echo|siêu âm|sieu am|x-?quang|chụp|chup|chẩn đoán hình ảnh|cdha/.test(lower)) return "IMAGING_REPORT";
  if (/lab|cbc|panel|culture|xét nghiệm|xet nghiem|công thức máu|sinh hóa|sinh hoa/.test(lower)) return "LAB_RESULT";
  if (/discharge|xuất viện|xuat vien|ra viện|ra vien/.test(lower)) return "DISCHARGE_SUMMARY";
  return "CLINICAL_NOTE";
}

export function UploadDocumentDialog({ caseId, open, onOpenChange }: { caseId: string; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [type, setType] = useState<DocumentType>("CLINICAL_NOTE");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const { t, locale } = useI18n();

  function reset() {
    setFile(null);
    setTitle("");
    setText("");
    setError(null);
    setType("CLINICAL_NOTE");
  }

  function pickFile(selected: File | null) {
    setFile(selected);
    if (selected) {
      if (!title) setTitle(selected.name.replace(/\.[a-z0-9]+$/i, "").replace(/[_-]+/g, " "));
      setType(guessType(selected.name));
    }
  }

  function submit() {
    setError(null);
    const form = new FormData();
    form.set("title", title);
    form.set("type", type);
    form.set("documentDate", date);
    if (mode === "file") {
      if (!file) return setError(t("upload.chooseFile"));
      form.set("file", file);
    } else {
      form.set("text", text);
    }
    startTransition(async () => {
      const response = await fetch(`/api/cases/${caseId}/documents`, { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { error?: string; characters?: number };
      if (!response.ok) {
        setError(body.error ?? t("upload.failed"));
        return;
      }
      toast.success(t("upload.added"), {
        description: t("upload.addedDescription", { count: (body.characters ?? 0).toLocaleString(locale === "vi" ? "vi-VN" : "en-US") }),
      });
      reset();
      onOpenChange(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (pending ? undefined : onOpenChange(value))}>
      <DialogContent closeLabel={t("common.close")} className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("upload.title")}</DialogTitle>
          <DialogDescription>{t("upload.description")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          {(
            [
              ["file", t("upload.modeFile"), FileUpIcon],
              ["paste", t("upload.modePaste"), ClipboardPasteIcon],
            ] as const
          ).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key)}
              className={cn(
                "flex cursor-pointer items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-medium transition-colors",
                mode === key ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>

        {mode === "file" ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              pickFile(event.dataTransfer.files[0] ?? null);
            }}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-accent/40"
          >
            <UploadCloudIcon className="size-7 text-muted-foreground" />
            {file ? (
              <div>
                <div className="text-[13px] font-medium">{file.name}</div>
                <div className="text-xs text-muted-foreground">{t("upload.fileMeta", { size: (file.size / 1024).toFixed(0) })}</div>
              </div>
            ) : (
              <div>
                <div className="text-[13px] font-medium">{t("upload.drop")}</div>
                <div className="text-xs text-muted-foreground">{t("upload.limit")}</div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.txt,.md,application/pdf,text/plain"
              className="hidden"
              onChange={(event) => pickFile(event.target.files?.[0] ?? null)}
            />
          </button>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="doc-text">{t("upload.reportText")}</Label>
            <Textarea
              id="doc-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t("upload.textPlaceholder")}
              className="min-h-44 font-mono text-[12.5px]"
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_180px_150px]">
          <div className="space-y-1.5">
            <Label htmlFor="doc-title">{t("upload.docTitle")}</Label>
            <Input id="doc-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t("upload.titlePlaceholder")} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-type">{t("upload.type")}</Label>
            <NativeSelect id="doc-type" value={type} onChange={(event) => setType(event.target.value as DocumentType)}>
              {DOCUMENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.documentType.${value}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="doc-date">{t("upload.date")}</Label>
            <Input id="doc-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-ai-border bg-ai-soft px-3 py-2 text-xs text-ai">
          <SparklesIcon className="mt-0.5 size-3.5 shrink-0" />
          {t("upload.aiNote")}
        </div>

        {error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
            {t("common.cancel")}
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? <Spinner /> : <FileUpIcon />}
            {t("upload.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
