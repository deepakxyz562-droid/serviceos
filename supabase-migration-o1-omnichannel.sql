-- ============================================================
-- O1 OMNICHANNEL FOUNDATION — DDL MIGRATION
-- ============================================================
-- Creates ChannelConnection + ChannelCatalog tables and adds the
-- new columns + relation to InboxMessage. Idempotent (uses IF NOT EXISTS).
--
-- Apply via the Supabase REST API (the project uses USE_SUPABASE_DB=true).
-- ============================================================

-- ── 1. InboxMessage: add new columns ────────────────────────────────────────
-- channel (denormalized for multi-channel queries)
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "channel" TEXT;

-- attachmentsJson (file attachments: [{url, type, name, size}])
ALTER TABLE "InboxMessage" ADD COLUMN IF NOT EXISTS "attachmentsJson" TEXT NOT NULL DEFAULT '[]';

-- Add index on channel
CREATE INDEX IF NOT EXISTS "InboxMessage_channel_idx" ON "InboxMessage"("channel");

-- ── 2. InboxMessage: idempotency unique constraint ──────────────────────────
-- (tenantId, channel, externalId) must be unique so duplicate webhooks don't
-- create duplicate rows. Postgres treats NULL externalId as distinct, so
-- internal/system messages (no external ID) are exempt.
-- NOTE: if any duplicate rows already exist, this will fail. Clean up first:
--   SELECT "tenantId", "channel", "externalId", COUNT(*) FROM "InboxMessage"
--   WHERE "externalId" IS NOT NULL GROUP BY 1,2,3 HAVING COUNT(*) > 1;
-- (The existing InboxMessage has 4 rows — we checked, no externalId dupes.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'InboxMessage_tenantId_channel_externalId_key'
  ) THEN
    CREATE UNIQUE INDEX "InboxMessage_tenantId_channel_externalId_key"
      ON "InboxMessage"("tenantId", "channel", "externalId");
  END IF;
END $$;

-- ── 3. ChannelConnection table ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ChannelConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NOT_CONNECTED',
    "provider" TEXT,
    "credentialsJson" TEXT NOT NULL DEFAULT '{}',
    "externalAccountId" TEXT,
    "displayName" TEXT,
    "connectedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "metadataJson" TEXT NOT NULL DEFAULT '{}',
    "workspaceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelConnection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChannelConnection_tenantId_idx" ON "ChannelConnection"("tenantId");
CREATE INDEX IF NOT EXISTS "ChannelConnection_channel_idx" ON "ChannelConnection"("channel");
CREATE INDEX IF NOT EXISTS "ChannelConnection_status_idx" ON "ChannelConnection"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "ChannelConnection_tenantId_channel_key"
  ON "ChannelConnection"("tenantId", "channel");

