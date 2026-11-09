import { CASE_STATUSES, DOCUMENT_TYPES, TASK_STATUSES, USER_ROLES, type ActorType, type CaseStatus, type DocumentType, type TaskStatus, type UserRole } from "@ccr/types";
import type { Translator } from "@/i18n/translate";

/**
 * Human-readable sentences for audit events ("Dr. Nguyen uploaded a pathology
 * report."), in the reader's language. Shared by the dashboard activity feed
 * and the audit log views.
 */

export type ActivityKind = "ai" | "decision" | "document" | "task" | "case" | "brief" | "message" | "auth" | "org" | "meeting";

export interface ActivityInput {
  action: string;
  actorType: ActorType;
  metadata: unknown;
  user: { name: string } | null;
}

/** Clinician titles kept in short names: "Dr. Minh Nguyen" -> "Dr. Nguyen", "BS. Trần Minh Khoa" -> "BS. Khoa". */
const TITLES = ["Dr. ", "BS. ", "ThS. ", "TS. "];

/** A clinician's title with their given name (the last word, in English and Vietnamese order); other names are kept as-is. */
export function shortName(name: string | null | undefined): string {
  if (!name) return "Someone";
  const title = TITLES.find((prefix) => name.startsWith(prefix));
  if (title) {
    const parts = name.slice(title.length).trim().split(/\s+/);
    return `${title}${parts.at(-1)}`;
  }
  return name;
}

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? "an" : "a";
}

