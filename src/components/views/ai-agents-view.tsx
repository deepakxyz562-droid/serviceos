'use client';

import { useState, useEffect } from 'react';
import {
  Bot,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Loader2,
  Phone,
  PhoneCall,
  Activity,
  Clock,
  AlertCircle,
  Sparkles,
  Volume2,
  MessageSquare,
  Settings2,
  Play,
  Pause,
  Save,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/store/app-store';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Agent {
  id: string;
  name: string;
  description: string | null;
  status: string;
  active: boolean;
  totalCalls: number;
  totalSeconds: number;
  lastCallAt: string | null;
  vapiAssistantId: string | null;
  config: Record<string, any>;
  phoneNumbers?: { id: string; phoneNumber: string; friendlyName: string | null }[];
  callsCount?: number;
}

const VOICE_OPTIONS = [
  { provider: 'elevenlabs', voiceId: 'Rachel', label: 'Rachel (Female, warm)' },
  { provider: 'elevenlabs', voiceId: 'Adam', label: 'Adam (Male, deep)' },
  { provider: 'elevenlabs', voiceId: 'Antoni', label: 'Antoni (Male, smooth)' },
  { provider: 'elevenlabs', voiceId: 'Bella', label: 'Bella (Female, soft)' },
  { provider: 'elevenlabs', voiceId: 'Domi', label: 'Domi (Female, strong)' },
  { provider: 'elevenlabs', voiceId: 'Josh', label: 'Josh (Male, young)' },
  { provider: 'playht', voiceId: 'jennifer', label: 'Jennifer (Female, professional)' },
  { provider: 'playht', voiceId: 'michael', label: 'Michael (Male, professional)' },
];

