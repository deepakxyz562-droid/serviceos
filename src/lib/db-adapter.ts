/**
 * Supabase Database Adapter
 * Provides a Prisma-compatible API using the Supabase REST API
 * This allows the application to use Supabase as its database backend
 * without changing any existing code that uses the `db` object.
 */

import { supabaseServer } from './supabase'

// ==========================================
// MODEL TO TABLE MAPPING
// ==========================================
// Prisma client uses camelCase model names (e.g., `db.tenant`)
// Supabase tables use PascalCase names (e.g., `Tenant`)
const MODEL_TABLE_MAP: Record<string, string> = {
  tenant: 'Tenant',
  subscription: 'Subscription',
  invitation: 'Invitation',
  customDomain: 'CustomDomain',
  user: 'User',
  service: 'Service',
  lead: 'Lead',
  invoice: 'Invoice',
  review: 'Review',
  notification: 'Notification',
  quote: 'Quote',
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
  contact: 'Contact',
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
  customerJourney: 'CustomerJourney',
  customerPortalSession: 'CustomerPortalSession',
  integrationConfig: 'IntegrationConfig',
  analyticsSnapshot: 'AnalyticsSnapshot',
  inboxMessage: 'InboxMessage',
  chatLabel: 'ChatLabel',
  conversationLabel: 'ConversationLabel',
  conversationAssignment: 'ConversationAssignment',
  booking: 'Booking',
  knowledgeArticle: 'KnowledgeArticle',
  document: 'Document',
  leadDiscovery: 'LeadDiscovery',
  leadDiscoverySearch: 'LeadDiscoverySearch',
  campaign: 'Campaign',
  campaignTemplate: 'CampaignTemplate',
  campaignAnalytics: 'CampaignAnalytics',
  broadcast: 'Broadcast',
  segment: 'Segment',
  segmentMember: 'SegmentMember',
  retargetingRule: 'RetargetingRule',
  chatbot: 'Chatbot',
  chatbotMessage: 'ChatbotMessage',
  deal: 'Deal',
  timelineEvent: 'TimelineEvent',
  rolePermission: 'RolePermission',
  channelConfig: 'ChannelConfig',
  waForm: 'WaForm',
  waFormResponse: 'WaFormResponse',
  adCampaign: 'AdCampaign',
  marketplaceTemplate: 'MarketplaceTemplate',
}

// ==========================================
// RELATION MAPPING
// ==========================================
// Maps Prisma relation names to Supabase join configurations
// Format: { relationName: { table: string, fk: string, type: 'many-to-one' | 'one-to-many' | 'one-to-one' } }
type RelationConfig = {
  table: string
  fk: string
  type: 'many-to-one' | 'one-to-many' | 'one-to-one'
}

