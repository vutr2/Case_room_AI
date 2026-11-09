import "server-only";
import type { CasePermissions } from "@/components/case/case-actions";
import type { SessionUser } from "./auth/session";
import { can } from "./authz/permissions";

/** What the user may do in a case, for the case pages' client components. */
export function casePermissions(user: SessionUser): CasePermissions {
  return {
    manageCase: can(user, "case.manage"),
    uploadDocument: can(user, "document.upload"),
    editTimeline: can(user, "timeline.edit"),
    postMessage: can(user, "message.post"),
    askAI: can(user, "ai.ask"),
    generateBrief: can(user, "brief.generate"),
    approveBrief: can(user, "brief.approve"),
    generateHandoff: can(user, "handoff.generate"),
    approveHandoff: can(user, "handoff.approve"),
    createDecision: can(user, "decision.create"),
    reviewDecision: can(user, "decision.review"),
    manageTasks: can(user, "task.manage"),
  };
}
