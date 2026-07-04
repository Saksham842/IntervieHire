-- CreateTable
-- IF NOT EXISTS: the same Postgres is also touched by the FastAPI backend's
-- Base.metadata.create_all() on boot, and deploy order between the two services
-- is not guaranteed. Making creation idempotent avoids a "relation already
-- exists" failure if the backend wins the race, while `prisma migrate deploy`
-- still records this migration as applied.
CREATE TABLE IF NOT EXISTS "ConsentLog" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "scopes" JSONB NOT NULL DEFAULT '{}',
    "candidateEmail" TEXT,
    "candidateName" TEXT,
    "inviteToken" TEXT,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "locale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConsentLog_sessionId_createdAt_idx" ON "ConsentLog"("sessionId", "createdAt");
