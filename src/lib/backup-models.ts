/**
 * Backup Model Registry
 * =====================
 *
 * Exhaustive list of all Prisma models that should be included in a JSON
 * database backup. The names are the **PascalCase** model names from
 * `prisma/schema.prisma`. At runtime we convert them to the **Prisma client
 * camelCase** form (lowercase first letter only — e.g. `Tenant` → `tenant`,
 * `WAForm` → `wAForm`, `AICredit` → `aICredit`, `GPSLocation` → `gPSLocation`)
 * by calling `prismaModelName()`.
 *
 * Why both modes work:
 *  - Prisma mode: `db.tenant`, `db.wAForm`, `db.aICredit` are the actual
 *    accessors the PrismaClient exposes.
 *  - Supabase REST mode: the proxy in `src/lib/supabase-db.ts` lowercases
 *    the first letter of whatever string is passed, looks it up in
 *    `TABLE_MAP`, and falls back to capitalizing the first letter — so
 *    `db.wAForm` resolves to table `WAForm` either way.
 *
 * If the table is missing in Supabase, the adapter logs a warning and
 * returns `0` for `count()` and `[]` for `findMany()`, so the backup
 * proceeds gracefully.
 */

// Convert a PascalCase model name to the Prisma client's camelCase accessor.
// Prisma's convention is to lowercase the FIRST letter only — acronyms like
// "AI", "GPS", "WA" keep their internal capitalization (e.g. `AICredit` →
// `aICredit`, NOT `aiCredit`).
export function prismaModelName(pascalCase: string): string {
  if (!pascalCase) return pascalCase;
  return pascalCase.charAt(0).toLowerCase() + pascalCase.slice(1);
}

// All 158 Prisma models from `prisma/schema.prisma` in declaration order.
export const BACKUP_MODEL_NAMES: readonly string[] = [
  // Core
  'Tenant', 'Subscription', 'SubscriptionPayment', 'BillingEvent', 'Plan',
  'User', 'Service', 'Lead', 'Invoice', 'RecurringInvoice',
  'Expense', 'Review', 'Notification', 'Quote', 'Form',
  'FormResponse', 'WorkflowAutomation', 'Workspace', 'Checklist', 'Workflow',
  'WorkflowVersion', 'Credential', 'Execution', 'ExecutionNodeData', 'WebhookRegistration',
  'AuditLog', 'ApiKey', 'Variable', 'Folder', 'Template',

  // People
  'Employee', 'EmployeeStatusLog', 'NotificationLog', 'Customer', 'Resource',

  // Jobs
  'Job', 'JobVisit', 'JobTimeEntry', 'JobPhoto', 'JobSignature',
  'JobChecklist', 'EmployeeShift', 'JobStateTransition', 'JobRequest', 'EmergencyDispatch',
  'Assessment', 'QualityInspection',

  // Customer timeline & assets
  'CustomerTimelineEntry', 'CustomerAsset', 'AssetServiceHistory', 'CustomerJourney',
  'CustomerPortalSession', 'TimelineEvent',

  // Webhooks
  'ContactList', 'ContactListEntry', 'WebhookSource', 'WebhookEndpoint',
  'WebhookEndpointLog', 'WebhookTestRequest', 'WhatsAppMessageAction', 'EventWebhook',
  'EventWebhookLog',

  // Conversations / Messaging
  'Conversation', 'ChannelConfig', 'OtpVerification', 'InboxMessage', 'ChatLabel',
  'ConversationLabel', 'ConversationAssignment', 'UnifiedMessage', 'ConversationExport',

  // Integrations & E-commerce
  'IntegrationConfig', 'IntegrationConnection', 'EcommerceOrder', 'EcommerceProduct',
  'EcommerceSyncLog', 'HubIntegrationConnection',

  // Marketing & CRM
  'Campaign', 'CampaignMessage', 'CampaignTemplate', 'Segment', 'SegmentMember',
  'RetargetingRule', 'RetargetingLog', 'Chatbot', 'ChatbotSession', 'WAForm',
  'WAFormResponse', 'WAWebview', 'AdCampaign', 'AdConversion', 'JourneyWorkflow',
  'JourneyExecution', 'Deal', 'DealStageHistory',

  // Marketplace & Templates
  'MarketplaceTemplate', 'MarketplaceTransaction', 'Payout', 'FeaturedListing',
  'ProviderPortfolio', 'ProviderCertification', 'Membership', 'Promotion', 'Coupon',
  'LoyaltyPoint', 'Referral',

  // Roles & Permissions
  'RolePermission', 'AgentMonitor', 'DataRetentionPolicy',

  // Contacts
  'CommunicationProvider', 'Contact', 'Tag', 'ContactTag', 'Group',
  'ContactGroup', 'ContactImport', 'ContactExport',

  // Email & Templates
  'EmailProvider', 'EmailTemplate', 'TriggerExecution', 'BrandKit', 'ImageLibrary',
  'TemplatePack', 'TemplateAsset',

  // Platform Admin
  'MenuItemConfig', 'FeatureFlag', 'SubscriptionPlan', 'PlatformMetric',
  'SecurityEvent', 'AuditLogEntry', 'AnalyticsSnapshot',

  // Support
  'Booking', 'KnowledgeArticle', 'Document', 'Invitation', 'PaymentMethod',
  'SupportCategory', 'SupportTicket', 'TicketMessage', 'TicketAttachment',

  // Notifications
  'Announcement', 'AppNotification', 'NotificationPreference', 'PushSubscription',
  'ActivityLog',

  // Lead capture
  'MetaLeadConfig', 'MetaLead', 'GoogleAdsLeadConfig', 'GoogleAdsLead',

  // Field ops / Geo
  'GPSLocation', 'RouteHistory', 'EmployeePerformance', 'OfflineMutation',

  // Public chat
  'PublicChatSession', 'PublicChatMessage',

  // AI
  'AiAgent', 'AiPhoneNumber', 'AiCall', 'AICredit', 'UsageCharge',
  'RevenueFeatureToggle',

  // Inventory & Branch ops
  'Branch', 'HolidayCalendar', 'ServiceRegion', 'TaxRule', 'NumberSequence',
  'CustomField', 'ApprovalFlow', 'CommissionRule', 'PaymentGatewayConfig',
  'PricingRule', 'RequestExtraction',

  // Inventory
  'InventoryItem', 'Warehouse', 'StockLocation', 'Supplier', 'PurchaseOrder',
  'StockTransfer', 'StockTransaction', 'LowStockAlert',

  // Service plans & warranties
  'ServicePlan', 'ServicePlanSubscription', 'Warranty', 'WarrantyClaim',
] as const;

