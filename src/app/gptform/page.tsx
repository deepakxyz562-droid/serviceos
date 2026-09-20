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
  FileCheck,
  Check,
  Smartphone,
  Eye,
  Building,
  DollarSign,
  Loader2,
  Code2,
  Copy,
  Workflow,
  Search,
  PenTool,
  MessageSquare,
  ChevronRight,
  Shield,
  PhoneCall,
  CalendarCheck,
  LayoutTemplate,
  Mail,
  Lock,
  Split,
  MessageCircle,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  QrCode,
  ArrowUpRight,
  Star,
  Users,
  TrendingUp,
  Briefcase,
  Hash,
  GitBranch,
  Cpu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AiMarketingLayout } from '@/components/ai-marketing/ai-marketing-layout';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ─── Inline Wrench SVG (not in lucide-react) ────────────────────────────────
function Wrench(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

// ─── Example Prompt Presets ──────────────────────────────────────────────────
const EXAMPLE_PRESETS = [
  { label: '🏗️ Roofing Estimate', prompt: 'Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment.' },
  { label: '🔧 HVAC Service', prompt: 'Create an HVAC repair request form with brand dropdown, issue description, outdoor unit photo upload, emergency appointment booking, and diagnostic fee payment.' },
  { label: '🏠 Home Inspection', prompt: 'Create a multi-room property inspection checklist with photo markup, inspector signature, GPS location, and automatic PDF delivery.' },
  { label: '🧹 Cleaning Quote', prompt: 'Create a residential cleaning calculator with bedroom/bathroom counters, deep cleaning add-on options, recurring frequency discounts, and online booking.' },
  { label: '📋 Customer Intake', prompt: 'Create a contractor client intake form with address autocomplete, project timeline, budget range, and SMS notification opt-in.' },
  { label: '💳 Payment & Deposit', prompt: 'Create a contractor deposit checkout form with milestone payment breakdown, digital sign-off, and 0% platform fee credit card processing.' },
];

// ─── Trade-Tailored Form Collections ────────────────────────────────────────
const TRADE_TEMPLATES = [
  { trade: 'HVAC & Heating', icon: Zap, count: 14, items: ['Emergency Diagnostic Intake', 'Seasonal AC Tune-up Booking', 'System Replacement Estimate', 'Filter Delivery Subscription'] },
  { trade: 'Plumbing', icon: Wrench, count: 11, items: ['Emergency Pipe Leak Request', 'Water Heater Replacement Quote', 'Drain Camera Inspection Intake', 'Commercial Backflow Sign-off'] },
  { trade: 'Roofing & Siding', icon: LayoutTemplate, count: 16, items: ['Square Footage Price Calculator', 'Storm Damage Assessment & Photos', 'Roof Repair Proposal & E-Sign', 'Gutter Installation Quote'] },
  { trade: 'Cleaning & Maid', icon: Sparkles, count: 9, items: ['Deep House Cleaning Calculator', 'Move-in / Move-out Intake', 'Recurring Office Janitorial Quote', 'Window & Pressure Wash Form'] },
  { trade: 'Electrical', icon: ShieldCheck, count: 12, items: ['EV Charger Installation Quote', 'Electrical Panel Upgrade Form', 'Commercial Safety Inspection', 'Lighting & Fixture Assessment'] },
  { trade: 'Landscaping & Tree', icon: Globe, count: 10, items: ['Acreage Mowing Calculator', 'Tree Removal Permit & Quote', 'Irrigation System Maintenance', 'Hardscape Design Consultation'] },
];

// ─── Popular Templates Catalog ───────────────────────────────────────────────
const POPULAR_TEMPLATES = [
  { title: 'Roof Replacement Estimate Calculator', category: 'Roofing', desc: 'Live material formula calculation with pitch multiplier and customer e-signature.', badge: 'Popular', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300', rating: 4.9, uses: 3420, fieldsCount: 8 },
  { title: 'HVAC Emergency Diagnostic & Dispatch', category: 'HVAC', desc: 'Equipment photo markup, diagnostic fee collection, and real-time technician booking.', badge: 'Instant Quote', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300', rating: 4.8, uses: 2180, fieldsCount: 10 },
  { title: 'Plumbing Service Call & Sign-Off', category: 'Plumbing', desc: 'Address GPS geocoding, before/after photo capture, and customer authorization signature.', badge: 'High Conversion', badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300', rating: 4.7, uses: 1650, fieldsCount: 7 },
  { title: 'Deep House Cleaning Estimator', category: 'Cleaning', desc: 'Room count slider, square footage pricing, recurring frequency discount toggle.', badge: 'Calculations', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', rating: 4.9, uses: 2890, fieldsCount: 9 },
  { title: 'Electrical Panel Upgrade Assessment', category: 'Electrical', desc: 'Panel photo verification, amperage selection, and formal quote generation.', badge: 'Inspection', badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300', rating: 4.6, uses: 980, fieldsCount: 8 },
  { title: 'Landscaping & Lawn Care Estimate', category: 'Landscaping', desc: 'Lot acreage selector, seasonal package add-ons, and recurring Stripe checkout.', badge: 'Recurring', badgeColor: 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-300', rating: 4.8, uses: 1230, fieldsCount: 11 },
];

// ─── Pipeline steps ───────────────────────────────────────────────────────────
const PIPELINE_STEPS = [
  { step: 'Customer Input', short: 'QUESTION', icon: MessageCircle, desc: 'Structured form fields' },
  { step: 'Smart Branching', short: 'CONDITION', icon: GitBranch, desc: 'Conditional logic' },
  { step: 'Live Pricing', short: 'CALCULATION', icon: Calculator, desc: 'Instant formula calc' },
  { step: 'Photo Evidence', short: 'PHOTO', icon: Camera, desc: 'Markup & annotation' },
  { step: 'AI Analysis', short: 'AI TRIAGE', icon: Cpu, desc: 'Intent & categorisation' },
  { step: 'E-Signature', short: 'SIGNATURE', icon: PenTool, desc: 'Legal sign-off' },
  { step: 'Direct Payment', short: 'PAYMENT', icon: CreditCard, desc: '0% platform fee' },
  { step: 'CRM Record', short: 'CRM SYNC', icon: Briefcase, desc: 'Customer 360 view' },
  { step: 'Job Booking', short: 'BOOKING', icon: CalendarCheck, desc: 'Live calendar slot' },
];

export default function GptFormLandingPage() {
  const [demoPrompt, setDemoPrompt] = useState(
    'Create a roofing estimate form with roof size, photos, damage type, material selection and deposit.'
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState('');

  // ─── 4 Interactive Form Modes State ──────────────────────────────────────
  const [activeFormMode, setActiveFormMode] = useState<'classic' | 'card' | 'split' | 'agent'>('classic');

  // ─── Hero Interactive Split Preview States ────────────────────────────────
  const [previewSqFt, setPreviewSqFt] = useState(2500);
  const [previewMaterial, setPreviewMaterial] = useState<'asphalt' | 'metal' | 'tile'>('metal');
  const [previewDebrisAddon, setPreviewDebrisAddon] = useState(true);

  // Dynamic Calculation Logic
  const materialRate = previewMaterial === 'asphalt' ? 3.2 : previewMaterial === 'metal' ? 5.4 : 7.8;
  const baseCost = Math.round(previewSqFt * materialRate);
  const debrisCost = previewDebrisAddon ? 420 : 0;
  const totalCalculated = baseCost + debrisCost;

  // ─── Template search filter ────────────────────────────────────────────────
  const [templateSearch, setTemplateSearch] = useState('');

  // ─── Embed Code Tab State ─────────────────────────────────────────────────
  const [activeEmbedTab, setActiveEmbedTab] = useState<'wordpress' | 'shopify' | 'webflow' | 'react' | 'html'>('wordpress');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // ─── Pricing Toggle ───────────────────────────────────────────────────────
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const yearlyDiscount = 0.83; // ~17% off

  const getPrice = (monthlyPrice: number) => {
    if (billingPeriod === 'yearly') return Math.round(monthlyPrice * yearlyDiscount);
    return monthlyPrice;
  };

  // ─── Auth Gate ────────────────────────────────────────────────────────────
  const handleGenerateClick = (promptText?: string) => {
    const textToUse = promptText || demoPrompt;
    if (!textToUse.trim()) {
      toast.error('Please enter a description for your form.');
      return;
    }
    setSelectedPresetPrompt(textToUse);
    if (typeof window !== 'undefined') {
      try { sessionStorage.setItem('pending_gptform_prompt', textToUse); } catch {}
    }
    setAuthModalOpen(true);
  };

  const handleCopyCode = () => {
    const snippets: Record<string, string> = {
      wordpress: '[gptform id="form_roofing_estimate_2026" theme="emerald" /]',
      shopify: '<div class="fieseros-gptform" data-form-id="form_roofing_estimate_2026"></div>\n<script src="https://fieseros.com/embed.js" async></script>',
      webflow: '<iframe src="https://fieseros.com/f/roofing-estimate" width="100%" height="680" frameborder="0"></iframe>',
      react: 'import { GPTFormEmbed } from "@fieseros/react";\n\nexport default function QuotePage() {\n  return <GPTFormEmbed formId="form_roofing_estimate_2026" />;\n}',
      html: '<iframe src="https://fieseros.com/f/roofing-estimate" style="width:100%;height:680px;border:none;" title="GPTForm"></iframe>',
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(snippets[activeEmbedTab]);
      setCopiedSnippet(true);
      toast.success('Snippet copied to clipboard!');
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  const embedFilenames: Record<string, string> = {
    wordpress: '// WordPress shortcode (GPTForm plugin)',
    shopify: '// Shopify section / Liquid template',
    webflow: '// Webflow embed block',
    react: '// React / Next.js component',
    html: '// Plain HTML — any website',
  };

  return (
    <AiMarketingLayout>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO  (Split left/right layout)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 border-b bg-gradient-to-b from-teal-50/60 via-background to-background dark:from-teal-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 items-center">

            {/* ─── LEFT: Copy + Composer ─── */}
            <div className="space-y-7">
              {/* Eyebrow */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-300 text-xs font-semibold">
                  <Sparkles className="size-3.5 text-teal-600" />
                  <span>GPTFORM™ · AI FORM BUILDER</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                  🎁 Free Tier: <strong className="ml-1">100 Submissions / Month</strong>
                </div>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground leading-[1.1]">
                  The Form Builder Built{' '}
                  <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
                    for Service Businesses.
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
                  Live price calculators. Photo & signature capture. Direct payments. Every submission wired into your jobs pipeline — all from a single form.
                </p>
              </div>

              {/* Trust signals */}
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <span className="text-amber-500">★★★★★</span> 4.9/5
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <Users className="size-3.5 text-teal-600" /> 2,400+ contractors
                </span>
                <span className="text-border">·</span>
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="size-3.5 text-teal-600" /> 100k+ forms created
                </span>
              </div>

              {/* AI Composer Box */}
              <Card className="border-2 border-teal-500/30 shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <CardHeader className="p-4 bg-teal-50/60 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/50 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-xs font-bold text-teal-900 dark:text-teal-200">✨ Describe your form</span>
                  </div>
                  <span className="text-[11px] text-muted-foreground">AI Form Generator</span>
                </CardHeader>
                <CardContent className="p-4 space-y-3.5">
                  <textarea
                    rows={3}
                    value={demoPrompt}
                    onChange={(e) => setDemoPrompt(e.target.value)}
                    placeholder="e.g. Create a roofing estimate form with roof size, photos, damage type, material selection and deposit..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-teal-500 text-foreground resize-none leading-relaxed"
                  />

                  {/* Preset chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Quick start:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {EXAMPLE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => setDemoPrompt(preset.prompt)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/60 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-teal-700 dark:hover:text-teal-300 transition cursor-pointer"
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* CTA row */}
                  <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5 border-t border-border/60">
                    <Button
                      type="button"
                      onClick={() => handleGenerateClick(demoPrompt)}
                      className="w-full sm:w-auto h-10 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl gap-2 shadow-md cursor-pointer"
                    >
                      <Sparkles className="size-4" />
                      Create a Form with AI
                    </Button>
                    <Button asChild variant="outline" className="w-full sm:w-auto h-10 text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                      <Link href="/templates">
                        <LayoutTemplate className="size-4 mr-1.5 text-muted-foreground" />
                        Browse 20,000+ Templates
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Micro trust strip */}
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] text-muted-foreground">
                {['Free to start', 'No code required', 'Publish anywhere', '0% Fieseros commission'].map((t) => (
                  <span key={t} className="flex items-center gap-1.5 font-medium">
                    <Check className="size-3.5 text-teal-600 font-bold" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* ─── RIGHT: Live Interactive Form Preview ─── */}
            <div className="lg:sticky lg:top-20">
              <Card className="border-2 border-teal-500/40 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                <CardHeader className="bg-teal-50 dark:bg-teal-950/40 p-4 border-b border-teal-200 dark:border-teal-800/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-teal-950 dark:text-teal-200">
                        Roof Replacement Estimate
                      </CardTitle>
                      <CardDescription className="text-xs text-teal-800/80 dark:text-teal-400 mt-0.5">
                        Live Calculation · AI-Generated in 8s
                      </CardDescription>
                    </div>
                    <Badge className="bg-teal-600 text-white text-[10px]">Ready to Publish</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Address */}
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Property address</label>
                    <Input defaultValue="48 King Road, London" readOnly className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-border" />
                  </div>

                  {/* Roof Area Slider */}
                  <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border/80">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Roof size</span>
                      <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                        {previewSqFt.toLocaleString()} sq ft
                      </span>
                    </div>
                    <Slider min={1000} max={5000} step={100} value={[previewSqFt]} onValueChange={([val]) => setPreviewSqFt(val)} className="py-1 cursor-pointer" />
                  </div>

                  {/* Material Selector */}
                  <div className="space-y-1.5">
                    <label className="font-semibold text-muted-foreground">Material</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'asphalt', name: 'Asphalt', rate: '£3.20/sq ft' },
                        { id: 'metal', name: 'Metal', rate: '£5.40/sq ft' },
                        { id: 'tile', name: 'Tile', rate: '£7.80/sq ft' },
                      ].map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setPreviewMaterial(m.id as any)}
                          className={cn(
                            'p-2 rounded-lg border text-left transition cursor-pointer',
                            previewMaterial === m.id
                              ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500'
                              : 'border-border bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700'
                          )}
                        >
                          <p className="font-semibold text-[11px] truncate">{m.name}</p>
                          <p className="text-[10px] opacity-80">{m.rate}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Debris Addon toggle */}
                  <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                      <Camera className="size-4 text-teal-600" />
                      <span className="font-medium text-slate-700 dark:text-slate-300">Debris removal add-on</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDebrisAddon(!previewDebrisAddon)}
                      className={cn(
                        'text-[10px] font-semibold px-2.5 py-1 rounded-full transition cursor-pointer',
                        previewDebrisAddon
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                      )}
                    >
                      {previewDebrisAddon ? '✓ +£420' : '+ Add £420'}
                    </button>
                  </div>

                  {/* Calculated Total Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">Estimated price</span>
                      <span className="text-xl font-extrabold text-teal-300">£{totalCalculated.toLocaleString()}</span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGenerateClick('Roofing Estimate Form')}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-4 font-semibold cursor-pointer"
                    >
                      Request Estimate →
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — 4 FORM MODES SWITCHER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            4 Interactive Runtime Modes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            One Form. Four High-Converting Experiences.
          </h2>
          <p className="text-base text-muted-foreground">
            Switch your form mode with a single click. Each mode is optimised for a different customer scenario.
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border shadow-inner">
            {[
              { id: 'classic', label: 'Classic', caption: 'Most data per page' },
              { id: 'card', label: 'Card', caption: 'Highest mobile completion' },
              { id: 'split', label: 'Split', caption: 'Media + form layout' },
              { id: 'agent', label: 'AI Agent', caption: 'Conversational chat' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormMode(tab.id as any)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5',
                  activeFormMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-md ring-1 ring-teal-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('text-[10px] font-normal hidden sm:block', activeFormMode === tab.id ? 'text-teal-600/80 dark:text-teal-400/80' : 'text-muted-foreground/60')}>{tab.caption}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mode Previews */}
        <div className="max-w-4xl mx-auto">
          {activeFormMode === 'classic' && (
            <Card className="p-6 border-border shadow-md space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-sm">Classic Business Form</span>
                <Badge variant="outline" className="text-xs">Best for detailed quotes</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <label className="font-semibold block mb-1">Customer Full Name</label>
                  <Input placeholder="Jane Doe" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <label className="font-semibold block mb-1">Phone (SMS OTP Verified)</label>
                  <Input placeholder="+44 7700 900077" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border sm:col-span-2">
                  <label className="font-semibold block mb-1">Service Required</label>
                  <Input placeholder="Boiler Repair & Diagnostic Inspection" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-300 font-medium">
                ↳ All answers captured on a single page — ideal for contractors collecting comprehensive job details.
              </div>
            </Card>
          )}

          {activeFormMode === 'card' && (
            <Card className="p-8 border-border shadow-md space-y-6 text-center max-w-xl mx-auto">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Question 2 of 5</span>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full" style={{ width: '40%' }} />
                </div>
              </div>
              <h3 className="text-lg font-bold text-foreground">What type of property is this?</h3>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="p-4 rounded-xl border-2 border-teal-500 bg-teal-50 dark:bg-teal-950/60 font-semibold text-xs text-teal-800 dark:text-teal-200 cursor-pointer">
                  <Building className="size-5 mx-auto mb-1.5 text-teal-600" />
                  Residential Home
                </button>
                <button type="button" className="p-4 rounded-xl border-2 border-border bg-white dark:bg-slate-900 font-semibold text-xs text-muted-foreground hover:border-teal-300 transition cursor-pointer">
                  <Briefcase className="size-5 mx-auto mb-1.5 opacity-40" />
                  Commercial Facility
                </button>
              </div>
              <Button size="sm" className="bg-teal-600 text-white text-xs px-6">Continue →</Button>
              <p className="text-[10px] text-muted-foreground">Card mode converts <strong>34% better</strong> on mobile than traditional forms.</p>
            </Card>
          )}

          {activeFormMode === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border shadow-md">
              <div className="p-6 bg-slate-900 text-white space-y-4 flex flex-col justify-center">
                <Badge className="bg-teal-500 text-slate-950 font-bold w-fit text-[10px]">Split Media Mode</Badge>
                <h3 className="text-xl font-bold">HVAC Emergency Replacement</h3>
                <p className="text-xs text-slate-300 leading-relaxed">Fast 24-hour dispatch with certified engineers. Your details, your urgency — handled immediately.</p>
                <div className="pt-2 flex items-center gap-2 text-xs text-teal-300 font-semibold">
                  <Check className="size-3.5" /> Avg. 4.2 min response time
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 text-foreground space-y-4">
                <span className="text-xs font-semibold block text-muted-foreground">Select Your Urgent Need:</span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border-2 border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 font-semibold cursor-pointer">
                    No Heat / Frozen Pipes (Immediate)
                  </div>
                  <div className="p-3 rounded-lg border border-border font-medium text-muted-foreground hover:border-teal-300 transition cursor-pointer">
                    Routine Annual Service
                  </div>
                </div>
                <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs">Book Emergency Visit →</Button>
              </div>
            </div>
          )}

          {activeFormMode === 'agent' && (
            <Card className="p-6 border-border shadow-md max-w-xl mx-auto space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="size-7 rounded-full bg-teal-600 flex items-center justify-center">
                  <Bot className="size-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-foreground block text-sm">Fieseros AI Form Agent</span>
                  <span className="text-[10px] text-emerald-600 font-medium">● Online · Responds instantly</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="size-6 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-teal-600" />
                  </div>
                  <div className="p-3 rounded-xl rounded-tl-sm bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 max-w-[80%]">
                    Hi James! What plumbing issue are you experiencing today?
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="p-3 rounded-xl rounded-tr-sm bg-slate-100 dark:bg-slate-800 max-w-[75%] text-right font-medium">
                    The hot water heater in the basement is leaking.
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="size-6 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-teal-600" />
                  </div>
                  <div className="p-3 rounded-xl rounded-tl-sm bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 max-w-[80%]">
                    Got it. Please upload a photo of the base. I&apos;ll auto-classify the valve type and generate your replacement quote.
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="size-6 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-teal-600" />
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="size-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="size-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="size-1.5 rounded-full bg-teal-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — 9-STEP BUSINESS LOGIC PIPELINE
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Full Operational Logic</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              A Form That Can Calculate, Understand and Act
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every GPTForm™ executes a complete business pipeline — from raw customer input to paid confirmation and scheduled job dispatch.
            </p>
          </div>

          {/* Pipeline — scrollable on mobile, wrap on tablet */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-start gap-2 min-w-max lg:min-w-0 lg:grid lg:grid-cols-9">
              {PIPELINE_STEPS.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div key={idx} className="flex items-start gap-2 lg:contents">
                    <div className="flex flex-col items-center gap-2 w-24 lg:w-auto">
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="size-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                          {idx + 1}
                        </div>
                        <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col items-center gap-1.5 w-24 text-center">
                          <Icon className="size-4 text-teal-300" />
                          <span className="font-extrabold text-teal-300 text-[10px] leading-tight">{item.short}</span>
                          <span className="text-[9px] text-slate-400 leading-tight">{item.desc}</span>
                        </div>
                      </div>
                    </div>
                    {idx < PIPELINE_STEPS.length - 1 && (
                      <ArrowRight className="size-4 text-slate-600 shrink-0 mt-6 lg:hidden" />
                    )}
                  </div>
                );
              })}
            </div>
            {/* Desktop connector arrows row */}
            <div className="hidden lg:flex items-center justify-between px-12 -mt-6">
              {PIPELINE_STEPS.slice(0, -1).map((_, i) => (
                <ArrowRight key={i} className="size-3.5 text-teal-700/60" />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — 5 FEATURE CATEGORIES
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Complete Feature Matrix
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Engineered for Precision &amp; Conversion
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything your trade business needs to collect structured data and get paid — no other form builder has all of these.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { category: 'Capture', icon: Camera, features: ['Photo & video markup', 'Voice recordings', 'GPS geofencing', 'Document upload', 'E-signatures'], highlight: false },
            { category: 'Logic', icon: Sliders, features: ['Conditional branching', 'Dynamic math formulas', 'Lead scoring', 'Calculated fields', 'Hidden field routing'], highlight: false },
            { category: 'Business', icon: CreditCard, features: ['Instant quotes', 'Real-time booking', '0% fee payments', 'Deposit checkout', 'Digital invoices'], highlight: false },
            { category: 'AI Engine', icon: Sparkles, features: ['AI form builder', 'Conversational agent', 'Image extraction', 'Audio transcription', 'Auto-summaries'], highlight: true },
            { category: 'Verification', icon: ShieldCheck, features: ['SMS OTP verified', 'IP timestamp audit', 'Address validation', 'Spam protection', 'SSL encryption'], highlight: false },
          ].map((col) => {
            const Icon = col.icon;
            return (
              <Card
                key={col.category}
                className={cn(
                  'border-border hover:border-teal-400/60 transition shadow-sm',
                  col.highlight && 'ring-2 ring-teal-500/60 border-teal-400'
                )}
              >
                <CardHeader className="space-y-2 p-4">
                  <div className={cn('p-2 rounded-lg w-fit', col.highlight ? 'bg-teal-500/15 text-teal-600' : 'bg-teal-500/10 text-teal-600')}>
                    <Icon className="size-4" />
                  </div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold">{col.category}</CardTitle>
                    {col.highlight && <Badge className="bg-teal-600 text-white text-[9px] px-1.5 py-0">KEY</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {col.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <Check className="size-3 text-teal-600 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — PAYMENTS & DIRECT CHECKOUT
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="payments" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-teal-600 text-white text-xs">Direct Payments</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                0% Platform Commission.
                <span className="block text-teal-600">You Keep Every Penny.</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect the payment provider you already use and collect customer deposits directly into your merchant account. Fieseros charges <strong>zero commission</strong> — you only pay standard processor fees.
              </p>
              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200">
                <p className="font-bold mb-1">💡 Real savings example</p>
                At £50,000/year in jobs collected, you save <strong>£2,500+</strong> vs. form builders that charge a 5% payment processing uplift.
              </div>
              {/* Payment providers */}
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-foreground">
                {[
                  { icon: CreditCard, label: 'Stripe Checkout' },
                  { icon: Smartphone, label: 'Apple Pay & Google Pay' },
                  { icon: Zap, label: 'Square & PayPal' },
                  { icon: QrCode, label: 'Razorpay UPI & Netbanking' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="p-3 rounded-xl bg-white dark:bg-slate-800 border flex items-center gap-2.5 shadow-xs hover:border-teal-300 transition">
                    <Icon className="size-4 text-teal-600 shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="border-2 border-teal-500/40 shadow-xl bg-slate-900 text-white p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-teal-400">Universal Payment Checkout</span>
                <span className="text-xs text-emerald-400 font-semibold">0% Platform Fee</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/90 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Boiler Emergency Replacement Deposit</span>
                  <span className="font-bold text-white">£450.00</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Remaining balance upon job completion</span>
                  <span>£850.00</span>
                </div>
                <div className="h-px bg-slate-700 my-1" />
                <div className="flex justify-between font-bold">
                  <span>Pay now</span>
                  <span className="text-teal-300">£450.00</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 font-bold col-span-2">
                  Pay £450.00 via Apple Pay / Card →
                </Button>
              </div>
              <p className="text-center text-[10px] text-slate-500">Secured by Stripe. 256-bit SSL encryption.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — TRADE TEMPLATES
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Tailored Trade Collections
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            20,000+ Industry Templates,<br className="hidden sm:block" /> Pre-Built for Trades
          </h2>
          <p className="text-base text-muted-foreground">
            Unlike generic form builders, every GPTForm™ template includes pre-configured price calculators, safety inspections, and legal sign-offs for your specific trade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TRADE_TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.trade} className="border-border hover:border-teal-400/60 transition shadow-sm hover:shadow-md">
                <CardHeader className="p-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                        <Icon className="size-4" />
                      </div>
                      <CardTitle className="text-sm font-bold">{t.trade}</CardTitle>
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium">{t.count} templates</span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {t.items.map((item) => (
                      <li key={item} className="flex items-center justify-between py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition px-1">
                        <span>{item}</span>
                        <Button
                          size="sm"
                          onClick={() => handleGenerateClick(`Create a ${item} form for ${t.trade}`)}
                          className="h-6 px-2.5 text-[10px] bg-teal-600 hover:bg-teal-700 text-white font-semibold gap-1 cursor-pointer rounded-lg shrink-0"
                        >
                          <Sparkles className="size-2.5" />
                          Use AI
                        </Button>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7 — TEMPLATE MARKETPLACE
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="templates" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Template Marketplace</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Start with a Template. Make It Yours.
            </h2>
            <p className="text-sm text-muted-foreground">
              Search 20,000+ pre-built templates or customize any template with AI in seconds.
            </p>
          </div>

          <div className="max-w-xl mx-auto">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search 20,000+ templates (e.g. HVAC, Roofing, Cleaning, Plumbing)..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
                className="pl-10 h-11 text-xs sm:text-sm rounded-xl border-border bg-background shadow-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {POPULAR_TEMPLATES.filter((t) =>
              templateSearch
                ? t.title.toLowerCase().includes(templateSearch.toLowerCase()) ||
                  t.category.toLowerCase().includes(templateSearch.toLowerCase())
                : true
            ).map((tmpl) => (
              <Card key={tmpl.title} className="border-border hover:border-teal-400/60 transition shadow-sm flex flex-col justify-between hover:shadow-md">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', tmpl.badgeColor)}>
                      {tmpl.category}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{tmpl.fieldsCount} smart fields</span>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">{tmpl.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{tmpl.desc}</CardDescription>
                  {/* Social proof row */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-amber-500 text-xs">{'★'.repeat(Math.round(tmpl.rating))}</span>
                    <span className="text-xs font-semibold text-foreground">{tmpl.rating}</span>
                    <span className="text-xs text-muted-foreground">· {tmpl.uses.toLocaleString()} uses</span>
                  </div>
                </CardHeader>
                <CardFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                  <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300 border-teal-300">
                    {tmpl.badge}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    <Button asChild variant="outline" size="sm" className="text-xs h-8">
                      <Link href="/templates">Use Template</Link>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleGenerateClick(`Customize ${tmpl.title} with calculation formulas and instant checkout.`)}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 gap-1 cursor-pointer"
                    >
                      <Sparkles className="size-3" />
                      AI Customize
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center pt-2">
            <Button asChild variant="outline" className="rounded-xl px-8 text-xs font-semibold h-10 hover:border-teal-500 hover:text-teal-700">
              <Link href="/templates">Browse All 20,000+ Free Templates →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8 — PUBLISH ANYWHERE / EMBED GENERATOR
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Universal Embedding
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">
            Publish on Any Website in 1 Click
          </h2>
          <p className="text-sm text-muted-foreground">
            Embed your smart forms on WordPress, Shopify, Webflow, Squarespace, or custom React codebases.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 space-y-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-teal-400" />
              <span className="text-sm font-bold text-white">Embed Code Generator</span>
              <Badge className="bg-teal-600 text-white text-[9px] px-1.5">Live Preview</Badge>
            </div>
            <Button
              size="sm"
              onClick={handleCopyCode}
              className="bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs gap-1.5 h-8 cursor-pointer self-start sm:self-auto"
            >
              {copiedSnippet ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
            </Button>
          </div>

          {/* Tabs — horizontally scrollable on mobile */}
          <div className="overflow-x-auto pb-1">
            <div className="flex gap-2 min-w-max">
              {[
                { id: 'wordpress', label: 'WordPress Plugin' },
                { id: 'shopify', label: 'Shopify Liquid' },
                { id: 'webflow', label: 'Webflow Embed' },
                { id: 'react', label: 'React / Next.js' },
                { id: 'html', label: 'Plain HTML' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEmbedTab(tab.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap',
                    activeEmbedTab === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div className="rounded-xl overflow-hidden border border-slate-800">
            <div className="px-4 py-2 bg-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">{embedFilenames[activeEmbedTab]}</span>
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-red-500/60" />
                <div className="size-2.5 rounded-full bg-yellow-500/60" />
                <div className="size-2.5 rounded-full bg-green-500/60" />
              </div>
            </div>
            <div className="p-4 font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed bg-slate-950 whitespace-pre">
              {activeEmbedTab === 'wordpress' && '[gptform id="form_roofing_estimate_2026" theme="emerald" /]'}
              {activeEmbedTab === 'shopify' && '<div class="fieseros-gptform" data-form-id="form_roofing_estimate_2026"></div>\n<script src="https://fieseros.com/embed.js" async></script>'}
              {activeEmbedTab === 'webflow' && '<iframe src="https://fieseros.com/f/roofing-estimate"\n  width="100%" height="680"\n  frameborder="0">\n</iframe>'}
              {activeEmbedTab === 'react' && 'import { GPTFormEmbed } from "@fieseros/react";\n\nexport default function QuotePage() {\n  return <GPTFormEmbed formId="form_roofing_estimate_2026" />;\n}'}
              {activeEmbedTab === 'html' && '<iframe\n  src="https://fieseros.com/f/roofing-estimate"\n  style="width:100%;height:680px;border:none;"\n  title="GPTForm">\n</iframe>'}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 9 — CRM WORKFLOW CONNECTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">CRM Integration</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Your Form Shouldn&apos;t End with a Submission
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every GPTForm™ submission flows seamlessly into Fieseros Service OS — auto-creating leads, assigning crew schedules, and generating invoices.
            </p>
          </div>

          {/* Pipeline pills with icons */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-center text-xs">
            {[
              { label: 'FORM', icon: FileInput },
              { label: 'LEAD', icon: Users },
              { label: 'CUSTOMER', icon: Briefcase },
              { label: 'QUOTE', icon: Calculator },
              { label: 'BOOKING', icon: CalendarCheck },
              { label: 'JOB', icon: Wrench },
              { label: 'INVOICE', icon: FileSpreadsheet },
              { label: 'PAID', icon: DollarSign },
            ].map(({ label, icon: Icon }, i, arr) => (
              <div key={label} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700">
                  <Icon className="size-3.5 text-teal-400" />
                  <span className="font-extrabold text-teal-300 text-[10px]">{label}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="size-4 text-slate-600 shrink-0" />}
              </div>
            ))}
          </div>

          {/* Before / After comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto text-xs">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700 space-y-2">
              <div className="flex items-center gap-2 text-slate-400 font-semibold mb-2">
                <span className="size-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">✕</span>
                Other form builders
              </div>
              <p className="text-slate-400">Submission → Email notification → Manual copy-paste to CRM → Manual invoice → Phone call to book.</p>
            </div>
            <div className="p-4 rounded-2xl bg-teal-950/60 border border-teal-700/60 space-y-2">
              <div className="flex items-center gap-2 text-teal-300 font-semibold mb-2">
                <Check className="size-5 text-teal-400" />
                GPTForm™ + Fieseros
              </div>
              <p className="text-teal-200/80">Submission → Lead auto-created → Quote sent → Job booked → Invoice issued → Payment collected. Automatically.</p>
            </div>
          </div>

          <div className="text-center">
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-6 h-10">
              <Link href="/#crm-features">Explore Fieseros Service OS →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 10 — PRICING
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-4 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Simple Transparent Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Start Free. Upgrade As You Scale.
            </h2>
            <p className="text-sm text-muted-foreground">
              Every contractor gets 3 forms and 100 free submissions per month at \$0 — forever.
            </p>

            {/* Annual / Monthly Toggle */}
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="inline-flex items-center p-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-border">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer',
                    billingPeriod === 'monthly'
                      ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('yearly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5',
                    billingPeriod === 'yearly'
                      ? 'bg-white dark:bg-slate-900 text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Yearly
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                    Save ~17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Free</CardTitle>
                <CardDescription className="text-xs">3 Forms · 100 submissions/month</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$0</span>
                  <span className="text-xs text-muted-foreground"> / forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {['3 Active Smart Forms', '100 Form Submissions / month', '20,000+ Templates Library', 'Direct Payments (0% fee)', 'Universal 1-line Embed'].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Start Free Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Starter — Recommended */}
            <Card className="border-2 border-teal-500 shadow-lg relative bg-white dark:bg-slate-900">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap">
                RECOMMENDED
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">Starter</CardTitle>
                <CardDescription className="text-xs">For active contractors &amp; growing sites</CardDescription>
                <div className="pt-2 flex items-end gap-1">
                  <span className="text-3xl font-extrabold">\${getPrice(10)}</span>
                  <span className="text-xs text-muted-foreground pb-0.5"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {['10 Active Smart Forms', '1,000 Submissions / month', 'AI Form Synthesis & Logic', 'Dynamic Math Calculations', 'Digital E-Signatures & Booking'].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                  <Link href="/register">Get Started (\${getPrice(10)}/mo) →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Business */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Business</CardTitle>
                <CardDescription className="text-xs">For multi-trade teams &amp; agencies</CardDescription>
                <div className="pt-2 flex items-end gap-1">
                  <span className="text-3xl font-extrabold">\${getPrice(19)}</span>
                  <span className="text-xs text-muted-foreground pb-0.5"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  {['Unlimited Smart Forms', '10,000 Submissions / month', 'Conversational AI Form Agents', 'White-labeling & Custom CSS', 'Priority Webhook & Zapier Sync'].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Get Business (\${getPrice(19)}/mo)</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* CRM subscriber note */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-800 max-w-2xl mx-auto flex items-start gap-3">
            <Sparkles className="size-5 text-teal-600 shrink-0 mt-0.5" />
            <div className="text-xs text-teal-900 dark:text-teal-200">
              <p className="font-bold mb-0.5">Active Fieseros CRM Subscriber?</p>
              <p className="text-teal-800/80 dark:text-teal-300/80">GPTForm™ Unlimited (Business plan features) is included in your CRM subscription at no extra charge.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 11 — FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about GPTForm™, calculations, payments, and integrations.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          {[
            {
              q: 'Is GPTForm really free to start?',
              a: 'Yes. Every account starts on the Free Tier with 3 active forms and 100 form submissions per month. No credit card is required. You get access to all 20,000+ templates and the Direct Payments feature on the free plan.',
            },
            {
              q: 'How does the Dynamic Calculation Engine work?',
              a: 'You define math formulas using variables from other fields — for example: square_footage × material_rate + addons. Prices update live on the customer-facing form before they submit, which dramatically increases conversion for estimate-based workflows.',
            },
            {
              q: 'Does Fieseros take a commission on payments?',
              a: 'No. Fieseros charges 0% platform commission on payments collected through your forms. You only pay standard merchant processing fees to your payment provider (e.g. Stripe 1.4% + 20p, or Razorpay 2%).',
            },
            {
              q: 'Can I embed GPTForm on WordPress, Shopify, or Webflow?',
              a: 'Yes. Every form provides a 1-line embed snippet (iframe or shortcode) compatible with WordPress, Shopify, Webflow, Squarespace, Wix, and custom React / Next.js websites. No API key required for the iframe embed.',
            },
            {
              q: 'Can I white-label GPTForm for my customers?',
              a: 'Yes, on the Business plan. You can remove all Fieseros branding, add your own logo and custom domain, and publish fully white-labelled forms directly from your client's website.',
            },
            {
              q: 'How does GPTForm AI compare to Jotform AI?',
              a: "GPTForm AI is purpose-built for service businesses. While Jotform AI generates generic forms, GPTForm AI understands trade-specific workflows — it knows to add a sq ft price calculator for a roofing form, or a diagnostic fee field for HVAC. It also connects submissions directly into Fieseros CRM jobs — Jotform doesn't do that.",
            },
            {
              q: 'What happens when I hit my submission limit?',
              a: 'Your form will continue to show but new submissions will be queued and you\'ll receive an email notification to upgrade. No submissions are lost — they\'re delivered to you once you upgrade or at the start of the next billing cycle.',
            },
            {
              q: 'Can GPTForm send webhook data to Zapier or Make.com?',
              a: 'Yes. Every form on the Business plan supports real-time webhook dispatch (JSON POST) to any endpoint including Zapier, Make.com, Pipedream, and custom APIs. Webhooks fire within 2 seconds of form submission.',
            },
          ].map((item, idx) => (
            <AccordionItem
              key={idx}
              value={`faq-${idx}`}
              className="border rounded-xl px-4 bg-white dark:bg-slate-900 border-l-2 border-l-teal-500/40 hover:border-l-teal-500 transition"
            >
              <AccordionTrigger className="text-xs sm:text-sm font-semibold text-left hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 12 — FINAL CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 text-center bg-gradient-to-b from-teal-50 to-white dark:from-teal-950/20 dark:to-background border-t">
        <div className="max-w-4xl mx-auto px-4 space-y-8">
          {/* 3-step how it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-4">
            {[
              { num: '1', label: 'Describe your form', sub: 'In plain English — no tech jargon' },
              { num: '2', label: 'AI builds it in 30s', sub: 'Fields, calculations, logic, payments' },
              { num: '3', label: 'Publish & collect', sub: 'Payments, signatures & booked jobs' },
            ].map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-1.5 text-center">
                <div className="size-8 rounded-full bg-teal-600 text-white font-extrabold text-sm flex items-center justify-center">
                  {s.num}
                </div>
                <p className="font-semibold text-sm text-foreground">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Start building smarter forms today.
            </h2>
            <p className="text-base text-muted-foreground max-w-xl mx-auto">
              Join 2,400+ service contractors already calculating quotes, capturing signed contracts, and taking direct payments with GPTForm™.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => handleGenerateClick()}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm h-12 px-8 rounded-xl shadow-lg cursor-pointer"
            >
              <Sparkles className="size-4 mr-2" />
              Create a Form with AI — It&apos;s Free
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-sm h-12 px-8 rounded-xl hover:border-teal-500 hover:text-teal-700">
              <Link href="/templates">Browse 20,000+ Templates</Link>
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[11px] text-muted-foreground pt-2">
            {['No credit card required', 'Free forever plan', '100 submissions/month free', '0% Fieseros commission'].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <Check className="size-3.5 text-teal-600" /> {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          AUTH GATE MODAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="sm:max-w-md p-6 bg-white dark:bg-slate-900 border-2 border-teal-500/30 rounded-2xl shadow-2xl">
          <DialogHeader className="space-y-2 text-left">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600">
                <Sparkles className="size-5" />
              </div>
              <DialogTitle className="text-lg font-bold">Create Your Free Account</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Sign up free to generate, customize, and publish this AI form.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs space-y-1">
            <span className="font-semibold text-teal-600 dark:text-teal-400 block text-[11px] uppercase tracking-wider">
              Your Form Prompt:
            </span>
            <p className="text-slate-700 dark:text-slate-300 line-clamp-3 italic">
              &quot;{selectedPresetPrompt || demoPrompt}&quot;
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 rounded-xl shadow-md">
              <Link href={`/register?prompt=${encodeURIComponent(selectedPresetPrompt || demoPrompt)}`}>
                Continue to Create Free Account →
              </Link>
            </Button>
            <div className="text-center text-[11px] text-muted-foreground pt-1">
              <span>Already have an account? </span>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/forms?prompt=${encodeURIComponent(selectedPresetPrompt || demoPrompt)}`)}`}
                className="font-semibold text-teal-600 hover:underline"
              >
                Sign In
              </Link>
            </div>
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Check className="size-3 text-teal-600" /> 100 Submissions / mo Free</span>
            <span className="flex items-center gap-1"><Check className="size-3 text-teal-600" /> No credit card required</span>
          </div>
        </DialogContent>
      </Dialog>
    </AiMarketingLayout>
  );
}
