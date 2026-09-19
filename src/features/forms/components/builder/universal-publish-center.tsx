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

interface UniversalPublishCenterProps {
  project: UniversalProject;
  siteOrigin?: string;
}

export function UniversalPublishCenter({
  project,
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com',
}: UniversalPublishCenterProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const formSlug = project.forms?.[0]?.slug || `${project.slug}-form`;
  const agentSlug = project.agents?.[0]?.slug || `${project.slug}-agent`;
  const appSlug = project.slug;

  const formUrl = `${siteOrigin}/f/${formSlug}`;
  const agentUrl = `${siteOrigin}/chat/${agentSlug}`;
  const appUrl = `${siteOrigin}/app/${appSlug}`;

  const formEmbedCode = `<script src="${siteOrigin}/widget/form.js" data-form-id="${formSlug}" async></script>`;
  const agentEmbedCode = `<script src="${siteOrigin}/widget/agent.js" data-agent-id="${agentSlug}" data-position="bottom-right" async></script>`;

  const copyText = (text: string, key: string, label = 'Link') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 space-y-6 select-none font-sans">
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
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Public URL</label>
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
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Chat URL</label>
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
                <label className="text-[10px] font-bold uppercase text-muted-foreground">App PWA Link</label>
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
    </div>
  );
}