const RELATION_MAP: Record<string, Record<string, RelationConfig>> = {
  job: {
    assignee: { table: 'Employee', fk: 'assigneeId', type: 'many-to-one' },
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
    resource: { table: 'Resource', fk: 'resourceId', type: 'many-to-one' },
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    invoices: { table: 'Invoice', fk: 'jobId', type: 'one-to-many' },
    notificationLogs: { table: 'NotificationLog', fk: 'jobId', type: 'one-to-many' },
    conversation: { table: 'Conversation', fk: 'jobId', type: 'one-to-one' },
    journey: { table: 'CustomerJourney', fk: 'jobId', type: 'one-to-one' },
    collectedBy: { table: 'Employee', fk: 'collectedById', type: 'many-to-one' },
    lead: { table: 'Lead', fk: 'jobId', type: 'one-to-one' },
    currentEmployee: { table: 'Employee', fk: 'currentJobId', type: 'one-to-one' },
  },
  employee: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    currentJob: { table: 'Job', fk: 'currentJobId', type: 'one-to-one' },
    userAccount: { table: 'User', fk: 'userId', type: 'one-to-one' },
    assignedJobs: { table: 'Job', fk: 'assigneeId', type: 'one-to-many' },
    leads: { table: 'Lead', fk: 'assignedToId', type: 'one-to-many' },
    invoices: { table: 'Invoice', fk: 'employeeId', type: 'one-to-many' },
    statusLogs: { table: 'EmployeeStatusLog', fk: 'employeeId', type: 'one-to-many' },
    notificationLogs: { table: 'NotificationLog', fk: 'employeeId', type: 'one-to-many' },
    invitation: { table: 'Invitation', fk: 'employeeId', type: 'one-to-one' },
    collectedPayments: { table: 'Job', fk: 'collectedById', type: 'one-to-many' },
    bookings: { table: 'Booking', fk: 'employeeId', type: 'one-to-many' },
  },
  customer: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    jobs: { table: 'Job', fk: 'customerId', type: 'one-to-many' },
    invoices: { table: 'Invoice', fk: 'customerId', type: 'one-to-many' },
    leads: { table: 'Lead', fk: 'customerId', type: 'one-to-many' },
    notificationLogs: { table: 'NotificationLog', fk: 'customerId', type: 'one-to-many' },
    conversations: { table: 'Conversation', fk: 'customerId', type: 'one-to-many' },
    journeys: { table: 'CustomerJourney', fk: 'customerId', type: 'one-to-many' },
    portalSessions: { table: 'CustomerPortalSession', fk: 'customerId', type: 'one-to-many' },
  },
  lead: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
    job: { table: 'Job', fk: 'jobId', type: 'one-to-one' },
    assignedTo: { table: 'Employee', fk: 'assignedToId', type: 'many-to-one' },
    conversation: { table: 'Conversation', fk: 'leadId', type: 'one-to-one' },
    journey: { table: 'CustomerJourney', fk: 'leadId', type: 'one-to-one' },
  },
  workspace: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
    users: { table: 'User', fk: 'workspaceId', type: 'one-to-many' },
    workflows: { table: 'Workflow', fk: 'workspaceId', type: 'one-to-many' },
    credentials: { table: 'Credential', fk: 'workspaceId', type: 'one-to-many' },
    variables: { table: 'Variable', fk: 'workspaceId', type: 'one-to-many' },
    employees: { table: 'Employee', fk: 'workspaceId', type: 'one-to-many' },
    customers: { table: 'Customer', fk: 'workspaceId', type: 'one-to-many' },
    resources: { table: 'Resource', fk: 'workspaceId', type: 'one-to-many' },
    jobs: { table: 'Job', fk: 'workspaceId', type: 'one-to-many' },
    contactLists: { table: 'ContactList', fk: 'workspaceId', type: 'one-to-many' },
    folders: { table: 'Folder', fk: 'workspaceId', type: 'one-to-many' },
    webhookSources: { table: 'WebhookSource', fk: 'workspaceId', type: 'one-to-many' },
    invitations: { table: 'Invitation', fk: 'workspaceId', type: 'one-to-many' },
  },
  tenant: {
    users: { table: 'User', fk: 'tenantId', type: 'one-to-many' },
    workspaces: { table: 'Workspace', fk: 'tenantId', type: 'one-to-many' },
    leads: { table: 'Lead', fk: 'tenantId', type: 'one-to-many' },
    invoices: { table: 'Invoice', fk: 'tenantId', type: 'one-to-many' },
    subscriptions: { table: 'Subscription', fk: 'tenantId', type: 'one-to-many' },
    services: { table: 'Service', fk: 'tenantId', type: 'one-to-many' },
    reviews: { table: 'Review', fk: 'tenantId', type: 'one-to-many' },
    notifications: { table: 'Notification', fk: 'tenantId', type: 'one-to-many' },
    quotes: { table: 'Quote', fk: 'tenantId', type: 'one-to-many' },
    notificationLogs: { table: 'NotificationLog', fk: 'tenantId', type: 'one-to-many' },
    conversations: { table: 'Conversation', fk: 'tenantId', type: 'one-to-many' },
    invitations: { table: 'Invitation', fk: 'tenantId', type: 'one-to-many' },
    customDomains: { table: 'CustomDomain', fk: 'tenantId', type: 'one-to-many' },
    bookings: { table: 'Booking', fk: 'tenantId', type: 'one-to-many' },
    knowledgeArticles: { table: 'KnowledgeArticle', fk: 'tenantId', type: 'one-to-many' },
    documents: { table: 'Document', fk: 'tenantId', type: 'one-to-many' },
    leadDiscoveries: { table: 'LeadDiscovery', fk: 'tenantId', type: 'one-to-many' },
    discoverySearches: { table: 'LeadDiscoverySearch', fk: 'tenantId', type: 'one-to-many' },
  },
  user: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    apiKeys: { table: 'ApiKey', fk: 'userId', type: 'one-to-many' },
    auditLogs: { table: 'AuditLog', fk: 'userId', type: 'one-to-many' },
    workflows: { table: 'Workflow', fk: 'createdById', type: 'one-to-many' },
    credentials: { table: 'Credential', fk: 'userId', type: 'one-to-many' },
    notifications: { table: 'Notification', fk: 'userId', type: 'one-to-many' },
    employeeAccount: { table: 'Employee', fk: 'userId', type: 'one-to-one' },
    employeeStatusLogs: { table: 'EmployeeStatusLog', fk: 'changedById', type: 'one-to-many' },
    sentInvitations: { table: 'Invitation', fk: 'invitedById', type: 'one-to-many' },
  },
  workflow: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    createdBy: { table: 'User', fk: 'createdById', type: 'many-to-one' },
    versions: { table: 'WorkflowVersion', fk: 'workflowId', type: 'one-to-many' },
    executions: { table: 'Execution', fk: 'workflowId', type: 'one-to-many' },
    webhooks: { table: 'WebhookRegistration', fk: 'workflowId', type: 'one-to-many' },
    folder: { table: 'Folder', fk: 'folderId', type: 'many-to-one' },
  },
  conversation: {
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
    lead: { table: 'Lead', fk: 'leadId', type: 'one-to-one' },
    job: { table: 'Job', fk: 'jobId', type: 'one-to-one' },
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  invoice: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
    job: { table: 'Job', fk: 'jobId', type: 'many-to-one' },
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
    employee: { table: 'Employee', fk: 'employeeId', type: 'many-to-one' },
  },
  review: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  notification: {
    user: { table: 'User', fk: 'userId', type: 'many-to-one' },
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  quote: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  subscription: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  invitation: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    invitedBy: { table: 'User', fk: 'invitedById', type: 'many-to-one' },
    employee: { table: 'Employee', fk: 'employeeId', type: 'one-to-one' },
  },
  customDomain: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  service: {
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  execution: {
    workflow: { table: 'Workflow', fk: 'workflowId', type: 'many-to-one' },
    nodeData: { table: 'ExecutionNodeData', fk: 'executionId', type: 'one-to-many' },
  },
  executionNodeData: {
    execution: { table: 'Execution', fk: 'executionId', type: 'many-to-one' },
  },
  workflowVersion: {
    workflow: { table: 'Workflow', fk: 'workflowId', type: 'many-to-one' },
  },
  credential: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    user: { table: 'User', fk: 'userId', type: 'many-to-one' },
  },
  webhookRegistration: {
    workflow: { table: 'Workflow', fk: 'workflowId', type: 'many-to-one' },
  },
  auditLog: {
    user: { table: 'User', fk: 'userId', type: 'many-to-one' },
  },
  apiKey: {
    user: { table: 'User', fk: 'userId', type: 'many-to-one' },
  },
  variable: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
  },
  folder: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    parent: { table: 'Folder', fk: 'parentId', type: 'many-to-one' },
    children: { table: 'Folder', fk: 'parentId', type: 'one-to-many' },
  },
  employeeStatusLog: {
    employee: { table: 'Employee', fk: 'employeeId', type: 'many-to-one' },
    changedBy: { table: 'User', fk: 'changedById', type: 'many-to-one' },
  },
  notificationLog: {
    job: { table: 'Job', fk: 'jobId', type: 'many-to-one' },
    employee: { table: 'Employee', fk: 'employeeId', type: 'many-to-one' },
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
    tenant: { table: 'Tenant', fk: 'tenantId', type: 'many-to-one' },
  },
  resource: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
  },
  contactList: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
    entries: { table: 'ContactListEntry', fk: 'contactListId', type: 'one-to-many' },
  },
  contactListEntry: {
    contactList: { table: 'ContactList', fk: 'contactListId', type: 'many-to-one' },
  },
  webhookSource: {
    workspace: { table: 'Workspace', fk: 'workspaceId', type: 'many-to-one' },
  },
  webhookEndpoint: {
    logs: { table: 'WebhookEndpointLog', fk: 'webhookEndpointId', type: 'one-to-many' },
  },
  webhookEndpointLog: {
    webhookEndpoint: { table: 'WebhookEndpoint', fk: 'webhookEndpointId', type: 'many-to-one' },
  },
  eventWebhook: {},
  eventWebhookLog: {},
  integrationConfig: {},
  analyticsSnapshot: {},
  inboxMessage: {},
  chatLabel: {},
  conversationLabel: {},
  conversationAssignment: {},
  customerJourney: {
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
    job: { table: 'Job', fk: 'jobId', type: 'one-to-one' },
    lead: { table: 'Lead', fk: 'leadId', type: 'one-to-one' },
  },
  customerPortalSession: {
    customer: { table: 'Customer', fk: 'customerId', type: 'many-to-one' },
  },
  booking: {},
  knowledgeArticle: {},
  document: {},
  leadDiscovery: {},
  leadDiscoverySearch: {},
  campaign: {},
  campaignTemplate: {},
  campaignAnalytics: {},
  broadcast: {},
  segment: {},
  segmentMember: {},
  retargetingRule: {},
  chatbot: {},
  chatbotMessage: {},
  deal: {},
  timelineEvent: {},
  rolePermission: {},
  channelConfig: {},
  waForm: {},
  waFormResponse: {},
  adCampaign: {},
  marketplaceTemplate: {},
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/** Get the table name for a given model name */
function getTableName(model: string): string {
  return MODEL_TABLE_MAP[model] || model.charAt(0).toUpperCase() + model.slice(1)
}

