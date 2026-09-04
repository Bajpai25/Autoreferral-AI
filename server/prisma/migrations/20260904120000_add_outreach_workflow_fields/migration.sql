-- Add metadata needed to execute outreach message workflows.
ALTER TABLE "Workflow"
  ADD COLUMN "outReachFlag" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "messageId" TEXT;