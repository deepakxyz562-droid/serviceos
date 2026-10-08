-- ═══════════════════════════════════════════════════════════════════════════
-- Schema Separation: BOS (Business Operating System) & Chatbotly
-- ═══════════════════════════════════════════════════════════════════════════
--
-- This migration partitions the monolithic database into 2 isolated product schemas:
--  1. "bos"       — POS, Products, Stock, Khata, GST Invoices, Daybook, Suppliers
--  2. "chatbotly" — Conversational Forms, AI Agents, Chatbots, Live Inbox, Bookings
--
--  * "public"     — Retains shared SSO Identity (User, Tenant, Workspace, Subscription)
--
-- Compatibility migration: validate in staging before production:
--  - Creates search_path fallback so existing queries continue working immediately.
--  - Creates backward-compatible views in "public" pointing to "bos" and "chatbotly".
--  - Safe to execute multiple times in Supabase SQL Editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create product schemas
CREATE SCHEMA IF NOT EXISTS bos;
CREATE SCHEMA IF NOT EXISTS chatbotly;

-- 2. Grant permissions to standard Supabase roles
DO $$
BEGIN
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA bos TO postgres, service_role';
    EXECUTE 'GRANT USAGE, CREATE ON SCHEMA chatbotly TO postgres, service_role';
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        EXECUTE 'GRANT USAGE ON SCHEMA bos TO authenticated, anon';
        EXECUTE 'GRANT USAGE ON SCHEMA chatbotly TO authenticated, anon';
    END IF;
END $$;

-- 3. Set global search_path so unqualified table queries resolve automatically
DO $$
BEGIN
    ALTER DATABASE postgres SET search_path TO "$user", public, bos, chatbotly;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Ignore if run in restricted cloud session where ALTER DATABASE requires superuser
END $$;

-- Set session search path immediately for the current connection
SET search_path TO "$user", public, bos, chatbotly;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. Move BOS tables to "bos" schema (and generate public views)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    bos_tables TEXT[] := ARRAY[
        'GptformCommerceConfig',
        'GptformCommerceOrder',
        'GptformConversationState',
        'EcommerceOrder',
        'EcommerceProduct',
        'EcommerceSyncLog',
        'InventoryItem',
        'InventoryAsset',
        'InventoryAssetAssignment',
        'Warehouse',
        'StockLocation',
        'StockTransfer',
        'StockTransaction',
        'LowStockAlert',
        'Invoice',
        'RecurringInvoice',
        'Expense',
        'TaxRule',
        'NumberSequence',
        'PricingRule',
        'Supplier',
        'PurchaseOrder',
        'Customer',
        'CustomerContact',
        'CustomerTimelineEntry',
        'Property',
        'PropertyContact',
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
    FOREACH tbl IN ARRAY bos_tables
    LOOP
        -- If table exists in public, move it to bos schema
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA bos', tbl);
            -- Create backward compatibility view in public
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM bos.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % to bos schema and created public view', tbl;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. Move Chatbotly tables to "chatbotly" schema (and generate public views)
-- ═══════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
    chatbotly_tables TEXT[] := ARRAY[
        'Form',
        'FormTemplate',
        'FormAgent',
        'FormResponse',
        'FormView',
        'WAForm',
        'WAFormResponse',
        'WAWebview',
        'AiAgent',
        'AiAgentVersion',
        'AiToolExecution',
        'AiProviderDeployment',
        'AiProviderConfig',
        'AiKnowledgeDocument',
        'AiKnowledgeChunk',
        'AiProviderKey',
        'Chatbot',
        'ChatbotSession',
        'AgentMonitor',
        'AiChatTurn',
        'PublicChatSession',
        'PublicChatMessage',
        'AiReceptionist',
        'AiCall',
        'AiPhoneNumber',
        'PhoneNumber',
        'AiIvrMenu',
        'AiEscalationPolicy',
        'AiCallTag',
        'AiBillingCounter',
        'TenantTelephonyAccount',
        'TwilioProviderConfig',
        'VapiProviderConfig',
        'Conversation',
        'InboxMessage',
        'UnifiedMessage',
        'ChatLabel',
        'ConversationLabel',
        'ConversationAssignment',
        'ChannelConfig',
        'ChannelConnection',
        'ChannelCatalog',
        'Booking',
        'Availability',
        'ServiceAvailability',
        'KnowledgeArticle',
        'KnowledgeSource',
        'KnowledgeDocument',
        'KnowledgeChunk'
    ];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY chatbotly_tables
    LOOP
        -- If table exists in public, move it to chatbotly schema
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tbl AND table_type = 'BASE TABLE'
        ) THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA chatbotly', tbl);
            -- Create backward compatibility view in public
            EXECUTE format('CREATE OR REPLACE VIEW public.%I AS SELECT * FROM chatbotly.%I', tbl, tbl);
            RAISE NOTICE 'Moved table % to chatbotly schema and created public view', tbl;
        END IF;
    END LOOP;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. Verification query (output list of tables per schema)
-- ═══════════════════════════════════════════════════════════════════════════
SELECT 
    table_schema, 
    COUNT(*) as total_tables 
FROM information_schema.tables 
WHERE table_schema IN ('public', 'bos', 'chatbotly')
GROUP BY table_schema
ORDER BY table_schema;
