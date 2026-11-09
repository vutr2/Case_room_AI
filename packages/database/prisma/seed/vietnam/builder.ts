import type {
  AIAnswerMetadata,
  ApprovalStatus,
  CaseMemory,
  CaseSummaryContent,
  DecisionStatus,
  SectionsContent,
  SourceRef,
  TimelineEventType,
} from "@ccr/types";
import { caseMemorySchema, caseSummaryContentSchema, sectionsContentSchema } from "@ccr/types";
import type { ClinicalDocument } from "../../../src/generated/prisma/client";
import type { CaseSpec } from "../case-builder";
import { at, audit, day, dobForAge, docRef, iso, json, type SeedContext } from "../helpers";

/**
 * Cases of the Vietnamese demo hospital. The offline demo engine reads English
 * reports only, so everything the AI would have produced (timeline, answers,
 * case summary, tumor board brief, shared memory) is written out here, in
 * Vietnamese, and stored as pre-generated demo content ("demo-seed").
 */

export const SYNTHETIC_HEADER_VI = "HỒ SƠ DEMO GIẢ LẬP - KHÔNG PHẢI BỆNH NHÂN THẬT";

/** "05/11/2026": dates inside Vietnamese documents. */
export function ngay(date: Date): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${date.getUTCFullYear()}`;
}

/** As the application formats dates in Vietnamese (brief titles). */
function viDate(date: Date): string {
  return date.toLocaleDateString("vi-VN", { month: "short", day: "numeric", year: "numeric" });
}

/** The application's Vietnamese system messages (apps/web vi.ts, "system.*"). */
const SYSTEM = {
  caseCreated: (name: string) => `${name} đã tạo ca bệnh này.`,
  decisionProposed: (name: string, number: number, title: string, reviewers: string) =>
    `${name} đã đề xuất Quyết định #${number}: ${title}. Người duyệt: ${reviewers}.`,
  review: (name: string, status: ApprovalStatus, number: number, comment?: string) => {
    const verb = status === "APPROVED" ? "đã phê duyệt" : status === "REJECTED" ? "đã từ chối" : "đã yêu cầu chỉnh sửa";
    return comment ? `${name} ${verb} Quyết định #${number}: “${comment}”` : `${name} ${verb} Quyết định #${number}.`;
  },
  decisionFinal: (number: number, count: number) =>
    `Quyết định #${number} đã được cả ${count} người duyệt phê duyệt và được ghi nhận là quyết định cuối cùng do con người phê duyệt.`,
  proposedTitle: (number: number) => `Quyết định #${number} được đề xuất`,
  proposedDescription: (title: string, name: string) => `${title}, do ${name} đề xuất để hội chẩn đa chuyên khoa.`,
  approvedTitle: (number: number) => `Quyết định #${number} được phê duyệt`,
  approvedDescription: (title: string) => `${title}. Quyết định cuối cùng do con người phê duyệt sau khi nhóm điều trị xem xét.`,
  summaryTitle: "Tóm tắt ca bệnh do AI tạo",
  tumorBoardTitle: (date: Date) => `Bản tóm tắt hội chẩn: ${viDate(date)}`,
};

/** Lets case content point at this case's documents. */
export interface Sources {
  /** Source reference to a document; an `excerpt` must be copied verbatim from it. */
  ref(key: string, excerpt?: string): SourceRef;
  /** Id of a document (shared memory). */
  id(key: string): string;
  /** ISO date of a document. */
  date(key: string): string;
}

type When = [number, string];