export interface BackupModelInfo {
  pascal: string;   // e.g. "JobPhoto"
  camel: string;    // e.g. "jobPhoto"
  count: number;
  error?: string;
}

// Group labels for nicer UI rendering. Maps a model name to a logical group.
export const BACKUP_MODEL_GROUPS: Record<string, string> = {
  // Core
  Tenant: 'Core', Subscription: 'Core', SubscriptionPayment: 'Core', BillingEvent: 'Core',
  Plan: 'Core', User: 'Core', Workspace: 'Core',
  // People
  Employee: 'People', EmployeeStatusLog: 'People', Customer: 'People', Resource: 'People',
  EmployeeShift: 'People', EmployeePerformance: 'People',
  // Jobs
  Job: 'Jobs', JobVisit: 'Jobs', JobTimeEntry: 'Jobs', JobPhoto: 'Jobs',
  JobSignature: 'Jobs', JobChecklist: 'Jobs', JobStateTransition: 'Jobs',
  JobRequest: 'Jobs', EmergencyDispatch: 'Jobs', Assessment: 'Jobs',
  QualityInspection: 'Jobs', Invoice: 'Jobs', Quote: 'Jobs', RecurringInvoice: 'Jobs',
  Expense: 'Jobs', Booking: 'Jobs',
  // Customer
  CustomerTimelineEntry: 'Customer', CustomerAsset: 'Customer', AssetServiceHistory: 'Customer',
  CustomerJourney: 'Customer', CustomerPortalSession: 'Customer', TimelineEvent: 'Customer',
  // CRM
  Contact: 'CRM', Tag: 'CRM', ContactTag: 'CRM', Group: 'CRM', ContactGroup: 'CRM',
  ContactImport: 'CRM', ContactExport: 'CRM', ContactList: 'CRM', ContactListEntry: 'CRM',
  Lead: 'CRM', Deal: 'CRM', DealStageHistory: 'CRM',
  // Messaging
  Conversation: 'Messaging', ChannelConfig: 'Messaging', InboxMessage: 'Messaging',
  ChatLabel: 'Messaging', ConversationLabel: 'Messaging', ConversationAssignment: 'Messaging',
  UnifiedMessage: 'Messaging', ConversationExport: 'Messaging', Notification: 'Messaging',
  NotificationLog: 'Messaging', Announcement: 'Messaging', AppNotification: 'Messaging',
  NotificationPreference: 'Messaging', PushSubscription: 'Messaging',
  // Marketing
  Campaign: 'Marketing', CampaignMessage: 'Marketing', CampaignTemplate: 'Marketing',
  Segment: 'Marketing', SegmentMember: 'Marketing', RetargetingRule: 'Marketing',
  RetargetingLog: 'Marketing', Chatbot: 'Marketing', ChatbotSession: 'Marketing',
  WAForm: 'Marketing', WAFormResponse: 'Marketing', WAWebview: 'Marketing',
  AdCampaign: 'Marketing', AdConversion: 'Marketing', JourneyWorkflow: 'Marketing',
  JourneyExecution: 'Marketing',
  // Webhooks
  WebhookSource: 'Webhooks', WebhookEndpoint: 'Webhooks', WebhookEndpointLog: 'Webhooks',
  WebhookTestRequest: 'Webhooks', WhatsAppMessageAction: 'Webhooks',
  EventWebhook: 'Webhooks', EventWebhookLog: 'Webhooks', WebhookRegistration: 'Webhooks',
  // Integrations
  IntegrationConfig: 'Integrations', IntegrationConnection: 'Integrations',
  HubIntegrationConnection: 'Integrations', EcommerceOrder: 'Integrations',
  EcommerceProduct: 'Integrations', EcommerceSyncLog: 'Integrations',
  MetaLeadConfig: 'Integrations', MetaLead: 'Integrations',
  GoogleAdsLeadConfig: 'Integrations', GoogleAdsLead: 'Integrations',
  // AI
  AiAgent: 'AI', AIPhoneNumber: 'AI', AiCall: 'AI', AICredit: 'AI',
  // Marketplace
  MarketplaceTemplate: 'Marketplace', MarketplaceTransaction: 'Marketplace',
  Payout: 'Marketplace', FeaturedListing: 'Marketplace',
  ProviderPortfolio: 'Marketplace', ProviderCertification: 'Marketplace',
  Membership: 'Marketplace', Promotion: 'Marketplace', Coupon: 'Marketplace',
  LoyaltyPoint: 'Marketplace', Referral: 'Marketplace',
  // Inventory
  InventoryItem: 'Inventory', Warehouse: 'Inventory', StockLocation: 'Inventory',
  Supplier: 'Inventory', PurchaseOrder: 'Inventory', StockTransfer: 'Inventory',
  StockTransaction: 'Inventory', LowStockAlert: 'Inventory',
  // Service Plans
  ServicePlan: 'Service Plans', ServicePlanSubscription: 'Service Plans',
  Warranty: 'Service Plans', WarrantyClaim: 'Service Plans',
  // Branch ops
  Branch: 'Branch Ops', HolidayCalendar: 'Branch Ops', ServiceRegion: 'Branch Ops',
  TaxRule: 'Branch Ops', NumberSequence: 'Branch Ops', CustomField: 'Branch Ops',
  ApprovalFlow: 'Branch Ops', CommissionRule: 'Branch Ops', PaymentGatewayConfig: 'Branch Ops',
  PricingRule: 'Branch Ops', RequestExtraction: 'Branch Ops',
  // Field Ops
  GPSLocation: 'Field Ops', RouteHistory: 'Field Ops', OfflineMutation: 'Field Ops',
  // Public Chat
  PublicChatSession: 'Public Chat', PublicChatMessage: 'Public Chat',
  // Templates & Assets
  Form: 'Templates', FormResponse: 'Templates', Workflow: 'Templates',
  WorkflowVersion: 'Templates', WorkflowAutomation: 'Templates', Checklist: 'Templates',
  Credential: 'Templates', Execution: 'Templates', ExecutionNodeData: 'Templates',
  Variable: 'Templates', Folder: 'Templates', Template: 'Templates',
  EmailProvider: 'Templates', EmailTemplate: 'Templates', TriggerExecution: 'Templates',
  BrandKit: 'Templates', ImageLibrary: 'Templates', TemplatePack: 'Templates',
  TemplateAsset: 'Templates', Document: 'Templates', KnowledgeArticle: 'Templates',
  // Billing
  PaymentMethod: 'Billing', SubscriptionPlan: 'Billing', UsageCharge: 'Billing',
  RevenueFeatureToggle: 'Billing',
  // Security & Audit
  AuditLog: 'Security', AuditLogEntry: 'Security', ApiKey: 'Security',
  SecurityEvent: 'Security', RolePermission: 'Security', AgentMonitor: 'Security',
  DataRetentionPolicy: 'Security', OtpVerification: 'Security',
  // Support
  SupportCategory: 'Support', SupportTicket: 'Support', TicketMessage: 'Support',
  TicketAttachment: 'Support',
  // Platform
  MenuItemConfig: 'Platform', FeatureFlag: 'Platform', PlatformMetric: 'Platform',
  AnalyticsSnapshot: 'Platform', ActivityLog: 'Platform',
  // Communication
  CommunicationProvider: 'Communication', EmailProvider: 'Communication',
  // Other
  Service: 'Core', Review: 'Core', Invitation: 'Core',
};
