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
  { id: 'crm', label: 'Salesforce / CRM', icon: Layers },
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
  const [deviceViewport, setDeviceViewport] = useState<'mobile' | 'tablet' | 'desktop'>('mobile');
  const [isTestMode, setIsTestMode] = useState(true);
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

  const pageStart = agent.style?.pageBackgroundStart || '#0f172a';
  const pageEnd = agent.style?.pageBackgroundEnd || '#1e293b';

  return (
    <div className="flex-1 min-h-0 flex flex-col w-full bg-background text-foreground overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP NAVIGATION BAR (BUILD | TRAIN | PUBLISH + ⚙️ SETTINGS)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-border/80 bg-background px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Product Dropdown + Inline Editable Title */}
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
            <div className="size-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-xs">
              <Bot className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
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
                    className="flex items-center gap-1.5 group text-xs font-bold hover:text-blue-600 transition-colors"
                  >
                    <span>{agent.name}</span>
                    <Pencil className="size-3 text-muted-foreground group-hover:text-blue-600" />
                  </button>
                )}
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-50/50 py-0">
                  Active
                </Badge>
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span>{agent.roleTitle}</span>
                <span>•</span>
                <span>{agent.metrics?.totalConversations || 312} sessions</span>
              </p>
            </div>
          </div>
        </div>

        {/* Center: 3 Studio Pillars (BUILD | TRAIN | PUBLISH) */}
        <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/60">
          <button
            type="button"
            onClick={() => setStudioTab('build')}
            className={cn(
              'px-4 py-1.5 text-xs font-bold rounded-lg transition-all',
              studioTab === 'build'
                ? 'bg-background text-blue-600 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
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
                ? 'bg-background text-blue-600 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
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
                ? 'bg-background text-blue-600 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            PUBLISH
          </button>
        </div>

        {/* Right: Settings + Test Mode + Save */}
        <div className="flex items-center gap-2.5">
          {/* Settings Modal Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="h-8 text-xs font-semibold gap-1.5 border-border/80"
          >
            <Settings className="size-3.5 text-muted-foreground" />
            <span>Settings</span>
          </Button>

          {/* Test Mode Switch */}
          <div className="flex items-center gap-2 bg-muted/40 px-2.5 py-1 rounded-lg border border-border/70">
            <span className="text-[11px] font-semibold text-muted-foreground">Test Mode</span>
            <Switch
              checked={isTestMode}
              onCheckedChange={setIsTestMode}
              className="scale-75 data-[state=checked]:bg-emerald-600"
            />
          </div>

          <Button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="h-8 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Save & Publish
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. 3-PANEL WORKSPACE (CHANNELS | CANVAS SIMULATOR | DESIGNER)
         ═══════════════════════════════════════════════════════════════════════ */}
      {studioTab === 'build' && (
        <div className="flex-1 min-h-0 flex flex-row overflow-hidden">
          {/* ── LEFT DRAWER: 11 MULTI-CHANNEL SELECTOR ── */}
          <aside className="w-56 border-r border-border/80 bg-muted/20 flex flex-col shrink-0">
            <div className="p-3 pb-2 border-b border-border/70">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                CHANNELS (11)
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {CHANNELS_LIST.map((c) => {
                const IconComponent = c.icon;
                const isSelected = selectedChannel === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedChannel(c.id);
                      setAgent((prev) => ({
                        ...prev,
                        channels: { ...prev.channels, activeChannel: c.id },
                      }));
                      toast.info(`Switched to ${c.label} channel view`);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left',
                      isSelected
                        ? 'bg-blue-600 text-white shadow-2xs font-bold'
                        : 'text-foreground hover:bg-muted/60'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <IconComponent className={cn('size-4', isSelected ? 'text-white' : 'text-muted-foreground')} />
                      <span>{c.label}</span>
                    </div>

                    {c.badge && (
                      <span
                        className={cn(
                          'text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase leading-none',
                          isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                        )}
                      >
                        {c.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* ── CENTER CANVAS: LIVE SIMULATOR ── */}
          <main
            className="flex-1 min-h-0 flex flex-col items-center justify-between p-6 relative overflow-hidden transition-all"
            style={{
              background: `linear-gradient(135deg, ${pageStart}, ${pageEnd})`,
            }}
          >
            {/* Viewport Switcher Toolbar */}
            <div className="flex items-center gap-1 bg-background/80 backdrop-blur px-2 py-1 rounded-xl border border-border/80 shadow-md z-20">
              <button
                type="button"
                onClick={() => setDeviceViewport('mobile')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                  deviceViewport === 'mobile' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Smartphone className="size-3.5" /> Mobile
              </button>
              <button
                type="button"
                onClick={() => setDeviceViewport('tablet')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                  deviceViewport === 'tablet' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Tablet className="size-3.5" /> Tablet
              </button>
              <button
                type="button"
                onClick={() => setDeviceViewport('desktop')}
                className={cn(
                  'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                  deviceViewport === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Monitor className="size-3.5" /> Desktop
              </button>
            </div>

            {/* Device Mockup Canvas Frame */}
            <div
              className={cn(
                'flex-1 my-3 flex items-center justify-center transition-all duration-300 w-full max-h-full',
                deviceViewport === 'mobile' && 'max-w-[400px]',
                deviceViewport === 'tablet' && 'max-w-[680px]',
                deviceViewport === 'desktop' && 'max-w-[860px]'
              )}
            >
              <div className="w-full h-full max-h-[660px] flex flex-col">
                <AgentDeviceSimulator
                  agent={agent}
                  isTestMode={isTestMode}
                  onOpenFormInModal={(form) => setActiveConnectedFormModal(form)}
                  onToggleTestMode={() => setIsTestMode(!isTestMode)}
                />
              </div>
            </div>

            {/* Bottom Edit vs Test Mode Switcher */}
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur px-3 py-1 rounded-full border border-border/80 shadow-md text-xs z-20">
              <button
                type="button"
                onClick={() => setIsTestMode(false)}
                className={cn(
                  'px-3 py-1 rounded-full font-bold transition-all',
                  !isTestMode ? 'bg-blue-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                ✎ Edit Mode
              </button>
              <button
                type="button"
                onClick={() => setIsTestMode(true)}
                className={cn(
                  'px-3 py-1 rounded-full font-bold transition-all',
                  isTestMode ? 'bg-emerald-600 text-white' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                ▶ Test Mode
              </button>
            </div>
          </main>

          {/* ── RIGHT DRAWER: DESIGNER (AVATAR & STYLE) ── */}
          <aside className="w-84 border-l border-border/80 bg-background flex flex-col shrink-0">
            <AgentBuildTab
              agent={agent}
              onChange={setAgent}
              availableForms={agent.connectedForms}
            />
          </aside>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          3. TRAIN TAB
         ═══════════════════════════════════════════════════════════════════════ */}
      {studioTab === 'train' && (
        <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <AgentTrainTab agent={agent} onChange={setAgent} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. PUBLISH TAB
         ═══════════════════════════════════════════════════════════════════════ */}
      {studioTab === 'publish' && (
        <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
          <div className="max-w-4xl mx-auto">
            <AgentPublishTab agent={agent} siteOrigin={siteOrigin} />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          5. SETTINGS DIALOG (7-PILLAR OPERATIONAL SUITE)
         ═══════════════════════════════════════════════════════════════════════ */}
      <AgentSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        agent={agent}
        onChange={setAgent}
      />

      {/* Connected Form Quick Fill Modal */}
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
