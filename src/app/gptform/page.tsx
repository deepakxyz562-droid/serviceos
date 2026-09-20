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

// ─── Example Prompt Presets for Quick Insertion ─────────────────────────────
const EXAMPLE_PRESETS = [
  {
    label: '🏗️ Roofing Estimate',
    prompt: 'Roofing estimate form with square footage, architectural shingle options, photo upload notes, e-signature and credit card deposit.',
  },
  {
    label: '🔧 HVAC Service',
    prompt: 'HVAC repair and diagnostic form with equipment brand dropdown, photo notes of condenser, emergency time slot, and Stripe payment.',
  },
  {
    label: '🏠 Home Inspection',
    prompt: 'Comprehensive home inspection checklist with multi-room photo uploads, drawing notes, inspector signature, and PDF report delivery.',
  },
  {
    label: '🧹 Cleaning Quote',
    prompt: 'Residential cleaning quote calculator with bedroom/bathroom counters, deep cleaning add-ons, frequency discount, and instant online booking.',
  },
  {
    label: '📋 Customer Intake',
    prompt: 'General service customer intake with address autocomplete, issue description, preferred service window, and SMS notification opt-in.',
  },
  {
    label: '💳 Payment & Deposit',
    prompt: 'Contractor deposit checkout form with milestone payment breakdown, digital sign-off, and 0% platform fee credit card processing.',
  },
];

