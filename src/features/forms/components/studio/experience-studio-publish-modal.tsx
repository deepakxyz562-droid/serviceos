'use client';

import React, { useState } from 'react';
import {
  Share2,
  Globe,
  MessageSquare,
  Smartphone,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Code,
  Bot,
  FileInput,
  Layers,
  Sparkles,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import type { EditorFormData } from '@/features/forms/types';
import type { FormAgentData } from '@/features/forms/types/agent-types';

interface ExperienceStudioPublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: EditorFormData;
  agentData: FormAgentData;
  siteOrigin: string;
}

export function ExperienceStudioPublishModal({
  open,
  onOpenChange,
  formData,
  agentData,
  siteOrigin,
}: ExperienceStudioPublishModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const resolvedOrigin = siteOrigin || (typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com');
  const formSlugOrId = formData.slug || formData.id || 'service-request';
  const formUrl = `${resolvedOrigin}/f/${formSlugOrId}`;

  const agentSlugOrId = agentData.slug || agentData.id;
  const chatUrl = `${resolvedOrigin}/chat/${agentSlugOrId}`;

  const copyToClipboard = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const jsEmbedSnippet = `<script src="${resolvedOrigin}/embed.js" data-form="${formSlugOrId}" data-agent="${agentSlugOrId}" async></script>`;
  const iframeSnippet = `<iframe src="${formUrl}" width="100%" height="700" frameborder="0" style="border:none; border-radius:16px; overflow:hidden;" allow="camera; microphone; geolocation"></iframe>`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Please fill out this form: ${formUrl}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-600 text-white text-xs font-semibold">OMNICHANNEL PUBLISH</Badge>
            <span className="text-xs text-muted-foreground">Universal Distribution</span>
          </div>
          <DialogTitle className="text-lg font-bold">Publish &amp; Share Experience</DialogTitle>
          <DialogDescription className="text-xs">
            Distribute your Form, Conversational AI Chatbot, or Hybrid Experience across any website, mobile app, or WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="links" className="w-full mt-2 space-y-4">
          <TabsList className="bg-muted/60 p-1 rounded-xl grid grid-cols-4 h-auto">
            <TabsTrigger value="links" className="gap-1.5 text-xs font-semibold py-2">
              <Globe className="size-3.5 text-emerald-600" /> Public URLs
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1.5 text-xs font-semibold py-2">
              <Code className="size-3.5 text-blue-600" /> Embed Code
            </TabsTrigger>
            <TabsTrigger value="iframe" className="gap-1.5 text-xs font-semibold py-2">
              <Layers className="size-3.5 text-indigo-600" /> iFrame
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="gap-1.5 text-xs font-semibold py-2">
              <Smartphone className="size-3.5 text-emerald-500" /> WhatsApp &amp; QR
            </TabsTrigger>
          </TabsList>

          {/* 1. Public URLs */}
          <TabsContent value="links" className="space-y-4">
            {/* Form URL */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <FileInput className="size-4 text-emerald-600" />
                  <span>Hosted Form Link</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                  Live
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={formUrl}
                  className="flex-1 bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-muted-foreground select-all font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(formUrl, 'form_url', 'Form link')}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'form_url' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(formUrl, '_blank', 'noopener,noreferrer')}
                  className="h-8 rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="size-3.5" /> Open
                </Button>
              </div>
            </div>

            {/* AI Chatbot URL */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-xs">
                  <Bot className="size-4 text-blue-600" />
                  <span>AI Chatbot Fullscreen Link</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">
                  Interactive
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={chatUrl}
                  className="flex-1 bg-background border border-border/80 rounded-xl px-3 py-1.5 text-xs text-muted-foreground select-all font-mono"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(chatUrl, 'chat_url', 'Chatbot link')}
                  className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'chat_url' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  Copy
                </Button>
                <Button
                  size="sm"
                  onClick={() => window.open(chatUrl, '_blank', 'noopener,noreferrer')}
                  className="h-8 rounded-xl text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="size-3.5" /> Open
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* 2. 1-line JS Embed */}
          <TabsContent value="embed" className="space-y-3">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="text-xs font-bold text-foreground">1-Line JavaScript Widget Embed</div>
              <p className="text-[11px] text-muted-foreground">
                Paste this single line of code into the <code className="text-emerald-600 font-mono">&lt;body&gt;</code> of any HTML page, WordPress, or Shopify store. It mounts the interactive floating copilot widget.
              </p>
              <textarea
                readOnly
                value={jsEmbedSnippet}
                rows={3}
                className="w-full bg-slate-950 text-emerald-400 p-3 rounded-xl text-xs font-mono resize-none border border-slate-800"
              />
              <Button
                size="sm"
                onClick={() => copyToClipboard(jsEmbedSnippet, 'js_embed', 'JS Embed code')}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 cursor-pointer"
              >
                {copiedKey === 'js_embed' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                Copy JavaScript Code
              </Button>
            </div>
          </TabsContent>

          {/* 3. iFrame */}
          <TabsContent value="iframe" className="space-y-3">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
              <div className="text-xs font-bold text-foreground">Responsive iFrame Embed</div>
              <p className="text-[11px] text-muted-foreground">
                Embed the complete visual form or conversational interface seamlessly into your website container.
              </p>
              <textarea
                readOnly
                value={iframeSnippet}
                rows={4}
                className="w-full bg-slate-950 text-blue-400 p-3 rounded-xl text-xs font-mono resize-none border border-slate-800"
              />
              <Button
                size="sm"
                onClick={() => copyToClipboard(iframeSnippet, 'iframe', 'iFrame Embed code')}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 cursor-pointer"
              >
                {copiedKey === 'iframe' ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                Copy iFrame Code
              </Button>
            </div>
          </TabsContent>

          {/* 4. WhatsApp & QR Code */}
          <TabsContent value="whatsapp" className="space-y-4">
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 flex flex-col sm:flex-row items-center gap-4">
              <div className="size-28 rounded-xl bg-white border border-border/80 flex items-center justify-center p-2 shrink-0 shadow-sm">
                <QrCode className="size-24 text-slate-900" />
              </div>
              <div className="space-y-2 flex-1 text-center sm:text-left">
                <div className="text-xs font-bold text-foreground">Scan QR Code or Share via WhatsApp</div>
                <p className="text-[11px] text-muted-foreground">
                  Customers can scan this QR code on physical trucks, business cards, or flyers to launch this form or AI assistant immediately.
                </p>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                  <Button
                    size="sm"
                    onClick={() => window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Smartphone className="size-3.5" /> Share to WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(formUrl, 'qr_url', 'QR URL')}
                    className="h-8 text-xs rounded-xl gap-1.5 cursor-pointer"
                  >
                    <Copy className="size-3.5" /> Copy Direct Link
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
