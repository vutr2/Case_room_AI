"use client";

import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { useI18n } from "@/i18n/client";

/** "Choose a password" and "Repeat it" fields; the server checks that both match. */
export function NewPasswordFields({ name = "password", label }: { name?: string; label?: string }) {
  const { t } = useI18n();
  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor={name}>{label ?? t("password.choose")}</Label>
        <Input id={name} name={name} type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
        <p className="text-xs text-muted-foreground">{t("password.hint")}</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">{t("password.repeat")}</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} maxLength={200} autoComplete="new-password" />
      </div>
    </>
  );
}
