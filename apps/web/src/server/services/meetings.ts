import "server-only";
import { lockRow, prisma, type DbClient, type TransactionClient } from "@ccr/database";
import type { MeetingStatus } from "@ccr/types";
import { z } from "zod";
import { FAMILY_NAME_FIRST } from "@/i18n/config";
import { caseTextFor, organizationLocale } from "@/i18n/translator-for";
import { patientName } from "@/lib/format";
import type { SessionUser } from "../auth/session";
import { accessibleCaseWhere, assertCaseAccess } from "../authz/case-access";
import { assertFormOrganization } from "../authz/organization-context";
import { assertCan } from "../authz/permissions";
import { NotFoundError, ValidationError } from "../errors";
import { realtime } from "../realtime/bus";
import { recordAudit } from "./audit";
import { postSystemMessage, touchCaseRoom } from "./system-messages";

/**
 * Tumor board meetings: a scheduled agenda of case rooms, presented one by one,
 * with the board's outcome recorded per case. Everyone in the organization sees
 * the meetings, but each person sees only the agenda items of cases they may
 * open: a hidden case is neither listed nor counted.
 *
 * Lock order: TumorBoardMeeting → CaseRoom (see LockableTable).
 */

const MANAGE_DENIED = "Only clinicians and care coordinators can manage tumor board meetings.";
const MEETING_NOT_FOUND = "Meeting not found.";
const AGENDA_ITEM_NOT_FOUND = "Agenda item not found.";
const ACTIVE: MeetingStatus[] = ["SCHEDULED", "IN_PROGRESS"];

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

export const meetingInputSchema = z.object({
  title: z.string().trim().min(3, "Give the meeting a title.").max(160),
  /** ISO timestamp; the browser converts the local date and time it shows. */
  scheduledAt: z.iso.datetime({ offset: true, message: "Choose the meeting date and time." }),
  durationMinutes: z.number().int().min(15).max(480).nullish(),
  location: optionalText(160),
  chairId: z.string().nullish(),
  secretaryId: z.string().nullish(),
});
export type MeetingInput = z.input<typeof meetingInputSchema>;

export const agendaItemInputSchema = z.object({
  caseRoomId: z.string().min(1),
  presenterId: z.string().nullish(),
  question: z.string().trim().min(5, "Write the question for the board.").max(2000),
});
export type AgendaItemInput = z.input<typeof agendaItemInputSchema>;

export const agendaItemUpdateSchema = agendaItemInputSchema.omit({ caseRoomId: true });

export const outcomeSchema = z
  .object({
    status: z.enum(["DISCUSSED", "DEFERRED"]),
    summary: optionalText(8000),
    conclusion: optionalText(8000),
  })
  .refine((outcome) => outcome.status !== "DISCUSSED" || (outcome.conclusion?.length ?? 0) >= 3, {
    message: "Write the board's conclusion before marking the case as discussed.",
    path: ["conclusion"],
  });
export type OutcomeInput = z.input<typeof outcomeSchema>;

const personSelect = { id: true, name: true, specialty: true, title: true, role: true } as const;

function patientNameFor(user: SessionUser, patient: { firstName: string; lastName: string }) {
  return patientName(patient, FAMILY_NAME_FIRST[organizationLocale(user.organizationLocale)]);
}

/** The meeting if it belongs to the user's organization; otherwise "not found". */
async function findMeeting(db: DbClient, user: SessionUser, meetingId: string) {
  const meeting = await db.tumorBoardMeeting.findFirst({ where: { id: meetingId, organizationId: user.organizationId } });
  if (!meeting) throw new NotFoundError(MEETING_NOT_FOUND);
  return meeting;
}

/** Lock the meeting for a change of its agenda or attendance, and check it can still change. */
async function lockMeeting(tx: TransactionClient, user: SessionUser, meetingId: string, allowed: MeetingStatus[] = ACTIVE) {
  if (!(await lockRow(tx, "TumorBoardMeeting", meetingId))) throw new NotFoundError(MEETING_NOT_FOUND);
  const meeting = await findMeeting(tx, user, meetingId);
  if (!allowed.includes(meeting.status)) {
    throw new ValidationError(
      meeting.status === "CANCELLED" ? "This meeting was cancelled." : meeting.status === "COMPLETED" ? "This meeting has ended." : "Start the meeting first.",
    );
  }
  return meeting;
}

