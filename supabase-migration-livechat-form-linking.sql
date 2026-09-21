-- ============================================================================
-- Migration: Add formId to PublicChatSession for GPTForm Live Chat Linking
-- Description:
--   Allows Live Chat sessions initiated from embedded forms or form chat widgets
--   to be associated with a specific Form. This enables GPTForm standalone subscribers
--   to filter, search, and view live chat inquiries linked directly to their forms.
-- ============================================================================

-- 1. Add formId column if it doesn't already exist
ALTER TABLE "PublicChatSession" ADD COLUMN IF NOT EXISTS "formId" TEXT;

-- 2. Create index on formId for performant filtering by form in the Live Chat inbox
CREATE INDEX IF NOT EXISTS "PublicChatSession_formId_idx" ON "PublicChatSession"("formId");

-- 3. Add foreign key constraint to Form(id) with ON DELETE SET NULL
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'PublicChatSession_formId_fkey'
    ) THEN
        ALTER TABLE "PublicChatSession"
        ADD CONSTRAINT "PublicChatSession_formId_fkey"
        FOREIGN KEY ("formId")
        REFERENCES "Form"("id")
        ON DELETE SET NULL;
    END IF;
END $$;
