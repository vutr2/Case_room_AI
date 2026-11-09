import "./env";
import { randomBytes } from "node:crypto";
import { prisma } from "../../src/client";
import { hashPassword } from "../../src/password";
import { seedCase } from "./case-builder";
import { at, audit, type SeedContext } from "./helpers";
import { seedMeeting } from "./meetings";
import { seedJohnCarter } from "./patients/john-carter";
import { lindaThompson, mariaGonzalez, robertKim, samuelOkafor } from "./patients/other-cases";
import { DEMO_PASSWORD, DEMO_USERS } from "./users";
import { seedVietnameseHospital } from "./vietnam";

/**
 * Resets the database to the synthetic demo dataset.
 * All patients are fictional. Never load real patient data into this project.
 */
async function main() {
  console.log("› Resetting demo data…");
  // TRUNCATE bypasses the row-level immutability triggers on AuditEvent by design;
  // it is only used here to reset the demo environment.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Organization", "Identity", "SignupRequest" RESTART IDENTITY CASCADE');

  const org = await prisma.organization.create({
    data: { name: "Riverside Cancer Center (Demo)", createdAt: at(120, "09:00") },
  });

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const identities: Record<string, { id: string }> = {};
  const users: SeedContext["users"] = {};
  for (const demo of DEMO_USERS) {
    identities[demo.key] = await prisma.identity.create({
      data: { email: demo.email, name: demo.name, passwordHash, createdAt: at(120, "09:05") },
    });
    users[demo.key] = await prisma.user.create({
      data: {
        identityId: identities[demo.key]!.id,
        name: demo.name,
        email: demo.email,
        handle: demo.handle,
        role: demo.role,
        specialty: demo.specialty,
        title: demo.title,
        organizationId: org.id,
        createdAt: at(120, "09:05"),
        // Riverside is where the demo accounts land after signing in.
        lastLoginAt: at(0, "08:00"),
      },
    });
  }
  const ctx: SeedContext = { prisma, org, users };

  await audit(ctx, { userId: users.admin!.id, action: "org.created", resourceType: "Organization", resourceId: org.id, metadata: { name: org.name }, createdAt: at(120, "09:00") });
  for (const demo of DEMO_USERS.filter((d) => d.key !== "admin")) {
    await audit(ctx, { userId: users.admin!.id, action: "org.member_added", resourceType: "User", resourceId: users[demo.key]!.id, metadata: { memberName: demo.name, role: demo.role }, createdAt: at(119, "10:00") });
  }

  // A pending invitation, so the Team page shows the invite workflow.
  await prisma.invitation.create({
    data: {
      organizationId: org.id,
      email: "wong@riverside.demo",
      role: "SPECIALIST",
      specialty: "Gastroenterology",
      title: "Gastroenterologist",
      token: randomBytes(24).toString("base64url"),
      invitedById: users.admin!.id,
      createdAt: at(1, "10:00"),
      expiresAt: at(-13, "10:00"),
    },
  });
  await audit(ctx, { userId: users.admin!.id, action: "org.member_invited", resourceType: "Invitation", metadata: { email: "wong@riverside.demo", role: "SPECIALIST" }, createdAt: at(1, "10:00") });

  await seedSecondOrganization(identities, passwordHash);

  console.log("› Seeding case: Linda Thompson (closed, decision approved)");
  await seedCase(ctx, lindaThompson);
  console.log("› Seeding case: Robert Kim (decision under review, changes requested)");
  const kim = await seedCase(ctx, robertKim);
  console.log("› Seeding case: Maria Gonzalez (decision approved, in treatment)");
  const maria = await seedCase(ctx, mariaGonzalez);
  console.log("› Seeding case: Samuel Okafor (cardiology inpatient)");
  await seedCase(ctx, samuelOkafor);
  console.log("› Seeding case: John Carter (flagship tumor board case)");
  const carter = await seedJohnCarter(ctx);

  console.log("› Seeding tumor board meetings");
  await seedMeeting(ctx, {
    title: "Breast & Gynecologic Tumor Board",
    at: [12, "07:30"],
    durationMinutes: 60,
    location: "Conference Room 4B",
    chair: "smith",
    secretary: "rivera",
    createdBy: "rivera",
    created: [16, "10:00"],
    completed: true,
    attendees: ["nguyen", "smith", "lee", "patel", "rivera", "adams"],
    items: [
      {
        caseRoomId: maria.caseRoomId,
        presenter: "nguyen",
        addedBy: "rivera",
        added: [16, "10:05"],
        question: "Neoadjuvant HER2-directed therapy or upfront surgery for cT2 cN1 HER2-positive breast cancer?",
        outcome: {
          discussed: [12, "08:05"],
          linkDecision: true,
          summary:
            "48-year-old woman with left breast invasive ductal carcinoma, grade 2: ER 95%, PR 60%, HER2 3+, Ki-67 30%. MRI shows a cT2 tumor; the axillary node FNA is positive (cN1). ECOG 0.",
          conclusion:
            "Neoadjuvant TCHP for 6 cycles, then surgery (breast conservation if the response allows), with axillary management based on the clipped node. Clip the biopsied axillary node before cycle 1. Baseline echocardiogram before trastuzumab.",
        },
      },
    ],
  });
  await seedMeeting(ctx, {
    title: "GI & Thoracic Tumor Board",
    at: [-2, "07:30"],
    durationMinutes: 60,
    location: "Conference Room 4B",
    chair: "smith",
    secretary: "rivera",
    createdBy: "rivera",
    created: [4, "14:15"],
    items: [
      {
        caseRoomId: carter.caseRoomId,
        presenter: "nguyen",
        addedBy: "rivera",
        added: [4, "14:16"],
        question: "Confirm the resectability classification (borderline resectable or locally advanced) and agree on neoadjuvant chemotherapy before surgical re-evaluation.",
      },
      {
        caseRoomId: kim.caseRoomId,
        presenter: "nguyen",
        addedBy: "rivera",
        added: [3, "09:00"],
        question: "EGFR/ALK results are pending: hold the neoadjuvant chemoimmunotherapy plan, or proceed toward lobectomy?",
      },
    ],
  });

  await seedVietnameseHospital(prisma, passwordHash);

  const counts = {
    organizations: await prisma.organization.count(),
    accounts: await prisma.identity.count(),
    memberships: await prisma.user.count(),
    patients: await prisma.patient.count(),
    documents: await prisma.clinicalDocument.count(),
    timelineEvents: await prisma.timelineEvent.count(),
    messages: await prisma.message.count(),
    decisions: await prisma.decision.count(),
    tasks: await prisma.task.count(),
    meetings: await prisma.tumorBoardMeeting.count(),
    auditEvents: await prisma.auditEvent.count(),
  };
  console.log("✓ Demo data ready:", counts);
  console.log(`\nSign in with any demo account, e.g. nguyen@riverside.demo or khoa@benhvien.demo / ${DEMO_PASSWORD}`);
}

