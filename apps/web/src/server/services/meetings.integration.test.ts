import { prisma } from "@ccr/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCareTeam, createUser, resetDatabase, settle } from "@/test/integration/fixtures";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { createDecision } from "./decisions";
import {
  addAgendaItem,
  cancelMeeting,
  completeMeeting,
  createMeeting,
  getMeeting,
  listMeetings,
  recordOutcome,
  removeAgendaItem,
  setAttendance,
  startMeeting,
} from "./meetings";

vi.mock("@/server/realtime/bus", () => ({ realtime: { touch: vi.fn(async () => {}), publish: vi.fn(async () => {}) } }));

type Team = Awaited<ReturnType<typeof createCareTeam>>;
let team: Team;

beforeEach(async () => {
  await resetDatabase();
  team = await createCareTeam();
});

const meetingInput = { title: "Synthetic tumor board", scheduledAt: "2030-01-15T07:30:00.000Z", durationMinutes: 60 };
const question = "Resection or systemic therapy first?";

async function newCase(label: string, members: string[]) {
  const patient = await prisma.patient.create({
    data: {
      syntheticMedicalRecordNumber: `SYN-MEET-${label}`,
      firstName: "Synthetic",
      lastName: label,
      dateOfBirth: new Date("1960-01-01T00:00:00Z"),
      sex: "UNKNOWN",
      primaryDiagnosis: "Synthetic test diagnosis",
      organizationId: team.organization.id,
    },
  });
  return prisma.caseRoom.create({
    data: {
      patientId: patient.id,
      organizationId: team.organization.id,
      title: `Synthetic case ${label}`,
      specialty: "ONCOLOGY",
      createdById: team.proposer.id,
      members: { create: members.map((userId) => ({ userId })) },
    },
  });
}

