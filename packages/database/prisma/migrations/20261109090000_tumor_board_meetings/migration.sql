-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgendaItemStatus" AS ENUM ('PENDING', 'DISCUSSED', 'DEFERRED');

-- CreateTable
CREATE TABLE "TumorBoardMeeting" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER,
    "location" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "chairId" TEXT,
    "secretaryId" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TumorBoardMeeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TumorBoardAgendaItem" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "caseRoomId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "presenterId" TEXT,
    "question" TEXT NOT NULL,
    "status" "AgendaItemStatus" NOT NULL DEFAULT 'PENDING',
    "summary" TEXT,
    "conclusion" TEXT,
    "decisionId" TEXT,
    "briefId" TEXT,
    "discussedAt" TIMESTAMP(3),
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TumorBoardAgendaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TumorBoardAttendee" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TumorBoardAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TumorBoardMeeting_organizationId_scheduledAt_idx" ON "TumorBoardMeeting"("organizationId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "TumorBoardAgendaItem_decisionId_key" ON "TumorBoardAgendaItem"("decisionId");

-- CreateIndex
CREATE INDEX "TumorBoardAgendaItem_caseRoomId_idx" ON "TumorBoardAgendaItem"("caseRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "TumorBoardAgendaItem_meetingId_caseRoomId_key" ON "TumorBoardAgendaItem"("meetingId", "caseRoomId");

-- CreateIndex
CREATE INDEX "TumorBoardAttendee_userId_idx" ON "TumorBoardAttendee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TumorBoardAttendee_meetingId_userId_key" ON "TumorBoardAttendee"("meetingId", "userId");

-- AddForeignKey
ALTER TABLE "TumorBoardMeeting" ADD CONSTRAINT "TumorBoardMeeting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardMeeting" ADD CONSTRAINT "TumorBoardMeeting_chairId_fkey" FOREIGN KEY ("chairId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardMeeting" ADD CONSTRAINT "TumorBoardMeeting_secretaryId_fkey" FOREIGN KEY ("secretaryId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardMeeting" ADD CONSTRAINT "TumorBoardMeeting_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAgendaItem" ADD CONSTRAINT "TumorBoardAgendaItem_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "TumorBoardMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAgendaItem" ADD CONSTRAINT "TumorBoardAgendaItem_caseRoomId_fkey" FOREIGN KEY ("caseRoomId") REFERENCES "CaseRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAgendaItem" ADD CONSTRAINT "TumorBoardAgendaItem_presenterId_fkey" FOREIGN KEY ("presenterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAgendaItem" ADD CONSTRAINT "TumorBoardAgendaItem_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAgendaItem" ADD CONSTRAINT "TumorBoardAgendaItem_decisionId_fkey" FOREIGN KEY ("decisionId") REFERENCES "Decision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAgendaItem" ADD CONSTRAINT "TumorBoardAgendaItem_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "CaseBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAttendee" ADD CONSTRAINT "TumorBoardAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "TumorBoardMeeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TumorBoardAttendee" ADD CONSTRAINT "TumorBoardAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
