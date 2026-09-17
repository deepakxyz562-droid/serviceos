'use client';

/**
 * AI section.
 *
 * Thin wrapper around the existing `AiVoiceSettingsTab` (Vapi.ai BYOK).
 * The full AI Assistant / Dispatcher / Pricing / Quote Generator /
 * Knowledge Base UI is tracked separately; for now the BYOK voice
 * configuration remains the live surface here.
 */

import { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  Globe,
  Upload,
  Code,
  Copy,
  ExternalLink,
  CheckCircle2,
  FileText,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiVoiceSettingsTab } from '@/components/settings/ai-voice-settings-tab';
import { DocumentUploadDialog } from '@/features/knowledge/components/document-upload-dialog';
import { AiEmployeeOnboardingWizard } from '@/features/ai-employee/components/ai-employee-onboarding-wizard';

export function AiSettings() {
  const [activeTab, setActiveTab] = useState('website_ai');
  const [crawlUrl, setCrawlUrl] = useState('');
  const [crawlLoading, setCrawlLoading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [tenantId, setTenantId] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com';

  useEffect(() => {
    fetch('/api/tenants/me')
      .then((r) => r.json())
      .then((data) => {
        if (data?.tenant?.id) setTenantId(data.tenant.id);
      })
      .catch(() => undefined);

    fetch('/api/addon-subscriptions')
      .then((r) => r.json())
      .then((data) => {
        const active = Array.isArray(data?.addons) && data.addons.some(
          (a: { addonCode: string; status: string }) => a.addonCode === 'ai_website_forms' && a.status === 'active'
        );
        setIsSubscribed(active);
      })
      .catch(() => undefined);
  }, []);

  const handleSubscribeAddon = async () => {
    setSubscribing(true);
    try {
      const res = await fetch('/api/addon-subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonCode: 'ai_website_forms', billingCycle: 'monthly' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Subscription failed');
      setIsSubscribed(true);
      toast.success('🎉 AI Website Employee & Smart Forms activated successfully!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Subscription failed');
    } finally {
      setSubscribing(false);
    }
  };

  const handleCrawlWebsite = async () => {
    if (!crawlUrl.trim()) {
      toast.error('Please enter a website URL');
      return;
    }
    setCrawlLoading(true);
    try {
      const res = await fetch('/api/ai/crawl-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: crawlUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crawl failed');
      toast.success(`Crawled successfully! Indexed ${data.source?.servicesFound?.length || 0} services & FAQs into AI memory.`);
      setCrawlUrl('');
    } catch (e: any) {
      toast.error(e.message || 'Failed to crawl website');
    } finally {
      setCrawlLoading(false);
    }
  };

  const embedScriptCode = `<script src="${siteOrigin}/embed/agent.js" data-agent="${tenantId || 'YOUR_TENANT_ID'}" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedScriptCode);
    toast.success('Embed script copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-2 max-w-md mb-4">
          <TabsTrigger value="website_ai" className="flex items-center gap-1.5 text-xs font-semibold">
            <Bot className="size-3.5 text-emerald-600" /> AI Website Employee
          </TabsTrigger>
          <TabsTrigger value="voice_ai" className="flex items-center gap-1.5 text-xs font-semibold">
            <Sparkles className="size-3.5 text-purple-600" /> Voice Receptionist
          </TabsTrigger>
        </TabsList>

        {/* ── Tab 1: AI Website Employee & Knowledge Base ──────────────────── */}
        <TabsContent value="website_ai" className="space-y-6">
          {/* Section 1: Overview Banner */}
          <Card className="border-emerald-200 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-teal-950/10">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
                    <Bot className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      24/7 AI Website Employee &amp; Smart Forms
                      {isSubscribed ? (
                        <Badge className="bg-emerald-600 text-white text-[10px]">Add-on Active ($7/mo)</Badge>
                      ) : (
                        <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px]">
                          Add-on Available ($7/mo)
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Answers visitor inquiries, offers real-time calendar booking slots, and creates CRM Leads automatically.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!isSubscribed ? (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-xs font-semibold"
                      onClick={handleSubscribeAddon}
                      disabled={subscribing}
                    >
                      {subscribing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      {subscribing ? 'Activating…' : 'Activate Add-on ($7/mo)'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs shadow-xs"
                      onClick={() => setOnboardingOpen(true)}
                    >
                      <Sparkles className="size-3.5" /> Launch Setup Wizard
                    </Button>
                  )}
                  {tenantId && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 gap-1.5 text-xs"
                      onClick={() => window.open(`/chat/${tenantId}`, '_blank')}
                    >
                      <ExternalLink className="size-3.5" /> Test Live Chat
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Section 2: Knowledge Base Training */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Globe className="size-4 text-emerald-600" /> Train AI Memory (Website Crawler &amp; Files)
              </CardTitle>
              <CardDescription className="text-xs">
                Teach your AI employee about your services, pricing, FAQs, and emergency policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* URL Crawler */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Crawl Existing Website URL
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="https://yourcompany.com"
                    value={crawlUrl}
                    onChange={(e) => setCrawlUrl(e.target.value)}
                    className="text-xs h-9"
                    disabled={crawlLoading}
                  />
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 shrink-0 gap-1.5"
                    onClick={handleCrawlWebsite}
                    disabled={crawlLoading || !crawlUrl.trim()}
                  >
                    {crawlLoading ? <Loader2 className="size-3.5 animate-spin" /> : <Globe className="size-3.5" />}
                    {crawlLoading ? 'Crawling...' : 'Crawl & Learn'}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Our crawler parses your site, discovers subpages, and extracts service prices, business hours, and FAQs.
                </p>
              </div>

              {/* Upload Documents */}
              <div className="pt-2 border-t flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Upload Price Guides &amp; Policy Documents
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Upload PDF, Word (DOCX), or TXT documents to expand your AI employee&apos;s knowledge.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadDialogOpen(true)}
                  className="gap-1.5 text-xs border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                >
                  <Upload className="size-3.5" /> Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Embed Script & WordPress Integration */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code className="size-4 text-emerald-600" /> Embed Widget &amp; Website Installation
              </CardTitle>
              <CardDescription className="text-xs">
                Install the floating AI chat bubble and embed responsive forms on any website.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    1-Line Universal HTML Embed (WordPress, Shopify, Squarespace, Webflow)
                  </span>
                  <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-7 text-xs gap-1">
                    <Copy className="size-3" /> Copy Script
                  </Button>
                </div>
                <pre className="bg-slate-900 text-slate-100 p-3 rounded-lg text-xs overflow-x-auto font-mono">
                  {embedScriptCode}
                </pre>
                <p className="text-[11px] text-muted-foreground">
                  Paste this script tag right before the closing <code className="text-emerald-600">&lt;/body&gt;</code> tag on your website.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border text-xs space-y-1.5">
                <p className="font-semibold text-slate-800 dark:text-slate-200">
                  🔌 Official WordPress Plugin
                </p>
                <p className="text-slate-600 dark:text-slate-400">
                  Prefer a WordPress plugin? Install the <strong>Fieseros AI &amp; Forms</strong> connector plugin located in <code className="text-emerald-600">src/plugins/wordpress/fieseros-ai/</code> and paste your Agent ID <code className="font-bold">{tenantId || '...'}</code> into the plugin settings.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 2: AI Voice Receptionist (Vapi.ai BYOK) ────────────────── */}
        <TabsContent value="voice_ai">
          <Card className="border-violet-200 dark:border-violet-800">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-9 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                  <Sparkles className="size-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div>
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    AI Voice Receptionist
                    <Badge variant="outline" className="text-[10px] bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800">
                      Bring Your Own Key
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Connect your AI Voice provider (Vapi.ai) to handle inbound phone calls 24/7.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <AiVoiceSettingsTab />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Document Upload Dialog */}
      <DocumentUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* AI Employee Onboarding Wizard */}
      <AiEmployeeOnboardingWizard
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        tenantId={tenantId}
      />
    </div>
  );
}
