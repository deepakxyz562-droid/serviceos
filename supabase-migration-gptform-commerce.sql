-- ═══════════════════════════════════════════════════════════════════════════
-- GPTForm WhatsApp Commerce Engine — Supabase Migration
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Creates the 3 core commerce tables:
--  1. GptformCommerceConfig   — Product catalog, fields config, UPI, business hours
--  2. GptformCommerceOrder    — Structured orders created from WhatsApp conversations
--  3. GptformConversationState— Deterministic conversation state machine tracking
--
-- Safe to run multiple times in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. GptformCommerceConfig
CREATE TABLE IF NOT EXISTS "GptformCommerceConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "agentId" TEXT,
    "catalogJson" TEXT NOT NULL DEFAULT '[]',
    "fieldsJson" TEXT NOT NULL DEFAULT '[]',
    "upiId" TEXT,
    "deliveryAreasJson" TEXT NOT NULL DEFAULT '[]',
    "businessHoursJson" TEXT NOT NULL DEFAULT '{}',
    "greetingMessage" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "currencySymbol" TEXT NOT NULL DEFAULT '₹',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GptformCommerceConfig_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GptformCommerceConfig_businessId_idx" ON "GptformCommerceConfig"("businessId");
CREATE INDEX IF NOT EXISTS "GptformCommerceConfig_agentId_idx" ON "GptformCommerceConfig"("agentId");

-- 2. GptformCommerceOrder
CREATE TABLE IF NOT EXISTS "GptformCommerceOrder" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "itemsJson" TEXT NOT NULL DEFAULT '[]',
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deliveryAddress" TEXT,
    "deliveryDate" TEXT,
    "deliveryType" TEXT,
    "notes" TEXT,
    "paymentStatus" TEXT NOT NULL DEFAULT 'UNPAID',
    "paymentMethod" TEXT,
    "paymentRef" TEXT,
    "conversationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GptformCommerceOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GptformCommerceOrder_configId_fkey"
        FOREIGN KEY ("configId") REFERENCES "GptformCommerceConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "GptformCommerceOrder_configId_idx" ON "GptformCommerceOrder"("configId");
CREATE INDEX IF NOT EXISTS "GptformCommerceOrder_businessId_idx" ON "GptformCommerceOrder"("businessId");
CREATE INDEX IF NOT EXISTS "GptformCommerceOrder_customerPhone_idx" ON "GptformCommerceOrder"("customerPhone");
CREATE INDEX IF NOT EXISTS "GptformCommerceOrder_status_idx" ON "GptformCommerceOrder"("status");
CREATE INDEX IF NOT EXISTS "GptformCommerceOrder_createdAt_idx" ON "GptformCommerceOrder"("createdAt");

-- 3. GptformConversationState
CREATE TABLE IF NOT EXISTS "GptformConversationState" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "currentState" TEXT NOT NULL DEFAULT 'AWAITING_INTENT',
    "collectedFields" TEXT NOT NULL DEFAULT '{}',
    "messagesJson" TEXT NOT NULL DEFAULT '[]',
    "orderId" TEXT,
    "configId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GptformConversationState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GptformConversationState_businessId_customerPhone_key"
    ON "GptformConversationState"("businessId", "customerPhone");
CREATE INDEX IF NOT EXISTS "GptformConversationState_businessId_customerPhone_idx"
    ON "GptformConversationState"("businessId", "customerPhone");
