/**
 * Supabase Database Adapter
 *
 * Provides a Prisma-compatible interface that uses the Supabase REST API (PostgREST)
 * instead of direct PostgreSQL connections. This enables the app to use Supabase
 * as the database backend even when direct PostgreSQL connections are blocked.
 *
 * Usage: Set USE_SUPABASE_DB=true in .env to activate.
 * All existing API routes using `db.model.method()` will work unchanged.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// ── Configuration ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('[SupabaseDB] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}

// ── Table Name Mapping ─────────────────────────────────────────────────────

const TABLE_MAP: Record<string, string> = {
  tenant: 'Tenant',
  subscription: 'Subscription',
  user: 'User',
  service: 'Service',
  lead: 'Lead',
  invoice: 'Invoice',
  review: 'Review',
  notification: 'Notification',
  quote: 'Quote',
  form: 'Form',
  formResponse: 'FormResponse',
  workflowAutomation: 'WorkflowAutomation',
  workspace: 'Workspace',
  workflow: 'Workflow',
  workflowVersion: 'WorkflowVersion',
  credential: 'Credential',
  execution: 'Execution',
  executionNodeData: 'ExecutionNodeData',
  webhookRegistration: 'WebhookRegistration',
  auditLog: 'AuditLog',
  apiKey: 'ApiKey',
  variable: 'Variable',
  folder: 'Folder',
  template: 'Template',
  employee: 'Employee',
  employeeStatusLog: 'EmployeeStatusLog',
  notificationLog: 'NotificationLog',
  customer: 'Customer',
  resource: 'Resource',
  job: 'Job',
  jobVisit: 'JobVisit',
  expense: 'Expense',
  jobTimeEntry: 'JobTimeEntry',
  employeeShift: 'EmployeeShift',
  contactList: 'ContactList',
  contactListEntry: 'ContactListEntry',
  webhookSource: 'WebhookSource',
  webhookEndpoint: 'WebhookEndpoint',
  webhookEndpointLog: 'WebhookEndpointLog',
  webhookTestRequest: 'WebhookTestRequest',
  whatsAppMessageAction: 'WhatsAppMessageAction',
  eventWebhook: 'EventWebhook',
  eventWebhookLog: 'EventWebhookLog',
  conversation: 'Conversation',
  channelConfig: 'ChannelConfig',
  customerJourney: 'CustomerJourney',
  customerPortalSession: 'CustomerPortalSession',
  integrationConfig: 'IntegrationConfig',
  analyticsSnapshot: 'AnalyticsSnapshot',
  inboxMessage: 'InboxMessage',
  chatLabel: 'ChatLabel',
  triggerExecution: 'TriggerExecution',
  deal: 'Deal',
  dealStageHistory: 'DealStageHistory',
  campaign: 'Campaign',
  campaignMessage: 'CampaignMessage',
  campaignTemplate: 'CampaignTemplate',
  adCampaign: 'AdCampaign',
  adConversion: 'AdConversion',
  segment: 'Segment',
  segmentMember: 'SegmentMember',
  retargetingRule: 'RetargetingRule',
  retargetingLog: 'RetargetingLog',
  communicationProvider: 'CommunicationProvider',
  contact: 'Contact',
  chatbot: 'Chatbot',
  chatbotSession: 'ChatbotSession',
  waForm: 'WAForm',
  waFormResponse: 'WAFormResponse',
  waWebview: 'WAWebview',
  agentMonitor: 'AgentMonitor',
  rolePermission: 'RolePermission',
  timelineEvent: 'TimelineEvent',
  unifiedMessage: 'UnifiedMessage',
  marketplaceTemplate: 'MarketplaceTemplate',
  booking: 'Booking',
  journeyExecution: 'JourneyExecution',
  journeyWorkflow: 'JourneyWorkflow',
  dataRetentionPolicy: 'DataRetentionPolicy',
  customDomain: 'CustomDomain',
  document: 'Document',
  invitation: 'Invitation',
  knowledgeArticle: 'KnowledgeArticle',
  leadDiscovery: 'LeadDiscovery',
  leadDiscoverySearch: 'LeadDiscoverySearch',
  reviewRequest: 'ReviewRequest',
  conversationAssignment: 'ConversationAssignment',
  conversationExport: 'ConversationExport',
  conversationLabel: 'ConversationLabel',
  menuItemConfig: 'MenuItemConfig',
  featureFlag: 'FeatureFlag',
  subscriptionPlan: 'SubscriptionPlan',
  platformMetric: 'PlatformMetric',
  securityEvent: 'SecurityEvent',
  auditLogEntry: 'AuditLogEntry',
  otpVerification: 'OtpVerification',
  // ── Template Studio & Marketing ──
  brandKit: 'BrandKit',
  imageLibrary: 'ImageLibrary',
  templatePack: 'TemplatePack',
  templateAsset: 'TemplateAsset',
  emailProvider: 'EmailProvider',
  emailTemplate: 'EmailTemplate',
  // ── Billing & Payments ──
  subscriptionPayment: 'SubscriptionPayment',
  billingEvent: 'BillingEvent',
  plan: 'Plan',
  planFeatureMatrix: 'PlanFeatureMatrix',
  recurringInvoice: 'RecurringInvoice',
  paymentMethod: 'PaymentMethod',
  // ── E-Commerce ──
  ecommerceOrder: 'EcommerceOrder',
  ecommerceProduct: 'EcommerceProduct',
  ecommerceSyncLog: 'EcommerceSyncLog',
  // ── Contact Management ──
  tag: 'Tag',
  contactTag: 'ContactTag',
  group: 'Group',
  contactGroup: 'ContactGroup',
  contactImport: 'ContactImport',
  contactExport: 'ContactExport',
  // ── Integrations ──
  integrationConnection: 'IntegrationConnection',
  hubIntegrationConnection: 'HubIntegrationConnection',
  metaLeadConfig: 'MetaLeadConfig',
  metaLead: 'MetaLead',
  googleAdsLeadConfig: 'GoogleAdsLeadConfig',
  googleAdsLead: 'GoogleAdsLead',
  // ── Help & Support Center ──
  supportCategory: 'SupportCategory',
  supportTicket: 'SupportTicket',
  ticketMessage: 'TicketMessage',
  ticketAttachment: 'TicketAttachment',
  announcement: 'Announcement',
  // ── Notifications (V1.5) ──
  // These models back the push-notification + in-app notification system.
  // Without explicit TABLE_MAP entries the adapter would guess the table
  // name via default capitalization (PushSubscription / AppNotification /
  // NotificationPreference), which happens to be correct — BUT listing
  // them explicitly documents intent and makes grep-able which tables the
  // push subsystem depends on. The actual tables MUST exist in Supabase
  // (run `npx prisma db push` against the Supabase DATABASE_URL, or create
  // them manually via the Supabase SQL editor).
  appNotification: 'AppNotification',
  notificationPreference: 'NotificationPreference',
  pushSubscription: 'PushSubscription',
  // ── Public Live Chat ──
  // These models back the visitor-facing chat widget + admin Live Chat view.
  // The default capitalization would produce the correct table names, but
  // listing them explicitly ensures the Supabase adapter resolves them
  // reliably. The tables MUST exist in Supabase (run `npx prisma db push`
  // against the Supabase DATABASE_URL, or create them manually via the
  // Supabase SQL editor).
  publicChatSession: 'PublicChatSession',
  publicChatMessage: 'PublicChatMessage',
  // ── AI Receptionist (Phase R2) ──
  // These models extend AiAgent/AiCall with IVR menus, escalation policies,
  // discrete call tags, and per-tenant billing counters. The tables MUST
  // exist in Supabase — run `supabase-migration-ai-receptionist-r2.sql`
  // in the Supabase SQL editor (idempotent) or `npx prisma db push` against
  // the Supabase DATABASE_URL. Listing them explicitly (instead of relying
  // on default capitalization) makes the AI Receptionist tables grep-able
  // and documents which tables the subsystem depends on.
  aiIvrMenu: 'AiIvrMenu',
  aiEscalationPolicy: 'AiEscalationPolicy',
  aiCallTag: 'AiCallTag',
  aiBillingCounter: 'AiBillingCounter',
};

// Known missing tables in Supabase (return empty results gracefully)
const MISSING_TABLES = new Set<string>([
  // CommunicationProvider, Contact, Form, FormResponse, WorkflowAutomation
  // have been migrated to Supabase — removed from missing list
]);

// Tables that do NOT have an `updatedAt` column in Supabase.
// Both create() and createMany() auto-add `updatedAt` to all inserts, but
// these tables don't have that column, so PostgREST will reject it. Listing
// them here lets us skip the auto-add and avoid an unnecessary retry round-trip.
const TABLES_WITHOUT_UPDATED_AT = new Set<string>([
  'ImageLibrary',
  'BrandKit',
  'TemplatePack',
  'TemplateAsset',
  'Execution',
  'ContactGroup',
  'ContactTag',
  'ContactImport',
  'ContactExport',
  'MetaLead',
  'GoogleAdsLead',
  'TicketAttachment',
  // FeaturedLocation has no updatedAt column in the Prisma schema.
  // Without this entry, every upsert() auto-adds updatedAt → PostgREST 400 →
  // triggers a retry round-trip to strip it. Listing it here skips the
  // wasted round-trip on every hourly cron tick.
  'FeaturedLocation',
]);

// ── Relation Mapping ───────────────────────────────────────────────────────
// Maps model→relationName→{targetTable, fkColumn, isMany}
// Used for client-side joins when PostgREST FK relationships aren't available

interface RelationInfo {
  targetTable: string;
  fkColumn: string;        // FK column on the main model pointing to target
  targetFkColumn?: string; // If target points back to main model
  isMany?: boolean;        // true for one-to-many (target points to main)
  selectFields?: string[]; // Fields to select from target
}

const RELATION_MAP: Record<string, Record<string, RelationInfo>> = {
  Conversation: {
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    lead: { targetTable: 'Lead', fkColumn: 'leadId' },
    job: { targetTable: 'Job', fkColumn: 'jobId' },
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  Lead: {
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    job: { targetTable: 'Job', fkColumn: 'jobId' },
    assignedTo: { targetTable: 'Employee', fkColumn: 'assignedToId' },
    conversation: { targetTable: 'Conversation', targetFkColumn: 'leadId', isMany: false },
    journey: { targetTable: 'CustomerJourney', targetFkColumn: 'leadId', isMany: false },
  },
  Job: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
    assignee: { targetTable: 'Employee', fkColumn: 'assigneeId' },
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    resource: { targetTable: 'Resource', fkColumn: 'resourceId' },
    lead: { targetTable: 'Lead', targetFkColumn: 'jobId', isMany: false },
    conversation: { targetTable: 'Conversation', targetFkColumn: 'jobId', isMany: false },
    journey: { targetTable: 'CustomerJourney', targetFkColumn: 'jobId', isMany: false },
  },
  Employee: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
    userAccount: { targetTable: 'User', fkColumn: 'userId' },
    currentJob: { targetTable: 'Job', fkColumn: 'currentJobId' },
  },
  Customer: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
  },
  Workflow: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
    createdBy: { targetTable: 'User', fkColumn: 'createdById' },
    folder: { targetTable: 'Folder', fkColumn: 'folderId' },
  },
  Execution: {
    workflow: { targetTable: 'Workflow', fkColumn: 'workflowId' },
  },
  User: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
    employeeAccount: { targetTable: 'Employee', targetFkColumn: 'userId', isMany: false },
  },
  Workspace: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  Invoice: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    job: { targetTable: 'Job', fkColumn: 'jobId' },
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    employee: { targetTable: 'Employee', fkColumn: 'employeeId' },
  },
  Quote: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
  },
  NotificationLog: {
    job: { targetTable: 'Job', fkColumn: 'jobId' },
    employee: { targetTable: 'Employee', fkColumn: 'employeeId' },
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  Tenant: {
    subscriptions: { targetTable: 'Subscription', targetFkColumn: 'tenantId', isMany: true },
    workspaces: { targetTable: 'Workspace', targetFkColumn: 'tenantId', isMany: true },
    users: { targetTable: 'User', targetFkColumn: 'tenantId', isMany: true },
    leads: { targetTable: 'Lead', targetFkColumn: 'tenantId', isMany: true },
    invoices: { targetTable: 'Invoice', targetFkColumn: 'tenantId', isMany: true },
    recurringInvoices: { targetTable: 'RecurringInvoice', targetFkColumn: 'tenantId', isMany: true },
    services: { targetTable: 'Service', targetFkColumn: 'tenantId', isMany: true },
    reviews: { targetTable: 'Review', targetFkColumn: 'tenantId', isMany: true },
    notifications: { targetTable: 'Notification', targetFkColumn: 'tenantId', isMany: true },
    notificationLogs: { targetTable: 'NotificationLog', targetFkColumn: 'tenantId', isMany: true },
    quotes: { targetTable: 'Quote', targetFkColumn: 'tenantId', isMany: true },
    conversations: { targetTable: 'Conversation', targetFkColumn: 'tenantId', isMany: true },
    forms: { targetTable: 'Form', targetFkColumn: 'tenantId', isMany: true },
    workflowAutomations: { targetTable: 'WorkflowAutomation', targetFkColumn: 'tenantId', isMany: true },
    workflows: { targetTable: 'Workflow', targetFkColumn: 'tenantId', isMany: true },
    menuItemConfigs: { targetTable: 'MenuItemConfig', targetFkColumn: 'tenantId', isMany: true },
    featureFlags: { targetTable: 'FeatureFlag', targetFkColumn: 'tenantId', isMany: true },
    invitations: { targetTable: 'Invitation', targetFkColumn: 'tenantId', isMany: true },
    subscriptionPayments: { targetTable: 'SubscriptionPayment', targetFkColumn: 'tenantId', isMany: true },
    billingEvents: { targetTable: 'BillingEvent', targetFkColumn: 'tenantId', isMany: true },
    metaLeads: { targetTable: 'MetaLead', targetFkColumn: 'tenantId', isMany: true },
    googleAdsLeads: { targetTable: 'GoogleAdsLead', targetFkColumn: 'tenantId', isMany: true },
    publicChatSessions: { targetTable: 'PublicChatSession', targetFkColumn: 'tenantId', isMany: true },
  },
  // ── Public Live Chat relations ──
  // PublicChatSession.messages is a one-to-many: PublicChatMessage has
  // sessionId FK pointing back to PublicChatSession. Without this mapping,
  // the admin /api/chat/sessions route's `include: { messages: ... }` is
  // silently skipped by resolveIncludes, causing `s.messages` to be
  // undefined and the route to crash on `s.messages[0]`.
  PublicChatSession: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    messages: { targetTable: 'PublicChatMessage', targetFkColumn: 'sessionId', isMany: true },
  },
  PublicChatMessage: {
    session: { targetTable: 'PublicChatSession', fkColumn: 'sessionId' },
  },
  EventWebhook: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
  },
  CommunicationProvider: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  Contact: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  Form: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    responses: { targetTable: 'FormResponse', targetFkColumn: 'formId', isMany: true },
  },
  FormResponse: {
    form: { targetTable: 'Form', fkColumn: 'formId' },
  },
  WorkflowAutomation: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    executions: { targetTable: 'TriggerExecution', targetFkColumn: 'automationId', isMany: true },
  },
  TriggerExecution: {
    automation: { targetTable: 'WorkflowAutomation', fkColumn: 'automationId' },
  },
  MenuItemConfig: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  FeatureFlag: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  Subscription: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    payments: { targetTable: 'SubscriptionPayment', targetFkColumn: 'subscriptionId', isMany: true },
    billingEvents: { targetTable: 'BillingEvent', targetFkColumn: 'subscriptionId', isMany: true },
  },
  SubscriptionPayment: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    subscription: { targetTable: 'Subscription', fkColumn: 'subscriptionId' },
  },
  BillingEvent: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    subscription: { targetTable: 'Subscription', fkColumn: 'subscriptionId' },
  },
  // ── Featured European Location (homepage hero) ──
  // Without this entry, `db.featuredLocation.findFirst({ include: { location: true } })`
  // silently skips the join → row.location is undefined → getCurrentFeaturedLocation()
  // returns null → homepage never shows the featured city even though the cron
  // successfully wrote it to the DB.
  FeaturedLocation: {
    location: { targetTable: 'DirectoryLocation', fkColumn: 'locationId' },
  },
};

// ── Types ──────────────────────────────────────────────────────────────────

type WhereValue = string | number | boolean | null | Date | WhereValue[];
type WhereOperator = {
  equals?: WhereValue;
  not?: WhereValue;
  in?: WhereValue[];
  notIn?: WhereValue[];
  contains?: string;
  startsWith?: string;
  endsWith?: string;
  gt?: WhereValue;
  gte?: WhereValue;
  lt?: WhereValue;
  lte?: WhereValue;
  isSet?: boolean;
  is?: WhereValue;
};

type WhereField = WhereValue | WhereOperator;
type WhereInput = Record<string, WhereField>;

interface FindManyOptions {
  where?: WhereInput;
  include?: Record<string, unknown>;
  orderBy?: Record<string, string> | Record<string, string>[];
  skip?: number;
  take?: number;
  select?: Record<string, boolean>;
  distinct?: string[];
}

interface FindUniqueOptions {
  where: Record<string, unknown>;
  include?: Record<string, unknown>;
  select?: Record<string, boolean>;
}

interface FindFirstOptions {
  where?: WhereInput;
  include?: Record<string, unknown>;
  orderBy?: Record<string, string>;
  select?: Record<string, boolean>;
}

interface CreateOptions {
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
}

interface UpdateOptions {
  where: Record<string, unknown>;
  data: Record<string, unknown>;
  include?: Record<string, unknown>;
}

interface DeleteOptions {
  where: Record<string, unknown>;
}

interface UpsertOptions {
  where: Record<string, unknown>;
  create: Record<string, unknown>;
  update: Record<string, unknown>;
  include?: Record<string, unknown>;
}

interface CountOptions {
  where?: WhereInput;
}

interface UpdateManyOptions {
  where?: WhereInput;
  data: Record<string, unknown>;
}

interface DeleteManyOptions {
  where?: WhereInput;
}

// ── Helper: Convert a value to a PostgREST OR-clause literal ───────────────
//
// PostgREST OR clauses are built as a single string like
//   "name.ilike.%search%,phone.eq.555"
// where every value is stringified inline. Date instances MUST be converted
// to ISO 8601 here — using Date.toString() produces
//   "Sat Aug 01 2026 12:29:08 GMT+0000 (Coordinated Universal Time)"
// which PostgreSQL rejects with error 22007 (invalid input syntax for type
// timestamp). This was the source of 201 logged errors before this fix.
function toOrLiteral(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (v === null) return 'null';
  return String(v);
}

// ── Helper: Build one PostgREST OR-clause fragment from a Prisma condition ─
//
// Returns either:
//   - a single condition string (e.g. "name.ilike.%search%") when the entry
//     has exactly one leaf condition, OR
//   - a parenthesized AND group (e.g. "(name.eq.x,city.eq.y)") when the entry
//     has multiple fields or contains a nested `AND` array — so they're
//     AND-ed together inside the outer OR.
//   - null if the condition is empty.
//
// PostgREST or() syntax:
//   or('a.eq.1,b.eq.2')              → a=1 OR b=2
//   or('(a.eq.1,b.eq.2),(c.eq.3)')   → (a=1 AND b=2) OR c=3
//
// Recurses into nested `AND`/`OR` arrays so Prisma shapes like
//   { OR: [{ AND: [{ name: 'x' }, { city: 'y' }] }] }
// correctly become or('(name.eq.x,city.eq.y)').
//
// BUG HISTORY:
//   - Nested `AND` inside `OR` was previously not recognized — the handler
//     fell through to the array branch and emitted `AND.in.([object Object])`
//     → PostgREST 400 "column Tenant.AND does not exist" (22 logged errors).
//   - Date values in `gt`/`gte`/`lt`/`lte` were stringified via template
//     literals → Date.toString() → 22007 timestamp parse errors (201 logged).
function buildOrConditionPart(cond: WhereInput): string | null {
  const parts: string[] = [];
  for (const [orField, orValue] of Object.entries(cond)) {
    if (orValue === undefined) continue;

    // Nested AND → each sub-condition becomes a part (AND-ed via parens)
    if (orField === 'AND' && Array.isArray(orValue)) {
      for (const innerCond of orValue as WhereInput[]) {
        const innerPart = buildOrConditionPart(innerCond);
        if (innerPart) parts.push(innerPart);
      }
      continue;
    }
    // Nested OR → flatten (A OR (B OR C) ≡ A OR B OR C)
    if (orField === 'OR' && Array.isArray(orValue)) {
      for (const innerCond of orValue as WhereInput[]) {
        const innerPart = buildOrConditionPart(innerCond);
        if (innerPart) parts.push(innerPart);
      }
      continue;
    }

    // Operator object: { contains, startsWith, equals, gt, gte, lt, lte, in, ... }
    if (orValue !== null && typeof orValue === 'object' && !Array.isArray(orValue) && !(orValue instanceof Date)) {
      const op = orValue as WhereOperator;
      if (op.contains !== undefined) {
        parts.push(`${orField}.ilike.%${op.contains}%`);
      } else if (op.startsWith !== undefined) {
        parts.push(`${orField}.ilike.${op.startsWith}%`);
      } else if (op.endsWith !== undefined) {
        parts.push(`${orField}.ilike.%${op.endsWith}`);
      } else if (op.equals !== undefined) {
        if (op.equals === null) parts.push(`${orField}.is.null`);
        else parts.push(`${orField}.eq.${toOrLiteral(op.equals)}`);
      } else if (op.gt !== undefined) {
        parts.push(`${orField}.gt.${toOrLiteral(op.gt)}`);
      } else if (op.gte !== undefined) {
        parts.push(`${orField}.gte.${toOrLiteral(op.gte)}`);
      } else if (op.lt !== undefined) {
        parts.push(`${orField}.lt.${toOrLiteral(op.lt)}`);
      } else if (op.lte !== undefined) {
        parts.push(`${orField}.lte.${toOrLiteral(op.lte)}`);
      } else if (op.in !== undefined) {
        parts.push(`${orField}.in.(${(op.in as (string | number | boolean)[]).map(toOrLiteral).join(',')})`);
      }
    } else if (orValue === null) {
      parts.push(`${orField}.is.null`);
    } else if (orValue instanceof Date) {
      parts.push(`${orField}.eq.${orValue.toISOString()}`);
    } else if (Array.isArray(orValue)) {
      parts.push(`${orField}.in.(${orValue.map(toOrLiteral).join(',')})`);
    } else {
      parts.push(`${orField}.eq.${toOrLiteral(orValue)}`);
    }
  }

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  // Multiple parts → wrap in and(...) so they're AND-ed inside the outer OR.
  return `and(${parts.join(',')})`;
}

// ── Helper: Map Prisma where clause to Supabase filters ────────────────────

function applyWhereFilters(
  query: ReturnType<SupabaseClient['from']['select'] | SupabaseClient['from']['update'] | SupabaseClient['from']['delete']>,
  where: WhereInput
): void {
  for (const [field, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (field === 'AND' && Array.isArray(value)) {
      for (const cond of value as WhereInput[]) {
        applyWhereFilters(query, cond);
      }
      continue;
    }
    if (field === 'OR' && Array.isArray(value)) {
      // PostgREST supports OR filters with parenthesized syntax:
      //   .or('name.ilike.%search%,phone.ilike.%search%')
      // We build this from the Prisma OR array using buildOrConditionPart(),
      // which correctly handles nested AND arrays and Date→ISO conversion.
      // (Previously this inline loop produced 3 distinct bug classes — see
      // buildOrConditionPart docstring for the full history.)
      const orConditions = value as WhereInput[];
      const orParts: string[] = [];
      for (const cond of orConditions) {
        const part = buildOrConditionPart(cond);
        if (part) orParts.push(part);
      }
      if (orParts.length > 0) {
        query.or(orParts.join(','));
      }
      continue;
    }
    if (field === 'NOT' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Apply NOT filter by negating each condition in the object
      const notConditions = value as WhereInput;
      for (const [notField, notValue] of Object.entries(notConditions)) {
        if (notValue === undefined) continue;
        if (notValue !== null && typeof notValue === 'object' && !Array.isArray(notValue) && !(notValue instanceof Date)) {
          // Negate operator conditions
          const op = notValue as WhereOperator;
          if (op.equals !== undefined) {
            if (op.equals === null) { query.not(notField, 'is', null); }
            else { query.neq(notField, op.equals as string | number | boolean); }
          } else if (op.in !== undefined) {
            // NOT IN: apply each as neq individually (PostgREST has no direct notIn)
            // Using .not('in', ...) with parentheses syntax
            for (const v of op.in as (string | number | boolean)[]) {
              query.neq(notField, v);
            }
          } else if (op.contains !== undefined) {
            query.not(notField, 'ilike', `%${op.contains}%`);
          } else {
            // Fallback: treat as a simple not-equals
            query.neq(notField, notValue as string | number | boolean);
          }
        } else {
          // Simple value: NOT equals
          if (notValue === null) {
            query.not(notField, 'is', null);
          } else {
            query.neq(notField, notValue as string | number | boolean);
          }
        }
      }
      continue;
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      const op = value as WhereOperator;

      // IMPORTANT: use independent `if` blocks (NOT `else if`) so that a
      // compound filter like { gte: start, lte: end } applies BOTH bounds.
      // The previous `else if` chain silently dropped `lte` when `gte` was
      // present, causing the team timesheet API to fetch all shifts from
      // `periodStart` onward with no upper bound on the Supabase adapter.
      if (op.equals !== undefined) {
        if (op.equals === null) { query.is(field, null); }
        else { query.eq(field, op.equals as string | number | boolean); }
      }
      if (op.not !== undefined) {
        if (op.not === null) { query.not(field, 'is', null); }
        else { query.neq(field, op.not as string | number | boolean); }
      }
      if (op.in !== undefined) {
        query.in(field, op.in as (string | number | boolean)[]);
      }
      if (op.contains !== undefined) {
        query.ilike(field, `%${op.contains}%`);
      }
      if (op.startsWith !== undefined) {
        query.ilike(field, `${op.startsWith}%`);
      }
      if (op.endsWith !== undefined) {
        query.ilike(field, `%${op.endsWith}`);
      }
      if (op.gt !== undefined) {
        const val = op.gt instanceof Date ? op.gt.toISOString() : op.gt;
        query.gt(field, val as string | number);
      }
      if (op.gte !== undefined) {
        const val = op.gte instanceof Date ? op.gte.toISOString() : op.gte;
        query.gte(field, val as string | number);
      }
      if (op.lt !== undefined) {
        const val = op.lt instanceof Date ? op.lt.toISOString() : op.lt;
        query.lt(field, val as string | number);
      }
      if (op.lte !== undefined) {
        const val = op.lte instanceof Date ? op.lte.toISOString() : op.lte;
        query.lte(field, val as string | number);
      }
      if (op.isSet === true) {
        query.not(field, 'is', null);
      }
      if (op.isSet === false) {
        query.is(field, null);
      }
      if (op.is !== undefined) {
        if (op.is === null) { query.is(field, null); }
        else { query.eq(field, op.is as string | number | boolean); }
      }
    } else {
      if (value === null) {
        query.is(field, null);
      } else if (value instanceof Date) {
        query.eq(field, value.toISOString());
      } else if (Array.isArray(value)) {
        query.in(field, value as (string | number | boolean)[]);
      } else {
        query.eq(field, value as string | number | boolean);
      }
    }
  }
}

// ── Helper: Apply orderBy ──────────────────────────────────────────────────

function applyOrderBy(
  query: ReturnType<SupabaseClient['from']['select']>,
  orderBy?: Record<string, string> | Record<string, string>[]
): void {
  if (!orderBy) return;

  if (Array.isArray(orderBy)) {
    for (const ob of orderBy) {
      for (const [field, direction] of Object.entries(ob)) {
        query.order(field, { ascending: direction === 'asc', nullsFirst: false });
      }
    }
  } else {
    for (const [field, direction] of Object.entries(orderBy)) {
      query.order(field, { ascending: direction === 'asc', nullsFirst: false });
    }
  }
}

// ── Helper: Convert dates to ISO strings in data objects ───────────────────

function serializeData(data: Record<string, unknown>, currentRow?: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value === undefined) {
      continue;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      // Handle Prisma atomic operations: { increment: N }, { decrement: N }, { multiply: N }, { divide: N }, { set: V }
      const op = value as Record<string, unknown>;
      if ('increment' in op) {
        const current = typeof currentRow?.[key] === 'number' ? currentRow[key] : 0;
        result[key] = (current as number) + (op.increment as number);
      } else if ('decrement' in op) {
        const current = typeof currentRow?.[key] === 'number' ? currentRow[key] : 0;
        result[key] = (current as number) - (op.decrement as number);
      } else if ('multiply' in op) {
        const current = typeof currentRow?.[key] === 'number' ? currentRow[key] : 0;
        result[key] = (current as number) * (op.multiply as number);
      } else if ('divide' in op) {
        const current = typeof currentRow?.[key] === 'number' ? currentRow[key] : 0;
        result[key] = (current as number) / (op.divide as number);
      } else if ('set' in op) {
        result[key] = op.set;
      } else {
        // Unknown object — skip it rather than sending a malformed value
        console.warn(`[SupabaseDB] serializeData: skipping unrecognized atomic operation on field "${key}":`, value);
      }
    } else {
      result[key] = value;
    }
  }
  return result;
}

// ── Helper: Flatten Prisma composite-unique `where` clauses ────────────────
//
// Prisma encodes a composite unique key (e.g. `@@unique([tenantId, featureKey])`)
// as a nested object under a synthesized key name:
//
//   where: { tenantId_featureKey: { tenantId: 'abc', featureKey: 'x' } }
//
// PostgREST has no notion of composite keys — it expects individual column
// filters. This helper detects the composite-key shape (an object value where
// a primitive is expected) and flattens it back into primitive entries:
//
//   { tenantId_featureKey: { tenantId: 'abc', featureKey: 'x' } }
//     → { tenantId: 'abc', featureKey: 'x' }
//
// It also returns the underlying column names so upsert() can build a correct
// `onConflict` string ("tenantId,featureKey" instead of the bogus
// "tenantId_featureKey" which PostgREST would interpret as a literal column).
//
// Bug history: without this, FeatureFlag.upsert() sent
// `on_conflict=tenantId_featureKey` → PostgREST 400 ("column
// tenantId_featureKey does not exist"). Same shape caused 84 logged errors.

interface FlattenedWhere {
  flat: Record<string, unknown>;
  /** Column names that make up the unique constraint, in declaration order. */
  uniqueColumns: string[];
}

