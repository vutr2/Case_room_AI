"use client";

import { Button } from "@ccr/ui/components/button";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { MailCheckIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { forgotPasswordAction, type EmailFormState } from "@/server/actions/auth";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState<EmailFormState, FormData>(forgotPasswordAction, { error: null, sent: false });
  const { t } = useI18n();

  if (state.sent) {
    return (
      <div className="w-full max-w-md space-y-4" role="status">
        <MailCheckIcon className="size-8 text-approved" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("signup.checkEmail")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("forgot.sent")}</p>
        <Link href="/login" className="text-[13px] font-medium text-primary hover:underline">
          {t("auth.backToSignIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t("forgot.title")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("forgot.intro")}</p>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" placeholder={t("auth.emailPlaceholder")} />
        </div>
        {state.error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{state.error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : <MailIcon />}
          {t("forgot.submit")}
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.backToSignIn")}
          </Link>
        </p>
      </form>
    </div>
  );
}
