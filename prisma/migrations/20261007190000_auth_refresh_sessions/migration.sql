CREATE TABLE IF NOT EXISTS "AuthRefreshSession" (
 id text PRIMARY KEY, "familyId" text NOT NULL, "subjectType" text NOT NULL DEFAULT 'user',
 "subjectId" text NOT NULL, "tokenHash" text NOT NULL UNIQUE, "expiresAt" timestamp(3) NOT NULL,
 "lastUsedAt" timestamp(3), "revokedAt" timestamp(3), "revokeReason" text, "replacedByHash" text,
 "userAgent" text, "ipAddress" text, "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "AuthRefreshSession_familyId_idx" ON "AuthRefreshSession"("familyId");
CREATE INDEX IF NOT EXISTS "AuthRefreshSession_subjectType_subjectId_idx" ON "AuthRefreshSession"("subjectType","subjectId");
CREATE INDEX IF NOT EXISTS "AuthRefreshSession_expiresAt_idx" ON "AuthRefreshSession"("expiresAt");
ALTER TABLE "AuthRefreshSession" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "AuthRefreshSession" FROM PUBLIC;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN GRANT ALL ON "AuthRefreshSession" TO service_role; END IF; END $$;
NOTIFY pgrst,'reload schema';
