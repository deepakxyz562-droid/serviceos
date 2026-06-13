import type { NodeTypeDefinition } from '@/types/workflow';

// ═══════════════════════════════════════════════════════════════════════════════
// NODE CATEGORIES — Sidebar configuration
// ═══════════════════════════════════════════════════════════════════════════════

export const NODE_CATEGORIES = [
  { id: 'template', label: 'Templates', icon: 'Sparkles', color: 'yellow' },
  { id: 'trigger', label: 'Triggers', icon: 'PlayCircle', color: 'blue' },
  { id: 'condition', label: 'Conditions', icon: 'GitBranch', color: 'orange' },
  { id: 'action', label: 'Actions', icon: 'Zap', color: 'green' },
  { id: 'flowControl', label: 'Flow Control', icon: 'Workflow', color: 'purple' },
  { id: 'ai', label: 'AI', icon: 'Bot', color: 'pink' },
  { id: 'utility', label: 'Utilities', icon: 'Settings', color: 'gray' },
] as const;

// Backward-compatible alias for node-sidebar
export const nodeCategories = NODE_CATEGORIES;

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY COLOR MAP — Consistent color mapping for each category
// ═══════════════════════════════════════════════════════════════════════════════

const CATEGORY_COLORS: Record<string, string> = {
  template: 'bg-yellow-500',
  trigger: 'bg-blue-500',
  condition: 'bg-orange-500',
  action: 'bg-emerald-500',
  flowControl: 'bg-purple-500',
  ai: 'bg-pink-500',
  utility: 'bg-gray-500',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TRIGGER NODES — Enterprise events (HubSpot / Salesforce / GoHighLevel pattern)
// ═══════════════════════════════════════════════════════════════════════════════

export const triggerNodes: NodeTypeDefinition[] = [
  // ─── CRM ────────────────────────────────────────────────────────────────────
  {
    type: 'leadCreated',
    displayName: 'Lead Created',
    category: 'trigger',
    description: 'When a new lead is created in the CRM',
    icon: 'UserPlus',
    color: 'bg-blue-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'lead.created',
    properties: [],
  },
  {
    type: 'leadUpdated',
    displayName: 'Lead Updated',
    category: 'trigger',
    description: 'When a lead record is updated',
    icon: 'Edit3',
    color: 'bg-blue-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'lead.updated',
    properties: [],
  },
  {
    type: 'leadAssigned',
    displayName: 'Lead Assigned',
    category: 'trigger',
    description: 'When a lead is assigned to a sales rep',
    icon: 'UserCheck',
    color: 'bg-blue-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'lead.assigned',
    properties: [],
  },
  {
    type: 'leadConverted',
    displayName: 'Lead Converted',
    category: 'trigger',
    description: 'When a lead is converted to a customer',
    icon: 'CheckCircle',
    color: 'bg-blue-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'lead.converted',
    properties: [],
  },

  // ─── Customer ───────────────────────────────────────────────────────────────
  {
    type: 'customerCreated',
    displayName: 'Customer Created',
    category: 'trigger',
    description: 'When a new customer is added to the system',
    icon: 'Users',
    color: 'bg-emerald-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'customer.created',
    properties: [],
  },
  {
    type: 'customerUpdated',
    displayName: 'Customer Updated',
    category: 'trigger',
    description: 'When customer details are updated',
    icon: 'UserCog',
    color: 'bg-emerald-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'customer.updated',
    properties: [],
  },

  // ─── Booking ────────────────────────────────────────────────────────────────
  {
    type: 'bookingCreated',
    displayName: 'Booking Created',
    category: 'trigger',
    description: 'When a new booking is created',
    icon: 'CalendarPlus',
    color: 'bg-purple-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'booking.created',
    properties: [],
  },
  {
    type: 'bookingConfirmed',
    displayName: 'Booking Confirmed',
    category: 'trigger',
    description: 'When a booking is confirmed',
    icon: 'CalendarCheck',
    color: 'bg-purple-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'booking.confirmed',
    properties: [],
  },
  {
    type: 'bookingCancelled',
    displayName: 'Booking Cancelled',
    category: 'trigger',
    description: 'When a booking is cancelled',
    icon: 'CalendarX',
    color: 'bg-purple-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'booking.cancelled',
    properties: [],
  },
  {
    type: 'bookingCompleted',
    displayName: 'Booking Completed',
    category: 'trigger',
    description: 'When a booking is completed',
    icon: 'CircleCheck',
    color: 'bg-purple-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'booking.completed',
    properties: [],
  },

  // ─── Jobs ───────────────────────────────────────────────────────────────────
  {
    type: 'jobCreated',
    displayName: 'Job Created',
    category: 'trigger',
    description: 'When a new job is created',
    icon: 'Briefcase',
    color: 'bg-amber-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'job.created',
    properties: [],
  },
  {
    type: 'jobAssigned',
    displayName: 'Job Assigned',
    category: 'trigger',
    description: 'When a job is assigned to an employee',
    icon: 'UserCheck',
    color: 'bg-amber-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'job.assigned',
    properties: [],
  },
  {
    type: 'jobCompleted',
    displayName: 'Job Completed',
    category: 'trigger',
    description: 'When a job is marked as completed',
    icon: 'CircleCheck',
    color: 'bg-amber-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'job.completed',
    properties: [],
  },

  // ─── Invoice ────────────────────────────────────────────────────────────────
  {
    type: 'invoiceCreated',
    displayName: 'Invoice Created',
    category: 'trigger',
    description: 'When a new invoice is created',
    icon: 'Receipt',
    color: 'bg-rose-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'invoice.created',
    properties: [],
  },
  {
    type: 'invoicePaid',
    displayName: 'Invoice Paid',
    category: 'trigger',
    description: 'When an invoice is paid by the customer',
    icon: 'Banknote',
    color: 'bg-rose-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'invoice.paid',
    properties: [],
  },
  {
    type: 'invoiceOverdue',
    displayName: 'Invoice Overdue',
    category: 'trigger',
    description: 'When an invoice becomes overdue',
    icon: 'CreditCard',
    color: 'bg-rose-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'invoice.overdue',
    properties: [],
  },

  // ─── WhatsApp ───────────────────────────────────────────────────────────────
  {
    type: 'whatsappMessageReceived',
    displayName: 'WhatsApp Message Received',
    category: 'trigger',
    description: 'When a new WhatsApp message is received',
    icon: 'MessageCircle',
    color: 'bg-green-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'whatsapp.message.received',
    properties: [],
  },

  // ─── Forms ──────────────────────────────────────────────────────────────────
  {
    type: 'formSubmitted',
    displayName: 'Form Submitted',
    category: 'trigger',
    description: 'When a form is submitted on your website',
    icon: 'MousePointerClick',
    color: 'bg-orange-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    event: 'form.submitted',
    properties: [],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// CONDITION NODES — Domain-specific business conditions
// ═══════════════════════════════════════════════════════════════════════════════

export const conditionNodes: NodeTypeDefinition[] = [
  {
    type: 'leadSourceCondition',
    displayName: 'Lead Source',
    category: 'condition',
    description: 'Branch based on where the lead came from',
    icon: 'GitBranch',
    color: 'bg-orange-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', displayName: 'Match' },
      { id: 'false', name: 'false', type: 'output', displayName: 'No Match' },
    ],
    properties: [
      { name: 'source', displayName: 'Lead Source', type: 'select', default: 'website', options: [
        { name: 'Website', value: 'website' },
        { name: 'Facebook', value: 'facebook' },
        { name: 'Google Ads', value: 'google_ads' },
        { name: 'WhatsApp', value: 'whatsapp' },
        { name: 'Referral', value: 'referral' },
        { name: 'Manual', value: 'manual' },
      ]},
    ],
  },
  {
    type: 'customerTypeCondition',
    displayName: 'Customer Type',
    category: 'condition',
    description: 'Branch based on customer type',
    icon: 'GitBranch',
    color: 'bg-orange-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', displayName: 'Match' },
      { id: 'false', name: 'false', type: 'output', displayName: 'No Match' },
    ],
    properties: [
      { name: 'customerType', displayName: 'Customer Type', type: 'select', default: 'residential', options: [
        { name: 'Residential', value: 'residential' },
        { name: 'Commercial', value: 'commercial' },
        { name: 'Enterprise', value: 'enterprise' },
        { name: 'VIP', value: 'vip' },
      ]},
    ],
  },
  {
    type: 'bookingValueCondition',
    displayName: 'Booking Value',
    category: 'condition',
    description: 'Branch based on the booking value amount',
    icon: 'GitBranch',
    color: 'bg-orange-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', displayName: 'Above' },
      { id: 'false', name: 'false', type: 'output', displayName: 'Below' },
    ],
    properties: [
      { name: 'operator', displayName: 'Condition', type: 'select', default: 'greater_than', options: [
        { name: 'Greater Than', value: 'greater_than' },
        { name: 'Less Than', value: 'less_than' },
        { name: 'Equals', value: 'equals' },
        { name: 'Between', value: 'between' },
      ]},
      { name: 'value', displayName: 'Amount', type: 'number', default: 500, required: true },
    ],
  },
  {
    type: 'invoiceAmountCondition',
    displayName: 'Invoice Amount',
    category: 'condition',
    description: 'Branch based on the invoice amount',
    icon: 'GitBranch',
    color: 'bg-orange-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', displayName: 'Above' },
      { id: 'false', name: 'false', type: 'output', displayName: 'Below' },
    ],
    properties: [
      { name: 'operator', displayName: 'Condition', type: 'select', default: 'greater_than', options: [
        { name: 'Greater Than', value: 'greater_than' },
        { name: 'Less Than', value: 'less_than' },
        { name: 'Equals', value: 'equals' },
      ]},
      { name: 'value', displayName: 'Amount', type: 'number', default: 1000, required: true },
    ],
  },
  {
    type: 'customerTagCondition',
    displayName: 'Customer Has Tag',
    category: 'condition',
    description: 'Branch based on whether the customer has a specific tag',
    icon: 'GitBranch',
    color: 'bg-orange-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', displayName: 'Has Tag' },
      { id: 'false', name: 'false', type: 'output', displayName: 'No Tag' },
    ],
    properties: [
      { name: 'tag', displayName: 'Tag Name', type: 'string', required: true, placeholder: 'e.g. vip, repeat-customer' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION NODES — Business actions
// ═══════════════════════════════════════════════════════════════════════════════

export const actionNodes: NodeTypeDefinition[] = [
  {
    type: 'assignOwner',
    displayName: 'Assign Owner',
    category: 'action',
    description: 'Assign the record to a team member',
    icon: 'UserPlus',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'assignTo', displayName: 'Assign To', type: 'select', default: 'round_robin', options: [
        { name: 'Round Robin', value: 'round_robin' },
        { name: 'Least Busy', value: 'least_busy' },
        { name: 'Specific User', value: 'specific' },
      ]},
      { name: 'userId', displayName: 'User ID', type: 'string', placeholder: 'Required if "Specific User" selected' },
    ],
  },
  {
    type: 'sendWhatsApp',
    displayName: 'Send WhatsApp',
    category: 'action',
    description: 'Send a WhatsApp message to the customer or team',
    icon: 'MessageCircle',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'recipient', displayName: 'Recipient', type: 'select', default: 'customer', options: [
        { name: 'Customer', value: 'customer' },
        { name: 'Employee', value: 'employee' },
        { name: 'Manager', value: 'manager' },
      ]},
      { name: 'template', displayName: 'Message Template', type: 'text', required: true, placeholder: 'Hi {{name}}, ...' },
    ],
  },
  {
    type: 'sendEmail',
    displayName: 'Send Email',
    category: 'action',
    description: 'Send an email to the customer or team',
    icon: 'Mail',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'recipient', displayName: 'Recipient', type: 'select', default: 'customer', options: [
        { name: 'Customer', value: 'customer' },
        { name: 'Employee', value: 'employee' },
        { name: 'Manager', value: 'manager' },
      ]},
      { name: 'subject', displayName: 'Subject', type: 'string', required: true, placeholder: 'Email subject' },
      { name: 'body', displayName: 'Body', type: 'text', required: true, placeholder: 'Email content...' },
    ],
  },
  {
    type: 'sendSMS',
    displayName: 'Send SMS',
    category: 'action',
    description: 'Send an SMS message',
    icon: 'Smartphone',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'recipient', displayName: 'Recipient', type: 'select', default: 'customer', options: [
        { name: 'Customer', value: 'customer' },
        { name: 'Employee', value: 'employee' },
      ]},
      { name: 'message', displayName: 'Message', type: 'text', required: true, placeholder: 'SMS content...' },
    ],
  },
  {
    type: 'createTask',
    displayName: 'Create Task',
    category: 'action',
    description: 'Create a follow-up task for the team',
    icon: 'PlusCircle',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'title', displayName: 'Task Title', type: 'string', required: true, placeholder: 'Follow up with customer' },
      { name: 'assignTo', displayName: 'Assign To', type: 'select', default: 'round_robin', options: [
        { name: 'Round Robin', value: 'round_robin' },
        { name: 'Record Owner', value: 'owner' },
      ]},
      { name: 'dueIn', displayName: 'Due In (hours)', type: 'number', default: 24 },
    ],
  },
  {
    type: 'createBooking',
    displayName: 'Create Booking',
    category: 'action',
    description: 'Create a new booking from the workflow',
    icon: 'CalendarPlus',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'serviceId', displayName: 'Service', type: 'string', required: true, placeholder: 'Service ID' },
      { name: 'date', displayName: 'Date', type: 'string', required: true, placeholder: 'YYYY-MM-DD' },
    ],
  },
  {
    type: 'createJob',
    displayName: 'Create Job',
    category: 'action',
    description: 'Create a new job from the workflow',
    icon: 'Briefcase',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'title', displayName: 'Job Title', type: 'string', required: true, placeholder: 'Job title' },
      { name: 'assignTo', displayName: 'Assign To', type: 'select', default: 'auto', options: [
        { name: 'Auto Dispatch', value: 'auto' },
        { name: 'Round Robin', value: 'round_robin' },
        { name: 'Specific Employee', value: 'specific' },
      ]},
    ],
  },
  {
    type: 'assignEmployee',
    displayName: 'Assign Employee',
    category: 'action',
    description: 'Assign an employee to a job or task',
    icon: 'UserCheck',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'assignTo', displayName: 'Assign To', type: 'select', default: 'nearest', options: [
        { name: 'Nearest Available', value: 'nearest' },
        { name: 'Round Robin', value: 'round_robin' },
        { name: 'Specific Employee', value: 'specific' },
      ]},
      { name: 'employeeId', displayName: 'Employee ID', type: 'string', placeholder: 'Required if "Specific" selected' },
    ],
  },
  {
    type: 'createInvoice',
    displayName: 'Create Invoice',
    category: 'action',
    description: 'Create a new invoice from the workflow',
    icon: 'Receipt',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'amount', displayName: 'Amount', type: 'number', required: true },
      { name: 'description', displayName: 'Description', type: 'string', placeholder: 'Service description' },
      { name: 'dueIn', displayName: 'Due In (days)', type: 'number', default: 30 },
    ],
  },
  {
    type: 'createQuote',
    displayName: 'Create Quote',
    category: 'action',
    description: 'Create a new quote from the workflow',
    icon: 'FileText',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'amount', displayName: 'Amount', type: 'number', required: true },
      { name: 'description', displayName: 'Description', type: 'string', placeholder: 'Quote description' },
    ],
  },
  {
    type: 'addTag',
    displayName: 'Add Tag',
    category: 'action',
    description: 'Add a tag to the customer or record',
    icon: 'Tag',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'tag', displayName: 'Tag', type: 'string', required: true, placeholder: 'e.g. vip, follow-up, retention' },
    ],
  },
  {
    type: 'removeTag',
    displayName: 'Remove Tag',
    category: 'action',
    description: 'Remove a tag from the customer or record',
    icon: 'X',
    color: 'bg-emerald-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'tag', displayName: 'Tag', type: 'string', required: true, placeholder: 'Tag to remove' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FLOW CONTROL NODES
// ═══════════════════════════════════════════════════════════════════════════════

export const flowControlNodes: NodeTypeDefinition[] = [
  {
    type: 'delay',
    displayName: 'Delay',
    category: 'flowControl',
    description: 'Wait for a specified duration before continuing',
    icon: 'Clock',
    color: 'bg-purple-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'delayMinutes', displayName: 'Delay (minutes)', type: 'number', default: 5, required: true },
    ],
  },
  {
    type: 'waitUntil',
    displayName: 'Wait Until',
    category: 'flowControl',
    description: 'Wait until a specific date/time before continuing',
    icon: 'Calendar',
    color: 'bg-purple-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'waitUntil', displayName: 'Wait Until', type: 'string', required: true, placeholder: 'YYYY-MM-DD HH:mm or expression' },
    ],
  },
  {
    type: 'ifElse',
    displayName: 'If / Else',
    category: 'flowControl',
    description: 'Branch workflow based on a condition',
    icon: 'GitBranch',
    color: 'bg-purple-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'true', name: 'true', type: 'output', displayName: 'True' },
      { id: 'false', name: 'false', type: 'output', displayName: 'False' },
    ],
    properties: [
      { name: 'condition', displayName: 'Condition', type: 'select', default: 'equals', options: [
        { name: 'Equals', value: 'equals' },
        { name: 'Not Equals', value: 'notEquals' },
        { name: 'Greater Than', value: 'greaterThan' },
        { name: 'Less Than', value: 'lessThan' },
        { name: 'Contains', value: 'contains' },
        { name: 'Is Empty', value: 'isEmpty' },
      ]},
      { name: 'value1', displayName: 'Value 1', type: 'expression', required: true },
      { name: 'value2', displayName: 'Value 2', type: 'expression' },
    ],
  },
  {
    type: 'switch',
    displayName: 'Switch',
    category: 'flowControl',
    description: 'Route to different outputs based on value matching',
    icon: 'Route',
    color: 'bg-purple-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'output0', name: 'Output 0', type: 'output' },
      { id: 'output1', name: 'Output 1', type: 'output' },
      { id: 'fallback', name: 'Fallback', type: 'output', displayName: 'Fallback' },
    ],
    properties: [
      { name: 'valueToMatch', displayName: 'Value to Match', type: 'expression', required: true },
      { name: 'rules', displayName: 'Rules', type: 'collection', description: 'Define routing rules' },
    ],
  },
  {
    type: 'loop',
    displayName: 'Loop',
    category: 'flowControl',
    description: 'Loop through items and process each one',
    icon: 'Repeat',
    color: 'bg-purple-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [
      { id: 'each', name: 'each', type: 'output', displayName: 'Each Item' },
      { id: 'done', name: 'done', type: 'output', displayName: 'Done' },
    ],
    properties: [
      { name: 'batchSize', displayName: 'Batch Size', type: 'number', default: 1 },
    ],
  },
  {
    type: 'endWorkflow',
    displayName: 'End Workflow',
    category: 'flowControl',
    description: 'Stop the workflow execution',
    icon: 'Square',
    color: 'bg-purple-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [],
    properties: [],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// AI NODES
// ═══════════════════════════════════════════════════════════════════════════════

export const aiNodes: NodeTypeDefinition[] = [
  {
    type: 'aiClassify',
    displayName: 'AI Classify',
    category: 'ai',
    description: 'Classify text using AI (e.g. lead intent, sentiment)',
    icon: 'Brain',
    color: 'bg-pink-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'input', displayName: 'Input Text', type: 'expression', required: true },
      { name: 'categories', displayName: 'Categories', type: 'string', required: true, placeholder: 'urgent, normal, low' },
    ],
  },
  {
    type: 'aiReply',
    displayName: 'AI Reply',
    category: 'ai',
    description: 'Generate an AI-powered reply to a message',
    icon: 'Bot',
    color: 'bg-pink-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'context', displayName: 'Context', type: 'text', placeholder: 'Provide context for the reply...' },
      { name: 'tone', displayName: 'Tone', type: 'select', default: 'professional', options: [
        { name: 'Professional', value: 'professional' },
        { name: 'Friendly', value: 'friendly' },
        { name: 'Casual', value: 'casual' },
      ]},
    ],
  },
  {
    type: 'aiSummarize',
    displayName: 'AI Summarize',
    category: 'ai',
    description: 'Summarize long text or conversation history',
    icon: 'FileText',
    color: 'bg-pink-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'input', displayName: 'Text to Summarize', type: 'expression', required: true },
      { name: 'maxLength', displayName: 'Max Length (words)', type: 'number', default: 100 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY NODES
// ═══════════════════════════════════════════════════════════════════════════════

export const utilityNodes: NodeTypeDefinition[] = [
  {
    type: 'webhookTrigger',
    displayName: 'Webhook',
    category: 'utility',
    description: 'Receive HTTP requests to trigger workflow',
    icon: 'Globe',
    color: 'bg-gray-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'httpMethod', displayName: 'HTTP Method', type: 'select', default: 'POST', options: [
        { name: 'GET', value: 'GET' }, { name: 'POST', value: 'POST' }, { name: 'PUT', value: 'PUT' },
        { name: 'PATCH', value: 'PATCH' }, { name: 'DELETE', value: 'DELETE' },
      ]},
      { name: 'path', displayName: 'Path', type: 'string', placeholder: 'Auto-generated UUID' },
    ],
  },
  {
    type: 'httpRequest',
    displayName: 'HTTP Request',
    category: 'utility',
    description: 'Make an HTTP request to an external API',
    icon: 'Webhook',
    color: 'bg-gray-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'method', displayName: 'Method', type: 'select', default: 'GET', options: [
        { name: 'GET', value: 'GET' }, { name: 'POST', value: 'POST' }, { name: 'PUT', value: 'PUT' },
        { name: 'PATCH', value: 'PATCH' }, { name: 'DELETE', value: 'DELETE' },
      ]},
      { name: 'url', displayName: 'URL', type: 'string', required: true, placeholder: 'https://api.example.com/data' },
      { name: 'headers', displayName: 'Headers', type: 'json', default: {} },
      { name: 'body', displayName: 'Body', type: 'json', default: {} },
    ],
  },
  {
    type: 'scheduleTrigger',
    displayName: 'Schedule Trigger',
    category: 'utility',
    description: 'Run workflow on a schedule using cron expressions',
    icon: 'Clock',
    color: 'bg-gray-500',
    inputs: [],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'mode', displayName: 'Mode', type: 'select', default: 'interval', options: [
        { name: 'Every X minutes', value: 'interval' },
        { name: 'Cron Expression', value: 'cron' },
      ]},
      { name: 'interval', displayName: 'Interval (minutes)', type: 'number', default: 5 },
      { name: 'cronExpression', displayName: 'Cron Expression', type: 'string', placeholder: '0 * * * *' },
    ],
  },
  {
    type: 'databaseNode',
    displayName: 'Database Query',
    category: 'utility',
    description: 'Query or update a database',
    icon: 'Database',
    color: 'bg-gray-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    credentialTypes: ['dbConnection'],
    properties: [
      { name: 'operation', displayName: 'Operation', type: 'select', default: 'select', options: [
        { name: 'Select', value: 'select' }, { name: 'Insert', value: 'insert' },
        { name: 'Update', value: 'update' }, { name: 'Delete', value: 'delete' },
      ]},
      { name: 'table', displayName: 'Table', type: 'string', required: true },
      { name: 'query', displayName: 'Query / Conditions', type: 'json', default: {} },
    ],
  },
  {
    type: 'codeNode',
    displayName: 'Code',
    category: 'utility',
    description: 'Run custom JavaScript or Python code',
    icon: 'Code',
    color: 'bg-gray-500',
    inputs: [{ id: 'main', name: 'main', type: 'input' }],
    outputs: [{ id: 'main', name: 'main', type: 'output' }],
    properties: [
      { name: 'language', displayName: 'Language', type: 'select', default: 'javascript', options: [
        { name: 'JavaScript', value: 'javascript' },
        { name: 'Python', value: 'python' },
      ]},
      { name: 'code', displayName: 'Code', type: 'code', required: true },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
// WORKFLOW TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export const workflowTemplates = [
  { id: 'autoAssignLead', name: 'Auto Assign New Lead' },
  { id: 'welcomeCustomer', name: 'Welcome New Customer' },
  { id: 'bookingConfirmation', name: 'Booking Confirmation' },
  { id: 'jobCompletionReview', name: 'Job Completion Review Request' },
  { id: 'invoiceReminder', name: 'Invoice Reminder' },
  { id: 'autoDispatch', name: 'Auto Dispatch' },
  { id: 'customerRetention', name: 'Customer Retention Campaign' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// FLAT REGISTRY — All nodes combined (backward compatibility)
// ═══════════════════════════════════════════════════════════════════════════════

export const nodeRegistry: NodeTypeDefinition[] = [
  ...triggerNodes,
  ...conditionNodes,
  ...actionNodes,
  ...flowControlNodes,
  ...aiNodes,
  ...utilityNodes,
];

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Look up a node type definition by its type string */
export function getNodeTypeDefinition(type: string): NodeTypeDefinition | undefined {
  return nodeRegistry.find((n) => n.type === type);
}

/** Get all nodes belonging to a category */
export function getNodesByCategory(categoryId: string): NodeTypeDefinition[] {
  return nodeRegistry.filter((n) => n.category === categoryId);
}

/** Search nodes by display name or description */
export function searchNodes(query: string): NodeTypeDefinition[] {
  const q = query.toLowerCase();
  return nodeRegistry.filter(
    (n) =>
      n.displayName.toLowerCase().includes(q) ||
      n.description.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q),
  );
}

/** Get the color for a given category */
export function getCategoryColor(categoryId: string): string {
  return CATEGORY_COLORS[categoryId] || 'bg-gray-500';
}
