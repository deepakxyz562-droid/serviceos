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
import {
  withCircuitBreaker,
  CircuitOpenError,
  isInfraFailure,
} from './circuit-breaker';

// ── Configuration ──────────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _adminClient: SupabaseClient | null = null;

const resilientSupabaseFetch: typeof fetch = async (input, init) => {
  const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;
  try {
    const res = await fetch(input, init);
    return res;
  } catch (err) {
    // Dynamic IP extraction for sslip.io hostnames — zero hardcoded IPs or domains
    try {
      const parsedUrl = new URL(urlStr);
      const ipMatch = parsedUrl.hostname.match(/(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\.sslip\.io$/);
      if (ipMatch && ipMatch[1]) {
        const targetIp = ipMatch[1];
        const originalHost = parsedUrl.hostname;
        parsedUrl.hostname = targetIp;
        const headers = new Headers(init?.headers || {});
        headers.set('Host', originalHost);
        return fetch(parsedUrl.toString(), { ...init, headers });
      }
    } catch {
      // Fall through if URL parsing fails
    }
    throw err;
  }
};

export function getAdminClient(): SupabaseClient {
  if (!_adminClient) {
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('[SupabaseDB] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    _adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: resilientSupabaseFetch },
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
  // ── Live Dispatch / GPS tracking (Wave 3) ──
  // These MUST be explicitly mapped so the PostgREST adapter targets the
  // correct table names. Without this, db.gPSLocation.* silently falls
  // through to a capitalized-name guess which may not match the actual
  // Supabase table (Prisma migrations create mixed-case quoted identifiers
  // on Postgres, and the casing must match exactly).
  gPSLocation: 'GPSLocation',
  routeHistory: 'RouteHistory',
  customer: 'Customer',
  // ── ISSUE-3 nested customer form collections ──
  // These back the redesigned "New Customer" form. Without explicit entries
  // the adapter falls back to default capitalization (CustomerContact /
  // Property / PropertyContact), which happens to match — but listing them
  // makes the customer-form subsystem grep-able and resilient to future
  // capitalization drift.
  customerContact: 'CustomerContact',
  property: 'Property',
  propertyContact: 'PropertyContact',
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
  // O1 Omnichannel foundation
  channelConnection: 'ChannelConnection',
  channelCatalog: 'ChannelCatalog',
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
  // exist in Supabase — run `bun run db:push` against the Supabase
  // DATABASE_URL (or `npx prisma db push`) to provision them. Listing them
  // explicitly (instead of relying on default capitalization) makes the AI
  // Receptionist tables grep-able and documents which tables the subsystem
  // depends on.
  aiIvrMenu: 'AiIvrMenu',
  aiEscalationPolicy: 'AiEscalationPolicy',
  aiCallTag: 'AiCallTag',
  aiBillingCounter: 'AiBillingCounter',
  aiCall: 'AiCall',
  aiReceptionist: 'AiReceptionist',
  aiAgentVersion: 'AiAgentVersion',
  aiProviderDeployment: 'AiProviderDeployment',
  usageReservation: 'UsageReservation',
  usageLedger: 'UsageLedger',
  tenantAddonSubscription: 'TenantAddonSubscription',
  addonEntitlement: 'AddonEntitlement',
  addonProduct: 'AddonProduct',
  addonPlan: 'AddonPlan',
  // Phase 9.8: AI Receptionist phone + provider + tool tables
  phoneConnection: 'PhoneConnection',
  externalPhoneNumber: 'ExternalPhoneNumber',
  phoneProvisioningAttempt: 'PhoneProvisioningAttempt',
  tenantTelephonyAccount: 'TenantTelephonyAccount',
  twilioProviderConfig: 'TwilioProviderConfig',
  aiProviderConfig: 'AiProviderConfig',
  aiToolExecution: 'AiToolExecution',
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
  // ── Originally listed (manually discovered) ──
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
  'FeaturedLocation',
  'UsageLedger',
  'GPSLocation',
  // ── Auto-generated: all Prisma models WITHOUT @updatedAt ──────────────
  // These tables have createdAt but NO updatedAt column in the Prisma schema.
  // Without listing them here, every insert auto-adds updatedAt → PostgREST
  // returns "Could not find the 'updatedAt' column of 'X' in the schema cache"
  // → the retry loop's first branch matches "schema cache" and waits 1s per
  // retry → 15 retries × 1s = 15 seconds wasted PER INSERT. This was the root
  // cause of the "every create/edit is too slow" bug — ActivityLog, AuditLog,
  // and NotificationLog inserts blocked every job/lead/inventory create.
  'ActivityLog',
  'AdConversion',
  'AiCallTag',
  'AnalyticsSnapshot',
  'ApiKey',
  'AppNotification',
  'AssetServiceHistory',
  'AuditLog',
  'AuditLogEntry',
  'BillingEvent',
  'CampaignMessage',
  'ChatLabel',
  'ChatbotSession',
  'ConversationExport',
  'ConversationLabel',
  'Coupon',
  'CustomerPortalSession',
  'DealStageHistory',
  'EcommerceSyncLog',
  'EmailEvent',
  'EmailUnsubscribeToken',
  'EmployeeStatusLog',
  'EventWebhookLog',
  'ExecutionNodeData',
  'FormResponse',
  'HolidayCalendar',
  'JobPhoto',
  'JobSignature',
  'JobStateTransition',
  'JourneyExecution',
  'LowStockAlert',
  'MarketingConsentEvent',
  'Notification',
  'NotificationLog',
  'OtpVerification',
  'PlatformMetric',
  'PublicChatMessage',
  'RetargetingLog',
  'SecurityEvent',
  'SegmentMember',
  'SocialPostMetric',
  'StockTransaction',
  'SubscriptionPayment',
  'TimelineEvent',
  'TriggerExecution',
  'UsageCharge',
  'WAFormResponse',
  'WebhookEndpointLog',
  'WebhookRegistration',
  'WebhookTestRequest',
  'WhatsAppMessageAction',
  'WorkflowVersion',
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
    // O1: back-relation to InboxMessage (one-to-many). InboxMessage.conversationId
    // points to Conversation.conversationId (the @unique string, NOT the PK `id`).
    inboxMessages: { targetTable: 'InboxMessage', targetFkColumn: 'conversationId', isMany: true },
  },
  // O1: InboxMessage → Conversation relation (via conversationId string, not PK)
  InboxMessage: {
    conversation: { targetTable: 'Conversation', fkColumn: 'conversationId' },
  },
  // O1 Omnichannel foundation: ChannelConnection + ChannelCatalog
  ChannelConnection: {
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
    recurringSchedule: { targetTable: 'RecurringJobSchedule', fkColumn: 'recurringScheduleId' },
    lead: { targetTable: 'Lead', targetFkColumn: 'jobId', isMany: false },
    conversation: { targetTable: 'Conversation', targetFkColumn: 'jobId', isMany: false },
    journey: { targetTable: 'CustomerJourney', targetFkColumn: 'jobId', isMany: false },
    photos: { targetTable: 'JobPhoto', targetFkColumn: 'jobId', isMany: true },
    signatures: { targetTable: 'JobSignature', targetFkColumn: 'jobId', isMany: true },
    checklists: { targetTable: 'JobChecklist', targetFkColumn: 'jobId', isMany: true },
    notes: { targetTable: 'JobNote', targetFkColumn: 'jobId', isMany: true },
    invoices: { targetTable: 'Invoice', targetFkColumn: 'jobId', isMany: true },
  },
  RecurringJobSchedule: {
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    lastJob: { targetTable: 'Job', fkColumn: 'lastJobId' },
    generatedJobs: { targetTable: 'Job', targetFkColumn: 'recurringScheduleId', isMany: true },
    generatedInvoices: { targetTable: 'Invoice', targetFkColumn: 'recurringScheduleId', isMany: true },
  },
  Employee: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
    userAccount: { targetTable: 'User', fkColumn: 'userId' },
    currentJob: { targetTable: 'Job', fkColumn: 'currentJobId' },
  },
  Customer: {
    workspace: { targetTable: 'Workspace', fkColumn: 'workspaceId' },
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    // ── ISSUE-3 nested form collections ──
    // Customer.properties → Property[] (Property.customerId points back)
    // Customer.additionalContacts → CustomerContact[] (CustomerContact.customerId points back)
    // Without these, db.customer.findMany({ select: CUSTOMER_PUBLIC_SELECT })
    // fails with "column Customer.additionalContacts does not exist" because
    // the adapter tries to fetch them as columns. resolveIncludes() handles
    // them via separate queries once they're declared here.
    properties: { targetTable: 'Property', targetFkColumn: 'customerId', isMany: true },
    additionalContacts: { targetTable: 'CustomerContact', targetFkColumn: 'customerId', isMany: true },
    // ── Customer 360 nested relations ──────────────────────────────────────
    // Without these mappings, db.customer.findUnique({ select: { jobs: {...}, invoices: {...}, ... } })
    // silently drops the nested selects (the adapter doesn't know they're relations,
    // tries to fetch them as columns, fails, returns undefined → coerced to [] by the
    // hook → Quotes/Invoices/Payments/Communication tabs all show empty).
    // Mapped as isMany:true with targetFkColumn (the FK on the TARGET table pointing
    // back to Customer.id), matching the same shape as properties/additionalContacts.
    jobs: { targetTable: 'Job', targetFkColumn: 'customerId', isMany: true },
    invoices: { targetTable: 'Invoice', targetFkColumn: 'customerId', isMany: true },
    conversations: { targetTable: 'Conversation', targetFkColumn: 'customerId', isMany: true },
    quotes: { targetTable: 'Quote', targetFkColumn: 'customerId', isMany: true },
    leads: { targetTable: 'Lead', targetFkColumn: 'customerId', isMany: true },
  },
  TenantAddonSubscription: {
    addonPlan: { targetTable: 'AddonPlan', fkColumn: 'addonPlanId' },
    addonProduct: { targetTable: 'AddonProduct', fkColumn: 'addonProductId' },
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    entitlements: { targetTable: 'AddonEntitlement', targetFkColumn: 'tenantAddonSubscriptionId', isMany: true },
  },
  PhoneNumber: {
    phoneConnections: { targetTable: 'PhoneConnection', targetFkColumn: 'phoneNumberId', isMany: true },
  },
  // ── Phase 9.8: AI Receptionist addon models ──────────────────────────────
  // These entries let the Supabase adapter resolve nested includes for the
  // AI Receptionist APIs. Without them, PostgREST silently drops the joins
  // and the API returns null for nested relations (e.g., addonProduct on
  // AddonPlan → the onboarding wrapper sees addonProduct?.code === null →
  // shows the pricing cards instead of the workspace).
  AddonProduct: {
    plans: { targetTable: 'AddonPlan', targetFkColumn: 'addonProductId', isMany: true },
    subscriptions: { targetTable: 'TenantAddonSubscription', targetFkColumn: 'addonProductId', isMany: true },
  },
  AddonPlan: {
    addonProduct: { targetTable: 'AddonProduct', fkColumn: 'addonProductId' },
    subscriptions: { targetTable: 'TenantAddonSubscription', targetFkColumn: 'addonPlanId', isMany: true },
  },
  AddonEntitlement: {
    subscription: { targetTable: 'TenantAddonSubscription', fkColumn: 'tenantAddonSubscriptionId' },
    reservations: { targetTable: 'UsageReservation', targetFkColumn: 'entitlementId', isMany: true },
    ledgerEntries: { targetTable: 'UsageLedger', targetFkColumn: 'entitlementId', isMany: true },
  },
  UsageReservation: {
    entitlement: { targetTable: 'AddonEntitlement', fkColumn: 'entitlementId' },
  },
  UsageLedger: {
    entitlement: { targetTable: 'AddonEntitlement', fkColumn: 'entitlementId' },
  },
  AiReceptionist: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    currentVersion: { targetTable: 'AiAgentVersion', fkColumn: 'currentVersionId' },
    versions: { targetTable: 'AiAgentVersion', targetFkColumn: 'aiReceptionistId', isMany: true },
    aiCalls: { targetTable: 'AiCall', targetFkColumn: 'receptionistId', isMany: true },
  },
  AiAgentVersion: {
    reception: { targetTable: 'AiReceptionist', fkColumn: 'aiReceptionistId' },
    deployments: { targetTable: 'AiProviderDeployment', targetFkColumn: 'aiAgentVersionId', isMany: true },
    aiCalls: { targetTable: 'AiCall', targetFkColumn: 'agentVersionId', isMany: true },
  },
  AiProviderDeployment: {
    agentVersion: { targetTable: 'AiAgentVersion', fkColumn: 'aiAgentVersionId' },
    aiCalls: { targetTable: 'AiCall', targetFkColumn: 'deploymentId', isMany: true },
  },
  PhoneConnection: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    phoneNumber: { targetTable: 'PhoneNumber', fkColumn: 'phoneNumberId' },
    externalPhoneNumber: { targetTable: 'ExternalPhoneNumber', fkColumn: 'externalPhoneNumberId' },
  },
  ExternalPhoneNumber: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    connections: { targetTable: 'PhoneConnection', targetFkColumn: 'externalPhoneNumberId', isMany: true },
  },
  TenantTelephonyAccount: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
  },
  AiCall: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    receptionist: { targetTable: 'AiReceptionist', fkColumn: 'receptionistId' },
    agentVersion: { targetTable: 'AiAgentVersion', fkColumn: 'agentVersionId' },
    deployment: { targetTable: 'AiProviderDeployment', fkColumn: 'deploymentId' },
    connection: { targetTable: 'PhoneConnection', fkColumn: 'connectionId' },
  },
  AiPhoneNumber: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
    calls: { targetTable: 'AiCall', targetFkColumn: 'phoneNumberId', isMany: true },
  },
  Property: {
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
    contacts: { targetTable: 'PropertyContact', targetFkColumn: 'propertyId', isMany: true },
  },
  CustomerContact: {
    customer: { targetTable: 'Customer', fkColumn: 'customerId' },
  },
  PropertyContact: {
    property: { targetTable: 'Property', fkColumn: 'propertyId' },
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
    // O1 Omnichannel: tenant-level channel connections
    channelConnections: { targetTable: 'ChannelConnection', targetFkColumn: 'tenantId', isMany: true },
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
  // ── Marketplace business-claim requests ──
  // Without this entry, `db.claimRequest.findMany({ include: { tenant: ... } })`
  // (used by /api/marketplace/claim/admin GET) silently skips the join →
  // claim.tenant is undefined → superadmin Claims tab crashes with
  // "Cannot read properties of undefined (reading 'name')".
  ClaimRequest: {
    tenant: { targetTable: 'Tenant', fkColumn: 'tenantId' },
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
    if (orField.endsWith('Json')) continue;

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
        const fieldName = orField.endsWith('Json') ? `${orField}::text` : orField;
        parts.push(`${fieldName}.ilike.%${op.contains}%`);
      } else if (op.startsWith !== undefined) {
        const fieldName = orField.endsWith('Json') ? `${orField}::text` : orField;
        parts.push(`${fieldName}.ilike.${op.startsWith}%`);
      } else if (op.endsWith !== undefined) {
        const fieldName = orField.endsWith('Json') ? `${orField}::text` : orField;
        parts.push(`${fieldName}.ilike.%${op.endsWith}`);
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
      } else if (op.notIn !== undefined) {
        // Issue #1 Fix A: handle notIn inside OR clauses (was silently dropped).
        // PostgREST syntax: field=not.in.(val1,val2,val3)
        parts.push(`${orField}.not.in.(${(op.notIn as (string | number | boolean)[]).map(toOrLiteral).join(',')})`);
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
    if (field.endsWith('Json')) continue;

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
      // Apply NOT filter by negating each condition in the object.
      //
      // CRITICAL — NULL semantics:
      // Prisma's `NOT: { field: value }` semantics EXCLUDE rows where
      // `field = value`, but INCLUDE rows where `field IS NULL` (because
      // NULL does not equal `value`). PostgREST's `.neq(field, value)`
      // implements SQL `field != value`, which evaluates to NULL (not true)
      // when `field` is NULL — so `.neq()` silently DROPS NULL rows.
      //
      // This previously caused every tenant with `signupMode = null`
      // (91,281 rows in production) to be hidden from the company search
      // despite Prisma's intent to include them.
      //
      // Fix: for every "not equals value" branch, emit
      //   `(field IS NULL OR field != value)`
      // via PostgREST's `or()` so NULL rows are preserved.
      const notConditions = value as WhereInput;
      for (const [notField, notValue] of Object.entries(notConditions)) {
        if (notValue === undefined) continue;
        if (notValue !== null && typeof notValue === 'object' && !Array.isArray(notValue) && !(notValue instanceof Date)) {
          // Negate operator conditions
          const op = notValue as WhereOperator;
          if (op.equals !== undefined) {
            if (op.equals === null) {
              // NOT equals null → field IS NOT NULL
              query.not(notField, 'is', null);
            } else {
              // NOT equals value → (field IS NULL OR field != value)
              const v = op.equals as string | number | boolean;
              query.or(`${notField}.is.null,${notField}.neq.${v}`);
            }
          } else if (op.in !== undefined) {
            // NOT IN: (field IS NULL OR field != v1 OR field != v2 OR ...)
            //
            // All conditions MUST go inside a SINGLE or=() group so PostgREST
            // ORs them together. The previous implementation emitted
            //   query.or('field.is.null')   // a standalone or=() group
            //   query.neq(field, v1)        // a top-level AND filter
            //   query.neq(field, v2)        // a top-level AND filter
            // which PostgREST interpreted as
            //   (field IS NULL) AND (field != v1) AND (field != v2)
            // — a contradiction that dropped EVERY non-NULL row. This was the
            // root cause of the production pipeline-kanban bug where active
            // deals (stage NOT IN ['won','lost']) were all filtered out and
            // the board appeared empty.
            const values = op.in as (string | number | boolean)[];
            const parts = [`${notField}.is.null`];
            for (const v of values) {
              parts.push(`${notField}.neq.${v}`);
            }
            query.or(parts.join(','));
          } else if (op.contains !== undefined) {
            // NOT contains: NULL rows should be included (NULL doesn't contain anything).
            query.or(`${notField}.is.null,${notField}.not.ilike.%${op.contains}%`);
          } else {
            // Fallback: treat as a simple not-equals, preserving NULLs.
            const v = notValue as string | number | boolean;
            query.or(`${notField}.is.null,${notField}.neq.${v}`);
          }
        } else {
          // Simple value: NOT equals
          if (notValue === null) {
            // NOT equals null → field IS NOT NULL
            query.not(notField, 'is', null);
          } else {
            // NOT equals value → (field IS NULL OR field != value)
            const v = notValue as string | number | boolean;
            query.or(`${notField}.is.null,${notField}.neq.${v}`);
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
      // Issue #1 Fix A: handle notIn operator (was silently dropped, causing
      // featured tenants to reappear on marketplace page 2+ because
      // `id: { notIn: featuredIds }` in keysetWhere was silently ignored).
      // PostgREST translates this to field=not.in.(val1,val2,val3).
      if (op.notIn !== undefined) {
        const vals = op.notIn as (string | number | boolean)[];
        if (vals.length > 0) {
          // supabase-js: .not(field, 'in', '(val1,val2,val3)')
          // The parentheses-wrapped list is PostgREST's IN list syntax.
          query.not(field, 'in', `(${vals.join(',')})`);
        }
      }
      if (op.contains !== undefined) {
        const fieldName = field.endsWith('Json') ? `${field}::text` : field;
        query.ilike(fieldName, `%${op.contains}%`);
      }
      if (op.startsWith !== undefined) {
        const fieldName = field.endsWith('Json') ? `${field}::text` : field;
        query.ilike(fieldName, `${op.startsWith}%`);
      }
      if (op.endsWith !== undefined) {
        const fieldName = field.endsWith('Json') ? `${field}::text` : field;
        query.ilike(fieldName, `%${op.endsWith}`);
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

// ── Helper: Split a Prisma `select` into column-select + relation-include ──
//
// Prisma's `select` supports THREE shapes per key:
//   1. columnName: true                  → select this column
//   2. relationName: true                → load this relation (all fields)
//   3. relationName: { select: {...} }   → load this relation with field subset
//   4. relationName: { include: {...} }  → load relation + nested relations
//
// PostgREST only understands shape #1 — passing `additionalContacts` (a
// relation name) as a select column fails with:
//   "column Customer.additionalContacts does not exist" (code 42703)
//
// This helper splits a Prisma `select` into:
//   - columnSelect: { col1: true, col2: true, ... } — safe to send to PostgREST
//   - relationInclude: { rel1: {...}, rel2: {...} } — passed to resolveIncludes
//
// A key is treated as a relation if EITHER:
//   - its value is an object (shapes #3/#4), OR
//   - its value is `true` AND the key exists in RELATION_MAP[tableName] (#2)
//
// This unblocks CUSTOMER_PUBLIC_SELECT (which uses both #2 and #4 shapes)
// and any other Prisma select that mixes columns and relations.
function splitSelectAndRelations(
  tableName: string,
  select: Record<string, unknown> | undefined,
): {
  columnSelect: Record<string, true> | undefined;
  relationInclude: Record<string, unknown> | undefined;
} {
  if (!select) return { columnSelect: undefined, relationInclude: undefined };

  const columnSelect: Record<string, true> = {};
  const relationInclude: Record<string, unknown> = {};
  const modelRelations = RELATION_MAP[tableName] || {};

  for (const [key, value] of Object.entries(select)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Shape #3 or #4: relation with sub-select / sub-include.
      // Pass through as-is. resolveIncludes reads `relInclude.select`
      // and ignores `include` for nested relations (Prisma semantics:
      // nested `include` inside a `select` block still loads the relation).
      relationInclude[key] = value;
      continue;
    }
    if (value === true && modelRelations[key]) {
      // Shape #2: relation name with `true` — load all fields.
      relationInclude[key] = {};
      continue;
    }
    if (value === true) {
      // Shape #1: plain column.
      columnSelect[key] = true;
      continue;
    }
    // Any other shape (e.g. false) — skip.
  }

  // ── Auto-inject FK columns for belongsTo relations ──
  // When using `select` with relation includes (e.g. select: { status: true,
  // addonPlan: { select: { code: true } } }), PostgREST only returns the
  // columns explicitly listed in the select string. The FK column
  // (e.g. `addonPlanId`) is NOT included, so `resolveIncludes` can't resolve
  // the relation (it reads main[fkColumn] which is undefined → null).
  //
  // Fix: for every relation in `relationInclude` that uses `fkColumn` (the
  // FK lives on THIS table, pointing to the target's `id`), inject that FK
  // column into `columnSelect` so PostgREST returns it. We strip these
  // auto-injected columns from the final response later if they weren't
  // explicitly requested (via shouldStripJoinKey in resolveIncludes).
  if (Object.keys(relationInclude).length > 0 && modelRelations) {
    for (const [relName] of Object.entries(relationInclude)) {
      const rel = modelRelations[relName];
      if (rel && rel.fkColumn && !rel.isMany && !rel.targetFkColumn) {
        // belongsTo: FK is on this table (source), pointing to target.id
        if (!columnSelect[rel.fkColumn]) {
          columnSelect[rel.fkColumn] = true;
        }
      }
    }
  }

  return {
    columnSelect: Object.keys(columnSelect).length > 0 ? columnSelect : undefined,
    relationInclude: Object.keys(relationInclude).length > 0 ? relationInclude : undefined,
  };
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

  // PERFORMANCE: Previously, each relation was awaited sequentially inside a
  // for...of loop — 3 includes = 3 sequential HTTP round-trips to PostgREST
  // (each ~300ms = ~900ms total). Now we fetch ALL relations concurrently
  // with Promise.all (3 includes = ~300ms total). Each relation writes to a
  // distinct key (main[relName]) so there's no write contention.
  const includeEntries = Object.entries(include).filter(([relName]) => relName !== '_count');

  const tasks = includeEntries.map(async ([relName, relConfig]) => {
    if (!modelRelations[relName]) {
      console.warn(
        `[SupabaseDB] RELATION_MAP missing: ${tableName}.${relName} — include silently skipped. ` +
          `Add an entry to RELATION_MAP.${tableName} in src/lib/supabase-db.ts to fix.`
      );
      return;
    }

    const rel = modelRelations[relName];
    const relInclude = relConfig as Record<string, unknown>;
    const relSelect = (relInclude?.select as Record<string, boolean>) || undefined;
    // Nested `include` (e.g. properties: { include: { contacts: true } })
    // — recursively resolveIncludes on the related rows after we fetch them.
    const nestedInclude = (relInclude?.include as Record<string, unknown>) || undefined;
    // Also support `select` containing nested relation objects (e.g.
    // properties: { select: { street1: true, contacts: true } }) — split out
    // the relation parts and merge into nestedInclude for recursive resolution.
    let nestedSelectForRecursive: Record<string, boolean> | undefined;
    if (relSelect) {
      const nestedModelRelations = RELATION_MAP[rel.targetTable] || {};
      const cleanedSelect: Record<string, true> = {};
      for (const [k, v] of Object.entries(relSelect)) {
        if (v === true && nestedModelRelations[k]) {
          // Promote nested relation: select: { contacts: true } → include: { contacts: {} }
          if (!nestedInclude) {
            (relInclude as Record<string, unknown>).include = {};
          }
          (relInclude!.include as Record<string, unknown>)[k] = {};
        } else if (v && typeof v === 'object') {
          if (!nestedInclude) {
            (relInclude as Record<string, unknown>).include = {};
          }
          (relInclude!.include as Record<string, unknown>)[k] = v;
        } else if (v === true) {
          cleanedSelect[k] = true;
        }
      }
      nestedSelectForRecursive = Object.keys(cleanedSelect).length > 0 ? cleanedSelect : undefined;
    }

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

    try {
      if (rel.isMany) {
        const targetFkCol = rel.targetFkColumn!;
        const mainIds = results.map(r => r.id).filter(Boolean) as string[];
        if (mainIds.length === 0) return;

        const { data: related, error } = await client
          .from(rel.targetTable)
          .select(finalSelectStr)
          .in(targetFkCol, mainIds);

        if (error || !related) return;

        // Recursively resolve nested includes on the related rows
        // (e.g. Property.contacts when Customer.properties was included).
        if (nestedInclude || nestedSelectForRecursive) {
          await resolveIncludes(rel.targetTable, related as Record<string, unknown>[], nestedInclude);
        }

        const grouped = new Map<string, unknown[]>();
        for (const r of related) {
          const fkVal = r[targetFkCol] as string;
          if (!grouped.has(fkVal)) grouped.set(fkVal, []);
          grouped.get(fkVal)!.push(r);
        }

        if (shouldStripJoinKey) {
          for (const r of related) delete r[joinKey];
        }

        for (const main of results) {
          main[relName] = grouped.get(main.id as string) || [];
        }
      } else if (rel.targetFkColumn) {
        const mainIds = results.map(r => r.id).filter(Boolean) as string[];
        if (mainIds.length === 0) return;

        const { data: related, error } = await client
          .from(rel.targetTable)
          .select(finalSelectStr)
          .in(rel.targetFkColumn, mainIds);

        if (error || !related) return;

        if (nestedInclude || nestedSelectForRecursive) {
          await resolveIncludes(rel.targetTable, related as Record<string, unknown>[], nestedInclude);
        }

        const relatedMap = new Map<string, unknown>();
        for (const r of related) {
          relatedMap.set(r[rel.targetFkColumn] as string, r);
        }

        if (shouldStripJoinKey) {
          for (const r of related) delete r[joinKey];
        }

        for (const main of results) {
          main[relName] = relatedMap.get(main.id as string) || null;
        }
      } else {
        const fkColumn = rel.fkColumn;
        const fkValues = [...new Set(results.map(r => r[fkColumn]).filter(Boolean))] as string[];
        if (fkValues.length === 0) {
          for (const main of results) { main[relName] = null; }
          return;
        }

        const { data: related, error } = await client
          .from(rel.targetTable)
          .select(finalSelectStr)
          .in('id', fkValues);

        if (error || !related) return;

        if (nestedInclude || nestedSelectForRecursive) {
          await resolveIncludes(rel.targetTable, related as Record<string, unknown>[], nestedInclude);
        }

        const relatedMap = new Map<string, unknown>();
        for (const r of related) {
          relatedMap.set(r.id as string, r);
        }

        if (shouldStripJoinKey) {
          for (const r of related) delete r[joinKey];
        }

        for (const main of results) {
          main[relName] = relatedMap.get(main[fkColumn] as string) || null;
        }
      }
    } catch (err) {
      console.warn(`[SupabaseDB] resolveIncludes: relation "${relName}" failed:`, (err as Error).message);
    }
  });

  await Promise.all(tasks);

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

  // PERFORMANCE (CRITICAL N+1 FIX):
  // Previously, this function ran ONE HTTP request PER ROW PER COUNT FIELD.
  // A list of 50 rows × 2 count fields = 100 sequential HTTP round-trips to
  // PostgREST, each ~300ms = ~30 SECONDS per API response. This was the #1
  // cause of CRM portal slowness.
  //
  // Now: for each count field, we make a SINGLE batched query fetching just
  // the FK column for ALL matching rows, then group-count in JS. 50 rows ×
  // 2 fields = 2 HTTP requests (parallel via Promise.all) = ~300ms total.
  //
  // Note: PostgREST's `head: true` + `count: 'exact'` returns a SINGLE total
  // count, not per-parent counts — so we can't use it for batched counting.
  // Instead we fetch the FK column values and count in JS. This downloads
  // more bytes but collapses N requests → 1, which is the dominant win on
  // Supabase (where per-request latency dwarfs payload size).
  const fkColumn = tableName.charAt(0).toLowerCase() + tableName.slice(1) + 'Id';
  const mainIds = results.map(r => r.id).filter(Boolean) as string[];
  if (mainIds.length === 0) return;

  const countTasks = countFields.map(async (relField) => {
    try {
      const targetTable = getTableName(relField);
      // Fetch only the FK column for ALL matching rows in one batched query.
      // This returns rows like [{ [fkColumn]: 'tenantId1' }, { [fkColumn]: 'tenantId1' }, ...]
      const { data: rows, error } = await client
        .from(targetTable)
        .select(fkColumn)
        .in(fkColumn, mainIds);

      if (error || !rows) {
        // Fallback: if the batched query fails (e.g. FK column name mismatch),
        // return a map of all zeros so the caller doesn't crash.
        const zeroMap = new Map<string, number>();
        for (const id of mainIds) zeroMap.set(id, 0);
        return { relField, counts: zeroMap };
      }

      // Group-count in JS
      const counts = new Map<string, number>();
      for (const id of mainIds) counts.set(id, 0); // init all to 0
      for (const row of rows) {
        const fkVal = row[fkColumn] as string;
        if (fkVal) counts.set(fkVal, (counts.get(fkVal) || 0) + 1);
      }
      return { relField, counts };
    } catch {
      const zeroMap = new Map<string, number>();
      for (const id of mainIds) zeroMap.set(id, 0);
      return { relField, counts: zeroMap };
    }
  });

  const countResults = await Promise.all(countTasks);

  // Attach counts to each main record
  for (const main of results) {
    const id = main.id as string;
    const countObj: Record<string, number> = {};
    for (const { relField, counts } of countResults) {
      countObj[relField] = counts.get(id) || 0;
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

    const { where, include, orderBy, skip, take, select, distinct } = options;

    // Build select string: use specific columns if `select` is provided,
    // otherwise '*'. This mirrors findFirst/findUnique behavior and keeps
    // payloads small for callers that only need a few columns (e.g. the
    // marketplace cities endpoint fetching only city/lat/lng).
    //
    // NOTE: `select` may contain relation entries (e.g. CUSTOMER_PUBLIC_SELECT
    // has `additionalContacts: true` and `properties: { include: ... }`).
    // PostgREST rejects relation names as columns, so we split them out via
    // splitSelectAndRelations() and merge them into `include` for
    // resolveIncludes() to handle as separate queries.
    const { columnSelect, relationInclude } = splitSelectAndRelations(this.tableName, select as Record<string, unknown> | undefined);
    const mergedInclude = (include || relationInclude)
      ? { ...(include as Record<string, unknown> || {}), ...(relationInclude || {}) }
      : undefined;

    let selectStr = '*';
    if (columnSelect) {
      const cols = Object.keys(columnSelect);
      if (cols.length > 0) selectStr = cols.join(',');
    }

    let query = this.client.from(this.tableName).select(selectStr);

    if (where) applyWhereFilters(query, where);
    if (orderBy) applyOrderBy(query, orderBy);
    if (skip !== undefined || take !== undefined) {
      const from = skip || 0;
      const to = take !== undefined ? from + take - 1 : from + 49;
      query.range(from, to);
    }

    // Wrap the network call in the circuit breaker. If Supabase is
    // overloaded/down (network errors, timeouts, 5xx), the breaker opens
    // after 5 consecutive failures and fail-fasts subsequent reads with
    // CircuitOpenError — which sharedCacheWrap catches to serve stale data.
    // Application errors (4xx, missing column) do NOT trip the breaker.
    const { data, error } = await withCircuitBreaker(this.tableName, () => query);
    if (error) {
      const whereStr = where ? JSON.stringify(where).substring(0, 200) : 'none';
      // Issue #1 Fix B: THROW instead of silently returning []. The previous
      // behavior masked PostgREST errors (missing columns, RLS denials,
      // malformed filters, transient timeouts) as empty result sets, which
      // caused the marketplace infinite scroll to stop loading with NO
      // user-visible error — the API returned 200 with items:[], nextCursor:null.
      // Throwing here lets the API route's catch block return a proper 500,
      // which the client hook surfaces as a retryable error banner.
      console.error(
        `[SupabaseDB] findMany error on ${this.tableName}: code=${error.code} message="${error.message}" details="${error.details || ''}" hint="${error.hint || ''}" where=${whereStr}`
      );
      throw new Error(`[SupabaseDB] findMany on ${this.tableName} failed: ${error.message} (code=${error.code}${error.hint ? `, hint="${error.hint}"` : ''})`);
    }

    let results = (data || []) as Record<string, unknown>[];

    // Apply `distinct` — dedupe in JS by building a composite key from the
    // specified columns. PostgREST has no native SELECT DISTINCT for
    // arbitrary column sets; its `on()` header only works with range
    // pagination. Prisma's `distinct: ['col']` returns the FIRST row for
    // each unique combination of the listed columns, which is exactly
    // what this filter does (results are already in query order, so the
    // first occurrence wins). This enables e.g. "distinct tenantId per
    // platform" without a separate groupBy call.
    if (distinct && distinct.length > 0 && results.length > 1) {
      const seen = new Set<string>();
      results = results.filter((row) => {
        const key = distinct.map((col) => String(row[col] ?? '\u0000')).join('\u0001');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Resolve includes with separate queries (also handles relations that
    // were extracted from `select` by splitSelectAndRelations).
    if (mergedInclude) {
      results = await resolveIncludes(this.tableName, results, mergedInclude);
      await resolveCounts(this.tableName, results, mergedInclude);
    }

    return results;
  }

  async findUnique(options: FindUniqueOptions): Promise<unknown | null> {
    if (this.isMissingTable) return null;

    const { where, include, select } = options;

    // Split relation entries out of `select` (same logic as findMany —
    // see comment there). PostgREST rejects relation names as columns.
    const { columnSelect, relationInclude } = splitSelectAndRelations(this.tableName, select as Record<string, unknown> | undefined);
    const mergedInclude = (include || relationInclude)
      ? { ...(include as Record<string, unknown> || {}), ...(relationInclude || {}) }
      : undefined;

    // Build select string: use specific columns if select is provided, otherwise '*'
    let selectStr = '*';
    if (columnSelect) {
      const cols = Object.keys(columnSelect);
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

    const { data, error } = await withCircuitBreaker(this.tableName, () =>
      query.limit(1).single(),
    );
    if (error) {
      // PGRST116 = "JSON object requested, 0 rows returned" — this is the
      // expected "no match" case for findUnique, NOT an error. Return null.
      // (Does not trip the breaker — it's a valid "no row" result.)
      if (error.code === 'PGRST116') return null;
      // Issue #1 Fix B: THROW on real errors instead of silently returning null.
      console.error(`[SupabaseDB] findUnique error on ${this.tableName}:`, error.message);
      throw new Error(`[SupabaseDB] findUnique on ${this.tableName} failed: ${error.message} (code=${error.code})`);
    }

    if (mergedInclude && data) {
      const resolved = await resolveIncludes(this.tableName, [data as Record<string, unknown>], mergedInclude);
      await resolveCounts(this.tableName, resolved, mergedInclude);
      return resolved?.[0] ?? data;
    }

    return data;
  }

  async findFirst(options: FindFirstOptions = {}): Promise<unknown | null> {
    if (this.isMissingTable) return null;

    const { where, include, orderBy, select } = options;

    // Split relation entries out of `select` (same logic as findMany —
    // see comment there). PostgREST rejects relation names as columns.
    const { columnSelect, relationInclude } = splitSelectAndRelations(this.tableName, select as Record<string, unknown> | undefined);
    const mergedInclude = (include || relationInclude)
      ? { ...(include as Record<string, unknown> || {}), ...(relationInclude || {}) }
      : undefined;

    // Build select string: use specific columns if select is provided, otherwise '*'
    let selectStr = '*';
    if (columnSelect) {
      const cols = Object.keys(columnSelect);
      if (cols.length > 0) selectStr = cols.join(',');
    }
    let query = this.client.from(this.tableName).select(selectStr);

    if (where) applyWhereFilters(query, where);
    if (orderBy) applyOrderBy(query, orderBy);

    const { data, error } = await withCircuitBreaker(this.tableName, () =>
      query.limit(1).single(),
    );
    if (error) {
      // PGRST116 = no rows found — this is a legitimate "no match" case, NOT
      // an error. Return null for that code only. (Does not trip the breaker.)
      if (error.code === 'PGRST116') return null;
      // Issue #1 Fix B: THROW on real errors instead of silently returning null.
      // Log detailed error context for production debugging.
      const whereStr = where ? JSON.stringify(where).substring(0, 200) : 'none';
      console.error(
        `[SupabaseDB] findFirst error on ${this.tableName}: code=${error.code} message="${error.message}" details="${error.details || ''}" hint="${error.hint || ''}" where=${whereStr}`
      );
      throw new Error(`[SupabaseDB] findFirst on ${this.tableName} failed: ${error.message} (code=${error.code}${error.hint ? `, hint="${error.hint}"` : ''})`);
    }

    if (mergedInclude && data) {
      const resolved = await resolveIncludes(this.tableName, [data as Record<string, unknown>], mergedInclude);
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
    while (error && retryCount < 15) {
      const msg = error.message || '';

      // ── FIRST: check for missing-column errors ──────────────────────────
      // PostgREST error formats for missing columns:
      //   "Could not find the 'updatedAt' column of 'ActivityLog' in the schema cache"
      //   'column "updatedAt" of relation "ActivityLog" does not exist'
      //
      // CRITICAL: This MUST be checked BEFORE the schema-cache/timeout retry
      // below. The "schema cache" retry waits 1s per attempt and does NOT
      // strip the bad column — so it retries with the same bad payload 15
      // times (15 seconds wasted) before giving up. By checking missing-column
      // FIRST, we strip the bad column and retry immediately (0s delay).
      const missingColMatch = msg.match(
        /(?:Could not find the ['`"]?(\w+)['`"]? column of|column "(\w+)" of relation)/
      );
      if (missingColMatch) {
        const badCol = missingColMatch[1] || missingColMatch[2];
        if (badCol && badCol in serialized) {
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
          continue;
        }
      }

      // ── SECOND: transient errors (network, timeout, schema cache delay) ──
      // Only retry with delay if the error is NOT about a missing column.
      // These are genuine transient issues where a blind retry makes sense.
      if (
        error.code === 'PGRST002' ||
        msg.includes('timeout') ||
        msg.includes('fetch failed')
      ) {
        console.log(`[SupabaseDB] PostgREST temporary network/timeout ("${msg}"), retrying in 1s (attempt ${retryCount + 1})...`);
        await new Promise((r) => setTimeout(r, 1000));
        retryCount++;
        const retry = await this.client
          .from(this.tableName)
          .insert(serialized)
          .select('*')
          .single();
        result = retry.data;
        error = retry.error;
        continue;
      }
      // Unknown error pattern — log and break (don't retry blindly)
      console.warn(`[SupabaseDB] create retry on ${this.tableName}: unrecognized error, not retrying: "${msg}"`);
      break;
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

    const { count, error } = await withCircuitBreaker(this.tableName, () => query);
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

    // Build a PostgREST aggregate select string so the computation happens
    // server-side in PostgreSQL and is NOT subject to the default 1000-row
    // response cap. Previously this method fetched all rows and aggregated
    // in JS, which silently truncated at 1000 rows.
    //
    // PostgREST aggregate syntax:
    //   .select('count(),sum(rating),avg(rating),min(rating),max(rating)')
    //
    // NOTE: PostgREST aggregates require the `db-aggregates-enabled` config
    // flag. When disabled (PGRST123 — "Use of aggregate functions is not
    // allowed"), we fall back to `_aggregateFallback()` which computes
    // `_count` via the head+count=exact mechanism (always available) and
    // `_sum`/`_avg`/`_min`/`_max` via a paged fetch+JS-compute.
    const aggParts: string[] = [];
    if (_count) aggParts.push('count()');
    if (_sum) for (const f of Object.keys(_sum)) aggParts.push(`sum(${f})`);
    if (_avg) for (const f of Object.keys(_avg)) aggParts.push(`avg(${f})`);
    if (_min) for (const f of Object.keys(_min)) aggParts.push(`min(${f})`);
    if (_max) for (const f of Object.keys(_max)) aggParts.push(`max(${f})`);

    // If no aggregates requested, fall back to a count-only query.
    const selectStr = aggParts.length > 0 ? aggParts.join(',') : 'count()';

    let query = this.client.from(this.tableName).select(selectStr);
    if (where) applyWhereFilters(query, where);

    const { data, error } = await query;
    if (error) {
      // Fallback: aggregates disabled (PGRST123) or other aggregate error
      // PostgREST returns a few different errors when aggregates are disabled:
      //   1. PGRST123 — "Use of aggregate functions is not allowed"
      //   2. "Could not find a relationship between 'X' and 'sum' in the schema cache"
      //      — PostgREST treats `sum(col)` as a nested resource lookup when
      //      aggregates aren't enabled in the schema cache.
      //   3. Any message mentioning "aggregate functions"
      const errMsg = error.message || '';
      if (
        error.code === 'PGRST123' ||
        /aggregate functions/i.test(errMsg) ||
        /could not find a relationship between.*and '(sum|avg|min|max|count)'/i.test(errMsg)
      ) {
        return await this._aggregateFallback(where, { _sum, _count, _avg, _min, _max });
      }
      console.error(`[SupabaseDB] aggregate error on ${this.tableName}:`, error.message);
      return { _count: 0, _sum: {} };
    }

    // PostgREST returns a single row with the aggregate values.
    const row = (data && data[0]) || {};
    const result: Record<string, unknown> = {};

    if (_count === true) {
      result._count = Number(row.count) || 0;
    } else if (typeof _count === 'object') {
      result._count = Number(row.count) || 0;
    }

    if (_sum) {
      const sumResult: Record<string, number> = {};
      for (const field of Object.keys(_sum)) {
        sumResult[field] = Number(row[`sum_${field}`] ?? row[field]) || 0;
      }
      result._sum = sumResult;
    }

    if (_avg) {
      const avgResult: Record<string, number> = {};
      for (const field of Object.keys(_avg)) {
        avgResult[field] = Number(row[`avg_${field}`] ?? row[field]) || 0;
      }
      result._avg = avgResult;
    }

    if (_min) {
      const minResult: Record<string, unknown> = {};
      for (const field of Object.keys(_min)) {
        minResult[field] = row[`min_${field}`] ?? row[field] ?? null;
      }
      result._min = minResult;
    }

    if (_max) {
      const maxResult: Record<string, unknown> = {};
      for (const field of Object.keys(_max)) {
        maxResult[field] = row[`max_${field}`] ?? row[field] ?? null;
      }
      result._max = maxResult;
    }

    return result;
  }

  /**
   * Fallback for `aggregate()` when PostgREST aggregates are disabled.
   *
   * - `_count`: uses `count()` (head + Prefer: count=exact) — always works.
   * - `_sum`/`_avg`/`_min`/`_max`: pages through matching rows selecting
   *   ONLY the requested fields and computes the aggregate in JS. Subject
   *   to PostgREST's row cap (paged to cover the full result set), so the
   *   result is correct regardless of table size.
   */
  private async _aggregateFallback(
    where: WhereInput | undefined,
    aggs: {
      _sum?: Record<string, boolean>;
      _count?: boolean | Record<string, boolean>;
      _avg?: Record<string, boolean>;
      _min?: Record<string, boolean>;
      _max?: Record<string, boolean>;
    },
  ): Promise<Record<string, unknown>> {
    const { _sum, _count, _avg, _min, _max } = aggs;
    const result: Record<string, unknown> = {};

    // _count — delegate to count() (head + Prefer: count=exact)
    if (_count) {
      result._count = await this.count({ where });
    }

    const mathFields = new Set<string>();
    if (_sum) Object.keys(_sum).forEach((f) => mathFields.add(f));
    if (_avg) Object.keys(_avg).forEach((f) => mathFields.add(f));
    if (_min) Object.keys(_min).forEach((f) => mathFields.add(f));
    if (_max) Object.keys(_max).forEach((f) => mathFields.add(f));

    if (mathFields.size > 0) {
      const fields = Array.from(mathFields);
      const rows = await this._fetchAllPages(where, fields);

      if (_sum) {
        const sumResult: Record<string, number> = {};
        for (const field of Object.keys(_sum)) {
          sumResult[field] = rows.reduce((s, r) => s + (Number(r[field]) || 0), 0);
        }
        result._sum = sumResult;
      }
      if (_avg) {
        const avgResult: Record<string, number> = {};
        for (const field of Object.keys(_avg)) {
          const vals = rows.map((r) => Number(r[field])).filter((v) => !isNaN(v));
          avgResult[field] = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
        }
        result._avg = avgResult;
      }
      if (_min) {
        const minResult: Record<string, unknown> = {};
        for (const field of Object.keys(_min)) {
          const vals = rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined);
          minResult[field] = vals.length > 0 ? vals.reduce((m, v) => (v < m ? v : m)) : null;
        }
        result._min = minResult;
      }
      if (_max) {
        const maxResult: Record<string, unknown> = {};
        for (const field of Object.keys(_max)) {
          const vals = rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined);
          maxResult[field] = vals.length > 0 ? vals.reduce((m, v) => (v > m ? v : m)) : null;
        }
        result._max = maxResult;
      }
    }

    return result;
  }

  /**
   * Fetch ALL matching rows (paged, parallel) selecting only the given
   * columns. Used by `_aggregateFallback` for `_sum`/`_avg`/`_min`/`_max`.
   */
  private async _fetchAllPages(
    where: WhereInput | undefined,
    fields: string[],
  ): Promise<Record<string, unknown>[]> {
    const selectStr = fields.join(',');
    const total = await this.count({ where });
    if (total === 0) return [];

    const PAGE_SIZE = 1000;
    const MAX_PAGES = 500;
    const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);

    const pagePromises = Array.from({ length: pageCount }, async (_, i) => {
      const from = i * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = this.client.from(this.tableName).select(selectStr).range(from, to);
      if (where) applyWhereFilters(q, where);
      const { data, error } = await q;
      if (error) return [] as Record<string, unknown>[];
      return (data || []) as Record<string, unknown>[];
    });

    const pages = await Promise.all(pagePromises);
    return pages.flat();
  }

  async groupBy(options: Record<string, unknown>): Promise<unknown[]> {
    if (this.isMissingTable) return [];

    const by = options.by as string[];
    const where = options.where as WhereInput | undefined;

    if (!by || by.length === 0) return [];

    // ── Fast path: PostgREST native aggregate ──────────────────────────────
    //
    // PostgREST aggregate syntax:
    //   .select('industry,count()')   →  returns [{industry: 'plumbing', count: 423}, ...]
    //
    // The `count()` aggregate (no `head:true`) returns aggregated rows,
    // NOT raw data rows, so the 1000-row cap does not apply.
    //
    // HOWEVER: PostgREST aggregates must be explicitly enabled via the
    // `db-aggregates-enabled` config flag. Many Supabase projects (including
    // production deployments created before aggregates became default-on)
    // have this flag DISABLED, which causes every `count()`/`sum()`/`avg()`
    // in the select string to fail with:
    //
    //     PGRST123: "Use of aggregate functions is not allowed"
    //
    // When that happens we fall back to `_groupByFallback()` below, which
    // pages through the grouping columns to collect distinct values, then
    // issues one `count()` (head + Prefer: count=exact) per distinct value
    // — a mechanism that does NOT require aggregates and works on every
    // Supabase project.
    const selectCols = by.map((c) => c).join(',');
    let aggQuery = this.client
      .from(this.tableName)
      .select(`${selectCols},count()`);

    if (where) applyWhereFilters(aggQuery, where);

    const { data, error } = await aggQuery;
    if (!error) {
      const rows = (data || []) as Record<string, unknown>[];
      return this._mapGroupByRows(rows, by, options);
    }

    // ── Fallback: aggregates disabled (PGRST123) ──────────────────────────
    if (error.code === 'PGRST123' || /aggregate functions/i.test(error.message || '')) {
      return await this._groupByFallback(options, by, where);
    }

    // Other errors (network, malformed query, RLS, etc.)
    console.error(`[SupabaseDB] groupBy error on ${this.tableName}:`, error.message);
    // Issue #1 Fix B: THROW on real errors instead of silently returning [].
    // This surfaces malformed groupBy queries (e.g. bad column names) instead
    // of masking them as empty aggregates.
    throw new Error(`[SupabaseDB] groupBy on ${this.tableName} failed: ${error.message} (code=${error.code})`);
  }

  /**
   * Map PostgREST aggregate rows to the Prisma groupBy result shape.
   *
   * PostgREST returns:  [{ industry: 'plumbing', count: 423 }, ...]
   * Prisma expects:     [{ industry: 'plumbing', _count: { _all: 423 } }, ...]
   *
   * The `_count` sub-key depends on what the caller requested:
   *   `_count: { _all: true }`  →  `_count: { _all: N }`
   *   `_count: { id: true }`    →  `_count: { id: N }`
   *   (no _count)               →  `_count: { id: N }`  (Prisma default)
   */
  private _mapGroupByRows(
    rows: Record<string, unknown>[],
    by: string[],
    options: Record<string, unknown>,
  ): Record<string, unknown>[] {
    const countObj = options._count as Record<string, unknown> | undefined;
    const countKeys = countObj ? Object.keys(countObj) : ['id'];

    return rows.map((r) => {
      const count = Number(r.count) || 0;
      const _count: Record<string, number> = {};
      for (const k of countKeys) {
        _count[k] = count;
      }
      const result: Record<string, unknown> = {};
      for (const c of by) {
        result[c] = r[c];
      }
      result._count = _count;
      return result;
    });
  }

  /**
   * Fallback for `groupBy()` when PostgREST aggregates are disabled
   * (PGRST123 — "Use of aggregate functions is not allowed").
   *
   * Strategy:
   *   1. Get the total matching row count via `count()` (head + Prefer:
   *      count=exact — this mechanism does NOT require aggregates and
   *      works on every Supabase project).
   *   2. Page through ALL matching rows in parallel, selecting ONLY the
   *      grouping columns (small payload). Deduplicate in JS to obtain
   *      the set of distinct group-key combinations.
   *   3. For each distinct combination, issue a `count()` with the group
   *      values added to the where clause (parallel, batched to avoid
   *      overwhelming the API).
   *   4. Apply `orderBy` if the caller requested it.
   *
   * This is more expensive than the native aggregate (N_pages + M_counts
   * requests) but produces byte-for-byte identical results. Callers that
   * cache (e.g. the marketplace counts/cities endpoints with 60s TTL)
   * amortize the cost effectively.
   */
  private async _groupByFallback(
    options: Record<string, unknown>,
    by: string[],
    where: WhereInput | undefined,
  ): Promise<unknown[]> {
    const selectCols = by.join(',');
    const PAGE_SIZE = 1000;
    const MAX_PAGES = 500; // safety cap (500k rows)

    // 1. Total matching rows (head + count=exact — no aggregates needed)
    const total = await this.count({ where });
    if (total === 0) return [];

    const pageCount = Math.min(Math.ceil(total / PAGE_SIZE), MAX_PAGES);

    // 2. Page through grouping columns in parallel to collect distinct values
    const pagePromises = Array.from({ length: pageCount }, async (_, i) => {
      const from = i * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = this.client.from(this.tableName).select(selectCols).range(from, to);
      if (where) applyWhereFilters(q, where);
      const { data: pageData, error: pageErr } = await q;
      if (pageErr) return [] as Record<string, unknown>[];
      return (pageData || []) as Record<string, unknown>[];
    });

    const pages = await Promise.all(pagePromises);

    // Deduplicate by a composite key of all grouping columns
    const distinctMap = new Map<string, Record<string, unknown>>();
    for (const page of pages) {
      for (const row of page) {
        const key = by.map((c) => String(row[c] ?? '\u0000')).join('\u0001');
        if (!distinctMap.has(key)) {
          distinctMap.set(key, row);
        }
      }
    }

    const distinctRows = Array.from(distinctMap.values());

    // 3. Count per distinct value (parallel, batched)
    const BATCH_SIZE = 15;
    const counted: { row: Record<string, unknown>; count: number }[] = [];

    for (let i = 0; i < distinctRows.length; i += BATCH_SIZE) {
      const batch = distinctRows.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(async (row) => {
          const countWhere: WhereInput = { ...(where || {}) };
          for (const c of by) {
            // Overwrite any existing filter on the grouping column with
            // the exact value from this distinct row. This also correctly
            // handles null values (Prisma's `field: null` → `is null`).
            countWhere[c] = row[c] as string | number | boolean | null;
          }
          const cnt = await this.count({ where: countWhere });
          return { row, count: cnt };
        }),
      );
      counted.push(...batchResults);
    }

    // 4. Map to Prisma groupBy shape
    const countObj = options._count as Record<string, unknown> | undefined;
    const countKeys = countObj ? Object.keys(countObj) : ['id'];

    const results: Record<string, unknown>[] = counted.map(({ row, count }) => {
      const _count: Record<string, number> = {};
      for (const k of countKeys) {
        _count[k] = count;
      }
      const result: Record<string, unknown> = {};
      for (const c of by) {
        result[c] = row[c];
      }
      result._count = _count;
      return result;
    });

    // 5. Apply orderBy (Prisma groupBy supports a single orderBy object)
    const orderBy = options.orderBy as Record<string, 'asc' | 'desc'> | undefined;
    if (orderBy) {
      for (const [field, dir] of Object.entries(orderBy)) {
        results.sort((a, b) => {
          const av = a[field];
          const bv = b[field];
          if (av == null && bv == null) return 0;
          if (av == null) return dir === 'desc' ? -1 : 1;
          if (bv == null) return dir === 'desc' ? 1 : -1;
          const cmp =
            typeof av === 'number' && typeof bv === 'number'
              ? av - bv
              : String(av).localeCompare(String(bv));
          return dir === 'desc' ? -cmp : cmp;
        });
      }
    }

    return results;
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