export interface VietnameseCaseSpec {
  patient: CaseSpec["patient"];
  room: CaseSpec["room"];
  members: CaseSpec["members"];
  documents: CaseSpec["documents"];
  /** What the AI extracted from each document into the timeline. */
  timeline: Array<{ doc: string; type: TimelineEventType; title: string; description: string }>;
  discussion: Array<
    | { author: string; at: When; content: string; mentions?: string[] }
    | {
        author: string;
        at: When;
        askAI: string;
        answer: string;
        /** Document keys with a verbatim excerpt, in the order the answer cites them ([1], [2], ...). */
        sources: Array<[key: string, excerpt?: string]>;
        confidence: AIAnswerMetadata["confidence"];
        limitations: string;
      }
  >;
  decision?: {
    title: string;
    description: string;
    rationale: string;
    status: DecisionStatus;
    createdBy: string;
    created: When;
    sources: string[];
    approvals: Array<{ reviewer: string; status: ApprovalStatus; comment?: string; responded?: When }>;
    finalized?: When;
  };
  tasks: CaseSpec["tasks"];
  summary: { status: "DRAFT" | "APPROVED"; requestedBy: string; at: When; approvedBy?: string; approvedAt?: When; content: (s: Sources) => Omit<CaseSummaryContent, "kind"> };
  tumorBoard?: { requestedBy: string; at: When; approvedBy?: string; approvedAt?: When; content: (s: Sources) => Omit<SectionsContent, "kind"> };
  memory: (s: Sources) => Omit<CaseMemory, "processedDocumentIds" | "updatedAt">;
}

const PROVIDER = { provider: "demo-seed", model: "seed" } as const;

