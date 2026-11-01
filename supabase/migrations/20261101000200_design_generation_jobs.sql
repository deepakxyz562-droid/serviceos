CREATE TABLE IF NOT EXISTS "DesignGenerationJob" (
 "id" TEXT PRIMARY KEY, "tenantId" TEXT NOT NULL, "userId" TEXT NOT NULL,
 "provider" TEXT NOT NULL, "prompt" TEXT NOT NULL, "status" TEXT NOT NULL DEFAULT 'queued',
 "resultJson" TEXT, "error" TEXT, "subscriptionId" TEXT,
 "cancelRequested" BOOLEAN NOT NULL DEFAULT false,
 "startedAt" TIMESTAMP(3), "finishedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "DesignGenerationJob_tenantId_createdAt_idx" ON "DesignGenerationJob" ("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "DesignGenerationJob_status_createdAt_idx" ON "DesignGenerationJob" ("status", "createdAt");
ALTER TABLE "DesignGenerationJob" ENABLE ROW LEVEL SECURITY;
