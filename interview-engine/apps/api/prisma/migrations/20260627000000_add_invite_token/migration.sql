-- AlterTable
-- Per-candidate invite token, shared with the FastAPI backend. IF NOT EXISTS keeps
-- this idempotent and collision-free with the backend's init_db ALTER guard, since
-- both the engine (Prisma) and the backend (SQLAlchemy) write this shared column.
ALTER TABLE "InterviewSession" ADD COLUMN IF NOT EXISTS "inviteToken" TEXT;