export async function seedVietnameseCase(ctx: SeedContext, spec: VietnameseCaseSpec) {
  const { prisma, org, users } = ctx;
  const u = (key: string) => {
    const user = users[key];
    if (!user) throw new Error(`Unknown seed user ${key}`);
    return user;
  };
  const creator = u(spec.room.createdBy);

  const patient = await prisma.patient.create({
    data: {
      syntheticMedicalRecordNumber: spec.patient.mrn,
      firstName: spec.patient.firstName,
      lastName: spec.patient.lastName,
      dateOfBirth: dobForAge(spec.patient.age, spec.patient.birthdayMonthsAgo),
      sex: spec.patient.sex,
      primaryDiagnosis: spec.patient.primaryDiagnosis,
      status: spec.patient.status,
      organizationId: org.id,
      createdAt: at(...spec.room.created),
    },
  });
  const room = await prisma.caseRoom.create({
    data: {
      patientId: patient.id,
      organizationId: org.id,
      title: spec.room.title,
      specialty: spec.room.specialty,
      status: spec.room.status,
      createdById: creator.id,
      createdAt: at(...spec.room.created),
    },
  });
  const caseRoomId = room.id;
  // Family name first, as the application writes Vietnamese names.
  const patientName = `${patient.lastName} ${patient.firstName}`;
  await audit(ctx, { caseRoomId, userId: creator.id, action: "case.created", resourceType: "CaseRoom", resourceId: caseRoomId, metadata: { title: room.title, patient: patientName }, createdAt: at(...spec.room.created) });

  await prisma.caseRoomMember.create({ data: { caseRoomId, userId: creator.id, joinedAt: at(...spec.room.created) } });
  for (const [key, days, time] of spec.members) {
    await prisma.caseRoomMember.create({ data: { caseRoomId, userId: u(key).id, addedById: creator.id, joinedAt: at(days, time) } });
    await audit(ctx, { caseRoomId, userId: creator.id, action: "case.member_added", resourceType: "User", resourceId: u(key).id, metadata: { memberName: u(key).name, specialty: u(key).specialty }, createdAt: at(days, time) });
  }

  // ── Documents ────────────────────────────────────────────────────────────
  const docs: Record<string, ClinicalDocument> = {};
  for (const input of spec.documents) {
    const uploadedAt = at(input.days, input.time);
    const doc = await prisma.clinicalDocument.create({
      data: {
        caseRoomId,
        type: input.type,
        title: input.title,
        rawText: input.text,
        uploadedById: u(input.uploadedBy).id,
        documentDate: day(input.days),
        createdAt: uploadedAt,
        processingStatus: "COMPLETED",
        processedAt: new Date(uploadedAt.getTime() + 20_000),
        fileName: `${input.key}.txt`,
        mimeType: "text/plain",
        fileSize: Buffer.byteLength(input.text),
      },
    });
    docs[input.key] = doc;
    await audit(ctx, { caseRoomId, userId: u(input.uploadedBy).id, action: "document.uploaded", resourceType: "ClinicalDocument", resourceId: doc.id, metadata: { title: doc.title, documentType: doc.type }, createdAt: uploadedAt });
    await audit(ctx, { caseRoomId, userId: u(input.uploadedBy).id, actorType: "AI", action: "ai.document_processed", resourceType: "ClinicalDocument", resourceId: doc.id, metadata: { title: doc.title, timelineEvents: 1, provider: PROVIDER.provider }, createdAt: new Date(uploadedAt.getTime() + 20_000) });
  }
  const doc = (key: string) => {
    const found = docs[key];
    if (!found) throw new Error(`Unknown document ${key} in ${spec.room.title}`);
    return found;
  };
  const sources: Sources = { ref: (key, excerpt) => docRef(doc(key), excerpt), id: (key) => doc(key).id, date: (key) => iso(doc(key).documentDate) };

  for (const event of spec.timeline) {
    const source = doc(event.doc);
    await prisma.timelineEvent.create({
      data: {
        caseRoomId,
        date: source.documentDate,
        eventType: event.type,
        title: event.title,
        description: event.description,
        sourceDocumentId: source.id,
        createdByAI: true,
        createdAt: new Date(source.createdAt.getTime() + 20_000),
      },
    });
  }

  // ── Discussion and decision, in time order ───────────────────────────────
  type Entry = { at: Date; write: () => Promise<unknown> };
  const entries: Entry[] = [];
  const system = (when: Date, content: string, event: string, refId: string | null = null) =>
    entries.push({
      at: when,
      write: () => prisma.message.create({ data: { caseRoomId, type: "SYSTEM", content, createdAt: when, metadata: json({ kind: "system", event, refType: refId ? "decision" : null, refId }) } }),
    });
  system(at(...spec.room.created), SYSTEM.caseCreated(creator.name), "case.created");

  for (const item of spec.discussion) {
    const when = at(...item.at);
    if ("askAI" in item) {
      entries.push({
        at: when,
        write: async () => {
          const question = await prisma.message.create({
            data: { caseRoomId, authorId: u(item.author).id, type: "USER", content: `@AI ${item.askAI}`, createdAt: when, metadata: json({ kind: "user", mentionedUserIds: [], mentionsAI: true }) },
          });
          await audit(ctx, { caseRoomId, userId: u(item.author).id, action: "ai.question_asked", resourceType: "Message", resourceId: question.id, metadata: { question: item.askAI }, createdAt: when });
          const metadata: AIAnswerMetadata = {
            kind: "ai_answer",
            question: item.askAI,
            questionMessageId: question.id,
            requestedById: u(item.author).id,
            sources: item.sources.map(([key, excerpt]) => sources.ref(key, excerpt)),
            confidence: item.confidence,
            limitations: item.limitations,
            ...PROVIDER,
            droppedCitations: 0,
            latencyMs: 2600,
          };
          const answer = await prisma.message.create({
            data: { caseRoomId, type: "AI", content: item.answer, createdAt: new Date(when.getTime() + 20_000), metadata: json(metadata) },
          });
          await audit(ctx, { caseRoomId, userId: u(item.author).id, actorType: "AI", action: "ai.answer_generated", resourceType: "Message", resourceId: answer.id, metadata: { sources: metadata.sources.length, confidence: item.confidence }, createdAt: answer.createdAt });
        },
      });
    } else {
      entries.push({
        at: when,
        write: () =>
          prisma.message.create({
            data: {
              caseRoomId,
              authorId: u(item.author).id,
              type: "USER",
              content: item.content,
              createdAt: when,
              metadata: json({ kind: "user", mentionedUserIds: (item.mentions ?? []).map((key) => u(key).id), mentionsAI: false }),
            },
          }),
      });
    }
  }

  let decisionId: string | null = null;
  if (spec.decision) {
    const d = spec.decision;
    const proposer = u(d.createdBy);
    const decision = await prisma.decision.create({
      data: {
        caseRoomId,
        number: 1,
        title: d.title,
        description: d.description,
        rationale: d.rationale,
        status: d.status,
        createdById: proposer.id,
        createdAt: at(...d.created),
        finalizedAt: d.finalized ? at(...d.finalized) : null,
        sources: { create: d.sources.map((key) => ({ documentId: doc(key).id })) },
      },
    });
    decisionId = decision.id;
    await prisma.timelineEvent.create({
      data: { caseRoomId, date: day(d.created[0]), eventType: "DECISION", title: SYSTEM.proposedTitle(decision.number), description: SYSTEM.proposedDescription(d.title, proposer.name), createdById: proposer.id, createdAt: at(...d.created) },
    });
    system(at(...d.created), SYSTEM.decisionProposed(proposer.name, decision.number, d.title, d.approvals.map((a) => u(a.reviewer).name).join(", ")), "decision.proposed", decision.id);
    await audit(ctx, { caseRoomId, userId: proposer.id, action: "decision.proposed", resourceType: "Decision", resourceId: decision.id, metadata: { number: decision.number, title: d.title }, createdAt: at(...d.created) });

    for (const approval of d.approvals) {
      await prisma.approval.create({
        data: {
          decisionId: decision.id,
          userId: u(approval.reviewer).id,
          status: approval.status,
          comment: approval.comment ?? null,
          createdAt: at(...d.created),
          respondedAt: approval.responded ? at(...approval.responded) : null,
        },
      });
      if (approval.status === "PENDING" || !approval.responded) continue;
      const event = approval.status === "APPROVED" ? "decision.approved" : approval.status === "REJECTED" ? "decision.rejected" : "decision.changes_requested";
      system(at(...approval.responded), SYSTEM.review(u(approval.reviewer).name, approval.status, decision.number, approval.comment), event, decision.id);
      await audit(ctx, { caseRoomId, userId: u(approval.reviewer).id, action: event, resourceType: "Decision", resourceId: decision.id, metadata: { number: decision.number, title: d.title, comment: approval.comment ?? null }, createdAt: at(...approval.responded) });
    }
    if (d.status === "APPROVED" && d.finalized) {
      system(at(...d.finalized), SYSTEM.decisionFinal(decision.number, d.approvals.length), "decision.finalized", decision.id);
      await prisma.timelineEvent.create({
        data: { caseRoomId, date: day(d.finalized[0]), eventType: "DECISION", title: SYSTEM.approvedTitle(decision.number), description: SYSTEM.approvedDescription(d.title), createdAt: at(...d.finalized) },
      });
      await audit(ctx, { caseRoomId, userId: null, actorType: "SYSTEM", action: "decision.finalized", resourceType: "Decision", resourceId: decision.id, metadata: { number: decision.number, title: d.title }, createdAt: at(...d.finalized) });
    }
  }

  for (const entry of entries.sort((a, b) => a.at.getTime() - b.at.getTime())) await entry.write();

  // ── Tasks ────────────────────────────────────────────────────────────────
  for (const task of spec.tasks) {
    const created = await prisma.task.create({
      data: {
        caseRoomId,
        title: task.title,
        description: task.description ?? null,
        assignedToId: u(task.assignee).id,
        createdById: u(task.creator).id,
        status: task.status,
        priority: task.priority,
        dueDate: day(task.due),
        createdAt: at(...task.created),
        completedAt: task.completed ? at(...task.completed) : null,
        decisionId: task.fromDecision ? decisionId : null,
        createdByAI: task.createdByAI ?? false,
      },
    });
    await audit(ctx, { caseRoomId, userId: u(task.creator).id, action: "task.created", resourceType: "Task", resourceId: created.id, metadata: { title: task.title, assignee: u(task.assignee).name, aiSuggested: task.createdByAI ?? false }, createdAt: at(...task.created) });
    if (task.completed) {
      await audit(ctx, { caseRoomId, userId: u(task.assignee).id, action: "task.completed", resourceType: "Task", resourceId: created.id, metadata: { title: task.title }, createdAt: at(...task.completed) });
    }
  }

  // ── AI drafts ────────────────────────────────────────────────────────────
  const s = spec.summary;
  const summary = caseSummaryContentSchema.parse({ kind: "case_summary", ...s.content(sources) });
  const summaryBrief = await prisma.caseBrief.create({
    data: {
      caseRoomId,
      type: "CASE_SUMMARY",
      status: s.status,
      title: SYSTEM.summaryTitle,
      content: json(summary),
      generatedByAI: true,
      aiProvider: PROVIDER.provider,
      aiModel: PROVIDER.model,
      requestedById: u(s.requestedBy).id,
      approvedById: s.approvedBy ? u(s.approvedBy).id : null,
      approvedAt: s.approvedAt ? at(...s.approvedAt) : null,
      createdAt: at(...s.at),
    },
  });
  await audit(ctx, { caseRoomId, userId: u(s.requestedBy).id, actorType: "AI", action: "ai.summary_generated", resourceType: "CaseBrief", resourceId: summaryBrief.id, metadata: { documents: spec.documents.length }, createdAt: at(...s.at) });
  if (s.approvedBy && s.approvedAt) {
    await audit(ctx, { caseRoomId, userId: u(s.approvedBy).id, action: "brief.approved", resourceType: "CaseBrief", resourceId: summaryBrief.id, metadata: { title: summaryBrief.title, briefType: "CASE_SUMMARY" }, createdAt: at(...s.approvedAt) });
  }

  if (spec.tumorBoard) {
    const tb = spec.tumorBoard;
    const content = sectionsContentSchema.parse({ kind: "sections", ...tb.content(sources) });
    const approved = Boolean(tb.approvedBy && tb.approvedAt);
    const brief = await prisma.caseBrief.create({
      data: {
        caseRoomId,
        type: "TUMOR_BOARD",
        status: approved ? "APPROVED" : "DRAFT",
        title: SYSTEM.tumorBoardTitle(at(...tb.at)),
        content: json(content),
        generatedByAI: true,
        aiProvider: PROVIDER.provider,
        aiModel: PROVIDER.model,
        requestedById: u(tb.requestedBy).id,
        approvedById: approved ? u(tb.approvedBy!).id : null,
        approvedAt: approved ? at(...tb.approvedAt!) : null,
        createdAt: at(...tb.at),
      },
    });
    await audit(ctx, { caseRoomId, userId: u(tb.requestedBy).id, actorType: "AI", action: "tumor_board.generated", resourceType: "CaseBrief", resourceId: brief.id, metadata: { title: brief.title }, createdAt: at(...tb.at) });
    if (approved) {
      await audit(ctx, { caseRoomId, userId: u(tb.approvedBy!).id, action: "brief.approved", resourceType: "CaseBrief", resourceId: brief.id, metadata: { title: brief.title, briefType: "TUMOR_BOARD" }, createdAt: at(...tb.approvedAt!) });
    }
  }

  const lastDocument = Object.values(docs).reduce((latest, d) => (d.createdAt > latest ? d.createdAt : latest), room.createdAt);
  const memory = caseMemorySchema.parse({
    ...spec.memory(sources),
    processedDocumentIds: Object.values(docs).map((d) => d.id),
    updatedAt: new Date(lastDocument.getTime() + 20_000).toISOString(),
  });
  await prisma.caseMemory.create({ data: { caseRoomId, data: json(memory), version: Math.max(1, spec.documents.length) } });

  const lastActivity = await prisma.message.findFirst({ where: { caseRoomId }, orderBy: { createdAt: "desc" } });
  await prisma.caseRoom.update({ where: { id: caseRoomId }, data: { updatedAt: lastActivity?.createdAt ?? room.createdAt } });
  return { caseRoomId };
}
