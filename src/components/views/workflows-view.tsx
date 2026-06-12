'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  Workflow,
  MoreVertical,
  Clock,
  Play,
  Pencil,
  Trash2,
  PenLine,
  Zap,
  Activity,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  Webhook,
  Timer,
  Mail,
  MessageSquare,
  Loader2,
  RefreshCw,
  UserPlus, CheckCircle, ArrowRightLeft, Clock3, Edit3, Users,
  CalendarCheck, CalendarX, CalendarClock, CalendarPlus, AlertCircle,
  CircleCheck, UserCheck, XCircle, Briefcase, AlertTriangle,
  MessageCircle, MessageSquarePlus, MailCheck, Banknote, CreditCard,
  Receipt, FileCheck2, WifiOff, Globe, MousePointerClick, TimerReset,
  Tag, PlusCircle, Bell, Save, Bot, Store,
  Settings2, ChevronDown, ChevronUp, Sparkles,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/store/app-store';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

import { PREBUILT_TRIGGERS, TRIGGER_CATEGORIES } from '@/lib/trigger-catalog';
import type { PrebuiltTrigger } from '@/lib/trigger-catalog';

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowItem {
  id: string;
  name: string;
  description: string | null;
  triggerType: string;
  nodes: { id: string; name: string; type: string; status?: string }[];
  edges: unknown[];
  active: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  executionCount: number;
  lastRunAt: string | null;
  successRate: number;
}

// ─── Mock Data (fallback) ──────────────────────────────────────────────────

const MOCK_WORKFLOWS: WorkflowItem[] = [
  {
    id: 'wf1', name: 'Lead Follow-up Automation', description: 'Automatically follow up with new leads via WhatsApp after 30 minutes', triggerType: 'webhook',
    nodes: [
      { id: 'n1', name: 'Webhook Trigger', type: 'trigger' },
      { id: 'n2', name: 'Delay 30min', type: 'delay' },
      { id: 'n3', name: 'Send WhatsApp', type: 'action' },
      { id: 'n4', name: 'Update CRM', type: 'action' },
    ],
    edges: [], active: true, tags: ['leads', 'whatsapp'],
    createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-03-10T14:30:00Z',
    executionCount: 245, lastRunAt: '2025-03-13T09:15:00Z', successRate: 94,
  },
  {
    id: 'wf2', name: 'Appointment Reminder', description: 'Send appointment reminders 2 hours before scheduled service', triggerType: 'schedule',
    nodes: [
      { id: 'n5', name: 'Cron Trigger', type: 'trigger' },
      { id: 'n6', name: 'Find Upcoming', type: 'action' },
      { id: 'n7', name: 'Send Reminder', type: 'action' },
    ],
    edges: [], active: true, tags: ['appointments', 'reminders'],
    createdAt: '2025-02-01T08:00:00Z', updatedAt: '2025-03-12T16:00:00Z',
    executionCount: 892, lastRunAt: '2025-03-13T08:00:00Z', successRate: 98,
  },
  {
    id: 'wf3', name: 'Payment Confirmation', description: 'Send payment receipt and update invoice status automatically', triggerType: 'webhook',
    nodes: [
      { id: 'n8', name: 'Stripe Webhook', type: 'trigger' },
      { id: 'n9', name: 'Update Invoice', type: 'action' },
      { id: 'n10', name: 'Send Receipt', type: 'action' },
      { id: 'n11', name: 'Notify Team', type: 'action' },
    ],
    edges: [], active: true, tags: ['payments', 'billing'],
    createdAt: '2025-01-20T12:00:00Z', updatedAt: '2025-03-11T10:00:00Z',
    executionCount: 156, lastRunAt: '2025-03-13T07:45:00Z', successRate: 99,
  },
  {
    id: 'wf4', name: 'New Customer Onboarding', description: 'Welcome sequence for new customers with service info and discounts', triggerType: 'event',
    nodes: [
      { id: 'n12', name: 'Customer Created', type: 'trigger' },
      { id: 'n13', name: 'Send Welcome', type: 'action' },
      { id: 'n14', name: 'Wait 24h', type: 'delay' },
      { id: 'n15', name: 'Send Discount', type: 'action' },
    ],
    edges: [], active: false, tags: ['onboarding', 'customers'],
    createdAt: '2025-02-15T14:00:00Z', updatedAt: '2025-03-08T11:00:00Z',
    executionCount: 78, lastRunAt: '2025-03-08T11:00:00Z', successRate: 87,
  },
  {
    id: 'wf5', name: 'Job Status Notifications', description: 'Notify customers when job status changes (assigned, en-route, completed)', triggerType: 'event',
    nodes: [
      { id: 'n16', name: 'Job Updated', type: 'trigger' },
      { id: 'n17', name: 'Check Status', type: 'condition' },
      { id: 'n18', name: 'Send Notification', type: 'action' },
    ],
    edges: [], active: true, tags: ['jobs', 'notifications'],
    createdAt: '2025-03-01T09:00:00Z', updatedAt: '2025-03-13T12:00:00Z',
    executionCount: 534, lastRunAt: '2025-03-13T12:30:00Z', successRate: 96,
  },
  {
    id: 'wf6', name: 'Review Collection', description: 'Request customer reviews 24 hours after job completion', triggerType: 'schedule',
    nodes: [
      { id: 'n19', name: 'Daily Check', type: 'trigger' },
      { id: 'n20', name: 'Find Completed', type: 'action' },
      { id: 'n21', name: 'Send Review Link', type: 'action' },
    ],
    edges: [], active: false, tags: ['reviews', 'feedback'],
    createdAt: '2025-02-28T16:00:00Z', updatedAt: '2025-03-05T09:00:00Z',
    executionCount: 23, lastRunAt: '2025-03-05T09:00:00Z', successRate: 78,
  },
  {
    id: 'wf7', name: 'Escalation Handler', description: 'Escalate unresolved support tickets to senior agents after 2 hours', triggerType: 'manual',
    nodes: [
      { id: 'n22', name: 'Manual Trigger', type: 'trigger' },
      { id: 'n23', name: 'Check SLA', type: 'condition' },
      { id: 'n24', name: 'Reassign Agent', type: 'action' },
    ],
    edges: [], active: true, tags: ['support', 'escalation'],
    createdAt: '2025-03-05T11:00:00Z', updatedAt: '2025-03-12T15:00:00Z',
    executionCount: 12, lastRunAt: '2025-03-12T15:00:00Z', successRate: 100,
  },
  {
    id: 'wf8', name: 'Invoice Overdue Reminder', description: 'Send payment reminders for invoices overdue by 7+ days', triggerType: 'schedule',
    nodes: [
      { id: 'n25', name: 'Weekly Check', type: 'trigger' },
      { id: 'n26', name: 'Find Overdue', type: 'action' },
      { id: 'n27', name: 'Send Reminder', type: 'action' },
      { id: 'n28', name: 'Update Status', type: 'action' },
    ],
    edges: [], active: false, tags: ['billing', 'reminders'],
    createdAt: '2025-03-10T10:00:00Z', updatedAt: '2025-03-10T10:00:00Z',
    executionCount: 0, lastRunAt: null, successRate: 0,
  },
];