function flattenCompositeWhere(where: Record<string, unknown>): FlattenedWhere {
  const flat: Record<string, unknown> = {};
  let uniqueColumns: string[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    // Prisma composite-unique shape: the value is a non-null, non-Date,
    // non-array plain object whose keys are real column names.
    // (e.g. { tenantId_featureKey: { tenantId: 'abc', featureKey: 'x' } })
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      const inner = value as Record<string, unknown>;
      const innerKeys = Object.keys(inner);
      // Only flatten if the inner object has at least 2 keys (a composite) AND
      // none of them look like Prisma operators ({ equals, in, gt, ... }).
      // A single-key object with an operator value should stay as-is so the
      // main applyWhereFilters loop can handle it.
      const looksLikeOperatorObject = innerKeys.some((k) =>
        ['equals', 'not', 'in', 'notIn', 'contains', 'startsWith', 'endsWith',
         'gt', 'gte', 'lt', 'lte', 'isSet', 'is'].includes(k)
      );
      if (innerKeys.length >= 2 && !looksLikeOperatorObject) {
        // Composite unique — flatten it. Capture the column order from the
        // inner object so onConflict matches the unique index declaration.
        uniqueColumns = innerKeys;
        for (const [col, colVal] of Object.entries(inner)) {
          if (colVal !== undefined) flat[col] = colVal;
        }
        continue;
      }
    }

    // Primitive value (string/number/boolean/null) or single-key operator
    // object like { equals: 'x' } — keep as a filter on `key` directly.
    flat[key] = value;
    // For single-column uniques, `key` IS the column name.
    if (!uniqueColumns.includes(key)) {
      uniqueColumns.push(key);
    }
  }

  return { flat, uniqueColumns };
}

