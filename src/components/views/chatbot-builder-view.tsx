'use client';

/**
 * ChatbotBuilderView — AI Agent & Chatbot Studio Hub
 *
 * Provides a multi-business conversational AI agent management hub:
 * 1. Industry Presets (Generic Support, HVAC, Plumbing, Dental, Legal, Auto, Real Estate, Beauty, Custom)
 * 2. Multi-Agent Directory Grid with live metrics, channel status, and connected forms
 * 3. 1-Click Launch into the full-screen FormAgentStudio (BUILD, TRAIN, PUBLISH, 11 Channels, Multi-Device Simulator)
 */

import React, { useState, useEffect } from 'react';
import {
  Bot, Plus, Search, Sparkles, MessageSquare, Phone, Globe,
  Layers, CheckCircle2, Copy, ExternalLink, Trash2, Settings,
  BarChart3, RefreshCw, Smartphone, Code, ShieldCheck, Share2,
  ChevronRight, Users, MessageCircle, FileInput, Flame, ShieldAlert,
  Loader2, Wand2, FileText, ArrowRight, LayoutTemplate
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { FormAgentStudio } from '@/features/forms/components/agent-builder/form-agent-studio';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  INDUSTRY_AGENT_PRESETS,
  IndustryAgentPreset,
  createAgentFromPreset
} from '@/features/forms/types/agent-types';

export interface ChatbotBuilderViewProps {
  embedded?: boolean;
}

