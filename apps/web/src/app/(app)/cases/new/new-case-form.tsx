"use client";

import { Button } from "@ccr/ui/components/button";
import { Checkbox } from "@ccr/ui/components/checkbox";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { NativeSelect } from "@ccr/ui/components/native-select";
import { CASE_SPECIALTIES, PATIENT_SEXES, type CaseSpecialty, type PatientSex } from "@ccr/types";
import { FlaskConicalIcon, FolderPlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useI18n } from "@/i18n/client";
import type { UserSummary } from "@/lib/dto";
import { createCaseAction } from "@/server/actions/cases";

function Section({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-6 border-b py-6 last:border-0 md:grid-cols-[220px_minmax(0,1fr)]">
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function NewCaseForm({ members, organizationId }: { members: UserSummary[]; organizationId: string }) {
  const router = useRouter();
  // The organization this form was opened in; kept even if the page re-renders under another one.
  const [formOrganizationId] = useState(organizationId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [sex, setSex] = useState<PatientSex>("FEMALE");
  const [primaryDiagnosis, setPrimaryDiagnosis] = useState("");
  const [title, setTitle] = useState("");
  const [specialty, setSpecialty] = useState<CaseSpecialty>("ONCOLOGY");
  const [team, setTeam] = useState<Set<string>>(new Set());
  const [confirmSynthetic, setConfirmSynthetic] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  function toggle(id: string) {
    setTeam((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createCaseAction({
        organizationId: formOrganizationId,
        firstName,
        lastName,
        dateOfBirth,
        sex,
        primaryDiagnosis,
        title: title || t("newCase.defaultTitle", { diagnosis: primaryDiagnosis }),
        specialty,
        memberIds: [...team],
        confirmSynthetic: confirmSynthetic as true,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(t("newCase.created"), { description: t("newCase.createdDescription") });
      router.push(`/cases/${result.data.id}/documents`);
    });
  }

  return (
    <form onSubmit={submit} className="rounded-xl border bg-card px-6">
      <Section title={t("newCase.patient.title")} description={t("newCase.patient.description")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="firstName">{t("newCase.firstName")}</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lastName">{t("newCase.lastName")}</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">{t("newCase.dob")}</Label>
            <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sex">{t("newCase.sex")}</Label>
            <NativeSelect id="sex" value={sex} onChange={(e) => setSex(e.target.value as PatientSex)}>
              {PATIENT_SEXES.map((value) => (
                <option key={value} value={value}>
                  {t(`enum.sex.${value}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="diagnosis">{t("newCase.diagnosis")}</Label>
          <Input
            id="diagnosis"
            value={primaryDiagnosis}
            onChange={(e) => setPrimaryDiagnosis(e.target.value)}
            placeholder={t("newCase.diagnosisPlaceholder")}
            required
          />
        </div>
      </Section>

      <Section title={t("newCase.room.title")} description={t("newCase.room.description")}>
        <div className="space-y-1.5">
          <Label htmlFor="title">{t("newCase.caseTitle")}</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("newCase.caseTitlePlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="specialty">{t("newCase.specialty")}</Label>
          <NativeSelect id="specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value as CaseSpecialty)}>
            {CASE_SPECIALTIES.map((value) => (
              <option key={value} value={value}>
                {t(`enum.specialty.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
      </Section>

      <Section title={t("cases.col.careTeam")} description={t("newCase.team.description")}>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {members.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg border px-2.5 py-2 hover:bg-accent has-[[data-state=checked]]:border-primary/40 has-[[data-state=checked]]:bg-primary/5">
              <Checkbox checked={team.has(member.id)} onCheckedChange={() => toggle(member.id)} />
              <UserAvatar user={member} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium">{member.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{member.specialty ?? t(`enum.role.${member.role}`)}</span>
              </span>
            </label>
          ))}
        </div>
      </Section>

      <div className="space-y-4 py-6">
        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-dashed px-3 py-3 text-[13px]">
          <Checkbox checked={confirmSynthetic} onCheckedChange={(checked) => setConfirmSynthetic(checked === true)} className="mt-0.5" />
          <span>
            <span className="flex items-center gap-1.5 font-medium">
              <FlaskConicalIcon className="size-3.5" /> {t("newCase.synthetic")}
            </span>
            <span className="text-muted-foreground">{t("newCase.syntheticConfirm")}</span>
          </span>
        </label>
        {error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={pending || !confirmSynthetic}>
            {pending ? <Spinner /> : <FolderPlusIcon />}
            {t("newCase.submit")}
          </Button>
        </div>
      </div>
    </form>
  );
}