// ── Helper: Get table name for a model ─────────────────────────────────────

function getTableName(modelName: string): string {
  const lowerName = modelName.charAt(0).toLowerCase() + modelName.slice(1);
  if (TABLE_MAP[lowerName]) {
    return TABLE_MAP[lowerName];
  }
  return modelName.charAt(0).toUpperCase() + modelName.slice(1);
}

// ── Helper: Resolve includes with separate queries ─────────────────────────

async function resolveIncludes(
  tableName: string,
  results: Record<string, unknown>[],
  include?: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  if (!include || results.length === 0) return results;

  const client = getAdminClient();
  const modelRelations = RELATION_MAP[tableName] || {};

  for (const [relName, relConfig] of Object.entries(include)) {
    if (relName === '_count') continue; // handled separately
    if (!modelRelations[relName]) {
      // Surface missing-relation bugs loudly instead of silently skipping.
      // This is the most common cause of "include not working" in Supabase mode.
      console.warn(
        `[SupabaseDB] RELATION_MAP missing: ${tableName}.${relName} — include silently skipped. ` +
          `Add an entry to RELATION_MAP.${tableName} in src/lib/supabase-db.ts to fix.`
      );
      continue;
    }

    const rel = modelRelations[relName];
    const relInclude = relConfig as Record<string, unknown>;
    const relSelect = (relInclude?.select as Record<string, boolean>) || undefined;

    // ── Determine the join key for this relation type ───────────────────
    // The join key is the column on the TARGET table that we use to map
    // fetched rows back to the main records:
    //   - Forward relation (main.tenantId → Tenant.id): join key = 'id'
    //   - Reverse relation (Target.tenantId → Tenant.id): join key = targetFkColumn
    //   - One-to-many (Target.subscriptionId → Subscription.id): join key = targetFkColumn
    //
    // CRITICAL: When the caller uses a `select` clause (e.g.
    //   include: { tenant: { select: { name: true, email: true } } })
    // the select string would NOT include the join key. Without it, the
    // Supabase response rows lack the field we need to map them back,
    // causing EVERY relation lookup to return null → "Unknown" bug.
    //
    // Fix: auto-append the join key to the select string, then strip it
    // from the results AFTER mapping so the output matches Prisma's
    // select behavior exactly.
    const joinKey = rel.isMany
      ? rel.targetFkColumn!
      : (rel.targetFkColumn || 'id');

    let shouldStripJoinKey = false;
    let finalSelectStr = '*';
    if (relSelect) {
      const fields = Object.entries(relSelect)
        .filter(([, v]) => v === true)
        .map(([k]) => k);
      if (!fields.includes(joinKey)) {
        fields.push(joinKey);
        shouldStripJoinKey = true;
      }
      finalSelectStr = fields.join(',');
    }

    // Determine the FK column direction
    if (rel.isMany) {
      // One-to-many: target table has FK pointing back to main table
      const targetFkCol = rel.targetFkColumn!;
      // Get all main record IDs
      const mainIds = results.map(r => r.id).filter(Boolean) as string[];
      if (mainIds.length === 0) continue;

      // Fetch all related records (join key is guaranteed present)
      const { data: related, error } = await client
        .from(rel.targetTable)
        .select(finalSelectStr)
        .in(targetFkCol, mainIds);

      if (error || !related) continue;

      // Group by FK value (join key is present in each row)
      const grouped = new Map<string, unknown[]>();
      for (const r of related) {
        const fkVal = r[targetFkCol] as string;
        if (!grouped.has(fkVal)) grouped.set(fkVal, []);
        grouped.get(fkVal)!.push(r);
      }

      // Strip the join key if we added it (matches Prisma select behavior)
      if (shouldStripJoinKey) {
        for (const r of related) delete r[joinKey];
      }

      // Attach to main records
      for (const main of results) {
        main[relName] = grouped.get(main.id as string) || [];
      }
    } else if (rel.targetFkColumn) {
      // Reverse relation: target table has FK pointing to main table (one-to-one reverse)
      const mainIds = results.map(r => r.id).filter(Boolean) as string[];
      if (mainIds.length === 0) continue;

      const { data: related, error } = await client
        .from(rel.targetTable)
        .select(finalSelectStr)
        .in(rel.targetFkColumn, mainIds);

      if (error || !related) continue;

      // Map by FK value (join key is present in each row)
      const relatedMap = new Map<string, unknown>();
      for (const r of related) {
        relatedMap.set(r[rel.targetFkColumn] as string, r);
      }

      // Strip the join key if we added it
      if (shouldStripJoinKey) {
        for (const r of related) delete r[joinKey];
      }

      for (const main of results) {
        main[relName] = relatedMap.get(main.id as string) || null;
      }
    } else {
      // Forward relation: main table has FK pointing to target table
      const fkColumn = rel.fkColumn;
      // Collect FK values from main records
      const fkValues = [...new Set(results.map(r => r[fkColumn]).filter(Boolean))] as string[];
      if (fkValues.length === 0) {
        for (const main of results) { main[relName] = null; }
        continue;
      }

      // Fetch target records (join key 'id' is guaranteed present)
      const { data: related, error } = await client
        .from(rel.targetTable)
        .select(finalSelectStr)
        .in('id', fkValues);

      if (error || !related) continue;

      // Map by ID (join key 'id' is present in each row)
      const relatedMap = new Map<string, unknown>();
      for (const r of related) {
        relatedMap.set(r.id as string, r);
      }

      // Strip the join key if we added it
      if (shouldStripJoinKey) {
        for (const r of related) delete r[joinKey];
      }

      // Attach to main records
      for (const main of results) {
        main[relName] = relatedMap.get(main[fkColumn] as string) || null;
      }
    }
  }

  return results;
}

