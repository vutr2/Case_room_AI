import { at, audit, type SeedContext } from "./helpers";

type When = [number, string];

interface AgendaItemSpec {
  caseRoomId: string;
  presenter: string;
  question: string;
  addedBy: string;
  added: When;
  outcome?: { summary: string; conclusion: string; discussed: When; linkDecision?: boolean };
}

export interface MeetingSpec {
  title: string;
  at: When;
  durationMinutes: number;
  location: string;
  chair: string;
  secretary: string;
  createdBy: string;
  created: When;
  /** A completed meeting is started at `at` and ended `durationMinutes` later. */
  completed?: boolean;
  attendees?: string[];
  items: AgendaItemSpec[];
}

/**
 * A tumor board meeting with its agenda, attendance and (for a past meeting)
 * the outcomes, linked to the decision each case's team proposed afterwards.
 */
export async function seedMeeting(ctx: SeedContext, spec: MeetingSpec) {
  const user = (key: string) => {
    const found = ctx.users[key];
    if (!found) throw new Error(`Unknown seed user: ${key}`);
    return found;
  };
  const scheduledAt = at(...spec.at);
  const endedAt = new Date(scheduledAt.getTime() + spec.durationMinutes * 60_000);

  const meeting = await ctx.prisma.tumorBoardMeeting.create({
    data: {
      organizationId: ctx.org.id,
      title: spec.title,
      scheduledAt,
      durationMinutes: spec.durationMinutes,
      location: spec.location,
      status: spec.completed ? "COMPLETED" : "SCHEDULED",
      chairId: user(spec.chair).id,
      secretaryId: user(spec.secretary).id,
      startedAt: spec.completed ? scheduledAt : null,
      endedAt: spec.completed ? endedAt : null,
      createdById: user(spec.createdBy).id,
      createdAt: at(...spec.created),
    },
  });
  await audit(ctx, {
    userId: user(spec.createdBy).id,
    action: "meeting.created",
    resourceType: "TumorBoardMeeting",
    resourceId: meeting.id,
    metadata: { title: spec.title, scheduledAt: scheduledAt.toISOString() },
    createdAt: at(...spec.created),
  });

  for (const [index, item] of spec.items.entries()) {
    const decision = item.outcome?.linkDecision ? await ctx.prisma.decision.findFirst({ where: { caseRoomId: item.caseRoomId }, orderBy: { number: "asc" } }) : null;
    const brief = item.outcome
      ? await ctx.prisma.caseBrief.findFirst({ where: { caseRoomId: item.caseRoomId, type: "TUMOR_BOARD" }, orderBy: { createdAt: "desc" }, select: { id: true } })
      : null;
    await ctx.prisma.tumorBoardAgendaItem.create({
      data: {
        meetingId: meeting.id,
        caseRoomId: item.caseRoomId,
        position: index + 1,
        presenterId: user(item.presenter).id,
        question: item.question,
        status: item.outcome ? "DISCUSSED" : "PENDING",
        summary: item.outcome?.summary ?? null,
        conclusion: item.outcome?.conclusion ?? null,
        decisionId: decision?.id ?? null,
        briefId: brief?.id ?? null,
        discussedAt: item.outcome ? at(...item.outcome.discussed) : null,
        addedById: user(item.addedBy).id,
        createdAt: at(...item.added),
      },
    });
    await audit(ctx, {
      caseRoomId: item.caseRoomId,
      userId: user(item.addedBy).id,
      action: "meeting.case_added",
      resourceType: "TumorBoardMeeting",
      resourceId: meeting.id,
      metadata: { title: spec.title },
      createdAt: at(...item.added),
    });
    if (item.outcome) {
      await audit(ctx, {
        caseRoomId: item.caseRoomId,
        userId: user(spec.secretary).id,
        action: "meeting.outcome_recorded",
        resourceType: "TumorBoardMeeting",
        resourceId: meeting.id,
        metadata: { title: spec.title, status: "DISCUSSED" },
        createdAt: at(...item.outcome.discussed),
      });
    }
  }

  if (spec.attendees?.length) {
    await ctx.prisma.tumorBoardAttendee.createMany({ data: spec.attendees.map((key) => ({ meetingId: meeting.id, userId: user(key).id, createdAt: scheduledAt })) });
  }
  if (spec.completed) {
    await audit(ctx, { userId: user(spec.secretary).id, action: "meeting.started", resourceType: "TumorBoardMeeting", resourceId: meeting.id, metadata: { title: spec.title }, createdAt: scheduledAt });
    await audit(ctx, { userId: user(spec.secretary).id, action: "meeting.completed", resourceType: "TumorBoardMeeting", resourceId: meeting.id, metadata: { title: spec.title, deferred: 0 }, createdAt: endedAt });
  }
  return meeting;
}