/** Build PostgREST select string from Prisma include/select */
function buildSelectString(
  model: string,
  include?: Record<string, any>,
  select?: Record<string, any>
): string {
  if (select) {
    const fields: string[] = []
    for (const [key, value] of Object.entries(select)) {
      if (value === true) {
        fields.push(key)
      } else if (typeof value === 'object' && value !== null) {
        // Nested select on relation
        const relation = RELATION_MAP[model]?.[key]
        if (relation) {
          const nestedSelect = buildSelectString(
            key,
            undefined,
            value.select || value
          )
          const hint = getJoinHint(key, relation)
          fields.push(`${key}:${relation.table}${hint}(${nestedSelect})`)
        }
      }
    }
    return fields.join(',')
  }

  if (!include) return '*'

  const parts: string[] = ['*']

  for (const [key, value] of Object.entries(include)) {
    if (key === '_count') {
      // _count is handled separately
      continue
    }

    if (value === true) {
      const relation = RELATION_MAP[model]?.[key]
      if (relation) {
        const hint = getJoinHint(key, relation)
        parts.push(`${key}:${relation.table}${hint}(*)`)
      } else {
        // Fallback: try to guess the table name
        const guessedTable = getTableName(key)
        parts.push(`${key}:${guessedTable}(*)`)
      }
    } else if (typeof value === 'object' && value !== null) {
      const relation = RELATION_MAP[model]?.[key]
      if (relation) {
        const hint = getJoinHint(key, relation)
        if (value.select) {
          const nestedFields = buildSelectString(key, undefined, value.select)
          parts.push(`${key}:${relation.table}${hint}(${nestedFields})`)
        } else if (value.include) {
          const nestedFields = buildSelectString(key, value.include)
          parts.push(`${key}:${relation.table}${hint}(${nestedFields})`)
        } else if (value.where) {
          // Include with where filter - need special handling
          const nestedFields = buildSelectString(key, value.include)
          parts.push(`${key}:${relation.table}${hint}(${nestedFields})`)
        } else {
          parts.push(`${key}:${relation.table}${hint}(*)`)
        }
      }
    }
  }

  return parts.join(',')
}