// ─── Curated Templates Catalog Sample ───────────────────────────────────────
const POPULAR_TEMPLATES = [
  {
    title: 'Roofing Square Footage Calculator',
    category: 'Roofing & Exterior',
    desc: 'Live material formula calculation with pitch multiplier and customer e-signature.',
    badge: 'Popular',
    fieldsCount: 8,
  },
  {
    title: 'HVAC Emergency Diagnostic Intake',
    category: 'HVAC & Heating',
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

export default function GptFormLandingPage() {
  const [demoPrompt, setDemoPrompt] = useState(
    'Create a roofing estimate form with square footage, material selection, photos, signature and payment.'
  );
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedPresetPrompt, setSelectedPresetPrompt] = useState('');

  // ─── Hero Interactive Split Preview States ────────────────────────────────
  const [previewSqFt, setPreviewSqFt] = useState(1250);
  const [previewMaterial, setPreviewMaterial] = useState<'standard' | 'architectural' | 'standing_seam'>('architectural');
  const [previewDebrisAddon, setPreviewDebrisAddon] = useState(true);
  const [previewEmergencyAddon, setPreviewEmergencyAddon] = useState(false);

  // Dynamic Calculation Logic
  const materialRate = previewMaterial === 'standard' ? 4.5 : previewMaterial === 'architectural' ? 6.2 : 8.5;
  const baseCost = Math.round(previewSqFt * materialRate);
  const debrisCost = previewDebrisAddon ? 380 : 0;
  const emergencyCost = previewEmergencyAddon ? 250 : 0;
  const totalCalculated = baseCost + debrisCost + emergencyCost;

  // ─── Template search filter state ─────────────────────────────────────────
  const [templateSearch, setTemplateSearch] = useState('');
  const [activeTemplateCategory, setActiveTemplateCategory] = useState('All');

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

  return (
    <AiMarketingLayout>
      {/* ─── SECTION 1: HERO & AI COMPOSER ─────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-teal-50/50 via-background to-background dark:from-teal-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 text-center">
          {/* Eyebrow badge */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/60 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-300 text-xs font-semibold shadow-xs">
              <Sparkles className="size-3.5 text-teal-600" />
              <span>GPTFORM™ · AI SMART FORM BUILDER</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
              <span>🎁 Free Tier: <strong>100 Submissions / Month Free</strong></span>
            </div>
          </div>

          {/* Main Hero Typography */}
          <div className="space-y-4 max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.12]">
              Build a form with{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 bg-clip-text text-transparent">
                AI.
              </span>
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Describe what you need. Fieseros builds the fields, logic, live price calculations, and workflow for you in seconds.
            </p>
          </div>

          {/* AI Composer Box */}
          <div className="max-w-3xl mx-auto text-left">
            <Card className="border-2 border-teal-500/30 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="p-4 bg-teal-50/50 dark:bg-teal-950/30 border-b border-teal-100 dark:border-teal-900/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2.5 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-xs font-bold text-teal-900 dark:text-teal-200">
                    ✨ GPTForm AI Composer
                  </span>
                </div>
                <span className="text-[11px] text-muted-foreground">What do you want to build?</span>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="relative">
                  <textarea
                    rows={3}
                    value={demoPrompt}
                    onChange={(e) => setDemoPrompt(e.target.value)}
                    placeholder="Describe your form (e.g. Roofing quote with square foot formula, photo notes, e-signature and deposit payment)..."
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
                    <span>Generate with AI</span>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full sm:w-auto h-11 text-xs font-semibold hover:border-teal-500 hover:text-teal-700"
                  >
                    <Link href="/templates">
                      <LayoutTemplate className="size-4 mr-1.5 text-muted-foreground" />
                      Explore 20,000+ Templates
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subtle Trust Bar */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground mt-4">
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> Free to start (100 submissions/mo)
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> 0% Fieseros commission
              </span>
              <span className="flex items-center gap-1.5 font-medium">
                <Check className="size-3.5 text-teal-600 font-bold" /> 1-line embed anywhere
              </span>
            </div>
          </div>

          {/* ─── Hero Split Visual Preview (Left: AI Chat, Right: Live Interactive Form) ─── */}
          <div className="max-w-5xl mx-auto pt-6 text-left">
            <div className="text-center mb-6 space-y-1">
              <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
                Live Interactive Synthesis Preview
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                From Natural Dialogue to Production-Ready Form
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left: Conversational Stream */}
              <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 text-white shadow-xl space-y-4 border border-slate-800">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <Bot className="size-4 text-teal-400" />
                    <span className="text-xs font-bold text-slate-200">Fieseros AI Stream</span>
                  </div>
                  <Badge className="bg-teal-500/20 text-teal-300 text-[10px]">Active Pipeline</Badge>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1">
                    <p className="font-semibold text-teal-300 flex items-center gap-1">
                      <span>👤 You</span>
                    </p>
                    <p className="text-slate-300">
                      &quot;Create a roofing estimate form. Include property address, roof size in sq ft, material tier, debris removal, customer e-signature, and card deposit.&quot;
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-950/60 border border-teal-800/60 space-y-2">
                    <p className="font-semibold text-teal-300 flex items-center gap-1">
                      <Sparkles className="size-3" />
                      <span>Fieseros AI</span>
                    </p>
                    <p className="text-slate-200">
                      Synthesized <strong>Roofing Estimate Calculator</strong> with dynamic pricing formula <code className="text-teal-300 font-mono text-[10px]">(Area × Rate) + Addons</code>, drawing notes canvas, and instant checkout.
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-teal-200">
                      <span className="flex items-center gap-1">✓ Formula attached</span>
                      <span className="flex items-center gap-1">✓ Signature bound</span>
                      <span className="flex items-center gap-1">✓ Stripe 0% fee</span>
                      <span className="flex items-center gap-1">✓ CRM synced</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Live Interactive Result */}
              <div className="lg:col-span-7">
                <Card className="border-2 border-teal-500/40 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                  <CardHeader className="bg-teal-50 dark:bg-teal-950/40 p-4 border-b border-teal-200 dark:border-teal-800/60">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-sm font-bold text-teal-950 dark:text-teal-200 flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-teal-600" /> Roofing Quote &amp; Estimate
                        </CardTitle>
                        <CardDescription className="text-xs text-teal-800/80 dark:text-teal-400 mt-0.5">
                          Interactive Live Calculation Demo · Try Adjusting Below
                        </CardDescription>
                      </div>
                      <Badge className="bg-teal-600 text-white text-[10px]">Calculations Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4 text-xs">
                    {/* Property Address */}
                    <div className="space-y-1">
                      <label className="font-semibold text-muted-foreground">Property Address</label>
                      <Input
                        defaultValue="742 Evergreen Terrace, Springfield"
                        readOnly
                        className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-border"
                      />
                    </div>

                    {/* Roof Area Slider */}
                    <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-border/80">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-foreground">Roof Area</span>
                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                          {previewSqFt.toLocaleString()} sq ft
                        </span>
                      </div>
                      <Slider
                        min={500}
                        max={3500}
                        step={50}
                        value={[previewSqFt]}
                        onValueChange={([val]) => setPreviewSqFt(val)}
                        className="py-1 cursor-pointer"
                      />
                    </div>

                    {/* Material Selector */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-muted-foreground">Shingle Material</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'standard', name: 'Standard 3-Tab', rate: '$4.50/sq ft' },
                          { id: 'architectural', name: 'Architectural', rate: '$6.20/sq ft' },
                          { id: 'standing_seam', name: 'Standing Seam', rate: '$8.50/sq ft' },
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

                    {/* Add-ons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPreviewDebrisAddon(!previewDebrisAddon)}
                        className={cn(
                          'p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition',
                          previewDebrisAddon ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200' : 'border-border'
                        )}
                      >
                        <span className="text-[11px] font-medium">Debris Haul-away</span>
                        <span className="text-[10px] font-bold">+$380</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewEmergencyAddon(!previewEmergencyAddon)}
                        className={cn(
                          'p-2 rounded-lg border text-left flex items-center justify-between cursor-pointer transition',
                          previewEmergencyAddon ? 'border-teal-500 bg-teal-50/70 dark:bg-teal-950/40 text-teal-900 dark:text-teal-200' : 'border-border'
                        )}
                      >
                        <span className="text-[11px] font-medium">Emergency Rush</span>
                        <span className="text-[10px] font-bold">+$250</span>
                      </button>
                    </div>

                    {/* Calculated Total Bar */}
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                          Live Estimated Total
                        </span>
                        <span className="text-xl font-extrabold text-teal-300">
                          ${totalCalculated.toLocaleString()}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateClick('Roofing Estimate Form')}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 px-3.5 font-semibold cursor-pointer"
                      >
                        Customize with AI →
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 2: HOW IT WORKS (FROM IDEA TO WORKING FORM) ───────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Intelligent 4-Step Synthesis
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            From Idea to Working Form in Seconds
          </h2>
          <p className="text-base text-muted-foreground">
            Describe your trade requirements in plain English, upload a PDF manual, or paste a URL. Fieseros handles the architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Describe & Specify',
              desc: 'Type what you need, paste a pricing sheet, or upload an existing PDF inspection document.',
              icon: MessageSquare,
            },
            {
              step: '02',
              title: 'Fieseros AI Engine',
              desc: 'Synthesizes field structure, validations, dynamic math logic, and layout hierarchy.',
              icon: Wand2,
            },
            {
              step: '03',
              title: 'Fields, Logic & Design',
              desc: 'Adds photo markup canvas, address GPS autocomplete, e-signatures, and payment gateway rules.',
              icon: Sliders,
            },
            {
              step: '04',
              title: 'Working Live Form',
              desc: 'Embed on WordPress, Webflow, React, or share instantly via hosted public URL.',
              icon: Globe,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.step} className="border-border hover:border-teal-400/60 transition shadow-xs relative">
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-extrabold text-teal-600/40">{item.step}</span>
                    <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600">
                      <Icon className="size-4" />
                    </div>
                  </div>
                  <CardTitle className="text-base font-bold">{item.title}</CardTitle>
                  <CardDescription className="text-xs leading-relaxed">{item.desc}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ─── SECTION 3: BUILT FOR REAL BUSINESSES (6 CAPABILITY PILLARS) ───── */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Contractor-Grade Power</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Not Just Forms. Smart Business Tools.
            </h2>
            <p className="text-base text-muted-foreground">
              Generic form builders only collect text. GPTForm™ calculates real quotes, captures photographic proof, takes legally-binding signatures, and collects payments with 0% platform fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1: Calculations */}
            <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
              <CardHeader className="space-y-3">
                <div className="size-10 rounded-xl bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600">
                  <Calculator className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">🧮 Dynamic Calculations</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Formula-based quoting engine for square footage, labor hours, tier multipliers, discounts, and custom formulas.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 2: Photos & Markup */}
            <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
              <CardHeader className="space-y-3">
                <div className="size-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600">
                  <Camera className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">📸 Photo &amp; Annotation Notes</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Customers upload site photos and draw arrows, circles, and notes directly on images before submission.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 3: E-Signatures */}
            <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
              <CardHeader className="space-y-3">
                <div className="size-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600">
                  <PenTool className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">✍️ Digital E-Signatures</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Legally-binding signature capture with IP timestamps, device audit records, and automatic PDF receipt generation.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 4: Direct Payments */}
            <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
              <CardHeader className="space-y-3">
                <div className="size-10 rounded-xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-amber-600">
                  <CreditCard className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">💳 0% Fee Payments</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Connect Stripe, Razorpay, or Bank Transfer. Funds flow straight to your account with zero platform commission.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 5: Real-Time Booking */}
            <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
              <CardHeader className="space-y-3">
                <div className="size-10 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600">
                  <CalendarCheck className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">📅 Real-Time Booking</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Customers select available service windows based on live crew availability. Automatically syncs with dispatch.
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Pillar 6: Workflow Automation */}
            <Card className="border-border hover:border-teal-400/60 transition shadow-xs">
              <CardHeader className="space-y-3">
                <div className="size-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                  <Zap className="size-5" />
                </div>
                <CardTitle className="text-base font-bold">⚡ Workflow Automation</CardTitle>
                <CardDescription className="text-xs leading-relaxed">
                  Instantly triggers SMS confirmations via Amazon SES, assigns jobs to technicians, and creates customer records.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: DYNAMIC PRICING ENGINE & FORMULA BREAKDOWN ────────── */}
      <section className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Instant Quoting Formula
          </Badge>
          <h2 className="text-3xl font-extrabold tracking-tight">
            Turn Forms into Instant Quoting Tools
          </h2>
          <p className="text-sm text-muted-foreground">
            Eliminate back-and-forth price calls. Let clients configure their exact specifications and see transparent instant pricing.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <span className="text-xs uppercase font-bold text-teal-400 tracking-wider">
                Active Calculation Formula
              </span>
              <p className="text-sm sm:text-base font-mono font-bold text-slate-100 mt-1">
                ({previewSqFt.toLocaleString()} sq ft × ${materialRate.toFixed(2)}) + ${debrisCost + emergencyCost} = <span className="text-teal-400">${totalCalculated.toLocaleString()}</span>
              </p>
            </div>
            <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs px-3 py-1">
              Deterministic Math Engine
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-800/80 space-y-2">
              <span className="font-semibold text-white block">Roof Size Factor</span>
              <p>{previewSqFt} square feet calculated at ${materialRate.toFixed(2)} / sq ft.</p>
              <span className="font-mono text-teal-300 font-bold block">${baseCost.toLocaleString()}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 space-y-2">
              <span className="font-semibold text-white block">Add-on Services</span>
              <p>{previewDebrisAddon ? 'Debris removal ($380)' : 'No debris cleanup'} {previewEmergencyAddon ? '+ Emergency Rush ($250)' : ''}</p>
              <span className="font-mono text-teal-300 font-bold block">+${debrisCost + emergencyCost}</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/80 space-y-2">
              <span className="font-semibold text-white block">Total Client Estimate</span>
              <p>Locked in for 30 days with instant e-sign acceptance.</p>
              <span className="font-mono text-xl text-teal-400 font-extrabold block">${totalCalculated.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SECTION 5: AI COPILOT ("Keep talking. Keep building.") ────────── */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Conversational Refinements</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Keep Talking. Keep Building.
            </h2>
            <p className="text-sm text-muted-foreground">
              AI doesn&apos;t stop after the first draft. Refine layouts, add logic branches, and customize branding simply by chatting with your copilot.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {[
              {
                user: 'Add a photo upload after the roof condition question.',
                ai: 'Done. Added camera upload widget with annotation drawing tools.',
              },
              {
                user: 'Make the address and phone fields display in two columns.',
                ai: 'Done. Layout transformed to responsive 2-column split grid.',
              },
              {
                user: 'Add a 10% discount for military and seniors.',
                ai: 'Done. Added conditional checkbox and linked calculation discount rule.',
              },
              {
                user: 'Send completed submissions to dispatch via SMS and email.',
                ai: 'Done. Amazon SES outbound notification workflow active.',
              },
            ].map((dialogue, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-border shadow-sm space-y-2 text-xs"
              >
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-foreground font-semibold text-[10px]">
                    You
                  </span>
                  <p className="text-foreground font-medium">{dialogue.user}</p>
                </div>
                <div className="flex items-start gap-2.5 pl-6">
                  <Sparkles className="size-3.5 text-teal-600 shrink-0 mt-0.5" />
                  <p className="text-teal-700 dark:text-teal-300 font-medium">{dialogue.ai}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: 20,000+ TEMPLATE ENGINE WITH "CUSTOMIZE WITH AI" ───── */}
      <section id="templates" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            20,000+ Production Templates
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Start with a Template or Build from Scratch with AI
          </h2>
          <p className="text-base text-muted-foreground">
            Explore industry-specific templates built for contractors, home services, and medical/legal practices. Customize any template instantly with AI.
          </p>
        </div>

        {/* Template Search Bar */}
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

        {/* Template Grid */}
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
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 hover:border-teal-500"
                >
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
      </section>

      {/* ─── SECTION 7: SERVICE BUSINESS LIFECYCLE WORKFLOW ───────────────── */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Full Lifecycle Integration</Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Forms Built for the Way Service Businesses Work
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Your form isn&apos;t just collecting data. It triggers the entire customer job lifecycle from instant quote to field dispatch and final payment.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
            {[
              { step: '1. Lead Intake', desc: 'Captures details & issue photos' },
              { step: '2. Live Quote', desc: 'Calculates price automatically' },
              { step: '3. E-Sign', desc: 'Customer authorizes work' },
              { step: '4. Booking', desc: 'Selects available time slot' },
              { step: '5. Dispatch', desc: 'Assigns crew with GPS routing' },
              { step: '6. Payment', desc: 'Collects funds (0% fee)' },
              { step: '7. Follow-up', desc: 'Automated review & SMS' },
            ].map((item, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1">
                <span className="text-xs font-bold text-teal-300 block">{item.step}</span>
                <p className="text-[11px] text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 8: THE UNIFIED FIESEROS ECOSYSTEM ─────────────────────── */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            One Connected Architecture
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            One Form. One Workflow. One Business OS.
          </h2>
          <p className="text-base text-muted-foreground">
            GPTForm™ integrates natively with every component of the Fieseros operating system.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="border-2 border-teal-500 shadow-md">
            <CardHeader className="space-y-2">
              <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 w-fit">
                <FileInput className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">GPTForm™</CardTitle>
              <CardDescription className="text-xs">
                AI forms, calculations, photo notes, e-signatures &amp; direct payments.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader className="space-y-2">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 w-fit">
                <Globe className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">Online Booking Portal</CardTitle>
              <CardDescription className="text-xs">
                Self-service customer booking pages with real-time technician calendar availability.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader className="space-y-2">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 w-fit">
                <Bot className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">AI Receptionist</CardTitle>
              <CardDescription className="text-xs">
                24/7 AI voice phone agent that answers calls and books appointments.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border">
            <CardHeader className="space-y-2">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 w-fit">
                <Layers className="size-5" />
              </div>
              <CardTitle className="text-base font-bold">Service OS</CardTitle>
              <CardDescription className="text-xs">
                Full dispatch calendar, technician mobile app, invoicing &amp; CRM.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* ─── SECTION 9: ZERO-COMMISSION DIRECT PAYMENTS ────────────────────── */}
      <section id="payments" className="py-16 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <Badge className="bg-teal-600 text-white text-xs">Direct Payments</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                Get Paid Directly with 0% Platform Commission
              </h2>
              <p className="text-sm text-slate-300 leading-relaxed">
                Connect your preferred payment gateway. When customers submit payments or deposits, 100% of the funds flow straight to your merchant account.
              </p>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">✓ Stripe Checkout, Credit Cards &amp; Apple Pay</li>
                <li className="flex items-center gap-2">✓ Razorpay UPI QR &amp; Netbanking</li>
                <li className="flex items-center gap-2">✓ Direct Bank Account details with 1-click copy</li>
                <li className="flex items-center gap-2">✓ Instant digital receipt delivery via Amazon SES</li>
              </ul>
            </div>
            <div className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-700">
                <span className="text-xs font-semibold text-teal-400">Universal Payment Gateway</span>
                <span className="text-xs text-slate-400">0% Fieseros Fee</span>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 text-xs flex justify-between items-center">
                <span>Roofing Deposit &amp; Sign-off</span>
                <span className="font-bold text-white">$1,500.00</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-teal-600 text-center font-semibold text-xs">Pay via Card / Apple Pay</div>
                <div className="p-2.5 rounded-lg bg-slate-700 text-center font-semibold text-xs">UPI / Bank Transfer</div>
              </div>
            </div>
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
                <CardTitle className="text-lg font-bold">Free Forever</CardTitle>
                <CardDescription className="text-xs">Zero monthly cost, no credit card</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$0</span>
                  <span className="text-xs text-muted-foreground"> / forever</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ 100 Form Submissions / month</li>
                  <li className="flex items-center gap-2">✓ 100 Lifetime Jobs &amp; Invoices</li>
                  <li className="flex items-center gap-2">✓ Dynamic Calculations &amp; E-Signatures</li>
                  <li className="flex items-center gap-2">✓ Direct Payments (0% fee)</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Start Free Now</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Plan 2: Pro CRM */}
            <Card className="border-2 border-teal-500 shadow-lg relative bg-white dark:bg-slate-900">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold">
                MOST POPULAR
              </div>
              <CardHeader className="space-y-1 pt-6">
                <CardTitle className="text-lg font-bold">Professional CRM</CardTitle>
                <CardDescription className="text-xs">Complete Service OS &amp; GPTForm™ suite</CardDescription>
                <div className="pt-2">
                  <span className="text-3xl font-extrabold">$49</span>
                  <span className="text-xs text-muted-foreground"> / month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <ul className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-center gap-2">✓ Unlimited Form Submissions</li>
                  <li className="flex items-center gap-2">✓ Unlimited Jobs, Invoices &amp; Estimates</li>
                  <li className="flex items-center gap-2">✓ Real-time Dispatch Calendar &amp; GPS</li>
                  <li className="flex items-center gap-2">✓ Online Booking Portal Included</li>
                </ul>
                <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold">
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
                  <li className="flex items-center gap-2">✓ Multi-Location &amp; Multi-Brand Management</li>
                  <li className="flex items-center gap-2">✓ 24/7 AI Voice Receptionist Phone Lines</li>
                  <li className="flex items-center gap-2">✓ Custom CSS &amp; White-labeling</li>
                  <li className="flex items-center gap-2">✓ Dedicated Account Manager</li>
                </ul>
                <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                  <Link href="/register">Scale Your Business</Link>
                </Button>
              </CardContent>
            </Card>
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
              Yes. Every Fieseros account starts on the Universal Free Tier with 100 form submissions per month, 100 lifetime jobs, and access to all 20,000+ templates. No credit card is required.
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
          Ready to Build Your First Smart Form with AI?
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
            Create Free Account →
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto text-sm h-12 px-8 rounded-xl"
          >
            <Link href="/templates">Explore 20,000+ Templates</Link>
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
