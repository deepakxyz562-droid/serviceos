'use client';

import { useState, useMemo } from 'react';
import {
  Zap, Plus, Search, MoreHorizontal, Play, Pause, Trash2,
  Edit3, ArrowRight, Clock, Activity, Filter,
  MessageCircle, Mail, UserPlus, ListChecks, RefreshCw,
  Bell, Globe, ChevronDown, ChevronRight, X,
  PlusCircle, MinusCircle, Settings2, GitBranch,
  AlertCircle, Target, Briefcase, Send, CalendarClock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { TRIGGER_CATEGORIES, TRIGGER_EVENTS, ACTION_TYPES } from '@/lib/trigger-catalog';

// ============================================================
// Types
// ============================================================

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface Action {
  id: string;
  type: string;
  config: Record<string, string>;
}

interface WorkflowAutomation {
  id: string;
  name: string;
  description?: string;
  triggerType: string;
  triggerCategory: string;
  conditions: Condition[];
  conditionLogic: 'and' | 'or';
  actions: Action[];
  active: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  lastExecutionStatus?: 'success' | 'failed';
  createdAt: string;
}

// ============================================================
// Constants
// ============================================================

// Derive local trigger categories from shared trigger-catalog for the accordion UI
const TRIGGER_CATEGORIES_LOCAL = [
  ...TRIGGER_CATEGORIES
    .filter((cat) => cat.id !== 'all')
    .map((cat) => {
      // Convert shared color (e.g. 'text-blue-500') to local format (e.g. 'text-blue-600 bg-blue-50')
      const colorName = cat.color.replace('text-', '').replace('-500', '');
      const localColor = `text-${colorName}-600 bg-${colorName}-50`;
      return {
        name: cat.label, // e.g. 'CRM Events'
        icon: cat.icon,
        color: localColor,
        triggers: TRIGGER_EVENTS
          .filter((e) => e.category === cat.label)
          .map((e) => ({ value: e.value, label: e.label })),
      };
    }),
  // "Schedule & Contract Events" is referenced by TRIGGER_EVENTS (contract.renewed, schedule.trigger)
  // but has no entry in TRIGGER_CATEGORIES yet — include it locally so the triggers are visible.
  {
    name: 'Schedule & Contract Events',
    icon: CalendarClock,
    color: 'text-indigo-600 bg-indigo-50',
    triggers: TRIGGER_EVENTS
      .filter((e) => e.category === 'Schedule & Contract Events')
      .map((e) => ({ value: e.value, label: e.label })),
  },
];

const ALL_TRIGGERS = TRIGGER_EVENTS.map(t => {
  const cat = TRIGGER_CATEGORIES.find(c => c.label === t.category);
  const colorName = cat ? cat.color.replace('text-', '').replace('-500', '') : 'gray';
  return {
    ...t,
    category: t.category,
    categoryColor: `text-${colorName}-600 bg-${colorName}-50`,
  };
});

const CONDITION_OPERATORS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'greater_than', label: 'Greater Than' },
  { value: 'less_than', label: 'Less Than' },
  { value: 'is_empty', label: 'Is Empty' },
  { value: 'is_not_empty', label: 'Is Not Empty' },
];

const CONDITION_FIELDS = [
  'Lead Status', 'Lead Source', 'Lead Value', 'Customer Name', 'Customer Phone',
  'Quote Total', 'Quote Status', 'Invoice Total', 'Invoice Status',
  'Job Type', 'Job Priority', 'Employee Name', 'Employee Role',
  'Service Category', 'Booking Date',
];

// Action types are imported from @/lib/trigger-catalog (canonical source).
// This ensures the workflow builder's action dropdown matches the trigger-engine's executor switch.

const MOCK_EMPLOYEES = [
  { id: 'e1', name: 'Sarah Johnson', role: 'Sales Manager' },
  { id: 'e2', name: 'Mike Chen', role: 'Sales Rep' },
  { id: 'e3', name: 'Priya Patel', role: 'Sales Rep' },
  { id: 'e4', name: 'David Brown', role: 'Technician' },
  { id: 'e5', name: 'Emma Wilson', role: 'Support Agent' },
];

