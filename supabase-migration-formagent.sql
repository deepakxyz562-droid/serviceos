-- ═══════════════════════════════════════════════════════════════════════════
-- Fieseros FormAgent Model — Supabase Migration (F3)
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Creates the FormAgent table for persisting AI agent configurations.
-- Safe to run multiple times.
--
-- Run this in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "FormAgent" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenantId" TEXT,
    "slug" TEXT NOT NULL UNIQUE,
    "name" TEXT NOT NULL,
    "roleTitle" TEXT NOT NULL DEFAULT 'AI Assistant',
    "avatarUrl" TEXT NOT NULL DEFAULT '',
    "statusText" TEXT NOT NULL DEFAULT 'Online',
    "brandColor" TEXT NOT NULL DEFAULT '#059669',
    "voiceTone" TEXT NOT NULL DEFAULT 'friendly',
    "welcomeGreeting" TEXT NOT NULL DEFAULT 'Hello! How can I help you today?',
    "greetingSubtitle" TEXT,
    "configJson" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FormAgent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "FormAgent_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "FormAgent_tenantId_idx" ON "FormAgent"("tenantId");
CREATE INDEX IF NOT EXISTS "FormAgent_status_idx" ON "FormAgent"("status");
CREATE INDEX IF NOT EXISTS "FormAgent_slug_idx" ON "FormAgent"("slug");