/** An agenda item of a case the user may open (anything else behaves as if it did not exist). */
async function findAgendaItem(user: SessionUser, itemId: string) {
  const item = await prisma.tumorBoardAgendaItem.findFirst({
    where: { id: itemId, meeting: { organizationId: user.organizationId }, caseRoom: accessibleCaseWhere(user) },
    include: { meeting: { select: { id: true, title: true } } },
  });
  if (!item) throw new NotFoundError(AGENDA_ITEM_NOT_FOUND);
  return item;
}

async function assertActiveMembers(user: SessionUser, ids: Array<string | null | undefined>, message: string) {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (wanted.length === 0) return;
  const count = await prisma.user.count({ where: { id: { in: wanted }, organizationId: user.organizationId, deactivatedAt: null } });
  if (count !== wanted.length) throw new ValidationError(message);
}

async function assertPresenter(db: DbClient, caseRoomId: string, presenterId: string | null | undefined) {
  if (!presenterId) return;
  const member = await db.caseRoomMember.findUnique({
    where: { caseRoomId_userId: { caseRoomId, userId: presenterId } },
    select: { user: { select: { deactivatedAt: true } } },
  });
  if (!member || member.user.deactivatedAt) throw new ValidationError("The presenter must be an active member of the case's care team.");
}

// ---- Reading ----

export async function listMeetings(user: SessionUser, scope: "upcoming" | "past") {
  return prisma.tumorBoardMeeting.findMany({
    where: { organizationId: user.organizationId, status: scope === "upcoming" ? { in: ACTIVE } : { in: ["COMPLETED", "CANCELLED"] } },
    include: {
      chair: { select: personSelect },
      agendaItems: {
        where: { caseRoom: accessibleCaseWhere(user) },
        select: { id: true, status: true, caseRoom: { select: { id: true, title: true, patient: { select: { firstName: true, lastName: true } } } } },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { scheduledAt: scope === "upcoming" ? "asc" : "desc" },
    take: scope === "past" ? 30 : undefined,
  });
}

export type BriefReadiness = "missing" | "stale" | "ready";

/**
 * A meeting with the agenda items the user may see. Each item says whether its
 * tumor board brief is missing, older than the newest document ("stale"), or ready.
 */
export async function getMeeting(user: SessionUser, meetingId: string) {
  const meeting = await prisma.tumorBoardMeeting.findFirst({
    where: { id: meetingId, organizationId: user.organizationId },
    include: {
      chair: { select: personSelect },
      secretary: { select: personSelect },
      createdBy: { select: personSelect },
      attendees: { include: { user: { select: personSelect } }, orderBy: { user: { name: "asc" } } },
      agendaItems: {
        where: { caseRoom: accessibleCaseWhere(user) },
        include: {
          caseRoom: {
            select: {
              id: true,
              title: true,
              status: true,
              patient: true,
              members: { where: { user: { deactivatedAt: null } }, select: { user: { select: personSelect } } },
            },
          },
          presenter: { select: personSelect },
          decision: { select: { id: true, number: true, title: true, status: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });
  if (!meeting) return null;

  const caseIds = meeting.agendaItems.map((item) => item.caseRoomId);
  const [briefs, documents] = await Promise.all([
    prisma.caseBrief.findMany({
      where: { caseRoomId: { in: caseIds }, type: "TUMOR_BOARD" },
      orderBy: { createdAt: "desc" },
      distinct: ["caseRoomId"],
      select: { id: true, caseRoomId: true, title: true, status: true, createdAt: true },
    }),
    prisma.clinicalDocument.groupBy({ by: ["caseRoomId"], where: { caseRoomId: { in: caseIds } }, _max: { createdAt: true } }),
  ]);
  const latestBrief = new Map(briefs.map((brief) => [brief.caseRoomId, brief]));
  const latestDocument = new Map(documents.map((d) => [d.caseRoomId, d._max.createdAt]));

  return {
    ...meeting,
    agendaItems: meeting.agendaItems.map((item) => {
      const brief = latestBrief.get(item.caseRoomId) ?? null;
      const newestDocument = latestDocument.get(item.caseRoomId) ?? null;
      const briefReadiness: BriefReadiness = !brief ? "missing" : newestDocument && newestDocument > brief.createdAt ? "stale" : "ready";
      return { ...item, latestBrief: brief, briefReadiness };
    }),
  };
}
export type MeetingDetail = NonNullable<Awaited<ReturnType<typeof getMeeting>>>;

/** The next scheduled or running meeting with at least one case the user may see. */
export async function getNextMeeting(user: SessionUser) {
  const meetings = await listMeetings(user, "upcoming");
  return meetings.find((meeting) => meeting.agendaItems.length > 0) ?? null;
}

/** The upcoming meeting a case is on, for the case page. */
export async function getUpcomingMeetingForCase(user: SessionUser, caseRoomId: string) {
  return prisma.tumorBoardMeeting.findFirst({
    where: { organizationId: user.organizationId, status: { in: ACTIVE }, agendaItems: { some: { caseRoomId, caseRoom: accessibleCaseWhere(user) } } },
    select: { id: true, title: true, scheduledAt: true, status: true },
    orderBy: { scheduledAt: "asc" },
  });
}

/** Cases the user may add to an agenda: open cases they can see, not already on it. */
export async function listCasesForAgenda(user: SessionUser, meetingId: string) {
  await findMeeting(prisma, user, meetingId);
  return prisma.caseRoom.findMany({
    where: { ...accessibleCaseWhere(user), status: { not: "CLOSED" }, agendaItems: { none: { meetingId } } },
    select: {
      id: true,
      title: true,
      patient: { select: { firstName: true, lastName: true, syntheticMedicalRecordNumber: true } },
      members: { where: { user: { deactivatedAt: null } }, select: { user: { select: personSelect } } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ---- Meetings ----

export async function createMeeting(user: SessionUser, organizationId: string, raw: MeetingInput) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  assertFormOrganization(user, organizationId);
  const input = meetingInputSchema.parse(raw);
  await assertActiveMembers(user, [input.chairId, input.secretaryId], "The chair and the secretary must be active members of the organization.");

  return prisma.$transaction(async (tx) => {
    const meeting = await tx.tumorBoardMeeting.create({
      data: {
        organizationId: user.organizationId,
        title: input.title,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes ?? null,
        location: input.location,
        chairId: input.chairId ?? null,
        secretaryId: input.secretaryId ?? null,
        createdById: user.id,
      },
    });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "meeting.created",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title, scheduledAt: meeting.scheduledAt.toISOString() },
    });
    return meeting;
  });
}

export async function updateMeeting(user: SessionUser, meetingId: string, raw: MeetingInput) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const input = meetingInputSchema.parse(raw);
  await assertActiveMembers(user, [input.chairId, input.secretaryId], "The chair and the secretary must be active members of the organization.");

  return prisma.$transaction(async (tx) => {
    await lockMeeting(tx, user, meetingId);
    const meeting = await tx.tumorBoardMeeting.update({
      where: { id: meetingId },
      data: {
        title: input.title,
        scheduledAt: new Date(input.scheduledAt),
        durationMinutes: input.durationMinutes ?? null,
        location: input.location,
        chairId: input.chairId ?? null,
        secretaryId: input.secretaryId ?? null,
      },
    });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "meeting.updated",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title, scheduledAt: meeting.scheduledAt.toISOString() },
    });
    return meeting;
  });
}

export async function startMeeting(user: SessionUser, meetingId: string) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  return prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, meetingId, ["SCHEDULED"]);
    const started = await tx.tumorBoardMeeting.update({ where: { id: meeting.id }, data: { status: "IN_PROGRESS", startedAt: new Date() } });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "meeting.started",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title },
    });
    return started;
  });
}