const MODEL_OPTIONS = [
  { provider: 'openai', model: 'gpt-4o-mini', label: 'GPT-4o Mini (fast, affordable)' },
  { provider: 'openai', model: 'gpt-4o', label: 'GPT-4o (smartest)' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  { provider: 'anthropic', model: 'claude-3-haiku', label: 'Claude 3 Haiku (fast)' },
];

const INDUSTRY_PRESETS = [
  {
    id: 'general',
    label: 'General Receptionist',
    systemPrompt: 'You are a professional AI receptionist. Answer calls politely, take messages, book appointments, and route callers to the right person when needed. Keep responses concise and friendly.',
    greeting: "Hello! Thank you for calling. How can I help you today?",
  },
  {
    id: 'dental',
    label: 'Dental Clinic',
    systemPrompt: 'You are a receptionist for a dental clinic. Help patients book appointments, answer questions about services (cleanings, fillings, emergency care), check insurance, and route urgent dental emergencies to the on-call dentist. Business hours are 9 AM - 5 PM, Monday to Friday.',
    greeting: "Hello! Thank you for calling our dental clinic. How can I help you schedule or assist you today?",
  },
  {
    id: 'salon',
    label: 'Salon / Spa',
    systemPrompt: 'You are a receptionist for a salon and spa. Help clients book appointments for haircuts, coloring, manicures, massages, and facials. Answer pricing questions and recommend services. Business hours are 10 AM - 7 PM, Tuesday to Sunday.',
    greeting: "Hello! Thanks for calling our salon. Would you like to book an appointment or hear about our services?",
  },
  {
    id: 'legal',
    label: 'Law Firm',
    systemPrompt: 'You are a receptionist for a law firm. Screen calls, schedule consultations, take detailed messages with case context, and direct urgent legal matters to the appropriate attorney. Be professional and discreet. Business hours are 9 AM - 6 PM, Monday to Friday.',
    greeting: "Good day. Thank you for calling our law firm. How may I assist you?",
  },
  {
    id: 'home_services',
    label: 'Home Services (HVAC/Plumbing)',
    systemPrompt: 'You are a dispatcher for a home services company (HVAC, plumbing, electrical). Book service appointments, capture address and issue details, flag emergencies for immediate dispatch, and provide rough time windows. Business hours are 7 AM - 7 PM, 7 days a week, with emergency service available.',
    greeting: "Hello! Thanks for calling. Are you looking to book a service or do you have an emergency?",
  },
  {
    id: 'medical',
    label: 'Medical Clinic',
    systemPrompt: 'You are a receptionist for a medical clinic. Schedule appointments, screen for urgent symptoms, take messages for doctors, and direct medical emergencies to call 911. Be HIPAA-compliant and never share patient information. Business hours are 8 AM - 6 PM, Monday to Friday.',
    greeting: "Hello, thank you for calling our medical clinic. How can I help you today?",
  },
];

export function AiAgentsView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);
  const setActiveView = useAppStore((s) => s.setActiveView);

  const fetchAgents = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      const res = await fetch('/api/vapi/agents');
      const data = await res.json();
      setAgents(data.agents || []);
    } catch {
      toast.error('Failed to load agents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleDelete = async (agent: Agent) => {
    if (!confirm(`Delete "${agent.name}"? This also removes it from Vapi. Phone numbers will be unlinked.`)) return;
    try {
      const res = await fetch(`/api/vapi/agents?id=${agent.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      toast.success('Agent deleted');
      fetchAgents(true);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const toggleActive = async (agent: Agent) => {
    try {
      const res = await fetch('/api/vapi/agents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: agent.id, active: !agent.active }),
      });
      if (!res.ok) throw new Error('Failed to toggle');
      toast.success(agent.active ? 'Agent paused' : 'Agent activated');
      fetchAgents(true);
    } catch {
      toast.error('Failed to update agent');
    }
  };

  const fmtDuration = (sec: number) => {
    if (sec < 60) return `${sec}s`;
    return `${Math.floor(sec / 60)}m`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <button onClick={() => setActiveView('aiReceptionist')} className="hover:text-foreground transition-colors">
              AI Receptionist
            </button>
            <span>/</span>
            <span className="text-foreground font-medium">Agents</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bot className="size-6 text-emerald-600" />
            AI Agents
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure voice assistants that answer your calls, book appointments, and capture leads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchAgents(true)} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Refresh
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 gap-1.5"
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-3.5" />
            New Agent
          </Button>
        </div>
      </div>

      {/* ─── Agents grid ────────────────────────────────────────────── */}
      {agents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex items-center justify-center size-14 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Bot className="size-7 text-emerald-600" />
            </div>
            <h3 className="text-lg font-medium">Create your first AI agent</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              An AI agent is a voice assistant that answers calls, talks to callers, books appointments,
              and captures leads. Start from a template or build from scratch.
            </p>
            <Button
              size="sm"
              className="mt-5 bg-emerald-600 hover:bg-emerald-700 gap-1.5"
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create AI Agent
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <Card key={agent.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={cn(
                        'flex items-center justify-center size-10 rounded-full shrink-0',
                        agent.active ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted'
                      )}
                    >
                      <Bot className={cn('size-5', agent.active ? 'text-emerald-600' : 'text-muted-foreground')} />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{agent.name}</CardTitle>
                      <CardDescription className="truncate">
                        {agent.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0',
                      agent.active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {agent.active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-3">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-lg font-semibold">{agent.totalCalls}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Calls</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-lg font-semibold">{fmtDuration(agent.totalSeconds)}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Talk</div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted/40">
                    <div className="text-lg font-semibold">{agent.phoneNumbers?.length || 0}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">Numbers</div>
                  </div>
                </div>

                {agent.lastCallAt && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="size-3" />
                    Last call {formatDistanceToNow(new Date(agent.lastCallAt), { addSuffix: true })}
                  </div>
                )}

                {!agent.vapiAssistantId && (
                  <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="size-3" />
                    Not synced to Vapi (draft only)
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-auto pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5"
                    onClick={() => {
                      setEditing(agent);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => toggleActive(agent)}
                    title={agent.active ? 'Pause' : 'Activate'}
                  >
                    {agent.active ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(agent)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Create/Edit dialog ─────────────────────────────────────── */}
      <AgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        agent={editing}
        onSaved={() => {
          setDialogOpen(false);
          fetchAgents(true);
        }}
      />
    </div>
  );
}

// ─── Create/Edit Agent Dialog ──────────────────────────────────────────────

function AgentDialog({
  open,
  onOpenChange,
  agent,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agent: Agent | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('basic');
  const [form, setForm] = useState({
    name: '',
    description: '',
    systemPrompt: '',
    greeting: '',
    endCallMessage: 'Thank you for calling. Have a great day!',
    voiceProvider: 'elevenlabs',
    voiceId: 'Rachel',
    modelProvider: 'openai',
    modelName: 'gpt-4o-mini',
    temperature: 0.4,
    silenceTimeoutSeconds: 30,
    maxDurationSeconds: 600,
  });

  useEffect(() => {
    if (agent) {
      const c = agent.config || {};
      setForm({
        name: agent.name,
        description: agent.description || '',
        systemPrompt: c.systemPrompt || '',
        greeting: c.firstMessage || c.greeting || '',
        endCallMessage: c.endCallMessage || 'Thank you for calling. Have a great day!',
        voiceProvider: c.voiceProvider || 'elevenlabs',
        voiceId: c.voiceId || 'Rachel',
        modelProvider: c.modelProvider || 'openai',
        modelName: c.modelName || 'gpt-4o-mini',
        temperature: c.temperature ?? 0.4,
        silenceTimeoutSeconds: c.silenceTimeoutSeconds ?? 30,
        maxDurationSeconds: c.maxDurationSeconds ?? 600,
      });
      setTab('basic');
    } else {
      setForm({
        name: '',
        description: '',
        systemPrompt: INDUSTRY_PRESETS[0].systemPrompt,
        greeting: INDUSTRY_PRESETS[0].greeting,
        endCallMessage: 'Thank you for calling. Have a great day!',
        voiceProvider: 'elevenlabs',
        voiceId: 'Rachel',
        modelProvider: 'openai',
        modelName: 'gpt-4o-mini',
        temperature: 0.4,
        silenceTimeoutSeconds: 30,
        maxDurationSeconds: 600,
      });
      setTab('basic');
    }
  }, [agent, open]);

  const applyPreset = (presetId: string) => {
    const preset = INDUSTRY_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      name: f.name || preset.label,
      systemPrompt: preset.systemPrompt,
      greeting: preset.greeting,
    }));
    toast.success(`Applied "${preset.label}" preset`);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Agent name is required');
      setTab('basic');
      return;
    }
    if (!form.systemPrompt.trim()) {
      toast.error('System prompt is required');
      setTab('personality');
      return;
    }
    try {
      setSaving(true);
      const config = {
        systemPrompt: form.systemPrompt,
        firstMessage: form.greeting,
        endCallMessage: form.endCallMessage,
        voiceProvider: form.voiceProvider,
        voiceId: form.voiceId,
        modelProvider: form.modelProvider,
        modelName: form.modelName,
        temperature: form.temperature,
        silenceTimeoutSeconds: form.silenceTimeoutSeconds,
        maxDurationSeconds: form.maxDurationSeconds,
      };
      const url = '/api/vapi/agents';
      const method = agent ? 'PATCH' : 'POST';
      const body = agent
        ? { id: agent.id, name: form.name, description: form.description, config }
        : { name: form.name, description: form.description, config };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save agent');
      toast.success(agent ? 'Agent updated' : 'Agent created');
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="size-5 text-emerald-600" />
            {agent ? 'Edit AI Agent' : 'Create AI Agent'}
          </DialogTitle>
          <DialogDescription>
            {agent
              ? 'Update your voice assistant configuration.'
              : 'Set up a new AI voice assistant. Choose a preset or configure manually.'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex-wrap shrink-0">
            <TabsTrigger value="basic" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <Settings2 className="size-3.5" /> Basic
            </TabsTrigger>
            <TabsTrigger value="personality" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <MessageSquare className="size-3.5" /> Personality
            </TabsTrigger>
            <TabsTrigger value="voice" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <Volume2 className="size-3.5" /> Voice
            </TabsTrigger>
            <TabsTrigger value="advanced" className="gap-1.5 rounded-lg px-3 py-1.5 text-xs">
              <Sparkles className="size-3.5" /> Advanced
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pr-1 -mr-1 mt-4">
            {/* ─── Basic tab ─────────────────────────────────────── */}
            <TabsContent value="basic" className="space-y-4 mt-0">
              {!agent && (
                <div>
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Quick Start Templates</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {INDUSTRY_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className="text-left p-2.5 rounded-lg border bg-card hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/10 transition-all text-xs"
                      >
                        <div className="font-medium">{preset.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name *</Label>
                <Input
                  id="agent-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Front Desk Receptionist"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent-desc">Description</Label>
                <Input
                  id="agent-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="What does this agent do?"
                />
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-800 text-xs">
                <div className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400 mb-1">
                  <Sparkles className="size-3.5" />
                  Function Calling
                </div>
                <p className="text-muted-foreground">
                  This agent can call these tools: create lead, book appointment, check availability, get business hours,
                  get service prices, transfer call. The server URL is auto-configured.
                </p>
              </div>
            </TabsContent>

            {/* ─── Personality tab ───────────────────────────────── */}
            <TabsContent value="personality" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label htmlFor="greeting">Greeting (First Message)</Label>
                <Textarea
                  id="greeting"
                  value={form.greeting}
                  onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                  placeholder="Hello! Thank you for calling. How can I help you today?"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">The first thing the AI says when it picks up.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="system-prompt">System Prompt *</Label>
                <Textarea
                  id="system-prompt"
                  value={form.systemPrompt}
                  onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })}
                  placeholder="You are a professional AI receptionist..."
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Defines the AI's personality, knowledge, and behavior. Be specific about your business.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-message">End Call Message</Label>
                <Input
                  id="end-message"
                  value={form.endCallMessage}
                  onChange={(e) => setForm({ ...form, endCallMessage: e.target.value })}
                />
              </div>
            </TabsContent>

            {/* ─── Voice tab ──────────────────────────────────────── */}
            <TabsContent value="voice" className="space-y-4 mt-0">
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select
                  value={`${form.voiceProvider}|${form.voiceId}`}
                  onValueChange={(v) => {
                    const [provider, voiceId] = v.split('|');
                    setForm({ ...form, voiceProvider: provider, voiceId });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map((v) => (
                      <SelectItem key={`${v.provider}|${v.voiceId}`} value={`${v.provider}|${v.voiceId}`}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">The voice the AI uses to speak. ElevenLabs offers the most natural voices.</p>
              </div>
              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select
                  value={`${form.modelProvider}|${form.modelName}`}
                  onValueChange={(v) => {
                    const [provider, model] = v.split('|');
                    setForm({ ...form, modelProvider: provider, modelName: model });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODEL_OPTIONS.map((m) => (
                      <SelectItem key={`${m.provider}|${m.model}`} value={`${m.provider}|${m.model}`}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Smarter models = better conversations but higher cost per minute.</p>
              </div>
              <div className="space-y-2">
                <Label>Temperature: {form.temperature.toFixed(1)}</Label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={form.temperature}
                  onChange={(e) => setForm({ ...form, temperature: parseFloat(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Precise (0)</span>
                  <span>Creative (1)</span>
                </div>
              </div>
            </TabsContent>

            {/* ─── Advanced tab ───────────────────────────────────── */}
            <TabsContent value="advanced" className="space-y-4 mt-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="silence">Silence Timeout (seconds)</Label>
                  <Input
                    id="silence"
                    type="number"
                    value={form.silenceTimeoutSeconds}
                    onChange={(e) => setForm({ ...form, silenceTimeoutSeconds: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-xs text-muted-foreground">End call after this many seconds of silence.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max-dur">Max Duration (seconds)</Label>
                  <Input
                    id="max-dur"
                    type="number"
                    value={form.maxDurationSeconds}
                    onChange={(e) => setForm({ ...form, maxDurationSeconds: parseInt(e.target.value) || 600 })}
                  />
                  <p className="text-xs text-muted-foreground">Hard limit on call length.</p>
                </div>
              </div>
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1.5">
                <div className="font-medium text-foreground">Function Calling Tools</div>
                <p>The following tools are available to this agent via the function-call bridge:</p>
                <ul className="list-disc list-inside space-y-0.5 pl-2">
                  <li><code className="text-emerald-600">create_lead</code> — Create a CRM lead from the call</li>
                  <li><code className="text-emerald-600">book_appointment</code> — Book a calendar slot</li>
                  <li><code className="text-emerald-600">check_availability</code> — Check open slots for a date</li>
                  <li><code className="text-emerald-600">get_business_hours</code> — Fetch business hours</li>
                  <li><code className="text-emerald-600">get_service_prices</code> — Quote service prices</li>
                  <li><code className="text-emerald-600">transfer_call</code> — Transfer to a human</li>
                </ul>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 gap-1.5">
            {saving ? <Loader2 className="size-4 animate-spin" /> : agent ? <Save className="size-4" /> : <Plus className="size-4" />}
            {agent ? 'Save Changes' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