/** Get the PostgREST join hint for a relation */
function getJoinHint(relationName: string, config: RelationConfig): string {
  if (config.type === 'many-to-one') {
    // Forward relation: use the FK column on the current table
    return `!${config.fk}`
  } else if (config.type === 'one-to-many') {
    // Reverse relation: use the FK column on the target table
    return `!${config.fk}`
  } else {
    // One-to-one: similar to one-to-many
    return `!${config.fk}`
  }
}

// ==========================================
// WHERE CLAUSE TRANSLATION
// ==========================================

/** Apply Prisma where clause to a Supabase query */
function applyWhere(query: any, where: Record<string, any>): any {
  if (!where || typeof where !== 'object') return query

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue

    if (key === 'AND') {
      if (Array.isArray(value)) {
        for (const condition of value) {
          query = applyWhere(query, condition)
        }
      }
    } else if (key === 'OR') {
      if (Array.isArray(value)) {
        const orParts: string[] = []
        for (const condition of value) {
          const part = buildOrFilterString(condition)
          if (part) orParts.push(part)
        }
        if (orParts.length > 0) {
          query = query.or(orParts.join(','))
        }
      }
    } else if (key === 'NOT') {
      if (typeof value === 'object' && value !== null) {
        for (const [k, v] of Object.entries(value)) {
          if (v === null) {
            query = query.not(k, 'is', null)
          } else if (typeof v === 'object' && v !== null) {
            // NOT with operators
            for (const [op, val] of Object.entries(v as Record<string, any>)) {
              switch (op) {
                case 'in':
                  query = query.not(k, 'in', `(${(val as any[]).join(',')})`)
                  break
                default:
                  query = query.neq(k, val)
              }
            }
          } else {
            query = query.neq(k, v)
          }
        }
      }
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      // Handle operators
      for (const [op, val] of Object.entries(value as Record<string, any>)) {
        query = applyOperator(query, key, op, val)
      }
    } else {
      // Simple equality
      query = applySimpleEquality(query, key, value)
    }
  }

  return query
}

/** Apply a single operator to the query */
function applyOperator(query: any, field: string, op: string, value: any): any {
  switch (op) {
    case 'equals':
      return applySimpleEquality(query, field, value)
    case 'not':
      if (value === null) return query.not(field, 'is', null)
      return query.neq(field, value)
    case 'in':
      return query.in(field, Array.isArray(value) ? value : [value])
    case 'notIn':
      // PostgREST doesn't have a direct notIn, use not.in
      return query.not(field, 'in', `(${(Array.isArray(value) ? value : [value]).join(',')})`)
    case 'contains':
      return query.ilike(field, `%${value}%`)
    case 'startsWith':
      return query.ilike(field, `${value}%`)
    case 'endsWith':
      return query.ilike(field, `%${value}`)
    case 'gt':
      return query.gt(field, value instanceof Date ? value.toISOString() : value)
    case 'gte':
      return query.gte(field, value instanceof Date ? value.toISOString() : value)
    case 'lt':
      return query.lt(field, value instanceof Date ? value.toISOString() : value)
    case 'lte':
      return query.lte(field, value instanceof Date ? value.toISOString() : value)
    case 'is':
      if (value === null) return query.is(field, null)
      return query.eq(field, value)
    case 'isNot':
      if (value === null) return query.not(field, 'is', null)
      return query.neq(field, value)
    case 'some':
    case 'every':
    case 'none':
      // Relation filters - need special handling
      // For now, skip relation filters in where clause (they're handled in include)
      return query
    default:
      // Unknown operator, try equality
      return applySimpleEquality(query, field, value)
  }
}

/** Apply simple equality filter */
function applySimpleEquality(query: any, field: string, value: any): any {
  if (value === null) {
    return query.is(field, null)
  }
  if (value === undefined) {
    return query
  }
  if (value instanceof Date) {
    return query.eq(field, value.toISOString())
  }
  return query.eq(field, value)
}

/** Build an OR filter string for PostgREST */
function buildOrFilterString(condition: Record<string, any>): string {
  const parts: string[] = []

  for (const [key, value] of Object.entries(condition)) {
    if (value === undefined) continue

    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      for (const [op, val] of Object.entries(value as Record<string, any>)) {
        const part = buildFieldFilterString(key, op, val)
        if (part) parts.push(part)
      }
    } else {
      parts.push(buildSimpleFilterString(key, value))
    }
  }

  return parts.length > 1 ? `and(${parts.join(',')})` : parts[0] || ''
}

/** Build a filter string for a specific field and operator */
function buildFieldFilterString(field: string, op: string, value: any): string {
  switch (op) {
    case 'equals':
      return buildSimpleFilterString(field, value)
    case 'not':
      if (value === null) return `${field}.not.is.null`
      return `${field}.neq.${value}`
    case 'in':
      return `${field}.in.(${(Array.isArray(value) ? value : [value]).join(',')})`
    case 'contains':
      return `${field}.ilike.%${value}%`
    case 'startsWith':
      return `${field}.ilike.${value}%`
    case 'endsWith':
      return `${field}.ilike.%${value}`
    case 'gt':
      return `${field}.gt.${value instanceof Date ? value.toISOString() : value}`
    case 'gte':
      return `${field}.gte.${value instanceof Date ? value.toISOString() : value}`
    case 'lt':
      return `${field}.lt.${value instanceof Date ? value.toISOString() : value}`
    case 'lte':
      return `${field}.lte.${value instanceof Date ? value.toISOString() : value}`
    default:
      return buildSimpleFilterString(field, value)
  }
}