/** End the meeting. Cases that were not reached are recorded as deferred. */
export async function completeMeeting(user: SessionUser, meetingId: string) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  return prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, meetingId);
    const deferred = await tx.tumorBoardAgendaItem.updateMany({ where: { meetingId, status: "PENDING" }, data: { status: "DEFERRED" } });
    const now = new Date();
    const completed = await tx.tumorBoardMeeting.update({
      where: { id: meeting.id },
      data: { status: "COMPLETED", startedAt: meeting.startedAt ?? now, endedAt: now },
    });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "meeting.completed",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title, deferred: deferred.count },
    });
    return completed;
  });
}

export async function cancelMeeting(user: SessionUser, meetingId: string) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  return prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, meetingId, ["SCHEDULED"]);
    const cancelled = await tx.tumorBoardMeeting.update({ where: { id: meeting.id }, data: { status: "CANCELLED" } });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "meeting.cancelled",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title },
    });
    return cancelled;
  });
}

/** Replace the list of attendees (shown in the minutes). */
export async function setAttendance(user: SessionUser, meetingId: string, userIds: string[]) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const ids = [...new Set(z.array(z.string()).max(200).parse(userIds))];
  await assertActiveMembers(user, ids, "Attendees must be active members of the organization.");
  await prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, meetingId, ["SCHEDULED", "IN_PROGRESS", "COMPLETED"]);
    await tx.tumorBoardAttendee.deleteMany({ where: { meetingId, userId: { notIn: ids } } });
    await tx.tumorBoardAttendee.createMany({ data: ids.map((userId) => ({ meetingId, userId })), skipDuplicates: true });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      userId: user.id,
      action: "meeting.attendance_updated",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title, count: ids.length },
    });
  });
}