function meta(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function oneOf<T extends string>(values: readonly T[], value: unknown): T | null {
  return typeof value === "string" && (values as readonly string[]).includes(value) ? (value as T) : null;
}

export function describeActivity(event: ActivityInput, t: Translator): { text: string; kind: ActivityKind } {
  const m = meta(event.metadata);
  const who = event.user?.name ? shortName(event.user.name) : t("activity.someone");
  const title = str(m.title);
  const quoted = title ? ` “${title}”` : "";
  const quotedOr = (fallback: "activity.aDocument" | "activity.aBrief") => quoted || ` ${t(fallback)}`;
  const decision = typeof m.number === "number" ? t("activity.decisionNumber", { number: m.number }) : t("activity.aDecision");
  const docType = oneOf<DocumentType>(DOCUMENT_TYPES, m.documentType);
  const docLabel = docType ? t(`enum.documentType.${docType}`).toLowerCase() : t("activity.document");
  const document = t.locale === "en" ? `${article(docLabel)} ${docLabel}` : docLabel;
  const member = str(m.memberName) ?? t("activity.aMember");
  const caseStatus = oneOf<CaseStatus>(CASE_STATUSES, m.to);
  const taskStatus = oneOf<TaskStatus>(TASK_STATUSES, m.to);
  const role = oneOf<UserRole>(USER_ROLES, m.to);
  const lower = (text: string) => (t.locale === "en" ? text.toLowerCase() : text.charAt(0).toLowerCase() + text.slice(1));

  switch (event.action) {
    case "auth.signed_in":
      return { text: t("activity.signedIn", { who }), kind: "auth" };
    case "org.created":
      return { text: t("activity.orgCreated", { who }), kind: "org" };
    case "org.member_added":
      return { text: t("activity.memberAdded", { who, member }), kind: "org" };
    case "org.member_invited":
      return { text: t("activity.memberInvited", { who, email: str(m.email) ?? t("activity.aNewMember") }), kind: "org" };
    case "org.invitation_revoked":
      return { text: t("activity.invitationRevoked", { who, email: str(m.email) ?? t("activity.aUser") }), kind: "org" };
    case "org.invitation_accepted":
      return { text: t("activity.invitationAccepted", { who }), kind: "org" };
    case "org.member_role_changed":
      return { text: t("activity.roleChanged", { who, member, role: role ? t(`enum.role.${role}`) : (str(m.to) ?? t("activity.aNewRole")) }), kind: "org" };
    case "org.member_deactivated":
      return { text: t("activity.memberDeactivated", { who, member }), kind: "org" };
    case "org.member_reactivated":
      return { text: t("activity.memberReactivated", { who, member }), kind: "org" };
    case "org.renamed":
      return { text: t("activity.orgRenamed", { who, name: str(m.to) ?? t("activity.aNewName") }), kind: "org" };
    case "org.locale_changed":
      return { text: t("activity.orgLanguage", { who, language: str(m.toName) ?? str(m.to) ?? "" }), kind: "org" };
    case "account.password_changed":
      return { text: t("activity.passwordChanged", { who }), kind: "auth" };
    case "account.password_reset":
      return { text: t("activity.passwordReset", { who }), kind: "auth" };
    case "account.profile_updated":
      return { text: t("activity.profileUpdated", { who }), kind: "auth" };
    case "case.created":
      return { text: t("activity.caseCreated", { who, quoted }), kind: "case" };
    case "case.status_changed":
      return { text: t("activity.caseStatus", { who, status: caseStatus ? lower(t(`enum.caseStatus.${caseStatus}`)) : String(m.to ?? "") }), kind: "case" };
    case "case.member_added":
      return { text: t("activity.caseMemberAdded", { who, member: str(m.memberName) ? shortName(str(m.memberName)) : t("activity.aMember") }), kind: "case" };
    case "document.uploaded":
      return { text: t("activity.documentUploaded", { who, document, quoted }), kind: "document" };
    case "ai.document_processed":
      return { text: t("activity.documentProcessed", { quoted: quotedOr("activity.aDocument") }), kind: "ai" };
    case "ai.document_failed":
      return { text: t("activity.documentFailed", { quoted: quotedOr("activity.aDocument") }), kind: "ai" };
    case "timeline.event_added":
      return { text: t("activity.timelineEventAdded", { who, quoted }), kind: "case" };
    case "ai.timeline_generated":
      return { text: t("activity.timelineGenerated", { count: String(m.events ?? "") }), kind: "ai" };
    case "message.posted":
      return { text: t("activity.messagePosted", { who }), kind: "message" };
    case "ai.question_asked":
      return {
        text: str(m.question) ? t("activity.questionAsked", { who, question: String(m.question).slice(0, 90) }) : t("activity.questionAskedNoText", { who }),
        kind: "ai",
      };
    case "ai.answer_generated":
      return { text: t.plural("activity.answerGenerated", typeof m.sources === "number" ? m.sources : 0, { who }), kind: "ai" };
    case "ai.answer_failed":
      return { text: t("activity.answerFailed", { who }), kind: "ai" };
    case "ai.summary_generated":
      return { text: t("activity.summaryGenerated", { who }), kind: "ai" };
    case "summary.reviewed":
      return { text: t("activity.summaryReviewed", { who }), kind: "brief" };
    case "tumor_board.generated":
      return { text: t("activity.tumorBoardGenerated", { who }), kind: "ai" };
    case "handoff.generated":
      return { text: t("activity.handoffGenerated", { who }), kind: "ai" };
    case "brief.edited":
      return { text: t("activity.briefEdited", { who, quoted: quotedOr("activity.aBrief") }), kind: "brief" };
    case "brief.approved":
      return { text: t("activity.briefApproved", { who, quoted: quotedOr("activity.aBrief") }), kind: "brief" };
    case "decision.proposed":
      return { text: t("activity.decisionProposed", { who, decision, detail: title ? `: ${title}` : "" }), kind: "decision" };
    case "decision.revised":
      return { text: t("activity.decisionRevised", { who, decision }), kind: "decision" };
    case "decision.approved":
      return { text: t("activity.decisionApproved", { who, decision, detail: title ? ` (${title})` : "" }), kind: "decision" };
    case "decision.rejected":
      return { text: t("activity.decisionRejected", { who, decision }), kind: "decision" };
    case "decision.changes_requested":
      return { text: t("activity.decisionChangesRequested", { who, decision }), kind: "decision" };
    case "decision.finalized":
      return { text: t("activity.decisionFinalized", { decision }), kind: "decision" };
    case "ai.tasks_suggested":
      return { text: t("activity.tasksSuggested", { decision }), kind: "ai" };
    case "task.created":
      return { text: t("activity.taskCreated", { who, quoted, suggested: m.aiSuggested ? ` ${t("activity.aiSuggestedSuffix")}` : "" }), kind: "task" };
    case "task.status_changed":
      return { text: t("activity.taskStatus", { who, quoted, status: taskStatus ? lower(t(`enum.taskStatus.${taskStatus}`)) : String(m.to ?? "") }), kind: "task" };
    case "task.completed":
      return { text: t("activity.taskCompleted", { who, quoted }), kind: "task" };
    case "meeting.created":
      return { text: t("activity.meetingCreated", { who, quoted }), kind: "meeting" };
    case "meeting.updated":
      return { text: t("activity.meetingUpdated", { who, quoted }), kind: "meeting" };
    case "meeting.started":
      return { text: t("activity.meetingStarted", { who, quoted }), kind: "meeting" };
    case "meeting.completed":
      return { text: t("activity.meetingCompleted", { who, quoted }), kind: "meeting" };
    case "meeting.cancelled":
      return { text: t("activity.meetingCancelled", { who, quoted }), kind: "meeting" };
    case "meeting.attendance_updated":
      return { text: t("activity.meetingAttendance", { who, quoted }), kind: "meeting" };
    case "meeting.case_added":
      return { text: t("activity.meetingCaseAdded", { who, quoted }), kind: "meeting" };
    case "meeting.case_removed":
      return { text: t("activity.meetingCaseRemoved", { who, quoted }), kind: "meeting" };
    case "meeting.outcome_recorded":
      return { text: m.status === "DEFERRED" ? t("activity.meetingDeferred", { who, quoted }) : t("activity.meetingDiscussed", { who, quoted }), kind: "meeting" };
    default:
      return { text: t("activity.fallback", { who, action: event.action }), kind: event.actorType === "AI" ? "ai" : "case" };
  }
}