describe("permissions", () => {
  it("lets clinicians and care coordinators schedule meetings, not nurses", async () => {
    await expect(createMeeting(team.nurse, team.organization.id, meetingInput)).rejects.toBeInstanceOf(ForbiddenError);
    const coordinator = await createUser(team.organization.id, "CARE_COORDINATOR", "Coordinator");
    await expect(createMeeting(coordinator, team.organization.id, meetingInput)).resolves.toMatchObject({ status: "SCHEDULED" });
    await expect(createMeeting(team.proposer, team.organization.id, meetingInput)).resolves.toMatchObject({ createdById: team.proposer.id });
  });

  it("keeps meetings inside their organization", async () => {
    const meeting = await createMeeting(team.proposer, team.organization.id, meetingInput);
    const other = await createCareTeam("Other");
    expect(await getMeeting(other.proposer, meeting.id)).toBeNull();
    await expect(startMeeting(other.proposer, meeting.id)).rejects.toBeInstanceOf(NotFoundError);
    await expect(setAttendance(team.proposer, meeting.id, [other.proposer.id])).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("agenda", () => {
  it("shows each person only the cases they may open, without counting the others", async () => {
    const meeting = await createMeeting(team.proposer, team.organization.id, meetingInput);
    await addAgendaItem(team.proposer, meeting.id, { caseRoomId: team.caseRoom.id, question, presenterId: team.proposer.id });
    const outsider = await createUser(team.organization.id, "DOCTOR", "Dr. Outsider");

    expect((await getMeeting(outsider, meeting.id))!.agendaItems).toHaveLength(0);
    expect((await listMeetings(outsider, "upcoming"))[0]!.agendaItems).toHaveLength(0);
    expect((await getMeeting(team.adminA, meeting.id))!.agendaItems).toHaveLength(1);
    // Adding a case they cannot open behaves as if the case did not exist.
    await expect(addAgendaItem(outsider, meeting.id, { caseRoomId: team.caseRoom.id, question })).rejects.toBeInstanceOf(NotFoundError);
    const [item] = (await getMeeting(team.proposer, meeting.id))!.agendaItems;
    await expect(removeAgendaItem(outsider, item!.id)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("refuses a case twice, a presenter outside the care team, and changes to a cancelled meeting", async () => {
    const meeting = await createMeeting(team.proposer, team.organization.id, meetingInput);
    await addAgendaItem(team.proposer, meeting.id, { caseRoomId: team.caseRoom.id, question });
    await expect(addAgendaItem(team.proposer, meeting.id, { caseRoomId: team.caseRoom.id, question })).rejects.toThrow("already on the agenda");

    const second = await newCase("B", [team.proposer.id]);
    await expect(addAgendaItem(team.proposer, meeting.id, { caseRoomId: second.id, question, presenterId: team.reviewerA.id })).rejects.toThrow("care team");

    await cancelMeeting(team.proposer, meeting.id);
    await expect(addAgendaItem(team.proposer, meeting.id, { caseRoomId: second.id, question })).rejects.toThrow("cancelled");
  });

  it("gives cases added at the same time distinct positions", async () => {
    const meeting = await createMeeting(team.proposer, team.organization.id, meetingInput);
    const cases = await Promise.all(["C1", "C2", "C3", "C4"].map((label) => newCase(label, [team.proposer.id])));
    const outcome = await settle(...cases.map((room) => () => addAgendaItem(team.proposer, meeting.id, { caseRoomId: room.id, question })));
    expect(outcome.errors).toEqual([]);
    const positions = (await prisma.tumorBoardAgendaItem.findMany({ where: { meetingId: meeting.id }, select: { position: true } })).map((i) => i.position);
    expect(positions.sort((a, b) => a - b)).toEqual([1, 2, 3, 4]);
  });
});

describe("outcomes", () => {
  async function runningMeetingWithCase() {
    const meeting = await createMeeting(team.proposer, team.organization.id, meetingInput);
    const item = await addAgendaItem(team.proposer, meeting.id, { caseRoomId: team.caseRoom.id, question });
    return { meeting, item };
  }

  it("records the conclusion once in the case discussion, timeline and audit log", async () => {
    const { meeting, item } = await runningMeetingWithCase();
    await expect(recordOutcome(team.proposer, item.id, { status: "DISCUSSED", conclusion: "Neoadjuvant therapy first." })).rejects.toThrow("Start the meeting");
    await startMeeting(team.proposer, meeting.id);
    await expect(recordOutcome(team.proposer, item.id, { status: "DISCUSSED", conclusion: "" })).rejects.toThrow("conclusion");

    await recordOutcome(team.proposer, item.id, { status: "DISCUSSED", summary: "Synthetic summary.", conclusion: "Neoadjuvant therapy first." });
    await recordOutcome(team.proposer, item.id, { status: "DISCUSSED", summary: "Synthetic summary.", conclusion: "Neoadjuvant therapy first, then restaging." });

    const saved = await prisma.tumorBoardAgendaItem.findUniqueOrThrow({ where: { id: item.id } });
    expect(saved).toMatchObject({ status: "DISCUSSED", conclusion: "Neoadjuvant therapy first, then restaging.", summary: "Synthetic summary." });
    const messages = await prisma.message.findMany({ where: { caseRoomId: team.caseRoom.id, type: "SYSTEM", content: { startsWith: "Discussed at the tumor board" } } });
    expect(messages).toHaveLength(1);
    expect(await prisma.timelineEvent.count({ where: { caseRoomId: team.caseRoom.id, title: "Discussed at tumor board" } })).toBe(1);
    expect(await prisma.auditEvent.count({ where: { caseRoomId: team.caseRoom.id, action: "meeting.outcome_recorded" } })).toBe(2);
  });

  it("links a decision proposed from the outcome, once, and only within the same case", async () => {
    const { meeting, item } = await runningMeetingWithCase();
    await startMeeting(team.proposer, meeting.id);
    await recordOutcome(team.proposer, item.id, { status: "DISCUSSED", conclusion: "Neoadjuvant therapy first." });
    const proposal = {
      title: "Synthetic neoadjuvant plan",
      description: "Proposed plan for the synthetic test patient.",
      rationale: "Tumor board conclusion for the synthetic patient.",
      reviewerIds: [team.reviewerA.id],
      agendaItemId: item.id,
    };

    const other = await newCase("D", [team.proposer.id, team.reviewerA.id]);
    await expect(createDecision(team.proposer, other.id, proposal)).rejects.toBeInstanceOf(ValidationError);
    expect(await prisma.decision.count({ where: { caseRoomId: other.id } })).toBe(0);

    const decision = await createDecision(team.proposer, team.caseRoom.id, proposal);
    expect(await prisma.tumorBoardAgendaItem.findUniqueOrThrow({ where: { id: item.id } })).toMatchObject({ decisionId: decision.id });
    await expect(createDecision(team.proposer, team.caseRoom.id, proposal)).rejects.toBeInstanceOf(ValidationError);
    expect(await prisma.decision.count({ where: { caseRoomId: team.caseRoom.id } })).toBe(1);
  });

  it("records the cases not reached as deferred when the meeting ends", async () => {
    const { meeting, item } = await runningMeetingWithCase();
    const second = await newCase("E", [team.proposer.id]);
    const deferred = await addAgendaItem(team.proposer, meeting.id, { caseRoomId: second.id, question });
    await startMeeting(team.proposer, meeting.id);
    await recordOutcome(team.proposer, item.id, { status: "DISCUSSED", conclusion: "Surgery." });
    await completeMeeting(team.proposer, meeting.id);

    const items = await prisma.tumorBoardAgendaItem.findMany({ where: { meetingId: meeting.id }, select: { id: true, status: true } });
    expect(Object.fromEntries(items.map((i) => [i.id, i.status]))).toEqual({ [item.id]: "DISCUSSED", [deferred.id]: "DEFERRED" });
    // The minutes can still be corrected after the meeting, but the agenda is closed.
    await expect(recordOutcome(team.proposer, item.id, { status: "DISCUSSED", conclusion: "Surgery after biliary drainage." })).resolves.toBeUndefined();
    await expect(removeAgendaItem(team.proposer, deferred.id)).rejects.toThrow("ended");
  });
});