export function ChatbotBuilderView({ embedded = false }: ChatbotBuilderViewProps = {}) {
  // Active agents state
  const [agents, setAgents] = useState<FormAgentData[]>([
    DEFAULT_FORM_AGENT,
    createAgentFromPreset('hvac_services'),
    createAgentFromPreset('dental_medical'),
    createAgentFromPreset('legal_intake'),
  ]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeStudioAgent, setActiveStudioAgent] = useState<FormAgentData | null>(null);
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [creationTab, setCreationTab] = useState<'ai' | 'form' | 'templates' | 'scratch'>('ai');
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [availableForms, setAvailableForms] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [embedModalAgent, setEmbedModalAgent] = useState<FormAgentData | null>(null);
  const [deleteConfirmAgent, setDeleteConfirmAgent] = useState<FormAgentData | null>(null);
  const [siteOrigin, setSiteOrigin] = useState('');

  const fetchAgents = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/forms/agents');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.agents) && data.agents.length > 0) {
          setAgents(data.agents);
        }
      }
    } catch {
      // Non-fatal, keep fallback presets
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSiteOrigin(window.location.origin);
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get('prompt');
      if (promptParam) {
        setPromptInput(promptParam);
        setCreationTab('ai');
        setPresetDialogOpen(true);
      }
    }
    fetchAgents();
  }, [fetchAgents]);

  // Filter agents by search
  const filteredAgents = agents.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.roleTitle.toLowerCase().includes(search.toLowerCase())
  );

  // Aggregate stats
  const totalConversations = agents.reduce((s, a) => s + (a.metrics?.totalConversations || 0), 0);
  const totalFormSubmissions = agents.reduce((s, a) => s + (a.metrics?.totalFormSubmissions || 0), 0);
  const activeChannelsCount = agents.reduce((s, a) => {
    let count = 0;
    if (a.channels?.chatbot?.enabled) count++;
    if (a.channels?.standalone?.enabled) count++;
    if (a.channels?.whatsapp?.enabled) count++;
    if (a.channels?.phone?.enabled) count++;
    if (a.channels?.sms?.enabled) count++;
    if (a.channels?.gmail?.enabled) count++;
    return s + count;
  }, 0);

  const fetchAvailableForms = async () => {
    setLoadingForms(true);
    try {
      const res = await fetch('/api/forms');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.forms)) {
          setAvailableForms(data.forms);
        }
      }
    } catch {
      // non-fatal
    } finally {
      setLoadingForms(false);
    }
  };

  const handleGenerateWithAI = async (customPrompt?: string) => {
    const text = customPrompt || promptInput;
    if (!text.trim() || isGenerating) return;

    setIsGenerating(true);
    const toastId = toast.loading('Generating AI Agent from your prompt...');

    try {
      const res = await fetch('/api/forms/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.agent) {
        setAgents((prev) => [data.agent, ...prev]);
        setPresetDialogOpen(false);
        setPromptInput('');
        setActiveStudioAgent(data.agent);
        toast.success(`✨ Created ${data.agent.name}!`, { id: toastId });
      } else {
        toast.error(data.error || 'Failed to generate agent', { id: toastId });
      }
    } catch {
      toast.error('Network error during AI generation', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateFromForm = (form: { id: string; name: string; description?: string }) => {
    const timestamp = Date.now();
    const newAgent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      id: `agent_${timestamp}`,
      slug: `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-agent`,
      name: `${form.name} Assistant`,
      roleTitle: `${form.name} Concierge`,
      welcomeGreeting: `Hello! I am your AI assistant for ${form.name}. How can I assist you today?`,
      greetingSubtitle: 'I can answer your questions and help you complete the form.',
      connectedForms: [
        {
          id: form.id,
          name: form.name,
          description: form.description,
        },
      ],
      quickActions: [
        {
          id: `qa_${timestamp}_1`,
          label: `Complete ${form.name}`,
          actionType: 'open_form',
          payload: form.id,
          icon: 'FileText',
        },
        {
          id: `qa_${timestamp}_2`,
          label: 'Ask a Question',
          actionType: 'custom_message',
          payload: 'Can you tell me more about your services and pricing?',
          icon: 'MessageSquare',
        },
      ],
      channels: {
        ...DEFAULT_FORM_AGENT.channels,
        chatbot: {
          ...DEFAULT_FORM_AGENT.channels.chatbot,
          greetingBubble: `👋 Need help completing ${form.name}? Chat with our AI!`,
        },
      },
    };

    setAgents((prev) => [newAgent, ...prev]);
    setPresetDialogOpen(false);
    setActiveStudioAgent(newAgent);
    toast.success(`✨ Created AI Assistant connected to ${form.name}`);
  };

  const handleCreateFromScratch = () => {
    const timestamp = Date.now();
    const newAgent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      id: `agent_${timestamp}`,
      slug: `custom-agent-${timestamp.toString(36)}`,
      name: 'Custom AI Assistant',
      roleTitle: 'Customer Concierge',
      welcomeGreeting: 'Hello! How can I assist you today?',
    };
    setAgents((prev) => [newAgent, ...prev]);
    setPresetDialogOpen(false);
    setActiveStudioAgent(newAgent);
    toast.success('Created new AI Agent from scratch');
  };

  // Handle create from preset
  const handleCreateFromPreset = (preset: IndustryAgentPreset) => {
    const newAgent = createAgentFromPreset(preset.id);
    setAgents((prev) => [newAgent, ...prev]);
    setPresetDialogOpen(false);
    setActiveStudioAgent(newAgent);
    toast.success(`✨ Created ${newAgent.name} (${preset.industryName})`);
  };

  // Handle delete agent
  const handleDeleteAgent = async (agentId: string) => {
    try {
      const res = await fetch(`/api/forms/agents?id=${encodeURIComponent(agentId)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
        setDeleteConfirmAgent(null);
        toast.success('Agent removed from database');
      } else {
        setAgents((prev) => prev.filter((a) => a.id !== agentId));
        setDeleteConfirmAgent(null);
        toast.success('Agent removed');
      }
    } catch {
      setAgents((prev) => prev.filter((a) => a.id !== agentId));
      setDeleteConfirmAgent(null);
      toast.success('Agent removed');
    }
  };

  // If studio is open for an agent, render the full-screen FormAgentStudio
  if (activeStudioAgent) {
    return (
      <FormAgentStudio
        initialAgent={activeStudioAgent}
        onChange={(updated) => {
          setActiveStudioAgent(updated);
          setAgents((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
        }}
        onSave={async (savedAgent) => {
          setActiveStudioAgent(savedAgent);
          setAgents((prev) => {
            const exists = prev.some((a) => a.id === savedAgent.id);
            if (exists) {
              return prev.map((a) => (a.id === savedAgent.id ? savedAgent : a));
            }
            return [savedAgent, ...prev];
          });
        }}
        onBack={() => {
          setActiveStudioAgent(null);
          fetchAgents();
        }}
        siteOrigin={siteOrigin}
      />
    );
  }

  return (
    <div className={cn('w-full space-y-6', !embedded ? 'flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-12' : 'pt-2')}>
      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md">
            <Bot className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-black text-foreground">AI Agent &amp; Chatbot Studio</h2>
              <Badge className="bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-500/20 text-[10px] font-bold">
                11 CHANNELS
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Build, train, and deploy conversational AI agents for appointment booking, lead intake, customer support, and in-chat forms.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            className="border-border text-xs gap-1.5 h-9"
            onClick={() => setPresetDialogOpen(true)}
          >
            <Sparkles className="size-3.5 text-blue-600" /> Choose Industry Template
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 h-9 shadow-xs"
            onClick={() => {
              const blankAgent = createAgentFromPreset('generic_business', { name: 'New AI Agent', roleTitle: 'Custom Business Concierge' });
              setAgents((prev) => [blankAgent, ...prev]);
              setActiveStudioAgent(blankAgent);
            }}
          >
            <Plus className="size-4" /> Create New AI Agent
          </Button>
        </div>
      </div>

      {/* ─── Quick Stats ────────────────────────────────────────────────────── */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: 'Active AI Agents', value: agents.length, icon: Bot, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { label: 'Total Conversations', value: totalConversations.toLocaleString(), icon: MessageSquare, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
          { label: 'Forms Submitted in Chat', value: totalFormSubmissions.toLocaleString(), icon: FileInput, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950/40' },
          { label: 'Active Distribution Channels', value: activeChannelsCount, icon: Globe, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 border-border/80 shadow-2xs">
              <div className="flex items-center gap-3">
                <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', stat.bg)}>
                  <Icon className={cn('size-5', stat.color)} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                  <p className={cn('text-xl font-black', stat.color)}>{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── Industry Presets Showcase Bar ──────────────────────────────────── */}
      <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-blue-600" />
            <span className="text-xs font-bold text-foreground">Industry Starter Templates</span>
            <span className="text-[10px] text-muted-foreground">(1-Click Instant Deployment for Any Business)</span>
          </div>
          <button
            type="button"
            onClick={() => setPresetDialogOpen(true)}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-0.5"
          >
            View All 8 Presets <ChevronRight className="size-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {INDUSTRY_AGENT_PRESETS.slice(0, 4).map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleCreateFromPreset(preset)}
              className="p-3 rounded-xl border border-border/70 bg-card hover:border-blue-500/50 hover:shadow-xs text-left transition-all group relative flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center gap-2.5">
                <img
                  src={preset.avatarUrl}
                  alt={preset.agentName}
                  className="size-8 rounded-full object-cover ring-1 ring-border shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-foreground truncate group-hover:text-blue-600">
                    {preset.agentName}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{preset.industryName}</p>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                {preset.description}
              </p>
              <div className="pt-1 border-t border-border/40 flex items-center justify-between text-[10px] font-bold text-blue-600">
                <span>Use Template</span>
                <Plus className="size-3 group-hover:scale-125 transition-transform" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Search & Actions Bar ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search agents by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <p className="text-xs text-muted-foreground font-mono">
          Showing {filteredAgents.length} of {agents.length} agents
        </p>
      </div>

      {/* ─── Active AI Agents Grid ──────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => {
          const activeChannels = [
            agent.channels?.chatbot?.enabled && 'Embed Widget',
            agent.channels?.standalone?.enabled && 'Web Page',
            agent.channels?.whatsapp?.enabled && 'WhatsApp',
            agent.channels?.phone?.enabled && 'Phone Calling',
            agent.channels?.sms?.enabled && 'SMS',
            agent.channels?.gmail?.enabled && 'Gmail',
          ].filter(Boolean);

          const standaloneUrl = `${siteOrigin}/chat/${agent.slug || agent.id}`;

          return (
            <Card
              key={agent.id}
              className="border-border/80 hover:border-blue-500/40 hover:shadow-sm transition-all overflow-hidden flex flex-col justify-between bg-card group"
            >
              <div>
                {/* Agent Card Header */}
                <div className="p-4 border-b border-border/60 bg-muted/20 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative">
                      <img
                        src={agent.avatarUrl || DEFAULT_FORM_AGENT.avatarUrl}
                        alt={agent.name}
                        className="size-11 rounded-2xl object-cover ring-2 ring-background shadow-xs shrink-0"
                      />
                      <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-foreground truncate">{agent.name}</h4>
                        <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-blue-500/30 text-blue-600 font-bold">
                          AI AGENT
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{agent.roleTitle}</p>
                    </div>
                  </div>

                  {/* Actions Dropdown */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteConfirmAgent(agent)}
                    className="size-7 p-0 text-muted-foreground hover:text-red-600"
                    title="Delete Agent"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                {/* Agent Card Body */}
                <div className="p-4 space-y-3 text-xs">
                  {/* Greeting snippet */}
                  <div className="p-2 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground line-clamp-2 italic">
                    &quot;{agent.welcomeGreeting.replace(/\*\*/g, '')}&quot;
                  </div>

                  {/* Connected Forms */}
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <FileInput className="size-3.5 text-blue-600" /> Connected AI Forms:
                    </span>
                    <span className="font-bold text-foreground font-mono">
                      {agent.connectedForms?.length || 0} form(s)
                    </span>
                  </div>

                  {/* Active Channels Badges */}
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Active Channels:</p>
                    <div className="flex flex-wrap gap-1">
                      {activeChannels.map((ch, idx) => (
                        <Badge
                          key={idx}
                          variant="secondary"
                          className="text-[9px] px-1.5 py-0 h-4 bg-muted/60 text-foreground font-medium"
                        >
                          {ch}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-[11px]">
                    <div>
                      <span className="text-[10px] text-muted-foreground">Conversations</span>
                      <p className="font-bold text-foreground font-mono">
                        {(agent.metrics?.totalConversations || 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground">Form Leads</span>
                      <p className="font-bold text-emerald-600 font-mono">
                        {(agent.metrics?.totalFormSubmissions || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Card Footer Actions */}
              <div className="p-3 bg-muted/30 border-t border-border/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(standaloneUrl, '_blank')}
                    className="h-8 text-xs gap-1 px-2 border-border/70"
                    title="Open Live Standalone URL"
                  >
                    <ExternalLink className="size-3" /> Live Page
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEmbedModalAgent(agent)}
                    className="h-8 text-xs gap-1 px-2 border-border/70"
                    title="Get 1-line Embed Code"
                  >
                    <Code className="size-3" /> Embed
                  </Button>
                </div>

                <Button
                  size="sm"
                  onClick={() => setActiveStudioAgent(agent)}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 px-3 shadow-xs"
                >
                  <Settings className="size-3" /> Open Studio
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ─── 4-Way "Create AI Agent" Dialog (Jotform Parity) ────────────────── */}
      <Dialog
        open={presetDialogOpen}
        onOpenChange={(open) => {
          setPresetDialogOpen(open);
          if (open && availableForms.length === 0) {
            fetchAvailableForms();
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-5 pb-3 border-b">
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Sparkles className="size-4 text-blue-600" />
              Create AI Agent &amp; Chatbot
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose how you want to build your conversational AI assistant:
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={creationTab}
            onValueChange={(v) => {
              setCreationTab(v as any);
              if (v === 'form' && availableForms.length === 0) {
                fetchAvailableForms();
              }
            }}
            className="flex-1 flex flex-col min-h-0"
          >
            <div className="px-5 pt-3 border-b bg-muted/20">
              <TabsList className="grid grid-cols-4 w-full h-9 bg-muted/60 p-0.5">
                <TabsTrigger value="ai" className="text-xs gap-1.5 font-semibold">
                  <Wand2 className="size-3.5 text-blue-600" /> Generate with AI
                </TabsTrigger>
                <TabsTrigger value="form" className="text-xs gap-1.5 font-semibold">
                  <FileText className="size-3.5 text-emerald-600" /> From a Form
                </TabsTrigger>
                <TabsTrigger value="templates" className="text-xs gap-1.5 font-semibold">
                  <LayoutTemplate className="size-3.5 text-purple-600" /> Templates
                </TabsTrigger>
                <TabsTrigger value="scratch" className="text-xs gap-1.5 font-semibold">
                  <Plus className="size-3.5" /> Scratch
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {/* TAB 1: GENERATE WITH AI */}
              <TabsContent value="ai" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-foreground">
                    Describe what you want your AI Chatbot to do:
                  </label>
                  <Textarea
                    placeholder="e.g., Create a 24/7 dental emergency intake bot that collects patient symptoms, verifies insurance, and books urgent appointments."
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    rows={4}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold text-muted-foreground">Or click an example prompt:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      '24/7 HVAC Emergency Dispatcher for AC & Heating',
                      'Dental Emergency Intake & Appointment Booking',
                      'Plumbing Quote & Leak Assessment Bot',
                      'Legal Case Screening & Consultation Intake',
                      'Auto Repair & Oil Change Scheduling Assistant',
                    ].map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => {
                          setPromptInput(example);
                          handleGenerateWithAI(example);
                        }}
                        className="text-[11px] px-2.5 py-1 rounded-full border border-border/80 bg-background hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-muted-foreground hover:text-foreground transition-all text-left"
                      >
                        ⚡ {example}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t flex justify-end">
                  <Button
                    type="button"
                    disabled={isGenerating || !promptInput.trim()}
                    onClick={() => handleGenerateWithAI()}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2 px-4 h-9 shadow-xs"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        Generating Agent...
                      </>
                    ) : (
                      <>
                        <Wand2 className="size-3.5" />
                        Generate AI Agent
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: START FROM A FORM */}
              <TabsContent value="form" className="mt-0 space-y-3">
                <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/20">
                  <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                    Transform any static web form into an interactive conversational AI experience.
                  </p>
                  <p className="text-[11px] text-emerald-700/80 dark:text-emerald-400/80 mt-0.5">
                    The agent will guide visitors field-by-field and submit the completed form to your CRM.
                  </p>
                </div>

                {loadingForms ? (
                  <div className="p-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                    <Loader2 className="size-4 animate-spin text-emerald-600" /> Loading your forms...
                  </div>
                ) : availableForms.length === 0 ? (
                  <div className="p-6 text-center border border-dashed rounded-xl space-y-2">
                    <FileText className="size-8 text-muted-foreground/60 mx-auto" />
                    <p className="text-xs font-semibold">No existing forms found</p>
                    <p className="text-[11px] text-muted-foreground">
                      Create a form first in GPTForm Studio or generate a chatbot from scratch.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[45vh] overflow-y-auto pr-1">
                    {availableForms.map((form) => (
                      <div
                        key={form.id}
                        onClick={() => handleCreateFromForm(form)}
                        className="p-3 rounded-xl border border-border/80 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 cursor-pointer transition-all flex flex-col justify-between group"
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-bold text-xs group-hover:text-emerald-600 text-foreground">
                            <FileText className="size-3.5 text-emerald-600" />
                            <span className="truncate">{form.name}</span>
                          </div>
                          {form.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                              {form.description}
                            </p>
                          )}
                        </div>
                        <div className="pt-2 mt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-emerald-600">
                          <span>Build Chatbot</span>
                          <ArrowRight className="size-3.5 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 3: INDUSTRY TEMPLATES */}
              <TabsContent value="templates" className="mt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {INDUSTRY_AGENT_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleCreateFromPreset(preset)}
                      className="p-3.5 rounded-xl border border-border/80 hover:border-purple-500/60 hover:bg-purple-50/30 dark:hover:bg-purple-950/20 cursor-pointer transition-all flex flex-col justify-between space-y-2 group"
                    >
                      <div className="flex items-start gap-3">
                        <img
                          src={preset.avatarUrl}
                          alt={preset.agentName}
                          className="size-10 rounded-xl object-cover ring-1 ring-border shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground group-hover:text-purple-600">
                              {preset.agentName}
                            </p>
                            {preset.badge && (
                              <Badge className="text-[8px] px-1 py-0 h-3.5 bg-purple-600 text-white font-bold border-none">
                                {preset.badge}
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 truncate">
                            {preset.industryName}
                          </p>
                          <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">
                            {preset.description}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[11px] font-bold text-purple-600">
                        <span>Deploy Template</span>
                        <Plus className="size-3.5 group-hover:scale-125 transition-transform" />
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* TAB 4: START FROM SCRATCH */}
              <TabsContent value="scratch" className="mt-0 space-y-4">
                <div className="p-6 text-center border rounded-xl space-y-3 bg-muted/20">
                  <div className="size-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center mx-auto">
                    <Bot className="size-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Blank Custom Agent</h3>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      Start with a clean slate. Configure your custom persona, upload your documents, connect forms, and set up your preferred channels.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateFromScratch}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-2 px-4 shadow-xs"
                  >
                    <Plus className="size-3.5" /> Create Blank Agent
                  </Button>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* ─── Embed Code Dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!embedModalAgent} onOpenChange={(open) => !open && setEmbedModalAgent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Code className="size-4 text-blue-600" />
              1-Line Embed Code for {embedModalAgent?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste this script tag into any HTML, WordPress, Shopify, or Webflow website before &lt;/body&gt;:
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 break-all select-all">
            {`<script src="${siteOrigin}/api/forms/agents/${embedModalAgent?.id || 'agent_1'}/embed.js" async defer></script>`}
          </div>

          <DialogFooter>
            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold gap-1.5"
              onClick={() => {
                const code = `<script src="${siteOrigin}/api/forms/agents/${embedModalAgent?.id || 'agent_1'}/embed.js" async defer></script>`;
                navigator.clipboard.writeText(code);
                toast.success('Embed code copied to clipboard!');
                setEmbedModalAgent(null);
              }}
            >
              <Copy className="size-3.5" /> Copy Embed Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirm Dialog ──────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirmAgent} onOpenChange={(open) => !open && setDeleteConfirmAgent(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-red-600 flex items-center gap-2">
              <Trash2 className="size-4" /> Delete AI Agent?
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete <strong>{deleteConfirmAgent?.name}</strong>? All conversation logs and webhook endpoints for this agent will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmAgent(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmAgent && handleDeleteAgent(deleteConfirmAgent.id)}
            >
              Delete Agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
