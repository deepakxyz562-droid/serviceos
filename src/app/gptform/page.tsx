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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

// ─── Example Prompt Presets for Quick Insertion ─────────────────────────────
const EXAMPLE_PRESETS = [
  {
    label: '🏗️ Roofing Estimate',
    prompt: 'Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment.',
  },
  {
    label: '🔧 HVAC Service',
    prompt: 'Create an HVAC repair request form with brand dropdown, issue description, outdoor unit photo upload, emergency appointment booking, and diagnostic fee payment.',
  },
  {
    label: '🏠 Home Inspection',
    prompt: 'Create a multi-room property inspection checklist with photo markup, inspector signature, GPS location, and automatic PDF delivery.',
  },
  {
    label: '🧹 Cleaning Quote',
    prompt: 'Create a residential cleaning calculator with bedroom/bathroom counters, deep cleaning add-on options, recurring frequency discounts, and online booking.',
  },
  {
    label: '📋 Customer Intake',
    prompt: 'Create a contractor client intake form with address autocomplete, project timeline, budget range, and SMS notification opt-in.',
  },
  {
    label: '💳 Payment & Deposit',
    prompt: 'Create a contractor deposit checkout form with milestone payment breakdown, digital sign-off, and 0% platform fee credit card processing.',
  },
];

// ─── Trade-Tailored Form Collections ────────────────────────────────────────
const TRADE_TEMPLATES = [
  {
    trade: 'HVAC & Heating',
    icon: Zap,
    items: ['Emergency Diagnostic Intake', 'Seasonal AC Tune-up Booking', 'System Replacement Estimate', 'Filter Delivery Subscription'],
  },
  {
    trade: 'Plumbing',
    icon: Wrench,
    items: ['Emergency Pipe Leak Request', 'Water Heater Replacement Quote', 'Drain Camera Inspection Intake', 'Commercial Backflow Sign-off'],
  },
  {
    trade: 'Roofing & Siding',
    icon: LayoutTemplate,
    items: ['Square Footage Price Calculator', 'Storm Damage Assessment & Photos', 'Roof Repair Proposal & E-Sign', 'Gutter Installation Quote'],
  },
  {
    trade: 'Cleaning & Maid',
    icon: Sparkles,
    items: ['Deep House Cleaning Calculator', 'Move-in / Move-out Intake', 'Recurring Office Janitorial Quote', 'Window & Pressure Wash Form'],
  },
  {
    trade: 'Electrical',
    icon: ShieldCheck,
    items: ['EV Charger Installation Quote', 'Electrical Panel Upgrade Form', 'Commercial Safety Inspection', 'Lighting & Fixture Assessment'],
  },
  {
    trade: 'Landscaping & Tree',
    icon: Globe,
    items: ['Acreage Mowing Calculator', 'Tree Removal Permit & Quote', 'Irrigation System Maintenance', 'Hardscape Design Consultation'],
  },
];

// ─── Popular Templates Catalog ──────────────────────────────────────────────
const POPULAR_TEMPLATES = [
  {
    title: 'Roof Replacement Estimate Calculator',
    category: 'Roofing',
    desc: 'Live material formula calculation with pitch multiplier and customer e-signature.',
    badge: 'Popular',
    fieldsCount: 8,
  },
  {
    title: 'HVAC Emergency Diagnostic & Dispatch',
    category: 'HVAC',
    desc: 'Equipment photo markup, diagnostic fee collection, and real-time technician booking.',
    badge: 'Instant Quote',
    fieldsCount: 10,
  },
  {
    title: 'Plumbing Service Call & Sign-Off',
    category: 'Plumbing',
    desc: 'Address GPS geocoding, before/after photo capture, and customer authorization signature.',
    badge: 'High Conversion',
    fieldsCount: 7,
  },
  {
    title: 'Deep House Cleaning Estimator',
    category: 'Cleaning',
    desc: 'Room count slider, square footage pricing, recurring frequency discount toggle.',
    badge: 'Calculations',
    fieldsCount: 9,
  },
  {
    title: 'Electrical Panel Upgrade Assessment',
    category: 'Electrical',
    desc: 'Panel photo verification, amperage selection, and formal quote generation.',
    badge: 'Inspection',
    fieldsCount: 8,
  },
  {
    title: 'Landscaping & Lawn Care Estimate',
    category: 'Landscaping',
    desc: 'Lot acreage selector, seasonal package add-ons, and recurring Stripe checkout.',
    badge: 'Recurring',
    fieldsCount: 11,
  },
];

