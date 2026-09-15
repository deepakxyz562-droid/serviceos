'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Sparkles,
  FileInput,
  Globe,
  FileCode,
  Wand2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Calendar,
  Layers,
  Star,
  Users,
  MessageSquare,
  ChevronRight,
  UploadCloud,
  Check,
  X,
  CreditCard,
  Building,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { toast } from 'sonner';

export default function AiEmployeeLandingPage() {
  const [demoUrl, setDemoUrl] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    name: string;
    description: string;
    fields: Array<{ label: string; type: string }>;
  } | null>(null);

  const handleRunDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoUrl.trim()) {
      toast.error('Please enter your website URL or service description');
      return;
    }

    setDemoLoading(true);
    setDemoResult(null);

    try {
      const res = await fetch('/api/ai/form-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: demoUrl.startsWith('http') ? demoUrl : undefined,
          prompt: !demoUrl.startsWith('http') ? demoUrl : undefined,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setDemoResult({
        name: data.schema?.name || 'Custom AI Booking Form',
        description: data.schema?.description || 'Tailored to your business needs',
        fields: data.schema?.fields || [
          { label: 'Full Name', type: 'short_answer' },
          { label: 'Phone Number', type: 'phone' },
          { label: 'Service Requested', type: 'dropdown' },
          { label: 'Preferred Time Slot', type: 'date' },
        ],
      });
      toast.success('✨ AI Employee & Form successfully synthesized!');
    } catch {
      // Fallback preview
      setDemoResult({
        name: 'AI Emergency & Booking Assistant',
        description: 'Trained on your business services and 24/7 calendar availability.',
        fields: [
          { label: 'Your Name', type: 'short_answer' },
          { label: 'Contact Phone / SMS', type: 'phone' },
          { label: 'Service Category', type: 'dropdown' },
          { label: 'Preferred Appointment Slot', type: 'date' },
        ],
      });
      toast.success('✨ Preview generated!');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AiMarketingLayout>
      {/* ─── Hero Section with Interactive Generator ──────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-emerald-50/60 via-background to-background dark:from-emerald-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
            <Sparkles className="size-3.5 text-emerald-600" />
            <span>Turn Your Website Into a 24/7 AI Employee</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
            Instantly Answer Questions, Qualify Leads &amp;{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Book Jobs on Your Calendar
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Trained on your website content, service menus &amp; PDF manuals. Embeds anywhere with 1 line of JavaScript or our official WordPress plugin.
          </p>

          {/* Interactive URL Input Box */}
          <div id="demo" className="max-w-2xl mx-auto pt-4">
            <form
              onSubmit={handleRunDemo}
              className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/5 flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="demo-url-input"
                  type="text"
                  placeholder="Enter your website URL (e.g. https://myplumbing.com) or business type..."
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  disabled={demoLoading}
                  className="pl-10 h-12 text-xs sm:text-sm border-0 focus-visible:ring-0 shadow-none bg-transparent"
                />
              </div>
              <Button
                type="submit"
                disabled={demoLoading}
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl gap-2 shrink-0 shadow-md"
              >
                {demoLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {demoLoading ? 'Analyzing Website...' : 'Generate My AI Employee'}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-4">
              <span>✓ No credit card required</span>
              <span>✓ Live in under 60 seconds</span>
              <span>✓ 100% WordPress &amp; Shopify ready</span>
            </p>
          </div>

          {/* Live Preview Result (If generated) */}
          {demoResult && (
            <div className="max-w-xl mx-auto mt-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-emerald-300 dark:border-emerald-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-emerald-50 dark:bg-emerald-950/40 p-4 border-b border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-600" /> {demoResult.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                        {demoResult.description}
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">AI Synthesized</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Generated Form Fields &amp; Slot Capture:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {demoResult.fields.slice(0, 6).map((f, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border text-xs flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{f.label}</span>
                        <Badge variant="outline" className="text-[9px] capitalize">{f.type.replace('_', ' ')}</Badge>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">Ready to embed or customize in visual builder</span>
                    <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8">
                      <Link href="/login">Launch &amp; Install Free →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ─── 4 Core Pillars ───────────────────────────────────────────────── */}
      <section id="receptionist" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300">
            Unified 5-Layer AI Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            More Than a Chatbot. A Real AI Employee.
          </h2>
          <p className="text-base text-muted-foreground">
            Unlike generic chatbots that only spit out canned text, Fieseros AI understands customer intent, quotes real prices, checks your live availability, and inserts qualified jobs straight into your CRM.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <Card className="border-border hover:border-emerald-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <Bot className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">24/7 AI Receptionist</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Answers questions about your services, provides quotes, and guides customers through appointment booking day or night.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Card 2 */}
          <Card id="forms" className="border-border hover:border-teal-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                <FileInput className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">Conversational Forms</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Turn static 10-field forms into friendly back-and-forth chat flows. Higher completion rates and zero user fatigue.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Card 3 */}
          <Card id="knowledge" className="border-border hover:border-purple-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                <Globe className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">Knowledge Engine</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Auto-crawls your website, extracts FAQs and price sheets, and parses uploaded PDF &amp; Word manuals with vector search.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Card 4 */}
          <Card id="wordpress" className="border-border hover:border-blue-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <FileCode className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">WordPress &amp; JS Embed</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Install on WordPress in 3 clicks with our official connector plugin, or paste 1 line of JavaScript into Shopify, Webflow, or Wix.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* ─── Direct Payments & Zero Fee Callout ───────────────────────────── */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <Badge className="bg-emerald-600 text-white text-xs">Direct Payments</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Collect Direct Customer Payments with 0% Platform Fees
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                When an invoice or booking is created, money moves straight into your Stripe, Razorpay, or Bank Account. Fieseros does not touch your funds or take percentage cuts.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">✓ Razorpay UPI, Cards &amp; Netbanking</li>
                <li className="flex items-center gap-2">✓ Stripe Checkout Integration</li>
                <li className="flex items-center gap-2">✓ Direct Bank Account details with 1-click copy</li>
                <li className="flex items-center gap-2">✓ Amazon SES outbound delivery with smart Reply-To headers</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs font-semibold text-emerald-400">Universal Pay Checkout</span>
                <span className="text-xs text-slate-400">/pay/inv_123</span>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-slate-900 text-xs flex justify-between items-center">
                  <span>Emergency Plumbing Repair</span>
                  <span className="font-bold text-white">$149.00</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-emerald-600 text-center font-semibold text-xs">Pay via UPI / Card</div>
                  <div className="p-2.5 rounded-lg bg-slate-700 text-center font-semibold text-xs">Bank Transfer</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Competitive Comparison Matrix ─────────────────────────────────── */}
      <section id="compare-jotform" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">How Fieseros AI Compares</h2>
          <p className="text-sm text-muted-foreground">
            Why service businesses and agencies choose Fieseros AI over standalone chatbots and form builders.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3.5 font-semibold">Feature / Capability</th>
                <th className="p-3.5 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">Fieseros AI</th>
                <th className="p-3.5 font-semibold text-muted-foreground">SiteGPT</th>
                <th className="p-3.5 font-semibold text-muted-foreground">Jotform</th>
                <th className="p-3.5 font-semibold text-muted-foreground">Typeform</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-3.5 font-medium">Automatic Website Knowledge Crawler</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">✓ Included</td>
                <td className="p-3.5 text-slate-600">✓ Included</td>
                <td className="p-3.5 text-slate-400">✗ No</td>
                <td className="p-3.5 text-slate-400">✗ No</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Live Calendar Availability &amp; Booking</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">✓ Native Tool</td>
                <td className="p-3.5 text-slate-400">✗ No (Q&amp;A only)</td>
                <td className="p-3.5 text-slate-600">⚠ Manual widget</td>
                <td className="p-3.5 text-slate-400">✗ No</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Direct CRM Lead &amp; Job Creation</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">✓ Instant</td>
                <td className="p-3.5 text-slate-400">✗ Webhook only</td>
                <td className="p-3.5 text-slate-400">✗ Webhook only</td>
                <td className="p-3.5 text-slate-400">✗ Webhook only</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Official WordPress Connector Plugin</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">✓ 1-Click Shortcode</td>
                <td className="p-3.5 text-slate-600">✓ Plugin</td>
                <td className="p-3.5 text-slate-600">✓ Plugin</td>
                <td className="p-3.5 text-slate-600">✓ Plugin</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Pricing for CRM Users</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/20">👉 $10 / month</td>
                <td className="p-3.5 text-slate-600">$49 / mo</td>
                <td className="p-3.5 text-slate-600">$39 / mo</td>
                <td className="p-3.5 text-slate-600">$59 / mo</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Pricing Matrix ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-xs">Simple Transparent Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start Free. Upgrade As You Scale.
            </h2>
            <p className="text-sm text-muted-foreground">
              Existing Fieseros CRM subscribers get the entire AI Website Employee &amp; Smart Forms suite for just $10/month.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan 1: CRM Add-on */}
            <Card className="border-2 border-emerald-500 shadow-lg relative bg-white dark:bg-slate-900">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold">
                RECOMMENDED FOR CRM USERS
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">CRM Add-On</CardTitle>
                <CardDescription className="text-xs">For active Fieseros subscribers</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$10</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ 24/7 AI Website Receptionist</li>
                  <li className="flex items-center gap-2">✓ Unlimited Smart Forms</li>
                  <li className="flex items-center gap-2">✓ Automated Website Knowledge Crawler</li>
                  <li className="flex items-center gap-2">✓ Native Fieseros Calendar Booking &amp; CRM Sync</li>
                  <li className="flex items-center gap-2">✓ WordPress Plugin &amp; Universal JS Embed</li>
                </ul>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs">
                  <Link href="/login">Activate in Billing →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 2: Standalone Starter */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Standalone Starter</CardTitle>
                <CardDescription className="text-xs">For WordPress / Shopify sites</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$19</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ 1 AI Chat Agent</li>
                  <li className="flex items-center gap-2">✓ 5 Smart Responsive Forms</li>
                  <li className="flex items-center gap-2">✓ Amazon SES Outbound Notifications</li>
                  <li className="flex items-center gap-2">✓ Webhook &amp; Email Lead Alerts</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs">
                  <Link href="/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 3: Standalone Business */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Standalone Business</CardTitle>
                <CardDescription className="text-xs">For agencies &amp; multi-site owners</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$49</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited AI Chat Agents</li>
                  <li className="flex items-center gap-2">✓ Unlimited Responsive Forms</li>
                  <li className="flex items-center gap-2">✓ PDF &amp; Word Knowledge Ingestion</li>
                  <li className="flex items-center gap-2">✓ Custom CSS &amp; White-labeling</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs">
                  <Link href="/login">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Bottom Call to Action ────────────────────────────────────────── */}
      <section className="py-20 text-center max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to Turn Your Website into an AI Employee?
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Start answering inquiries and capturing qualified bookings in under 10 minutes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm">
            <Link href="#demo">Try Live AI Demo Now →</Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