// ---- Agenda ----

export async function addAgendaItem(user: SessionUser, meetingId: string, raw: AgendaItemInput) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const input = agendaItemInputSchema.parse(raw);
  const room = await assertCaseAccess(user, input.caseRoomId);
  await assertPresenter(prisma, room.id, input.presenterId);

  const item = await prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, meetingId);
    if (await tx.tumorBoardAgendaItem.findUnique({ where: { meetingId_caseRoomId: { meetingId, caseRoomId: room.id } } })) {
      throw new ValidationError("This case is already on the agenda.");
    }
    const last = await tx.tumorBoardAgendaItem.findFirst({ where: { meetingId }, orderBy: { position: "desc" }, select: { position: true } });
    const item = await tx.tumorBoardAgendaItem.create({
      data: {
        meetingId,
        caseRoomId: room.id,
        position: (last?.position ?? 0) + 1,
        presenterId: input.presenterId ?? null,
        question: input.question,
        addedById: user.id,
      },
    });
    await postSystemMessage(tx, {
      caseRoomId: room.id,
      content: caseTextFor(user)("system.meeting.caseAdded", { name: user.name, meeting: meeting.title }),
      event: "meeting.case_added",
      refType: "meeting",
      refId: meeting.id,
    });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      caseRoomId: room.id,
      userId: user.id,
      action: "meeting.case_added",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title, patient: patientNameFor(user, room.patient) },
    });
    await touchCaseRoom(tx, room.id);
    return item;
  });
  await realtime.touch(room.id, ["case", "messages", "audit"], user.id);
  return item;
}

export async function updateAgendaItem(user: SessionUser, itemId: string, raw: z.input<typeof agendaItemUpdateSchema>) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const input = agendaItemUpdateSchema.parse(raw);
  const item = await findAgendaItem(user, itemId);
  await assertPresenter(prisma, item.caseRoomId, input.presenterId);
  return prisma.$transaction(async (tx) => {
    await lockMeeting(tx, user, item.meetingId, ["SCHEDULED", "IN_PROGRESS"]);
    return tx.tumorBoardAgendaItem.update({ where: { id: item.id }, data: { presenterId: input.presenterId ?? null, question: input.question } });
  });
}

/** Swap an item with its neighbour on the agenda. */
export async function moveAgendaItem(user: SessionUser, itemId: string, direction: "up" | "down") {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const item = await findAgendaItem(user, itemId);
  await prisma.$transaction(async (tx) => {
    await lockMeeting(tx, user, item.meetingId);
    const current = await tx.tumorBoardAgendaItem.findUniqueOrThrow({ where: { id: item.id }, select: { position: true } });
    const neighbour = await tx.tumorBoardAgendaItem.findFirst({
      where: { meetingId: item.meetingId, position: direction === "up" ? { lt: current.position } : { gt: current.position } },
      orderBy: { position: direction === "up" ? "desc" : "asc" },
      select: { id: true, position: true },
    });
    if (!neighbour) return;
    await tx.tumorBoardAgendaItem.update({ where: { id: item.id }, data: { position: neighbour.position } });
    await tx.tumorBoardAgendaItem.update({ where: { id: neighbour.id }, data: { position: current.position } });
  });
}

export async function removeAgendaItem(user: SessionUser, itemId: string) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const item = await findAgendaItem(user, itemId);
  await prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, item.meetingId);
    const current = await tx.tumorBoardAgendaItem.findUnique({ where: { id: item.id }, select: { status: true, decisionId: true } });
    if (!current) return;
    if (current.status !== "PENDING" || current.decisionId) throw new ValidationError("A case that was already discussed stays on the agenda.");
    await tx.tumorBoardAgendaItem.delete({ where: { id: item.id } });
    await recordAudit(tx, {
      organizationId: user.organizationId,
      caseRoomId: item.caseRoomId,
      userId: user.id,
      action: "meeting.case_removed",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title },
    });
  });
  await realtime.touch(item.caseRoomId, ["case", "audit"], user.id);
}

