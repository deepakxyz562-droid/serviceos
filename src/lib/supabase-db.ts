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
};

// Known missing tables in Supabase (return empty results gracefully)
const MISSING_TABLES = new Set<string>([
  // CommunicationProvider, Contact, Form, FormResponse, WorkflowAutomation
  // have been migrated to Supabase — removed from missing list
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
    subscription: { targetTable: 'Subscription', targetFkColumn: 'tenantId', isMany: true },
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
      // .or('name.ilike.%search%,phone.ilike.%search%')
      // We build this from the Prisma OR array
      const orConditions = value as WhereInput[];
      const orParts: string[] = [];
      for (const cond of orConditions) {
        for (const [orField, orValue] of Object.entries(cond)) {
          if (orValue === undefined) continue;
          if (orValue !== null && typeof orValue === 'object' && !Array.isArray(orValue) && !(orValue instanceof Date)) {
            const op = orValue as WhereOperator;
            if (op.contains !== undefined) {
              orParts.push(`${orField}.ilike.%${op.contains}%`);
            } else if (op.startsWith !== undefined) {
              orParts.push(`${orField}.ilike.${op.startsWith}%`);
            } else if (op.endsWith !== undefined) {
              orParts.push(`${orField}.ilike.%${op.endsWith}`);
            } else if (op.equals !== undefined) {
              if (op.equals === null) {
                orParts.push(`${orField}.is.null`);
              } else {
                orParts.push(`${orField}.eq.${op.equals}`);
              }
            } else if (op.gt !== undefined) {
              orParts.push(`${orField}.gt.${op.gt}`);
            } else if (op.gte !== undefined) {
              orParts.push(`${orField}.gte.${op.gte}`);
            } else if (op.lt !== undefined) {
              orParts.push(`${orField}.lt.${op.lt}`);
            } else if (op.lte !== undefined) {
              orParts.push(`${orField}.lte.${op.lte}`);
            } else if (op.in !== undefined) {
              orParts.push(`${orField}.in.(${(op.in as (string | number | boolean)[]).join(',')})`);
            }
          } else if (orValue === null) {
            orParts.push(`${orField}.is.null`);
          } else if (Array.isArray(orValue)) {
            orParts.push(`${orField}.in.(${orValue.join(',')})`);
          } else {
            orParts.push(`${orField}.eq.${orValue}`);
          }
        }
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

      if (op.equals !== undefined) {
        if (op.equals === null) { query.is(field, null); }
        else { query.eq(field, op.equals as string | number | boolean); }
      } else if (op.not !== undefined) {
        if (op.not === null) { query.not(field, 'is', null); }
        else { query.neq(field, op.not as string | number | boolean); }
      } else if (op.in !== undefined) {
        query.in(field, op.in as (string | number | boolean)[]);
      } else if (op.contains !== undefined) {
        query.ilike(field, `%${op.contains}%`);
      } else if (op.startsWith !== undefined) {
        query.ilike(field, `${op.startsWith}%`);
      } else if (op.endsWith !== undefined) {
        query.ilike(field, `%${op.endsWith}`);
      } else if (op.gt !== undefined) {
        const val = op.gt instanceof Date ? op.gt.toISOString() : op.gt;
        query.gt(field, val as string | number);
      } else if (op.gte !== undefined) {
        const val = op.gte instanceof Date ? op.gte.toISOString() : op.gte;
        query.gte(field, val as string | number);
      } else if (op.lt !== undefined) {
        const val = op.lt instanceof Date ? op.lt.toISOString() : op.lt;
        query.lt(field, val as string | number);
      } else if (op.lte !== undefined) {
        const val = op.lte instanceof Date ? op.lte.toISOString() : op.lte;
        query.lte(field, val as string | number);
      } else if (op.isSet === true) {
        query.not(field, 'is', null);
      } else if (op.isSet === false) {
        query.is(field, null);
      } else if (op.is !== undefined) {
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

function serializeData(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Date) {
      result[key] = value.toISOString();
    } else if (value === undefined) {
      continue;
    } else {
      result[key] = value;
    }
  }
  return result;
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
    if (!modelRelations[relName]) continue;

    const rel = modelRelations[relName];
    const relInclude = relConfig as Record<string, unknown>;
    const relSelect = (relInclude?.select as Record<string, boolean>) || undefined;
    const selectStr = relSelect
      ? Object.entries(relSelect).filter(([, v]) => v === true).map(([k]) => k).join(',')
      : '*';

    // Determine the FK column direction
    if (rel.isMany) {
      // One-to-many: target table has FK pointing back to main table
      const targetFkCol = rel.targetFkColumn!;
      // Get all main record IDs
      const mainIds = results.map(r => r.id).filter(Boolean) as string[];
      if (mainIds.length === 0) continue;

      // Fetch all related records
      const { data: related, error } = await client
        .from(rel.targetTable)
        .select(selectStr)
        .in(targetFkCol, mainIds);

      if (error || !related) continue;

      // Group by FK value
      const grouped = new Map<string, unknown[]>();
      for (const r of related) {
        const fkVal = r[targetFkCol] as string;
        if (!grouped.has(fkVal)) grouped.set(fkVal, []);
        grouped.get(fkVal)!.push(r);
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
        .select(selectStr)
        .in(rel.targetFkColumn, mainIds);

      if (error || !related) continue;

      const relatedMap = new Map<string, unknown>();
      for (const r of related) {
        relatedMap.set(r[rel.targetFkColumn] as string, r);
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

      // Fetch target records
      const { data: related, error } = await client
        .from(rel.targetTable)
        .select(selectStr)
        .in('id', fkValues);

      if (error || !related) continue;

      // Map by ID
      const relatedMap = new Map<string, unknown>();
      for (const r of related) {
        relatedMap.set(r.id as string, r);
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
      console.error(`[SupabaseDB] findMany error on ${this.tableName}:`, error.message);
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

    const { where, include } = options;

    let query = this.client.from(this.tableName).select('*');

    for (const [field, value] of Object.entries(where)) {
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
      return resolved[0];
    }

    return data;
  }

  async findFirst(options: FindFirstOptions = {}): Promise<unknown | null> {
    if (this.isMissingTable) return null;

    const { where, include, orderBy } = options;

    let query = this.client.from(this.tableName).select('*');

    if (where) applyWhereFilters(query, where);
    if (orderBy) applyOrderBy(query, orderBy);

    const { data, error } = await query.limit(1).single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      console.error(`[SupabaseDB] findFirst error on ${this.tableName}:`, error.message);
      return null;
    }

    if (include && data) {
      const resolved = await resolveIncludes(this.tableName, [data as Record<string, unknown>], include);
      return resolved[0];
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

    // Auto-set updatedAt if not provided
    if (!('updatedAt' in serialized) && !('updated_at' in serialized)) {
      serialized.updatedAt = new Date().toISOString();
    }

    let { data: result, error } = await this.client
      .from(this.tableName)
      .insert(serialized)
      .select('*')
      .single();

    // Retry without updatedAt if the column doesn't exist in the table
    if (error && error.message && error.message.includes('updatedAt') && 'updatedAt' in serialized) {
      delete serialized.updatedAt;
      const retry = await this.client
        .from(this.tableName)
        .insert(serialized)
        .select('*')
        .single();
      result = retry.data;
      error = retry.error;
    }

    if (error) {
      console.error(`[SupabaseDB] create error on ${this.tableName}:`, error.message, error.details);
      throw new Error(`Failed to create ${this.tableName}: ${error.message}`);
    }

    if (include && result) {
      const resolved = await resolveIncludes(this.tableName, [result as Record<string, unknown>], include);
      return resolved[0];
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

    // Only auto-generate the id. Don't add createdAt/updatedAt because many
    // tables (ContactGroup, ContactTag, etc.) don't have those columns.
    // The DB-level DEFAULT clauses handle timestamp defaults (e.g. addedAt
    // with @default(now()) becomes DEFAULT now() in Postgres).
    const baseRows = rows.map((row) => {
      const s = serializeData(row);
      if (!('id' in s) || s.id === undefined || s.id === null) {
        s.id = nanoid(25);
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
    //   'Could not find the `createdAt` column of `ContactGroup` in the schema cache'
    //   'column "updatedAt" of relation "ContactGroup" does not exist'
    if (result.error) {
      const missingColMatch = result.error.match(
        /(?:Could not find the `?(\w+)`? column|column "(\w+)" of relation)/
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
          /(?:Could not find the `?(\w+)`? column|column "(\w+)" of relation)/
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
    const serialized = serializeData(data);

    // Auto-set updatedAt — Prisma does this with @updatedAt at the application layer,
    // but PostgREST has no such feature. Without this, updatedAt stays stale.
    // Only set it if it's not already provided; some tables don't have this column.
    if (!('updatedAt' in serialized)) {
      serialized.updatedAt = new Date().toISOString();
    }

    let query = this.client.from(this.tableName).update(serialized).select('*');

    for (const [field, value] of Object.entries(where)) {
      if (value !== undefined) {
        query.eq(field, value as string | number | boolean);
      }
    }

    let { data: result, error } = await query.single();

    // Retry without updatedAt if the column doesn't exist in the table
    if (error && error.message && error.message.includes('updatedAt') && 'updatedAt' in serialized) {
      delete serialized.updatedAt;
      let retryQuery = this.client.from(this.tableName).update(serialized).select('*');
      for (const [field, value] of Object.entries(where)) {
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
      return resolved[0];
    }

    return result;
  }

  async upsert(options: UpsertOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { where, create, update } = options;
    const merged = { ...create, ...update };
    const serialized = serializeData(merged);
    const uniqueColumns = Object.keys(where);

    const { data: result, error } = await this.client
      .from(this.tableName)
      .upsert(serialized, { onConflict: uniqueColumns.join(',') })
      .select('*')
      .single();

    if (error) {
      console.error(`[SupabaseDB] upsert error on ${this.tableName}:`, error.message);
      throw new Error(`Failed to upsert ${this.tableName}: ${error.message}`);
    }

    return result;
  }

  async delete(options: DeleteOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { where } = options;
    let query = this.client.from(this.tableName).delete();

    for (const [field, value] of Object.entries(where)) {
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

  async groupBy(_options: Record<string, unknown>): Promise<unknown[]> {
    return [];
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