function Wrench(props: any) {
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

export default function GptFormLandingPage() {
  const [demoPrompt, setDemoPrompt] = useState(
    'Create a roofing estimate form with roof size, photos, damage type, material selection and deposit.'
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState('');

  // ─── 4 Interactive Form Modes State ───────────────────────────────────────
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

  // ─── Template search filter state ─────────────────────────────────────────
  const [templateSearch, setTemplateSearch] = useState('');

  // ─── Embed Code Snippet Tab State ─────────────────────────────────────────
  const [activeEmbedTab, setActiveEmbedTab] = useState<'wordpress' | 'shopify' | 'webflow' | 'react' | 'html'>('wordpress');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // Trigger Auth Gate Modal with persistent prompt
  const handleGenerateClick = (promptText?: string) => {
    const textToUse = promptText || demoPrompt;
    if (!textToUse.trim()) {
      toast.error('Please enter a description for your form.');
      return;
    }
    setSelectedPresetPrompt(textToUse);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('pending_gptform_prompt', textToUse);
      } catch (err) {
        console.warn('Unable to store prompt in sessionStorage', err);
      }
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

  return (
    <AiMarketingLayout>
      {/* ─── SECTION 1: HERO & AI COMPOSER ─────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-teal-50/50 via-background to-background dark:from-teal-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-300 text-xs font-semibold shadow-xs">
              <Sparkles className="size-3.5 text-teal-600" />
              <span>GPTFORM™ · AI-POWERED FORMS FOR MODERN BUSINESSES</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <span>🎁 Free Tier: <strong>100 Submissions / Month Free</strong></span>
            </div>
          </div>

          {/* Main Hero Typography */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Build forms that{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                do the work for you.
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create AI-powered forms that calculate prices, collect photos and signatures, take payments, book appointments and send every submission into your workflow.
            </p>
          </div>

          {/* AI Composer Box */}
          <div className="max-w-3xl mx-auto text-left">
            <Card className="border-2 border-teal-500/30 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="p-4 bg-teal-50/50 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    ✨ What do you want to build?
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">AI Form &amp; Calculation Generator</span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={demoPrompt}
                    onChange={(e) => setDemoPrompt(e.target.value)}
                    placeholder="Describe your form (e.g. Create a roofing estimate form with roof size, photos, damage type, material selection and deposit)..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-border bg-slate-50/50 dark:bg-slate-800/50 focus:outline-none focus:ring-2 focus:ring-teal-500 text-foreground resize-none leading-relaxed"
                  />
                </div>

                {/* Example Presets Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Start with an example:
                  </span>
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

                {/* Main Generation & Template Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border/60">
                  <Button
                    type="button"
                    onClick={() => handleGenerateClick(demoPrompt)}
                    className="w-full sm:w-auto h-11 px-6 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs sm:text-sm rounded-xl gap-2 shadow-md cursor-pointer"
                  >
                    <Sparkles className="size-4" />
                    <span>Create a Form with AI</span>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto h-11 text-xs font-semibold hover:border-teal-500 hover:text-teal-700"
                  >
                    <Link href="/templates">
                      <LayoutTemplate className="size-4 mr-1.5 text-muted-foreground" />
                      Browse 20,000+ Templates
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground mt-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> Free to start
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> No code required
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> Publish anywhere
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> 0% Fieseros commission
              </span>
            </div>
          </div>

          {/* ─── Hero Split Visual Preview (Left: AI Prompt, Right: Generated Form) ─── */}
          <div className="max-w-5xl mx-auto pt-6 text-left">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: AI Intent Summary */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-4 border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-teal-400" />
                    <span className="text-xs font-bold text-slate-200">AI Form Composer</span>
                  </div>
                  <Badge className="bg-teal-500/20 text-teal-300 text-[10px]">Instant Synthesis</Badge>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <p className="font-semibold text-teal-300">Prompt:</p>
                    <p className="text-slate-300 italic">
                      &quot;Create a roof replacement estimate form with roof size, photos, damage type, material selection and deposit.&quot;
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-800/60 space-y-2">
                    <p className="font-semibold text-teal-300 flex items-center gap-1">
                      <CheckCircle className="size-3.5 text-teal-400" />
                      <span>Form Components Configured:</span>
                    </p>
                    <ul className="space-y-1.5 text-[11px] text-teal-200">
                      <li>• Dynamic Pricing Formula: <code className="text-teal-300 font-mono">(sq_ft × rate) + addons</code></li>
                      <li>• Photo Upload with drawing annotation tools</li>
                      <li>• Digital customer signature field</li>
                      <li>• 0% fee payment checkout (Stripe / Apple Pay)</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Column: Actual Generated Form Preview */}
              <div className="lg:col-span-7">
                <Card className="border-2 border-teal-500/40 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-teal-50 dark:bg-teal-950/40 p-4 border-b border-teal-200 dark:border-teal-800/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                          Roof Replacement Estimate
                        </CardTitle>
                        <CardDescription className="text-xs text-teal-800/80 dark:text-teal-400 mt-0.5">
                          Interactive Live Calculation Form Demo
                        </CardDescription>
                      </div>
                      <Badge className="bg-teal-600 text-white text-[10px]">Ready to Publish</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Property Address */}
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Property address</label>
                      <Input
                        defaultValue="48 King Road, London"
                        readOnly
                        className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-border"
                      />
                    </div>

                    {/* Roof Area Slider */}
                    <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border/80">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Roof size</span>
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                          {previewSqFt.toLocaleString()} sq ft
                        </span>
                      </div>
                      <Slider
                        min={1000}
                        max={5000}
                        step={100}
                        value={[previewSqFt]}
                        onValueChange={([val]) => setPreviewSqFt(val)}
                        className="py-1 cursor-pointer"
                      />
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
                                : 'border-border bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-50'
                            )}
                          >
                            <p className="font-semibold text-[11px] truncate">{m.name}</p>
                            <p className="text-[10px] opacity-80">{m.rate}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Photo Upload Simulator */}
                    <div className="p-3 rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Camera className="size-4 text-teal-600" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">Upload roof photos</span>
                      </div>
                      <span className="text-[10px] font-semibold text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-full">
                        + Add Photos
                      </span>
                    </div>

                    {/* Calculated Total Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                          Estimated price
                        </span>
                        <span className="text-xl font-extrabold text-teal-300">
                          £{totalCalculated.toLocaleString()}
                        </span>
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
        </div>
      </section>

      {/* ─── SECTION 2: INTERACTIVE 4 FORM MODES SWITCHER ──────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            4 Interactive Runtime Modes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            One Form. Four High-Converting Experiences.
          </h2>
          <p className="text-base text-muted-foreground">
            Switch your form mode with a single click to match your customer experience.
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border shadow-inner">
            {[
              { id: 'classic', label: 'Classic', desc: 'Traditional structured form' },
              { id: 'card', label: 'Card', desc: 'One question at a time' },
              { id: 'split', label: 'Split', desc: 'Media + form layout' },
              { id: 'agent', label: 'AI Agent', desc: 'Conversational chat' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFormMode(tab.id as any)}
                className={cn(
                  'px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer',
                  activeFormMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-md ring-1 ring-teal-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Mode Display */}
        <div className="max-w-4xl mx-auto">
          {activeFormMode === 'classic' && (
            <Card className="p-6 border-border shadow-md space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <span className="font-bold text-sm">Classic Business Form</span>
                <Badge variant="outline" className="text-xs">Highest Data Density</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <label className="font-semibold block mb-1">Customer Full Name</label>
                  <Input placeholder="Jane Doe" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <label className="font-semibold block mb-1">Phone Number (SMS OTP)</label>
                  <Input placeholder="+44 7700 900077" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border sm:col-span-2">
                  <label className="font-semibold block mb-1">Service Required</label>
                  <Input placeholder="Boiler Repair & Diagnostic Inspection" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
              </div>
            </Card>
          )}

          {activeFormMode === 'card' && (
            <Card className="p-8 border-border shadow-md space-y-6 text-center max-w-xl mx-auto">
              <span className="text-[11px] font-bold text-teal-600 uppercase tracking-wider">Question 2 of 5</span>
              <h3 className="text-lg font-bold text-foreground">What type of property is this?</h3>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" className="p-4 rounded-xl border border-teal-500 bg-teal-50 dark:bg-teal-950/60 font-semibold text-xs text-teal-800 dark:text-teal-200">
                  Residential Home
                </button>
                <button type="button" className="p-4 rounded-xl border border-border bg-white dark:bg-slate-900 font-semibold text-xs text-muted-foreground">
                  Commercial Facility
                </button>
              </div>
              <Button size="sm" className="bg-teal-600 text-white text-xs px-6">Continue →</Button>
            </Card>
          )}

          {activeFormMode === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl overflow-hidden border border-border shadow-md bg-slate-900 text-white">
              <div className="p-6 bg-gradient-to-br from-teal-900/60 to-slate-900 space-y-3 flex flex-col justify-center">
                <Badge className="bg-teal-500 text-slate-950 font-bold w-fit text-[10px]">Split Media Mode</Badge>
                <h3 className="text-xl font-bold">HVAC Emergency Replacement</h3>
                <p className="text-xs text-slate-300">Fast 24-hour dispatch with certified engineers across London.</p>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 text-foreground space-y-3">
                <span className="text-xs font-semibold block text-muted-foreground">Select Your Urgent Need:</span>
                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg border border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 font-medium">
                    No Heat / Frozen Pipes (Immediate)
                  </div>
                  <div className="p-2.5 rounded-lg border border-border font-medium">
                    Routine Annual Service
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFormMode === 'agent' && (
            <Card className="p-6 border-border shadow-md max-w-xl mx-auto space-y-3 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b">
                <Bot className="size-4 text-teal-600" />
                <span className="font-bold text-foreground">Conversational AI Form</span>
              </div>
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 w-4/5">
                  Hi James! What plumbing issue are you experiencing today?
                </div>
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 ml-auto w-3/4 text-right font-medium">
                  The hot water heater in the basement is leaking.
                </div>
                <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 w-4/5">
                  Understood. Please upload a photo of the base so we can assign the correct replacement valve.
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* ─── SECTION 3: THE 9-STEP BUSINESS LOGIC PIPELINE ─────────────────── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Full Operational Logic</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              A Form That Can Calculate, Understand and Act
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every GPTForm™ executes a complete business pipeline from raw user input to paid confirmation and scheduled job dispatch.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-center text-xs">
            {[
              { step: 'QUESTION', desc: 'Customer Input' },
              { step: 'CONDITION', desc: 'Logic Branching' },
              { step: 'CALCULATION', desc: 'Instant Pricing' },
              { step: 'PHOTO', desc: 'Visual Evidence' },
              { step: 'AI ANALYSIS', desc: 'Intent & Triage' },
              { step: 'SIGNATURE', desc: 'Legal Sign-off' },
              { step: 'PAYMENT', desc: '0% Fee Checkout' },
              { step: 'CRM', desc: 'Customer 360' },
              { step: 'BOOKING', desc: 'Live Calendar' },
            ].map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 flex flex-col justify-between space-y-1">
                <span className="font-extrabold text-teal-300 text-[11px]">{item.step}</span>
                <span className="text-[10px] text-slate-400">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: GROUPED 5 FEATURE CATEGORIES ───────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Complete Feature Matrix
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Engineered for Precision &amp; Conversion
          </h2>
          <p className="text-sm text-muted-foreground">
            Everything your trade business needs to collect structured data and get paid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              category: 'Capture',
              icon: Camera,
              features: ['Photo & video markup', 'Voice recordings', 'GPS geofencing', 'Document upload', 'E-signatures'],
            },
            {
              category: 'Logic',
              icon: Sliders,
              features: ['Conditional logic', 'Dynamic math formulas', 'Lead scoring', 'Calculated fields', 'Branching rules'],
            },
            {
              category: 'Business',
              icon: CreditCard,
              features: ['Instant quotes', 'Real-time booking', '0% fee payments', 'Deposit checkout', 'Digital invoices'],
            },
            {
              category: 'AI Engine',
              icon: Sparkles,
              features: ['AI form builder', 'Conversational agent', 'Image extraction', 'Audio transcription', 'Auto-summaries'],
            },
            {
              category: 'Verification',
              icon: ShieldCheck,
              features: ['SMS OTP verification', 'IP timestamp audit', 'Address validation', 'Spam protection', 'SSL encryption'],
            },
          ].map((col) => {
            const Icon = col.icon;
            return (
              <Card key={col.category} className="border-border hover:border-teal-400/60 transition shadow-xs">
                <CardHeader className="space-y-2 p-4">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 w-fit">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-sm font-bold">{col.category}</CardTitle>
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

      {/* ─── SECTION 5: PAYMENTS & DIRECT CHECKOUT ─────────────────────────── */}
      <section id="payments" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <Badge className="bg-teal-600 text-white text-xs">Direct Payments</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Turn Forms into Checkout Pages
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect the payment provider you already use and collect customer deposits and invoices directly into your merchant account without a Fieseros commission.
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-foreground pt-2">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border flex items-center gap-2">
                  <CreditCard className="size-4 text-teal-600" /> Stripe Checkout
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border flex items-center gap-2">
                  <Smartphone className="size-4 text-teal-600" /> Apple Pay &amp; Google Pay
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border flex items-center gap-2">
                  <Zap className="size-4 text-teal-600" /> Square &amp; PayPal
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border flex items-center gap-2">
                  <QrCode className="size-4 text-teal-600" /> Razorpay UPI &amp; Netbanking
                </div>
              </div>
            </div>

            <Card className="border-2 border-teal-500/40 shadow-xl bg-slate-900 text-white p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-teal-400">Universal Payment Checkout</span>
                <span className="text-xs text-slate-400">0% Platform Fee</span>
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
              </div>
              <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 font-bold">
                Pay £450.00 via Apple Pay / Card →
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: SERVICE-BUSINESS SPECIALIZED TEMPLATES ─────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Tailored Trade Collections
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Forms Built for Real Service Work
          </h2>
          <p className="text-base text-muted-foreground">
            Unlike generic form builders, GPTForm™ includes pre-configured calculators, safety inspections, and sign-offs for all 25+ trades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {TRADE_TEMPLATES.map((t) => {
            const Icon = t.icon;
            return (
              <Card key={t.trade} className="border-border hover:border-teal-400/60 transition shadow-xs">
                <CardHeader className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                      <Icon className="size-4" />
                    </div>
                    <CardTitle className="text-sm font-bold">{t.trade}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {t.items.map((item) => (
                      <li key={item} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                        <span>{item}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleGenerateClick(`Create a ${item} form for ${t.trade}`)}
                          className="h-6 text-[10px] text-teal-600 px-2 cursor-pointer"
                        >
                          Use AI →
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

      {/* ─── SECTION 7: 20,000+ TEMPLATE MARKETPLACE ────────────────────────── */}
      <section id="templates" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Template Marketplace</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start with a Template. Make It Yours.
            </h2>
            <p className="text-sm text-muted-foreground">
              Search 20,000+ pre-built templates across industries or customize any template with AI in seconds.
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
              <Card key={tmpl.title} className="border-border hover:border-teal-400/60 transition shadow-xs flex flex-col justify-between">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300 border-teal-300">
                      {tmpl.category}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">{tmpl.fieldsCount} smart fields</span>
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">{tmpl.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{tmpl.desc}</CardDescription>
                </CardHeader>
                <CardFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                  <Button asChild variant="outline" size="sm" className="text-xs h-8">
                    <Link href="/templates">Use Template</Link>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleGenerateClick(`Customize ${tmpl.title} with calculation formulas and instant checkout.`)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 gap-1 cursor-pointer"
                  >
                    <Sparkles className="size-3" />
                    <span>Customize with AI</span>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div className="text-center pt-4">
            <Button asChild variant="outline" className="rounded-xl px-6 text-xs font-semibold">
              <Link href="/templates">Browse All 20,000+ Free Templates →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: PUBLISH ANYWHERE (WORDPRESS, SHOPIFY, EMBED) ───────── */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Universal Embedding
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Publish Anywhere in 1 Click
          </h2>
          <p className="text-sm text-muted-foreground">
            Embed your smart forms on WordPress, Shopify, Webflow, Squarespace, or custom React codebases.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex flex-wrap gap-2">
              {[
                { id: 'wordpress', label: 'WordPress Plugin' },
                { id: 'shopify', label: 'Shopify / Liquid' },
                { id: 'webflow', label: 'Webflow Embed' },
                { id: 'react', label: 'React / Next.js' },
                { id: 'html', label: 'HTML 1-Line Iframe' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveEmbedTab(tab.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer',
                    activeEmbedTab === tab.id
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={handleCopyCode}
              className="bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs gap-1.5 h-8 cursor-pointer"
            >
              {copiedSnippet ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copiedSnippet ? 'Copied!' : 'Copy Code'}</span>
            </Button>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed border border-slate-800">
            {activeEmbedTab === 'wordpress' && '[gptform id="form_roofing_estimate_2026" theme="emerald" /]'}
            {activeEmbedTab === 'shopify' && '<div class="fieseros-gptform" data-form-id="form_roofing_estimate_2026"></div>\n<script src="https://fieseros.com/embed.js" async></script>'}
            {activeEmbedTab === 'webflow' && '<iframe src="https://fieseros.com/f/roofing-estimate" width="100%" height="680" frameborder="0"></iframe>'}
            {activeEmbedTab === 'react' && 'import { GPTFormEmbed } from "@fieseros/react";\n\nexport default function QuotePage() {\n  return <GPTFormEmbed formId="form_roofing_estimate_2026" />;\n}'}
            {activeEmbedTab === 'html' && '<iframe src="https://fieseros.com/f/roofing-estimate" style="width:100%;height:680px;border:none;" title="GPTForm"></iframe>'}
          </div>
        </div>
      </section>

      {/* ─── SECTION 9: CRM WORKFLOW CONNECTION ────────────────────────────── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">CRM Integration</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Your Form Shouldn&apos;t End with a Submission
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every GPTForm™ submission flows seamlessly into the Fieseros operating system, auto-creating leads, assigning crew schedules, and generating invoices.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-center text-xs">
            {['FORM', 'LEAD', 'CUSTOMER', 'QUOTE', 'BOOKING', 'JOB', 'INVOICE', 'PAID'].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-3">
                <span className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 font-extrabold text-teal-300">
                  {step}
                </span>
                {i < arr.length - 1 && <ArrowRight className="size-4 text-slate-500 shrink-0" />}
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <Button asChild className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold px-6 h-10">
              <Link href="/#crm-features">Explore Fieseros Service OS →</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ─── SECTION 10: SIMPLE TRANSPARENT PRICING ────────────────────────── */}
      <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Simple Transparent Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start Free. Upgrade As You Scale.
            </h2>
            <p className="text-sm text-muted-foreground">
              Every contractor gets 100 free form submissions per month and 100 lifetime jobs at \$0 forever.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Free Tier */}
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
                  <li className="flex items-center gap-2">✓ 3 Active Smart Forms</li>
                  <li className="flex items-center gap-2">✓ 100 Form Submissions / month</li>
                  <li className="flex items-center gap-2">✓ 20,000+ Templates Library</li>
                  <li className="flex items-center gap-2">✓ Direct Payments (0% fee)</li>
                  <li className="flex items-center gap-2">✓ Universal 1-line Embed</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Start Free Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 2: Starter */}
            <Card className="border-2 border-teal-500 shadow-lg relative bg-white dark:bg-slate-900">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold">
                RECOMMENDED
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">Starter</CardTitle>
                <CardDescription className="text-xs">For active contractors &amp; growing sites</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$10</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ 10 Active Smart Forms</li>
                  <li className="flex items-center gap-2">✓ 1,000 Submissions / month</li>
                  <li className="flex items-center gap-2">✓ AI Form Synthesis &amp; Logic</li>
                  <li className="flex items-center gap-2">✓ Dynamic Math Calculations</li>
                  <li className="flex items-center gap-2">✓ Digital E-Signatures &amp; Booking</li>
                </ul>
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
                  <Link href="/register">Get Started ($10/mo) →</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 3: Business */}
            <Card className="border-border bg-white dark:bg-slate-900">
              <CardHeader className="space-y-1">
                <CardTitle className="text-lg font-bold">Business</CardTitle>
                <CardDescription className="text-xs">For multi-trade teams &amp; agencies</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$19</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Smart Forms</li>
                  <li className="flex items-center gap-2">✓ 10,000 Submissions / month</li>
                  <li className="flex items-center gap-2">✓ Conversational AI Form Agents</li>
                  <li className="flex items-center gap-2">✓ White-labeling &amp; Custom CSS</li>
                  <li className="flex items-center gap-2">✓ Priority Webhook &amp; Zapier Sync</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Get Business ($19/mo)</Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-center max-w-2xl mx-auto text-xs text-teal-900 dark:text-teal-200">
            <strong>Active Fieseros CRM Subscriber?</strong> GPTForm™ Unlimited is included in your CRM plan at no extra charge.
          </div>
        </div>
      </section>

      {/* ─── SECTION 11: FREQUENTLY ASKED QUESTIONS (FAQ) ─────────────────── */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h2>
          <p className="text-sm text-muted-foreground">
            Everything you need to know about GPTForm™, calculations, and integrations.
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-3">
          <AccordionItem value="faq-1" className="border rounded-xl px-4 bg-white dark:bg-slate-900">
            <AccordionTrigger className="text-xs sm:text-sm font-semibold text-left">
              Is GPTForm really free to start?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
              Yes. Every account starts on the Free Tier with 100 form submissions per month, 100 lifetime jobs, and access to all 20,000+ templates. No credit card is required.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-2" className="border rounded-xl px-4 bg-white dark:bg-slate-900">
            <AccordionTrigger className="text-xs sm:text-sm font-semibold text-left">
              How does the Dynamic Calculation Engine work?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
              You can define math formulas using variables from other fields (e.g. square footage × material rate + add-ons). Prices update live on the form before the customer submits.
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-3" className="border rounded-xl px-4 bg-white dark:bg-slate-900">
            <AccordionTrigger className="text-xs sm:text-sm font-semibold text-left">
              Does Fieseros take a commission on payments?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
              No. Fieseros charges 0% platform commission on payments collected through your forms. You only pay standard merchant processing fees to your payment provider (e.g. Stripe or Razorpay).
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="faq-4" className="border rounded-xl px-4 bg-white dark:bg-slate-900">
            <AccordionTrigger className="text-xs sm:text-sm font-semibold text-left">
              Can I embed GPTForm on WordPress, Shopify, or Webflow?
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
              Yes. Every form provides a 1-line embed snippet (iframe or script tag) compatible with WordPress, Shopify, Webflow, Squarespace, Wix, and custom React websites.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>

      {/* ─── SECTION 12: FINAL HIGH-CONVERTING CTA ─────────────────────────── */}
      <section className="py-20 text-center max-w-4xl mx-auto px-4 space-y-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Build forms that do the work for you.
        </h2>
        <p className="text-base text-muted-foreground max-w-xl mx-auto">
          Start calculating quotes, capturing signed contracts, and taking direct payments in under 10 minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={() => handleGenerateClick()}
            className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm h-12 px-8 rounded-xl shadow-lg cursor-pointer"
          >
            Create a Form with AI →
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto text-sm h-12 px-8 rounded-xl"
          >
            <Link href="/templates">Browse 20,000+ Templates</Link>
          </Button>
        </div>
      </section>

      {/* ─── AUTH GATE MODAL WITH PROMPT PRESERVATION ──────────────────────── */}
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

          {/* Display Preserved Prompt */}
          <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs space-y-1">
            <span className="font-semibold text-teal-600 dark:text-teal-400 block text-[11px] uppercase tracking-wider">
              Your Form Prompt:
            </span>
            <p className="text-slate-700 dark:text-slate-300 line-clamp-3 italic">
              &quot;{selectedPresetPrompt || demoPrompt}&quot;
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button
              asChild
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 rounded-xl shadow-md"
            >
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
            <span>✓ 100 Submissions / mo Free</span>
            <span>✓ No credit card required</span>
          </div>
        </DialogContent>
      </Dialog>
    </AiMarketingLayout>
  );
}