-- ── 4. ChannelCatalog table ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "ChannelCatalog" (
    "id" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "comingSoon" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "icon" TEXT,
    "color" TEXT,
    "connectionMethod" TEXT NOT NULL DEFAULT 'manual',
    "sortOrder" INTEGER NOT NULL DEFAULT 100,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChannelCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ChannelCatalog_channel_key" ON "ChannelCatalog"("channel");
CREATE INDEX IF NOT EXISTS "ChannelCatalog_enabled_idx" ON "ChannelCatalog"("enabled");
CREATE INDEX IF NOT EXISTS "ChannelCatalog_sortOrder_idx" ON "ChannelCatalog"("sortOrder");

-- ── 5. Seed ChannelCatalog — V1 channel set ─────────────────────────────────
INSERT INTO "ChannelCatalog" (
  "channel", "enabled", "comingSoon", "displayName", "description",
  "icon", "color", "connectionMethod", "sortOrder", "provider",
  "createdAt", "updatedAt"
) VALUES
  -- V1 enabled
  ('whatsapp',  true,  false, 'WhatsApp',           'WhatsApp Business Cloud API — most-used messaging channel in EU/APAC/MEA markets.', 'MessageSquare', '#25D366', 'oauth',    10, 'meta_cloud', NOW(), NOW()),
  ('sms',       true,  false, 'SMS',                'Send and receive SMS messages via Twilio.', 'MessageSquare', '#0ea5e9', 'manual',   20, 'twilio',     NOW(), NOW()),
  ('email',     true,  false, 'Email',              'Send and receive customer email in your unified inbox.', 'Mail',           '#6b7280', 'manual',   30, 'smtp',       NOW(), NOW()),
  ('live_chat', true,  false, 'Live Chat',          'Chat with website visitors via an embeddable widget.', 'MessageCircle', '#3b82f6', 'one_click',40, 'internal',  NOW(), NOW()),
  -- Phase 2 — Coming Soon
  ('messenger',      false, true, 'Facebook Messenger', 'Receive messages from your Facebook Page.', 'Send', '#0084FF', 'oauth', 50, 'meta', NOW(), NOW()),
  ('instagram',      false, true, 'Instagram',          'Receive Instagram Direct messages.', 'Instagram', '#E1306C', 'oauth', 60, 'meta', NOW(), NOW()),
  ('googlebusiness', false, true, 'Google Business',    'Respond to Google Business Messages.', 'Building2', '#4285F4', 'oauth', 70, 'google', NOW(), NOW()),
  -- Disabled — kept in schema, hidden from tenant UI
  ('teams',     false, false, 'Microsoft Teams', 'Internal team messaging. Not a customer-facing channel.', 'Users', '#6264A7', 'oauth', 90, NULL, NOW(), NOW()),
  ('slack',     false, false, 'Slack',           'Internal team messaging. Not a customer-facing channel.', 'Hash',  '#4A154B', 'oauth', 100, NULL, NOW(), NOW()),
  ('webwidget', false, false, 'Web Widget',     'Merged into Live Chat — do not configure separately.', 'Layout', '#10b981', 'one_click', 110, 'internal', NOW(), NOW())
ON CONFLICT ("channel") DO UPDATE SET
  "displayName"     = EXCLUDED."displayName",
  "description"     = EXCLUDED."description",
  "icon"            = EXCLUDED."icon",
  "color"           = EXCLUDED."color",
  "connectionMethod" = EXCLUDED."connectionMethod",
  "sortOrder"       = EXCLUDED."sortOrder",
  "provider"        = EXCLUDED."provider",
  "updatedAt"       = NOW();

-- ── 6. Backfill InboxMessage.channel from Conversation.channel ─────────────
UPDATE "InboxMessage" AS im
SET "channel" = c."channel"
FROM "Conversation" AS c
WHERE im."conversationId" = c."conversationId"
  AND im."channel" IS NULL;

-- ── 7. Backfill ChannelConnection from existing ChannelConfig ─────────────
INSERT INTO "ChannelConnection" (
  "tenantId", "channel", "status", "provider", "credentialsJson",
  "externalAccountId", "displayName", "connectedAt", "metadataJson",
  "createdAt", "updatedAt"
)
SELECT
  cc."tenantId",
  CASE
    WHEN cc."channel" = 'livechat'   THEN 'live_chat'
    WHEN cc."channel" = 'webwidget' THEN 'live_chat'
    ELSE cc."channel"
  END,
  CASE
    WHEN cc."status" = 'active' THEN 'CONNECTED'
    WHEN cc."status" = 'error'  THEN 'ERROR'
    ELSE 'NOT_CONNECTED'
  END,
  NULL,
  '{}',
  NULL,
  cc."name",
  CASE WHEN cc."status" = 'active' THEN cc."updatedAt" ELSE NULL END,
  '{}',
  NOW(),
  NOW()
FROM "ChannelConfig" AS cc
WHERE cc."tenantId" IS NOT NULL
  AND cc."channel" <> 'webwidget'
ON CONFLICT ("tenantId", "channel") DO UPDATE SET
  "status"      = EXCLUDED."status",
  "displayName" = COALESCE(EXCLUDED."displayName", "ChannelConnection"."displayName"),
  "updatedAt"   = NOW();

-- ── 8. Done ────────────────────────────────────────────────────────────────
-- Verify:
--   SELECT channel, enabled, "comingSoon", "displayName" FROM "ChannelCatalog" ORDER BY "sortOrder";
--   SELECT "tenantId", channel, status FROM "ChannelConnection" ORDER BY "tenantId", channel;
--   SELECT COUNT(*) FILTER (WHERE "channel" IS NOT NULL) AS with_channel, COUNT(*) AS total FROM "InboxMessage";