// ── Helper: Resolve _count includes ────────────────────────────────────────

async function resolveCounts(
  tableName: string,
  results: Record<string, unknown>[],
  include?: Record<string, unknown>
): Promise<void> {
  if (!include?._count || results.length === 0) return;

  const client = getAdminClient();
  const countSelect = (include._count as Record<string, unknown>).select as Record<string, boolean>;
  if (!countSelect) return;

  const countFields = Object.keys(countSelect).filter(k => countSelect[k]);

  for (const main of results) {
    const countObj: Record<string, number> = {};
    for (const relField of countFields) {
      try {
        // Determine FK column name - the main model's ID in the target table
        const targetTable = getTableName(relField);
        const fkColumn = tableName.charAt(0).toLowerCase() + tableName.slice(1) + 'Id';
        const { count } = await client
          .from(targetTable)
          .select('*', { count: 'exact', head: true })
          .eq(fkColumn, main.id as string);
        countObj[relField] = count || 0;
      } catch {
        countObj[relField] = 0;
      }
    }
    main._count = countObj;
  }
}

// ── SupabaseModel: Prisma-compatible interface for a single model ──────────

class SupabaseModel {
  private tableName: string;
  private modelName: string;

  constructor(modelName: string) {
    this.modelName = modelName;
    this.tableName = getTableName(modelName);
  }

