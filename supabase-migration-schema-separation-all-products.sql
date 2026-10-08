-- ═══════════════════════════════════════════════════════════════════════════
-- Complete Schema Separation: Fieseros CRM, BOS, Chatbotly, QuoteFlow & Marketplace
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This migration partitions the database into dedicated product schemas:
--  1. "bos"         — Retail Store, Stock/Inventory, POS, Suppliers, Daybook, E-Commerce
--  2. "chatbotly"   — AI Agents, Conversational Forms, Live Inbox, Bookings, Telephony
--  3. "quoteflow"   — Dedicated AI Quote & Instant Invoice Platform
--  4. "marketplace" — On-Demand Gig Requests, Proposals, Escrow Splits & Payouts
--  5. "public"      — Shared SSO Auth (User, Tenant, Workspace, Subscription) + Fieseros CRM Core
--
-- Compatibility migration: validate in staging before production:
--  - Grants full usage to postgres, service_role, authenticated, and anon roles.
--  - Sets search_path to "$user", public, bos, chatbotly, quoteflow, marketplace.
--  - Creates backward-compatible views in "public" so existing Prisma code continues working.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create product schemas
CREATE SCHEMA IF NOT EXISTS bos;
CREATE SCHEMA IF NOT EXISTS chatbotly;
CREATE SCHEMA IF NOT EXISTS quoteflow;
CREATE SCHEMA IF NOT EXISTS marketplace;

-- 2. Grant permissions
DO $$
BEGIN
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA bos TO postgres, service_role';
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA chatbotly TO postgres, service_role';
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA quoteflow TO postgres, service_role';
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA marketplace TO postgres, service_role';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA bos TO authenticated, anon';
        EXECUTE 'GRANT USAGE ON SCHEMA chatbotly TO authenticated, anon';
        EXECUTE 'GRANT USAGE ON SCHEMA quoteflow TO authenticated, anon';
        EXECUTE 'GRANT USAGE ON SCHEMA marketplace TO authenticated, anon';
    END IF;
END $$;

-- 3. Set global search_path
DO $$
BEGIN
    ALTER DATABASE postgres SET search_path TO "$user", public, bos, chatbotly, quoteflow, marketplace;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

SET search_path TO "$user", public, bos, chatbotly, quoteflow, marketplace;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Move BOS tables to "bos" schema
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    bos_tables TEXT[] := ARRAY[
        -- E-Commerce store sync & external storefronts
        'IntegrationConnection',
        'EcommerceOrder',
        'EcommerceProduct',
        'EcommerceSyncLog',
        -- WhatsApp commerce & custom storefront domains
        'GptformCommerceConfig',
        'GptformCommerceOrder',
        'GptformConversationState',
        'CustomDomain',
        -- Retail inventory, stock, locations, suppliers
        'InventoryItem',
        'InventoryAsset',
        'InventoryAssetAssignment',
        'Warehouse',
        'StockLocation',
        'StockTransfer',
        'StockTransaction',
        'LowStockAlert',
        'Supplier',
        'PurchaseOrder',
        -- Retail loyalty, coupons, promotions, memberships
        'LoyaltyPoint',
        'Coupon',
        'Promotion',
        'Membership',
        'Referral'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY bos_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA bos', tbl);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM bos.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % to bos schema and created public view', tbl;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Move Chatbotly tables to "chatbotly" schema
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    chatbotly_tables TEXT[] := ARRAY[
        -- Forms & Submissions
        'Form',
        'FormTemplate',
        'FormAgent',
        'FormResponse',
        'FormView',
        'WAForm',
        'WAFormResponse',
        'WAWebview',
        -- AI Agents & Chatbots
        'AiAgent',
        'AiAgentVersion',
        'AiToolExecution',
        'AiProviderDeployment',
        'AiProviderConfig',
        'AiChatTurn',
        'PublicChatSession',
        'PublicChatMessage',
        'Chatbot',
        'ChatbotSession',
        'AgentMonitor',
        -- AI Knowledge Bases
        'AiKnowledgeDocument',
        'AiKnowledgeChunk',
        'AiProviderKey',
        'KnowledgeArticle',
        'KnowledgeSource',
        'KnowledgeDocument',
        'KnowledgeChunk',
        -- Voice AI & Telephony
        'AiReceptionist',
        'AiCall',
        'AiPhoneNumber',
        'PhoneNumber',
        'ExternalPhoneNumber',
        'PhoneConnection',
        'AiIvrMenu',
        'AiEscalationPolicy',
        'AiCallTag',
        'AiBillingCounter',
        'TenantTelephonyAccount',
        'PhoneProvisioningAttempt',
        'TwilioProviderConfig',
        'VapiProviderConfig',
        -- Live Inbox & Messaging
        'Conversation',
        'InboxMessage',
        'UnifiedMessage',
        'ChatLabel',
        'ConversationLabel',
        'ConversationAssignment',
        'ConversationExport',
        'ChannelConfig',
        'ChannelConnection',
        'ChannelCatalog',
        -- Public Booking
        'Booking',
        'Availability',
        'ServiceAvailability'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY chatbotly_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA chatbotly', tbl);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM chatbotly.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % to chatbotly schema and created public view', tbl;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Move QuoteFlow tables to "quoteflow" schema
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    quoteflow_tables TEXT[] := ARRAY[
        'AiBusiness',
        'AiCustomer',
        'AiQuote',
        'AiQuoteItem',
        'AiInvoice',
        'AiInvoiceItem',
        'AiPayment',
        'AiItem',
        'AiTemplate'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY quoteflow_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA quoteflow', tbl);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM quoteflow.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % to quoteflow schema and created public view', tbl;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. Move Marketplace tables to "marketplace" schema
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    marketplace_tables TEXT[] := ARRAY[
        'MarketplaceTransaction',
        'Payout',
        'FeaturedListing',
        'MarketplaceRequest',
        'MarketplaceRequestMedia',
        'MarketplaceProviderMatch',
        'ProviderProposal',
        'ProposalItem',
        'MarketplaceBooking',
        'MarketplaceReview',
        'MarketplaceCustomer',
        'MarketplaceProviderProfile',
        'MarketplaceProviderService',
        'MarketplaceProviderServiceArea',
        'ProposalMessage',
        'MarketplaceTemplate'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY marketplace_tables
    LOOP
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA marketplace', tbl);
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM marketplace.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % to marketplace schema and created public view', tbl;
        END IF;
    END LOOP;
END $$;
-- ═══════════════════════════════════════════════════════════════════════════
-- 8. Verification Summary
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    table_schema, 
    table_type,
    COUNT(*) as count 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'bos', 'chatbotly', 'quoteflow', 'marketplace')
GROUP BY table_schema, table_type
ORDER BY table_schema, table_type;
