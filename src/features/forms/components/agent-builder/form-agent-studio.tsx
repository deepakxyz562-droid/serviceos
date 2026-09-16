'use client';

import React, { useState, useEffect } from 'react';
import {
  FormAgentData,
  DEFAULT_FORM_AGENT,
  AgentChannelType,
} from '@/features/forms/types/agent-types';
import { AgentDeviceSimulator } from './agent-device-simulator';
import { AgentBuildTab } from './agent-build-tab';
import { AgentTrainTab } from './agent-train-tab';
import { AgentPublishTab } from './agent-publish-tab';
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
  ExternalLink,
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
  const [embedModalOpen, setEmbedModalOpen] = useState(false);

  // Sync initialAgent
  useEffect(() => {
    if (initialAgent) setAgent(initialAgent);
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
        toast.error('Failed to save agent settings');
      }
    } catch {
      toast.error('Network error saving agent');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden select-none">
      {/* ═══════════════════════════════════════════════════════════════════════
          1. TOP NAVIGATION BAR (BUILD | TRAIN | PUBLISH + DEVICE SWITCHER)
         ═══════════════════════════════════════════════════════════════════════ */}
      <header className="h-14 border-b border-border/80 bg-background px-4 flex items-center justify-between shrink-0 z-30 shadow-2xs">
        {/* Left: Back + Agent Title */}
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
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold leading-none">{agent.name}</h1>
                <span className="text-[10px] text-muted-foreground">({agent.roleTitle})</span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{agent.metrics?.totalConversations || 2} total conversations</span>
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

        {/* Right: Device Switcher + Test Mode Toggle + Save & Embed */}
        <div className="flex items-center gap-2.5">
          {/* Device Viewport */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border border-border/60">
            <button
              type="button"
              onClick={() => setDeviceViewport('mobile')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                deviceViewport === 'mobile' ? 'bg-background text-blue-600 shadow-2xs' : 'text-muted-foreground'
              )}
              title="Mobile View"
            >
              <Smartphone className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceViewport('tablet')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                deviceViewport === 'tablet' ? 'bg-background text-blue-600 shadow-2xs' : 'text-muted-foreground'
              )}
              title="Tablet View"
            >
              <Tablet className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setDeviceViewport('desktop')}
              className={cn(
                'p-1.5 rounded-md transition-all',
                deviceViewport === 'desktop' ? 'bg-background text-blue-600 shadow-2xs' : 'text-muted-foreground'
              )}
              title="Desktop View"
            >
              <Monitor className="size-3.5" />
            </button>
          </div>

          {/* Test Mode Switch */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/40 rounded-lg border border-border/60 text-[11px] font-medium">
            <span className={cn('text-[10px]', isTestMode ? 'text-blue-600 font-bold' : 'text-muted-foreground')}>
              Test Mode
            </span>
            <Switch checked={isTestMode} onCheckedChange={setIsTestMode} />
          </div>

          {/* Save Button */}
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-xs"
          >
            {saving ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
            <span>Save</span>
          </Button>

          {/* Get Embed Code */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setEmbedModalOpen(true)}
            className="h-8 px-3 text-xs border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 gap-1.5"
          >
            <Code className="size-3" />
            <span className="hidden sm:inline">Get Embed Code</span>
          </Button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════════
          2. MAIN 3-COLUMN WORKSPACE
         ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ─── LEFT COLUMN: 11 CHANNELS SIDEBAR ─── */}
        <aside className="w-48 lg:w-56 border-r border-border/80 bg-background flex flex-col shrink-0">
          <div className="p-3 border-b border-border/60 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>CHANNELS</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {CHANNELS_LIST.map((ch) => {
              const Icon = ch.icon;
              const isSelected = selectedChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChannel(ch.id)}
                  className={cn(
                    'w-full p-2 rounded-xl flex items-center justify-between text-xs font-semibold transition-all text-left',
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-900/60 shadow-2xs'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'size-7 rounded-lg flex items-center justify-center shrink-0',
                        isSelected ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground'
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span>{ch.label}</span>
                  </div>
                  {ch.badge && (
                    <Badge className="bg-emerald-500 text-white text-[8px] px-1 py-0 h-3.5 border-none">
                      {ch.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* ─── CENTER COLUMN: INTERACTIVE DEVICE SIMULATOR ─── */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center bg-slate-200/80 dark:bg-slate-900/80">
          <div
            className={cn(
              'transition-all duration-300 w-full flex justify-center items-center',
              deviceViewport === 'mobile' && 'max-w-[370px] h-[680px]',
              deviceViewport === 'tablet' && 'max-w-[560px] h-[740px]',
              deviceViewport === 'desktop' && 'max-w-[680px] h-[780px]'
            )}
          >
            <AgentDeviceSimulator
              agent={agent}
              isTestMode={isTestMode}
              onOpenFormInModal={(form) => {
                toast.info(`Opened connected form: "${form.name}"`);
              }}
            />
          </div>
        </main>

        {/* ─── RIGHT COLUMN: INSPECTOR DRAWER (BUILD | TRAIN | PUBLISH) ─── */}
        <aside className="w-80 lg:w-96 border-l border-border/80 bg-background flex flex-col shrink-0 overflow-y-auto p-4">
          <div className="pb-3 mb-3 border-b border-border/60 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {studioTab === 'build' && 'Chatbot Settings'}
              {studioTab === 'train' && 'Knowledge Training'}
              {studioTab === 'publish' && 'Omnichannel Publishing'}
            </h3>
            <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded">
              AI Forms Native
            </span>
          </div>

          {studioTab === 'build' && <AgentBuildTab agent={agent} onChange={setAgent} />}
          {studioTab === 'train' && <AgentTrainTab agent={agent} onChange={setAgent} />}
          {studioTab === 'publish' && <AgentPublishTab agent={agent} onChange={setAgent} siteOrigin={siteOrigin} />}
        </aside>
      </div>

      {/* ─── EMBED CODE MODAL ─── */}
      <Dialog open={embedModalOpen} onOpenChange={setEmbedModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-5 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Code className="size-4 text-blue-600" /> Embed AI Agent on Your Website
            </DialogTitle>
            <DialogDescription className="text-xs">
              Copy and paste this 1-line script before the closing &lt;/body&gt; tag of your site.
            </DialogDescription>
          </DialogHeader>
          <div className="p-3 bg-slate-950 text-slate-100 rounded-xl font-mono text-xs overflow-x-auto whitespace-pre-wrap">
            {`<script src="${siteOrigin || 'https://fieseros.com'}/widget/agent.js" data-agent-id="${agent.id}" async></script>`}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(
                  `<script src="${siteOrigin || 'https://fieseros.com'}/widget/agent.js" data-agent-id="${agent.id}" async></script>`
                );
                toast.success('Embed code copied!');
                setEmbedModalOpen(false);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
            >
              Copy to Clipboard
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