/** Build a simple equality filter string */
function buildSimpleFilterString(field: string, value: any): string {
  if (value === null) return `${field}.is.null`
  if (value instanceof Date) return `${field}.eq.${value.toISOString()}`
  return `${field}.eq.${value}`
}

// ==========================================
// ORDER BY TRANSLATION
// ==========================================

function applyOrderBy(query: any, orderBy: any): any {
  if (!orderBy) return query

  const orders = Array.isArray(orderBy) ? orderBy : [orderBy]

  for (const order of orders) {
    if (typeof order === 'object' && order !== null) {
      for (const [field, direction] of Object.entries(order)) {
        if (field === '_count') {
          // Can't order by _count with PostgREST, skip
          continue
        }
        if (typeof direction === 'object' && direction !== null) {
          // Nested orderBy like { _count: { field: 'desc' } }
          continue
        }
        query = query.order(field, {
          ascending: direction === 'asc',
          nullsFirst: false,
        })
      }
    } else if (typeof order === 'string') {
      query = query.order(order, { ascending: true })
    }
  }

  return query
}

// ==========================================
// DATA PREPARATION
// ==========================================

/** Prepare data for Supabase insert/update */
function prepareData(data: Record<string, any>): Record<string, any> {
  const prepared: Record<string, any> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)) {
      // Check for Prisma atomic operations
      if ('increment' in value) {
        // For increment, we need to handle it differently
        // Store the increment info for later processing
        prepared[key] = value // Will be handled in the update method
      } else if ('set' in value) {
        prepared[key] = value.set
      } else if ('push' in value) {
        // Not directly supported, skip
        prepared[key] = value
      } else {
        prepared[key] = value
      }
    } else if (value instanceof Date) {
      prepared[key] = value.toISOString()
    } else {
      prepared[key] = value
    }
  }

  return prepared
}

/** Handle increment operations in update data */
function hasIncrementOperations(data: Record<string, any>): boolean {
  for (const value of Object.values(data)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'increment' in value) {
      return true
    }
  }
  return false
}

/** Separate increment operations from regular update data */
function separateIncrementData(data: Record<string, any>): {
  regular: Record<string, any>
  increments: Record<string, number>
} {
  const regular: Record<string, any> = {}
  const increments: Record<string, number> = {}

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value) && 'increment' in value) {
      increments[key] = value.increment
    } else if (value instanceof Date) {
      regular[key] = value.toISOString()
    } else {
      regular[key] = value
    }
  }

  return { regular, increments }
}

// ==========================================
// MODEL ADAPTER
// ==========================================

