"use client";

import { Button } from "@ccr/ui/components/button";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import type { UserRole } from "@ccr/types";
import { ArrowRightIcon, KeyRoundIcon } from "lucide-react";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { LogoMark } from "@/components/layout/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useI18n } from "@/i18n/client";
import { loginAction, type FormState } from "@/server/actions/auth";

const DEMO_PASSWORD = "demo1234";

interface DemoAccount {
  id: string;
  name: string;
  email: string;
  title: string | null;
  role: UserRole;
}

export function LoginForm({ callbackUrl, demoAccounts }: { callbackUrl: string; demoAccounts: DemoAccount[] }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(loginAction, { error: null });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { t } = useI18n();

  function signInAs(account: DemoAccount) {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setSelected(account.id);
    // Submit after React has applied the new field values.
    requestAnimationFrame(() => formRef.current?.requestSubmit());
  }

  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <LogoMark className="size-9 lg:hidden" />
        <h2 className="text-2xl font-semibold tracking-tight">{t("login.heading")}</h2>
        <p className="text-[13px] text-muted-foreground">{t("login.intro")}</p>
      </div>

      <form ref={formRef} action={formAction} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="space-y-1.5">
          <Label htmlFor="email">{t("auth.email")}</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("auth.emailPlaceholder")}
          />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t("auth.password")}</Label>
            <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
              {t("login.forgot")}
            </Link>
          </div>
          <Input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {state.error && <p className="rounded-md border border-danger-border bg-danger-soft px-3 py-2 text-[13px] text-danger">{state.error}</p>}
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? <Spinner /> : <KeyRoundIcon />}
          {t("login.submit")}
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          {t("login.newOrganization")}{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            {t("login.createWorkspace")}
          </Link>
        </p>
      </form>

      {demoAccounts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            <span className="h-px flex-1 bg-border" />
            {t("login.demoTeam", { password: DEMO_PASSWORD })}
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {demoAccounts.map((account) => (
              <button
                key={account.id}
                type="button"
                disabled={pending}
                onClick={() => signInAs(account)}
                className="group flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors hover:border-primary/40 hover:bg-accent disabled:opacity-60"
              >
                <UserAvatar user={account} size="md" />
                <div className="min-w-0 flex-1 leading-tight">
                  <div className="truncate text-[13px] font-medium">{account.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{account.title ?? t(`enum.role.${account.role}`)}</div>
                </div>
                {pending && selected === account.id ? (
                  <Spinner className="size-3.5 text-muted-foreground" />
                ) : (
                  <ArrowRightIcon className="size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>
          <p className="text-[11.5px] leading-relaxed text-muted-foreground">{t("login.tip")}</p>
        </div>
      )}
    </div>
  );
}
