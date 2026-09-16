'use client';

import React, { useState } from 'react';
import {
  FormAgentData,
  AgentChannelType,
} from '@/features/forms/types/agent-types';
import {
  MessageSquare,
  Globe,
  Instagram,
  Phone,
  Mail,
  Presentation,
  Mic,
  Send,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  Sparkles,
  Zap,
  Code,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

interface AgentPublishTabProps {
  agent: FormAgentData;
  onChange: (updated: FormAgentData) => void;
  siteOrigin?: string;
}

export function AgentPublishTab({
  agent,
  onChange,
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com',
}: AgentPublishTabProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const standaloneUrl = `${siteOrigin}/chat/${agent.slug || 'clara-dental'}`;
  const embedScript = `<script src="${siteOrigin}/widget/agent.js" data-agent-id="${agent.id}" data-color="${agent.brandColor || '#2563eb'}" async></script>`;

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
      toast.success('Embed code copied to clipboard!');
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
      toast.success('Shareable link copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4">
      {/* ── 1. WEB CHATBOT EMBED WIDGET ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4 text-blue-600" />
              <div>
                <CardTitle className="text-xs font-bold">1. Website Chatbot Embed Widget</CardTitle>
                <CardDescription className="text-[11px]">
                  Add your AI agent to any website (WordPress, Shopify, Webflow, React, HTML).
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={agent.channels?.chatbot?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    chatbot: { ...agent.channels.chatbot, enabled: c },
                  },
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="p-3 bg-slate-950 text-slate-100 rounded-xl font-mono text-[11px] relative">
            <pre className="overflow-x-auto whitespace-pre-wrap">{embedScript}</pre>
            <Button
              type="button"
              size="sm"
              onClick={() => copyToClipboard(embedScript, 'code')}
              className="absolute top-2 right-2 h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              {copiedCode ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── 2. STANDALONE SHAREABLE PORTAL ── */}
      <Card className="rounded-xl border-border/80 shadow-xs">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-blue-600" />
              <div>
                <CardTitle className="text-xs font-bold">2. Dedicated Standalone Agent Page</CardTitle>
                <CardDescription className="text-[11px]">
                  Full-screen mobile-first chat link for Instagram bio, SMS campaigns, or email signatures.
                </CardDescription>
              </div>
            </div>
            <Switch
              checked={agent.channels?.standalone?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    standalone: { ...agent.channels.standalone, enabled: c },
                  },
                })
              }
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <div className="flex gap-2">
            <Input value={standaloneUrl} readOnly className="text-xs font-mono h-8 bg-muted/30" />
            <Button
              type="button"
              size="sm"
              onClick={() => copyToClipboard(standaloneUrl, 'link')}
              className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1"
            >
              {copiedLink ? <Check className="size-3" /> : <Copy className="size-3" />}
              <span>{copiedLink ? 'Copied' : 'Copy Link'}</span>
            </Button>
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center size-8 rounded-md border border-input hover:bg-muted shrink-0 text-muted-foreground hover:text-foreground"
              title="Open public page"
            >
              <ExternalLink className="size-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>

      {/* ── 3. WHATSAPP & SOCIAL CHANNELS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* WhatsApp */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <MessageCircle className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">WhatsApp Business</CardTitle>
                <p className="text-[10px] text-muted-foreground">Automated WhatsApp scheduler</p>
              </div>
            </div>
            <Switch
              checked={agent.channels?.whatsapp?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    whatsapp: { ...agent.channels.whatsapp, enabled: c },
                  },
                })
              }
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Status: <span className="font-semibold text-emerald-600">Paired ({agent.channels?.whatsapp?.phoneNumber || '+1 555-DENT'})</span>
          </CardContent>
        </Card>

        {/* Phone Voice AI */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <Phone className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">AI Phone Receptionist</CardTitle>
                <p className="text-[10px] text-muted-foreground">24/7 Inbound voice calling</p>
              </div>
            </div>
            <Switch
              checked={agent.channels?.phone?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    phone: { ...agent.channels.phone, enabled: c },
                  },
                })
              }
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Number: <span className="font-semibold text-foreground">{agent.channels?.phone?.phoneNumber || '1-800-555-DENT'}</span>
          </CardContent>
        </Card>

        {/* SMS Bot */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <Send className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">Two-Way SMS Bot</CardTitle>
                <p className="text-[10px] text-muted-foreground">Text auto-responder</p>
              </div>
            </div>
            <Switch
              checked={agent.channels?.sms?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    sms: { ...agent.channels.sms, enabled: c },
                  },
                })
              }
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Status: <span className="font-semibold text-emerald-600">Active</span>
          </CardContent>
        </Card>

        {/* Instagram DM */}
        <Card className="rounded-xl border-border/80 shadow-xs">
          <CardHeader className="p-3 pb-2 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-7 rounded-lg bg-pink-100 dark:bg-pink-950 text-pink-600 flex items-center justify-center">
                <Instagram className="size-4" />
              </div>
              <div>
                <CardTitle className="text-xs font-bold">Instagram DM</CardTitle>
                <p className="text-[10px] text-muted-foreground">Social lead capture</p>
              </div>
            </div>
            <Switch
              checked={agent.channels?.instagram?.enabled}
              onCheckedChange={(c) =>
                onChange({
                  ...agent,
                  channels: {
                    ...agent.channels,
                    instagram: { ...agent.channels.instagram, enabled: c },
                  },
                })
              }
            />
          </CardHeader>
          <CardContent className="p-3 pt-0 text-[11px] text-muted-foreground">
            Account: <span className="font-semibold text-foreground">@fieserosdental</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