// ─── Constants ──────────────────────────────────────────────────────────────

const TRIGGER_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-violet-600' },
  schedule: { label: 'Schedule', icon: Timer, color: 'text-amber-600' },
  event: { label: 'Event', icon: Zap, color: 'text-blue-600' },
  manual: { label: 'Manual', icon: Play, color: 'text-slate-600' },
  email: { label: 'Email', icon: Mail, color: 'text-pink-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, color: 'text-emerald-600' },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Detect trigger type from workflow nodes
function detectTriggerType(nodes: { id: string; name: string; type: string }[]): string {
  if (!nodes || nodes.length === 0) return 'manual';
  const trigger = nodes.find(n => n.type === 'trigger');
  if (!trigger) return 'manual';
  const nameL = trigger.name.toLowerCase();
  if (nameL.includes('webhook') || nameL.includes('http')) return 'webhook';
  if (nameL.includes('cron') || nameL.includes('schedule') || nameL.includes('daily') || nameL.includes('weekly') || nameL.includes('check')) return 'schedule';
  if (nameL.includes('whatsapp')) return 'whatsapp';
  if (nameL.includes('email')) return 'email';
  if (nameL.includes('event') || nameL.includes('created') || nameL.includes('updated')) return 'event';
  return 'manual';
}

// ─── Component ──────────────────────────────────────────────────────────────

export function WorkflowsView() {
  const { setCurrentView, setCurrentWorkflowId } = useAppStore();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [triggerFilter, setTriggerFilter] = useState('all');

  // Tabs
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates'>('workflows');
  const [templateCategory, setTemplateCategory] = useState('all');
  const [templateSearch, setTemplateSearch] = useState('');
  const [enabledTriggers, setEnabledTriggers] = useState<string[]>([]);

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowItem | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Create form
  const [createForm, setCreateForm] = useState({
    name: '', triggerType: 'webhook', description: '',
  });

  // Loading states for async operations
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Fetch workflows from API ──────────────────────────────────────────

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows');
      if (res.ok) {
        const data = await res.json();
        const apiWorkflows: WorkflowItem[] = (data.workflows || []).map((w: any) => {
          const nodes = Array.isArray(w.nodes) ? w.nodes : [];
          return {
            id: w.id,
            name: w.name,
            description: w.description || null,
            triggerType: detectTriggerType(nodes),
            nodes: nodes.map((n: any) => ({
              id: n.id,
              name: n.name || n.data?.nodeType || 'Node',
              type: n.data?.nodeType ? 
                (n.data.nodeType.includes('Trigger') ? 'trigger' : 
                 n.data.nodeType.includes('condition') || n.data.nodeType === 'ifElse' ? 'condition' :
                 n.data.nodeType.includes('delay') || n.data.nodeType === 'wait' ? 'delay' : 'action') :
                (n.type || 'action'),
            })),
            edges: Array.isArray(w.edges) ? w.edges : [],
            active: w.active || false,
            tags: Array.isArray(w.tags) ? w.tags : [],
            createdAt: w.createdAt,
            updatedAt: w.updatedAt,
            executionCount: w.executionCount || 0,
            lastRunAt: null,
            successRate: 0,
          };
        });
        setWorkflows(apiWorkflows.length > 0 ? apiWorkflows : MOCK_WORKFLOWS);
      } else {
        setWorkflows(MOCK_WORKFLOWS);
      }
    } catch {
      setWorkflows(MOCK_WORKFLOWS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  // Stats
  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.active).length,
    executionsToday: workflows.reduce((s, w) => s + w.executionCount, 0),
    avgSuccessRate: workflows.filter(w => w.successRate > 0).length > 0
      ? Math.round(workflows.filter(w => w.successRate > 0).reduce((s, w) => s + w.successRate, 0) / workflows.filter(w => w.successRate > 0).length)
      : 0,
  };

  // Filtered workflows
  const filtered = workflows.filter((w) => {
    if (search && !w.name.toLowerCase().includes(search.toLowerCase()) &&
        !(w.description && w.description.toLowerCase().includes(search.toLowerCase())) &&
        !w.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))) return false;
    if (statusFilter === 'active' && !w.active) return false;
    if (statusFilter === 'inactive' && w.active) return false;
    if (triggerFilter !== 'all' && w.triggerType !== triggerFilter) return false;
    return true;
  });

  // ─── Toggle Active/Inactive (persists to API) ─────────────────────────

  const toggleActive = async (id: string, currentActive: boolean) => {
    setTogglingId(id);
    try {
      // Optimistic update
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: !currentActive } : w));
      
      const res = await fetch(`/api/workflows/${id}/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !currentActive }),
      });
      
      if (res.ok) {
        const data = await res.json();
        toast.success(data.active ? 'Workflow activated — triggers are now live' : 'Workflow deactivated');
        // Refresh from API to get the latest state
        fetchWorkflows();
      } else {
        // Revert on error
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: currentActive } : w));
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || 'Failed to toggle workflow status');
      }
    } catch {
      // Revert on network error
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, active: currentActive } : w));
      toast.error('Network error — could not toggle workflow');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Trigger/Execute Workflow (persists to API) ───────────────────────

  const triggerWorkflow = async (id: string, name: string) => {
    setTriggeringId(id);
    try {
      const res = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const data = await res.json();
        const durationMs = data.durationMs || 0;
        const status = data.status || 'success';
        toast.success(`"${name}" executed ${status === 'error' ? 'with errors' : 'successfully'} in ${durationMs}ms`);
        // Update execution count locally
        setWorkflows(prev => prev.map(w => 
          w.id === id ? { ...w, executionCount: w.executionCount + 1, lastRunAt: new Date().toISOString() } : w
        ));
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || `Failed to execute "${name}"`);
      }
    } catch {
      toast.error(`Network error — could not execute "${name}"`);
    } finally {
      setTriggeringId(null);
    }
  };

  // ─── Rename Workflow (persists to API) ────────────────────────────────

  const startRename = (id: string, currentName: string) => {
    setRenamingId(id);
    setRenameValue(currentName);
  };

  const confirmRename = async (id: string) => {
    const trimmed = renameValue.trim();
    if (!trimmed) { setRenamingId(null); return; }
    
    // Optimistic update
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, name: trimmed } : w));
    setRenamingId(null);
    
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      
      if (res.ok) {
        toast.success('Workflow renamed');
      } else {
        toast.error('Failed to rename workflow');
        fetchWorkflows(); // Refresh to revert
      }
    } catch {
      toast.error('Network error — could not rename workflow');
      fetchWorkflows(); // Refresh to revert
    }
  };

  // ─── Delete Workflow (persists to API) ────────────────────────────────

  const handleDelete = async (id: string) => {
    // Optimistic delete
    setWorkflows(prev => prev.filter(w => w.id !== id));
    
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Workflow deleted');
      } else {
        toast.error('Failed to delete workflow');
        fetchWorkflows(); // Refresh to revert
      }
    } catch {
      toast.error('Network error — could not delete workflow');
      fetchWorkflows(); // Refresh to revert
    }
  };

  // ─── Open Workflow in Canvas ──────────────────────────────────────────

  const openWorkflow = (id: string) => {
    setCurrentWorkflowId(id);
    setCurrentView('canvas');
  };

  // ─── Create Workflow (persists to API) ────────────────────────────────

  const handleCreate = async () => {
    if (!createForm.name.trim()) { toast.error('Workflow name is required'); return; }
    
    setCreating(true);
    const newWorkflow: WorkflowItem = {
      id: `wf-${Date.now()}`, name: createForm.name.trim(),
      description: createForm.description.trim() || null,
      triggerType: createForm.triggerType,
      nodes: [{ id: 'n1', name: TRIGGER_CONFIG[createForm.triggerType]?.label || 'Trigger', type: 'trigger' }],
      edges: [], active: false, tags: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      executionCount: 0, lastRunAt: null, successRate: 0,
    };

    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createForm.name.trim(),
          description: createForm.description.trim() || null,
          nodes: newWorkflow.nodes,
          edges: [],
          tags: [],
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        // Use the API-returned ID so canvas can load it
        newWorkflow.id = data.id;
        toast.success('Workflow created');
      } else {
        toast.error('Failed to create workflow on server, saved locally');
      }
    } catch {
      toast.error('Network error — workflow saved locally only');
    }
    
    setWorkflows(prev => [newWorkflow, ...prev]);
    setShowCreateDialog(false);
    setCreateForm({ name: '', triggerType: 'webhook', description: '' });
    setCreating(false);
  };

  // ─── Save Workflow (detail dialog save button) ────────────────────────

  const handleSaveWorkflow = async (workflow: WorkflowItem) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/workflows/${workflow.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: workflow.name,
          description: workflow.description,
          active: workflow.active,
          tags: workflow.tags,
        }),
      });
      
      if (res.ok) {
        toast.success('Workflow saved');
      } else {
        toast.error('Failed to save workflow');
      }
    } catch {
      toast.error('Network error — could not save workflow');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = (workflow: WorkflowItem) => {
    setSelectedWorkflow(workflow);
    setShowDetailDialog(true);
  };

  // ─── Trigger template handlers ─────────────────────────────────────────

  const fetchEnabledTriggers = useCallback(async () => {
    try {
      const res = await fetch('/api/triggers?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        const names = (data.automations || []).map((a: any) => a.name);
        setEnabledTriggers(names);
      }
    } catch {}
  }, []);

  useEffect(() => { fetchEnabledTriggers(); }, [fetchEnabledTriggers]);

  const handleEnableTrigger = async (trigger: PrebuiltTrigger) => {
    try {
      const actionsToSave = trigger.defaultActions.map(a => ({ type: a.type, config: a.config }));
      const res = await fetch('/api/triggers?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trigger.name,
          description: trigger.description,
          triggerType: trigger.triggerType,
          triggerConfigJson: trigger.triggerConfigJson,
          conditionsJson: trigger.conditionsJson,
          actionsJson: JSON.stringify(actionsToSave),
          active: true,
        }),
      });
      if (res.ok) {
        setEnabledTriggers(prev => [...prev, trigger.name]);
        toast.success(`"${trigger.name}" activated!`);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to activate trigger');
      }
    } catch {
      toast.error('Failed to activate trigger');
    }
  };

  const handleDisableTrigger = async (triggerName: string) => {
    try {
      const res = await fetch('/api/triggers?XTransformPort=3000');
      if (res.ok) {
        const data = await res.json();
        const automation = (data.automations || []).find((a: any) => a.name === triggerName);
        if (automation) {
          await fetch(`/api/triggers/${automation.id}?XTransformPort=3000`, { method: 'DELETE' });
          setEnabledTriggers(prev => prev.filter(n => n !== triggerName));
          toast.success('Trigger deactivated');
        }
      }
    } catch {
      toast.error('Failed to deactivate trigger');
    }
  };

  const filteredTemplates = PREBUILT_TRIGGERS.filter(p => {
    const matchesCategory = templateCategory === 'all' || p.category === templateCategory;
    const matchesSearch = !templateSearch ||
      p.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      p.description.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-lg bg-emerald-600">
            <Workflow className="size-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Workflows</h2>
            <p className="text-sm text-muted-foreground">Automate your business processes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchWorkflows} disabled={loading}>
            <RefreshCw className={cn('size-3.5 mr-1.5', loading && 'animate-spin')} /> Refresh
          </Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4 mr-1.5" /> New Workflow
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Total Workflows', value: stats.total, icon: Workflow, color: 'text-foreground' },
          { label: 'Active', value: stats.active, icon: CheckCircle2, color: 'text-emerald-600' },
          { label: 'Executions Today', value: stats.executionsToday.toLocaleString(), icon: Activity, color: 'text-blue-600' },
          { label: 'Success Rate', value: `${stats.avgSuccessRate}%`, icon: BarChart3, color: 'text-purple-600' },
        ].map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4">
              <div className="flex items-center gap-2">
                <Icon className={`size-4 ${stat.color}`} />
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Main Tabs: My Workflows / Trigger Templates */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'workflows' | 'templates')}>
        <TabsList>
          <TabsTrigger value="workflows" className="gap-1.5">
            <Workflow className="size-3.5" />
            My Workflows
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{workflows.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5">
            <Store className="size-3.5" />
            Trigger Templates
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{PREBUILT_TRIGGERS.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* ─── My Workflows Tab ──────────────────────────────────────────── */}
        <TabsContent value="workflows" className="mt-4">

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center rounded-md border bg-muted p-0.5">
          {(['all', 'active', 'inactive'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                'px-3 py-1 text-xs font-medium rounded-sm transition-colors',
                statusFilter === status
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
        <Select value={triggerFilter} onValueChange={setTriggerFilter}>
          <SelectTrigger className="w-[160px] h-9 text-xs">
            <SelectValue placeholder="Trigger Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Triggers</SelectItem>
            {Object.entries(TRIGGER_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search workflows..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8" />
        </div>
        <div className="flex items-center border rounded-md">
          <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-r-none" onClick={() => setViewMode('grid')}>
            <LayoutGrid className="size-4" />
          </Button>
          <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="icon" className="h-8 w-8 rounded-l-none" onClick={() => setViewMode('list')}>
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-4" />
                    <div className="flex gap-2"><Skeleton className="h-5 w-14" /><Skeleton className="h-5 w-14" /></div>
                  </CardContent>
                </Card>
              ))
            : filtered.map((workflow) => {
                const triggerCfg = TRIGGER_CONFIG[workflow.triggerType] || TRIGGER_CONFIG.manual;
                const TriggerIcon = triggerCfg.icon;
                const isToggling = togglingId === workflow.id;
                const isTriggering = triggeringId === workflow.id;
                return (
                  <Card
                    key={workflow.id}
                    className="hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => openDetail(workflow)}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn('flex items-center justify-center size-9 rounded-lg shrink-0', workflow.active ? 'bg-emerald-500/10' : 'bg-muted')}>
                            <Workflow className={cn('size-4', workflow.active ? 'text-emerald-500' : 'text-muted-foreground')} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-sm truncate">{workflow.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">{workflow.description || 'No description'}</p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerWorkflow(workflow.id, workflow.name); }} disabled={isTriggering}>
                              {isTriggering ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Play className="size-3.5 mr-2" />} Trigger
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openWorkflow(workflow.id); }}>
                              <Pencil className="size-3.5 mr-2" /> Edit in Canvas
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startRename(workflow.id, workflow.name); }}>
                              <PenLine className="size-3.5 mr-2" /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleActive(workflow.id, workflow.active); }} disabled={isToggling}>
                              {isToggling ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Zap className="size-3.5 mr-2" />} {workflow.active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(workflow.id); }}>
                              <Trash2 className="size-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <Switch
                            checked={workflow.active}
                            onCheckedChange={() => toggleActive(workflow.id, workflow.active)}
                            disabled={isToggling}
                            className={cn('data-[state=checked]:bg-emerald-500')}
                          />
                          <span className={cn('text-xs font-medium select-none', workflow.active ? 'text-emerald-600' : 'text-muted-foreground')}>
                            {isToggling ? '...' : workflow.active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <Badge variant="outline" className={cn('text-[10px]', triggerCfg.color)}>
                          <TriggerIcon className="size-3 mr-1" />{triggerCfg.label}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Activity className="size-3" />{workflow.executionCount} runs</span>
                        <span className="flex items-center gap-1"><Clock className="size-3" />{workflow.lastRunAt ? formatDate(workflow.lastRunAt) : 'Never'}</span>
                      </div>

                      {workflow.successRate > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className={cn('font-medium', workflow.successRate >= 90 ? 'text-emerald-600' : workflow.successRate >= 70 ? 'text-amber-600' : 'text-red-600')}>{workflow.successRate}%</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={cn('h-full rounded-full transition-all', workflow.successRate >= 90 ? 'bg-emerald-500' : workflow.successRate >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${workflow.successRate}%` }} />
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1 pt-2 border-t">
                        {workflow.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[9px] h-5">{tag}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="size-8 rounded-lg" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Trigger</TableHead>
                    <TableHead className="hidden md:table-cell">Executions</TableHead>
                    <TableHead className="hidden md:table-cell">Success Rate</TableHead>
                    <TableHead className="hidden lg:table-cell">Last Run</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((workflow) => {
                    const triggerCfg = TRIGGER_CONFIG[workflow.triggerType] || TRIGGER_CONFIG.manual;
                    const TriggerIcon = triggerCfg.icon;
                    const isToggling = togglingId === workflow.id;
                    const isTriggering = triggeringId === workflow.id;
                    return (
                      <TableRow key={workflow.id} className="cursor-pointer" onClick={() => openDetail(workflow)}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={cn('flex items-center justify-center size-7 rounded-lg shrink-0', workflow.active ? 'bg-emerald-500/10' : 'bg-muted')}>
                              <Workflow className={cn('size-3.5', workflow.active ? 'text-emerald-500' : 'text-muted-foreground')} />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{workflow.name}</p>
                              <p className="text-xs text-muted-foreground truncate max-w-xs">{workflow.description || 'No description'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={workflow.active}
                              onCheckedChange={() => toggleActive(workflow.id, workflow.active)}
                              disabled={isToggling}
                              className={cn('data-[state=checked]:bg-emerald-500')}
                            />
                            <span className={cn('text-xs font-medium select-none', workflow.active ? 'text-emerald-600' : 'text-muted-foreground')}>
                              {isToggling ? '...' : workflow.active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className={cn('text-[10px]', triggerCfg.color)}>
                            <TriggerIcon className="size-3 mr-1" />{triggerCfg.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{workflow.executionCount}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className={cn('text-sm font-medium', workflow.successRate >= 90 ? 'text-emerald-600' : workflow.successRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                            {workflow.successRate > 0 ? `${workflow.successRate}%` : '-'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">
                          {workflow.lastRunAt ? formatDate(workflow.lastRunAt) : 'Never'}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="size-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); triggerWorkflow(workflow.id, workflow.name); }} disabled={isTriggering}>
                                {isTriggering ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Play className="size-3.5 mr-2" />} Trigger
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openWorkflow(workflow.id); }}><Pencil className="size-3.5 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); startRename(workflow.id, workflow.name); }}><PenLine className="size-3.5 mr-2" /> Rename</DropdownMenuItem>
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toggleActive(workflow.id, workflow.active); }} disabled={isToggling}>
                                {isToggling ? <Loader2 className="size-3.5 mr-2 animate-spin" /> : <Zap className="size-3.5 mr-2" />} {workflow.active ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); handleDelete(workflow.id); }}><Trash2 className="size-3.5 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-12">
          <Workflow className="size-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">No workflows found</h3>
          <p className="text-muted-foreground mb-4">{search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first workflow to get started'}</p>
          <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowCreateDialog(true)}>
            <Plus className="size-4" /> New Workflow
          </Button>
        </div>
      )}

        </TabsContent>

        {/* ─── Trigger Templates Tab ──────────────────────────────────────── */}
        <TabsContent value="templates" className="mt-4 space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Search trigger templates..." value={templateSearch} onChange={e => setTemplateSearch(e.target.value)} className="pl-8" />
            </div>
            <Badge variant="outline" className="h-9 px-3 gap-1.5 text-xs border-emerald-500/30 text-emerald-600">
              <Zap className="size-3.5" />
              {enabledTriggers.length} Active
            </Badge>
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            {TRIGGER_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count = cat.id === 'all'
                ? PREBUILT_TRIGGERS.length
                : PREBUILT_TRIGGERS.filter(p => p.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setTemplateCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                    templateCategory === cat.id
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
                  )}
                >
                  <Icon className="size-3" />
                  {cat.label}
                  <span className={cn(
                    'text-[9px] font-semibold',
                    templateCategory === cat.id ? 'text-emerald-500' : 'text-muted-foreground'
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Template grid */}
          {filteredTemplates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No triggers found</h3>
                  <p className="text-muted-foreground text-sm mt-1">Try adjusting your search or category filter</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((trigger) => {
                const isEnabled = enabledTriggers.includes(trigger.name);
                const Icon = trigger.icon;
                const CategoryIcon = TRIGGER_CATEGORIES.find(c => c.id === trigger.category)?.icon || Zap;

                return (
                  <Card
                    key={trigger.id}
                    className={cn(
                      'group transition-all hover:shadow-md border',
                      isEnabled ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-border hover:border-emerald-500/20'
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                          isEnabled ? 'bg-emerald-500/15' : 'bg-muted group-hover:bg-emerald-500/10'
                        )}>
                          <Icon className={cn('size-5 transition-colors', isEnabled ? 'text-emerald-500' : 'text-muted-foreground group-hover:text-emerald-500')} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold truncate">{trigger.name}</h3>
                            {trigger.popular && !isEnabled && (
                              <Badge className="text-[8px] h-3.5 px-1 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">Popular</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{trigger.description}</p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={isEnabled}
                                onCheckedChange={() => {
                                  if (isEnabled) {
                                    handleDisableTrigger(trigger.name);
                                  } else {
                                    handleEnableTrigger(trigger);
                                  }
                                }}
                                className="scale-90 origin-top-right"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {isEnabled ? 'Click to deactivate' : 'Click to enable'}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <div className="mt-3 flex items-center gap-1.5">
                        <div className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                          trigger.categoryColor
                        )}>
                          <CategoryIcon className="size-2.5" />
                          {trigger.category}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <Zap className="size-2.5" />
                          {trigger.eventLabel}
                        </div>
                      </div>

                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {trigger.defaultActions.map((action, idx) => {
                          const ActionIcon = action.icon;
                          return (
                            <div key={idx} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5">
                              <ActionIcon className="size-2.5" />
                              {action.label}
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 pt-2.5 border-t flex items-center justify-between">
                        <span className={cn('text-[10px] font-medium', isEnabled ? 'text-emerald-600' : 'text-muted-foreground')}>
                          {isEnabled ? '✓ Active' : 'Toggle to enable'}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="size-6 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            // Create a new workflow with this trigger
                            setCreateForm({
                              name: trigger.name,
                              triggerType: 'event',
                              description: trigger.description,
                            });
                            setShowCreateDialog(true);
                          }}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Workflow Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Workflow</DialogTitle>
            <DialogDescription>Set up a new automated workflow for your business</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Workflow Name *</Label>
              <Input placeholder="e.g., Lead Follow-up Automation" value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Trigger Type</Label>
              <Select value={createForm.triggerType} onValueChange={v => setCreateForm({ ...createForm, triggerType: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TRIGGER_CONFIG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    return <SelectItem key={key} value={key}><span className="flex items-center gap-2"><Icon className="size-3.5" />{cfg.label}</span></SelectItem>;
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="Describe what this workflow does..." value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!createForm.name.trim() || creating}>
              {creating ? <><Loader2 className="size-4 mr-1.5 animate-spin" /> Creating...</> : 'Create Workflow'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Workflow Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedWorkflow?.name}
              <Badge variant={selectedWorkflow?.active ? 'default' : 'secondary'} className={cn('text-xs', selectedWorkflow?.active ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20' : '')}>
                {selectedWorkflow?.active ? 'Active' : 'Inactive'}
              </Badge>
            </DialogTitle>
            <DialogDescription>{selectedWorkflow?.description || 'No description'}</DialogDescription>
          </DialogHeader>
          {selectedWorkflow && (
            <div className="space-y-4">
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="p-3 text-center">
                  <p className="text-lg font-bold text-blue-600">{selectedWorkflow.executionCount}</p>
                  <p className="text-[10px] text-muted-foreground">Total Runs</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className={cn('text-lg font-bold', selectedWorkflow.successRate >= 90 ? 'text-emerald-600' : selectedWorkflow.successRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                    {selectedWorkflow.successRate > 0 ? `${selectedWorkflow.successRate}%` : 'N/A'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Success Rate</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-lg font-bold">{selectedWorkflow.nodes.length}</p>
                  <p className="text-[10px] text-muted-foreground">Nodes</p>
                </Card>
                <Card className="p-3 text-center">
                  <p className="text-sm font-bold">{selectedWorkflow.lastRunAt ? formatDateTime(selectedWorkflow.lastRunAt) : 'Never'}</p>
                  <p className="text-[10px] text-muted-foreground">Last Run</p>
                </Card>
              </div>

              <Separator />

              {/* Nodes / Flow */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Workflow Nodes</h4>
                <div className="flex items-start gap-3 overflow-x-auto pb-2">
                  {selectedWorkflow.nodes.map((node, idx) => (
                    <div key={node.id} className="flex items-center gap-3">
                      <div className={cn(
                        'flex flex-col items-center gap-1 p-3 rounded-lg border min-w-[120px]',
                        node.type === 'trigger' ? 'bg-violet-50 border-violet-200' :
                        node.type === 'condition' ? 'bg-amber-50 border-amber-200' :
                        node.type === 'delay' ? 'bg-blue-50 border-blue-200' :
                        'bg-emerald-50 border-emerald-200'
                      )}>
                        <span className="text-xs font-medium text-center">{node.name}</span>
                        <Badge variant="outline" className="text-[9px]">{node.type}</Badge>
                      </div>
                      {idx < selectedWorkflow.nodes.length - 1 && (
                        <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Execution History (mock) */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Recent Executions</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedWorkflow.executionCount > 0 ? [
                    { id: 'ex1', status: 'success', time: '2 hours ago', duration: '1.2s' },
                    { id: 'ex2', status: 'success', time: '5 hours ago', duration: '0.8s' },
                    { id: 'ex3', status: 'error', time: '1 day ago', duration: '0.3s' },
                    { id: 'ex4', status: 'success', time: '1 day ago', duration: '1.5s' },
                    { id: 'ex5', status: 'success', time: '2 days ago', duration: '0.9s' },
                  ].map(exec => (
                    <div key={exec.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-xs">
                      <div className="flex items-center gap-2">
                        <span className={cn('size-2 rounded-full', exec.status === 'success' ? 'bg-emerald-500' : 'bg-red-500')} />
                        <span className="capitalize font-medium">{exec.status}</span>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span>{exec.duration}</span>
                        <span>{exec.time}</span>
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No executions yet</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button 
                  className="bg-emerald-600 hover:bg-emerald-700" 
                  onClick={() => { setShowDetailDialog(false); openWorkflow(selectedWorkflow.id); }}
                >
                  <Pencil className="size-4 mr-1.5" /> Edit in Canvas
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => triggerWorkflow(selectedWorkflow.id, selectedWorkflow.name)}
                  disabled={triggeringId === selectedWorkflow.id}
                >
                  {triggeringId === selectedWorkflow.id ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : <Play className="size-4 mr-1.5" />} 
                  Trigger
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => { toggleActive(selectedWorkflow.id, selectedWorkflow.active); setShowDetailDialog(false); }}
                  disabled={togglingId === selectedWorkflow.id}
                >
                  {togglingId === selectedWorkflow.id ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                  {selectedWorkflow.active ? 'Deactivate' : 'Activate'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleSaveWorkflow(selectedWorkflow)}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="size-4 mr-1.5 animate-spin" /> : null}
                  Save
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={renamingId !== null} onOpenChange={(open) => { if (!open) setRenamingId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Workflow</DialogTitle>
            <DialogDescription>Enter a new name for this workflow.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && renamingId) confirmRename(renamingId); }}
            placeholder="Workflow name"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRenamingId(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => renamingId && confirmRename(renamingId)}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
