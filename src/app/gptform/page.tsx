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
  Code2,
  Copy,
  Workflow,
  Download,
  Share2,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function AiFormsLandingPage() {
  const [demoPrompt, setDemoPrompt] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<{
    name: string;
    description: string;
    fields: Array<{ label: string; type: string }>;
  } | null>(null);

  // Interactive Live Calculation Demo State
  const [calcSqFt, setCalcSqFt] = useState(1250);
  const [calcTier, setCalcTier] = useState<'standard' | 'premium' | 'ultra'>('premium');
  const [calcAddonEmergency, setCalcAddonEmergency] = useState(true);
  const [calcAddonDisposal, setCalcAddonDisposal] = useState(false);

  // Calculated price
  const ratePerSqFt = calcTier === 'standard' ? 4.5 : calcTier === 'premium' ? 6.2 : 8.5;
  const basePrice = Math.round(calcSqFt * ratePerSqFt);
  const emergencyFee = calcAddonEmergency ? 250 : 0;
  const disposalFee = calcAddonDisposal ? 380 : 0;
  const totalEstimate = basePrice + emergencyFee + disposalFee;

  // Payment gateway preview tab
  const [activeGateway, setActiveGateway] = useState<'cards' | 'paypal' | 'upi' | 'bnpl' | 'applepay' | 'po'>('cards');

  // Embed code tab
  const [activeEmbed, setActiveEmbed] = useState<'html' | 'react' | 'iframe' | 'wordpress'>('html');
  const [copiedEmbed, setCopiedEmbed] = useState(false);

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

  const handleCopyEmbed = () => {
    const code =
      activeEmbed === 'html'
        ? `<script src="https://fieseros.com/widget/gptform.js" data-form-id="frm_live_94821"></script>`
        : activeEmbed === 'react'
        ? `import { GPTForm } from '@fieseros/react';\n\nexport default function App() {\n  return <GPTForm formId="frm_live_94821" mode="cards" onComplete={(res) => console.log(res)} />;\n}`
        : activeEmbed === 'iframe'
        ? `<iframe src="https://fieseros.com/f/frm_live_94821" width="100%" height="650px" frameborder="0"></iframe>`
        : `[fieseros_form id="frm_live_94821" theme="emerald" mode="split"]`;

    navigator.clipboard.writeText(code);
    setCopiedEmbed(true);
    toast.success('Embed code copied to clipboard!');
    setTimeout(() => setCopiedEmbed(false), 2000);
  };

  return (
    <AiMarketingLayout>
      {/* ─── Hero Section ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-teal-50/60 via-background to-background dark:from-teal-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs font-semibold shadow-xs">
              <Sparkles className="size-3.5 text-teal-600" />
              <span>GPTForm™ · AI-Powered Smart Forms &amp; Calculations</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <span>0% Platform Commission · 33 Payment Gateways</span>
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.12]">
            Build forms that{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">
              do the work for you.
            </span>
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Create AI-powered forms that calculate instant quotes, collect annotated photos, capture legal e-signatures, process payments with 0% platform fees, and sync every submission directly into your workflow.
          </p>

          {/* Interactive AI Prompt-to-Form Generator Box */}
          <div id="demo" className="max-w-3xl mx-auto pt-4">
            <form
              onSubmit={handleRunDemo}
              className="p-2 sm:p-2.5 rounded-2xl bg-white dark:bg-slate-900 border-2 border-teal-500/30 shadow-xl shadow-teal-500/5 flex flex-col sm:flex-row gap-2"
            >
              <div className="relative flex-1">
                <Wand2 className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="demo-prompt-input"
                  type="text"
                  placeholder="Describe your form (e.g. Roofing estimate with square footage calculator &amp; Stripe) or URL..."
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
                {demoLoading ? 'Synthesizing...' : 'Generate with AI'}
              </Button>
            </form>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2.5">
              <span className="text-[11px] text-muted-foreground">Try prompt:</span>
              <button
                type="button"
                onClick={() => setDemoPrompt('Roofing quote calculator with square feet formula, GPS address & signature')}
                className="px-2.5 py-1 rounded-full text-[11px] bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 hover:bg-teal-100 transition cursor-pointer"
              >
                📐 Roofing Estimate Calculator
              </button>
              <button
                type="button"
                onClick={() => setDemoPrompt('HVAC emergency inspection with photo upload notes and Stripe payment')}
                className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground transition cursor-pointer"
              >
                📸 HVAC Inspection + Photo Notes
              </button>
              <button
                type="button"
                onClick={() => setDemoPrompt('Split 2-part video quote form with service selection and SMS OTP')}
                className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground transition cursor-pointer"
              >
                🎬 2-Column Split Media Form
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-5 text-[11px] text-muted-foreground mt-4">
              <span className="flex items-center gap-1"><Check className="size-3.5 text-teal-600 font-bold" /> 100 Submissions / Month Free</span>
              <span className="flex items-center gap-1"><Check className="size-3.5 text-teal-600 font-bold" /> No Credit Card Required</span>
              <span className="flex items-center gap-1"><Check className="size-3.5 text-teal-600 font-bold" /> 0% Platform Commission</span>
              <span className="flex items-center gap-1"><Check className="size-3.5 text-teal-600 font-bold" /> 1-Line Embed Everywhere</span>
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
                      <Link href="/forms">Open in Form Studio →</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      {/* ─── Dynamic Live Calculation Engine Showcase ────────────────────────── */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            <Calculator className="w-3.5 h-3.5 mr-1" /> Dynamic Pricing Engine
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Quote with Live Formulas &amp; Real-Time Math
          </h2>
          <p className="text-sm text-muted-foreground">
            Customers adjust dimensions, select material tiers, and watch estimates update live before signing and paying.
          </p>
        </div>

        <div className="rounded-2xl border-2 border-teal-500/20 bg-card p-6 sm:p-8 shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Interactive Form Controls */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground">Roofing &amp; Siding Live Cost Estimator</h3>
                <p className="text-xs text-muted-foreground">Formula: <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">(sqft × rate) + add-ons</code></p>
              </div>
              <Badge className="bg-emerald-600 text-white text-[10px]">Live Calculation</Badge>
            </div>

            {/* Slider: Area */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-semibold text-foreground">Surface Area (Square Feet):</span>
                <span className="font-bold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">{calcSqFt.toLocaleString()} sq ft</span>
              </div>
              <input
                type="range"
                min="400"
                max="4500"
                step="50"
                value={calcSqFt}
                onChange={(e) => setCalcSqFt(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>400 sq ft</span>
                <span>2,500 sq ft</span>
                <span>4,500 sq ft</span>
              </div>
            </div>

            {/* Material Grade Selection */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Select Material Grade:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'standard', name: 'Standard Shingle', rate: '$4.50/sq ft' },
                  { id: 'premium', name: 'Architectural', rate: '$6.20/sq ft' },
                  { id: 'ultra', name: 'Standing Seam', rate: '$8.50/sq ft' },
                ].map((tier) => (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => setCalcTier(tier.id as any)}
                    className={cn(
                      'p-2.5 rounded-xl border text-left transition-all text-xs',
                      calcTier === tier.id
                        ? 'border-teal-500 bg-teal-50/60 dark:bg-teal-950/40 text-teal-950 dark:text-teal-200 font-bold ring-1 ring-teal-500'
                        : 'border-border bg-background text-muted-foreground hover:border-teal-300',
                    )}
                  >
                    <p className="truncate">{tier.name}</p>
                    <p className="text-[10px] text-teal-600 dark:text-teal-400 mt-0.5">{tier.rate}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Add-on Options */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Optional Add-ons:</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-background cursor-pointer hover:border-teal-300 text-xs">
                  <input
                    type="checkbox"
                    checked={calcAddonEmergency}
                    onChange={(e) => setCalcAddonEmergency(e.target.checked)}
                    className="accent-teal-600 size-4 rounded"
                  />
                  <div>
                    <span className="font-medium text-foreground">Emergency Rapid Response</span>
                    <span className="block text-[10px] text-muted-foreground">+$250 dispatch fee</span>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-background cursor-pointer hover:border-teal-300 text-xs">
                  <input
                    type="checkbox"
                    checked={calcAddonDisposal}
                    onChange={(e) => setCalcAddonDisposal(e.target.checked)}
                    className="accent-teal-600 size-4 rounded"
                  />
                  <div>
                    <span className="font-medium text-foreground">Old Debris Removal</span>
                    <span className="block text-[10px] text-muted-foreground">+$380 dumpster haul</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Real-Time Live Total & Action Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 to-teal-950 text-white p-6 rounded-2xl border border-teal-500/40 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-teal-800/60 pb-3">
              <span className="text-xs font-medium text-teal-300">Live Breakdown</span>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-[10px]">Instant Quote</Badge>
            </div>

            <div className="space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Base ({calcSqFt} sq ft × ${ratePerSqFt.toFixed(2)}):</span>
                <span className="font-mono text-white">${basePrice.toLocaleString()}</span>
              </div>
              {calcAddonEmergency && (
                <div className="flex justify-between text-teal-300">
                  <span>Emergency Dispatch:</span>
                  <span className="font-mono">+$250</span>
                </div>
              )}
              {calcAddonDisposal && (
                <div className="flex justify-between text-teal-300">
                  <span>Debris Removal &amp; Haul:</span>
                  <span className="font-mono">+$380</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-teal-800/60">
              <span className="text-[11px] uppercase tracking-wider text-teal-400 font-semibold block">Calculated Total</span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono">
                  ${totalEstimate.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400">USD</span>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs h-10 shadow-lg">
                <PenTool className="w-3.5 h-3.5 mr-1.5" /> Sign &amp; Pay Deposit ($500)
              </Button>
              <p className="text-[10px] text-center text-slate-400">
                🔒 256-bit encryption · 0% transaction commission
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4 Runtime Presentation Modes ────────────────────────────────────── */}
      <section className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Multi-Format Form Runtime
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            One Form. Four High-Converting Presentation Modes.
          </h2>
          <p className="text-sm text-muted-foreground">
            Switch your form’s presentation in 1 click to maximize customer completion and conversion rates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Mode 1: Classic Paper */}
          <Card className="border-border hover:border-teal-500/50 transition shadow-xs">
            <CardHeader className="space-y-2">
              <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                <FileInput className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">Classic Multi-Step</CardTitle>
              <CardDescription className="text-xs">
                Familiar web form with responsive sections, step pagination, and auto-save draft recovery.
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
              <CardTitle className="text-base font-bold">Card Swipe (Typeform)</CardTitle>
              <CardDescription className="text-xs">
                One question at a time with smooth micro-animations and distraction-free keyboard navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5">
              <p>• Distraction-free single view</p>
              <p>• Dynamic conditional routing</p>
              <p>• Interactive score calculation</p>
            </CardContent>
          </Card>

          {/* Mode 3: 2-Column Split Media */}
          <Card className="border-2 border-teal-500/60 hover:border-teal-500 transition shadow-md bg-teal-50/20 dark:bg-teal-950/20">
            <CardHeader className="space-y-2">
              <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                <PenTool className="size-5" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Split Media Hero</CardTitle>
                <Badge className="bg-teal-600 text-white text-[9px]">High Conversion</Badge>
              </div>
              <CardDescription className="text-xs">
                Visual video/image hero on left + 5-6 high-converting form fields on right.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5">
              <p>• Video &amp; photo gallery embed</p>
              <p>• Trust badges &amp; social proof</p>
              <p>• Responsive mobile stacking</p>
            </CardContent>
          </Card>

          {/* Mode 4: AI Chatbot Agent */}
          <Card className="border-2 border-emerald-500/60 hover:border-emerald-500 transition shadow-md bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="space-y-2">
              <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                <Bot className="size-5" />
              </div>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Conversational AI Agent</CardTitle>
                <Badge className="bg-emerald-600 text-white text-[9px]">AI Intake</Badge>
              </div>
              <CardDescription className="text-xs">
                Conversational assistant that asks questions naturally and confirms appointment bookings.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 text-xs text-muted-foreground space-y-1.5">
              <p>• Natural multi-turn dialogue</p>
              <p>• FAQ Q&amp;A from your knowledge base</p>
              <p>• Direct calendar slot booking</p>
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
              Don’t settle for simple text boxes. Collect annotated photos, live GPS locations, formula calculations, and OTP verified phone numbers.
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
                  <h3 className="text-sm font-bold">Photo &amp; Video with Drawing Notes</h3>
                  <p className="text-[11px] text-muted-foreground">Drawing annotations &amp; voice memos</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Customers and technicians can snap inspection photos, draw circles/arrows over damaged parts, and attach detailed repair notes.
              </p>
            </div>

            {/* Widget 2: GPS Matrix */}
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">GPS Location &amp; Geostamp</h3>
                  <p className="text-[11px] text-muted-foreground">Auto-locate, geofence &amp; route driving time</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                1-tap device GPS coordinate capture, Google Maps address autocomplete, and automatic travel distance calculation.
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
              <p className="text-xs text-muted-foreground leading-relaxed">
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
                  <h3 className="text-sm font-bold">SMS OTP Phone Verification</h3>
                  <p className="text-[11px] text-muted-foreground">Instant 6-digit SMS verification code</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Eliminate fake inquiries and invalid numbers. Sends a real-time SMS passcode to authenticate genuine customers.
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
              <p className="text-xs text-muted-foreground leading-relaxed">
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
                  <h3 className="text-sm font-bold">Conversational AI Intake</h3>
                  <p className="text-[11px] text-muted-foreground">Web, WhatsApp, SMS &amp; Phone</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Publish your form as an active conversational agent across WhatsApp, SMS, and website widgets.
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
            Collect money straight into your Stripe, PayPal, Square, or Bank Account. Fieseros charges <strong>zero transaction fees</strong>.
          </p>
        </div>

        {/* Interactive Payment Switcher */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-5xl mx-auto">
          {/* Left Gateway Selector */}
          <div className="lg:col-span-5 space-y-2">
            {[
              { id: 'cards', title: 'Credit & Debit Cards', desc: 'Stripe, Square, Authorize.Net, Braintree' },
              { id: 'paypal', title: 'PayPal & Venmo', desc: 'Smart 1-click buyer checkout buttons' },
              { id: 'upi', title: 'Razorpay / PayU UPI QR', desc: 'Instant UPI dynamic QR code & netbanking' },
              { id: 'bnpl', title: 'Buy Now Pay Later (BNPL)', desc: 'Klarna, Afterpay, Affirm 4-installment plan' },
              { id: 'applepay', title: 'Apple Pay & Google Pay', desc: 'Native 1-tap mobile biometric checkout' },
              { id: 'po', title: 'Purchase Orders & Net-30', desc: 'B2B PO numbers & net-30 tax invoicing' },
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

      {/* ─── 20,391 Templates Catalog Showcase ──────────────────────────────── */}
      <section className="py-16 bg-muted/20 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
              <Search className="w-3.5 h-3.5 mr-1" /> Template Directory
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              20,391 Ready-to-Use Templates for Every Industry
            </h2>
            <p className="text-sm text-muted-foreground">
              Don’t start from scratch. Pick a pre-configured template with calculation formulas and e-signatures already wired.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {[
              { name: 'Service Quotes & Estimates', count: '4,881 templates', href: '/templates/request-forms' },
              { name: 'Inspections & Audits', count: '3,200 templates', href: '/templates/inspection-forms' },
              { name: 'Booking & Appointments', count: '2,150 templates', href: '/templates/booking-forms' },
              { name: 'Registrations & Onboarding', count: '2,300 templates', href: '/templates/registration-forms' },
              { name: 'Medical & Healthcare', count: '1,840 templates', href: '/templates/medical-forms' },
              { name: 'Payment & Invoices', count: '1,650 templates', href: '/templates/payment-forms' },
              { name: 'Applications & Intake', count: '1,420 templates', href: '/templates/application-forms' },
              { name: 'Contracts & Agreements', count: '1,120 templates', href: '/templates/contract-forms' },
              { name: 'Consent & Waivers', count: '890 templates', href: '/templates/consent-forms' },
              { name: 'Customer Feedback & CSAT', count: '940 templates', href: '/templates/feedback-forms' },
            ].map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="p-3.5 rounded-xl border border-border bg-card hover:border-teal-500 hover:shadow-sm transition-all block group text-left"
              >
                <h4 className="text-xs font-bold text-foreground group-hover:text-teal-600 line-clamp-1">{cat.name}</h4>
                <p className="text-[10px] text-muted-foreground mt-1">{cat.count}</p>
              </Link>
            ))}
          </div>

          <div className="text-center pt-2">
            <Button asChild variant="outline" className="text-xs h-10 px-6 rounded-xl border-border">
              <Link href="/templates">
                Browse Complete 20,391 Templates Catalog →
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── 1-Click Embed Everywhere ───────────────────────────────────────── */}
      <section className="py-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            <Code2 className="w-3.5 h-3.5 mr-1" /> Embed Anywhere
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Embed on Any Website in 30 Seconds
          </h2>
          <p className="text-sm text-muted-foreground">
            Works smoothly on WordPress, Shopify, Webflow, Squarespace, Wix, Next.js, or raw HTML.
          </p>
        </div>

        <Card className="border border-border shadow-md overflow-hidden">
          <div className="flex border-b border-border bg-muted/40 px-4 pt-2 gap-2 overflow-x-auto">
            {[
              { id: 'html', label: '1-Line JavaScript' },
              { id: 'react', label: 'React / Next.js' },
              { id: 'iframe', label: 'iFrame Embed' },
              { id: 'wordpress', label: 'WordPress Shortcode' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveEmbed(tab.id as any)}
                className={cn(
                  'px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2',
                  activeEmbed === tab.id
                    ? 'border-teal-600 text-teal-700 dark:text-teal-300 bg-background'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <CardContent className="p-4 sm:p-6 bg-slate-950 text-slate-200 font-mono text-xs relative">
            <button
              type="button"
              onClick={handleCopyEmbed}
              className="absolute top-4 right-4 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-[11px] text-white flex items-center gap-1.5 transition-colors border border-slate-700"
            >
              {copiedEmbed ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
              <span>{copiedEmbed ? 'Copied!' : 'Copy Code'}</span>
            </button>
            <pre className="overflow-x-auto py-2 leading-relaxed text-emerald-400">
              {activeEmbed === 'html' &&
                `<!-- Place where you want the smart form to appear -->\n<div id="fieseros-smart-form"></div>\n<script src="https://fieseros.com/widget/gptform.js" data-form-id="frm_live_94821"></script>`}
              {activeEmbed === 'react' &&
                `import { GPTForm } from '@fieseros/react';\n\nexport default function EstimatePage() {\n  return (\n    <GPTForm\n      formId="frm_live_94821"\n      mode="cards"\n      onComplete={(response) => {\n        console.log('Submission received:', response);\n      }}\n    />\n  );\n}`}
              {activeEmbed === 'iframe' &&
                `<iframe\n  src="https://fieseros.com/f/frm_live_94821"\n  width="100%"\n  height="700px"\n  frameborder="0"\n  allow="geolocation; camera"\n></iframe>`}
              {activeEmbed === 'wordpress' &&
                `[fieseros_form id="frm_live_94821" theme="emerald" mode="split"]`}
            </pre>
          </CardContent>
        </Card>
      </section>

      {/* ─── Transparent Standalone Pricing ─────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Transparent Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start Free. Upgrade As You Grow.
            </h2>
            <p className="text-sm text-muted-foreground">
              Every tier includes 0% platform transaction fees and 200+ calculation widgets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {/* Free Tier */}
            <Card className="border-border bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader className="space-y-1">
                <Badge variant="outline" className="w-fit text-[10px] text-teal-700 dark:text-teal-300 border-teal-300 mb-1">
                  FREE TIER
                </Badge>
                <CardTitle className="text-lg font-bold">Free</CardTitle>
                <CardDescription className="text-xs">For solo pros &amp; testing</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$0</span>
                  <span className="text-xs text-muted-foreground"> / forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs flex-1">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>100 Submissions / mo</strong></li>
                  <li className="flex items-center gap-2">✓ 3 Active Smart Forms</li>
                  <li className="flex items-center gap-2">✓ 200+ Calculation Widgets</li>
                  <li className="flex items-center gap-2">✓ Digital E-Signatures</li>
                  <li className="flex items-center gap-2">✓ Email Notifications</li>
                  <li className="flex items-center gap-2">✓ 1-Line Embed Code</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Start Free — $0</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Plan 2: Starter */}
            <Card className="border-border bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader className="space-y-1">
                <Badge variant="outline" className="w-fit text-[10px] text-teal-700 dark:text-teal-300 border-teal-300 mb-1">
                  POPULAR
                </Badge>
                <CardTitle className="text-lg font-bold">Starter</CardTitle>
                <CardDescription className="text-xs">For single websites &amp; stores</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$10</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs flex-1">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>1,000 Submissions / mo</strong></li>
                  <li className="flex items-center gap-2">✓ 10 Active Smart Forms</li>
                  <li className="flex items-center gap-2">✓ 33 Payment Gateways (0% Fee)</li>
                  <li className="flex items-center gap-2">✓ Custom Branding &amp; Logo</li>
                  <li className="flex items-center gap-2">✓ SMS Alerts &amp; Receipts</li>
                  <li className="flex items-center gap-2">✓ CSV &amp; PDF Export</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                  <Link href="/register?plan=standalone_starter">Get Starter ($10/mo)</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Plan 3: Business */}
            <Card className="border-2 border-teal-500 shadow-xl relative bg-white dark:bg-slate-900 flex flex-col">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-0.5 rounded-full text-[10px] font-bold">
                BEST VALUE
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">Business</CardTitle>
                <CardDescription className="text-xs">For high-traffic operations</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$19</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs flex-1">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>3,000 Submissions / mo</strong></li>
                  <li className="flex items-center gap-2">✓ 30 Active Smart Forms</li>
                  <li className="flex items-center gap-2">✓ Conversational AI Agent</li>
                  <li className="flex items-center gap-2">✓ Custom CNAME Domain</li>
                  <li className="flex items-center gap-2">✓ Twilio SMS OTP Phone Gate</li>
                  <li className="flex items-center gap-2">✓ Webhooks &amp; Direct CRM Sync</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                  <Link href="/register?plan=standalone_business">Get Business ($19/mo)</Link>
                </Button>
              </CardFooter>
            </Card>

            {/* Plan 4: Enterprise Unlimited */}
            <Card className="border-border bg-white dark:bg-slate-900 flex flex-col">
              <CardHeader className="space-y-1">
                <Badge variant="outline" className="w-fit text-[10px] text-teal-700 dark:text-teal-300 border-teal-300 mb-1">
                  HIGH VOLUME
                </Badge>
                <CardTitle className="text-lg font-bold">Unlimited</CardTitle>
                <CardDescription className="text-xs">For agencies &amp; multi-brands</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$24</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-xs flex-1">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ <strong>10,000 Submissions / mo</strong></li>
                  <li className="flex items-center gap-2">✓ Unlimited Smart Forms</li>
                  <li className="flex items-center gap-2">✓ Unlimited AI Chat Agents</li>
                  <li className="flex items-center gap-2">✓ White-Label Branding</li>
                  <li className="flex items-center gap-2">✓ Priority SLA Support</li>
                  <li className="flex items-center gap-2">✓ Dedicated IP &amp; API Keys</li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register?plan=standalone_unlimited">Get Unlimited ($24/mo)</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 text-center max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Ready to Build Forms That Do the Work for You?
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Start free with 100 submissions/month. Create your first smart form in 60 seconds.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm h-12 px-8 rounded-xl shadow-lg">
            <Link href="/register">Start Free — $0</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="text-sm h-12 px-6 rounded-xl border-border">
            <Link href="#demo">Try AI Generator →</Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          No credit card required &bull; 100 submissions included &bull; Cancel or upgrade anytime
        </p>
      </section>
    </AiMarketingLayout>
  );
}
