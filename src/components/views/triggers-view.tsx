'use client';

import { useState, useEffect, useCallback } from 'react';
import { authFetch } from '@/lib/api';
import {
  Zap, Plus, Play, Pause, Trash2, Settings2, Clock,
  Bell, MessageCircle, UserPlus, Briefcase, FileText, Globe,
  ArrowRightLeft, CheckCircle, XCircle, AlertTriangle, Search,
  Webhook, Tag, Send, Mail, Save, Users, UserCheck, CalendarPlus,
  CalendarCheck, CalendarX, CalendarClock, PlayCircle, WifiOff,
  MessageSquarePlus, FileInput, Inbox, CircleCheck, Clock3,
  RefreshCw, Activity, Copy, Sparkles, Filter, X, PlusCircle,
  ArrowRight, Receipt, Banknote, ChevronDown, ChevronUp, ZapOff,
  ShoppingCart, Store, ToggleLeft, ToggleRight, Rocket, Target,
  PhoneCall, MailCheck, CreditCard, Calendar, Bot, Hash,
  MousePointerClick, ExternalLink, Edit3, LogIn, ShieldCheck,
  Timer, AlertCircle, TimerReset, UserCog, DollarSign, FileCheck2,
  FileX2, PhoneOff
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Automation {
  id: string;
  name: string;
  description?: string | null;
  triggerType: string;
  triggerConfigJson: string;
  conditionsJson: string;
  actionsJson: string;
  active: boolean;
  executionCount: number;
  lastExecutedAt: string | null;
  lastExecutionStatus: string | null;
  tagsJson: string;
  createdAt: string;
  updatedAt: string;
}

interface Execution {
  id: string;
  automationId: string;
  triggerEvent: string;
  conditionsMet: boolean;
  status: string;
  error?: string | null;
  durationMs?: number | null;
  createdAt: string;
  automation?: { name: string; triggerType: string };
}

// ─── Import shared catalog instead of duplicating ──────────────────────────────

import { PREBUILT_TRIGGERS, TRIGGER_CATEGORIES, TRIGGER_EVENTS, ACTION_TYPES } from '@/lib/trigger-catalog';
import type { PrebuiltTrigger } from '@/lib/trigger-catalog';

// Re-export PrebuiltTrigger type for local use
type PrebuiltTriggerLocal = PrebuiltTrigger;

// ─── Category config (from shared) ─────────────────────────────────────────────

const CATEGORIES = TRIGGER_CATEGORIES.map(cat => ({
  id: cat.id,
  label: cat.label,
  icon: cat.icon,
  color: cat.color,
}));

// ─── Component ────────────────────────────────────────────────────────────────

export function TriggersView() {
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('catalog');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [selectedPrebuilt, setSelectedPrebuilt] = useState<PrebuiltTrigger | null>(null);
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Custom trigger form
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customTriggerType, setCustomTriggerType] = useState('');
  const [customActions, setCustomActions] = useState<{ type: string; config: Record<string, any> }[]>([]);

  // ─── Fetch data ────────────────────────────────────────────────────────

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await authFetch('/api/triggers');
      if (res.ok) {
        const data = await res.json();
        setAutomations(data.automations || []);
      }
    } catch (err) {
      console.error('Failed to fetch triggers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExecutions = useCallback(async () => {
    try {
      const res = await authFetch('/api/triggers/executions?limit=30');
      if (res.ok) {
        const data = await res.json();
        setExecutions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to fetch executions:', err);
    }
  }, []);

  useEffect(() => {
    fetchAutomations();
    fetchExecutions();
  }, [fetchAutomations, fetchExecutions]);

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleToggleActive = async (automation: Automation) => {
    try {
      const res = await authFetch(`/api/triggers/${automation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !automation.active }),
      });
      if (res.ok) {
        setAutomations(prev =>
          prev.map(a => a.id === automation.id ? { ...a, active: !a.active } : a)
        );
        toast.success(automation.active ? 'Trigger paused' : 'Trigger activated');
      }
    } catch {
      toast.error('Failed to update trigger');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    try {
      const res = await authFetch(`/api/triggers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAutomations(prev => prev.filter(a => a.id !== id));
        toast.success('Trigger deleted');
      }
    } catch {
      toast.error('Failed to delete trigger');
    }
  };

  const handleEnablePrebuilt = async (prebuilt: PrebuiltTrigger, customActions?: any[]) => {
    try {
      const actionsToSave = customActions || prebuilt.defaultActions.map(a => ({ type: a.type, config: a.config }));
      const res = await authFetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: prebuilt.name,
          description: prebuilt.description,
          triggerType: prebuilt.triggerType,
          triggerConfigJson: prebuilt.triggerConfigJson,
          conditionsJson: prebuilt.conditionsJson,
          actionsJson: JSON.stringify(actionsToSave),
          active: true,
        }),
      });
      if (res.ok) {
        const automation = await res.json();
        setAutomations(prev => [automation, ...prev]);
        toast.success(`"${prebuilt.name}" activated!`);
        setSettingsDialogOpen(false);
        setSelectedPrebuilt(null);
        fetchAutomations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to activate trigger');
      }
    } catch {
      toast.error('Failed to activate trigger');
    }
  };

  const handleCreateCustom = async () => {
    if (!customName || !customTriggerType || customActions.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const res = await authFetch('/api/triggers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: customName,
          description: customDescription || `Custom trigger: ${customName}`,
          triggerType: customTriggerType,
          triggerConfigJson: '{}',
          conditionsJson: '[]',
          actionsJson: JSON.stringify(customActions),
          active: true,
        }),
      });
      if (res.ok) {
        const automation = await res.json();
        setAutomations(prev => [automation, ...prev]);
        toast.success(`Custom trigger "${customName}" created!`);
        setCustomDialogOpen(false);
        resetCustomForm();
        fetchAutomations();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to create custom trigger');
      }
    } catch {
      toast.error('Failed to create custom trigger');
    }
  };

  const resetCustomForm = () => {
    setCustomName('');
    setCustomDescription('');
    setCustomTriggerType('');
    setCustomActions([]);
  };

  const addCustomAction = (type: string) => {
    const defaultConfigs: Record<string, Record<string, any>> = {
      send_whatsapp: { recipient: 'customer', template: '' },
      send_notification: { title: '', message: '' },
      send_email: { to: '', subject: '', body: '' },
      create_task: { title: '', assignTo: 'round_robin' },
      create_job: { title: '' },
      assign_user: { assignTo: 'round_robin' },
      add_tag: { tag: '' },
      update_record: { recordType: 'lead', field: '', value: '' },
      move_pipeline: { stage: 'contacted' },
      call_webhook: { url: '', method: 'POST' },
    };
    setCustomActions(prev => [...prev, { type, config: defaultConfigs[type] || {} }]);
  };

  const removeCustomAction = (index: number) => {
    setCustomActions(prev => prev.filter((_, i) => i !== index));
  };

  // ─── Filtering ─────────────────────────────────────────────────────────

  const isPrebuiltEnabled = (prebuiltId: string) => {
    return automations.some(a => a.name === PREBUILT_TRIGGERS.find(p => p.id === prebuiltId)?.name);
  };

  const getEnabledAutomation = (prebuiltId: string) => {
    const prebuilt = PREBUILT_TRIGGERS.find(p => p.id === prebuiltId);
    return automations.find(a => a.name === prebuilt?.name);
  };

  const activeCategoryLabel = CATEGORIES.find(c => c.id === activeCategory)?.label;

  const filteredPrebuilts = PREBUILT_TRIGGERS.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategoryLabel;
    const matchesSearch = !searchQuery ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.eventLabel.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const myAutomations = automations.filter(a => {
    const prebuiltCategory = PREBUILT_TRIGGERS.find(p => p.name === a.name)?.category;
    const matchesCategory = activeCategory === 'all' || prebuiltCategory === activeCategoryLabel;
    const matchesSearch = !searchQuery ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (a.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const activeCount = automations.filter(a => a.active).length;
  const popularTriggers = PREBUILT_TRIGGERS.filter(t => t.popular);
  const enabledCount = PREBUILT_TRIGGERS.filter(t => isPrebuiltEnabled(t.id)).length;

  // ─── Render ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="size-8 animate-spin text-emerald-500" />
          <span className="text-muted-foreground text-sm">Loading triggers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Zap className="size-5 text-emerald-500" />
            </div>
            CRM Triggers
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {PREBUILT_TRIGGERS.length} pre-built automations — toggle to enable, or build your own
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Search triggers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 w-48"
            />
          </div>
          <Badge variant="outline" className="h-9 px-3 gap-1.5 text-xs border-emerald-500/30 text-emerald-600">
            <CircleCheck className="size-3.5" />
            {activeCount} Active
          </Badge>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setCustomDialogOpen(true)}
          >
            <Plus className="size-3.5" />
            Custom
          </Button>
        </div>
      </div>

      {/* ─── Stats Bar ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Zap className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{PREBUILT_TRIGGERS.length}</p>
                <p className="text-[10px] text-muted-foreground">Available Triggers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <CircleCheck className="size-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{activeCount}</p>
                <p className="text-[10px] text-muted-foreground">Active Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Store className="size-4 text-blue-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{enabledCount}</p>
                <p className="text-[10px] text-muted-foreground">From Library</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/15 flex items-center justify-center">
                <Activity className="size-4 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">{automations.reduce((s, a) => s + a.executionCount, 0)}</p>
                <p className="text-[10px] text-muted-foreground">Total Runs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Popular Quick-Enable Row ────────────────────────────────────── */}
      {activeCategory === 'all' && !searchQuery && activeTab === 'catalog' && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Rocket className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold">Most Popular</span>
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{popularTriggers.length}</Badge>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {popularTriggers.map((trigger) => {
              const isEnabled = isPrebuiltEnabled(trigger.id);
              const automation = getEnabledAutomation(trigger.id);
              const Icon = trigger.icon;
              return (
                <Card
                  key={trigger.id}
                  className={cn(
                    'shrink-0 w-64 transition-all hover:shadow-md border',
                    isEnabled ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border hover:border-emerald-500/20'
                  )}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'size-8 rounded-lg flex items-center justify-center shrink-0',
                        isEnabled ? 'bg-emerald-500/15' : 'bg-muted'
                      )}>
                        <Icon className={cn('size-4', isEnabled ? 'text-emerald-500' : 'text-muted-foreground')} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold truncate">{trigger.name}</h4>
                        <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">{trigger.description}</p>
                      </div>
                      <Switch
                        checked={isEnabled ? (automation?.active ?? true) : false}
                        onCheckedChange={() => {
                          if (isEnabled && automation) {
                            handleToggleActive(automation);
                          } else {
                            handleEnablePrebuilt(trigger);
                          }
                        }}
                        className="scale-75 origin-right"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Category Pills ──────────────────────────────────────────────── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const count = cat.id === 'all'
            ? PREBUILT_TRIGGERS.length
            : PREBUILT_TRIGGERS.filter(p => p.category === cat.label).length;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all shrink-0',
                activeCategory === cat.id
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/10'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted border border-transparent'
              )}
            >
              <Icon className="size-3" />
              {cat.label}
              <span className={cn(
                'text-[9px] font-semibold',
                activeCategory === cat.id ? 'text-emerald-500' : 'text-muted-foreground'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── Main Tabs ───────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalog" className="gap-1.5">
            <Store className="size-3.5" />
            Trigger Library
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{PREBUILT_TRIGGERS.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="my" className="gap-1.5">
            <Zap className="size-3.5" />
            My Triggers
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{automations.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <Activity className="size-3.5" />
            Execution Log
          </TabsTrigger>
        </TabsList>

        {/* ─── Catalog Tab ──────────────────────────────────────────────── */}
        <TabsContent value="catalog" className="mt-4">
          {filteredPrebuilts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No triggers found</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Try adjusting your search or category filter
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPrebuilts.map((trigger) => {
                const isEnabled = isPrebuiltEnabled(trigger.id);
                const automation = getEnabledAutomation(trigger.id);
                const isActive = automation?.active ?? false;
                const isExpanded = expandedCard === trigger.id;
                const Icon = trigger.icon;
                const CategoryIcon = CATEGORIES.find(c => c.label === trigger.category)?.icon || Zap;

                return (
                  <Card
                    key={trigger.id}
                    className={cn(
                      'group transition-all hover:shadow-md border',
                      isEnabled && isActive
                        ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
                        : isEnabled
                        ? 'border-amber-500/20 bg-amber-500/[0.02]'
                        : 'border-border hover:border-emerald-500/20'
                    )}
                  >
                    <CardContent className="p-4">
                      {/* Top row: icon + name + toggle */}
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'size-10 rounded-xl flex items-center justify-center shrink-0 transition-colors',
                          isEnabled && isActive
                            ? 'bg-emerald-500/15'
                            : isEnabled
                            ? 'bg-amber-500/15'
                            : 'bg-muted group-hover:bg-emerald-500/10'
                        )}>
                          <Icon className={cn(
                            'size-5 transition-colors',
                            isEnabled && isActive ? 'text-emerald-500' : isEnabled ? 'text-amber-500' : 'text-muted-foreground group-hover:text-emerald-500'
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold truncate">{trigger.name}</h3>
                            {trigger.popular && !isEnabled && (
                              <Badge className="text-[8px] h-3.5 px-1 bg-emerald-500/20 text-emerald-600 border-emerald-500/30">
                                Popular
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                            {trigger.description}
                          </p>
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={isEnabled ? isActive : false}
                                onCheckedChange={() => {
                                  if (isEnabled && automation) {
                                    handleToggleActive(automation);
                                  } else {
                                    handleEnablePrebuilt(trigger);
                                  }
                                }}
                                className="scale-90 origin-top-right"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            {isEnabled ? (isActive ? 'Click to pause' : 'Click to activate') : 'Click to enable'}
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      {/* Event source badge */}
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

                      {/* Actions preview */}
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {trigger.defaultActions.map((action, idx) => {
                          const ActionIcon = action.icon;
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 rounded-md px-1.5 py-0.5"
                            >
                              <ActionIcon className="size-2.5" />
                              {action.label}
                            </div>
                          );
                        })}
                      </div>

                      {/* Expanded: status + settings */}
                      {isExpanded && isEnabled && automation && (
                        <div className="mt-3 pt-3 border-t space-y-2">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Activity className="size-3" />
                              {automation.executionCount} runs
                            </span>
                            {automation.lastExecutedAt && (
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {new Date(automation.lastExecutedAt).toLocaleDateString()}
                              </span>
                            )}
                            {automation.lastExecutionStatus && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[8px] h-3.5 px-1',
                                  automation.lastExecutionStatus === 'success' && 'text-emerald-600 border-emerald-500/30',
                                  automation.lastExecutionStatus === 'failed' && 'text-red-600 border-red-500/30',
                                  automation.lastExecutionStatus === 'partial' && 'text-amber-600 border-amber-500/30',
                                )}
                              >
                                {automation.lastExecutionStatus}
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bottom row */}
                      <div className="mt-3 pt-2.5 border-t flex items-center justify-between">
                        <button
                          onClick={() => setExpandedCard(isExpanded ? null : trigger.id)}
                          className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                          {isExpanded ? 'Less' : 'Details'}
                        </button>
                        <div className="flex items-center gap-1">
                          {isEnabled && automation ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setSelectedAutomation(automation);
                                      setSelectedPrebuilt(trigger);
                                      setSettingsDialogOpen(true);
                                    }}
                                  >
                                    <Settings2 className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Settings</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="size-6 p-0 text-muted-foreground hover:text-red-500"
                                    onClick={() => handleDelete(automation.id)}
                                  >
                                    <Trash2 className="size-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <span className="text-[10px] text-emerald-500 font-medium">Toggle to enable →</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* ─── Custom Trigger Card ──────────────────────────────────── */}
              <Card
                className="group transition-all hover:shadow-md border-dashed border-2 border-muted-foreground/20 hover:border-emerald-500/30 cursor-pointer"
                onClick={() => setCustomDialogOpen(true)}
              >
                <CardContent className="p-4 flex flex-col items-center justify-center min-h-[200px] gap-3">
                  <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Plus className="size-6 text-emerald-500" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-semibold">Build Custom Trigger</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Can&apos;t find what you need? Create a custom automation from scratch
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/30 text-emerald-600">
                    <Sparkles className="size-2.5 mr-1" />
                    Custom
                  </Badge>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ─── My Triggers Tab ───────────────────────────────────────────── */}
        <TabsContent value="my" className="mt-4">
          {myAutomations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <ZapOff className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No active triggers yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Browse the Trigger Library and toggle to enable automations
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setActiveTab('catalog')}
                >
                  <Store className="size-3.5" />
                  Browse Library
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {myAutomations.map((automation) => {
                const matchingPrebuilt = PREBUILT_TRIGGERS.find(p => p.name === automation.name);
                const Icon = matchingPrebuilt?.icon || Zap;
                const category = matchingPrebuilt?.category;
                const CategoryIcon = category ? CATEGORIES.find(c => c.label === category)?.icon : null;
                const categoryColor = matchingPrebuilt?.categoryColor || 'bg-muted text-muted-foreground border-border';

                return (
                  <Card key={automation.id} className={cn(
                    'transition-all border',
                    automation.active ? 'border-emerald-500/20' : 'border-border opacity-60'
                  )}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={cn(
                        'size-9 rounded-lg flex items-center justify-center shrink-0',
                        automation.active ? 'bg-emerald-500/15' : 'bg-muted'
                      )}>
                        <Icon className={cn('size-4', automation.active ? 'text-emerald-500' : 'text-muted-foreground')} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold truncate">{automation.name}</h4>
                          {category && CategoryIcon && (
                            <div className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium border', categoryColor)}>
                              <CategoryIcon className="size-2" />
                              {category}
                            </div>
                          )}
                          {!matchingPrebuilt && (
                            <Badge variant="outline" className="text-[9px] h-4 border-amber-500/30 text-amber-600">
                              Custom
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                          {automation.description || `Trigger: ${automation.triggerType}`}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="hidden sm:flex items-center gap-3 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Activity className="size-3" />
                            {automation.executionCount}
                          </span>
                          {automation.lastExecutedAt && (
                            <span className="flex items-center gap-1">
                              <Clock className="size-3" />
                              {new Date(automation.lastExecutedAt).toLocaleDateString()}
                            </span>
                          )}
                          {automation.lastExecutionStatus && (
                            <Badge variant="outline" className={cn(
                              'text-[8px] h-3.5 px-1',
                              automation.lastExecutionStatus === 'success' && 'text-emerald-600 border-emerald-500/30',
                              automation.lastExecutionStatus === 'failed' && 'text-red-600 border-red-500/30',
                            )}>
                              {automation.lastExecutionStatus}
                            </Badge>
                          )}
                        </div>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <Switch
                                checked={automation.active}
                                onCheckedChange={() => handleToggleActive(automation)}
                                className="scale-90"
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{automation.active ? 'Pause' : 'Activate'}</TooltipContent>
                        </Tooltip>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="size-7 p-0">
                              <Settings2 className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setSelectedAutomation(automation);
                              setSettingsDialogOpen(true);
                            }}>
                              <Settings2 className="size-3.5 mr-2" />
                              Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDelete(automation.id)} className="text-red-600 focus:text-red-600">
                              <Trash2 className="size-3.5 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── Execution Log Tab ──────────────────────────────────────────── */}
        <TabsContent value="logs" className="mt-4">
          {executions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
                <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                  <Activity className="size-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <h3 className="font-semibold text-lg">No executions yet</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Enable some triggers and they will start logging executions here
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {executions.map((exec) => (
                <Card key={exec.id}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={cn(
                      'size-8 rounded-lg flex items-center justify-center shrink-0',
                      exec.status === 'success' ? 'bg-emerald-500/15' :
                      exec.status === 'failed' ? 'bg-red-500/15' :
                      'bg-amber-500/15'
                    )}>
                      {exec.status === 'success' ? <CheckCircle className="size-4 text-emerald-500" /> :
                       exec.status === 'failed' ? <XCircle className="size-4 text-red-500" /> :
                       <Clock className="size-4 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium truncate">
                        {exec.automation?.name || exec.triggerEvent}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {exec.triggerEvent} • {new Date(exec.createdAt).toLocaleString()}
                        {exec.durationMs && ` • ${exec.durationMs}ms`}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn(
                      'text-[9px] h-5 px-1.5',
                      exec.status === 'success' && 'text-emerald-600 border-emerald-500/30',
                      exec.status === 'failed' && 'text-red-600 border-red-500/30',
                      exec.status === 'partial' && 'text-amber-600 border-amber-500/30',
                    )}>
                      {exec.status}
                    </Badge>
                    {exec.conditionsMet === false && (
                      <Badge variant="outline" className="text-[9px] h-5 px-1.5 text-muted-foreground">
                        Skipped
                      </Badge>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─── Settings Dialog ──────────────────────────────────────────────── */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="size-4" />
              Trigger Settings
            </DialogTitle>
            <DialogDescription>
              {selectedPrebuilt?.name || selectedAutomation?.name}
            </DialogDescription>
          </DialogHeader>

          {selectedPrebuilt && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">DEFAULT ACTIONS</h4>
                <div className="space-y-2">
                  {selectedPrebuilt.defaultActions.map((action, idx) => {
                    const ActionIcon = action.icon;
                    return (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                        <div className="size-7 rounded-md bg-background flex items-center justify-center">
                          <ActionIcon className="size-3.5 text-emerald-500" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium">{action.label}</p>
                          <p className="text-[10px] text-muted-foreground">{action.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">EVENT SOURCE</h4>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Zap className="size-3.5 text-emerald-500" />
                  <span className="text-xs">{selectedPrebuilt.eventLabel}</span>
                  <span className="text-[10px] text-muted-foreground">({selectedPrebuilt.eventSource})</span>
                </div>
              </div>
            </div>
          )}

          {selectedAutomation && !selectedPrebuilt && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">TRIGGER TYPE</h4>
                <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                  <Zap className="size-3.5 text-emerald-500" />
                  <span className="text-xs">{selectedAutomation.triggerType}</span>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground mb-2">STATUS</h4>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={selectedAutomation.active}
                    onCheckedChange={() => {
                      handleToggleActive(selectedAutomation);
                      setSelectedAutomation({ ...selectedAutomation, active: !selectedAutomation.active });
                    }}
                  />
                  <span className="text-xs">{selectedAutomation.active ? 'Active' : 'Paused'}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Close
            </Button>
            {selectedPrebuilt && !isPrebuiltEnabled(selectedPrebuilt.id) && (
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleEnablePrebuilt(selectedPrebuilt)}
              >
                Enable Trigger
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Custom Trigger Builder Dialog ────────────────────────────────── */}
      <Dialog open={customDialogOpen} onOpenChange={(open) => {
        setCustomDialogOpen(open);
        if (!open) resetCustomForm();
      }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-emerald-500" />
              Build Custom Trigger
            </DialogTitle>
            <DialogDescription>
              Create a custom automation by selecting an event trigger and actions
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Trigger Name *</label>
              <Input
                placeholder="e.g., High Value Lead → Priority Alert"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Description</label>
              <Textarea
                placeholder="What does this trigger do?"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Event Trigger */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">When this happens... *</label>
              <Select value={customTriggerType} onValueChange={setCustomTriggerType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an event trigger" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(
                    TRIGGER_EVENTS.reduce((groups, event) => {
                      const key = event.category;
                      if (!groups[key]) groups[key] = [];
                      groups[key].push(event);
                      return groups;
                    }, {} as Record<string, typeof TRIGGER_EVENTS>)
                  ).map(([category, events]) => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                        {category}
                      </div>
                      {events.map(event => (
                        <SelectItem key={event.value} value={event.value}>
                          {event.label}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold">Then do this... *</label>

              {customActions.length > 0 && (
                <div className="space-y-2">
                  {customActions.map((action, idx) => {
                    const actionDef = ACTION_TYPES.find(a => a.value === action.type);
                    return (
                      <div key={idx} className="p-2.5 rounded-lg border bg-muted/30 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {actionDef && <actionDef.icon className="size-3.5 text-emerald-500" />}
                            <span className="text-xs font-medium">{actionDef?.label || action.type}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-6 p-0 text-muted-foreground hover:text-red-500"
                            onClick={() => removeCustomAction(idx)}
                          >
                            <X className="size-3" />
                          </Button>
                        </div>

                        {/* Action-specific config fields */}
                        {action.type === 'send_whatsapp' && (
                          <div className="space-y-1.5">
                            <Select value={action.config.recipient || 'customer'} onValueChange={(v) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, recipient: v } };
                              setCustomActions(updated);
                            }}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue placeholder="Recipient" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="employee">Employee</SelectItem>
                              </SelectContent>
                            </Select>
                            <Input
                              placeholder="Message template"
                              value={action.config.template || ''}
                              onChange={(e) => {
                                const updated = [...customActions];
                                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, template: e.target.value } };
                                setCustomActions(updated);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        )}

                        {action.type === 'send_notification' && (
                          <div className="space-y-1.5">
                            <Input
                              placeholder="Title"
                              value={action.config.title || ''}
                              onChange={(e) => {
                                const updated = [...customActions];
                                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, title: e.target.value } };
                                setCustomActions(updated);
                              }}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder="Message"
                              value={action.config.message || ''}
                              onChange={(e) => {
                                const updated = [...customActions];
                                updated[idx] = { ...updated[idx], config: { ...updated[idx].config, message: e.target.value } };
                                setCustomActions(updated);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                        )}

                        {action.type === 'create_task' && (
                          <Input
                            placeholder="Task title"
                            value={action.config.title || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, title: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'create_job' && (
                          <Input
                            placeholder="Job title"
                            value={action.config.title || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, title: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'add_tag' && (
                          <Input
                            placeholder="Tag name"
                            value={action.config.tag || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, tag: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'assign_user' && (
                          <Select value={action.config.assignTo || 'round_robin'} onValueChange={(v) => {
                            const updated = [...customActions];
                            updated[idx] = { ...updated[idx], config: { ...updated[idx].config, assignTo: v } };
                            setCustomActions(updated);
                          }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Assign to" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="round_robin">Round Robin</SelectItem>
                              <SelectItem value="lead_owner">Lead Owner</SelectItem>
                              <SelectItem value="specific">Specific User</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {action.type === 'call_webhook' && (
                          <Input
                            placeholder="Webhook URL"
                            value={action.config.url || ''}
                            onChange={(e) => {
                              const updated = [...customActions];
                              updated[idx] = { ...updated[idx], config: { ...updated[idx].config, url: e.target.value } };
                              setCustomActions(updated);
                            }}
                            className="h-7 text-xs"
                          />
                        )}

                        {action.type === 'move_pipeline' && (
                          <Select value={action.config.stage || 'contacted'} onValueChange={(v) => {
                            const updated = [...customActions];
                            updated[idx] = { ...updated[idx], config: { ...updated[idx].config, stage: v } };
                            setCustomActions(updated);
                          }}>
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Target stage" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New</SelectItem>
                              <SelectItem value="contacted">Contacted</SelectItem>
                              <SelectItem value="qualified">Qualified</SelectItem>
                              <SelectItem value="proposal">Proposal</SelectItem>
                              <SelectItem value="won">Won</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <Select onValueChange={addCustomAction}>
                <SelectTrigger className="h-8 text-xs border-dashed">
                  <SelectValue placeholder="+ Add an action" />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map(actionType => {
                    const ActionIcon = actionType.icon;
                    return (
                      <SelectItem key={actionType.value} value={actionType.value}>
                        <div className="flex items-center gap-2">
                          <ActionIcon className="size-3.5" />
                          {actionType.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCustomDialogOpen(false);
              resetCustomForm();
            }}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={handleCreateCustom}
              disabled={!customName || !customTriggerType || customActions.length === 0}
            >
              <Zap className="size-3.5" />
              Create Trigger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
