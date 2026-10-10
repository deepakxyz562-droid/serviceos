'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  AgentChannelType,
  ConnectedFormRef,
} from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from './agent-device-simulator';
import { AgentBuildTab } from './agent-build-tab';
import { AgentTrainTab } from './agent-train-tab';
import { AgentSkillsTab } from './agent-skills-tab';
import { AgentPublishTab } from './agent-publish-tab';
import { AgentTestLab } from './agent-test-tab';
import { AgentSettingsDialog } from './agent-settings-dialog';
import { AgentPresentationHub } from './agent-presentation-hub';
import { AgentSetupWizard } from './agent-setup-wizard';
import {
  InstagramSimulator,
  WhatsAppSimulator,
  PhoneSimulator,
  GmailSimulator,
  VoiceSimulator,
  SmsSimulator,
} from './agent-channel-simulators';
import {
  InstagramConnectModal,
  PresentationAddModal,
  WhatsAppConnectModal,
} from './agent-channel-modals';
import { AgentOverviewTab } from './agent-overview-tab';
import {
  ArrowLeft,
  Bot,
  MessageSquare,
  Globe,
  Instagram,
  Phone,
  Mail,
  Presentation,
  Mic,
  Send,
  MessageCircle,
  Smartphone,
  Tablet,
  Monitor,
  Code,
  Sparkles,
  Save,
  RotateCcw,
  Loader2,
  CheckCircle2,
  Shield,
  Layers,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  Settings,
  Pencil,
  Eye,
  Sliders,
  Paintbrush,
  X,
  ShoppingBag,
  LayoutTemplate,
  FileText,
  User,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store/app-store';

// Complete 16 Channels Matching Jotform Screenshot
//
// NOTE: The `badge` field used to be hardcoded to 'ACTIVE' for 10 of the 16
// channels — that misled users into thinking all those channels were
// already connected when in fact the studio hadn't checked. The real
// per-channel connection state is fetched from
// GET /api/forms/agents/[id]/channel-status (which reads authoritative DB
// tables: CommunicationProvider for WhatsApp, IntegrationConnection for
// Gmail, SocialAccount for Instagram/Messenger, PhoneNumber for SMS,
// getActiveSubscription('AI_RECEPTIONIST') for the phone addon).
//
// The badge for each channel is now derived at render-time from that
// fetched status — see `channelBadgeMap` below. Channels with no backend
// status (chatbot, standalone, wordpress, presentation, voice, shopify,
// agent_app, crm, canva, platforms) show no badge because there's no
// real connection state to report.
const CHANNELS_LIST: Array<{
  id: AgentChannelType;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  /**
   * Channels whose real connection state can be read from the
   * `/api/forms/agents/[id]/channel-status` endpoint. Set to `true`
   * for channels backed by a DB table; the render code looks up the
   * live state and shows 'ACTIVE' or 'Connect' accordingly.
   */
  hasBackendStatus?: boolean;
}> = [
  { id: 'chatbot', label: 'CHATBOT', subtitle: 'Add interactive chatbot to your site', icon: MessageSquare },
  { id: 'standalone', label: 'STANDALONE', subtitle: 'Direct agent link and social share', icon: Globe },
  { id: 'instagram', label: 'INSTAGRAM AGENT', subtitle: 'Automate your Instagram DMs', icon: Instagram, hasBackendStatus: true },
  { id: 'whatsapp', label: 'WHATSAPP AGENT', subtitle: 'Connect your WhatsApp account', icon: MessageCircle, hasBackendStatus: true },
  { id: 'phone', label: 'PHONE AGENT', subtitle: 'Let your Agent answer calls', icon: Phone, hasBackendStatus: true },
  { id: 'gmail', label: 'GMAIL AGENT', subtitle: 'Let your agent create email drafts', icon: Mail, hasBackendStatus: true },
  { id: 'wordpress', label: 'AI CHATBOT FOR WORDPRESS', subtitle: 'Let your AI agent engage site visitors', icon: Code },
  { id: 'presentation', label: 'PRESENTATION AGENT', subtitle: 'Let your agent present slides', icon: Presentation },
  { id: 'voice', label: 'VOICE AGENT', subtitle: 'Add voice Agent to your website', icon: Mic },
  { id: 'messenger', label: 'MESSENGER AGENT', subtitle: 'Connect your Facebook page', icon: MessageSquare, hasBackendStatus: true },
  { id: 'shopify', label: 'SHOPIFY AGENT', subtitle: 'Let your Agent use your store data', icon: ShoppingBag },
  { id: 'agent_app', label: 'AGENT APP', subtitle: 'Share your AI Agent with an app', icon: Smartphone },
  { id: 'sms', label: 'SMS AGENT', subtitle: 'Let your Agent send messages', icon: Send, hasBackendStatus: true },
  { id: 'crm', label: 'Salesforce Agent', subtitle: 'Connect your agent to your CRM', icon: Layers },
  { id: 'canva', label: 'CANVA AI CHATBOT', subtitle: 'Add a chatbot into your Canva designs', icon: Sparkles },
  { id: 'platforms', label: 'PLATFORMS', subtitle: 'Add your Agent to other platforms', icon: LayoutTemplate },
];

// ───────────────────────────────────────────────────────────────────────────
// Real channel connection state — sourced from authoritative DB tables via
// GET /api/forms/agents/[id]/channel-status (see
// src/app/api/forms/agents/[id]/channel-status/route.ts). Used to derive
// each channel's badge at render-time so users see real connection state
// instead of a hardcoded 'ACTIVE' string.
// ───────────────────────────────────────────────────────────────────────────
interface ChannelStatusResponse {
  whatsapp?: { connected: boolean; reason: string | null };
  phone?: { addonActive: boolean; reason: string | null };
  sms?: { connected: boolean };
  instagram?: { connected: boolean; reason: string | null };
  messenger?: { connected: boolean; reason: string | null };
  gmail?: { connected: boolean; reason: string | null };
}

interface FormAgentStudioProps {
  initialAgent?: FormAgentData;
  onChange?: (updated: FormAgentData) => void;
  onSave?: (agent: FormAgentData) => Promise<void> | void;
  onBack?: () => void;
  siteOrigin?: string;
}

export function FormAgentStudio({
  initialAgent = DEFAULT_FORM_AGENT,
  onChange,
  onSave,
  onBack,
  siteOrigin,
}: FormAgentStudioProps) {
  const [agent, setAgentState] = useState<FormAgentData>(initialAgent);
  const [studioTab, setStudioTab] = useState<
    'overview' | 'personality' | 'knowledge' | 'skills' | 'channels' | 'widget' | 'phone' | 'test' | 'publish' | 'build'
  >('overview');
  const [selectedChannel, setSelectedChannel] = useState<AgentChannelType>('chatbot');
  const [rightDrawerMode, setRightDrawerMode] = useState<'channel_settings' | 'designer'>('channel_settings');
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(true);
  const [previewPage, setPreviewPage] = useState<'conversation' | 'greeting'>('conversation');
  const [isTestMode, setIsTestMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(agent.name);
  const [activeConnectedFormModal, setActiveConnectedFormModal] = useState<ConnectedFormRef | null>(null);
  const [accountForms, setAccountForms] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [showSideSimulator, setShowSideSimulator] = useState<boolean>(true);
  const [isInstagramModalOpen, setIsInstagramModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isPresentationModalOpen, setIsPresentationModalOpen] = useState(false);
  const auth = useAppStore((s) => s.auth);
  const businessName = (auth?.tenant as any)?.name || 'Cinderella Cleaners';

  // ── Real channel connection state ──────────────────────────────────
  // Fetches the authoritative per-channel connection state from the DB
  // (CommunicationProvider for WhatsApp, IntegrationConnection for Gmail,
  // SocialAccount for Instagram/Messenger, PhoneNumber for SMS,
  // getActiveSubscription('AI_RECEPTIONIST') for the phone addon).
  //
  // We only fetch once an agent.id is available — the studio can be
  // opened for a brand-new (unsaved) agent where there's no DB row yet,
  // in which case there's nothing to look up and we skip the fetch.
  //
  // We also re-fetch when the WhatsApp / Instagram connect modals flip
  // their `paired` flag locally (mirroring the Publish tab's pattern),
  // so the badge updates immediately after a successful connection.
  const [channelStatus, setChannelStatus] = useState<ChannelStatusResponse | null>(null);
  useEffect(() => {
    if (!agent.id) return;
    let cancelled = false;
    fetch(`/api/forms/agents/${encodeURIComponent(agent.id)}/channel-status`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ChannelStatusResponse | null) => {
        if (!cancelled && data) setChannelStatus(data);
      })
      .catch(() => {
        /* silent — badge-less channel list is still usable */
      });
    return () => { cancelled = true; };
  }, [
    agent.id,
    agent.channels?.whatsapp?.paired,
    agent.channels?.instagram?.paired,
  ]);

  // Derive the badge for each channel from the fetched status.
  //   • 'ACTIVE'   — channel is genuinely connected in the DB
  //   • 'Connect'  — channel has a backend status record but isn't connected
  //   • undefined  — channel has no backend status (no DB row to consult) →
  //                  render no badge instead of fabricating one.
  const channelBadgeMap = useMemo<Record<AgentChannelType, 'ACTIVE' | 'Connect' | undefined>>(
    () => {
      const s = channelStatus;
      return {
        chatbot: undefined,
        standalone: undefined,
        instagram: s?.instagram ? (s.instagram.connected ? 'ACTIVE' : 'Connect') : undefined,
        whatsapp: s?.whatsapp ? (s.whatsapp.connected ? 'ACTIVE' : 'Connect') : undefined,
        phone: s?.phone ? (s.phone.addonActive ? 'ACTIVE' : 'Connect') : undefined,
        gmail: s?.gmail ? (s.gmail.connected ? 'ACTIVE' : 'Connect') : undefined,
        wordpress: undefined,
        presentation: undefined,
        voice: undefined,
        messenger: s?.messenger ? (s.messenger.connected ? 'ACTIVE' : 'Connect') : undefined,
        shopify: undefined,
        agent_app: undefined,
        sms: s?.sms ? (s.sms.connected ? 'ACTIVE' : 'Connect') : undefined,
        crm: undefined,
        canva: undefined,
        platforms: undefined,
      } as Record<AgentChannelType, 'ACTIVE' | 'Connect' | undefined>;
    },
    [channelStatus],
  );

  useEffect(() => {
    fetch('/api/forms')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.forms)) {
          setAccountForms(data.forms.map((f: any) => ({
            id: f.id,
            name: f.name || 'Untitled Form',
            description: f.description || '',
          })));
        }
      })
      .catch(() => {});
  }, []);

  const setAgent = (updater: FormAgentData | ((prev: FormAgentData) => FormAgentData)) => {
    setAgentState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      onChange?.(next);
      return next;
    });
  };

  // Sync initialAgent only when agent ID actually changes (e.g. switched to a different agent)
  const initialAgentIdRef = useRef(initialAgent?.id);
  useEffect(() => {
    if (initialAgent && initialAgent.id !== initialAgentIdRef.current) {
      initialAgentIdRef.current = initialAgent.id;
      setAgentState(initialAgent);
      setTitleInput(initialAgent.name);
    }
  }, [initialAgent]);

  const handleSave = async (overrideAgent?: FormAgentData | unknown, silent = false) => {
    const isAgentObject =
      overrideAgent &&
      typeof overrideAgent === 'object' &&
      !('nativeEvent' in overrideAgent) &&
      !('target' in overrideAgent) &&
      'name' in overrideAgent;
    const targetAgent: FormAgentData = isAgentObject ? (overrideAgent as FormAgentData) : agent;
    setSaving(true);
    try {
      // POST to the API first — this creates or updates the agent in the DB
      // and returns the real DB cuid (replacing the placeholder ID).
      const res = await fetch('/api/forms/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetAgent),
      });

      const data = await res.json().catch(() => ({}));

      // If the API returned a saved agent (with real DB id/slug), update
      // the local state with the persisted values. This prevents duplicate
      // agent rows on subsequent saves — the next POST will find the existing
      // row by ID and update it instead of creating a new one.
      const savedAgent: FormAgentData = data.agent
        ? { ...targetAgent, ...data.agent, id: data.agent.id || targetAgent.id, slug: data.agent.slug || targetAgent.slug }
        : targetAgent;

      setAgentState(savedAgent);

      // Persist to the form's agentConfig (this flows into schemaJson on save)
      if (onSave) {
        await onSave(savedAgent);
      }

      if (!silent) {
        if (res.ok && data.agent) {
          toast.success('AI Agent saved successfully!');
        } else if (res.ok) {
          toast.success('Agent changes saved to form!');
        } else {
          toast.error(data.error || data.details || 'Failed to save agent to database');
        }
      }
    } catch (err) {
      console.error('[form-agent-studio] Save error:', err);
      if (!silent) {
        toast.error(err instanceof Error ? err.message : 'Failed to save agent. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTitleSubmit = () => {
    if (titleInput.trim()) {
      setAgent((prev) => ({ ...prev, name: titleInput.trim() }));
      toast.success('Agent name updated');
    }
    setIsEditingTitle(false);
  };

  const isSidebar = agent.channels?.chatbot?.layoutMode === 'sidebar';
  const isLeftPos = agent.channels?.chatbot?.position === 'left';
  if (showWizard) {
    return (
      <AgentSetupWizard
        initialAgent={agent}
        siteOrigin={siteOrigin}
        onComplete={(newAgent, formId) => {
          setAgent(newAgent);
          setShowWizard(false);
          handleSave(newAgent, false);
        }}
        onCancel={() => setShowWizard(false)}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP NAVIGATION BAR (Matching AI Assistant Studio Reference)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-3.5 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        <div className="flex items-center gap-4 min-w-0">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1 shrink-0"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
          )}

          <div className="flex items-center gap-3 min-w-0">
            <div className="size-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              <Sparkles className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Assistant Studio</h1>
                <Badge
                  variant="secondary"
                  className="text-[10px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold gap-1 py-0 h-4"
                >
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate hidden sm:block">
                Configure your AI assistant to handle customer conversations, calls, bookings, quotes and more — across all channels.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs text-muted-foreground hidden md:inline-block">
            Last updated Apr 24, 2025 10:30 AM
          </span>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSave(agent, false)}
            disabled={saving}
            className="h-8 text-xs font-semibold px-3 rounded-xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1" /> : null}
            Save Changes
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              handleSave(agent, true);
              setStudioTab('publish');
            }}
            disabled={saving}
            className="h-8 text-xs font-bold px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
          >
            Publish
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          STUDIO NAVIGATION TABS (9 Core Pillars from Reference Screenshot)
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center gap-1 overflow-x-auto shrink-0 shadow-2xs">
        {[
          { id: 'overview', label: 'Overview', icon: LayoutTemplate },
          { id: 'personality', label: 'Personality', icon: User },
          { id: 'knowledge', label: 'Knowledge', icon: BookOpen },
          { id: 'skills', label: 'Skills & Actions', icon: CheckCircle2 },
          { id: 'channels', label: 'Channels', icon: Layers },
          { id: 'widget', label: 'Chat Widget', icon: Globe },
          { id: 'phone', label: 'Voice & Phone', icon: Phone },
          { id: 'test', label: 'Test Lab', icon: Bot },
          { id: 'publish', label: 'Publish', icon: Sparkles },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = studioTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (tab.id === 'publish' && studioTab !== 'publish') {
                  handleSave(agent, true);
                }
                setStudioTab(tab.id as StudioTabType);
              }}
              className={cn(
                'flex items-center gap-2 px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-all whitespace-nowrap',
                active
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/30 dark:bg-indigo-950/20'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40'
              )}
            >
              <Icon className={cn('size-3.5', active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400')} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── OVERVIEW TAB (3-COLUMN DASHBOARD MATCHING REFERENCE SCREENSHOT) ── */}
      {studioTab === 'overview' && (
        <AgentOverviewTab
          agent={agent}
          onChange={setAgent}
          onNavigateTab={(tab) => setStudioTab(tab)}
          onOpenSettings={() => setSettingsOpen(true)}
          businessName={businessName}
        />
      )}

      {/* ── PERSONALITY TAB ── */}
      {studioTab === 'personality' && (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <AgentBuildTab
              agent={agent}
              onChange={setAgent}
              availableForms={accountForms}
              siteOrigin={siteOrigin}
            />
          </div>
        </div>
      )}

      {/* ── CHAT WIDGET TAB ── */}
      {studioTab === 'widget' && (
        <div className="flex-1 overflow-hidden p-6 bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center">
          <div className="max-w-4xl w-full h-full flex flex-col items-center justify-center">
            <AgentDeviceSimulator
              agent={agent}
              isTestMode={true}
              previewPage={previewPage}
              onOpenFormInModal={(form) => setActiveConnectedFormModal(form)}
              onSwitchPage={(page) => setPreviewPage(page)}
            />
          </div>
        </div>
      )}

      {/* ── VOICE & PHONE TAB ── */}
      {studioTab === 'phone' && (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-3xl mx-auto bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 text-purple-600 flex items-center justify-center">
                <Phone className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">AI Phone Receptionist & Voice</h3>
                <p className="text-xs text-muted-foreground">Configure the voice model, greeting prompt, and call routing for inbound calls.</p>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <label className="text-xs font-semibold block mb-1.5">Voice Model</label>
                <select
                  value={agent.channels?.phone?.voiceId || 'Rachel'}
                  onChange={(e) =>
                    setAgent((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        phone: { ...prev.channels?.phone, voiceId: e.target.value },
                      },
                    }))
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Rachel">Rachel (Warm & Professional - Female)</option>
                  <option value="Domi">Domi (Friendly & Helpful - Female)</option>
                  <option value="Adam">Adam (Authoritative & Crisp - Male)</option>
                  <option value="Antoni">Antoni (Polite & Calm - Male)</option>
                  <option value="Brian">Brian (Deep & Confident - Male)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold block mb-1.5">Voice Tone</label>
                <div className="flex gap-2">
                  {['friendly', 'professional', 'empathetic', 'casual'].map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      onClick={() => setAgent((prev) => ({ ...prev, voiceTone: tone as any }))}
                      className={cn(
                        'px-3 py-1.5 rounded-xl text-xs font-medium capitalize border transition-all',
                        agent.voiceTone === tone
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-600'
                      )}
                    >
                      {tone}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">Record and Transcribe Calls</div>
                  <div className="text-[11px] text-muted-foreground">Keep complete audio recordings and transcriptions in Call Logs</div>
                </div>
                <Switch
                  checked={agent.channels?.phone?.recordCalls ?? true}
                  onCheckedChange={(val) =>
                    setAgent((prev) => ({
                      ...prev,
                      channels: {
                        ...prev.channels,
                        phone: { ...prev.channels?.phone, recordCalls: val },
                      },
                    }))
                  }
                  className="scale-75 data-[state=checked]:bg-indigo-600"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  onClick={() => handleSave()}
                  disabled={saving}
                  className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                >
                  Save Voice Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          CHANNELS WORKSPACE (16 CHANNELS | CANVAS | RIGHT DRAWER)
         ═══════════════════════════════════════════════════════════════════════ */}
      {(studioTab === 'channels' || studioTab === 'build') && (
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
          {/* ── LEFT DRAWER: 16 CHANNELS (Matching Screenshot) ── */}
          <aside className="w-64 border-r border-slate-800 bg-slate-900 text-slate-100 flex flex-col shrink-0">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between px-4">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                CHANNELS &amp; INTEGRATIONS
              </span>
              <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-700">
                16 Available
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {CHANNELS_LIST.map((c) => {
                const IconComponent = c.icon;
                const isSelected = selectedChannel === c.id;
                // Real per-channel connection state from the DB (or
                // undefined for channels with no backend status). See
                // channelBadgeMap above for the lookup logic.
                const badge = channelBadgeMap[c.id];
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(c.id);
                      setRightDrawerMode('channel_settings');
                      setRightDrawerOpen(true);
                      setAgent((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, activeChannel: c.id },
                      }));
                      toast.info(`Switched to ${c.label}`);
                    }}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-xl transition-all text-left group',
                      isSelected
                        ? 'bg-slate-800 text-white border-l-4 border-blue-500 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    )}
                  >
                    <IconComponent
                      className={cn(
                        'size-4 mt-0.5 shrink-0 transition-colors',
                        isSelected ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                      )}
                    />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold leading-tight uppercase tracking-wide truncate">
                          {c.label}
                        </span>
                        {badge && (
                          <span
                            className={cn(
                              'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0',
                              badge === 'ACTIVE'
                                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/60',
                            )}
                          >
                            {badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 leading-snug line-clamp-1">
                        {c.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── CENTER CANVAS ── */}
          <main className="flex-1 min-h-0 flex flex-col justify-between p-6 relative overflow-hidden bg-slate-50/60 dark:bg-slate-950/60">
            {/* 1. PRESENTATION AGENT HUB */}
            {selectedChannel === 'presentation' ? (
              <AgentPresentationHub
                agent={agent}
                onChange={setAgent}
                onOpenFormInModal={(form) => setActiveConnectedFormModal(form)}
              />
            ) : selectedChannel === 'instagram' ? (
              /* 2. INSTAGRAM DM SIMULATOR (Screenshot 1) */
              <InstagramSimulator
                agent={agent}
                isTestMode={isTestMode}
                onOpenSettings={() => {
                  setRightDrawerMode('channel_settings');
                  setRightDrawerOpen(!rightDrawerOpen);
                }}
              />
            ) : selectedChannel === 'whatsapp' ? (
              /* 3. WHATSAPP CHAT SIMULATOR (Screenshot 2) */
              <WhatsAppSimulator
                agent={agent}
                isTestMode={isTestMode}
                onOpenSettings={() => {
                  setRightDrawerMode('channel_settings');
                  setRightDrawerOpen(!rightDrawerOpen);
                }}
              />
            ) : selectedChannel === 'phone' ? (
              /* 4. PHONE CALL SIMULATOR (Screenshot 4) */
              <PhoneSimulator
                agent={agent}
                onOpenSettings={() => {
                  setRightDrawerMode('channel_settings');
                  setRightDrawerOpen(!rightDrawerOpen);
                }}
              />
            ) : selectedChannel === 'gmail' ? (
              /* 5. GMAIL WEB INBOX SIMULATOR (Screenshot 6) */
              <GmailSimulator
                agent={agent}
                onOpenSettings={() => {
                  setRightDrawerMode('channel_settings');
                  setRightDrawerOpen(!rightDrawerOpen);
                }}
              />
            ) : selectedChannel === 'voice' ? (
              /* 6. VOICE AGENT CARD SIMULATOR (Screenshot 8) */
              <VoiceSimulator
                agent={agent}
                onOpenSettings={() => {
                  setRightDrawerMode('channel_settings');
                  setRightDrawerOpen(!rightDrawerOpen);
                }}
              />
            ) : selectedChannel === 'sms' ? (
              /* 7. SMS TEXT CONVERSATION SIMULATOR (Screenshot 10) */
              <SmsSimulator
                agent={agent}
                isTestMode={isTestMode}
                onOpenSettings={() => {
                  setRightDrawerMode('channel_settings');
                  setRightDrawerOpen(!rightDrawerOpen);
                }}
              />
            ) : (
              /* 8. WEBSITE EMBED FRAME SIMULATOR (For Chatbot, Standalone, WordPress, Shopify, Canva) */
              <>
                <div
                  className={cn(
                    'w-full max-w-4xl mx-auto flex-1 flex flex-col relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-sm overflow-hidden transition-all duration-300',
                    isSidebar && (isLeftPos ? 'pl-[390px]' : 'pr-[390px]')
                  )}
                  style={
                    agent.style?.pageBackgroundStart && agent.style?.pageBackgroundEnd
                      ? {
                          background: `linear-gradient(135deg, ${agent.style.pageBackgroundStart}25, ${agent.style.pageBackgroundEnd}45)`,
                          borderColor: agent.brandColor ? `${agent.brandColor}40` : undefined,
                        }
                      : undefined
                  }
                >
                  {/* Dummy Website Header Skeleton */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-800">
                    <div className="w-24 h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="flex gap-2">
                      <div className="w-12 h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <div className="w-12 h-3 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>

                  {/* Dummy Website Content Skeleton */}
                  <div className="space-y-3 pt-6 flex-1 max-w-lg">
                    <div className="w-full h-4 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="w-5/6 h-4 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="w-4/6 h-4 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                    <div className="w-3/4 h-4 rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
                  </div>

                  {/* Floating Purple FAB Button to Open Designer */}
                  <div
                    className={cn(
                      'absolute z-30 transition-all duration-300',
                      isLeftPos ? 'left-[380px] top-[260px]' : 'right-[380px] top-[260px]'
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRightDrawerMode('designer');
                        setRightDrawerOpen(true);
                      }}
                      className="size-9 rounded-full bg-purple-600 hover:bg-purple-700 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 ring-4 ring-purple-600/20"
                      title="Open Designer Panel (Avatars & Styles)"
                    >
                      <Settings className="size-4" />
                    </button>
                  </div>

                  {/* Simulator Dynamic Position Container */}
                  <div
                    className={cn(
                      'absolute z-20 transition-all duration-300 flex flex-col',
                      isSidebar
                        ? cn('top-0 bottom-0 w-[360px]', isLeftPos ? 'left-0' : 'right-0')
                        : cn('bottom-4 max-h-[560px] h-[560px] w-[350px] justify-end', isLeftPos ? 'left-4' : 'right-4')
                    )}
                  >
                    <AgentDeviceSimulator
                      agent={agent}
                      isTestMode={isTestMode}
                      previewPage={previewPage}
                      onOpenFormInModal={(form) => setActiveConnectedFormModal(form)}
                      onSwitchPage={(page) => setPreviewPage(page)}
                    />
                  </div>
                </div>

                {/* Bottom Canvas Toolbar (Page Switcher + Edit/Test Mode) */}
                <div className="max-w-4xl mx-auto w-full pt-3 flex items-center justify-between z-20">
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-1 rounded-lg shadow-xs text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPreviewPage(previewPage === 'conversation' ? 'greeting' : 'conversation')}
                      className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 hover:text-blue-600"
                    >
                      <MessageSquare className="size-3.5 text-blue-600" />
                      <span>{previewPage === 'conversation' ? 'Conversation Page' : 'Greeting Page'}</span>
                      <ChevronDown className="size-3 text-slate-400" />
                    </button>
                  </div>

                  <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-xs text-xs">
                    <button
                      type="button"
                      onClick={() => setIsTestMode(false)}
                      className={cn(
                        'px-3 py-1 rounded-full font-bold transition-all',
                        !isTestMode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      Edit Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsTestMode(true)}
                      className={cn(
                        'px-3 py-1 rounded-full font-bold transition-all',
                        isTestMode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                      )}
                    >
                      Test Mode
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRightDrawerMode('designer');
                      setRightDrawerOpen(true);
                    }}
                    className="h-7 text-xs font-semibold gap-1 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300"
                  >
                    <Paintbrush className="size-3 text-purple-600" /> Designer
                  </Button>
                </div>
              </>
            )}

            {/* Bottom Edit Mode / Test Mode for Standalone Phone/Chat views */}
            {selectedChannel !== 'chatbot' && selectedChannel !== 'standalone' && selectedChannel !== 'presentation' && (
              <div className="max-w-4xl mx-auto w-full pt-3 flex items-center justify-center z-20">
                <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-xs text-xs">
                  <button
                    type="button"
                    onClick={() => setIsTestMode(false)}
                    className={cn(
                      'px-4 py-1 rounded-full font-bold transition-all',
                      !isTestMode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    Edit Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsTestMode(true)}
                    className={cn(
                      'px-4 py-1 rounded-full font-bold transition-all',
                      isTestMode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    Test Mode
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* ── RIGHT DRAWER: CHANNEL SETTINGS OR DESIGNER ── */}
          {rightDrawerOpen && (
            <aside
              className={cn(
                'border-l border-slate-200 dark:border-slate-800 bg-slate-900 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200',
                selectedChannel === 'voice'
                  ? 'w-[410px]'
                  : selectedChannel === 'phone' || selectedChannel === 'sms'
                  ? 'w-[370px]'
                  : 'w-80',
              )}
            >
              <AgentBuildTab
                agent={agent}
                onChange={setAgent}
                availableForms={accountForms}
                activeChannel={selectedChannel}
                mode={rightDrawerMode}
                onClose={() => setRightDrawerOpen(false)}
                onPreviewPageChange={(page) => setPreviewPage(page)}
                siteOrigin={siteOrigin}
                onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
                onOpenInstagramModal={() => setIsInstagramModalOpen(true)}
                onOpenPresentationModal={() => setIsPresentationModalOpen(true)}
              />
            </aside>
          )}
        </div>
      )}

      {/* ── SKILLS TAB (TEXT.COM PARITY) ── */}
      {studioTab === 'skills' && (
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <AgentSkillsTab agent={agent} onChange={setAgent} />
            </div>
          </div>
          {showSideSimulator && (
            <aside className="w-[390px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col shrink-0 shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Bot className="size-3.5 text-blue-600" /> Live Skills Simulator
                </span>
                <button
                  type="button"
                  onClick={() => setShowSideSimulator(false)}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer p-1"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <AgentDeviceSimulator
                  agent={agent}
                  isTestMode={true}
                  previewPage={previewPage}
                  onOpenFormInModal={(form) => setActiveConnectedFormModal(form)}
                  onSwitchPage={(page) => setPreviewPage(page)}
                />
              </div>
            </aside>
          )}
        </div>
      )}

      {/* ── TRAIN (KNOWLEDGE) TAB ── */}
      {studioTab === 'train' && (
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <AgentTrainTab agent={agent} onChange={setAgent} />
            </div>
          </div>
          {showSideSimulator && (
            <aside className="w-[390px] border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex flex-col shrink-0 shadow-lg">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <Bot className="size-3.5 text-blue-600" /> Live RAG Simulator
                </span>
                <button
                  type="button"
                  onClick={() => setShowSideSimulator(false)}
                  className="text-muted-foreground hover:text-foreground text-xs cursor-pointer p-1"
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <AgentDeviceSimulator
                  agent={agent}
                  isTestMode={true}
                  previewPage={previewPage}
                  onOpenFormInModal={(form) => setActiveConnectedFormModal(form)}
                  onSwitchPage={(page) => setPreviewPage(page)}
                />
              </div>
            </aside>
          )}
        </div>
      )}

      {/* ── TEST LAB TAB ── */}
      {studioTab === 'test' && (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <AgentTestLab agentId={agent.id} />
          </div>
        </div>
      )}

      {/* ── PUBLISH TAB ── */}
      {studioTab === 'publish' && (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <AgentPublishTab
              agent={agent}
              onChange={setAgent}
              siteOrigin={siteOrigin}
              onSave={() => handleSave(agent)}
            />
          </div>
        </div>
      )}

      {/* ── SETTINGS DIALOG (GENERAL & NOTIFICATIONS) ── */}
      <AgentSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        agent={agent}
        onChange={setAgent}
      />

      {/* ── 3-STEP INSTAGRAM SETUP MODAL (Screenshot 3) ── */}
      <InstagramConnectModal
        open={isInstagramModalOpen}
        onOpenChange={setIsInstagramModalOpen}
        agent={agent}
        onSuccess={() => {
          setAgent((prev) => ({
            ...prev,
            channels: {
              ...prev.channels,
              instagram: { ...prev.channels?.instagram, enabled: true, autoReply: true, paired: true },
            },
          }));
        }}
      />

      {/* ── 3-OPTION ADD PRESENTATION MODAL (Screenshot 7) ── */}
      <PresentationAddModal
        open={isPresentationModalOpen}
        onOpenChange={setIsPresentationModalOpen}
        onSelectOption={(option) => {
          if (option === 'upload') {
            toast.info('Presentation upload ready: drop PDF or PPTX slides.');
          } else if (option === 'generate') {
            toast.info('AI Presentation Generator active.');
          } else {
            toast.info('Google Slides import ready.');
          }
        }}
      />

      {/* ── WHATSAPP CONNECT MODAL (Screenshot 2 + Text.com Flow) ── */}
      <WhatsAppConnectModal
        open={isWhatsAppModalOpen}
        onOpenChange={setIsWhatsAppModalOpen}
        agent={agent}
        onConnected={() => {
          // The real connection state is read from the DB via
          // /api/forms/agents/[id]/channel-status on the Publish tab.
          // The modal's Embedded Signup button already created a
          // tenant-owned CommunicationProvider row. We just need to
          // mark the channel as enabled locally — the Publish card
          // will re-fetch the real status on next render.
          setAgent((prev) => ({
            ...prev,
            channels: {
              ...prev.channels,
              whatsapp: { ...prev.channels?.whatsapp, enabled: true, paired: true },
            },
          }));
        }}
      />

      {/* Connected Form Modal — renders the REAL form via iframe (JotForm AI Agent parity) */}
      <Dialog open={!!activeConnectedFormModal} onOpenChange={(open) => !open && setActiveConnectedFormModal(null)}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-4 py-3 border-b shrink-0">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <FileText className="size-4 text-blue-600" />
              {activeConnectedFormModal?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {activeConnectedFormModal?.description || 'Fill and submit to complete inquiry'}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0 w-full overflow-hidden">
            {activeConnectedFormModal && (
              <iframe
                src={`/form/${encodeURIComponent(activeConnectedFormModal.id)}`}
                title={activeConnectedFormModal.name}
                className="w-full h-full border-0"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