function createModelAdapter(model: string) {
  const tableName = getTableName(model)

  return {
    findMany: async (params: any = {}) => {
      try {
        const { where, include, select, orderBy, skip, take, distinct } = params
        const selectString = buildSelectString(model, include, select)

        let query = supabaseServer.from(tableName).select(selectString)

        if (where) query = applyWhere(query, where)
        if (orderBy) query = applyOrderBy(query, orderBy)
        if (skip !== undefined && take !== undefined) {
          query = query.range(skip, skip + take - 1)
        } else if (take !== undefined) {
          query = query.limit(take)
        }

        const { data, error } = await query

        if (error) {
          console.error(`[Supabase Adapter] findMany error on ${tableName}:`, error.message)
          return []
        }

        let results = data || []

        // Handle _count in include
        if (include?._count) {
          results = await addCountFields(model, results, include._count, where)
        }

        return results
      } catch (err) {
        console.error(`[Supabase Adapter] findMany exception on ${tableName}:`, err)
        return []
      }
    },

    findUnique: async (params: any) => {
      try {
        const { where, include, select } = params
        const selectString = buildSelectString(model, include, select)

        let query = supabaseServer.from(tableName).select(selectString)

        if (where) query = applyWhere(query, where)
        query = query.limit(1)

        const { data, error } = await query

        if (error) {
          console.error(`[Supabase Adapter] findUnique error on ${tableName}:`, error.message)
          return null
        }

        let result = data?.[0] || null

        // Handle _count in include
        if (result && include?._count) {
          const countResults = await addCountFields(model, [result], include._count, where)
          result = countResults[0]
        }

        return result
      } catch (err) {
        console.error(`[Supabase Adapter] findUnique exception on ${tableName}:`, err)
        return null
      }
    },

    findFirst: async (params: any = {}) => {
      try {
        const { where, include, select, orderBy } = params
        const selectString = buildSelectString(model, include, select)

        let query = supabaseServer.from(tableName).select(selectString)

        if (where) query = applyWhere(query, where)
        if (orderBy) query = applyOrderBy(query, orderBy)
        query = query.limit(1)

        const { data, error } = await query

        if (error) {
          console.error(`[Supabase Adapter] findFirst error on ${tableName}:`, error.message)
          return null
        }

        let result = data?.[0] || null

        // Handle _count in include
        if (result && include?._count) {
          const countResults = await addCountFields(model, [result], include._count, where)
          result = countResults[0]
        }

        return result
      } catch (err) {
        console.error(`[Supabase Adapter] findFirst exception on ${tableName}:`, err)
        return null
      }
    },

    create: async (params: any) => {
      try {
        const { data, include, select } = params
        const selectString = buildSelectString(model, include, select)
        const preparedData = prepareData(data)

        const { data: result, error } = await supabaseServer
          .from(tableName)
          .insert(preparedData)
          .select(selectString)
          .single()

        if (error) {
          console.error(`[Supabase Adapter] create error on ${tableName}:`, error.message)
          throw new Error(error.message)
        }

        return result
      } catch (err) {
        console.error(`[Supabase Adapter] create exception on ${tableName}:`, err)
        throw err
      }
    },

    update: async (params: any) => {
      try {
        const { where, data, include, select } = params
        const selectString = buildSelectString(model, include, select)

        // Handle increment operations
        if (hasIncrementOperations(data)) {
          return await handleUpdateWithIncrement(model, tableName, where, data, selectString)
        }

        const preparedData = prepareData(data)

        let query = supabaseServer.from(tableName).update(preparedData)
        if (where) query = applyWhere(query, where)

        const { data: result, error } = await query.select(selectString)

        if (error) {
          console.error(`[Supabase Adapter] update error on ${tableName}:`, error.message)
          throw new Error(error.message)
        }

        // For single record update (findUnique-like), return first result
        if (result && result.length === 1) {
          return result[0]
        }

        return result?.[0] || null
      } catch (err) {
        console.error(`[Supabase Adapter] update exception on ${tableName}:`, err)
        throw err
      }
    },

    delete: async (params: any) => {
      try {
        const { where } = params

        let query = supabaseServer.from(tableName).delete()
        if (where) query = applyWhere(query, where)

        const { data, error } = await query.select()

        if (error) {
          console.error(`[Supabase Adapter] delete error on ${tableName}:`, error.message)
          throw new Error(error.message)
        }

        return data?.[0] || null
      } catch (err) {
        console.error(`[Supabase Adapter] delete exception on ${tableName}:`, err)
        throw err
      }
    },

    upsert: async (params: any) => {
      try {
        const { where, create, update, include, select } = params
        const selectString = buildSelectString(model, include, select)

        // Combine create and update data (Supabase upsert uses the full data)
        const dataToUpsert = { ...create, ...update }
        const preparedData = prepareData(dataToUpsert)

        // Try to find unique columns from the where clause
        const uniqueColumns = Object.keys(where || {})

        const { data: result, error } = await supabaseServer
          .from(tableName)
          .upsert(preparedData, {
            onConflict: uniqueColumns.length > 0 ? uniqueColumns.join(',') : undefined,
            ignoreDuplicates: false,
          })
          .select(selectString)
          .single()

        if (error) {
          console.error(`[Supabase Adapter] upsert error on ${tableName}:`, error.message)
          // Fallback: try manual find + create/update
          return await manualUpsert(model, tableName, where, create, update, selectString)
        }

        return result
      } catch (err) {
        console.error(`[Supabase Adapter] upsert exception on ${tableName}:`, err)
        // Fallback
        try {
          const selectString = buildSelectString(model)
          return await manualUpsert(model, tableName, params.where, params.create, params.update, selectString)
        } catch (fallbackErr) {
          throw fallbackErr
        }
      }
    },

    count: async (params: any = {}) => {
      try {
        const { where } = params

        let query = supabaseServer.from(tableName).select('*', {
          count: 'exact',
          head: true,
        })

        if (where) query = applyWhere(query, where)

        const { count, error } = await query

        if (error) {
          console.error(`[Supabase Adapter] count error on ${tableName}:`, error.message)
          return 0
        }

        return count || 0
      } catch (err) {
        console.error(`[Supabase Adapter] count exception on ${tableName}:`, err)
        return 0
      }
    },

    createMany: async (params: any) => {
      try {
        const { data, skipDuplicates } = params
        const preparedData = Array.isArray(data)
          ? data.map((d: any) => prepareData(d))
          : prepareData(data)

        const { data: result, error } = await supabaseServer
          .from(tableName)
          .insert(preparedData)
          .select()

        if (error) {
          console.error(`[Supabase Adapter] createMany error on ${tableName}:`, error.message)
          throw new Error(error.message)
        }

        return { count: result?.length || 0 }
      } catch (err) {
        console.error(`[Supabase Adapter] createMany exception on ${tableName}:`, err)
        throw err
      }
    },

    updateMany: async (params: any) => {
      try {
        const { where, data } = params

        // Handle increment operations
        if (hasIncrementOperations(data)) {
          return await handleUpdateManyWithIncrement(model, tableName, where, data)
        }

        const preparedData = prepareData(data)

        let query = supabaseServer.from(tableName).update(preparedData)
        if (where) query = applyWhere(query, where)

        const { data: result, error } = await query.select()

        if (error) {
          console.error(`[Supabase Adapter] updateMany error on ${tableName}:`, error.message)
          throw new Error(error.message)
        }

        return { count: result?.length || 0 }
      } catch (err) {
        console.error(`[Supabase Adapter] updateMany exception on ${tableName}:`, err)
        throw err
      }
    },

    deleteMany: async (params: any = {}) => {
      try {
        const { where } = params

        let query = supabaseServer.from(tableName).delete()
        if (where) query = applyWhere(query, where)

        const { data: result, error } = await query.select()

        if (error) {
          console.error(`[Supabase Adapter] deleteMany error on ${tableName}:`, error.message)
          throw new Error(error.message)
        }

        return { count: result?.length || 0 }
      } catch (err) {
        console.error(`[Supabase Adapter] deleteMany exception on ${tableName}:`, err)
        throw err
      }
    },

    aggregate: async (params: any) => {
      try {
        const { where, _sum, _avg, _count, _min, _max } = params

        // For aggregate, we fetch the data and compute in JS
        let query = supabaseServer.from(tableName).select('*')
        if (where) query = applyWhere(query, where)

        const { data, error } = await query

        if (error) {
          console.error(`[Supabase Adapter] aggregate error on ${tableName}:`, error.message)
          return {}
        }

        const records = data || []
        const result: Record<string, any> = {}

        if (_sum) {
          result._sum = {}
          for (const field of Object.keys(_sum)) {
            if (_sum[field]) {
              result._sum[field] = records.reduce((sum: number, r: any) => sum + (Number(r[field]) || 0), 0)
            }
          }
        }

        if (_avg) {
          result._avg = {}
          for (const field of Object.keys(_avg)) {
            if (_avg[field] && records.length > 0) {
              const sum = records.reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0)
              result._avg[field] = sum / records.length
            }
          }
        }

        if (_count) {
          result._count = {}
          for (const field of Object.keys(_count)) {
            if (_count[field]) {
              result._count[field] = records.filter((r: any) => r[field] !== null && r[field] !== undefined).length
            }
          }
        }

        if (_min) {
          result._min = {}
          for (const field of Object.keys(_min)) {
            if (_min[field]) {
              const values = records.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined)
              result._min[field] = values.length > 0 ? Math.min(...values) : null
            }
          }
        }

        if (_max) {
          result._max = {}
          for (const field of Object.keys(_max)) {
            if (_max[field]) {
              const values = records.map((r: any) => r[field]).filter((v: any) => v !== null && v !== undefined)
              result._max[field] = values.length > 0 ? Math.max(...values) : null
            }
          }
        }

        return result
      } catch (err) {
        console.error(`[Supabase Adapter] aggregate exception on ${tableName}:`, err)
        return {}
      }
    },

    groupBy: async (params: any) => {
      try {
        const { by, where, _count, _sum, _avg, orderBy } = params

        // Fetch all matching records
        let query = supabaseServer.from(tableName).select('*')
        if (where) query = applyWhere(query, where)

        const { data, error } = await query

        if (error) {
          console.error(`[Supabase Adapter] groupBy error on ${tableName}:`, error.message)
          return []
        }

        const records = data || []

        // Group by the specified fields
        const groupMap = new Map<string, any>()

        for (const record of records) {
          const key = by.map((field: string) => String(record[field] ?? 'null')).join('|')

          if (!groupMap.has(key)) {
            const group: Record<string, any> = {}
            for (const field of by) {
              group[field] = record[field]
            }
            group._count = {}
            group._sum = {}
            group._avg = {}
            group._records = []
            groupMap.set(key, group)
          }

          groupMap.get(key)._records.push(record)
        }

        // Compute aggregations
        const results: any[] = []
        for (const group of groupMap.values()) {
          const groupRecords = group._records
          delete group._records

          if (_count) {
            for (const field of Object.keys(_count)) {
              if (_count[field]) {
                group._count[field] = groupRecords.filter(
                  (r: any) => r[field] !== null && r[field] !== undefined
                ).length
              }
            }
          }

          if (_sum) {
            for (const field of Object.keys(_sum)) {
              if (_sum[field]) {
                group._sum[field] = groupRecords.reduce(
                  (s: number, r: any) => s + (Number(r[field]) || 0), 0
                )
              }
            }
          }

          if (_avg) {
            for (const field of Object.keys(_avg)) {
              if (_avg[field] && groupRecords.length > 0) {
                const sum = groupRecords.reduce((s: number, r: any) => s + (Number(r[field]) || 0), 0)
                group._avg[field] = sum / groupRecords.length
              }
            }
          }

          results.push(group)
        }

        // Apply orderBy if specified
        if (orderBy) {
          const orders = Array.isArray(orderBy) ? orderBy : [orderBy]
          for (const order of orders.reverse()) {
            for (const [field, direction] of Object.entries(order)) {
              if (field === '_count') {
                // Order by count field
                for (const [countField, dir] of Object.entries(direction as any)) {
                  results.sort((a: any, b: any) =>
                    dir === 'desc' ? (b._count?.[countField] || 0) - (a._count?.[countField] || 0)
                    : (a._count?.[countField] || 0) - (b._count?.[countField] || 0)
                  )
                }
              } else {
                results.sort((a: any, b: any) =>
                  direction === 'desc'
                    ? (b[field] > a[field] ? 1 : -1)
                    : (a[field] > b[field] ? 1 : -1)
                )
              }
            }
          }
        }

        return results
      } catch (err) {
        console.error(`[Supabase Adapter] groupBy exception on ${tableName}:`, err)
        return []
      }
    },
  }
}