  private get client() {
    return getAdminClient();
  }

  private get isMissingTable(): boolean {
    return MISSING_TABLES.has(this.tableName);
  }

  async findMany(options: FindManyOptions = {}): Promise<unknown[]> {
    if (this.isMissingTable) {
      console.warn(`[SupabaseDB] Table ${this.tableName} not in Supabase, returning empty`);
      return [];
    }

    const { where, include, orderBy, skip, take } = options;

    let query = this.client.from(this.tableName).select('*');

    if (where) applyWhereFilters(query, where);
    if (orderBy) applyOrderBy(query, orderBy);
    if (skip !== undefined || take !== undefined) {
      const from = skip || 0;
      const to = take !== undefined ? from + take - 1 : from + 49;
      query.range(from, to);
    }

    const { data, error } = await query;
    if (error) {
      const whereStr = where ? JSON.stringify(where).substring(0, 200) : 'none';
      console.error(
        `[SupabaseDB] findMany error on ${this.tableName}: code=${error.code} message="${error.message}" details="${error.details || ''}" hint="${error.hint || ''}" where=${whereStr}`
      );
      return [];
    }

    let results = (data || []) as Record<string, unknown>[];

    // Resolve includes with separate queries
    if (include) {
      results = await resolveIncludes(this.tableName, results, include);
      await resolveCounts(this.tableName, results, include);
    }

    return results;
  }

  async findUnique(options: FindUniqueOptions): Promise<unknown | null> {
    if (this.isMissingTable) return null;

    const { where, include, select } = options;

    // Build select string: use specific columns if select is provided, otherwise '*'
    let selectStr = '*';
    if (select) {
      const cols = Object.entries(select).filter(([, v]) => v === true).map(([k]) => k);
      if (cols.length > 0) selectStr = cols.join(',');
    }
    let query = this.client.from(this.tableName).select(selectStr);

    // Flatten composite-unique where (e.g. { tenantId_featureKey: {...} }
    // → { tenantId: '...', featureKey: '...' }) so we filter on real columns.
    const { flat: flatWhere } = flattenCompositeWhere(where);
    for (const [field, value] of Object.entries(flatWhere)) {
      if (value !== undefined) {
        query.eq(field, value as string | number | boolean);
      }
    }

    const { data, error } = await query.limit(1).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error(`[SupabaseDB] findUnique error on ${this.tableName}:`, error.message);
      return null;
    }

