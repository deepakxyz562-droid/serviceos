'use client';

import React, { useState } from 'react';
import { UniversalProject } from '@/lib/forms/universal-component-types';
import {
  Share2,
  Globe,
  Bot,
  Smartphone,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Code,
  Sparkles,
  MessageCircle,
  Phone,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { FloatingFormAgentWidget } from '../runtime/floating-form-agent-widget';

interface UniversalPublishCenterProps {
  project: UniversalProject;
  siteOrigin?: string;
  formSchema?: any;
}

export function UniversalPublishCenter({
  project,
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com',
  formSchema,
}: UniversalPublishCenterProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [widgetPosition, setWidgetPosition] = useState<'bottom-right' | 'bottom-left' | 'bottom-center'>('bottom-right');
  const [widgetGreeting, setWidgetGreeting] = useState('👋 Have questions or want a quick quote? Ask our AI!');
  const [widgetColor, setWidgetColor] = useState(project.brandColor || '#059669');
  const [widgetDefaultMode, setWidgetDefaultMode] = useState<'chat' | 'form'>('chat');
  const [showLiveWidget, setShowLiveWidget] = useState(false);

  const formSlug = project.forms?.[0]?.slug || `${project.slug}-form`;
  const agentSlug = project.agents?.[0]?.slug || `${project.slug}-agent`;
  const appSlug = project.slug;

  const formUrl = `${siteOrigin}/f/${formSlug}`;
  const agentUrl = `${siteOrigin}/chat/${agentSlug}`;
  const appUrl = `${siteOrigin}/app/${appSlug}`;

  const formEmbedCode = `<script src="${siteOrigin}/widget/form.js" data-form-id="${formSlug}" async></script>`;
  const agentEmbedCode = `<script src="${siteOrigin}/widget/agent.js" data-agent-id="${agentSlug}" data-position="${widgetPosition}" data-color="${widgetColor}" async></script>`;

  const copyText = (text: string, key: string, label = 'Link') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-8 select-none font-sans">
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
          <Share2 className="size-6 text-primary" />
          Universal 3-Way Publishing Hub
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Publish your assets individually as standalone endpoints, or deploy the complete composed mobile PWA application.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* ─── OPTION 1: STANDALONE FORM ─── */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 bg-blue-50/60 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                <Globe className="size-4" />
                <span className="text-xs font-bold">1. Standalone Form</span>
              </div>
              <Badge className="bg-blue-600 text-white text-[9px]">Web &amp; Embed</Badge>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Deploy as a clean standalone intake/quote form or embed directly on WordPress/Shopify.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Public URL (/f/[slug])</label>
                <div className="flex gap-1">
                  <Input value={formUrl} readOnly className="text-xs font-mono h-8 bg-muted/40" />
                  <Button
                    size="sm"
                    onClick={() => copyText(formUrl, 'form_url', 'Form URL')}
                    className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white shrink-0"
                  >
                    {copiedKey === 'form_url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Embed Script</label>
                <div className="flex gap-1">
                  <Input value={formEmbedCode} readOnly className="text-xs font-mono h-8 bg-muted/40" />
                  <Button
                    size="sm"
                    onClick={() => copyText(formEmbedCode, 'form_embed', 'Embed Code')}
                    className="h-8 px-2 text-xs bg-slate-800 hover:bg-slate-900 text-white shrink-0"
                  >
                    {copiedKey === 'form_embed' ? <Check className="size-3" /> : <Code className="size-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-3 bg-muted/30 border-t flex justify-end">
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
            >
              Open Form <ExternalLink className="size-3" />
            </a>
          </div>
        </Card>

        {/* ─── OPTION 2: STANDALONE AI AGENT ─── */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between overflow-hidden">
          <div>
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <Bot className="size-4" />
                <span className="text-xs font-bold">2. Standalone AI Agent</span>
              </div>
              <Badge className="bg-emerald-600 text-white text-[9px]">Chat &amp; Voice</Badge>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Deploy as a 24/7 floating website chat concierge, full-screen chat, or WhatsApp bot.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Chat URL (/chat/[agentId])</label>
                <div className="flex gap-1">
                  <Input value={agentUrl} readOnly className="text-xs font-mono h-8 bg-muted/40" />
                  <Button
                    size="sm"
                    onClick={() => copyText(agentUrl, 'agent_url', 'Agent Link')}
                    className="h-8 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                  >
                    {copiedKey === 'agent_url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Floating Widget</label>
                <div className="flex gap-1">
                  <Input value={agentEmbedCode} readOnly className="text-xs font-mono h-8 bg-muted/40" />
                  <Button
                    size="sm"
                    onClick={() => copyText(agentEmbedCode, 'agent_embed', 'Widget Code')}
                    className="h-8 px-2 text-xs bg-slate-800 hover:bg-slate-900 text-white shrink-0"
                  >
                    {copiedKey === 'agent_embed' ? <Check className="size-3" /> : <Code className="size-3" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
          <div className="p-3 bg-muted/30 border-t flex justify-end">
            <a
              href={agentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-600 hover:underline flex items-center gap-1"
            >
              Open Agent <ExternalLink className="size-3" />
            </a>
          </div>
        </Card>

        {/* ─── OPTION 3: FULL COMPOSED APP PWA ─── */}
        <Card className="rounded-2xl border-purple-200 dark:border-purple-900/60 shadow-xl flex flex-col justify-between overflow-hidden ring-2 ring-purple-500/20">
          <div>
            <div className="p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="size-4" />
                <span className="text-xs font-bold">3. Full AI Mobile App</span>
              </div>
              <Badge className="bg-white/20 text-white text-[9px] border-none font-bold">⚡ All-In-One PWA</Badge>
            </div>
            <CardContent className="p-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Installable Progressive Web App (PWA) on iOS &amp; Android bundling Home Tiles, AI Concierge, Forms &amp; Passport.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">App PWA Link (/app/[slug])</label>
                <div className="flex gap-1">
                  <Input value={appUrl} readOnly className="text-xs font-mono h-8 bg-muted/40" />
                  <Button
                    size="sm"
                    onClick={() => copyText(appUrl, 'app_url', 'App PWA Link')}
                    className="h-8 px-2 text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                  >
                    {copiedKey === 'app_url' ? <Check className="size-3" /> : <Copy className="size-3" />}
                  </Button>
                </div>
              </div>
              <div className="p-2.5 bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/40 rounded-xl flex items-center justify-between text-xs text-purple-900 dark:text-purple-200">
                <span className="flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="size-4 text-purple-600" />
                  iOS / Android Installable
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">1-Click PWA</span>
              </div>
            </CardContent>
          </div>
          <div className="p-3 bg-muted/30 border-t flex justify-end">
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
            >
              Launch App <ExternalLink className="size-3" />
            </a>
          </div>
        </Card>
      </div>

      {/* ─── 4. CUSTOMIZABLE FLOATING POPUP WIDGET CONFIGURATOR ─── */}
      <Card className="rounded-2xl border-emerald-500/30 bg-gradient-to-br from-card via-card to-emerald-500/5 shadow-lg overflow-hidden">
        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Bot className="size-5 text-emerald-600" />
                Customizable Floating Popup Widget (Live Embed &amp; Tester)
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Customize your website's floating AI concierge &amp; lead capture bubble. Test it live directly on this screen.
              </CardDescription>
            </div>
            <Button
              onClick={() => {
                setShowLiveWidget((prev) => !prev);
                if (!showLiveWidget) {
                  toast.success('✨ Floating Widget launcher active in bottom corner!');
                }
              }}
              className={`text-xs font-bold gap-1.5 shadow-md ${
                showLiveWidget ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Sparkles className="size-3.5" />
              {showLiveWidget ? 'Hide Live Widget' : 'Test Live Widget on Screen'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Position Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Widget Position</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-center', label: 'Center' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                ].map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setWidgetPosition(pos.id as any)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                      widgetPosition === pos.id
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                        : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Mode & Color */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Default Open Mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWidgetDefaultMode('chat')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    widgetDefaultMode === 'chat'
                      ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 ring-2 ring-blue-500/20'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Bot className="size-3.5" /> AI Chat
                </button>
                <button
                  type="button"
                  onClick={() => setWidgetDefaultMode('form')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    widgetDefaultMode === 'form'
                      ? 'border-purple-600 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                      : 'border-border bg-card hover:bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <Globe className="size-3.5" /> Lead Form
                </button>
              </div>
            </div>

            {/* Brand Color Picker */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-foreground">Theme Color</label>
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="w-12 h-9 p-1 rounded-lg cursor-pointer bg-card border-border"
                />
                <Input
                  type="text"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  className="font-mono text-xs h-9"
                />
              </div>
            </div>
          </div>

          {/* Greeting Bubble Text */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-foreground">Greeting Bubble Text (Preview Callout)</label>
            <Input
              value={widgetGreeting}
              onChange={(e) => setWidgetGreeting(e.target.value)}
              placeholder="e.g. 👋 Have questions or want a quick quote? Ask our AI!"
              className="text-xs"
            />
          </div>

          {/* 1-Line Embed Code */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 space-y-2 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                1-LINE WEBSITE EMBED SNIPPET
              </span>
              <Button
                size="sm"
                onClick={() =>
                  copyText(
                    `<script src="${siteOrigin}/widget/agent.js" data-agent-id="${agentSlug}" data-position="${widgetPosition}" data-color="${widgetColor}" data-greeting="${encodeURIComponent(widgetGreeting)}" async></script>`,
                    'embed_full',
                    'Widget Embed Code'
                  )
                }
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
              >
                {copiedKey === 'embed_full' ? <Check className="size-3 mr-1" /> : <Copy className="size-3 mr-1" />}
                Copy Embed Script
              </Button>
            </div>
            <pre className="text-[11px] font-mono overflow-x-auto text-emerald-400 whitespace-pre-wrap leading-relaxed">
              {`<script src="${siteOrigin}/widget/agent.js" data-agent-id="${agentSlug}" data-position="${widgetPosition}" data-color="${widgetColor}" async></script>`}
            </pre>
          </div>
        </CardContent>
      </Card>

      {/* Live Floating Widget Test Instance */}
      {showLiveWidget && (
        <FloatingFormAgentWidget
          agentId={agentSlug}
          formId={formSlug}
          businessName={project.name || 'Apex Services'}
          brandColor={widgetColor}
          position={widgetPosition}
          greetingBubble={widgetGreeting}
          defaultMode={widgetDefaultMode}
          formSchema={formSchema}
        />
      )}
    </div>
  );
}
