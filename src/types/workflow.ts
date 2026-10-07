// Node port types
export interface NodePort {
  id: string;
  name: string;
  type: 'input' | 'output';
  displayName?: string;
}

// Node categories
export type NodeCategory = 'trigger' | 'condition' | 'action' | 'flowControl' | 'logic' | 'code' | 'data' | 'communication' | 'cloud' | 'template' | 'ai' | 'ecommerce' | 'utility';

// Node status for execution
export type NodeStatus = 'idle' | 'running' | 'success' | 'error' | 'waiting';

// Node definition (what appears in the sidebar)
export interface NodeTypeDefinition {
  type: string;
  displayName: string;
  category: NodeCategory;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind color class
  inputs: NodePort[];
  outputs: NodePort[];
  credentialTypes?: string[];
  properties: NodeProperty[];
  event?: string; // event source for trigger nodes (e.g. 'lead.created')
}

export interface NodeProperty {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'select' | 'json' | 'code' | 'collection' | 'credentials' | 'expression' | 'color' | 'text';
  default?: any;
  required?: boolean;
  options?: { name: string; value: string }[];
  placeholder?: string;
  description?: string;
}

// Workflow node (instance on canvas)
export interface WorkflowNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  data: {
    nodeType: string;
    config: Record<string, any>;
    notes?: string;
    disabled?: boolean;
    retryCount?: number;
    retryDelay?: number;
    timeout?: number;
    pinnedData?: any[];
    alwaysOutputData?: boolean;
    status?: NodeStatus;
  };
}

// Workflow edge (connection)
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  type?: 'bezier' | 'straight' | 'step' | 'smoothstep';
  animated?: boolean;
  label?: string;
}

// Workflow
export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  settings: WorkflowSettings;
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowSettings {
  timezone?: string;
  errorWorkflowId?: string;
  retryOnFail?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  maxExecutionTime?: number;
  saveDataSuccess?: boolean;
  saveDataError?: boolean;
  saveManualExecutions?: boolean;
  concurrencyLimit?: number;
  staticData?: Record<string, any>;
}

// Execution types
export type ExecutionStatus = 'waiting' | 'running' | 'success' | 'error' | 'cancelled';
export type ExecutionMode = 'manual' | 'trigger' | 'retry' | 'subworkflow';

export interface Execution {
  id: string;
  workflowId: string;
  workflowName?: string;
  status: ExecutionStatus;
  mode: ExecutionMode;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  data?: ExecutionData;
  error?: ExecutionError;
}

export interface ExecutionData {
  resultData?: {
    runData?: Record<string, NodeExecutionData[]>;
  };
}

export interface NodeExecutionData {
  startTime: number;
  executionTime?: number;
  executionStatus: 'success' | 'error';
  data: { json: any; binary?: any }[];
  error?: ExecutionError;
}

export interface ExecutionError {
  message: string;
  stack?: string;
  nodeName?: string;
  nodeId?: string;
}

// Credential types
export type CredentialType = 'apiKey' | 'httpBasic' | 'httpBearer' | 'oAuth2' | 'dbConnection' | 'sshKey' | 'awsIam' | 'googleServiceAccount' | 'whatsapp';

export interface Credential {
  id: string;
  name: string;
  type: CredentialType;
  data: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

// Template
export interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  icon?: string;
  featured: boolean;
  usageCount: number;
  rating: number;
  workflowJson: Workflow;
}

// View types — organized by module
export const VIEW_TYPES = [
  'dashboard',
  'crm',
  'leads',
  'contacts',
  'customers',
  'customer360',
  'salesPipeline',
  'broadcast',
  'campaigns',
  'marketingTemplates',
  'omnichannel',
  'whatsapp',
  'liveChat',
  'smsNumbers',
  'workflows',
  'canvas',
  'triggers',
  'variables',
  'executions',
  'formBuilder',
  'workflowAutomations',
  'formsDashboard',
  'formSubmissions',
  'formAppointments',
  'formsAnalytics',
  'agentStudio',
  'scheduling',
  'meetingTypes',
  'appointmentTypes',
  'creatorProfile',
  'creatorOffers',
  'operations',
  'booking',
  'calendar',
  'jobs',
  'dispatch',
  'realtimeStatus',
  'employees',
  'employeePerformance',
  'timesheet',
  'recurringJobs',
  'inventory',
  'purchaseOrders',
  'commerce',
  'quotes',
  'quoteFlow',
  'invoices',
  'billing',
  'expenses',
  'credentials',
  'settings',
  'auditLogs',
  'activityLogs',
  'reports',
  'notifications',
  'brandBrain',
  'customerPortal',
  'employeePortal',
  'integrations',
  'aiAssistant',
  'chatbotBuilder',
  'retargeting',
  'segments',
  'marketingAnalytics',
  'serviceCatalog',
  'knowledgeBase',
  'communicationProviders',
  'leadDiscovery',
  'reviews',
  'journeyAutomation',
  'marketplace',
  'marketplaceDashboard',
  'claimBusiness',
  'enterprise',
  'aiCampaignGenerator',
  'webviewEngine',
  'adsIntegration',
  'versionHistory',
  'documentCenter',
  'saasDashboard',
  'templateStudio',
  'aiReceptionist',
  'aiAgents',
  'aiPhoneNumbers',
  'aiCallHistory',
  'groups',
  'tags',
  'contactImports',
  'contactExports',
  'audienceAnalytics',
  'emailCampaigns',
  'emailProviders',
  'emailTemplates',
  'channels',
  'helpCenter',
  'helpTicketDetail',
  'helpAdminTickets',
  'helpAdminTicketDetail',
  'helpAdminKB',
  'helpAdminCategories',
  'helpAdminAnnouncements',
  'socialMedia',
  'socialAccounts',
  'postComposer',
  'postsList',
  'socialAnalytics',
  'superadmin',
] as const;
export type ViewType = typeof VIEW_TYPES[number];
export function isViewType(value: string): value is ViewType {
  return (VIEW_TYPES as readonly string[]).includes(value);
}