    if (include && data) {
      const resolved = await resolveIncludes(this.tableName, [data as Record<string, unknown>], include);
      await resolveCounts(this.tableName, resolved, include);
      return resolved?.[0] ?? data;
    }

    return data;
  }

  async findFirst(options: FindFirstOptions = {}): Promise<unknown | null> {
    if (this.isMissingTable) return null;

    const { where, include, orderBy, select } = options;

    // Build select string: use specific columns if select is provided, otherwise '*'
    let selectStr = '*';
    if (select) {
      const cols = Object.entries(select).filter(([, v]) => v === true).map(([k]) => k);
      if (cols.length > 0) selectStr = cols.join(',');
    }
    let query = this.client.from(this.tableName).select(selectStr);

    if (where) applyWhereFilters(query, where);
    if (orderBy) applyOrderBy(query, orderBy);

    const { data, error } = await query.limit(1).single();
    if (error) {
      if (error.code === 'PGRST116') return null; // No rows found — not an error
      // Log detailed error context for production debugging
      const whereStr = where ? JSON.stringify(where).substring(0, 200) : 'none';
      console.error(
        `[SupabaseDB] findFirst error on ${this.tableName}: code=${error.code} message="${error.message}" details="${error.details || ''}" hint="${error.hint || ''}" where=${whereStr}`
      );
      return null;
    }

    if (include && data) {
      const resolved = await resolveIncludes(this.tableName, [data as Record<string, unknown>], include);
      return resolved?.[0] ?? data;
    }

    return data;
  }

  async create(options: CreateOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { data, include } = options;
    const serialized = serializeData(data);

    // Auto-generate an 'id' if not provided — Prisma uses @default(cuid()) which
    // generates IDs client-side, but PostgREST won't do this for tables created
    // by Prisma migrations (those columns have NOT NULL with no DEFAULT).
    if (!('id' in serialized) || serialized.id === undefined || serialized.id === null) {
      serialized.id = nanoid(25);
    }

    // Auto-set createdAt if not provided — some tables need this
    if (!('createdAt' in serialized) && !('created_at' in serialized)) {
      serialized.createdAt = new Date().toISOString();
    }

    // Auto-set updatedAt if not provided — but only for tables that actually have
    // this column. Many tables (ImageLibrary, BrandKit, Execution, etc.) don't have
    // updatedAt, and adding it causes PostgREST to reject the insert.
    if (!('updatedAt' in serialized) && !('updated_at' in serialized) && !TABLES_WITHOUT_UPDATED_AT.has(this.tableName)) {
      serialized.updatedAt = new Date().toISOString();
    }

    let { data: result, error } = await this.client
      .from(this.tableName)
      .insert(serialized)
      .select('*')
      .single();

    // Resilient retry loop: if PostgREST rejects a column that doesn't exist
    // on this table (e.g. `createdAt` on `Execution`, which only has
    // `startedAt`/`finishedAt`), strip that column and retry. We loop so we
    // can recover from multiple bad columns in a single create() call
    // (e.g. a table that has neither `createdAt` nor `updatedAt`).
    // PostgREST error formats:
    //   "Could not find the 'createdAt' column of 'Execution' in the schema cache"  (Supabase/PostgREST v11+)
    //   "Could not find the `createdAt` column of `Execution` in the schema cache"  (older PostgREST)
    //   'column "updatedAt" of relation "Execution" does not exist'  (PostgreSQL)
    let retryCount = 0;
    while (error && retryCount < 4) {
      const msg = error.message || '';
      const missingColMatch = msg.match(
        /(?:Could not find the ['`"]?(\w+)['`"]? column of|column "(\w+)" of relation)/
      );
      if (!missingColMatch) {
        console.warn(`[SupabaseDB] create retry on ${this.tableName}: error did not match missing-column pattern: "${msg}"`);
        break;
      }
      const badCol = missingColMatch[1] || missingColMatch[2];
      if (!badCol || !(badCol in serialized)) break;
      console.log(`[SupabaseDB] create retry on ${this.tableName}: stripping missing column "${badCol}" and retrying`);
      delete serialized[badCol];
      retryCount++;
      const retry = await this.client
        .from(this.tableName)
        .insert(serialized)
        .select('*')
        .single();
      result = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`[SupabaseDB] create error on ${this.tableName}:`, error.message, error.details, error.code);
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    }

    if (include && result) {
      const resolved = await resolveIncludes(this.tableName, [result as Record<string, unknown>], include);
      return resolved?.[0] ?? result;
    }

    return result;
  }

  /**
   * Bulk insert. PostgREST's `.insert()` accepts an array, so we can insert
   * many rows in a single round-trip.
   *
   * IMPORTANT: Not all tables have `createdAt` / `updatedAt` columns. For
   * example, `ContactGroup` has `addedAt` (not `createdAt`) and no
   * `updatedAt`; `ContactTag` has `appliedAt` and no `updatedAt`. So we
   * auto-generate only the `id` (always needed), try the insert, and if
   * PostgREST rejects a column that doesn't exist, we strip it and retry.
   *
   * Returns `{ count: N }` to match Prisma's createMany result shape.
   */
  async createMany(options: {
    data: Record<string, unknown> | Record<string, unknown>[];
    skipDuplicates?: boolean;
  }): Promise<{ count: number }> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const rows = Array.isArray(options.data) ? options.data : [options.data];
    if (rows.length === 0) return { count: 0 };

    // Auto-generate the id, and auto-set createdAt/updatedAt — mirroring
    // create()'s logic. Previously this method relied on DB-level DEFAULT
    // clauses for timestamps, but many Supabase tables (Tenant, Customer,
    // Job, Lead, etc.) have `updatedAt` as NOT NULL with NO default, so a
    // bulk insert without an explicit `updatedAt` value fails with a 23502
    // not-null violation (Bug #8 — caused 5 errors in marketplace seed).
    // For tables in TABLES_WITHOUT_UPDATED_AT (ContactGroup, ContactTag,
    // Execution, etc.), we skip updatedAt; the retry loop below strips
    // createdAt if the table doesn't have that column either.
    const baseRows = rows.map((row) => {
      const s = serializeData(row);
      if (!('id' in s) || s.id === undefined || s.id === null) {
        s.id = nanoid(25);
      }
      // Auto-set createdAt if not provided (same as create())
      if (!('createdAt' in s) && !('created_at' in s)) {
        s.createdAt = new Date().toISOString();
      }
      // Auto-set updatedAt if not provided — but only for tables that
      // actually have this column (mirrors create() logic).
      if (!('updatedAt' in s) && !('updated_at' in s) && !TABLES_WITHOUT_UPDATED_AT.has(this.tableName)) {
        s.updatedAt = new Date().toISOString();
      }
      return s;
    });

    // Attempt the bulk insert. If PostgREST reports that a column doesn't
    // exist (e.g. the caller passed `createdAt` but the table has no such
    // column), strip the offending column from ALL rows and retry once.
    const attemptInsert = async (
      data: Record<string, unknown>[]
    ): Promise<{ count: number; error: string | null }> => {
      try {
        const { data: inserted, error } = await this.client
          .from(this.tableName)
          .insert(data)
          .select('*');
        if (error) {
          return { count: 0, error: error.message };
        }
        return {
          count: Array.isArray(inserted) ? inserted.length : data.length,
          error: null,
        };
      } catch (e) {
        return {
          count: 0,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    };

    // Try with the data as-is (caller-provided fields + auto id only).
    let result = await attemptInsert(baseRows);

    // If the error is about a missing column, strip that column and retry.
    // PostgREST error messages look like:
    //   "Could not find the 'createdAt' column of 'ContactGroup' in the schema cache"  (Supabase/PostgREST v11+)
    //   'column "updatedAt" of relation "ContactGroup" does not exist'  (PostgreSQL)
    if (result.error) {
      const missingColMatch = result.error.match(
        /(?:Could not find the ['`"]?(\w+)['`"]? column|column "(\w+)" of relation)/
      );
      if (missingColMatch) {
        const badCol = missingColMatch[1] || missingColMatch[2];
        if (badCol) {
          const strippedRows = baseRows.map((r) => {
            const { [badCol]: _, ...rest } = r;
            return rest;
          });
          result = await attemptInsert(strippedRows);
          // If still failing, try stripping both createdAt and updatedAt
          if (result.error) {
            const stripped2 = strippedRows.map((r) => {
              const { createdAt, updatedAt, created_at, updated_at, ...rest } = r as any;
              return rest;
            });
            result = await attemptInsert(stripped2);
          }
        }
      }
    }

    // If bulk insert succeeded, return the count.
    if (!result.error) {
      return { count: result.count };
    }

    // Fallback: insert rows one-by-one so a single bad row doesn't kill the
    // whole batch. This also handles unique-constraint violations gracefully
    // (the offending row is skipped, the rest succeed).
    console.warn(
      `[SupabaseDB] createMany bulk insert failed on ${this.tableName}, falling back to one-by-one:`,
      result.error
    );
    let salvaged = 0;
    let lastError = result.error;
    for (const row of baseRows) {
      const { error: rowErr } = await this.client
        .from(this.tableName)
        .insert(row);
      if (rowErr) {
        // If the error is about a missing column, strip it from remaining rows
        const colMatch = rowErr.message?.match(
          /(?:Could not find the ['`"]?(\w+)['`"]? column|column "(\w+)" of relation)/
        );
        if (colMatch) {
          const badCol = colMatch[1] || colMatch[2];
          if (badCol) {
            for (const r of baseRows) {
              delete r[badCol];
            }
          }
        }
        lastError = rowErr.message;
      } else {
        salvaged++;
      }
    }

    if (salvaged === 0) {
      throw new Error(
        `Failed to createMany on ${this.tableName}: ${lastError}`
      );
    }

    return { count: salvaged };
  }

  async update(options: UpdateOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { where, data, include } = options;

    // Flatten composite-unique where (e.g. { tenantId_featureKey: {...} }
    // → { tenantId: '...', featureKey: '...' }) so we filter on real columns.
    const { flat: flatWhere } = flattenCompositeWhere(where);

    // Check if data contains any Prisma atomic operations (increment, decrement, etc.)
    // that require knowing the current row values. If so, fetch the current row first.
    let currentRow: Record<string, unknown> | undefined;
    const hasAtomicOp = Object.values(data).some(
      (v) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date) &&
        ('increment' in (v as Record<string, unknown>) || 'decrement' in (v as Record<string, unknown>) ||
         'multiply' in (v as Record<string, unknown>) || 'divide' in (v as Record<string, unknown>))
    );
    if (hasAtomicOp) {
      try {
        const fetchQuery = this.client.from(this.tableName).select('*');
        for (const [field, value] of Object.entries(flatWhere)) {
          if (value !== undefined) {
            fetchQuery.eq(field, value as string | number | boolean);
          }
        }
        const { data: fetched, error: fetchErr } = await fetchQuery.limit(1).single();
        if (!fetchErr && fetched) {
          currentRow = fetched as Record<string, unknown>;
        }
      } catch {
        // If we can't fetch the current row, atomic ops will use default values (0)
      }
    }

    const serialized = serializeData(data, currentRow);

    // Auto-set updatedAt — Prisma does this with @updatedAt at the application layer,
    // but PostgREST has no such feature. Without this, updatedAt stays stale.
    // Only set it if it's not already provided AND the table actually has this column.
    if (!('updatedAt' in serialized) && !TABLES_WITHOUT_UPDATED_AT.has(this.tableName)) {
      serialized.updatedAt = new Date().toISOString();
    }

    let query = this.client.from(this.tableName).update(serialized).select('*');

    for (const [field, value] of Object.entries(flatWhere)) {
      if (value !== undefined) {
        query.eq(field, value as string | number | boolean);
      }
    }

    let { data: result, error } = await query.single();

    // Resilient retry loop: strip any column PostgREST rejects (e.g.
    // `updatedAt` on tables that don't have it, like `Execution`).
    let retryCount = 0;
    while (error && retryCount < 4) {
      const msg = error.message || '';
      const missingColMatch = msg.match(
        /(?:Could not find the ['`"]?(\w+)['`"]? column of|column "(\w+)" of relation)/
      );
      if (!missingColMatch) break;
      const badCol = missingColMatch[1] || missingColMatch[2];
      if (!badCol || !(badCol in serialized)) break;
      delete serialized[badCol];
      retryCount++;
      let retryQuery = this.client.from(this.tableName).update(serialized).select('*');
      for (const [field, value] of Object.entries(flatWhere)) {
        if (value !== undefined) {
          retryQuery.eq(field, value as string | number | boolean);
        }
      }
      const retry = await retryQuery.single();
      result = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`[SupabaseDB] update error on ${this.tableName}:`, error.message);
      throw new Error(`Failed to update ${this.tableName}: ${error.message}`);
    }

    if (include && result) {
      const resolved = await resolveIncludes(this.tableName, [result as Record<string, unknown>], include);
      return resolved?.[0] ?? result;
    }

    return result;
  }

  async upsert(options: UpsertOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { where, create, update, include } = options;

    // Flatten composite-unique where (e.g. { tenantId_featureKey: {...} }
    // → { tenantId: '...', featureKey: '...' }). This was Bug #4 — PostgREST
    // received on_conflict=tenantId_featureKey and 400'd because no such
    // column exists (the real unique index is on (tenantId, featureKey)).
    const { flat: flatWhere } = flattenCompositeWhere(where);

    // Manual upsert: find first, then create or update.
    //
    // We DON'T use PostgREST's native upsert (INSERT ... ON CONFLICT DO UPDATE)
    // because of three bugs that collectively caused ~3,000 logged errors:
    //
    //   1. Plan.id NOT NULL (1,512 errors): PostgREST upsert requires `id` in
    //      the payload for the INSERT path, but auto-generating id would
    //      OVERWRITE the existing id on the UPDATE path (breaking FK
    //      references for tables like Tenant).
    //   2. Tenant.updatedAt NOT NULL (256 errors): same auto-timestamp issue
    //      — needed for INSERT, can't blindly set on UPDATE.
    //   3. NOT NULL violations on INSERT don't trigger the ON CONFLICT
    //      clause, so the whole statement fails even when the row exists
    //      and should be updated.
    //
    // The 2-query approach (find + create/update) is slightly slower but
    // always correct. create() auto-generates id + timestamps; update()
    // auto-sets updatedAt and never touches id. Both have retry loops for
    // bad columns.

    let findQuery = this.client.from(this.tableName).select('id');
    for (const [field, value] of Object.entries(flatWhere)) {
      if (value !== undefined) {
        findQuery = findQuery.eq(field, value as string | number | boolean);
      }
    }
    const { data: existing, error: findErr } = await findQuery.limit(1).maybeSingle();

    if (findErr) {
      console.error(`[SupabaseDB] upsert find error on ${this.tableName}:`, findErr.message);
      // Fall through to create — if the table has a deeper issue, create()
      // will surface a clearer error.
    }

    if (existing) {
      // Row exists → UPDATE (id is preserved, not in update payload)
      return this.update({ where: flatWhere, data: update, include });
    } else {
      // Row doesn't exist → CREATE (create() auto-generates id, createdAt,
      // updatedAt and has the bad-column retry loop)
      return this.create({ data: create, include });
    }
  }

  async delete(options: DeleteOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { where } = options;
    let query = this.client.from(this.tableName).delete();

    // Flatten composite-unique where (e.g. { tenantId_featureKey: {...} }
    // → { tenantId: '...', featureKey: '...' }) so we filter on real columns.
    const { flat: flatWhere } = flattenCompositeWhere(where);
    for (const [field, value] of Object.entries(flatWhere)) {
      if (value !== undefined) {
        query.eq(field, value as string | number | boolean);
      }
    }

    const { data: result, error } = await query.select().single();
    if (error) {
      console.error(`[SupabaseDB] delete error on ${this.tableName}:`, error.message);
      throw new Error(`Failed to delete from ${this.tableName}: ${error.message}`);
    }

    return result;
  }

  async count(options: CountOptions = {}): Promise<number> {
    if (this.isMissingTable) return 0;

    const { where } = options;
    let query = this.client.from(this.tableName).select('*', { count: 'exact', head: true });

    if (where) applyWhereFilters(query, where);

    const { count, error } = await query;
    if (error) {
      console.error(`[SupabaseDB] count error on ${this.tableName}:`, error.message);
      return 0;
    }

    return count || 0;
  }

  async updateMany(options: UpdateManyOptions): Promise<{ count: number }> {
    if (this.isMissingTable) return { count: 0 };

    const { where, data } = options;
    const serialized = serializeData(data);

    let query = this.client.from(this.tableName).update(serialized);

    if (where) applyWhereFilters(query, where);

    const { count, error } = await query;
    if (error) {
      console.error(`[SupabaseDB] updateMany error on ${this.tableName}:`, error.message);
      return { count: 0 };
    }

    return { count: count || 0 };
  }

  async deleteMany(options: DeleteManyOptions = {}): Promise<{ count: number }> {
    if (this.isMissingTable) return { count: 0 };

    const { where } = options;
    let query = this.client.from(this.tableName).delete();

    if (where) applyWhereFilters(query, where);

    const { count, error } = await query;
    if (error) {
      console.error(`[SupabaseDB] deleteMany error on ${this.tableName}:`, error.message);
      return { count: 0 };
    }

    return { count: count || 0 };
  }

  async aggregate(options: Record<string, unknown>): Promise<unknown> {
    const { where, _sum, _count, _avg, _min, _max } = options as {
      where?: WhereInput;
      _sum?: Record<string, boolean>;
      _count?: boolean | Record<string, boolean>;
      _avg?: Record<string, boolean>;
      _min?: Record<string, boolean>;
      _max?: Record<string, boolean>;
    };

    if (this.isMissingTable) {
      const emptyResult: Record<string, unknown> = {};
      if (_sum) emptyResult._sum = {};
      if (_count) emptyResult._count = typeof _count === 'boolean' ? 0 : {};
      return emptyResult;
    }

    let query = this.client.from(this.tableName).select('*');
    if (where) applyWhereFilters(query, where);

    const { data, error } = await query;
    if (error) {
      console.error(`[SupabaseDB] aggregate error on ${this.tableName}:`, error.message);
      return { _count: 0, _sum: {} };
    }

    const records = data || [];
    const result: Record<string, unknown> = {};

    // _count
    if (_count === true) {
      result._count = records.length;
    } else if (typeof _count === 'object') {
      result._count = records.length;
    }

    // _sum - compute sums client-side
    if (_sum) {
      const sumResult: Record<string, number> = {};
      for (const field of Object.keys(_sum)) {
        sumResult[field] = records.reduce((acc, r) => acc + (Number(r[field]) || 0), 0);
      }
      result._sum = sumResult;
    }

    // _avg - compute averages client-side
    if (_avg) {
      const avgResult: Record<string, number> = {};
      for (const field of Object.keys(_avg)) {
        const values = records.map(r => Number(r[field])).filter(v => !isNaN(v));
        avgResult[field] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      }
      result._avg = avgResult;
    }

    // _min / _max
    if (_min) {
      const minResult: Record<string, unknown> = {};
      for (const field of Object.keys(_min)) {
        const values = records.map(r => r[field]).filter(v => v !== null && v !== undefined);
        minResult[field] = values.length > 0 ? values.reduce((a, b) => a < b ? a : b) : null;
      }
      result._min = minResult;
    }
    if (_max) {
      const maxResult: Record<string, unknown> = {};
      for (const field of Object.keys(_max)) {
        const values = records.map(r => r[field]).filter(v => v !== null && v !== undefined);
        maxResult[field] = values.length > 0 ? values.reduce((a, b) => a > b ? a : b) : null;
      }
      result._max = maxResult;
    }

    return result;
  }

  async groupBy(options: Record<string, unknown>): Promise<unknown[]> {
    if (this.isMissingTable) return [];

    const by = options.by as string[];
    const where = options.where as WhereInput | undefined;

    if (!by || by.length === 0) return [];

    // Select ONLY the group-by columns to minimize wire payload size.
    const selectCols = by.join(',');
    let query = this.client.from(this.tableName).select(selectCols);

    if (where) applyWhereFilters(query, where);

    const { data, error } = await query;
    if (error) {
      console.error(`[SupabaseDB] groupBy error on ${this.tableName}:`, error.message);
      return [];
    }

    const rows = (data || []) as Record<string, unknown>[];

    const countField = by[0]; // e.g. 'industry'
    const countsMap = new Map<string | null, number>();
    for (const r of rows) {
      const val = r[countField] as string | null;
      countsMap.set(val, (countsMap.get(val) || 0) + 1);
    }

    const countObj = options._count as Record<string, unknown> | undefined;
    const countKeys = countObj ? Object.keys(countObj) : ['id'];

    const result = Array.from(countsMap.entries()).map(([val, count]) => {
      const _count: Record<string, number> = {};
      for (const k of countKeys) {
        _count[k] = count;
      }
      return {
        [countField]: val,
        _count
      };
    });

    return result;
  }
}

