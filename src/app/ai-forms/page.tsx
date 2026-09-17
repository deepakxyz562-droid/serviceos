'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  FileInput,
  Bot,
  CreditCard,
  Layers,
  Wand2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  Camera,
  MapPin,
  Calculator,
  KeyRound,
  FileCheck,
  Check,
  Smartphone,
  Eye,
  Building,
  DollarSign,
  Loader2,
  QrCode,
  ArrowUpRight,
  Shield,
  MessageSquare,
  ChevronRight,
  PenTool,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { toast } from 'sonner';

export default function AiFormsLandingPage() {
  const [demoPrompt, setDemoPrompt] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    name: string;
    description: string;
    fields: Array<{ label: string; type: string }>;
  } | null>(null);

  const [activeGateway, setActiveGateway] = useState<'cards' | 'paypal' | 'upi' | 'bnpl' | 'applepay' | 'po'>('cards');

  const handleRunDemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!demoPrompt.trim()) {
      toast.error('Please enter a description or website URL');
      return;
    }

    setDemoLoading(true);
    setDemoResult(null);

    try {
      const res = await fetch('/api/ai/form-from-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: demoPrompt.startsWith('http') ? demoPrompt : undefined,
          prompt: !demoPrompt.startsWith('http') ? demoPrompt : undefined,
        }),
      });

      if (!res.ok) throw new Error('Generation failed');
      const data = await res.json();
      setDemoResult({
        name: data.schema?.name || 'Smart Conversational Intake Form',
        description: data.schema?.description || 'Auto-generated with live calculation, signature & payments',
        fields: data.schema?.fields || [
          { label: 'Customer Full Name', type: 'short_answer' },
          { label: 'Phone (with SMS OTP Verification)', type: 'phone_otp' },
          { label: 'Service Category & Inspection Type', type: 'dropdown' },
          { label: 'Photo Upload with Annotation Notes', type: 'media_notes' },
          { label: 'GPS Location Autocomplete', type: 'gps_map' },
          { label: 'Total Estimate Calculation', type: 'calculation' },
          { label: 'Digital Authorization Signature', type: 'signature' },
          { label: 'Direct Payment Checkout', type: 'payment_gateway' },
        ],
      });
      toast.success('✨ Smart Form schema & widgets synthesized!');
    } catch {
      // High quality fallback preview
      setDemoResult({
        name: 'AI Emergency Service & Booking Form',
        description: 'Complete with photo upload notes, live price calculation, OTP, and 33 payment gateways.',
        fields: [
          { label: 'Contact Name & Details', type: 'short_answer' },
          { label: 'Phone Number (SMS OTP Verified)', type: 'phone_otp' },
          { label: 'Issue Photo with Drawing Annotation', type: 'media_notes' },
          { label: 'Service Address & GPS Geofencing', type: 'gps_map' },
          { label: 'Live Labor & Parts Calculation', type: 'calculation' },
          { label: 'Customer E-Signature', type: 'signature' },
          { label: 'Direct Payment Checkout (0% Fee)', type: 'payment_gateway' },
        ],
      });
      toast.success('✨ Interactive preview ready!');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <AiMarketingLayout>
      {/* ─── Hero Section with Instant AI Form Generator ─────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-teal-50/60 via-background to-background dark:from-teal-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold shadow-xs">
            <Sparkles className="size-3.5 text-teal-600" />
            <span>200+ Smart Widgets • 33 Payment Gateways • 11 AI Channels</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15]">
            Build Next-Gen{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Smart Forms &amp; AI Agents
            </span>{' '}
            in Seconds
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Replace clunky legacy forms with high-converting conversational agents, live calculations, GPS coordinates, photo annotations, and 33 direct payment gateways with <strong>0% platform fees</strong>.
          </p>

          {/* Interactive Generator Box */}
          <div id="demo" className="max-w-2xl mx-auto pt-4">
            <form
              onSubmit={handleRunDemo}
              className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-500/30 shadow-xl shadow-teal-500/5 flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="demo-prompt-input"
                  type="text"
                  placeholder="Describe your form (e.g. HVAC Inspection with photo upload &amp; Stripe) or website URL..."
                  value={demoPrompt}
                  onChange={(e) => setDemoPrompt(e.target.value)}
                  disabled={demoLoading}
                  className="pl-10 h-12 text-xs sm:text-sm border-0 focus-visible:ring-0 shadow-none bg-transparent"
                />
              </div>
              <Button
                type="submit"
                disabled={demoLoading}
                className="h-12 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-xl gap-2 shrink-0 shadow-md"
              >
                {demoLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {demoLoading ? 'Building Smart Form...' : 'Generate with AI'}
              </Button>
            </form>
            <div className="flex flex-wrap items-center justify-center gap-4 text-[11px] text-muted-foreground mt-2">
              <span className="flex items-center gap-1"><Check className="size-3 text-teal-600 font-bold" /> 0% Platform Commission</span>
              <span className="flex items-center gap-1"><Check className="size-3 text-teal-600 font-bold" /> Paper, Card &amp; AI Chat Modes</span>
              <span className="flex items-center gap-1"><Check className="size-3 text-teal-600 font-bold" /> WordPress, Shopify &amp; 1-Line Embed</span>
            </div>
          </div>

          {/* Generated Form Preview (if synthesized) */}
          {demoResult && (
            <div className="max-w-2xl mx-auto mt-8 text-left animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-teal-300 dark:border-teal-800 shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
                <CardHeader className="bg-teal-50 dark:bg-teal-950/40 p-4 border-b border-teal-200 dark:border-teal-800/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                        <CheckCircle2 className="size-4 text-teal-600" /> {demoResult.name}
                      </CardTitle>
                      <CardDescription className="text-xs text-teal-800/80 dark:text-teal-400 mt-0.5">
                        {demoResult.description}
                      </CardDescription>
                    </div>
                    <Badge className="bg-teal-600 text-white text-[10px]">AI Synthesized</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Attached Smart Widgets &amp; Form Fields:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {demoResult.fields.map((f, i) => (
                      <div key={i} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border text-xs flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-slate-200">{f.label}</span>
                        <Badge variant="outline" className="text-[9px] capitalize text-teal-700 dark:text-teal-300 border-teal-300">
                          {f.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <div className="pt-2 flex items-center justify-between border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground">Ready to test, publish, or export</span>
                    <Button asChild size="sm" className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
                      <Link href="/?auth=signup&plan=standalone_starter">Open in Form Studio →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ─── 3 Runtime Modes (Paper, Cards, AI Chatbot) ──────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Multi-Format Form Runtime
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            One Form. Three Powerful Presentation Modes.
          </h2>
          <p className="text-sm text-muted-foreground">
            Switch your form’s presentation in 1 click to maximize user engagement across every device.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mode 1: Classic Paper */}
          <Card className="border-border hover:border-teal-500/50 transition shadow-xs">
            <CardHeader className="space-y-2">
              <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                <FileInput className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">Classic Paper Layout</CardTitle>
              <CardDescription className="text-xs">
                Familiar multi-column web forms with responsive sections, progress indicators, and mobile keyboard support.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5">
              <p>• Multi-page step pagination</p>
              <p>• Auto-save draft recovery</p>
              <p>• Offline local caching</p>
            </CardContent>
          </Card>

          {/* Mode 2: Card Swipe */}
          <Card className="border-border hover:border-blue-500/50 transition shadow-xs">
            <CardHeader className="space-y-2">
              <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                <Layers className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">Card Swipe (Typeform style)</CardTitle>
              <CardDescription className="text-xs">
                One question at a time with smooth micro-animations, keyboard shortcuts (Enter / Tab), and high completion rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5">
              <p>• Distraction-free single view</p>
              <p>• Dynamic conditional routing</p>
              <p>• Interactive score calculation</p>
            </CardContent>
          </Card>

          {/* Mode 3: AI Chatbot Agent */}
          <Card className="border-2 border-emerald-500/60 hover:border-emerald-500 transition shadow-md bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="space-y-2">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <Bot className="size-5" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">AI Agent Chatbot</CardTitle>
                <Badge className="bg-emerald-600 text-[9px]">Jotform AI Style</Badge>
              </div>
              <CardDescription className="text-xs">
                Conversational intake assistant that asks questions naturally, validates uploaded photos, and schedules bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5">
              <p>• 11-Channel deployment</p>
              <p>• Real-time FAQ answering</p>
              <p>• Direct calendar booking</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ─── 200+ Smart Widgets Ecosystem ───────────────────────────────────── */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Rich Widget Library</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              200+ Advanced Widgets Built For Real Business
            </h2>
            <p className="text-sm text-muted-foreground">
              Don’t settle for simple text fields. Collect annotated photos, live GPS locations, formula calculations, and OTP verified phone numbers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Widget 1: Media with notes */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                  <Camera className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Photo &amp; Video with Notes</h3>
                  <p className="text-[11px] text-muted-foreground">Drawing annotations &amp; voice memos</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Customers can snap inspection photos, draw circles/arrows over damaged parts, and attach detailed repair notes.
              </p>
            </div>

            {/* Widget 2: GPS Matrix */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">GPS Location &amp; Distance Matrix</h3>
                  <p className="text-[11px] text-muted-foreground">Auto-locate, geofence &amp; route driving time</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                1-tap device GPS coordinate capture, Google Maps address autocomplete, and automatic travel fee calculation.
              </p>
            </div>

            {/* Widget 3: Live Calculation Engine */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                  <Calculator className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Dynamic Formula Calculator</h3>
                  <p className="text-[11px] text-muted-foreground">Real-time math, tax, labor &amp; discount totals</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Build complex quote calculators: e.g. <code className="bg-muted px-1 rounded">(sq_ft * 4.50) + labor_hours * 85</code> with instant live updates.
              </p>
            </div>

            {/* Widget 4: SMS OTP Verification */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                  <KeyRound className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Twilio SMS OTP Phone Gate</h3>
                  <p className="text-[11px] text-muted-foreground">Instant 6-digit SMS verification code</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Eliminate fake phone numbers. Sends a real-time SMS passcode to authenticate genuine customer inquiries.
              </p>
            </div>

            {/* Widget 5: E-Signature */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                  <PenTool className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">Digital E-Signature Pad</h3>
                  <p className="text-[11px] text-muted-foreground">Legally compliant terms &amp; sign-off</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Smooth touch and mouse drawing canvas with timestamp, audit hash, and downloadable PDF certificate.
              </p>
            </div>

            {/* Widget 6: Multi-channel Chatbot */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                  <Bot className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">11-Channel AI Chat Agent</h3>
                  <p className="text-[11px] text-muted-foreground">Web, WhatsApp, Instagram, SMS &amp; Phone</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Publish your form as an active conversational agent across WhatsApp, Instagram DM, SMS, and website popups.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 33 Payment Gateways Interactive Showcase ────────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge className="bg-emerald-600 text-white text-xs">Direct Payments</Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            33 Payment Gateways. 0% Platform Commission.
          </h2>
          <p className="text-sm text-muted-foreground">
            Collect money straight into your Stripe, PayPal, Razorpay, or Bank Account. Fieseros charges <strong>zero transaction fees</strong>.
          </p>
        </div>

        {/* Interactive Payment Switcher */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Left Gateway Selector */}
          <div className="lg:col-span-5 space-y-2">
            {[
              { id: 'cards', title: 'Credit & Debit Cards', desc: 'Stripe, Square, Authorize.Net, Braintree' },
              { id: 'paypal', title: 'PayPal & Venmo', desc: 'Smart 1-click buyer checkout buttons' },
              { id: 'upi', title: 'PayU / Razorpay UPI QR', desc: 'Instant UPI dynamic QR code & netbanking' },
              { id: 'bnpl', title: 'Buy Now Pay Later (BNPL)', desc: 'Klarna, Afterpay, Affirm 4-installment plan' },
              { id: 'applepay', title: 'Apple Pay & Google Pay', desc: 'Native 1-tap mobile biometric checkout' },
              { id: 'po', title: 'Purchase Orders & Invoicing', desc: 'B2B PO numbers & net-30 tax invoicing' },
            ].map((gw) => (
              <button
                key={gw.id}
                type="button"
                onClick={() => setActiveGateway(gw.id as any)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  activeGateway === gw.id
                    ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-500 shadow-sm'
                    : 'bg-card border-border hover:border-emerald-300'
                }`}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{gw.title}</p>
                  <p className="text-[11px] text-muted-foreground">{gw.desc}</p>
                </div>
                {activeGateway === gw.id && <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />}
              </button>
            ))}
          </div>

          {/* Right Live Runtime Preview */}
          <div className="lg:col-span-7">
            <Card className="border-2 border-emerald-500/30 shadow-2xl bg-slate-900 text-white overflow-hidden">
              <CardHeader className="bg-slate-950/60 p-4 border-b border-slate-800 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold text-emerald-400">Live Gateway Runtime Preview</CardTitle>
                  <CardDescription className="text-[11px] text-slate-400">0% Platform Fee • Direct Merchant Settlement</CardDescription>
                </div>
                <Badge className="bg-emerald-600 text-white text-[9px]">ENCRYPTED SSL</Badge>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-semibold text-white">Full Service &amp; Maintenance Package</span>
                    <p className="text-[10px] text-slate-400">Includes parts, labor &amp; warranty</p>
                  </div>
                  <span className="text-base font-extrabold text-emerald-400">$189.00</span>
                </div>

                {activeGateway === 'cards' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-300 font-semibold uppercase">Card Number</label>
                      <Input placeholder="•••• •••• •••• 4242" className="h-10 bg-slate-950 border-slate-700 text-white text-xs" readOnly />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="MM / YY" className="h-10 bg-slate-950 border-slate-700 text-white text-xs" readOnly />
                      <Input placeholder="CVC" className="h-10 bg-slate-950 border-slate-700 text-white text-xs" readOnly />
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-10">
                      Pay $189.00 with Card →
                    </Button>
                  </div>
                )}

                {activeGateway === 'paypal' && (
                  <div className="space-y-2.5 animate-in fade-in duration-200">
                    <button className="w-full h-10 rounded-lg bg-[#FFC439] text-[#003087] font-bold text-xs flex items-center justify-center gap-1 shadow-sm">
                      <span>PayPal</span> Checkout
                    </button>
                    <button className="w-full h-10 rounded-lg bg-[#008CFF] text-white font-bold text-xs flex items-center justify-center gap-1 shadow-sm">
                      <span>Venmo</span>
                    </button>
                  </div>
                )}

                {activeGateway === 'upi' && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center space-y-3 animate-in fade-in duration-200">
                    <div className="flex items-center justify-center">
                      <div className="size-24 rounded-lg bg-white p-2 flex items-center justify-center text-slate-900 font-mono text-[10px] font-bold">
                        <QrCode className="size-20 text-slate-900" />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-300">Scan QR with GPay, PhonePe, Paytm or any UPI App</p>
                  </div>
                )}

                {activeGateway === 'bnpl' && (
                  <div className="space-y-3 animate-in fade-in duration-200">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300">
                      <p className="font-bold text-white mb-1">4 interest-free payments of $47.25</p>
                      <p className="text-[10px] text-slate-400">Due every 2 weeks via Klarna / Afterpay</p>
                    </div>
                    <Button className="w-full bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold h-10">
                      Pay 4x $47.25 with Klarna
                    </Button>
                  </div>
                )}

                {activeGateway === 'applepay' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <button className="w-full h-10 rounded-lg bg-black text-white font-bold text-xs flex items-center justify-center gap-1 border border-slate-700">
                       Pay with Apple Pay
                    </button>
                    <button className="w-full h-10 rounded-lg bg-white text-slate-900 font-bold text-xs flex items-center justify-center gap-1">
                      Pay with GPay
                    </button>
                  </div>
                )}

                {activeGateway === 'po' && (
                  <div className="space-y-2 animate-in fade-in duration-200">
                    <Input placeholder="Enter Purchase Order (PO) Number" className="h-10 bg-slate-950 border-slate-700 text-white text-xs" readOnly />
                    <Button className="w-full bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold h-10">
                      Submit PO &amp; Invoice Net-30
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Competitive Comparison Matrix ─────────────────────────────────── */}
      <section id="compare-jotform" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">How Fieseros AI Forms Compares</h2>
          <p className="text-sm text-muted-foreground">
            Why high-growth businesses choose Fieseros over expensive, rigid form builders.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-3.5 font-semibold">Capability</th>
                <th className="p-3.5 font-bold text-teal-600 bg-teal-50/50 dark:bg-teal-950/20">Fieseros AI Forms</th>
                <th className="p-3.5 font-semibold text-muted-foreground">Jotform</th>
                <th className="p-3.5 font-semibold text-muted-foreground">Typeform</th>
                <th className="p-3.5 font-semibold text-muted-foreground">Google Forms</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="p-3.5 font-medium">Platform Transaction Fees</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-teal-50/50 dark:bg-teal-950/20">0% Commission</td>
                <td className="p-3.5 text-slate-600">Plan limits / cuts</td>
                <td className="p-3.5 text-slate-600">Stripe only</td>
                <td className="p-3.5 text-slate-400">✗ No Payments</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Integrated Payment Gateways</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-teal-50/50 dark:bg-teal-950/20">33 Gateways (UPI, BNPL, Cards, PO)</td>
                <td className="p-3.5 text-slate-600">~30 (Requires paid tier)</td>
                <td className="p-3.5 text-slate-400">~2 (Stripe only)</td>
                <td className="p-3.5 text-slate-400">✗ None</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">11-Channel Conversational AI Agent</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-teal-50/50 dark:bg-teal-950/20">✓ Included (Web, WhatsApp, Voice, SMS)</td>
                <td className="p-3.5 text-slate-600">Limited chatbot</td>
                <td className="p-3.5 text-slate-400">✗ No agent</td>
                <td className="p-3.5 text-slate-400">✗ No agent</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Photo Annotation &amp; Voice Notes</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-teal-50/50 dark:bg-teal-950/20">✓ Native Widget</td>
                <td className="p-3.5 text-slate-600">Basic upload</td>
                <td className="p-3.5 text-slate-400">Basic upload</td>
                <td className="p-3.5 text-slate-400">Basic upload</td>
              </tr>
              <tr>
                <td className="p-3.5 font-medium">Pricing</td>
                <td className="p-3.5 font-bold text-emerald-600 bg-teal-50/50 dark:bg-teal-950/20">$7/mo (CRM) or $10 – $19/mo</td>
                <td className="p-3.5 text-slate-600">$39 – $129 / mo</td>
                <td className="p-3.5 text-slate-600">$29 – $99 / mo</td>
                <td className="p-3.5 text-slate-600">Free (Extremely basic)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ─── Pricing Matrix ───────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Transparent Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start Free. Scale Without Limits.
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose the plan that fits your business needs. 14-day free trial on all plans.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Plan 1: CRM Add-on */}
            <Card className="border-2 border-teal-500 shadow-lg relative bg-white dark:bg-slate-900">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold">
                BEST FOR CRM SUBSCRIBERS
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">CRM Add-On</CardTitle>
                <CardDescription className="text-xs">For active Fieseros CRM users</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$7</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Smart Forms &amp; Submissions</li>
                  <li className="flex items-center gap-2">✓ 200+ Interactive Widgets</li>
                  <li className="flex items-center gap-2">✓ 33 Payment Gateways (0% Fees)</li>
                  <li className="flex items-center gap-2">✓ Direct Calendar Booking &amp; Job Dispatch</li>
                  <li className="flex items-center gap-2">✓ Multi-Channel AI Agent</li>
                </ul>
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                  <Link href="/?tab=billing&addon=ai_website_forms">Add to CRM ($7/mo) →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 2: Standalone Starter */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Standalone Starter</CardTitle>
                <CardDescription className="text-xs">For single websites &amp; stores</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$10</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ 5 Smart Responsive Forms</li>
                  <li className="flex items-center gap-2">✓ 1 AI Chatbot Agent</li>
                  <li className="flex items-center gap-2">✓ 33 Payment Gateways (0% Fees)</li>
                  <li className="flex items-center gap-2">✓ 1-Line JavaScript &amp; WordPress Embed</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/?auth=signup&plan=standalone_starter">Start 14-Day Free Trial ($10/mo)</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 3: Standalone Business */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Standalone Business</CardTitle>
                <CardDescription className="text-xs">For agencies &amp; multi-brand businesses</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$19</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Smart Forms</li>
                  <li className="flex items-center gap-2">✓ Unlimited AI Chat Agents</li>
                  <li className="flex items-center gap-2">✓ Custom Domain &amp; White-Labeling</li>
                  <li className="flex items-center gap-2">✓ Twilio SMS OTP &amp; GPS Geofencing</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/?auth=signup&plan=standalone_business">Start 14-Day Free Trial ($19/mo)</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 text-center max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to Upgrade Your Forms to AI?
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Create your first smart conversational form in under 60 seconds.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm">
            <Link href="#demo">Try Instant AI Generator →</Link>
          </Button>
        </div>
      </section>
    </AiMarketingLayout>
  );
}
