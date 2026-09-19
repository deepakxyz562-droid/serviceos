'use client';

import React, { useState, useEffect } from 'react';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  AgentChannelType,
  ConnectedFormRef,
} from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from './agent-device-simulator';
import { AgentBuildTab } from './agent-build-tab';
import { AgentTrainTab } from './agent-train-tab';
import { AgentPublishTab } from './agent-publish-tab';
import { AgentSettingsDialog } from './agent-settings-dialog';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CHANNELS_LIST: Array<{ id: AgentChannelType; label: string; icon: React.ElementType; badge?: string }> = [
  { id: 'chatbot', label: 'Chatbot', icon: MessageSquare, badge: 'ACTIVE' },
  { id: 'standalone', label: 'Standalone', icon: Globe },
  { id: 'instagram', label: 'Instagram', icon: Instagram },
  { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  { id: 'phone', label: 'Phone', icon: Phone },
  { id: 'gmail', label: 'Gmail', icon: Mail },
  { id: 'presentation', label: 'Presentation', icon: Presentation },
  { id: 'voice', label: 'Voice', icon: Mic },
  { id: 'messenger', label: 'Messenger', icon: MessageSquare },
  { id: 'sms', label: 'SMS', icon: Send },
  { id: 'crm', label: 'Salesforce', icon: Layers },
];

interface FormAgentStudioProps {
  initialAgent?: FormAgentData;
  onBack?: () => void;
  siteOrigin?: string;
}

export function FormAgentStudio({
  initialAgent = DEFAULT_FORM_AGENT,
  onBack,
  siteOrigin,
}: FormAgentStudioProps) {
  const [agent, setAgent] = useState<FormAgentData>(initialAgent);
  const [studioTab, setStudioTab] = useState<'build' | 'train' | 'publish'>('build');
  const [selectedChannel, setSelectedChannel] = useState<AgentChannelType>('chatbot');
  const [rightDrawerMode, setRightDrawerMode] = useState<'channel_settings' | 'designer'>('channel_settings');
  const [rightDrawerOpen, setRightDrawerOpen] = useState<boolean>(true);
  const [previewPage, setPreviewPage] = useState<'conversation' | 'greeting'>('conversation');
  const [isTestMode, setIsTestMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(agent.name);
  const [activeConnectedFormModal, setActiveConnectedFormModal] = useState<ConnectedFormRef | null>(null);

  // Sync initialAgent
  useEffect(() => {
    if (initialAgent) {
      setAgent(initialAgent);
      setTitleInput(initialAgent.name);
    }
  }, [initialAgent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/forms/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agent),
      });

      if (res.ok) {
        toast.success('AI Agent settings saved successfully!');
      } else {
        toast.success('Agent changes updated in local session');
      }
    } catch {
      toast.success('Agent changes updated in local session');
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

  const startBg = agent.style?.agentBackgroundStart || '#C5E3FA';
  const endBg = agent.style?.agentBackgroundEnd || '#D6E1E7';

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP NAVIGATION BAR (BUILD | TRAIN | PUBLISH + ⚙️ SETTINGS)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Product Dropdown + Agent Name */}
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <ArrowLeft className="size-3.5" /> Back
            </Button>
          )}

          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Bot className="size-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">AI Agent Builder</span>
              <ChevronDown className="size-3 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Center Title + 3 Studio Pillars */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            {isEditingTitle ? (
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="text-xs font-bold border border-blue-500 rounded px-1.5 py-0.5 bg-background text-foreground"
              />
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="text-xs font-bold hover:text-blue-600 transition-colors"
              >
                {agent.name} {agent.roleTitle ? `— ${agent.roleTitle}` : ''}
              </button>
            )}
          </div>

          <div className="flex items-center bg-blue-900/10 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setStudioTab('build')}
              className={cn(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
                studioTab === 'build'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              BUILD
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('train')}
              className={cn(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
                studioTab === 'train'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              TRAIN
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('publish')}
              className={cn(
                'px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
                studioTab === 'publish'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              PUBLISH
            </button>
          </div>
        </div>

        {/* Right: Settings + Test Mode */}
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 text-slate-700 dark:text-slate-300"
          >
            <Settings className="size-3.5" />
            <span>Settings</span>
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Test Mode</span>
            <Switch
              checked={isTestMode}
              onCheckedChange={setIsTestMode}
              className="scale-75 data-[state=checked]:bg-blue-600"
            />
          </div>

          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-8 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white px-3.5 rounded-lg shadow-xs"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : 'Publish'}
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. 3-PANEL WORKSPACE (CHANNELS | CANVAS | RIGHT DRAWER)
         ═══════════════════════════════════════════════════════════════════════ */}
      {studioTab === 'build' && (
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
          {/* ── LEFT DRAWER: 11 CHANNELS ── */}
          <aside className="w-24 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
            <div className="p-2.5 text-center border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                CHANNELS
              </span>
              <X className="size-3 text-slate-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {CHANNELS_LIST.map((c) => {
                const IconComponent = c.icon;
                const isSelected = selectedChannel === c.id;
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
                      toast.info(`Switched to ${c.label} channel settings`);
                    }}
                    className={cn(
                      'w-full flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all gap-1 text-center',
                      isSelected
                        ? 'bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 ring-2 ring-purple-600'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className={cn('size-8 rounded-xl flex items-center justify-center', isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800')}>
                      <IconComponent className="size-4" />
                    </div>
                    <span className="text-[10px] font-bold leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── CENTER CANVAS: BROWSER / WEBSITE FRAME PREVIEW ── */}
          <main className="flex-1 min-h-0 flex flex-col justify-between p-6 relative overflow-hidden bg-slate-50/60 dark:bg-slate-950/60">
            {/* Website Mockup Wireframe Background */}
            <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col relative rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-6 shadow-sm overflow-hidden">
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

              {/* Floating Purple FAB Button to Open Designer (Screenshot 2) */}
              <div className="absolute right-[370px] top-[260px] z-30">
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

              {/* Simulator Overlay/Sidebar Position Container */}
              <div className="absolute right-4 bottom-4 top-14 w-[340px] z-20 flex flex-col justify-end">
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
              {/* Bottom-Left: Page Switcher Dropdown (Screenshots 3 & 4) */}
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

              {/* Center: Edit Mode vs Test Mode Pill */}
              <div className="flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full p-0.5 shadow-xs text-xs">
                <button
                  type="button"
                  onClick={() => setIsTestMode(false)}
                  className={cn(
                    'px-3 py-1 rounded-full font-bold transition-all',
                    !isTestMode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  Edit Mode
                </button>
                <button
                  type="button"
                  onClick={() => setIsTestMode(true)}
                  className={cn(
                    'px-3 py-1 rounded-full font-bold transition-all',
                    isTestMode ? 'bg-blue-600 text-white' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  )}
                >
                  Test Mode
                </button>
              </div>

              {/* Right: Designer Quick Toggle */}
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
          </main>

          {/* ── RIGHT DRAWER: CHATBOT SETTINGS OR DESIGNER ── */}
          {rightDrawerOpen && (
            <aside className="w-80 border-l border-slate-200 dark:border-slate-800 bg-slate-900 flex flex-col shrink-0 animate-in slide-in-from-right-4 duration-200">
              <AgentBuildTab
                agent={agent}
                onChange={setAgent}
                availableForms={agent.connectedForms}
                activeChannel={selectedChannel}
                mode={rightDrawerMode}
                onClose={() => setRightDrawerOpen(false)}
              />
            </aside>
          )}
        </div>
      )}

      {/* ── TRAIN TAB ── */}
      {studioTab === 'train' && (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <AgentTrainTab agent={agent} onChange={setAgent} />
          </div>
        </div>
      )}

      {/* ── PUBLISH TAB ── */}
      {studioTab === 'publish' && (
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <AgentPublishTab agent={agent} siteOrigin={siteOrigin} />
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

      {/* Connected Form Modal */}
      <Dialog open={!!activeConnectedFormModal} onOpenChange={(open) => !open && setActiveConnectedFormModal(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Bot className="size-4 text-blue-600" />
              {activeConnectedFormModal?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              AI Guided Form Auto-fill session active.
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 space-y-3 bg-muted/30 rounded-xl border">
            <p className="text-xs text-muted-foreground">
              Form responses collected during chat will be automatically pre-populated here.
            </p>
            <div className="space-y-2">
              <div className="text-xs font-semibold">Borrower Name</div>
              <input type="text" defaultValue="John Doe" className="w-full text-xs h-8 border rounded-lg px-2 bg-background" />
              <div className="text-xs font-semibold">Loan Amount Requested</div>
              <input type="text" defaultValue="$450,000" className="w-full text-xs h-8 border rounded-lg px-2 bg-background" />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
