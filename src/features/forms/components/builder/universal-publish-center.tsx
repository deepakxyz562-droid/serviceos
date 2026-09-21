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
  Download,
  Printer,
  Lock,
  Eye,
  ShieldAlert,
  Layers,
  Send,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export interface UniversalPublishCenterProps {
  project?: UniversalProject;
  formId?: string;
  formSlug?: string;
  formName?: string;
  formDescription?: string;
  privacyLevel?: 'public' | 'private' | 'password';
  onPrivacyChange?: (level: 'public' | 'private' | 'password') => void;
  siteOrigin?: string;
}

export function UniversalPublishCenter({
  project,
  formId,
  formSlug: propFormSlug,
  formName: propFormName,
  privacyLevel = 'public',
  onPrivacyChange,
  siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com',
}: UniversalPublishCenterProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activePreset, setActivePreset] = useState<'card' | 'flyer' | 'truck' | 'counter' | 'social'>('flyer');

  const resolvedFormSlug =
    propFormSlug ||
    project?.forms?.[0]?.slug ||
    project?.slug ||
    'service-request';

  const resolvedFormName =
    propFormName ||
    project?.forms?.[0]?.name ||
    project?.name ||
    'Service Request Form';

  const formUrl = `${siteOrigin}/f/${resolvedFormSlug}`;
  const chatModeUrl = `${siteOrigin}/f/${resolvedFormSlug}?mode=chat`;
  const mobileModeUrl = `${siteOrigin}/f/${resolvedFormSlug}?mode=mobile`;

  const inlineEmbedCode = `<iframe \n  src="${formUrl}" \n  width="100%" \n  height="650" \n  frameborder="0" \n  style="border-radius: 12px; border: 1px solid rgba(0,0,0,0.08); box-shadow: 0 4px 12px rgba(0,0,0,0.05);">\n</iframe>`;

  const agentEmbedCode = `<!-- Fieseros AI Form Assistant -->\n<script \n  src="${siteOrigin}/embed/agent.js" \n  data-agent="${formId || resolvedFormSlug}" \n  data-form-id="${formId || resolvedFormSlug}" \n  async>\n</script>`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(formUrl)}`;

  const copyText = (text: string, key: string, label = 'Content') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    toast.success(`${label} copied to clipboard!`);
  };

  const handlePrintQR = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Scan to Open Form - ${resolvedFormName}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 24px; margin-bottom: 8px; }
            p { color: #64748b; font-size: 14px; margin-bottom: 24px; }
            img { width: 260px; height: 260px; border-radius: 12px; }
            .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 6px 14px; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>${resolvedFormName}</h1>
          <p>Scan the QR code below on your mobile phone to fill out this form</p>
          <img src="${qrImageUrl}" alt="Form QR Code" />
          <br/>
          <div class="badge">Powered by Fieseros GPTForm</div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-2 sm:p-6 space-y-6 font-sans">
      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-2">
            <Share2 className="size-6 text-emerald-600" />
            Publish &amp; Share
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            <strong className="text-foreground">One form. Anywhere your customers are.</strong> — Share via direct link, embed on your website, deploy in AI chat mode, launch as a mobile experience, or print QR codes.
          </p>
        </div>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-[11px] font-bold self-start sm:self-center py-1 px-3">
          ● Published &amp; Live
        </Badge>
      </div>

      {/* ─── 5-PILLAR PUBLISHING TABS ─── */}
      <Tabs defaultValue="share" className="w-full space-y-6">
        <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1.5 bg-muted/60 rounded-2xl gap-1 border border-border/60">
          <TabsTrigger value="share" className="rounded-xl py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Globe className="size-3.5 text-blue-500" />
            <span>1. Share Link</span>
          </TabsTrigger>
          <TabsTrigger value="embed" className="rounded-xl py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Code className="size-3.5 text-indigo-500" />
            <span>2. Embed</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="rounded-xl py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Bot className="size-3.5 text-emerald-500" />
            <span>3. AI Chat</span>
          </TabsTrigger>
          <TabsTrigger value="mobile" className="rounded-xl py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Smartphone className="size-3.5 text-purple-500" />
            <span>4. Mobile</span>
          </TabsTrigger>
          <TabsTrigger value="qr" className="rounded-xl py-2 text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <QrCode className="size-3.5 text-amber-500" />
            <span>5. QR Code</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── TAB 1: DIRECT LINK ─── */}
        <TabsContent value="share" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs bg-gradient-to-b from-card to-blue-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Globe className="size-4 text-blue-600" />
                  Direct Public Link
                </CardTitle>
                {onPrivacyChange && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground">Access:</span>
                    <Select value={privacyLevel} onValueChange={(v: any) => onPrivacyChange(v)}>
                      <SelectTrigger className="h-7 text-[11px] font-semibold bg-background rounded-lg px-2 border-border/80">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public" className="text-xs">🌐 Public</SelectItem>
                        <SelectItem value="password" className="text-xs">🔑 Password Protected</SelectItem>
                        <SelectItem value="private" className="text-xs">🔒 Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <CardDescription className="text-xs">
                Your form is hosted on a high-speed edge CDN and ready to share with customers anywhere.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={formUrl}
                  readOnly
                  className="h-10 text-xs font-mono bg-background select-all border-border/80"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => copyText(formUrl, 'direct_link', 'Direct Form URL')}
                    className="h-10 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer"
                  >
                    {copiedKey === 'direct_link' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    Copy Link
                  </Button>
                  <a
                    href={formUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-10 px-3 text-xs font-semibold rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground gap-1.5"
                  >
                    <span>Open</span>
                    <ExternalLink className="size-3.5 text-blue-600" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> SSL Encrypted
                  </p>
                  <p className="text-[10px] text-muted-foreground">End-to-end 256-bit encryption on all form submissions.</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> Real-Time Sync
                  </p>
                  <p className="text-[10px] text-muted-foreground">Form edits in the studio take effect instantly on this link.</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/60 space-y-1">
                  <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="size-3.5 text-emerald-500" /> Multi-Device
                  </p>
                  <p className="text-[10px] text-muted-foreground">Adapts seamlessly to phones, tablets, and desktop browsers.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 2: EMBED ON WEBSITE ─── */}
        <TabsContent value="embed" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inline Form Embed */}
            <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Code className="size-4 text-indigo-600" />
                      Inline Form Embed (iFrame)
                    </CardTitle>
                    <Badge variant="outline" className="text-[9px] font-mono">WordPress / Webflow / HTML</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Embed the full form directly into a page or blog post on your website.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={5}
                      value={inlineEmbedCode}
                      className="w-full text-xs font-mono p-3 bg-muted/50 border border-border/80 rounded-xl select-all resize-none focus:outline-hidden"
                    />
                  </div>
                </CardContent>
              </div>
              <div className="p-4 pt-0">
                <Button
                  size="sm"
                  onClick={() => copyText(inlineEmbedCode, 'inline_embed', 'Inline Embed Code')}
                  className="w-full h-9 gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
                >
                  {copiedKey === 'inline_embed' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copy iFrame Snippet
                </Button>
              </div>
            </Card>

            {/* Floating AI Chat Widget */}
            <Card className="rounded-2xl border-border/80 shadow-xs flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Sparkles className="size-4 text-emerald-600" />
                      Floating AI Chat Widget
                    </CardTitle>
                    <Badge className="bg-emerald-600 text-white text-[9px]">Text.com Style</Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Add a floating chat launcher in the bottom corner of your website with form context.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="relative">
                    <textarea
                      readOnly
                      rows={5}
                      value={agentEmbedCode}
                      className="w-full text-xs font-mono p-3 bg-muted/50 border border-border/80 rounded-xl select-all resize-none focus:outline-hidden"
                    />
                  </div>
                </CardContent>
              </div>
              <div className="p-4 pt-0">
                <Button
                  size="sm"
                  onClick={() => copyText(agentEmbedCode, 'agent_embed', 'AI Chat Script Snippet')}
                  className="w-full h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                >
                  {copiedKey === 'agent_embed' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copy Script Snippet
                </Button>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* ─── TAB 3: AI CHAT (CONVERSATIONAL FORM) ─── */}
        <TabsContent value="chat" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs bg-gradient-to-b from-card to-emerald-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Bot className="size-4 text-emerald-600" />
                  Conversational AI Form Mode
                </CardTitle>
                <Badge className="bg-emerald-600 text-white text-[10px]">Turn Form Into Conversation</Badge>
              </div>
              <CardDescription className="text-xs">
                Customers can speak or chat naturally with an AI assistant that gathers all required form fields through friendly dialogue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={chatModeUrl}
                  readOnly
                  className="h-10 text-xs font-mono bg-background select-all border-border/80"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => copyText(chatModeUrl, 'chat_link', 'AI Chat URL')}
                    className="h-10 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 rounded-xl shadow-xs cursor-pointer"
                  >
                    {copiedKey === 'chat_link' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    Copy Chat Link
                  </Button>
                  <a
                    href={chatModeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-10 px-3 text-xs font-semibold rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground gap-1.5"
                  >
                    <span>Test Chat</span>
                    <ExternalLink className="size-3.5 text-emerald-600" />
                  </a>
                </div>
              </div>

              <div className="p-4 bg-muted/40 rounded-xl border border-border/70 space-y-2">
                <p className="text-xs font-bold text-foreground">💡 How Conversational Mode Works:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>AI Copilot reads your form fields and asks questions one by one.</li>
                  <li>Answers are validated and mapped automatically to your form fields.</li>
                  <li>Visitors can ask clarifying questions about services, requirements, or pricing.</li>
                  <li>Escalates seamlessly to your <strong>Live Chat Inbox</strong> if human help is needed.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 4: MOBILE EXPERIENCE ─── */}
        <TabsContent value="mobile" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs bg-gradient-to-b from-card to-purple-500/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Smartphone className="size-4 text-purple-600" />
                    Mobile Experience
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Give your customers a mobile-friendly, app-like experience from any smartphone.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 border-purple-200 text-[10px] font-bold">
                  No App Store Required
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/60 dark:border-purple-900/40 space-y-2">
                <p className="text-xs font-bold text-purple-950 dark:text-purple-200">
                  📱 Zero-Friction Mobile Installation
                </p>
                <p className="text-xs text-purple-900/80 dark:text-purple-300">
                  Customers can add this form directly to their iOS or Android home screen in 1 click as an installable Web App (PWA). No app store downloads, updates, or account friction required.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={mobileModeUrl}
                  readOnly
                  className="h-10 text-xs font-mono bg-background select-all border-border/80"
                />
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    onClick={() => copyText(mobileModeUrl, 'mobile_link', 'Mobile Link')}
                    className="h-10 gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4 rounded-xl shadow-xs"
                  >
                    {copiedKey === 'mobile_link' ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    Copy Mobile Link
                  </Button>
                  <a
                    href={mobileModeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-10 px-3 text-xs font-semibold rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground gap-1.5"
                  >
                    <span>Open Preview</span>
                    <ExternalLink className="size-3.5 text-purple-600" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── TAB 5: QR CODE GENERATOR ─── */}
        <TabsContent value="qr" className="space-y-4">
          <Card className="rounded-2xl border-border/80 shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <QrCode className="size-4 text-amber-600" />
                QR Code &amp; Print Presets
              </CardTitle>
              <CardDescription className="text-xs">
                Generate high-resolution QR codes to put on trucks, business cards, flyers, and job sites.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col md:flex-row items-center gap-6 p-4 bg-muted/30 rounded-2xl border border-border/60">
                {/* Live QR Image */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0 text-center space-y-2">
                  <img
                    src={qrImageUrl}
                    alt="Form QR Code"
                    className="size-48 rounded-lg mx-auto"
                  />
                  <p className="text-[10px] font-mono text-slate-500">Scan to open form</p>
                </div>

                {/* Print Presets & Actions */}
                <div className="flex-1 space-y-4 w-full">
                  <div>
                    <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                      Print &amp; Placement Presets
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {[
                        { id: 'card', label: '📇 Business Card', sub: 'Compact QR' },
                        { id: 'flyer', label: '📄 Marketing Flyer', sub: 'High-Res' },
                        { id: 'truck', label: '🚚 Vehicle Decal', sub: 'Large scale' },
                        { id: 'counter', label: '🏪 Countertop Stand', sub: 'Storefront' },
                        { id: 'social', label: '📱 Social Media', sub: 'Square post' },
                      ].map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setActivePreset(preset.id as any)}
                          className={`p-2.5 rounded-xl border text-left transition-all text-xs font-semibold ${
                            activePreset === preset.id
                              ? 'bg-amber-500/15 border-amber-500 text-amber-900 dark:text-amber-200'
                              : 'bg-background border-border/70 hover:border-border text-muted-foreground'
                          }`}
                        >
                          <div>{preset.label}</div>
                          <div className="text-[10px] font-normal opacity-80">{preset.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        window.open(qrImageUrl, '_blank');
                        toast.success('Opening high-resolution QR image for download!');
                      }}
                      className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl h-9"
                    >
                      <Download className="size-3.5" /> Download PNG
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handlePrintQR}
                      className="gap-1.5 text-xs font-bold rounded-xl h-9"
                    >
                      <Printer className="size-3.5" /> Print QR Sheet
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── OPTIONAL CONNECTED UPGRADES BANNER (CLEAR MONETIZATION BOUNDARY) ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {/* Connected Fieseros CRM */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
                <Layers className="size-3" /> Fieseros Field CRM
              </span>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-none text-[9px]">Optional Connection</Badge>
            </div>
            <h4 className="text-xs font-bold">Turn Submissions Into Real Dispatch Jobs</h4>
            <p className="text-[11px] text-slate-300">
              Automatically convert leads into dispatch jobs, assign technicians, track equipment history, and issue invoices.
            </p>
          </div>
          <a
            href="https://fieseros.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 pt-1"
          >
            Explore Fieseros CRM &amp; Dispatch <ArrowRight className="size-3" />
          </a>
        </div>

        {/* Connected AI Receptionist */}
        <div className="p-4 rounded-2xl bg-slate-900 text-white border border-slate-800 space-y-2 flex flex-col justify-between">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-1">
                <Phone className="size-3" /> AI Phone Receptionist
              </span>
              <Badge className="bg-amber-500/20 text-amber-300 border-none text-[9px]">Telephony Add-on</Badge>
            </div>
            <h4 className="text-xs font-bold">24/7 Live AI Phone Call Answering</h4>
            <p className="text-[11px] text-slate-300">
              Give your business a dedicated phone number. The AI Receptionist answers calls 24/7, captures caller info, and books appointments.
            </p>
          </div>
          <a
            href="https://fieseros.com/#ai-receptionist"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 pt-1"
          >
            Explore AI Phone Receptionist <ArrowRight className="size-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
