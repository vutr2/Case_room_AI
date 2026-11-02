import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";
import type { Translator } from "@/i18n/translate";
import { i18nFor } from "@/i18n/translator-for";
import type { EmailMessage } from "./index";

/**
 * Account emails. Plain text first (what security-conscious mail clients
 * show), with a minimal HTML version. No tracking pixels or remote images.
 * Written in English unless a language is given: the organization's for
 * invitations, the language of the request for account emails.
 */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

interface Body {
  greeting: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  footer: string;
}

function render(t: Translator, to: string, subject: string, body: Body): EmailMessage {
  const text = [
    body.greeting,
    "",
    ...body.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    ...(body.action ? [`${body.action.label}: ${body.action.url}`, ""] : []),
    body.footer,
    "",
    "Clinical Case Room",
  ].join("\n");

  const paragraph = (value: string) => `<p style="margin:0 0 16px">${escapeHtml(value)}</p>`;
  const button = body.action
    ? `<p style="margin:24px 0"><a href="${escapeHtml(body.action.url)}" style="background:#2563eb;color:#ffffff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">${escapeHtml(body.action.label)}</a></p>` +
      `<p style="margin:0 0 16px;font-size:12px;color:#64748b">${escapeHtml(t("email.buttonFallback"))}<br>${escapeHtml(body.action.url)}</p>`
    : "";
  const html = `<!doctype html><html lang="${t.locale}"><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5;color:#0f172a;max-width:560px;margin:0 auto;padding:24px">
${paragraph(body.greeting)}${body.paragraphs.map(paragraph).join("")}${button}<p style="margin:24px 0 0;font-size:12px;color:#64748b">${escapeHtml(body.footer)}</p>
<p style="margin:8px 0 0;font-size:12px;color:#64748b">Clinical Case Room</p></body></html>`;

  return { to, subject, text, html };
}

function translatorFor(locale: Locale | undefined): Translator {
  return i18nFor(locale ?? DEFAULT_LOCALE).t;
}

export function signupConfirmationEmail(input: { to: string; name: string; organizationName: string; url: string; expiresInHours: number; locale?: Locale }): EmailMessage {
  const t = translatorFor(input.locale);
  return render(t, input.to, t("email.signup.subject"), {
    greeting: t("email.hello", { name: input.name }),
    paragraphs: [t("email.signup.asked", { organization: input.organizationName }), t.plural("email.signup.link", input.expiresInHours)],
    action: { label: t("email.signup.action"), url: input.url },
    footer: t("email.signup.footer"),
  });
}

/** Sent instead of a confirmation link when the address already has an account (no account enumeration on the signup form). */
export function existingAccountEmail(input: { to: string; name: string; signInUrl: string; resetUrl: string; locale?: Locale }): EmailMessage {
  const t = translatorFor(input.locale);
  return render(t, input.to, t("email.existing.subject"), {
    greeting: t("email.hello", { name: input.name }),
    paragraphs: [t("email.existing.tried"), t("email.existing.signIn", { url: input.signInUrl }), t("email.existing.forgot", { url: input.resetUrl })],
    footer: t("email.existing.footer"),
  });
}

export function passwordResetEmail(input: { to: string; name: string; url: string; expiresInMinutes: number; locale?: Locale }): EmailMessage {
  const t = translatorFor(input.locale);
  return render(t, input.to, t("email.reset.subject"), {
    greeting: t("email.hello", { name: input.name }),
    paragraphs: [t("email.reset.received"), t.plural("email.reset.link", input.expiresInMinutes)],
    action: { label: t("email.reset.action"), url: input.url },
    footer: t("email.reset.footer"),
  });
}

export function passwordChangedEmail(input: { to: string; name: string; resetUrl: string; locale?: Locale }): EmailMessage {
  const t = translatorFor(input.locale);
  return render(t, input.to, t("email.changed.subject"), {
    greeting: t("email.hello", { name: input.name }),
    paragraphs: [t("email.changed.notice"), t("email.changed.notYou", { url: input.resetUrl })],
    footer: t("email.changed.footer"),
  });
}

export function invitationEmail(input: {
  to: string;
  organizationName: string;
  inviterName: string;
  roleLabel: string;
  url: string;
  expiresAt: Date;
  locale?: Locale;
}): EmailMessage {
  const t = translatorFor(input.locale);
  // ISO date: unambiguous whatever the reader's conventions.
  const expires = input.expiresAt.toISOString().slice(0, 10);
  const names = { inviter: input.inviterName, organization: input.organizationName };
  return render(t, input.to, t("email.invite.subject", names), {
    greeting: t("email.helloAnonymous"),
    paragraphs: [t("email.invite.joined", { ...names, role: input.roleLabel }), t("email.invite.accept", { email: input.to, date: expires })],
    action: { label: t("email.invite.action", names), url: input.url },
    footer: t("email.invite.footer"),
  });
}
