"use client";

import { Button } from "@ccr/ui/components/button";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { MailCheckIcon, MailIcon } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useI18n } from "@/i18n/client";
import { signupAction, type EmailFormState } from "@/server/actions/auth";

export function SignupForm() {
  const [state, formAction, pending] = useActionState<EmailFormState, FormData>(signupAction, { error: null, sent: false });
  const { t } = useI18n();

  if (state.sent) {
    return (
      <div className="w-full max-w-md space-y-4" role="status">
        <MailCheckIcon className="size-8 text-approved" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("signup.checkEmail")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("signup.sent")}</p>
        <p className="text-[13px] text-muted-foreground">{t("signup.noEmail")}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{t("signup.title")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("signup.intro")}</p>
      </div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="organizationName">{t("signup.organizationName")}</Label>
          <Input id="organizationName" name="organizationName" required placeholder={t("signup.organizationPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="name">{t("signup.fullName")}</Label>
          <Input id="name" name="name" required placeholder={t("auth.namePlaceholder")} autoComplete="name" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("signup.workEmail")}</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>
        {state.error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{state.error}</p>}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? <Spinner /> : <MailIcon />}
          {t("signup.submit")}
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          {t("signup.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.signInLink")}
          </Link>
        </p>
      </form>
    </div>
  );
}
