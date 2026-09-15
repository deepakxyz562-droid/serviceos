'use client';

import { useState } from 'react';
import {
  Sparkles,
  Globe,
  Bot,
  FileInput,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Code,
  Copy,
  ExternalLink,
  Loader2,
  Calendar,
  Zap,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

interface AiEmployeeOnboardingWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId?: string;
}

export function AiEmployeeOnboardingWizard({
  open,
  onOpenChange,
  tenantId,
}: AiEmployeeOnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [crawledData, setCrawledData] = useState<{
    services: string[];
    faqsCount: number;
    hours: string;
  } | null>(null);

  // Agent Settings
  const [agentName, setAgentName] = useState('Service Assistant');
  const [welcomeMessage, setWelcomeMessage] = useState(
    '👋 Hi! I can answer your questions, give instant quotes, and help you book an appointment 24/7. What can we help you with today?'
  );

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://fieseros.com';
  const embedCode = `<script src="${siteOrigin}/embed/agent.js" data-agent="${tenantId || 'YOUR_TENANT_ID'}" async></script>`;

  const handleCrawl = async () => {
    if (!websiteUrl.trim()) {
      toast.error('Please enter your website URL');
      return;
    }

    setCrawling(true);
    try {
      const res = await fetch('/api/ai/crawl-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: websiteUrl.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Crawling failed');

      setCrawledData({
        services: data.source?.servicesFound || ['General Service Consultation', 'Emergency Repair'],
        faqsCount: data.source?.faqsCount || 5,
        hours: data.source?.businessHours || 'Mon-Fri 8:00 AM - 6:00 PM',
      });
      toast.success('Website parsed & AI knowledge base indexed!');
      setStep(2);
    } catch (e: any) {
      toast.error(e.message || 'Crawl failed, using defaults');
      setCrawledData({
        services: ['General Service Consultation', 'Emergency Repair'],
        faqsCount: 3,
        hours: 'Mon-Fri 8:00 AM - 6:00 PM',
      });
      setStep(2);
    } finally {
      setCrawling(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    toast.success('Embed script copied to clipboard!');
  };

  const stepProgress = (step / 4) * 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        {/* Header with Step Bar */}
        <div className="bg-slate-900 text-white p-6 pb-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-emerald-600 flex items-center justify-center">
                <Bot className="size-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">AI Employee &amp; Smart Forms Setup</h3>
                <p className="text-[11px] text-slate-400">Step {step} of 4: {
                  step === 1 ? 'Website Knowledge Training' :
                  step === 2 ? 'Personality & Welcome Greeting' :
                  step === 3 ? 'Conversational Booking & CRM' :
                  'Embed & Launch'
                }</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white text-[10px]">10-Minute Setup</Badge>
          </div>
          <Progress value={stepProgress} className="h-1.5 bg-slate-800" />
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {/* STEP 1: Website Crawler */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Globe className="size-4 text-emerald-600" /> Enter Your Business Website
                </h4>
                <p className="text-xs text-muted-foreground">
                  Our AI will crawl your website to automatically extract your services, pricing, business hours, and FAQs.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Website URL</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://yourcompany.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    disabled={crawling}
                    className="text-xs h-9.5"
                  />
                  <Button
                    onClick={handleCrawl}
                    disabled={crawling || !websiteUrl.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9.5 shrink-0 gap-1.5"
                  >
                    {crawling ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                    {crawling ? 'Crawling...' : 'Crawl & Index'}
                  </Button>
                </div>
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs space-y-1">
                <p className="font-semibold text-emerald-800 dark:text-emerald-300">💡 No website yet?</p>
                <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                  You can skip this step and upload PDF manuals or enter services manually later in Knowledge Base.
                </p>
                <Button variant="link" size="sm" onClick={() => setStep(2)} className="text-xs text-emerald-700 p-0 h-auto font-semibold">
                  Skip website crawling →
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Personality & Welcome Greeting */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Bot className="size-4 text-emerald-600" /> Configure AI Employee Identity
                </h4>
                <p className="text-xs text-muted-foreground">
                  Customize what your AI employee calls itself and how it greets website visitors.
                </p>
              </div>

              {crawledData && (
                <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-emerald-600">✓ Knowledge Indexed:</span>{' '}
                  {crawledData.services.length} services found ({crawledData.services.slice(0, 3).join(', ')})
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">AI Assistant Name</Label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="e.g. Pittsburgh Clean Pro Assistant"
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Welcome Greeting Message</Label>
                  <Textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                    rows={3}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Conversational Booking & CRM */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Calendar className="size-4 text-emerald-600" /> Conversational Booking &amp; CRM Sync
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your AI assistant is connected to your Fieseros OS calendar and lead pipeline.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Real-Time Calendar Slot Locking</p>
                    <p className="text-muted-foreground text-[11px]">
                      AI checks open slots and offers interactive time selection cards during conversation.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Direct CRM Lead Creation</p>
                    <p className="text-muted-foreground text-[11px]">
                      Submissions automatically populate customer contact details, notes, and requested service in Fieseros CRM.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-white dark:bg-slate-900 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">Amazon SES Instant Alerts</p>
                    <p className="text-muted-foreground text-[11px]">
                      Email notifications sent with smart <code>Reply-To: customer@email.com</code>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Embed & Launch */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Code className="size-4 text-emerald-600" /> Install on Your Website
                </h4>
                <p className="text-xs text-muted-foreground">
                  Your AI employee is ready to go live! Embed it with 1 line of script or use our WordPress plugin.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">1-Line Universal HTML Embed</Label>
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-6 text-xs gap-1">
                    <Copy className="size-3" /> Copy
                  </Button>
                </div>
                <pre className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs font-mono overflow-x-auto">
                  {embedCode}
                </pre>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-900 border rounded-lg text-xs space-y-1">
                <p className="font-semibold text-slate-800 dark:text-slate-200">🔌 WordPress Plugin</p>
                <p className="text-[11px] text-muted-foreground">
                  Install the connector plugin in <code>src/plugins/wordpress/fieseros-ai/</code> and paste your Agent ID: <code className="font-bold text-emerald-600">{tenantId || '...'}</code>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <DialogFooter className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t flex justify-between sm:justify-between">
          {step > 1 ? (
            <Button variant="outline" size="sm" onClick={() => setStep(step - 1)} className="text-xs gap-1">
              <ArrowLeft className="size-3" /> Back
            </Button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <Button
              size="sm"
              onClick={() => {
                if (step === 1 && !crawledData) {
                  handleCrawl();
                } else {
                  setStep(step + 1);
                }
              }}
              disabled={crawling}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1"
            >
              Next Step <ArrowRight className="size-3" />
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              {tenantId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/chat/${tenantId}`, '_blank')}
                  className="text-xs gap-1 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300"
                >
                  <ExternalLink className="size-3" /> Test Live Chat
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  toast.success('🎉 AI Employee & Smart Forms setup completed!');
                  onOpenChange(false);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
              >
                Done &amp; Close
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