/**
 * A second organization, to show that one person can belong to several
 * organizations with a different role in each, and that cases, members and
 * audit logs stay separate. Dr. Nguyen is a member of both; Dr. Patel has a
 * pending invitation (accept it with the existing account).
 */
async function seedSecondOrganization(identities: Record<string, { id: string }>, passwordHash: string) {
  console.log("› Seeding organization: Lakeside Community Hospital (Dr. Nguyen is also a member)");
  const lakeside = await prisma.organization.create({ data: { name: "Lakeside Community Hospital (Demo)", createdAt: at(60, "09:00") } });
  const ctx: SeedContext = { prisma, org: lakeside, users: {} };

  const adminIdentity = await prisma.identity.create({
    data: { email: "admin@lakeside.demo", name: "Jordan Ellis", passwordHash, createdAt: at(60, "09:00") },
  });
  const admin = await prisma.user.create({
    data: {
      identityId: adminIdentity.id,
      name: "Jordan Ellis",
      email: "admin@lakeside.demo",
      handle: "JordanEllis",
      role: "ORG_ADMIN",
      title: "Hospital Operations Lead",
      organizationId: lakeside.id,
      createdAt: at(60, "09:00"),
    },
  });
  const nguyen = DEMO_USERS.find((u) => u.key === "nguyen")!;
  const visiting = await prisma.user.create({
    data: {
      identityId: identities.nguyen!.id,
      name: nguyen.name,
      email: nguyen.email,
      handle: nguyen.handle,
      role: "SPECIALIST",
      specialty: nguyen.specialty,
      title: "Visiting Medical Oncologist",
      organizationId: lakeside.id,
      createdAt: at(30, "10:00"),
      lastLoginAt: at(2, "15:00"),
    },
  });

  await audit(ctx, { userId: admin.id, action: "org.created", resourceType: "Organization", resourceId: lakeside.id, metadata: { name: lakeside.name }, createdAt: at(60, "09:00") });
  await audit(ctx, { userId: admin.id, action: "org.member_invited", resourceType: "Invitation", metadata: { email: nguyen.email, role: "SPECIALIST" }, createdAt: at(31, "09:00") });
  await audit(ctx, { userId: visiting.id, action: "org.invitation_accepted", resourceType: "User", resourceId: visiting.id, metadata: { email: nguyen.email, role: "SPECIALIST" }, createdAt: at(30, "10:00") });

  await prisma.invitation.create({
    data: {
      organizationId: lakeside.id,
      email: "patel@riverside.demo",
      role: "SPECIALIST",
      specialty: "Pathology",
      title: "Consulting Pathologist",
      token: randomBytes(24).toString("base64url"),
      invitedById: admin.id,
      createdAt: at(1, "11:00"),
      expiresAt: at(-13, "11:00"),
    },
  });
  await audit(ctx, { userId: admin.id, action: "org.member_invited", resourceType: "Invitation", metadata: { email: "patel@riverside.demo", role: "SPECIALIST" }, createdAt: at(1, "11:00") });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