// ==========================================
// SPECIAL HANDLERS
// ==========================================

/** Handle update with increment operations */
async function handleUpdateWithIncrement(
  model: string,
  tableName: string,
  where: any,
  data: any,
  selectString: string
): Promise<any> {
  const { regular, increments } = separateIncrementData(data)

  // First, get the current record
  let fetchQuery = supabaseServer.from(tableName).select('*')
  if (where) fetchQuery = applyWhere(fetchQuery, where)
  fetchQuery = fetchQuery.limit(1)

  const { data: current, error: fetchError } = await fetchQuery

  if (fetchError || !current?.[0]) {
    throw new Error(fetchError?.message || 'Record not found for increment update')
  }

  // Compute the increment values
  const incrementData: Record<string, any> = {}
  for (const [field, amount] of Object.entries(increments)) {
    incrementData[field] = (Number(current[0][field]) || 0) + amount
  }

  // Combine regular and increment data
  const allData = { ...regular, ...incrementData }

  let updateQuery = supabaseServer.from(tableName).update(allData)
  if (where) updateQuery = applyWhere(updateQuery, where)

  const { data: result, error } = await updateQuery.select(selectString)

  if (error) {
    throw new Error(error.message)
  }

  return result?.[0] || null
}

/** Handle updateMany with increment operations */
async function handleUpdateManyWithIncrement(
  model: string,
  tableName: string,
  where: any,
  data: any
): Promise<{ count: number }> {
  const { regular, increments } = separateIncrementData(data)

  // Get all matching records
  let fetchQuery = supabaseServer.from(tableName).select('id')
  if (where) fetchQuery = applyWhere(fetchQuery, where)

  const { data: records, error: fetchError } = await fetchQuery

  if (fetchError || !records?.length) {
    return { count: 0 }
  }

  // Update each record with computed increments
  let updateCount = 0
  for (const record of records) {
    // Get current values for increment fields
    const { data: current } = await supabaseServer
      .from(tableName)
      .select(Object.keys(increments).join(','))
      .eq('id', record.id)
      .single()

    const incrementData: Record<string, any> = {}
    for (const [field, amount] of Object.entries(increments)) {
      incrementData[field] = (Number(current?.[field]) || 0) + amount
    }

    const allData = { ...regular, ...incrementData }

    const { error } = await supabaseServer
      .from(tableName)
      .update(allData)
      .eq('id', record.id)

    if (!error) updateCount++
  }

  return { count: updateCount }
}

