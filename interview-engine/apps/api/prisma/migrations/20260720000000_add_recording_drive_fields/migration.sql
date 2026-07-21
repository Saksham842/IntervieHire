-- AlterTable
-- Where the full-interview recording ends up after the engine forwards it to the
-- FastAPI backend for upload into the shared Google Drive "Recordings" folder.
-- IF NOT EXISTS keeps this idempotent, matching the repo's other hand-rolled migrations.
ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "recordingDriveFileId" TEXT;
ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "recordingDriveUrl" TEXT;
