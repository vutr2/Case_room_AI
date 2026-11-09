"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { runAction } from "../action-result";
import { requireUser } from "../auth/session";
import {
  addAgendaItem,
  cancelMeeting,
  completeMeeting,
  createMeeting,
  moveAgendaItem,
  recordOutcome,
  removeAgendaItem,
  setAttendance,
  startMeeting,
  updateAgendaItem,
  updateMeeting,
  type agendaItemUpdateSchema,
  type AgendaItemInput,
  type MeetingInput,
  type OutcomeInput,
} from "../services/meetings";

/** Meeting pages, the dashboard card and the case pages that show the next meeting. */
function revalidateMeeting(meetingId: string, caseRoomId?: string) {
  revalidatePath("/meetings");
  revalidatePath(`/meetings/${meetingId}`, "layout");
  revalidatePath("/dashboard");
  if (caseRoomId) revalidatePath(`/cases/${caseRoomId}`, "layout");
}

export async function createMeetingAction(organizationId: string, input: MeetingInput) {
  return runAction(async () => {
    const user = await requireUser();
    const meeting = await createMeeting(user, organizationId, input);
    revalidateMeeting(meeting.id);
    return { id: meeting.id };
  });
}

export async function updateMeetingAction(meetingId: string, input: MeetingInput) {
  return runAction(async () => {
    const user = await requireUser();
    await updateMeeting(user, meetingId, input);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function startMeetingAction(meetingId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await startMeeting(user, meetingId);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function completeMeetingAction(meetingId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await completeMeeting(user, meetingId);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function cancelMeetingAction(meetingId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await cancelMeeting(user, meetingId);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function setAttendanceAction(meetingId: string, userIds: string[]) {
  return runAction(async () => {
    const user = await requireUser();
    await setAttendance(user, meetingId, userIds);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function addAgendaItemAction(meetingId: string, input: AgendaItemInput) {
  return runAction(async () => {
    const user = await requireUser();
    const item = await addAgendaItem(user, meetingId, input);
    revalidateMeeting(meetingId, item.caseRoomId);
    return { id: item.id };
  });
}

export async function updateAgendaItemAction(meetingId: string, itemId: string, input: z.input<typeof agendaItemUpdateSchema>) {
  return runAction(async () => {
    const user = await requireUser();
    await updateAgendaItem(user, itemId, input);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function moveAgendaItemAction(meetingId: string, itemId: string, direction: "up" | "down") {
  return runAction(async () => {
    const user = await requireUser();
    await moveAgendaItem(user, itemId, direction);
    revalidateMeeting(meetingId);
    return null;
  });
}

export async function removeAgendaItemAction(meetingId: string, caseRoomId: string, itemId: string) {
  return runAction(async () => {
    const user = await requireUser();
    await removeAgendaItem(user, itemId);
    revalidateMeeting(meetingId, caseRoomId);
    return null;
  });
}

export async function recordOutcomeAction(meetingId: string, caseRoomId: string, itemId: string, input: OutcomeInput) {
  return runAction(async () => {
    const user = await requireUser();
    await recordOutcome(user, itemId, input);
    revalidateMeeting(meetingId, caseRoomId);
    return null;
  });
}
