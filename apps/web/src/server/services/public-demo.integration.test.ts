import { prisma } from "@ccr/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCareTeam, resetDatabase } from "@/test/integration/fixtures";
import { PUBLIC_DEMO_REFUSAL } from "../demo-mode";
import { ForbiddenError } from "../errors";
import { changePassword, renameOrganization, updateOrganizationLocale, updateProfile } from "./accounts";
import { createAdditionalOrganization } from "./organizations";
import { createTask } from "./tasks";
import {
  acceptInvitation,
  changeMemberRole,
  deactivateMember,
  inviteMember,
  joinOrganization,
  reactivateMember,
  resendInvitation,
  revokeInvitation,
} from "./team";

vi.mock("@/server/realtime/bus", () => ({ realtime: { touch: vi.fn(async () => {}), publish: vi.fn(async () => {}) } }));

type Team = Awaited<ReturnType<typeof createCareTeam>>;
let team: Team;

beforeEach(async () => {
  await resetDatabase();
  team = await createCareTeam("Riverside");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

/** What a visitor could change to break the shared demo accounts for everyone else. */
async function snapshot() {
  const [organizations, members, identities, invitations] = await Promise.all([
    prisma.organization.findMany({ select: { id: true, name: true, locale: true }, orderBy: { id: "asc" } }),
    prisma.user.findMany({ select: { id: true, name: true, title: true, role: true, deactivatedAt: true }, orderBy: { id: "asc" } }),
    prisma.identity.findMany({ select: { id: true, name: true, passwordHash: true, sessionVersion: true }, orderBy: { id: "asc" } }),
    prisma.invitation.count(),
  ]);
  return { organizations, members, identities, invitations };
}

describe("public demo mode (PUBLIC_DEMO=true)", () => {
  it("refuses every change to accounts, members, invitations and organizations, and changes nothing", async () => {
    vi.stubEnv("PUBLIC_DEMO", "true");
    const { organization, proposer, adminA } = team;
    const before = await snapshot();

    const attempts: Array<[string, () => Promise<unknown>]> = [
      ["change password", () => changePassword(proposer, { currentPassword: "demo1234", newPassword: "Vandal-Password-123" })],
      ["update profile", () => updateProfile(proposer, { organizationId: organization.id, name: "Vandal", title: "", specialty: "" })],
      ["rename organization", () => renameOrganization(adminA, { organizationId: organization.id, name: "Vandalized Hospital" })],
      ["change organization language", () => updateOrganizationLocale(adminA, { organizationId: organization.id, locale: "vi" })],
      ["create organization", () => createAdditionalOrganization(proposer, { name: "Vandal Clinic" })],
      ["invite member", () => inviteMember(adminA, { organizationId: organization.id, email: "stranger@example.test", role: "ORG_ADMIN" })],
      ["resend invitation", () => resendInvitation(adminA, "any-invitation")],
      ["revoke invitation", () => revokeInvitation(adminA, "any-invitation")],
      ["accept invitation", () => acceptInvitation({ token: "any-invitation-token", name: "Stranger", password: "Stranger-Password-123" })],
      ["join organization", () => joinOrganization(proposer.identityId, "any-invitation-token")],
      ["change role", () => changeMemberRole(adminA, proposer.id, "NURSE")],
      ["deactivate member", () => deactivateMember(adminA, proposer.id)],
      ["reactivate member", () => reactivateMember(adminA, proposer.id)],
    ];
    for (const [label, attempt] of attempts) {
      const error = await attempt().then(
        () => null,
        (rejection: unknown) => rejection,
      );
      expect(error, label).toBeInstanceOf(ForbiddenError);
      expect((error as Error).message, label).toBe(PUBLIC_DEMO_REFUSAL);
    }

    expect(await snapshot()).toEqual(before);
  });

  it("keeps clinical work available", async () => {
    vi.stubEnv("PUBLIC_DEMO", "true");
    const task = await createTask(team.proposer, team.caseRoom.id, {
      title: "Review the staging CT with radiology",
      assigneeId: team.reviewerA.id,
      priority: "HIGH",
      dueDate: null,
    });
    expect(task.title).toBe("Review the staging CT with radiology");
  });

  it("is off unless PUBLIC_DEMO is exactly true", async () => {
    vi.stubEnv("PUBLIC_DEMO", "false");
    await renameOrganization(team.adminA, { organizationId: team.organization.id, name: "Riverside Renamed" });
    expect((await prisma.organization.findUniqueOrThrow({ where: { id: team.organization.id } })).name).toBe("Riverside Renamed");
  });
});