const MOCK_AUTOMATIONS: WorkflowAutomation[] = [
  {
    id: 'wa1', name: 'New Lead WhatsApp Welcome', description: 'Send a WhatsApp welcome message when a new lead is created',
    triggerType: 'lead.created', triggerCategory: 'CRM Events',
    conditions: [], conditionLogic: 'and',
    actions: [
      { id: 'a1', type: 'send_whatsapp', config: { template: 'Hello {{name}}, thank you for your interest! We will be in touch shortly.' } },
    ],
    active: true, executionCount: 142, lastExecutedAt: '2025-03-10T14:30:00', lastExecutionStatus: 'success', createdAt: '2025-01-15',
  },
  {
    id: 'wa2', name: 'High-Value Lead Alert', description: 'Alert sales team when a high-value lead is created',
    triggerType: 'lead.created', triggerCategory: 'CRM Events',
    conditions: [
      { id: 'c1', field: 'Lead Value', operator: 'greater_than', value: '500' },
    ],
    conditionLogic: 'and',
    actions: [
      { id: 'a2', type: 'send_notification', config: { message: 'High-value lead detected! Value: £{{value}}', channel: 'sales' } },
      { id: 'a3', type: 'assign_user', config: { employeeId: 'e1' } },
    ],
    active: true, executionCount: 38, lastExecutedAt: '2025-03-09T10:15:00', lastExecutionStatus: 'success', createdAt: '2025-02-01',
  },
  {
    id: 'wa3', name: 'Quote Follow-Up', description: 'Follow up on quotes sent more than 1 day ago',
    triggerType: 'time.1d_after_quote', triggerCategory: 'Invoice Events',
    conditions: [
      { id: 'c2', field: 'Quote Status', operator: 'equals', value: 'sent' },
    ],
    conditionLogic: 'and',
    actions: [
      { id: 'a4', type: 'send_whatsapp', config: { template: 'Hi {{name}}, have you had a chance to review your quote? Let us know if you have any questions!' } },
    ],
    active: true, executionCount: 95, lastExecutedAt: '2025-03-10T09:00:00', lastExecutionStatus: 'success', createdAt: '2025-01-20',
  },
  {
    id: 'wa4', name: 'Job Completion Feedback', description: 'Request feedback 3 days after job completion',
    triggerType: 'time.3d_after_job', triggerCategory: 'Job Events',
    conditions: [],
    conditionLogic: 'and',
    actions: [
      { id: 'a5', type: 'send_whatsapp', config: { template: 'Hi {{name}}, we hope you are satisfied with our service. Would you like to leave a review? {{review_link}}' } },
      { id: 'a6', type: 'send_email', config: { subject: 'How did we do?', body: 'We would love to hear your feedback on our recent service.' } },
    ],
    active: true, executionCount: 67, lastExecutedAt: '2025-03-08T16:00:00', lastExecutionStatus: 'success', createdAt: '2025-02-10',
  },
  {
    id: 'wa5', name: 'Invoice Overdue Reminder', description: 'Send WhatsApp reminder 7 days after invoice due',
    triggerType: 'time.7d_after_invoice', triggerCategory: 'Invoice Events',
    conditions: [
      { id: 'c3', field: 'Invoice Status', operator: 'not_equals', value: 'paid' },
    ],
    conditionLogic: 'and',
    actions: [
      { id: 'a7', type: 'send_whatsapp', config: { template: 'Hi {{name}}, this is a reminder that your invoice #{{invoice_number}} is overdue. Please arrange payment at your earliest convenience.' } },
      { id: 'a8', type: 'send_notification', config: { message: 'Invoice #{{invoice_number}} is now 7 days overdue', channel: 'finance' } },
    ],
    active: false, executionCount: 23, lastExecutedAt: '2025-02-28T11:00:00', lastExecutionStatus: 'failed', createdAt: '2025-01-05',
  },
  {
    id: 'wa6', name: 'WhatsApp Lead Auto-Respond', description: 'Auto-respond to WhatsApp messages from new leads',
    triggerType: 'whatsapp.message_received', triggerCategory: 'WhatsApp Events',
    conditions: [],
    conditionLogic: 'and',
    actions: [
      { id: 'a9', type: 'send_whatsapp', config: { template: 'Thanks for reaching out! Our team will get back to you shortly. In the meantime, feel free to ask any questions.' } },
      { id: 'a10', type: 'create_task', config: { taskTitle: 'Follow up with WhatsApp lead', dueIn: '2 hours' } },
    ],
    active: true, executionCount: 210, lastExecutedAt: '2025-03-10T15:45:00', lastExecutionStatus: 'success', createdAt: '2024-12-20',
  },
];