// ── SupabaseDB: Top-level database interface ──────────────────────────────

class SupabaseDB {
  private models: Map<string, SupabaseModel> = new Map();

  private getModel(name: string): SupabaseModel {
    if (!this.models.has(name)) {
      this.models.set(name, new SupabaseModel(name));
    }
    return this.models.get(name)!;
  }

  /**
   * Transaction support.
   *
   * Prisma's $transaction has two forms:
   *   1. Array form:   $transaction([promise1, promise2])
   *   2. Interactive:  $transaction(async (tx) => { tx.model.create(...) })
   *
   * PostgREST (the Supabase REST API) does not support real ACID transactions,
   * but most callers use $transaction only to group writes that don't strictly
   * need atomicity. We support BOTH forms:
   *   - Array form: resolve each promise sequentially.
   *   - Interactive form: invoke the callback with the proxied `supabaseDb`
   *     (the same object callers import as `db`) so `tx.model.method()` works
   *     exactly like `db.model.method()`. There is no rollback on error — the
   *     caller's try/catch is responsible for handling partial failures.
   *
   * This is what unblocks all the API routes that use the interactive form
   * (contacts/bulk, contacts/route, contacts/[id], email-providers, etc.)
   * when running against Supabase in production.
   */
  async $transaction<T>(
    operationsOrCallback: Promise<unknown>[] | ((tx: typeof supabaseDb) => Promise<T>)
  ): Promise<T | unknown[]> {
    if (typeof operationsOrCallback === 'function') {
      // Interactive form: pass the proxied db object as the "transaction
      // client" so `tx.contact.findMany()` resolves through the same Proxy
      // that `db.contact.findMany()` does.
      return await operationsOrCallback(supabaseDb);
    }
    // Array form: resolve sequentially.
    const results: unknown[] = [];
    for (const op of operationsOrCallback) {
      results.push(await op);
    }
    return results;
  }

