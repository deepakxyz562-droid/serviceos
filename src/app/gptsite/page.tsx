'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Globe,
  CheckCircle2,
  ArrowRight,
  Zap,
  Calendar,
  Layers,
  Star,
  ShieldCheck,
  CreditCard,
  Building,
  Check,
  Loader2,
  LayoutTemplate,
  Laptop,
  Smartphone,
  MousePointerClick,
  Code2,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { toast } from 'sonner';

export default function GptSiteLandingPage() {
  const [demoPrompt, setDemoPrompt] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    title: string;
    tagline: string;
    sections: string[];
    features: string[];
  } | null>(null);

  const handleRunDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoPrompt.trim()) {
      toast.error('Please enter your trade or website URL');
      return;
    }

    setDemoLoading(true);
    setDemoResult(null);

    // Simulate instant AI synthesis on client side for guest teaser
    setTimeout(() => {
      const cleanName = demoPrompt.replace(/https?:\/\//i, '').replace(/www\./i, '').split('.')[0];
      const capitalized = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      const isTrade = !demoPrompt.includes('.');
      const title = isTrade ? `${capitalized} Pro Services` : `${capitalized} Official Website`;

      setDemoResult({
        title,
        tagline: 'High-converting local service website with instant online booking, price estimation, and mobile dispatch sync.',
        sections: [
          'Hero Section with 1-Click Instant Quote Request',
          'Live Service Catalog & Interactive Price Estimator',
          'Customer Reviews & Verified Badges Showcase',
          'Interactive Booking Calendar with Real-Time Slots',
          'Direct Payment Gateway (Stripe, UPI, Card)',
        ],
        features: [
          'Mobile Optimized & Google PageSpeed 98+',
          'Native GPTForm™ Smart Form Integration',
          'Automated SMS & Email Confirmation via Amazon SES',
          'Custom Domain & Free SSL Hosting Included',
        ],
      });
      setDemoLoading(false);
      toast.success('✨ GPTSite™ preview generated! Sign up free to publish.');
    }, 850);
  };

  return (
    <AiMarketingLayout>
      {/* ─── Hero Section with Interactive Generator ──────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-emerald-50/60 via-background to-background dark:from-emerald-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold shadow-xs">
              <Sparkles className="size-3.5 text-emerald-600" />
              <span>GPTSite™ · AI Website &amp; Landing Page Generator</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/50 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-medium">
              <span>🎁 Universal Free Tier: <strong>100 Lifetime Jobs &amp; Forms Free</strong></span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
            Generate a High-Converting{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Service Website &amp; Landing Page
            </span>{' '}
            in 60 Seconds
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Turn your business into an online booking machine. AI builds complete responsive service websites with built-in GPTForm™ calculators, real-time dispatch calendar, and direct checkout with <strong>0% platform fees</strong>.
          </p>

          {/* Interactive URL / Prompt Input Box */}
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
                  placeholder="Enter your trade or website URL (e.g. Dallas Roofing Pro, https://myplumbing.com)..."
                  value={demoPrompt}
                  onChange={(e) => setDemoPrompt(e.target.value)}
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
                {demoLoading ? 'Building GPTSite™...' : 'Generate My Website Free'}
              </Button>
            </form>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center justify-center gap-4">
              <span>✓ No credit card required</span>
              <span>✓ Live in under 60 seconds</span>
              <span>✓ 100% WordPress &amp; Custom Domain Ready</span>
            </p>
          </div>

          {/* Live Preview Result (If generated) */}
          {demoResult && (
            <div className="max-w-2xl mx-auto mt-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-emerald-300 dark:border-emerald-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-emerald-50 dark:bg-emerald-950/40 p-4 border-b border-emerald-200 dark:border-emerald-800/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-emerald-600" /> {demoResult.title}
                      </CardTitle>
                      <CardDescription className="text-xs text-emerald-700/80 dark:text-emerald-400 mt-0.5">
                        {demoResult.tagline}
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">AI Architecture Ready</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      Included Landing Page Sections:
                    </p>
                    <div className="space-y-1.5">
                      {demoResult.sections.map((sec, i) => (
                        <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border text-xs flex items-center gap-2">
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800 dark:text-slate-200">{sec}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60">
                    <span className="text-[11px] text-muted-foreground">Free Tier includes 100 lifetime jobs &amp; live custom domain</span>
                    <Button asChild size="sm" className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-4">
                      <Link href={`/register?prompt=${encodeURIComponent(demoPrompt)}`}>Publish Free on Fieseros →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ─── 4 Core Pillars of GPTSite™ ────────────────────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300">
            Next-Gen Service Website Platform
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Everything Your Trade Business Needs to Win Jobs Online
          </h2>
          <p className="text-base text-muted-foreground">
            GPTSite™ combines gorgeous mobile-first design, intelligent customer intake, live booking, and CRM synchronization in one unified engine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <Card className="border-border hover:border-emerald-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <LayoutTemplate className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">Instant AI Website Generation</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Provide your trade and service city. AI writes high-converting copy, formats photo galleries, and optimizes local SEO metadata in seconds.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Card 2 */}
          <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                <Sparkles className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">Integrated GPTForm™ Engine</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Embed smart roofing, HVAC, cleaning, and plumbing calculation widgets directly on your homepage with live price estimates.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Card 3 */}
          <Card className="border-border hover:border-purple-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                <Calendar className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">Real-Time Dispatch Calendar</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Customers book directly into open technician time windows. Prevent double bookings and route crews efficiently.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Card 4 */}
          <Card className="border-border hover:border-blue-400/60 transition shadow-xs">
            <CardHeader className="space-y-3">
              <div className="size-11 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Code2 className="size-6" />
              </div>
              <CardTitle className="text-lg font-bold">Custom Domain &amp; WordPress Sync</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Connect your custom `.com` domain with free SSL, or embed individual widgets on your existing WordPress or Webflow site in 1 click.
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
                When a customer books and pays on your GPTSite™, money moves directly into your Stripe, Razorpay, or Bank Account. Fieseros does not take percentage cuts from your hard-earned revenue.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">✓ Stripe Checkout, Credit Cards &amp; Apple Pay</li>
                <li className="flex items-center gap-2">✓ Razorpay UPI, Cards &amp; Netbanking</li>
                <li className="flex items-center gap-2">✓ Instant digital receipt delivery via Amazon SES</li>
                <li className="flex items-center gap-2">✓ Direct Bank Account details with 1-click copy</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs font-semibold text-emerald-400">Live Website Checkout</span>
                <span className="text-xs text-slate-400">/book/plumbing-emergency</span>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-slate-900 text-xs flex justify-between items-center">
                  <span>Emergency Drain Cleaning &amp; Diagnostic</span>
                  <span className="font-bold text-white">$189.00</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-lg bg-emerald-600 text-center font-semibold text-xs">Pay via Card / Apple Pay</div>
                  <div className="p-2.5 rounded-lg bg-slate-700 text-center font-semibold text-xs">Pay on Arrival / Cash</div>
                </div>
              </div>
            </div>
          </div>
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
              Every contractor gets 100 lifetime jobs and form submissions free. Fieseros CRM subscribers get unlimited GPTSite™ builders and GPTForm™ tools included.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Free Tier</CardTitle>
                <CardDescription className="text-xs">Zero monthly cost forever</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$0</span>
                  <span className="text-xs text-muted-foreground"> / forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ 100 Lifetime Jobs &amp; Invoices</li>
                  <li className="flex items-center gap-2">✓ 100 Form Submissions / month</li>
                  <li className="flex items-center gap-2">✓ 1 GPTSite™ Live Website</li>
                  <li className="flex items-center gap-2">✓ Direct Payments (0% fee)</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-emerald-500 hover:text-emerald-700">
                  <Link href="/register">Start Free Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 2: Pro CRM */}
            <Card className="border-2 border-emerald-500 shadow-lg relative bg-white dark:bg-slate-900">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold">
                MOST POPULAR
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">Professional CRM</CardTitle>
                <CardDescription className="text-xs">Complete Service OS &amp; GPTSite™ suite</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$49</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Jobs &amp; Invoices</li>
                  <li className="flex items-center gap-2">✓ Unlimited GPTSite™ Landing Pages</li>
                  <li className="flex items-center gap-2">✓ Unlimited GPTForm™ Submissions</li>
                  <li className="flex items-center gap-2">✓ Real-time GPS &amp; Dispatch Calendar</li>
                  <li className="flex items-center gap-2">✓ Custom Domain with Free SSL</li>
                </ul>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold">
                  <Link href="/register">Start 14-Day Free Trial →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 3: Scale */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Scale / Enterprise</CardTitle>
                <CardDescription className="text-xs">For multi-location contractors</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$99</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Multi-Location &amp; Multi-Brand Sites</li>
                  <li className="flex items-center gap-2">✓ 24/7 AI Voice Receptionist Phone Lines</li>
                  <li className="flex items-center gap-2">✓ Dedicated Account Manager</li>
                  <li className="flex items-center gap-2">✓ Custom CSS &amp; White-labeling</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-emerald-500 hover:text-emerald-700">
                  <Link href="/register">Scale Your Business</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Bottom Call to Action ────────────────────────────────────────── */}
      <section className="py-20 text-center max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to Build Your GPTSite™ Service Website?
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Start capturing high-intent local customer bookings and online payments in under 10 minutes.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm">
            <Link href="#demo">Generate Website Free Now →</Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