// ============================================================
// Helpers
// ============================================================

function getTriggerLabel(triggerType: string): string {
  const trigger = ALL_TRIGGERS.find((t) => t.value === triggerType);
  return trigger?.label || triggerType;
}

function getTriggerCategoryColor(triggerType: string): string {
  const trigger = ALL_TRIGGERS.find((t) => t.value === triggerType);
  return trigger?.categoryColor || 'text-gray-600 bg-gray-50';
}

function getActionTypeInfo(actionType: string) {
  return ACTION_TYPES.find((a) => a.value === actionType) || { label: actionType, icon: Settings2, color: 'text-gray-600 bg-gray-50' };
}

function formatRelativeDate(dateStr?: string): string {
  if (!dateStr) return 'Never';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

// ============================================================
// Visual Flow Component
// ============================================================

function VisualFlow({ automation }: { automation: WorkflowAutomation }) {
  const triggerLabel = getTriggerLabel(automation.triggerType);
  const triggerColor = getTriggerCategoryColor(automation.triggerType);

  const conditionText = automation.conditions.length > 0
    ? automation.conditions.map((c) => `${c.field} ${c.operator === 'greater_than' ? '>' : c.operator === 'not_equals' ? '≠' : c.operator === 'equals' ? '=' : c.operator} ${c.value}`).join(` ${automation.conditionLogic === 'and' ? '&' : '|'} `)
    : null;

  return (
    <div className="flex items-center gap-1.5 flex-wrap py-1">
      <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', triggerColor)}>
        <Zap className="size-2.5 mr-0.5" /> {triggerLabel}
      </Badge>
      {conditionText && (
        <>
          <ArrowRight className="size-3 text-muted-foreground" />
          <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
            <Filter className="size-2.5 mr-0.5" /> {conditionText}
          </Badge>
        </>
      )}
      {automation.actions.map((action, idx) => {
        const actionInfo = getActionTypeInfo(action.type);
        const ActionIcon = actionInfo.icon;
        return (
          <span key={action.id} className="flex items-center gap-1.5">
            <ArrowRight className="size-3 text-muted-foreground" />
            <Badge variant="outline" className={cn('text-[10px] h-5 px-1.5', actionInfo.color)}>
              <ActionIcon className="size-2.5 mr-0.5" /> {actionInfo.label}
            </Badge>
          </span>
        );
      })}
    </div>
  );
}

// ============================================================
// Action Config Component
// ============================================================

function ActionConfigPanel({ action, onChange }: { action: Action; onChange: (config: Record<string, string>) => void }) {
  switch (action.type) {
    case 'send_whatsapp':
      return (
        <div className="space-y-2">
          <Label className="text-xs">WhatsApp Template</Label>
          <Textarea
            placeholder="Hello {{name}}, ..."
            value={action.config.template || ''}
            onChange={(e) => onChange({ ...action.config, template: e.target.value })}
            rows={3}
            className="text-xs"
          />
          <p className="text-[10px] text-muted-foreground">Use {'{{name}}, {{value}}, {{service}}'} as variables</p>
        </div>
      );
    case 'send_email':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Subject</Label>
          <Input
            placeholder="Email subject"
            value={action.config.subject || ''}
            onChange={(e) => onChange({ ...action.config, subject: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Body</Label>
          <Textarea
            placeholder="Email body..."
            value={action.config.body || ''}
            onChange={(e) => onChange({ ...action.config, body: e.target.value })}
            rows={3}
            className="text-xs"
          />
        </div>
      );
    case 'assign_user':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Select Employee</Label>
          <Select
            value={action.config.employeeId || ''}
            onValueChange={(val) => onChange({ ...action.config, employeeId: val })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="Select employee" />
            </SelectTrigger>
            <SelectContent>
              {MOCK_EMPLOYEES.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.name} ({e.role})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    case 'create_task':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Task Title</Label>
          <Input
            placeholder="Follow up with lead"
            value={action.config.taskTitle || ''}
            onChange={(e) => onChange({ ...action.config, taskTitle: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Due In</Label>
          <Select
            value={action.config.dueIn || '2 hours'}
            onValueChange={(val) => onChange({ ...action.config, dueIn: val })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1 hour">1 Hour</SelectItem>
              <SelectItem value="2 hours">2 Hours</SelectItem>
              <SelectItem value="4 hours">4 Hours</SelectItem>
              <SelectItem value="1 day">1 Day</SelectItem>
              <SelectItem value="3 days">3 Days</SelectItem>
              <SelectItem value="1 week">1 Week</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'create_job':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Job Title</Label>
          <Input
            placeholder="e.g., AC Repair"
            value={action.config.jobTitle || ''}
            onChange={(e) => onChange({ ...action.config, jobTitle: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Job Type</Label>
          <Input
            placeholder="e.g., Installation, Maintenance"
            value={action.config.jobType || ''}
            onChange={(e) => onChange({ ...action.config, jobType: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );
    case 'send_notification':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Title</Label>
          <Input
            placeholder="Notification title"
            value={action.config.title || ''}
            onChange={(e) => onChange({ ...action.config, title: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Message</Label>
          <Textarea
            placeholder="Notification message..."
            value={action.config.message || ''}
            onChange={(e) => onChange({ ...action.config, message: e.target.value })}
            rows={2}
            className="text-xs"
          />
          <Label className="text-xs">Channel</Label>
          <Select
            value={action.config.channel || 'general'}
            onValueChange={(val) => onChange({ ...action.config, channel: val })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="support">Support</SelectItem>
              <SelectItem value="finance">Finance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    case 'send_sms':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Message</Label>
          <Textarea
            placeholder="SMS message..."
            value={action.config.message || ''}
            onChange={(e) => onChange({ ...action.config, message: e.target.value })}
            rows={2}
            className="text-xs"
          />
        </div>
      );
    case 'add_tag':
    case 'remove_tag':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Tag Name</Label>
          <Input
            placeholder="e.g., VIP, Follow-up"
            value={action.config.tagName || ''}
            onChange={(e) => onChange({ ...action.config, tagName: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );
    case 'update_record':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Field</Label>
          <Input
            placeholder="e.g., status"
            value={action.config.field || ''}
            onChange={(e) => onChange({ ...action.config, field: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Value</Label>
          <Input
            placeholder="e.g., active"
            value={action.config.value || ''}
            onChange={(e) => onChange({ ...action.config, value: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );
    case 'move_pipeline':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Target Stage</Label>
          <Input
            placeholder="e.g., Negotiation"
            value={action.config.stage || ''}
            onChange={(e) => onChange({ ...action.config, stage: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );
    case 'create_broadcast':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Broadcast Name</Label>
          <Input
            placeholder="Broadcast name"
            value={action.config.broadcastName || ''}
            onChange={(e) => onChange({ ...action.config, broadcastName: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Message</Label>
          <Textarea
            placeholder="Broadcast message..."
            value={action.config.message || ''}
            onChange={(e) => onChange({ ...action.config, message: e.target.value })}
            rows={2}
            className="text-xs"
          />
        </div>
      );
    case 'create_invoice':
    case 'create_deposit_invoice':
    case 'create_recurring_invoice':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Amount</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            placeholder="0.00"
            value={action.config.amount || ''}
            onChange={(e) => onChange({ ...action.config, amount: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Description</Label>
          <Input
            placeholder="Invoice description"
            value={action.config.description || ''}
            onChange={(e) => onChange({ ...action.config, description: e.target.value })}
            className="h-7 text-xs"
          />
          {action.type === 'create_recurring_invoice' && (
            <>
              <Label className="text-xs">Frequency</Label>
              <Select
                value={action.config.frequency || 'monthly'}
                onValueChange={(val) => onChange({ ...action.config, frequency: val })}
              >
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      );
    case 'send_invoice':
    case 'mark_paid':
    case 'send_reminder':
    case 'approve_invoice':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Note (optional)</Label>
          <Textarea
            placeholder="Optional note for this invoice action"
            value={action.config.note || ''}
            onChange={(e) => onChange({ ...action.config, note: e.target.value })}
            rows={2}
            className="text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            This action will use the invoice from the trigger context.
          </p>
        </div>
      );
    case 'condition':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Field</Label>
          <Input
            placeholder="e.g., total"
            value={action.config.field || ''}
            onChange={(e) => onChange({ ...action.config, field: e.target.value })}
            className="h-7 text-xs"
          />
          <Label className="text-xs">Operator</Label>
          <Select
            value={action.config.operator || 'equals'}
            onValueChange={(val) => onChange({ ...action.config, operator: val })}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="equals">Equals</SelectItem>
              <SelectItem value="not_equals">Not Equals</SelectItem>
              <SelectItem value="greater_than">Greater Than</SelectItem>
              <SelectItem value="less_than">Less Than</SelectItem>
              <SelectItem value="contains">Contains</SelectItem>
            </SelectContent>
          </Select>
          <Label className="text-xs">Value</Label>
          <Input
            placeholder="Comparison value"
            value={action.config.value || ''}
            onChange={(e) => onChange({ ...action.config, value: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );
    case 'delay':
      return (
        <div className="space-y-2">
          <Label className="text-xs">Delay Duration</Label>
          <Input
            placeholder="e.g., 1 hour, 2 days, 1 week"
            value={action.config.duration || ''}
            onChange={(e) => onChange({ ...action.config, duration: e.target.value })}
            className="h-7 text-xs"
          />
        </div>
      );
    default:
      return null;
  }
}

// ============================================================
// Main Component
// ============================================================

export function WorkflowAutomationsView() {
  const [automations, setAutomations] = useState<WorkflowAutomation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAutomationId, setEditingAutomationId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTriggerType, setFormTriggerType] = useState('');
  const [formConditions, setFormConditions] = useState<Condition[]>([]);
  const [formConditionLogic, setFormConditionLogic] = useState<'and' | 'or'>('and');
  const [formActions, setFormActions] = useState<Action[]>([]);

  // Expanded trigger category
  const [expandedCategory, setExpandedCategory] = useState<string | null>('CRM Events');

  // ============================================================
  // Filtered automations
  // ============================================================

  const filteredAutomations = useMemo(() => {
    let result = [...automations];
    if (filterStatus === 'active') result = result.filter((a) => a.active);
    if (filterStatus === 'inactive') result = result.filter((a) => !a.active);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((a) => a.name.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q));
    }
    return result;
  }, [automations, filterStatus, searchQuery]);

  // ============================================================
  // Stats
  // ============================================================

  const stats = useMemo(() => {
    const totalExecutions = automations.reduce((s, a) => s + a.executionCount, 0);
    const activeCount = automations.filter((a) => a.active).length;
    const failedCount = automations.filter((a) => a.lastExecutionStatus === 'failed').length;
    return { total: automations.length, activeCount, totalExecutions, failedCount };
  }, [automations]);

  // ============================================================
  // Handlers
  // ============================================================

  const openCreateDialog = () => {
    setEditingAutomationId(null);
    setFormName('');
    setFormDescription('');
    setFormTriggerType('');
    setFormConditions([]);
    setFormConditionLogic('and');
    setFormActions([]);
    setExpandedCategory('CRM Events');
    setShowCreateDialog(true);
  };

  const openEditDialog = (automation: WorkflowAutomation) => {
    setEditingAutomationId(automation.id);
    setFormName(automation.name);
    setFormDescription(automation.description || '');
    setFormTriggerType(automation.triggerType);
    setFormConditions(automation.conditions.map((c) => ({ ...c })));
    setFormConditionLogic(automation.conditionLogic);
    setFormActions(automation.actions.map((a) => ({ ...a, config: { ...a.config } })));
    const triggerCat = ALL_TRIGGERS.find((t) => t.value === automation.triggerType)?.category;
    setExpandedCategory(triggerCat || null);
    setShowCreateDialog(true);
  };

  const handleToggleActive = (id: string) => {
    setAutomations((prev) => prev.map((a) => a.id === id ? { ...a, active: !a.active } : a));
    const automation = automations.find((a) => a.id === id);
    toast.success(automation?.active ? 'Automation paused' : 'Automation activated');
  };

  const handleDelete = (id: string) => {
    setAutomations((prev) => prev.filter((a) => a.id !== id));
    toast.success('Automation deleted');
  };

  const handleExecute = (id: string) => {
    setAutomations((prev) => prev.map((a) =>
      a.id === id
        ? { ...a, executionCount: a.executionCount + 1, lastExecutedAt: new Date().toISOString(), lastExecutionStatus: 'success' as const }
        : a
    ));
    toast.success('Automation executed manually');
  };

  // Condition handlers
  const handleAddCondition = () => {
    setFormConditions((prev) => [...prev, {
      id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      field: CONDITION_FIELDS[0], operator: 'equals', value: '',
    }]);
  };

  const handleRemoveCondition = (id: string) => {
    setFormConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const handleConditionChange = (id: string, field: keyof Condition, value: string) => {
    setFormConditions((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c));
  };

  // Action handlers
  const handleAddAction = (type: string) => {
    setFormActions((prev) => [...prev, {
      id: `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type, config: {},
    }]);
  };

  const handleRemoveAction = (id: string) => {
    setFormActions((prev) => prev.filter((a) => a.id !== id));
  };

  const handleActionConfigChange = (id: string, config: Record<string, string>) => {
    setFormActions((prev) => prev.map((a) => a.id === id ? { ...a, config } : a));
  };

  const handleSave = () => {
    if (!formName.trim()) { toast.error('Automation name is required'); return; }
    if (!formTriggerType) { toast.error('Please select a trigger'); return; }
    if (formActions.length === 0) { toast.error('Add at least one action'); return; }

    setSaving(true);
    setTimeout(() => {
      const triggerInfo = ALL_TRIGGERS.find((t) => t.value === formTriggerType);

      if (editingAutomationId) {
        setAutomations((prev) => prev.map((a) => a.id === editingAutomationId ? {
          ...a,
          name: formName, description: formDescription,
          triggerType: formTriggerType, triggerCategory: triggerInfo?.category || '',
          conditions: formConditions, conditionLogic: formConditionLogic,
          actions: formActions,
        } : a));
        toast.success('Automation updated');
      } else {
        const newAutomation: WorkflowAutomation = {
          id: `wa_${Date.now()}`,
          name: formName, description: formDescription,
          triggerType: formTriggerType, triggerCategory: triggerInfo?.category || '',
          conditions: formConditions, conditionLogic: formConditionLogic,
          actions: formActions,
          active: true, executionCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        setAutomations((prev) => [newAutomation, ...prev]);
        toast.success('Automation created');
      }

      setSaving(false);
      setShowCreateDialog(false);
      setEditingAutomationId(null);
    }, 400);
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <GitBranch className="size-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Workflow Automations</h1>
            <p className="text-sm text-muted-foreground">Build trigger → conditions → actions automations</p>
          </div>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
          <Plus className="size-4 mr-1.5" /> Create Automation
        </Button>
      </div>

      {/* ── Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: 'Total Automations', value: stats.total, icon: GitBranch, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { title: 'Active', value: stats.activeCount, icon: Play, color: 'text-green-500', bg: 'bg-green-50' },
          { title: 'Total Executions', value: stats.totalExecutions.toLocaleString(), icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
          { title: 'Recently Failed', value: stats.failedCount, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">{stat.title}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`${stat.bg} p-2.5 rounded-xl`}>
                    <Icon className={`size-5 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Filters + Search ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as 'all' | 'active' | 'inactive')} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs px-3">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs px-3">Active</TabsTrigger>
            <TabsTrigger value="inactive" className="text-xs px-3">Inactive</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* ── Automations List ─────────────────────────────────────── */}
      {filteredAutomations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Zap className="size-12 mb-3 opacity-20" />
          <p className="font-medium">No automations found</p>
          <p className="text-sm mt-1">Create your first workflow automation</p>
          <Button className="mt-4 bg-emerald-600 hover:bg-emerald-700" onClick={openCreateDialog}>
            <Plus className="size-4 mr-1" /> Create Automation
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredAutomations.map((automation) => {
            const triggerColor = getTriggerCategoryColor(automation.triggerType);
            return (
              <Card key={automation.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left: main content */}
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm">{automation.name}</h3>
                        <Badge variant="outline" className={cn('text-[10px] h-5', triggerColor)}>
                          {getTriggerLabel(automation.triggerType)}
                        </Badge>
                        <Badge variant="outline" className={cn(
                          'text-[10px] h-5',
                          automation.active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-gray-50 text-gray-500 border-gray-200'
                        )}>
                          {automation.active ? (
                            <><Play className="size-2.5 mr-0.5" /> Active</>
                          ) : (
                            <><Pause className="size-2.5 mr-0.5" /> Inactive</>
                          )}
                        </Badge>
                        {automation.lastExecutionStatus === 'failed' && (
                          <Badge variant="outline" className="text-[10px] h-5 bg-red-50 text-red-600 border-red-200">
                            <AlertCircle className="size-2.5 mr-0.5" /> Failed
                          </Badge>
                        )}
                      </div>

                      {automation.description && (
                        <p className="text-sm text-muted-foreground">{automation.description}</p>
                      )}

                      {/* Visual Flow */}
                      <VisualFlow automation={automation} />

                      {/* Stats */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Activity className="size-3" /> {automation.executionCount} executions
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" /> Last: {formatRelativeDate(automation.lastExecutedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Right: actions */}
                    <div className="flex items-center gap-1 sm:pt-0">
                      <Button
                        variant="ghost" size="sm"
                        className={cn(
                          'h-8 text-xs',
                          automation.active ? 'text-amber-600 hover:text-amber-700' : 'text-emerald-600 hover:text-emerald-700'
                        )}
                        onClick={() => handleToggleActive(automation.id)}
                      >
                        {automation.active ? <Pause className="size-3.5 mr-1" /> : <Play className="size-3.5 mr-1" />}
                        {automation.active ? 'Pause' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => openEditDialog(automation)}>
                        <Edit3 className="size-3.5 mr-1" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => handleExecute(automation.id)}>
                        <Play className="size-3.5 mr-1" /> Run
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="size-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(automation)}>
                            <Edit3 className="size-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleExecute(automation.id)}>
                            <Play className="size-3.5 mr-2" /> Execute Now
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(automation.id)}>
                            {automation.active ? <Pause className="size-3.5 mr-2" /> : <Play className="size-3.5 mr-2" />}
                            {automation.active ? 'Pause' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem variant="destructive" onClick={() => handleDelete(automation.id)}>
                            <Trash2 className="size-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Create/Edit Automation Dialog ─────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="size-5 text-emerald-600" />
              {editingAutomationId ? 'Edit Automation' : 'Create Automation'}
            </DialogTitle>
            <DialogDescription>
              Define a trigger, add conditions, and configure actions
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[68vh] pr-1">
            <div className="space-y-6 pr-3">
              {/* ── Name & Description ──────────────────────────── */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Automation Name *</Label>
                  <Input
                    placeholder="e.g., New Lead WhatsApp Welcome"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="What does this automation do?"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>
              </div>

              <Separator />

              {/* ── Trigger Section ─────────────────────────────── */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <Zap className="size-4 text-emerald-600" /> Trigger
                  <span className="text-muted-foreground font-normal">(required)</span>
                </Label>

                {formTriggerType && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <Zap className="size-4 text-emerald-600" />
                    <span className="text-sm font-medium text-emerald-800">{getTriggerLabel(formTriggerType)}</span>
                    <Button
                      variant="ghost" size="sm"
                      className="h-6 w-6 p-0 ml-auto text-emerald-600 hover:text-red-600"
                      onClick={() => setFormTriggerType('')}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )}

                {!formTriggerType && (
                  <div className="border rounded-lg overflow-hidden">
                    {TRIGGER_CATEGORIES_LOCAL.map((category) => {
                      const CatIcon = category.icon;
                      const isExpanded = expandedCategory === category.name;
                      return (
                        <div key={category.name} className="border-b last:border-b-0">
                          <button
                            className="flex items-center gap-2 w-full px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                            onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                          >
                            <CatIcon className={cn('size-4', category.color.split(' ')[0])} />
                            <span className="font-medium flex-1 text-left">{category.name}</span>
                            <span className="text-xs text-muted-foreground">{category.triggers.length}</span>
                            {isExpanded ? <ChevronDown className="size-4 text-muted-foreground" /> : <ChevronRight className="size-4 text-muted-foreground" />}
                          </button>
                          {isExpanded && (
                            <div className="pl-10 pr-3 pb-2 space-y-0.5">
                              {category.triggers.map((trigger) => (
                                <button
                                  key={trigger.value}
                                  className="flex items-center gap-2 w-full px-3 py-1.5 text-sm rounded-md hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                                  onClick={() => setFormTriggerType(trigger.value)}
                                >
                                  <Zap className="size-3 text-emerald-500" />
                                  {trigger.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Conditions Section ──────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Filter className="size-4 text-amber-600" /> Conditions
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Button
                    variant="ghost" size="sm"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 text-xs"
                    onClick={handleAddCondition}
                  >
                    <PlusCircle className="size-3.5 mr-1" /> Add Condition
                  </Button>
                </div>

                {formConditions.length > 0 && (
                  <div className="space-y-2">
                    {formConditions.map((condition, idx) => (
                      <div key={condition.id} className="flex items-center gap-2">
                        {idx > 0 && (
                          <Select
                            value={formConditionLogic}
                            onValueChange={(val: 'and' | 'or') => setFormConditionLogic(val)}
                          >
                            <SelectTrigger className="h-7 w-16 text-[10px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="and">AND</SelectItem>
                              <SelectItem value="or">OR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Select
                          value={condition.field}
                          onValueChange={(val) => handleConditionChange(condition.id, 'field', val)}
                        >
                          <SelectTrigger className="h-8 text-xs flex-1">
                            <SelectValue placeholder="Field" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_FIELDS.map((f) => (
                              <SelectItem key={f} value={f}>{f}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={condition.operator}
                          onValueChange={(val) => handleConditionChange(condition.id, 'operator', val)}
                        >
                          <SelectTrigger className="h-8 text-xs w-28">
                            <SelectValue placeholder="Operator" />
                          </SelectTrigger>
                          <SelectContent>
                            {CONDITION_OPERATORS.map((op) => (
                              <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {!['is_empty', 'is_not_empty'].includes(condition.operator) && (
                          <Input
                            placeholder="Value"
                            value={condition.value}
                            onChange={(e) => handleConditionChange(condition.id, 'value', e.target.value)}
                            className="h-8 text-xs w-28"
                          />
                        )}
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-red-600 shrink-0"
                          onClick={() => handleRemoveCondition(condition.id)}
                        >
                          <MinusCircle className="size-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {formConditions.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No conditions — automation will run for every trigger event</p>
                )}
              </div>

              <Separator />

              {/* ── Actions Section ─────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Settings2 className="size-4 text-emerald-600" /> Actions
                    <span className="text-muted-foreground font-normal">(required)</span>
                  </Label>
                </div>

                {/* Action type selector */}
                <div className="flex flex-wrap gap-1.5">
                  {ACTION_TYPES.map((actionType) => {
                    const ActionIcon = actionType.icon;
                    return (
                      <Button
                        key={actionType.value}
                        variant="outline" size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleAddAction(actionType.value)}
                      >
                        <ActionIcon className="size-3 mr-1" /> {actionType.label}
                      </Button>
                    );
                  })}
                </div>

                {/* Added actions */}
                {formActions.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No actions added yet — click an action type above to add</p>
                ) : (
                  <div className="space-y-3">
                    {formActions.map((action, idx) => {
                      const actionInfo = getActionTypeInfo(action.type);
                      const ActionIcon = actionInfo.icon;
                      return (
                        <div key={action.id} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={cn('p-1.5 rounded-md', actionInfo.color)}>
                                <ActionIcon className="size-3.5" />
                              </div>
                              <span className="text-sm font-medium">{actionInfo.label}</span>
                              <Badge variant="outline" className="text-[9px] h-4">Step {idx + 1}</Badge>
                            </div>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-red-600"
                              onClick={() => handleRemoveAction(action.id)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </div>
                          <ActionConfigPanel
                            action={action}
                            onChange={(config) => handleActionConfigChange(action.id, config)}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Separator />

              {/* ── Visual Preview ──────────────────────────────── */}
              {formTriggerType && formActions.length > 0 && (
                <div className="rounded-lg border bg-emerald-50/50 p-4 space-y-2">
                  <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                    <GitBranch className="size-4" /> Flow Preview
                  </h4>
                  <VisualFlow
                    automation={{
                      id: 'preview',
                      name: formName,
                      description: formDescription,
                      triggerType: formTriggerType,
                      triggerCategory: '',
                      conditions: formConditions,
                      conditionLogic: formConditionLogic,
                      actions: formActions,
                      active: true,
                      executionCount: 0,
                      createdAt: '',
                    }}
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={saving}>
              Cancel
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editingAutomationId ? 'Update Automation' : 'Create Automation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
