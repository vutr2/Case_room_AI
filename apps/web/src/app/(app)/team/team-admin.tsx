"use client";

import { Button } from "@ccr/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@ccr/ui/components/dialog";
import { Input } from "@ccr/ui/components/input";
import { Label } from "@ccr/ui/components/label";
import { Spinner } from "@ccr/ui/components/misc";
import { NativeSelect } from "@ccr/ui/components/native-select";
import { USER_ROLES, type UserRole } from "@ccr/types";
import { CopyIcon, MailPlusIcon, SendIcon, UserCheckIcon, UserXIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { useI18n } from "@/i18n/client";
import type { Translator } from "@/i18n/translate";
import {
  changeMemberRoleAction,
  deactivateMemberAction,
  inviteMemberAction,
  reactivateMemberAction,
  resendInvitationAction,
  revokeInvitationAction,
} from "@/server/actions/team";

/** Links built without APP_URL are relative; make them absolute for copying. */
function absolute(link: string): string {
  return new URL(link, window.location.origin).toString();
}

function copyLink(link: string, t: Translator) {
  void navigator.clipboard.writeText(absolute(link));
  toast.success(t("teamAdmin.linkCopied"));
}

export function InviteForm({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  // The organization this form was opened in; kept even if the page re-renders under another one.
  const [formOrganizationId] = useState(organizationId);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("SPECIALIST");
  const [specialty, setSpecialty] = useState("");
  const [title, setTitle] = useState("");
  const [created, setCreated] = useState<{ link: string; email: string; emailed: boolean; problem: string | null } | null>(null);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await inviteMemberAction({ organizationId: formOrganizationId, email, role, specialty: specialty || undefined, title: title || undefined });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { inviteUrl, delivery } = result.data;
      setCreated({ link: inviteUrl, email, emailed: delivery.emailed, problem: delivery.emailed ? null : delivery.emailProblem });
      setEmail("");
      setSpecialty("");
      setTitle("");
      toast.success(delivery.emailed ? t("teamAdmin.emailedTo", { email }) : t("teamAdmin.created"));
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">{t("teamAdmin.email")}</Label>
          <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("teamAdmin.emailPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">{t("teamAdmin.role")}</Label>
          <NativeSelect id="invite-role" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {USER_ROLES.map((value) => (
              <option key={value} value={value}>
                {t(`enum.role.${value}`)}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-specialty">{t("account.specialty")}</Label>
          <Input id="invite-specialty" value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder={t("teamAdmin.specialtyPlaceholder")} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-title">{t("account.title")}</Label>
          <Input id="invite-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("teamAdmin.titlePlaceholder")} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? <Spinner /> : <MailPlusIcon />}
          {t("teamAdmin.create")}
        </Button>
      </div>
      {created && (
        <div className="space-y-1.5 rounded-lg border border-approved-border bg-approved-soft p-3">
          <div className="text-xs font-medium text-approved">
            {created.emailed
              ? t("teamAdmin.emailedShare", { email: created.email })
              : t("teamAdmin.shareWith", { problem: created.problem ?? t("teamAdmin.notEmailed"), email: created.email })}
          </div>
          <div className="flex gap-2">
            <Input readOnly value={created.link} className="font-mono text-xs" onFocus={(e) => e.target.select()} />
            <Button type="button" variant="outline" size="icon" aria-label={t("teamAdmin.copyInvitation")} onClick={() => copyLink(created.link, t)}>
              <CopyIcon />
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}

export function RevokeInvitationButton({ invitationId }: { invitationId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <Button
      variant="ghost"
      size="xs"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await revokeInvitationAction(invitationId);
          if (!result.ok) toast.error(result.error);
          else {
            toast.success(t("teamAdmin.revoked"));
            router.refresh();
          }
        })
      }
    >
      <XIcon />
      {t("teamAdmin.revoke")}
    </Button>
  );
}

export function RoleSelect({ memberId, memberName, role, disabled }: { memberId: string; memberName: string; role: UserRole; disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <NativeSelect
      aria-label={t("teamAdmin.roleOf", { name: memberName })}
      value={role}
      disabled={disabled || pending}
      className="h-8 w-40 text-xs"
      onChange={(event) => {
        const next = event.target.value as UserRole;
        startTransition(async () => {
          const result = await changeMemberRoleAction(memberId, next);
          if (!result.ok) toast.error(result.error);
          else toast.success(t("teamAdmin.roleChanged", { role: t(`enum.role.${next}`) }));
          router.refresh();
        });
      }}
    >
      {USER_ROLES.map((value) => (
        <option key={value} value={value}>
          {t(`enum.role.${value}`)}
        </option>
      ))}
    </NativeSelect>
  );
}

/** Copy the link of a pending invitation, or send its email again. */
export function InvitationLinkButtons({ link, invitationId, canEmail }: { link: string; invitationId: string; canEmail: boolean }) {
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();
  return (
    <>
      <Button variant="ghost" size="xs" onClick={() => copyLink(link, t)}>
        <CopyIcon />
        {t("teamAdmin.copyLink")}
      </Button>
      {canEmail && (
        <Button
          variant="ghost"
          size="xs"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await resendInvitationAction(invitationId);
              if (!result.ok) toast.error(result.error);
              else toast.success(t("teamAdmin.resent"));
            })
          }
        >
          {pending ? <Spinner /> : <SendIcon />}
          {t("teamAdmin.resend")}
        </Button>
      )}
    </>
  );
}

/**
 * Deactivate (after confirmation) or reactivate a member. Deactivation keeps
 * everything the person wrote; they simply can no longer open the organization.
 */
export function MemberAccessButton({ memberId, name, deactivated }: { memberId: string; name: string; deactivated: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();
  const { t } = useI18n();

  function run(action: (id: string) => ReturnType<typeof deactivateMemberAction>, success: string) {
    startTransition(async () => {
      const result = await action(memberId);
      if (!result.ok) toast.error(result.error);
      else {
        toast.success(success);
        setConfirming(false);
        router.refresh();
      }
    });
  }

  if (deactivated) {
    return (
      <Button variant="outline" size="xs" disabled={pending} onClick={() => run(reactivateMemberAction, t("teamAdmin.reactivated", { name }))}>
        {pending ? <Spinner /> : <UserCheckIcon />}
        {t("teamAdmin.reactivate")}
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="xs" className="text-danger hover:text-danger" onClick={() => setConfirming(true)}>
        <UserXIcon />
        {t("teamAdmin.deactivate")}
      </Button>
      <Dialog open={confirming} onOpenChange={(open) => !pending && setConfirming(open)}>
        <DialogContent closeLabel={t("common.close")}>
          <DialogHeader>
            <DialogTitle>{t("teamAdmin.deactivateTitle", { name })}</DialogTitle>
            <DialogDescription>{t("teamAdmin.deactivateDescription", { name })}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" disabled={pending} onClick={() => run(deactivateMemberAction, t("teamAdmin.deactivated", { name }))}>
              {pending ? <Spinner /> : <UserXIcon />}
              {t("teamAdmin.deactivate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
