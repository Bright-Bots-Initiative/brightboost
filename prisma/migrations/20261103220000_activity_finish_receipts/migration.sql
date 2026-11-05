CREATE TABLE "ActivityFinishReceipt" (
    "progressId" TEXT NOT NULL,
    "attemptId" UUID NOT NULL,
    "isReplay" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityFinishReceipt_pkey" PRIMARY KEY ("progressId", "attemptId")
);

ALTER TABLE "ActivityFinishReceipt"
    ADD CONSTRAINT "ActivityFinishReceipt_progressId_fkey"
    FOREIGN KEY ("progressId") REFERENCES "Progress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Receipts belong to the backend; no client-facing row policies.
ALTER TABLE "ActivityFinishReceipt" ENABLE ROW LEVEL SECURITY;
