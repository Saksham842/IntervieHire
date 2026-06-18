-- CreateTable
CREATE TABLE "TranscriptEvent" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "timestampMs" INTEGER NOT NULL,
    "source" TEXT NOT NULL,
    "isFinal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranscriptEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InterviewTranscript" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "candidateId" TEXT,
    "interviewId" TEXT,
    "transcriptFilePath" TEXT,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'recording',
    "eventCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InterviewTranscript_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranscriptEvent_sessionId_timestampMs_idx" ON "TranscriptEvent"("sessionId", "timestampMs");

-- CreateIndex
CREATE UNIQUE INDEX "InterviewTranscript_sessionId_key" ON "InterviewTranscript"("sessionId");

-- AddForeignKey
ALTER TABLE "TranscriptEvent" ADD CONSTRAINT "TranscriptEvent_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InterviewTranscript" ADD CONSTRAINT "InterviewTranscript_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "InterviewSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