/**
 * Record the board's outcome for one case, during the meeting or afterwards
 * (to complete the minutes). The first time a case is marked discussed or
 * deferred, the care team sees it in the case discussion and timeline.
 */
export async function recordOutcome(user: SessionUser, itemId: string, raw: OutcomeInput) {
  assertCan(user, "meeting.manage", MANAGE_DENIED);
  const input = outcomeSchema.parse(raw);
  const item = await findAgendaItem(user, itemId);

  await prisma.$transaction(async (tx) => {
    const meeting = await lockMeeting(tx, user, item.meetingId, ["IN_PROGRESS", "COMPLETED"]);
    await lockRow(tx, "CaseRoom", item.caseRoomId);
    const current = await tx.tumorBoardAgendaItem.findUniqueOrThrow({ where: { id: item.id } });
    const brief = current.briefId
      ? null
      : await tx.caseBrief.findFirst({ where: { caseRoomId: item.caseRoomId, type: "TUMOR_BOARD" }, orderBy: { createdAt: "desc" }, select: { id: true } });
    const statusChanged = current.status !== input.status;
    await tx.tumorBoardAgendaItem.update({
      where: { id: item.id },
      data: {
        status: input.status,
        summary: input.summary,
        conclusion: input.conclusion,
        discussedAt: statusChanged || !current.discussedAt ? new Date() : current.discussedAt,
        ...(brief ? { briefId: brief.id } : {}),
      },
    });

    if (statusChanged) {
      const t = caseTextFor(user);
      if (input.status === "DISCUSSED") {
        await postSystemMessage(tx, {
          caseRoomId: item.caseRoomId,
          content: t("system.meeting.discussed", { meeting: meeting.title, conclusion: excerpt(input.conclusion ?? "") }),
          event: "meeting.outcome_recorded",
          refType: "meeting",
          refId: meeting.id,
        });
        await tx.timelineEvent.create({
          data: {
            caseRoomId: item.caseRoomId,
            date: startOfTodayUtc(),
            eventType: "CONSULTATION",
            title: t("system.timeline.meetingDiscussed.title"),
            description: t("system.timeline.meetingDiscussed.description", { meeting: meeting.title, conclusion: excerpt(input.conclusion ?? "") }),
            createdById: user.id,
          },
        });
      } else {
        await postSystemMessage(tx, {
          caseRoomId: item.caseRoomId,
          content: t("system.meeting.deferred", { name: user.name, meeting: meeting.title }),
          event: "meeting.outcome_recorded",
          refType: "meeting",
          refId: meeting.id,
        });
      }
    }
    await recordAudit(tx, {
      organizationId: user.organizationId,
      caseRoomId: item.caseRoomId,
      userId: user.id,
      action: "meeting.outcome_recorded",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: meeting.title, status: input.status },
    });
    await touchCaseRoom(tx, item.caseRoomId);
  });
  await realtime.touch(item.caseRoomId, ["case", "messages", "timeline", "audit"], user.id);
}

/**
 * Link a decision proposed from a meeting outcome to its agenda item, inside
 * the decision's own transaction (the CaseRoom lock is already held).
 */
export async function linkDecisionToAgendaItem(tx: TransactionClient, user: SessionUser, input: { agendaItemId: string; caseRoomId: string; decisionId: string }) {
  const linked = await tx.tumorBoardAgendaItem.updateMany({
    where: {
      id: input.agendaItemId,
      caseRoomId: input.caseRoomId,
      decisionId: null,
      meeting: { organizationId: user.organizationId, status: { not: "CANCELLED" } },
    },
    data: { decisionId: input.decisionId },
  });
  if (linked.count !== 1) throw new ValidationError("This agenda item already has a decision, or it is not part of this case.");
}

// ---- Minutes ----

/** Everything the printed minutes show, for the cases the user may see. */
export async function getMeetingMinutes(user: SessionUser, meetingId: string) {
  const meeting = await getMeeting(user, meetingId);
  if (!meeting) return null;
  const decisionIds = meeting.agendaItems.flatMap((item) => (item.decision ? [item.decision.id] : []));
  const tasks = await prisma.task.findMany({
    where: { decisionId: { in: decisionIds } },
    select: { id: true, title: true, decisionId: true, dueDate: true, status: true, assignedTo: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return { ...meeting, tasks };
}

function excerpt(text: string, max = 280): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export type MeetingListItem = Awaited<ReturnType<typeof listMeetings>>[number];
