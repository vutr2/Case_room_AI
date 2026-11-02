import "server-only";
import { ForbiddenError } from "./errors";

/**
 * Public demo mode (PUBLIC_DEMO=true): the deployment is open to anyone, who
 * signs in with the shared synthetic demo accounts. Clinical work stays
 * available, because that is what visitors try out and the nightly reset
 * clears it. Changes to accounts, memberships, invitations and organizations
 * are refused, so one visitor cannot lock the others out until the next reset
 * (the demo password is public).
 */
export function isPublicDemo(): boolean {
  return process.env.PUBLIC_DEMO === "true";
}

export const PUBLIC_DEMO_REFUSAL = "Turned off on the public demo: account and organization changes are not allowed here.";

/** Call first in services that change accounts, memberships, invitations or organizations. */
export function assertNotPublicDemo(): void {
  if (isPublicDemo()) throw new ForbiddenError(PUBLIC_DEMO_REFUSAL);
}
