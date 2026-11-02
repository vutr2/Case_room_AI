"use client";

import { Button } from "@ccr/ui/components/button";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { useActionState, useState, useTransition } from "react";
import { NewPasswordFields } from "@/components/auth/new-password-fields";
import { useI18n } from "@/i18n/client";
import { acceptInviteAction, logoutAction, type FormState } from "@/server/actions/auth";
import { joinOrganizationAction } from "@/server/actions/organizations";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(acceptInviteAction, { error: null });
  const { t } = useI18n();
  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("invite.fullName")}</Label>
        <Input id="name" name="name" required placeholder={t("auth.namePlaceholder")} autoComplete="name" />
      </div>
      <NewPasswordFields />
      {state.error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{state.error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Spinner />}
        {t("invite.accept")}
      </Button>
    </form>
  );
}

/** The signed-in person accepts with their existing account and joins one more organization. */
export function JoinOrganizationButton({ token, organizationName }: { token: string; organizationName: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      {error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{error}</p>}
      <Button
        size="lg"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await joinOrganizationAction(token);
            if (result && !result.ok) setError(result.error);
          })
        }
      >
        {pending && <Spinner />}
        {t("invite.join", { organization: organizationName })}
      </Button>
    </div>
  );
}

/** Signed in with an account the invitation was not sent to: sign out and come back to this link. */
export function SwitchAccountButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <Button variant="outline" size="lg" className="w-full" disabled={pending} onClick={() => startTransition(() => logoutAction(`/invite/${token}`))}>
      {pending && <Spinner />}
      {t("invite.switchAccount")}
    </Button>
  );
}
