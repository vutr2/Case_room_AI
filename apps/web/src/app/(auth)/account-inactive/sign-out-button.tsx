"use client";

import { Button } from "@ccr/ui/components/button";
import { Spinner } from "@ccr/ui/components/misc";
import { LogOutIcon } from "lucide-react";
import { useTransition } from "react";
import { useI18n } from "@/i18n/client";
import { logoutAction } from "@/server/actions/auth";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <Button variant="outline" size="lg" className="w-full" disabled={pending} onClick={() => startTransition(() => logoutAction("/login"))}>
      {pending ? <Spinner /> : <LogOutIcon />}
      {t("nav.signOut")}
    </Button>
  );
}