/** Manual upsert: find + create/update */
async function manualUpsert(
  model: string,
  tableName: string,
  where: any,
  create: any,
  update: any,
  selectString: string
): Promise<any> {
  // Try to find existing record
  let findQuery = supabaseServer.from(tableName).select('*')
  if (where) findQuery = applyWhere(findQuery, where)
  findQuery = findQuery.limit(1)

  const { data: existing } = await findQuery

  if (existing?.[0]) {
    // Update existing record
    const preparedData = prepareData(update)
    const { data: result, error } = await supabaseServer
      .from(tableName)
      .update(preparedData)
      .eq('id', existing[0].id)
      .select(selectString)
      .single()

    if (error) throw new Error(error.message)
    return result
  } else {
    // Create new record
    const preparedData = prepareData(create)
    const { data: result, error } = await supabaseServer
      .from(tableName)
      .insert(preparedData)
      .select(selectString)
      .single()

    if (error) throw new Error(error.message)
    return result
  }
}

/** Add _count fields to results */
async function addCountFields(
  model: string,
  results: any[],
  countConfig: any,
  baseWhere?: any
): Promise<any[]> {
  if (!results.length) return results

  const modelRelations = RELATION_MAP[model]
  if (!modelRelations) return results

  const countFields = typeof countConfig === 'object' && countConfig.select
    ? countConfig.select
    : countConfig === true
      ? Object.fromEntries(
          Object.entries(modelRelations)
            .filter(([_, config]) => config.type === 'one-to-many')
            .map(([name]) => [name, true])
        )
      : {}

  for (const [relationName, enabled] of Object.entries(countFields)) {
    if (!enabled) continue

    const relation = modelRelations[relationName]
    if (!relation) continue

    // For each result, count the related records
    for (const result of results) {
      const fkValue = result.id // The current record's ID
      if (!fkValue) continue

      const { count, error } = await supabaseServer
        .from(relation.table)
        .select('*', { count: 'exact', head: true })
        .eq(relation.fk, fkValue)

      if (!result._count) result._count = {}
      result._count[relationName] = count || 0
    }
  }

  return results
}

// ==========================================
// DB ADAPTER (Prisma-compatible interface)
// ==========================================

export function createSupabaseAdapter() {
  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      // Handle special Prisma client methods
      if (prop === '$connect') return async () => { /* Supabase connects automatically */ }
      if (prop === '$disconnect') return async () => { /* Supabase disconnects automatically */ }
      if (prop === '$transaction') {
        return async (fn: any) => {
          // Supabase REST API doesn't support transactions
          // Execute the function directly (no transaction guarantee)
          if (typeof fn === 'function') {
            return fn(createSupabaseAdapter())
          }
          return fn
        }
      }
      if (prop === '$queryRaw') {
        return async () => {
          // Not supported, return empty result
          return [{ '?column?': 1 }]
        }
      }
      if (prop === '$executeRaw') {
        return async () => {
          // Not supported
          return { count: 0 }
        }
      }
      if (prop === '$use') {
        return () => { /* Middleware not supported */ }
      }
      if (prop === '$extends') {
        return () => createSupabaseAdapter()
      }

      // Return model adapter for known models
      if (typeof prop === 'string') {
        return createModelAdapter(prop)
      }

      return undefined
    },
  }

  return new Proxy({}, handler) as any
}
