'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bot, Plus, Search, Play, Pause, Eye, Settings, Trash2,
  MessageSquare, GitBranch, Zap, Clock, User, Globe,
  ArrowRight, Sparkles, List, Send,
  TrendingUp, Timer, Pencil, MoreVertical, RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { authFetch } from '@/lib/client-auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ViewHeader } from '@/components/shared/view-header';
import { EmptyState } from '@/components/shared/empty-state';
import { StatCard } from '@/components/shared/stat-card';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ChatbotNode {
  id: string;
  type: string;
  label: string;
  config: string;
  x: number;
  y: number;
  connections: string[];
}

interface Chatbot {
  id: string;
  name: string;
  description: string | null;
  status: string;
  triggerType: string;
  triggerConfigJson: string;
  nodesJson: string;
  edgesJson: string;
  startNodeId: string | null;
  fallbackNodeId: string | null;
  isDefault: boolean;
  totalSessions: number;
  activeSessions: number;
  completionRate: number;
  tenantId: string | null;
  workspaceId: string | null;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChatbotForm {
  name: string;
  description: string;
  triggerType: string;
  triggerConfigJson: string;
  status: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const NODE_TYPES = [
  { value: 'message', label: 'Message', icon: MessageSquare, color: 'bg-teal-100 text-teal-700 border-teal-300' },
  { value: 'buttons', label: 'Buttons', icon: List, color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'list_menu', label: 'List Menu', icon: List, color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'ai_response', label: 'AI Response', icon: Sparkles, color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { value: 'api_call', label: 'API Call', icon: Globe, color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { value: 'webhook', label: 'Webhook', icon: Zap, color: 'bg-pink-100 text-pink-700 border-pink-300' },
  { value: 'delay', label: 'Delay', icon: Clock, color: 'bg-slate-100 text-slate-700 border-slate-300' },
  { value: 'human_handover', label: 'Human Handover', icon: User, color: 'bg-red-100 text-red-700 border-red-300' },
];

const TRIGGER_TYPES = [
  { value: 'keyword', label: 'Keyword' },
  { value: 'all_messages', label: 'All Messages' },
  { value: 'new_conversation', label: 'New Conversation' },
  { value: 'no_agent_response', label: 'No Agent Response' },
];

const FLOW_EXAMPLES = [
  { name: 'Lead Capture', nodes: ['message', 'buttons', 'condition', 'ai_response'] },
  { name: 'Appointment Booking', nodes: ['message', 'list_menu', 'api_call', 'message'] },
  { name: 'Quote Request', nodes: ['message', 'buttons', 'ai_response', 'human_handover'] },
  { name: 'Support FAQ', nodes: ['message', 'list_menu', 'condition', 'ai_response'] },
  { name: 'Job Status Tracking', nodes: ['message', 'buttons', 'api_call', 'message'] },
];

const DEFAULT_FORM: ChatbotForm = {
  name: '',
  description: '',
  triggerType: 'keyword',
  triggerConfigJson: '{"keywords": ["hi", "hello", "help"]}',
  status: 'draft',
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTriggerLabel(value: string) {
  return TRIGGER_TYPES.find(t => t.value === value)?.label || value;
}

function getNodeStyle(type: string) {
  return NODE_TYPES.find(n => n.value === type) || NODE_TYPES[0];
}

function parseNodes(nodesJson: string): ChatbotNode[] {
  try {
    return JSON.parse(nodesJson || '[]');
  } catch {
    return [];
  }
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  } catch {
    return '--';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ChatbotBuilderView() {
  const [chatbots, setChatbots] = useState<Chatbot[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedBot, setSelectedBot] = useState<Chatbot | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [previewMessages, setPreviewMessages] = useState<{ sender: 'bot' | 'user'; text: string }[]>([]);
  const [previewInput, setPreviewInput] = useState('');
  const [selectedNode, setSelectedNode] = useState<ChatbotNode | null>(null);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [deletingBot, setDeletingBot] = useState<Chatbot | null>(null);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState<ChatbotForm>(DEFAULT_FORM);
  const [createTemplate, setCreateTemplate] = useState('');

  // ─── Fetch chatbots ─────────────────────────────────────────────────────
  const fetchChatbots = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/chatbots');
      if (res.ok) {
        const json = await res.json();
        setChatbots(Array.isArray(json) ? json : json.data || []);
      }
    } catch {
      setChatbots([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChatbots();
  }, [fetchChatbots]);

  // ─── Filtered list ──────────────────────────────────────────────────────
  const filteredBots = chatbots.filter(b => {
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    return true;
  });

  // ─── Stats ──────────────────────────────────────────────────────────────
  const stats = {
    activeBots: chatbots.filter(b => b.status === 'active').length,
    conversationsToday: chatbots.reduce((s, b) => s + b.activeSessions, 0),
    avgCompletionRate: chatbots.filter(b => b.completionRate > 0).length > 0
      ? Math.round(chatbots.filter(b => b.completionRate > 0).reduce((s, b) => s + b.completionRate, 0) / chatbots.filter(b => b.completionRate > 0).length)
      : 0,
    totalSessions: chatbots.reduce((s, b) => s + b.totalSessions, 0),
  };

  // ─── Toggle status ──────────────────────────────────────────────────────
  const handleToggle = async (id: string) => {
    const bot = chatbots.find(b => b.id === id);
    if (!bot) return;
    setTogglingId(id);
    const newStatus = bot.status === 'active' ? 'paused' : 'active';
    try {
      const res = await authFetch(`/api/chatbots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Chatbot ${newStatus === 'active' ? 'activated' : 'paused'}`);
        fetchChatbots();
        // Update selectedBot if it's the one being toggled
        if (selectedBot?.id === id) {
          setSelectedBot(prev => prev ? { ...prev, status: newStatus } : null);
        }
      } else {
        toast.error('Failed to update status');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingId(null);
    }
  };

  // ─── Create ─────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!form.name) { toast.error('Bot name is required'); return; }
    setSaving(true);
    try {
      const templateFlow = FLOW_EXAMPLES.find(f => f.name === createTemplate);
      const nodes: ChatbotNode[] = (templateFlow?.nodes || ['message', 'buttons', 'ai_response']).map((type, i) => ({
        id: `n-${i}`,
        type: type as ChatbotNode['type'],
        label: NODE_TYPES.find(n => n.value === type)?.label || type,
        config: '',
        x: 50 + i * 200,
        y: 50,
        connections: i < ((templateFlow?.nodes.length || 3) - 1) ? [`n-${i + 1}`] : [],
      }));

      const res = await authFetch('/api/chatbots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          nodesJson: JSON.stringify(nodes),
          edgesJson: '[]',
          startNodeId: nodes[0]?.id || null,
        }),
      });
      if (res.ok) {
        toast.success('Chatbot created');
        setShowCreateDialog(false);
        setForm(DEFAULT_FORM);
        setCreateTemplate('');
        fetchChatbots();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to create chatbot');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Edit ───────────────────────────────────────────────────────────────
  const openEdit = (bot: Chatbot) => {
    setSelectedBot(bot);
    setForm({
      name: bot.name,
      description: bot.description || '',
      triggerType: bot.triggerType,
      triggerConfigJson: bot.triggerConfigJson || '{}',
      status: bot.status,
    });
    setShowEditDialog(true);
  };

  const handleEdit = async () => {
    if (!selectedBot || !form.name) { toast.error('Bot name is required'); return; }
    setSaving(true);
    try {
      const res = await authFetch(`/api/chatbots/${selectedBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast.success('Chatbot updated');
        setShowEditDialog(false);
        fetchChatbots();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to update chatbot');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────
  const openDelete = (bot: Chatbot) => {
    setDeletingBot(bot);
    setShowDeleteDialog(true);
  };

  const handleDelete = async () => {
    if (!deletingBot) return;
    setSaving(true);
    try {
      const res = await authFetch(`/api/chatbots/${deletingBot.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Chatbot deleted');
        setShowDeleteDialog(false);
        setDeletingBot(null);
        if (selectedBot?.id === deletingBot.id) {
          setSelectedBot(null);
          setShowDetailDialog(false);
        }
        fetchChatbots();
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to delete chatbot');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Preview ────────────────────────────────────────────────────────────
  const handlePreview = (bot: Chatbot) => {
    setSelectedBot(bot);
    const nodes = parseNodes(bot.nodesJson);
    const firstNode = nodes[0];
    let triggerConfig: Record<string, unknown> = {};
    try { triggerConfig = JSON.parse(bot.triggerConfigJson || '{}'); } catch { /* ignore */ }

    const welcomeMsg = firstNode?.config || (typeof triggerConfig.message === 'string' ? triggerConfig.message : `Hi! Welcome to ${bot.name}.`);
    setPreviewMessages([{ sender: 'bot', text: welcomeMsg }]);
    setShowPreviewDialog(true);
  };

  const handlePreviewSend = () => {
    if (!previewInput.trim()) return;
    setPreviewMessages(prev => [...prev, { sender: 'user', text: previewInput }]);
    setTimeout(() => {
      setPreviewMessages(prev => [...prev, { sender: 'bot', text: 'Thanks for your message! This is a simulated response from the chatbot preview.' }]);
    }, 500);
    setPreviewInput('');
  };

  // ─── Update node config (saves to API) ──────────────────────────────────
  const handleNodeConfigChange = async (nodeId: string, config: string) => {
    if (!selectedBot) return;
    const nodes = parseNodes(selectedBot.nodesJson);
    const updatedNodes = nodes.map(n => n.id === nodeId ? { ...n, config } : n);

    // Optimistic update
    setSelectedBot(prev => prev ? { ...prev, nodesJson: JSON.stringify(updatedNodes) } : null);

    try {
      await authFetch(`/api/chatbots/${selectedBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodesJson: JSON.stringify(updatedNodes) }),
      });
    } catch {
      toast.error('Failed to save node config');
    }
  };

  // ─── Open detail ────────────────────────────────────────────────────────
  const openDetail = (bot: Chatbot) => {
    setSelectedBot(bot);
    setShowDetailDialog(true);
    setSelectedNode(null);
    setShowNodeConfig(false);
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <ViewHeader
        icon={Bot}
        title="Chatbot Builder"
        description="Design and manage WhatsApp chatbots"
        action={
          <Button className="bg-emerald-600 hover:bg-emerald-700 min-h-[44px]" onClick={() => { setForm(DEFAULT_FORM); setCreateTemplate(''); setShowCreateDialog(true); }}>
            <Plus className="size-4 mr-1.5" /> Create Chatbot
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <StatCard label="Active Bots" value={stats.activeBots} icon={Bot} color="text-emerald-600" />
        <StatCard label="Active Sessions" value={stats.conversationsToday} icon={MessageSquare} color="text-teal-600" />
        <StatCard label="Completion Rate" value={`${stats.avgCompletionRate}%`} icon={TrendingUp} color="text-amber-600" />
        <StatCard label="Total Sessions" value={stats.totalSessions.toLocaleString()} icon={Timer} color="text-orange-600" />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="paused" className="text-xs">Paused</TabsTrigger>
            <TabsTrigger value="draft" className="text-xs">Draft</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search chatbots..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchChatbots()}>
          <RefreshCw className="size-3.5 mr-1" /> Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredBots.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No chatbots found"
          description={search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first chatbot to automate WhatsApp conversations'}
          actionLabel={!search && statusFilter === 'all' ? 'Create Chatbot' : undefined}
          onAction={!search && statusFilter === 'all' ? () => { setForm(DEFAULT_FORM); setCreateTemplate(''); setShowCreateDialog(true); } : undefined}
        />
      ) : (
        /* Chatbot Cards */
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredBots.map(bot => {
            const nodes = parseNodes(bot.nodesJson);
            let triggerConfig: Record<string, unknown> = {};
            try { triggerConfig = JSON.parse(bot.triggerConfigJson || '{}'); } catch { /* ignore */ }
            const keywords = Array.isArray(triggerConfig.keywords) ? triggerConfig.keywords.join(', ') : '';

            return (
              <Card key={bot.id} className="hover:shadow-md transition-all">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{bot.name}</h4>
                      <Badge variant="outline" className={cn(
                        'text-[10px] mt-1 gap-1',
                        bot.status === 'active' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        bot.status === 'paused' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      )}>
                        {bot.status === 'active' && <span className="relative flex size-1.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full size-1.5 bg-emerald-500" /></span>}
                        {bot.status}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handlePreview(bot)}><Eye className="size-3.5" /></Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="size-3.5" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(bot)}><Pencil className="size-3.5 mr-2" /> Edit Settings</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDetail(bot)}><Settings className="size-3.5 mr-2" /> Builder</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggle(bot.id)} disabled={togglingId === bot.id}>
                            {togglingId === bot.id ? <RefreshCw className="size-3.5 mr-2 animate-spin" /> :
                              bot.status === 'active' ? <Pause className="size-3.5 mr-2" /> : <Play className="size-3.5 mr-2" />
                            }
                            {bot.status === 'active' ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => openDelete(bot)}>
                            <Trash2 className="size-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Trigger info */}
                  <div className="flex items-center gap-1 text-xs">
                    <Zap className="size-3 text-amber-500" />
                    <span className="text-muted-foreground">Trigger:</span>
                    <Badge variant="outline" className="text-[9px] h-4">{getTriggerLabel(bot.triggerType)}</Badge>
                    {keywords && (
                      <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono ml-1">{keywords}</code>
                    )}
                  </div>

                  {/* Performance stats */}
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div>
                      <p className="text-sm font-bold text-teal-600">{bot.totalSessions.toLocaleString()}</p>
                      <p className="text-[9px] text-muted-foreground">Sessions</p>
                    </div>
                    <div>
                      <p className={cn('text-sm font-bold', bot.completionRate >= 75 ? 'text-emerald-600' : bot.completionRate >= 50 ? 'text-amber-600' : 'text-red-600')}>
                        {bot.completionRate > 0 ? `${Math.round(bot.completionRate)}%` : '-'}
                      </p>
                      <p className="text-[9px] text-muted-foreground">Completion</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-emerald-600">{bot.activeSessions}</p>
                      <p className="text-[9px] text-muted-foreground">Active</p>
                    </div>
                  </div>

                  {/* Node badges */}
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    {nodes.slice(0, 5).map(node => {
                      const nodeType = getNodeStyle(node.type);
                      const Icon = nodeType.icon;
                      return (
                        <Badge key={node.id} variant="outline" className={`${nodeType.color} text-[9px] h-5`}>
                          <Icon className="size-2.5 mr-0.5" />{node.label}
                        </Badge>
                      );
                    })}
                    {nodes.length > 5 && <Badge variant="secondary" className="text-[9px] h-5">+{nodes.length - 5}</Badge>}
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 min-h-[36px] text-xs" onClick={() => openDetail(bot)}>
                      <Settings className="size-3 mr-1" /> Builder
                    </Button>
                    <Button variant="outline" size="sm" className="min-h-[36px] px-3 text-xs" onClick={() => handleToggle(bot.id)} disabled={togglingId === bot.id}>
                      {togglingId === bot.id ? <RefreshCw className="size-3 animate-spin" /> :
                        bot.status === 'active' ? <Pause className="size-3" /> : <Play className="size-3" />
                      }
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail / Builder Dialog */}
      {selectedBot && showDetailDialog && (
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedBot.name}
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  selectedBot.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                  selectedBot.status === 'paused' ? 'bg-slate-100 text-slate-600' :
                  'bg-amber-100 text-amber-700'
                )}>
                  {selectedBot.status}
                </Badge>
              </DialogTitle>
              <DialogDescription>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1"><Zap className="size-3" />{getTriggerLabel(selectedBot.triggerType)}</span>
                  <span className="flex items-center gap-1"><MessageSquare className="size-3" />{selectedBot.totalSessions} sessions</span>
                  <span className="flex items-center gap-1"><TrendingUp className="size-3" />{Math.round(selectedBot.completionRate)}% completion</span>
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Description */}
              {selectedBot.description && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedBot.description}</p>
                </div>
              )}

              {/* Conversation Flow */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Conversation Flow</h4>
                <ScrollArea className="w-full">
                  <div className="flex items-start gap-4 pb-4 min-w-max">
                    {parseNodes(selectedBot.nodesJson).map((node, idx) => {
                      const nodeType = getNodeStyle(node.type);
                      const Icon = nodeType.icon;
                      const currentNodes = parseNodes(selectedBot.nodesJson);
                      return (
                        <div key={node.id} className="flex items-center gap-4">
                          <button
                            className={cn(
                              'flex flex-col items-center gap-1 p-3 rounded-lg border-2 min-w-[120px] transition-all hover:shadow-md',
                              selectedNode?.id === node.id ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-border',
                              nodeType.color
                            )}
                            onClick={() => { setSelectedNode(node); setShowNodeConfig(true); }}
                          >
                            <Icon className="size-5" />
                            <span className="text-xs font-medium text-center">{node.label}</span>
                            <span className="text-[9px] opacity-60">{nodeType.label}</span>
                          </button>
                          {idx < currentNodes.length - 1 && (
                            <ArrowRight className="size-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      );
                    })}
                    <button className="flex flex-col items-center gap-1 p-3 rounded-lg border-2 border-dashed border-muted-foreground/30 min-w-[120px] hover:border-emerald-400 hover:bg-emerald-50 transition-colors" onClick={() => toast.info('Add node functionality coming soon')}>
                      <Plus className="size-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Add Node</span>
                    </button>
                  </div>
                </ScrollArea>
              </div>

              {/* Node Config Panel */}
              {showNodeConfig && selectedNode && (
                <div className="p-3 border rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Node: {selectedNode.label}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setShowNodeConfig(false)}>
                      <span className="text-xs">&times;</span>
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Configuration</Label>
                    <Textarea
                      value={selectedNode.config}
                      onChange={e => {
                        setSelectedNode(prev => prev ? { ...prev, config: e.target.value } : null);
                        handleNodeConfigChange(selectedNode.id, e.target.value);
                      }}
                      rows={2}
                      className="text-xs"
                      placeholder="Configure this node..."
                    />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>Type: {getNodeStyle(selectedNode.type).label}</span>
                    <span>Connections: {selectedNode.connections.length}</span>
                  </div>
                </div>
              )}

              <Separator />

              {/* Performance */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Performance</h4>
                <div className="grid grid-cols-4 gap-3">
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-teal-600">{selectedBot.totalSessions.toLocaleString()}</p>
                    <p className="text-[9px] text-muted-foreground">Total Sessions</p>
                  </Card>
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-emerald-600">{selectedBot.activeSessions}</p>
                    <p className="text-[9px] text-muted-foreground">Active</p>
                  </Card>
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-purple-600">{Math.round(selectedBot.completionRate)}%</p>
                    <p className="text-[9px] text-muted-foreground">Completion</p>
                  </Card>
                  <Card className="p-2 text-center">
                    <p className="text-sm font-bold text-amber-600">{formatDate(selectedBot.createdAt)}</p>
                    <p className="text-[9px] text-muted-foreground">Created</p>
                  </Card>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { setShowDetailDialog(false); handlePreview(selectedBot); }}>
                  <Play className="size-4 mr-1.5" /> Test Bot
                </Button>
                <Button variant="outline" onClick={() => { setShowDetailDialog(false); openEdit(selectedBot); }}>
                  <Pencil className="size-4 mr-1.5" /> Edit Settings
                </Button>
                <Button variant="outline" onClick={() => handleToggle(selectedBot.id)} disabled={togglingId === selectedBot.id}>
                  {togglingId === selectedBot.id ? <RefreshCw className="size-4 mr-1.5 animate-spin" /> :
                    selectedBot.status === 'active' ? <><Pause className="size-4 mr-1.5" /> Deactivate</> : <><Play className="size-4 mr-1.5" /> Activate</>
                  }
                </Button>
                <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => { openDelete(selectedBot); setShowDetailDialog(false); }}>
                  <Trash2 className="size-4 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Chatbot Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Chatbot</DialogTitle>
            <DialogDescription>Set up a new WhatsApp chatbot</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Chatbot Name *</Label>
              <Input placeholder="e.g., Lead Capture Bot" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea placeholder="What does this chatbot do?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={form.triggerType} onValueChange={v => setForm({ ...form, triggerType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Configuration (JSON)</Label>
              <Textarea
                placeholder='{"keywords": ["hi", "hello", "help"]}'
                value={form.triggerConfigJson}
                onChange={e => setForm({ ...form, triggerConfigJson: e.target.value })}
                rows={2}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">For keyword trigger: {"{\"keywords\": [\"hi\", \"hello\"]}"}</p>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Start from Template</Label>
              <Select value={createTemplate} onValueChange={v => setCreateTemplate(v)}>
                <SelectTrigger><SelectValue placeholder="Choose a template..." /></SelectTrigger>
                <SelectContent>
                  {FLOW_EXAMPLES.map(f => <SelectItem key={f.name} value={f.name}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Available Node Types</Label>
              <div className="grid grid-cols-3 gap-2">
                {NODE_TYPES.map(nt => {
                  const Icon = nt.icon;
                  return (
                    <div key={nt.value} className={cn('flex items-center gap-1.5 p-2 rounded-lg border text-[10px]', nt.color)}>
                      <Icon className="size-3.5" /><span>{nt.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCreate} disabled={!form.name || saving}>
              {saving ? 'Creating...' : 'Create Chatbot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Chatbot Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Chatbot Settings</DialogTitle>
            <DialogDescription>Update chatbot configuration</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Chatbot Name *</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Trigger Type</Label>
                <Select value={form.triggerType} onValueChange={v => setForm({ ...form, triggerType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TRIGGER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Trigger Configuration (JSON)</Label>
              <Textarea
                value={form.triggerConfigJson}
                onChange={e => setForm({ ...form, triggerConfigJson: e.target.value })}
                rows={2}
                className="font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleEdit} disabled={!form.name || saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Chatbot</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingBot?.name}&quot;? This action cannot be undone and all sessions will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="size-4 text-emerald-600" />
              Test: {selectedBot?.name}
            </DialogTitle>
            <DialogDescription>Simulate a chatbot conversation</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <ScrollArea className="h-64 rounded-lg border p-3 bg-slate-50">
              <div className="space-y-2">
                {previewMessages.map((msg, i) => (
                  <div key={i} className={cn('flex', msg.sender === 'bot' ? '' : 'justify-end')}>
                    <div className={cn(
                      'max-w-[80%] rounded-lg p-2 text-sm',
                      msg.sender === 'bot' ? 'bg-white border shadow-sm' : 'bg-emerald-600 text-white'
                    )}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2">
              <Input placeholder="Type a message..." value={previewInput} onChange={e => setPreviewInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handlePreviewSend()} />
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handlePreviewSend}><Send className="size-3.5" /></Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