  async $connect(): Promise<void> {}
  async $disconnect(): Promise<void> {}
}

// ── Create and export the Supabase DB instance with Proxy ──────────────────

const supabaseDB = new SupabaseDB();

export const supabaseDb = new Proxy({} as Record<string, SupabaseModel>, {
  get: (_, prop) => {
    if (typeof prop === 'string') {
      if (prop === '$transaction') {
        // Support both array and interactive forms (see SupabaseDB.$transaction).
        return (
          operationsOrCallback:
            | Promise<unknown>[]
            | ((tx: SupabaseDB) => Promise<unknown>)
        ) => supabaseDB.$transaction(operationsOrCallback as any);
      }
      if (prop === '$connect') return () => supabaseDB.$connect();
      if (prop === '$disconnect') return () => supabaseDB.$disconnect();
      return supabaseDB.getModel(prop);
    }
    return undefined;
  },
});

export { getAdminClient as getSupabaseAdmin };

export function shouldUseSupabaseDB(): boolean {
  const flag = process.env.USE_SUPABASE_DB;
  const isTruthy = flag === 'true' || flag === '1' || flag === 'yes' || flag === 'TRUE' || flag === 'Yes';
  const hasCredentials = !!supabaseUrl && !!supabaseServiceKey;

  if (isTruthy && !hasCredentials) {
    console.error(
      '[SupabaseDB] USE_SUPABASE_DB is set but credentials are missing!',
      `URL: ${supabaseUrl ? 'SET' : 'MISSING'},`,
      `ServiceKey: ${supabaseServiceKey ? 'SET' : 'MISSING'}`
    );
  }

  if (isTruthy && hasCredentials) {
    console.log('[SupabaseDB] Supabase REST API mode ENABLED');
    return true;
  }

  if (isTruthy) {
    console.warn('[SupabaseDB] USE_SUPABASE_DB is set but credentials incomplete, falling back to Prisma');
  }

  return false;
}

export function getMissingTables(): string[] {
  return Array.from(MISSING_TABLES);
}
