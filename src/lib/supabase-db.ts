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
};

// Known missing tables in Supabase (return empty results gracefully)
const MISSING_TABLES = new Set([
  'CommunicationProvider',
  'Contact',
  'Form',
  'FormResponse',
  'WorkflowAutomation',
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
        query.gt(field, op.gt as string | number);
      } else if (op.gte !== undefined) {
        query.gte(field, op.gte as string | number);
      } else if (op.lt !== undefined) {
        query.lt(field, op.lt as string | number);
      } else if (op.lte !== undefined) {
        query.lte(field, op.lte as string | number);
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

    const { data: result, error } = await this.client
      .from(this.tableName)
      .insert(serialized)
      .select('*')
      .single();

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

  async update(options: UpdateOptions): Promise<unknown> {
    if (this.isMissingTable) {
      throw new Error(`[SupabaseDB] Table ${this.tableName} not in Supabase`);
    }

    const { where, data, include } = options;
    const serialized = serializeData(data);

    let query = this.client.from(this.tableName).update(serialized).select('*');

    for (const [field, value] of Object.entries(where)) {
      if (value !== undefined) {
        query.eq(field, value as string | number | boolean);
      }
    }

    const { data: result, error } = await query.single();
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
    const { where } = options as { where?: WhereInput };
    const count = await this.count({ where });
    return { _count: count };
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

  async $transaction<T>(operations: Promise<T>[]): Promise<T[]> {
    const results: T[] = [];
    for (const op of operations) {
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
        return (operations: Promise<unknown>[]) => supabaseDB.$transaction(operations);
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
  return process.env.USE_SUPABASE_DB === 'true' && !!supabaseUrl && !!supabaseServiceKey;
}

export function getMissingTables(): string[] {
  return Array.from(MISSING_TABLES);
}
