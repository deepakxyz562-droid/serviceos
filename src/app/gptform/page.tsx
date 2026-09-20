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
  Users,
  Briefcase,
  GitBranch,
  Cpu,
  Send,
  Calendar,
  UserCheck,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkle,
  SlidersHorizontal,
  FolderOpen,
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
function WrenchIcon(props: React.SVGProps<SVGSVGElement>) {
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

// ─── Hero Quick-Start Presets ───────────────────────────────────────────────
const HERO_PRESETS = [
  {
    id: 'roofing',
    label: '🏗️ Roofing Estimate',
    prompt: 'Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment.',
    title: 'Roof Replacement Estimate',
    fieldsCount: 8,
    features: ['Live Price Formula', 'Photo Upload', 'E-Signature', 'Stripe Deposit'],
  },
  {
    id: 'dental',
    label: '🦷 Dental Appointment',
    prompt: 'Create a dental clinic patient booking form with treatment selector, doctor availability check, insurance card photo, and SMS confirmation.',
    title: 'Dental Patient Intake & Booking',
    fieldsCount: 7,
    features: ['Calendar Slot Check', 'Insurance ID Upload', 'Medical History', 'SMS Reminders'],
  },
  {
    id: 'cleaning',
    label: '🧹 Cleaning Quote',
    prompt: 'Create a residential cleaning calculator with bedroom/bathroom counters, deep cleaning add-on options, recurring frequency discounts, and online booking.',
    title: 'Residential Cleaning Estimator',
    fieldsCount: 9,
    features: ['Room Count Formula', 'Frequency Discounts', 'Add-on Checklist', 'Instant Total'],
  },
  {
    id: 'hvac',
    label: '🔧 HVAC Emergency',
    prompt: 'Create an HVAC emergency repair request form with brand dropdown, error symptoms, equipment photo upload, calendar dispatch, and diagnostic fee payment.',
    title: 'HVAC Emergency Diagnostic & Dispatch',
    fieldsCount: 10,
    features: ['Urgency Routing', 'Equipment Markup', 'Emergency Fee (£89)', 'Live Dispatch'],
  },
  {
    id: 'intake',
    label: '📋 Client Intake',
    prompt: 'Create a professional client onboarding form with address autocomplete, project timeline, budget range selector, NDA e-signature, and CRM sync.',
    title: 'Client Intake & Project Brief',
    fieldsCount: 6,
    features: ['Address Lookup', 'Budget Selector', 'NDA Sign-off', 'CRM Lead Sync'],
  },
];

// ─── 20,000+ Template Catalog Explorer ──────────────────────────────────────
const TEMPLATE_CATEGORIES = [
  'All',
  'Home Services',
  'Healthcare & Dental',
  'Bookings & Quotes',
  'Estimates & Calculators',
  'Customer Intake',
  'Surveys & Feedback',
  'Payments & Deposits',
];

const TEMPLATES_EXPLORER_DATA = [
  {
    id: 'roof-calc',
    title: 'Roof Replacement Estimate Calculator',
    category: 'Home Services',
    desc: 'Live square footage formula with pitch multiplier, material selectors, and instant deposit checkout.',
    badge: 'Formula Engine',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
    fieldsCount: 8,
    tags: ['Roofing', 'Calculator', 'E-Sign', 'Payment'],
  },
  {
    id: 'hvac-diag',
    title: 'HVAC Emergency Diagnostic & Dispatch',
    category: 'Home Services',
    desc: 'Equipment photo capture, symptom triaging, emergency slot booking, and diagnostic fee collection.',
    badge: 'High Conversion',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
    fieldsCount: 10,
    tags: ['HVAC', 'Booking', 'Emergency', 'Photos'],
  },
  {
    id: 'dental-intake',
    title: 'Dental Patient Intake & Slot Booking',
    category: 'Healthcare & Dental',
    desc: 'Patient medical history, insurance photo upload, preferred dentist selection, and live calendar booking.',
    badge: 'Conversational Ready',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
    fieldsCount: 9,
    tags: ['Dental', 'Appointments', 'Insurance', 'HIPAA'],
  },
  {
    id: 'plumbing-call',
    title: 'Plumbing Service Call & Sign-Off',
    category: 'Home Services',
    desc: 'Address GPS geocoding, leak photo annotations, technician dispatch slot, and digital sign-off.',
    badge: 'Workflow Connected',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300',
    fieldsCount: 7,
    tags: ['Plumbing', 'Dispatch', 'Signature', 'GPS'],
  },
  {
    id: 'cleaning-calc',
    title: 'Deep House Cleaning Estimator',
    category: 'Estimates & Calculators',
    desc: 'Dynamic room count sliders, recurring weekly/bi-weekly discount logic, and direct checkout.',
    badge: 'Dynamic Pricing',
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300',
    fieldsCount: 9,
    tags: ['Cleaning', 'Recurring', 'Sliders', 'Payments'],
  },
  {
    id: 'electrical-panel',
    title: 'Electrical Panel Upgrade Assessment',
    category: 'Home Services',
    desc: 'Breaker panel photo upload, amperage requirement selector, code compliance checklist, and quote generation.',
    badge: 'Inspection Form',
    badgeColor: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300',
    fieldsCount: 8,
    tags: ['Electrical', 'Inspection', 'Photo Upload', 'Quotes'],
  },
  {
    id: 'client-onboard',
    title: 'Commercial Client Onboarding Intake',
    category: 'Customer Intake',
    desc: 'Business profile capture, service level agreement sign-off, billing details, and automated CRM record.',
    badge: 'B2B Intake',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300',
    fieldsCount: 11,
    tags: ['Onboarding', 'B2B', 'Contracts', 'CRM Sync'],
  },
  {
    id: 'event-booking',
    title: 'Corporate Venue & Catering Booking',
    category: 'Bookings & Quotes',
    desc: 'Guest count calculator, menu tier selection, date availability calendar, and 20% deposit collection.',
    badge: 'Deposit Checkout',
    badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-950/60 dark:text-pink-300',
    fieldsCount: 12,
    tags: ['Events', 'Catering', 'Deposits', 'Calendars'],
  },
  {
    id: 'pet-grooming',
    title: 'Pet Grooming Intake & Schedule',
    category: 'Healthcare & Dental',
    desc: 'Breed and weight selector, vaccination record attachment, special care notes, and booking slot.',
    badge: 'Fast Intake',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
    fieldsCount: 8,
    tags: ['Pets', 'Care', 'Uploads', 'Scheduling'],
  },
];

// ─── Workflow Pipeline Steps ────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  {
    id: 'form',
    label: 'FORM',
    title: 'Customer Submits Form',
    desc: 'Customer completes form or chats with the AI Form Agent. Validated structured data is generated.',
    icon: FileInput,
    actionLabel: 'Input Captured',
  },
  {
    id: 'lead',
    label: 'LEAD',
    title: 'Lead Automatically Created',
    desc: 'Contact profile, property address, and requirements are synced immediately into Fieseros CRM.',
    icon: Users,
    actionLabel: 'CRM Synced',
  },
  {
    id: 'customer',
    label: 'CUSTOMER',
    title: 'Customer 360 Record Created',
    desc: 'Customer history, past interactions, and communication logs are linked under a single profile.',
    icon: UserCheck,
    actionLabel: 'Record Stored',
  },
  {
    id: 'quote',
    label: 'QUOTE',
    title: 'Instant Quote Generated',
    desc: 'Formula-calculated estimate with line items and material rates is automatically sent to the customer.',
    icon: Calculator,
    actionLabel: 'Quote Delivered',
  },
  {
    id: 'booking',
    label: 'BOOKING',
    title: 'Live Calendar Slot Reserved',
    desc: 'Selected time window is booked on your company calendar with automated technician buffer time.',
    icon: CalendarCheck,
    actionLabel: 'Slot Confirmed',
  },
  {
    id: 'job',
    label: 'JOB',
    title: 'Dispatch Job Card Dispatched',
    desc: 'Job details, customer photos, and map directions are assigned to the field technician mobile app.',
    icon: WrenchIcon,
    actionLabel: 'Technician Assigned',
  },
  {
    id: 'invoice',
    label: 'INVOICE',
    title: 'Digital Invoice Issued',
    desc: 'Itemized invoice is generated with payment link, deposit deduction, and tax calculations.',
    icon: FileSpreadsheet,
    actionLabel: 'Invoice Ready',
  },
  {
    id: 'payment',
    label: 'PAID',
    title: '0% Platform Fee Payout',
    desc: 'Payment processed directly into your connected Stripe/merchant account with zero commission deducted.',
    icon: DollarSign,
    actionLabel: 'Funds Received',
  },
];

export default function GptFormLandingPage() {
  // ─── AI Prompt & Auth Gate State ──────────────────────────────────────────
  const [demoPrompt, setDemoPrompt] = useState(
    'Create a roofing estimate form with roof size in sq ft, architectural material options, damage photos, customer e-signature and deposit payment.'
  );
  const [selectedPresetId, setSelectedPresetId] = useState('roofing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [pendingPromptForAuth, setPendingPromptForAuth] = useState('');

  // ─── Hero Interactive Live Form State ─────────────────────────────────────
  const [heroSqFt, setHeroSqFt] = useState(2400);
  const [heroMaterial, setHeroMaterial] = useState<'asphalt' | 'metal' | 'tile'>('metal');
  const [heroDebrisAddon, setHeroDebrisAddon] = useState(true);

  // Dynamic formula calculation
  const materialRate = heroMaterial === 'asphalt' ? 3.4 : heroMaterial === 'metal' ? 5.8 : 8.2;
  const heroBaseCost = Math.round(heroSqFt * materialRate);
  const heroAddonCost = heroDebrisAddon ? 450 : 0;
  const heroTotal = heroBaseCost + heroAddonCost;

  // ─── 4 Runtime Modes State ────────────────────────────────────────────────
  const [activeRuntimeMode, setActiveRuntimeMode] = useState<'classic' | 'card' | 'split' | 'agent'>('classic');

  // ─── Conversational AI Agent Sandbox State ────────────────────────────────
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'bot' | 'user'; text: string; action?: string }>>([
    { sender: 'bot', text: 'Hi there! I can help you schedule an appointment or get an instant quote. What service do you need today?' },
    { sender: 'user', text: 'I need a roof replacement estimate for my two-storey home.' },
    { sender: 'bot', text: 'Great! What is the approximate square footage of your roof?', action: 'slider_sqft' },
    { sender: 'user', text: 'Around 2,400 sq ft with architectural metal shingles.' },
    { sender: 'bot', text: 'Got it. I have prepared your estimate (£14,370). Would you like to schedule an on-site inspection for Tuesday at 10:00 AM?', action: 'booking_confirm' },
  ]);
  const [chatInputText, setChatInputText] = useState('');

  // ─── Interactive Workflow Pipeline State ──────────────────────────────────
  const [activeWorkflowIndex, setActiveWorkflowIndex] = useState(0);

  // ─── Template Explorer State ──────────────────────────────────────────────
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [templateSearchQuery, setTemplateSearchQuery] = useState('');
  const [previewTemplateModal, setPreviewTemplateModal] = useState<typeof TEMPLATES_EXPLORER_DATA[0] | null>(null);

  // ─── Embed Tab State ──────────────────────────────────────────────────────
  const [activeEmbedTab, setActiveEmbedTab] = useState<'wordpress' | 'shopify' | 'webflow' | 'react' | 'html'>('wordpress');
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  // ─── Pricing Billing Period State ─────────────────────────────────────────
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const yearlyDiscountMultiplier = 0.83; // ~17% discount

  const getTierPrice = (baseMonthlyPrice: number) => {
    if (billingPeriod === 'yearly') {
      return Math.round(baseMonthlyPrice * yearlyDiscountMultiplier);
    }
    return baseMonthlyPrice;
  };

  // ─── Auth Gate Trigger (AI Generation / Template Customization) ────────────
  const handleTriggerAuthGate = (promptText?: string) => {
    const textToPreserve = promptText || demoPrompt;
    if (!textToPreserve.trim()) {
      toast.error('Please enter a description for your form.');
      return;
    }
    setPendingPromptForAuth(textToPreserve);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('pending_gptform_prompt', textToPreserve);
      } catch {}
    }
    setAuthModalOpen(true);
  };

  // ─── Quick Preset Selection ───────────────────────────────────────────────
  const handleSelectPreset = (preset: typeof HERO_PRESETS[0]) => {
    setSelectedPresetId(preset.id);
    setDemoPrompt(preset.prompt);
  };

  // ─── Embed Code Snippets ──────────────────────────────────────────────────
  const embedSnippets: Record<string, string> = {
    wordpress: '[gptform id="form_roofing_quote_2026" theme="emerald" mode="card" /]',
    shopify: '<div class="fieseros-gptform" data-form-id="form_roofing_quote_2026" data-mode="agent"></div>\n<script src="https://fieseros.com/embed.js" async></script>',
    webflow: '<iframe\n  src="https://fieseros.com/f/roofing-quote"\n  width="100%"\n  height="680"\n  frameborder="0"\n  title="GPTForm">\n</iframe>',
    react: 'import { GPTFormEmbed } from "@fieseros/react";\n\nexport default function QuotePage() {\n  return (\n    <GPTFormEmbed\n      formId="form_roofing_quote_2026"\n      mode="agent"\n      accentColor="#0d9488"\n    />\n  );\n}',
    html: '<iframe\n  src="https://fieseros.com/f/roofing-quote"\n  style="width:100%;height:680px;border:none;border-radius:16px;"\n  title="GPTForm">\n</iframe>',
  };

  const embedNotes: Record<string, string> = {
    wordpress: '// WordPress Shortcode — Powered by Fieseros GPTForm Plugin',
    shopify: '// Shopify Section / Liquid Template Tag',
    webflow: '// Webflow Embed Block (Responsive HTML5)',
    react: '// Next.js / React 19 Component Integration',
    html: '// Universal HTML5 iframe — compatible with any CMS',
  };

  const handleCopyEmbedCode = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(embedSnippets[activeEmbedTab]);
      setCopiedSnippet(true);
      toast.success('Embed snippet copied to clipboard!');
      setTimeout(() => setCopiedSnippet(false), 2000);
    }
  };

  // ─── Chat Sandbox Send Action ─────────────────────────────────────────────
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    const userMsg = chatInputText;
    setChatMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInputText('');

    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: `Thank you! I have updated your form with "${userMsg}". All information is securely pre-filled and ready for one-tap submission.`,
        },
      ]);
    }, 600);
  };

  // Filtered Templates for Explorer
  const filteredTemplates = TEMPLATES_EXPLORER_DATA.filter((tmpl) => {
    const matchesCategory = selectedCategory === 'All' || tmpl.category === selectedCategory;
    const matchesSearch =
      !templateSearchQuery ||
      tmpl.title.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      tmpl.desc.toLowerCase().includes(templateSearchQuery.toLowerCase()) ||
      tmpl.tags.some((tag) => tag.toLowerCase().includes(templateSearchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <AiMarketingLayout>
      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO: INTERACTIVE AI FORM BUILDER CANVAS
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 border-b bg-gradient-to-b from-teal-50/50 via-background to-background dark:from-teal-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top Hero Pitch */}
          <div className="max-w-3xl space-y-5">
            {/* Eyebrow */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-100/80 dark:bg-teal-950/70 border border-teal-300 dark:border-teal-800 text-teal-900 dark:text-teal-300 text-xs font-semibold">
                <Sparkles className="size-3.5 text-teal-600" />
                <span>GPTFORM™ · AI FORM PLATFORM</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium">
                🎁 Free Plan: <strong>100 Submissions / Month</strong>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
              Build forms with AI.{' '}
              <span className="bg-gradient-to-r from-teal-600 via-emerald-500 to-teal-600 bg-clip-text text-transparent">
                Turn them into conversations.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Describe what you need and GPTForm builds it for you — complete with smart logic, live calculations, direct payments, e-signatures, calendar booking, and an AI-powered conversational agent.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <Button
                type="button"
                size="lg"
                onClick={() => handleTriggerAuthGate(demoPrompt)}
                className="h-12 px-7 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-xl gap-2 shadow-md cursor-pointer"
              >
                <Sparkles className="size-4" />
                Build a Form Free →
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-12 px-7 text-sm font-semibold rounded-xl hover:border-teal-500 hover:text-teal-700"
              >
                <a href="#templates">
                  <LayoutTemplate className="size-4 mr-2 text-muted-foreground" />
                  Explore 20,000+ Templates
                </a>
              </Button>
            </div>

            {/* Micro-trust strip */}
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground pt-1">
              {['No credit card required', 'Free forever plan', 'Universal 1-line embed', '0% payment commission'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-medium">
                  <Check className="size-3.5 text-teal-600 font-bold" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* ─── INTERACTIVE HERO PRODUCT CANVAS ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left AI Composer Box (5 cols) */}
            <Card className="lg:col-span-5 border-2 border-teal-500/30 shadow-xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="p-4 bg-teal-50/70 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900/50 flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-teal-500 animate-pulse" />
                  <span className="text-xs font-bold text-teal-950 dark:text-teal-200">✨ Tell GPTForm What You Need</span>
                </div>
                <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300 border-teal-300">
                  AI Form Engine
                </Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Prompt Textarea */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Prompt Description:
                  </label>
                  <textarea
                    rows={3}
                    value={demoPrompt}
                    onChange={(e) => setDemoPrompt(e.target.value)}
                    placeholder="Describe your form in plain English..."
                    className="w-full text-xs sm:text-sm p-3 rounded-xl border border-border bg-slate-50/60 dark:bg-slate-800/60 focus:outline-none focus:ring-2 focus:ring-teal-500 text-foreground resize-none leading-relaxed"
                  />
                </div>

                {/* Preset Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Try Instant Presets:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {HERO_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={cn(
                          'px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer border',
                          selectedPresetId === preset.id
                            ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compile CTA */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-3">
                  <Button
                    type="button"
                    onClick={() => handleTriggerAuthGate(demoPrompt)}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 rounded-xl gap-2 shadow-sm cursor-pointer"
                  >
                    <Sparkles className="size-3.5" />
                    Generate Form with AI →
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right Live Interactive Form Preview (7 cols) */}
            <Card className="lg:col-span-7 border-2 border-teal-500/40 shadow-2xl bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
              <CardHeader className="bg-teal-50/90 dark:bg-teal-950/50 p-4 border-b border-teal-200 dark:border-teal-800/60 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-teal-950 dark:text-teal-200 flex items-center gap-2">
                    <span>{HERO_PRESETS.find((p) => p.id === selectedPresetId)?.title || 'Custom AI Form'}</span>
                  </CardTitle>
                  <CardDescription className="text-xs text-teal-800/80 dark:text-teal-400 mt-0.5">
                    Live Calculation Engine · 8 Smart Fields · 4 Runtime Modes
                  </CardDescription>
                </div>
                <Badge className="bg-teal-600 text-white text-[10px]">Interactive Demo</Badge>
              </CardHeader>
              <CardContent className="p-5 space-y-4 text-xs">
                {/* Simulated Property / Service Field */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Property Address</label>
                    <Input defaultValue="48 King Road, London" readOnly className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-border" />
                  </div>
                  <div className="space-y-1">
                    <label className="font-semibold text-muted-foreground">Urgency Level</label>
                    <Input defaultValue="Standard Inspection (Within 48h)" readOnly className="h-9 text-xs bg-slate-50 dark:bg-slate-800 border-border" />
                  </div>
                </div>

                {/* Roof Area / Quantity Slider */}
                <div className="space-y-2 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-border/80">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-foreground">Area / Scope Size</span>
                    <span className="font-mono font-bold text-teal-600 dark:text-teal-400">
                      {heroSqFt.toLocaleString()} sq ft
                    </span>
                  </div>
                  <Slider
                    min={1000}
                    max={5000}
                    step={100}
                    value={[heroSqFt]}
                    onValueChange={([val]) => setHeroSqFt(val)}
                    className="py-1 cursor-pointer"
                  />
                  <p className="text-[10px] text-muted-foreground">Drag slider to adjust calculation formula in real time.</p>
                </div>

                {/* Material / Service Tier Selector */}
                <div className="space-y-1.5">
                  <label className="font-semibold text-muted-foreground">Material / Service Tier</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'asphalt', name: 'Asphalt Shingle', rate: '£3.40/sq ft' },
                      { id: 'metal', name: 'Architectural Metal', rate: '£5.80/sq ft' },
                      { id: 'tile', name: 'Spanish Tile', rate: '£8.20/sq ft' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setHeroMaterial(m.id as any)}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition cursor-pointer',
                          heroMaterial === m.id
                            ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-200 ring-1 ring-teal-500'
                            : 'border-border bg-white dark:bg-slate-800 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-700'
                        )}
                      >
                        <p className="font-bold text-[11px] truncate">{m.name}</p>
                        <p className="text-[10px] opacity-80">{m.rate}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Debris Add-on Toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-2">
                    <Camera className="size-4 text-teal-600" />
                    <span className="font-medium text-slate-700 dark:text-slate-300">Site debris removal add-on</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setHeroDebrisAddon(!heroDebrisAddon)}
                    className={cn(
                      'text-[10px] font-semibold px-2.5 py-1 rounded-full transition cursor-pointer',
                      heroDebrisAddon
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    {heroDebrisAddon ? '✓ +£450' : '+ Add £450'}
                  </button>
                </div>

                {/* Dynamic Estimated Total Bar */}
                <div className="p-3.5 rounded-xl bg-slate-900 text-white flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 block">
                      Live Calculated Total
                    </span>
                    <span className="text-2xl font-extrabold text-teal-300">
                      £{heroTotal.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleTriggerAuthGate('Roofing Estimate Form')}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 px-5 font-semibold cursor-pointer rounded-lg"
                  >
                    Publish This Form →
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — PRODUCT PROOF & CAPABILITY STRIP
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-8 border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-center text-xs">
            {[
              { icon: LayoutTemplate, label: '20,000+ Templates', sub: 'Pre-built libraries' },
              { icon: Sliders, label: '200+ Smart Widgets', sub: 'Calculators & logic' },
              { icon: Layers, label: '4 Runtime Modes', sub: 'Classic, Card, Split, Agent' },
              { icon: Sparkles, label: 'AI Form Synthesis', sub: 'Prompt to form in 10s' },
              { icon: Bot, label: 'AI Form Agent', sub: 'Conversational intake' },
              { icon: CreditCard, label: '0% Platform Fee', sub: 'Direct merchant payout' },
              { icon: Workflow, label: 'Service OS Sync', sub: 'Lead to paid invoice' },
            ].map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.label} className="p-3 rounded-xl bg-background border border-border/80 flex flex-col items-center gap-1">
                  <Icon className="size-4 text-teal-600 mb-0.5" />
                  <span className="font-bold text-foreground text-[11px] leading-tight">{p.label}</span>
                  <span className="text-[10px] text-muted-foreground leading-tight">{p.sub}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — ONE FORM. FOUR WAYS TO USE IT.
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            One Platform · Four Runtime Experiences
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            One Form. Four Ways to Experience It.
          </h2>
          <p className="text-base text-muted-foreground">
            Switch your form experience with a single click. Give your customers the exact interface that maximizes conversion.
          </p>
        </div>

        {/* Runtime Switcher Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-border shadow-inner">
            {[
              { id: 'classic', label: 'Classic Form', caption: 'Structured multi-column' },
              { id: 'card', label: 'Card Mode', caption: 'One question at a time' },
              { id: 'split', label: 'Split Media', caption: 'Visual hero + form' },
              { id: 'agent', label: 'AI Form Agent', caption: 'Conversational chat' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveRuntimeMode(tab.id as any)}
                className={cn(
                  'px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex flex-col items-center gap-0.5',
                  activeRuntimeMode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-md ring-1 ring-teal-500/30'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <span>{tab.label}</span>
                <span className={cn('text-[10px] font-normal hidden sm:block', activeRuntimeMode === tab.id ? 'text-teal-600/80 dark:text-teal-400/80' : 'text-muted-foreground/60')}>
                  {tab.caption}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Mode Previews */}
        <div className="max-w-4xl mx-auto">
          {activeRuntimeMode === 'classic' && (
            <Card className="p-6 border-border shadow-md space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <span className="font-bold text-sm text-foreground">Classic Structured Business Form</span>
                  <p className="text-xs text-muted-foreground">Comprehensive fields on a single high-density layout.</p>
                </div>
                <Badge variant="outline" className="text-xs">Best for Detailed Quotes</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <label className="font-semibold block mb-1">Customer Full Name</label>
                  <Input placeholder="Sarah Mitchell" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border">
                  <label className="font-semibold block mb-1">Phone Number (SMS Verified)</label>
                  <Input placeholder="+44 7700 900077" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border sm:col-span-2">
                  <label className="font-semibold block mb-1">Required Service</label>
                  <Input placeholder="Boiler Repair & Diagnostic Inspection" readOnly className="h-8 text-xs bg-white dark:bg-slate-900" />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 font-medium">
                ↳ All fields captured in one place — ideal for contractors collecting full job specifications.
              </div>
            </Card>
          )}

          {activeRuntimeMode === 'card' && (
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
              <p className="text-[10px] text-muted-foreground">One question at a time — optimized for high mobile completion rates.</p>
            </Card>
          )}

          {activeRuntimeMode === 'split' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border shadow-md">
              <div className="p-6 bg-slate-900 text-white space-y-4 flex flex-col justify-center">
                <Badge className="bg-teal-500 text-slate-950 font-bold w-fit text-[10px]">Split Media Mode</Badge>
                <h3 className="text-xl font-bold">HVAC Emergency Replacement</h3>
                <p className="text-xs text-slate-300 leading-relaxed">24-hour certified engineer dispatch. Your details and urgency handled immediately.</p>
                <div className="pt-2 flex items-center gap-2 text-xs text-teal-300 font-semibold">
                  <Check className="size-3.5" /> Avg. 4.2 min response time
                </div>
              </div>
              <div className="p-6 bg-white dark:bg-slate-900 text-foreground space-y-4">
                <span className="text-xs font-semibold block text-muted-foreground">Select Your Urgent Need:</span>
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg border-2 border-teal-500 bg-teal-50/50 dark:bg-teal-950/40 font-semibold cursor-pointer">
                    No Heat / Frozen Boiler (Immediate)
                  </div>
                  <div className="p-3 rounded-lg border border-border font-medium text-muted-foreground hover:border-teal-300 transition cursor-pointer">
                    Routine Annual Service
                  </div>
                </div>
                <Button size="sm" className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs">Book Emergency Visit →</Button>
              </div>
            </div>
          )}

          {activeRuntimeMode === 'agent' && (
            <Card className="p-6 border-border shadow-md max-w-xl mx-auto space-y-4 text-xs">
              <div className="flex items-center gap-2 pb-2 border-b">
                <div className="size-7 rounded-full bg-teal-600 flex items-center justify-center">
                  <Bot className="size-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-foreground block text-sm">Fieseros AI Form Agent</span>
                  <span className="text-[10px] text-emerald-600 font-medium">● Online · Conversational Intake</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex gap-2">
                  <div className="size-6 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-teal-600" />
                  </div>
                  <div className="p-3 rounded-xl rounded-tl-sm bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 max-w-[80%]">
                    Hi Sarah! What service or appointment do you need today?
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="p-3 rounded-xl rounded-tr-sm bg-slate-100 dark:bg-slate-800 max-w-[75%] text-right font-medium">
                    I need a roof replacement quote for my home.
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="size-6 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="size-3.5 text-teal-600" />
                  </div>
                  <div className="p-3 rounded-xl rounded-tl-sm bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 max-w-[80%]">
                    Understood. I have pre-filled your scope and calculated the material rate. Would you like to confirm the booking for Wednesday at 10:00 AM?
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — AI FORM BUILDER: PROMPT → FORM IN SECONDS
      ═══════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">AI Synthesis Engine</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Start with a Sentence. Get a Working Form.
            </h2>
            <p className="text-sm text-muted-foreground">
              Describe your business workflow in natural language. GPTForm compiles the fields, math formulas, file upload constraints, and webhook automations automatically.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: 'Describe Requirements',
                step: '1',
                prompt: '"Create a residential cleaning quote with bedroom/bathroom counters and frequency discounts."',
                desc: 'GPTForm parses your prompt to extract field types, calculations, and validation rules.',
              },
              {
                title: 'AI Synthesizes Logic',
                step: '2',
                prompt: '✓ 9 Smart Fields ✓ Dynamic Price Formula ✓ Weekly / Bi-Weekly Discount Logic ✓ E-Signature',
                desc: 'Mathematical formulas and conditional branches are automatically generated and linked.',
              },
              {
                title: 'Ready to Publish',
                step: '3',
                prompt: 'Classic · Card · Split · AI Form Agent — All 4 runtime modes immediately generated.',
                desc: 'Embed on WordPress, Shopify, or any custom website with one line of code.',
              },
            ].map((col) => (
              <Card key={col.step} className="border-border bg-white dark:bg-slate-900 shadow-sm space-y-3 p-5">
                <div className="flex items-center justify-between">
                  <div className="size-7 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center">
                    {col.step}
                  </div>
                  <Badge variant="outline" className="text-[10px]">AI Pipeline</Badge>
                </div>
                <h3 className="font-bold text-sm text-foreground">{col.title}</h3>
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-xs font-mono text-teal-700 dark:text-teal-300 leading-relaxed border border-border/80">
                  {col.prompt}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{col.desc}</p>
              </Card>
            ))}
          </div>

          <div className="text-center pt-2">
            <Button
              type="button"
              onClick={() => handleTriggerAuthGate()}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 px-8 rounded-xl cursor-pointer"
            >
              <Sparkles className="size-4 mr-2" />
              Try AI Form Builder Free →
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — CANVA-STYLE TEMPLATE EXPLORER
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="templates" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            20,000+ Pre-Built Templates
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Template Explorer. Ready to Customize.
          </h2>
          <p className="text-sm text-muted-foreground">
            Explore industry-tested templates with pre-configured calculation formulas, photo markup, and instant checkout.
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search 20,000+ templates (e.g. Roofing, HVAC, Cleaning, Dental)..."
              value={templateSearchQuery}
              onChange={(e) => setTemplateSearchQuery(e.target.value)}
              className="pl-10 h-11 text-xs sm:text-sm rounded-xl border-border bg-background shadow-xs"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {TEMPLATE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer',
                selectedCategory === cat
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((tmpl) => (
            <Card
              key={tmpl.id}
              className="border-border hover:border-teal-400/60 transition shadow-xs hover:shadow-md flex flex-col justify-between"
            >
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', tmpl.badgeColor)}>
                    {tmpl.category}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">{tmpl.fieldsCount} smart fields</span>
                </div>
                <CardTitle className="text-base font-bold text-foreground">{tmpl.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{tmpl.desc}</CardDescription>
                <div className="flex flex-wrap gap-1 pt-1">
                  {tmpl.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardFooter className="pt-2 flex items-center justify-between gap-2 border-t border-border/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPreviewTemplateModal(tmpl)}
                  className="text-xs h-8 cursor-pointer"
                >
                  <Eye className="size-3 mr-1" />
                  Live Preview
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleTriggerAuthGate(`Create ${tmpl.title} with calculation formulas and direct payment.`)}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-8 gap-1 cursor-pointer"
                >
                  Use Template →
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center pt-2">
          <Button
            asChild
            variant="outline"
            className="rounded-xl px-8 text-xs font-semibold h-10 hover:border-teal-500 hover:text-teal-700"
          >
            <Link href="/templates">Browse All 20,000+ Free Templates →</Link>
          </Button>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — SMART CAPABILITIES (6 INTERACTIVE CARDS)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Engineered Capabilities</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              What Can a GPTForm™ Actually Do?
            </h2>
            <p className="text-sm text-slate-300">
              Unlike static forms, every GPTForm combines real-time calculation, AI triaging, evidence capture, and native payment processing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calculator,
                title: '🧮 Live Calculation Formulas',
                desc: 'Dynamic mathematical formulas calculate square footage, labor hours, pitch multipliers, and tier pricing as fields change.',
              },
              {
                icon: Camera,
                title: '📷 Photo & Document Capture',
                desc: 'Capture on-site photos, annotate damage spots, upload inspection PDFs, and record customer voice notes.',
              },
              {
                icon: Bot,
                title: '🧠 Conversational AI Understanding',
                desc: 'Natural language agent triages customer intent, asks clarifying questions, and pre-fills structured form fields.',
              },
              {
                icon: GitBranch,
                title: '🔀 Smart Conditional Branching',
                desc: 'Skip irrelevant sections dynamically based on previous answers, service tier, or emergency level.',
              },
              {
                icon: CalendarCheck,
                title: '📅 Live Calendar Booking',
                desc: 'Check technician availability in real time, apply travel buffer logic, and lock appointment slots on submission.',
              },
              {
                icon: CreditCard,
                title: '💳 0% Platform Fee Direct Checkout',
                desc: 'Collect deposits or full payments via Stripe, Apple Pay, or Google Pay directly into your merchant account.',
              },
            ].map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="p-6 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-3 hover:border-teal-500/60 transition shadow-sm"
                >
                  <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-300 w-fit">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-bold text-base text-white">{cap.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{cap.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7 — CONVERSATIONAL FORMS: CONVERSATION → STRUCTURED DATA
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Conversational AI Forms
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Let Customers Talk to the Form.
          </h2>
          <p className="text-base text-muted-foreground">
            Visitors can converse naturally with the AI Form Agent. Every reply converts instantly into structured, validated form data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Left Chat Sandbox */}
          <Card className="border-2 border-teal-500/40 shadow-lg flex flex-col justify-between bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
            <CardHeader className="p-4 bg-teal-50/80 dark:bg-teal-950/40 border-b flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-teal-950 dark:text-teal-200">Interactive AI Agent Sandbox</span>
              </div>
              <Badge variant="outline" className="text-[10px]">Live Demo</Badge>
            </CardHeader>
            <CardContent className="p-4 space-y-3 overflow-y-auto max-h-80 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={cn(
                    'flex gap-2',
                    msg.sender === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.sender === 'bot' && (
                    <div className="size-6 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="size-3.5" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'p-3 rounded-xl max-w-[80%] leading-relaxed',
                      msg.sender === 'bot'
                        ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-950 dark:text-teal-200 rounded-tl-xs border border-teal-200 dark:border-teal-800'
                        : 'bg-slate-900 text-white rounded-tr-xs'
                    )}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
            </CardContent>
            <form onSubmit={handleSendChatMessage} className="p-3 border-t flex gap-2 bg-slate-50 dark:bg-slate-800/60">
              <Input
                placeholder="Reply to the bot (e.g. 'Can I add debris removal?')..."
                value={chatInputText}
                onChange={(e) => setChatInputText(e.target.value)}
                className="text-xs h-9 bg-white dark:bg-slate-900"
              />
              <Button type="submit" size="sm" className="bg-teal-600 hover:bg-teal-700 text-white h-9 px-3">
                <Send className="size-3.5" />
              </Button>
            </form>
          </Card>

          {/* Right Structured Data Conversion Visual */}
          <Card className="border border-border shadow-md p-6 bg-slate-900 text-white rounded-2xl flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileCheck className="size-4 text-teal-400" />
                <span className="text-xs font-bold text-teal-300">AUTOMATIC STRUCTURED COMPILATION</span>
              </div>
              <h3 className="text-lg font-bold">Natural Chat → Validated Form Data</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                As the visitor chats, GPTForm extracts named entities, calculates prices, checks your appointment calendar, and populates the formal submission record.
              </p>
            </div>

            {/* Generated Field Table */}
            <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">Service:</span>
                <span className="text-teal-300 font-bold">Roof Replacement</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">Area Scope:</span>
                <span className="text-teal-300 font-bold">2,400 sq ft</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">Material Selected:</span>
                <span className="text-teal-300 font-bold">Architectural Metal</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span className="text-slate-400">Calculated Quote:</span>
                <span className="text-emerald-400 font-bold">£14,370.00</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Slot Reserved:</span>
                <span className="text-teal-300 font-bold">Tuesday 10:00 AM</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => handleTriggerAuthGate('AI Form Agent')}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-10 rounded-xl"
            >
              Deploy Your Own AI Form Agent Free →
            </Button>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8 — FROM SUBMISSION TO BUSINESS ACTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-3xl mx-auto">
            <Badge className="bg-teal-600 text-white text-xs">Fieseros Workflow Automation</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              A Form Shouldn&apos;t End at &quot;Submit&quot;
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every GPTForm™ submission connects directly into Fieseros Service OS — auto-creating leads, assigning crew schedules, and issuing invoices.
            </p>
          </div>

          {/* Interactive Pipeline Ribbon */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {WORKFLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              const isActive = activeWorkflowIndex === idx;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => setActiveWorkflowIndex(idx)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer border',
                    isActive
                      ? 'bg-teal-600 text-white border-teal-500 shadow-md ring-2 ring-teal-400/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                  )}
                >
                  <Icon className={cn('size-3.5', isActive ? 'text-white' : 'text-teal-400')} />
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Step Details Canvas */}
          <Card className="max-w-3xl mx-auto border-2 border-teal-500/40 bg-slate-800/90 text-white p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="size-8 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white text-xs">
                  {activeWorkflowIndex + 1}
                </div>
                <div>
                  <h3 className="text-base font-bold text-teal-300">
                    {WORKFLOW_STEPS[activeWorkflowIndex].title}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Stage: {WORKFLOW_STEPS[activeWorkflowIndex].label} · {WORKFLOW_STEPS[activeWorkflowIndex].actionLabel}
                  </p>
                </div>
              </div>
              <Badge className="bg-teal-600 text-white text-[10px]">Automated</Badge>
            </div>
            <p className="text-xs text-slate-200 leading-relaxed">
              {WORKFLOW_STEPS[activeWorkflowIndex].desc}
            </p>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 9 — PUBLISH ANYWHERE & WORDPRESS PLUGIN
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
            Embed your forms and conversational agents on WordPress, Shopify, Webflow, Squarespace, or custom React codebases.
          </p>
        </div>

        <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Code2 className="size-4 text-teal-400" />
              <span className="text-sm font-bold text-white">Embed Code Generator</span>
              <Badge className="bg-teal-600 text-white text-[9px] px-1.5">Universal</Badge>
            </div>
            <Button
              size="sm"
              onClick={handleCopyEmbedCode}
              className="bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs gap-1.5 h-8 cursor-pointer self-start sm:self-auto"
            >
              {copiedSnippet ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              <span>{copiedSnippet ? 'Copied!' : 'Copy Snippet'}</span>
            </Button>
          </div>

          {/* Tab Selector */}
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

          {/* Code Block */}
          <div className="rounded-xl overflow-hidden border border-slate-800">
            <div className="px-4 py-2 bg-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400">{embedNotes[activeEmbedTab]}</span>
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-red-500/60" />
                <div className="size-2.5 rounded-full bg-yellow-500/60" />
                <div className="size-2.5 rounded-full bg-green-500/60" />
              </div>
            </div>
            <div className="p-4 font-mono text-xs text-teal-300 overflow-x-auto leading-relaxed bg-slate-950 whitespace-pre">
              {embedSnippets[activeEmbedTab]}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 10 — DIRECT PAYMENTS WITH 0% PLATFORM COMMISSION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-teal-600 text-white text-xs">Direct Payments</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                0% Platform Commission.
                <span className="block text-teal-600">You Keep Every Penny.</span>
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connect your existing merchant account and collect customer deposits directly. Fieseros charges <strong>zero commission</strong> — you only pay standard gateway processing fees.
              </p>

              <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200">
                <p className="font-bold mb-1">💡 Real Savings Breakdown</p>
                At £50,000/year in client deposits, you save <strong>£2,500+</strong> compared to form builders that charge a 5% transaction uplift.
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-semibold text-foreground">
                {[
                  { icon: CreditCard, label: 'Stripe Checkout' },
                  { icon: Smartphone, label: 'Apple Pay & Google Pay' },
                  { icon: Zap, label: 'Square & PayPal' },
                  { icon: QrCode, label: 'Razorpay UPI & Cards' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="p-3 rounded-xl bg-white dark:bg-slate-800 border flex items-center gap-2.5 shadow-xs">
                    <Icon className="size-4 text-teal-600 shrink-0" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Checkout Card Mockup */}
            <Card className="border-2 border-teal-500/40 shadow-xl bg-slate-900 text-white p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-bold text-teal-400">Universal Payment Checkout</span>
                <span className="text-xs text-emerald-400 font-semibold">0% Platform Fee</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-800/90 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span>Roofing Replacement Deposit (20%)</span>
                  <span className="font-bold text-white">£450.00</span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Remaining balance due on completion</span>
                  <span>£850.00</span>
                </div>
                <div className="h-px bg-slate-700 my-1" />
                <div className="flex justify-between font-bold">
                  <span>Pay Now</span>
                  <span className="text-teal-300">£450.00</span>
                </div>
              </div>
              <Button
                onClick={() => handleTriggerAuthGate('Direct Payments')}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-10 font-bold cursor-pointer"
              >
                Pay £450.00 via Card / Apple Pay →
              </Button>
              <p className="text-center text-[10px] text-slate-500">Secured via 256-bit SSL encryption.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 11 — PRICING
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <Badge className="bg-teal-600 text-white text-xs">Simple Transparent Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Start Free. Upgrade As You Scale.
          </h2>
          <p className="text-sm text-muted-foreground">
            Get 3 forms and 100 free submissions every month at $0 — forever.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-3 mt-2">
            <div className="inline-flex items-center p-1 rounded-full bg-slate-200 dark:bg-slate-800 border border-border">
              <button
                type="button"
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer',
                  billingPeriod === 'monthly'
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs'
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
                    ? 'bg-white dark:bg-slate-900 text-foreground shadow-xs'
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
          {/* Free Tier */}
          <Card className="border-border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
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
                {['3 Active Smart Forms', '100 Submissions / month', '20,000+ Templates Library', 'Direct Payments (0% fee)', 'Universal 1-line Embed'].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="w-full text-xs font-semibold hover:border-teal-500 hover:text-teal-700">
                <Link href="/register?plan=free">Start Free Now</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Starter Tier — Recommended Dark Accent */}
          <Card className="border-2 border-teal-500 shadow-xl relative bg-slate-900 text-white flex flex-col justify-between">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-teal-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm">
              RECOMMENDED
            </div>
            <CardHeader className="space-y-1 pt-6">
              <CardTitle className="text-lg font-bold text-white">Starter</CardTitle>
              <CardDescription className="text-xs text-slate-400">For active businesses &amp; growing sites</CardDescription>
              <div className="pt-2 flex items-end gap-1">
                <span className="text-3xl font-extrabold text-teal-300">${getTierPrice(10)}</span>
                <span className="text-xs text-slate-400 pb-0.5"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <ul className="space-y-2 text-slate-200">
                {['10 Active Smart Forms', '1,000 Submissions / month', 'AI Form Synthesis & Logic', 'Dynamic Math Calculations', 'Digital E-Signatures & Booking'].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-3.5 text-teal-400 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold h-10 shadow-md">
                <Link href={`/register?plan=starter&interval=${billingPeriod}`}>Get Started (${getTierPrice(10)}/mo) →</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Business Tier */}
          <Card className="border-border bg-white dark:bg-slate-900 shadow-sm flex flex-col justify-between">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-bold">Business</CardTitle>
              <CardDescription className="text-xs">For multi-team organizations &amp; agencies</CardDescription>
              <div className="pt-2 flex items-end gap-1">
                <span className="text-3xl font-extrabold">${getTierPrice(19)}</span>
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
                <Link href={`/register?plan=business&interval=${billingPeriod}`}>Get Business (${getTierPrice(19)}/mo)</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* CRM Subscriber Perk Banner */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/40 border border-teal-200 dark:border-teal-800 max-w-2xl mx-auto flex items-start gap-3">
          <Sparkles className="size-5 text-teal-600 shrink-0 mt-0.5" />
          <div className="text-xs text-teal-950 dark:text-teal-200">
            <p className="font-bold mb-0.5">Active Fieseros CRM Subscriber?</p>
            <p className="text-teal-800/90 dark:text-teal-300/90">GPTForm™ Unlimited (Business tier features) is included in your CRM subscription at no extra charge.</p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 12 — FAQ & FINAL CALL-TO-ACTION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300">
            Frequently Asked Questions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">Everything You Need to Know</h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {[
            {
              q: 'How does the AI Form Generator work?',
              a: 'You simply describe what your form should do in plain English. GPTForm extracts fields, math calculations, validation logic, and styling rules in under 10 seconds. You can then edit or publish immediately.',
            },
            {
              q: 'What is an AI Form Agent?',
              a: 'An AI Form Agent transforms your form into a natural conversation. Visitors can chat, describe requirements, upload photos, and select dates while the bot validates the input and compiles structured form submissions.',
            },
            {
              q: 'Can customers make payments directly through the form?',
              a: 'Yes. Connect your Stripe, Apple Pay, Google Pay, Square, or Razorpay account. Fieseros charges 0% platform commission on transactions.',
            },
            {
              q: 'Can I embed GPTForm on my WordPress, Webflow, or Shopify site?',
              a: 'Yes. GPTForm provides ready shortcodes for WordPress, Liquid snippets for Shopify, HTML5 iframes for Webflow/Squarespace, and a dedicated React/Next.js package.',
            },
            {
              q: 'Can I use GPTForm without subscribing to the full Fieseros CRM?',
              a: 'Absolutely. GPTForm is available as a standalone product starting at $0/month. If you later choose to use Fieseros CRM, your forms sync seamlessly.',
            },
            {
              q: 'Is creating an account free to generate forms?',
              a: 'Yes! The Free plan gives you 3 active smart forms and 100 submissions per month with no credit card required.',
            },
          ].map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-xl px-4 bg-background">
              <AccordionTrigger className="text-sm font-semibold hover:text-teal-600 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Bottom Final CTA */}
      <section className="py-20 text-center bg-gradient-to-b from-teal-50/70 to-background dark:from-teal-950/20 dark:to-background border-t">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Build your first AI form in seconds.
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Get started free today with 100 submissions/month, 20,000+ templates, and conversational AI agents.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => handleTriggerAuthGate()}
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-11 px-8 rounded-xl cursor-pointer shadow-md"
            >
              <Sparkles className="size-4 mr-2" />
              Start Building Free →
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-xs h-11 px-8 rounded-xl hover:border-teal-500 hover:text-teal-700">
              <Link href="/templates">Browse 20,000+ Templates</Link>
            </Button>
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
              <DialogTitle className="text-lg font-bold">Sign In to Use AI Form Platform</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Sign up or log in to generate, customize, and publish your AI forms and conversational agents.
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border text-xs space-y-1">
            <span className="font-semibold text-teal-600 dark:text-teal-400 block text-[11px] uppercase tracking-wider">
              Your Form Description / Template:
            </span>
            <p className="text-slate-700 dark:text-slate-300 line-clamp-3 italic">
              &quot;{pendingPromptForAuth || demoPrompt}&quot;
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Button asChild className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs h-10 rounded-xl shadow-md cursor-pointer">
              <Link href={`/register?prompt=${encodeURIComponent(pendingPromptForAuth || demoPrompt)}`}>
                Create Free Account to Continue →
              </Link>
            </Button>
            <div className="text-center text-[11px] text-muted-foreground pt-1">
              <span>Already have an account? </span>
              <Link
                href={`/login?redirect=${encodeURIComponent(`/forms?prompt=${encodeURIComponent(pendingPromptForAuth || demoPrompt)}`)}`}
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

      {/* ─── Template Preview Modal ─── */}
      <Dialog open={!!previewTemplateModal} onOpenChange={(open) => !open && setPreviewTemplateModal(null)}>
        <DialogContent className="sm:max-w-lg p-6 bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-2xl">
          {previewTemplateModal && (
            <div className="space-y-4">
              <DialogHeader className="text-left space-y-1">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] text-teal-700 dark:text-teal-300 border-teal-300">
                    {previewTemplateModal.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{previewTemplateModal.fieldsCount} smart fields</span>
                </div>
                <DialogTitle className="text-base font-bold">{previewTemplateModal.title}</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {previewTemplateModal.desc}
                </DialogDescription>
              </DialogHeader>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border space-y-2 text-xs">
                <span className="font-bold text-foreground block">Included Smart Fields:</span>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-1.5"><Check className="size-3.5 text-teal-600" /> Customer &amp; address intake</li>
                  <li className="flex items-center gap-1.5"><Check className="size-3.5 text-teal-600" /> Dynamic price calculation formula</li>
                  <li className="flex items-center gap-1.5"><Check className="size-3.5 text-teal-600" /> Photo upload &amp; annotation field</li>
                  <li className="flex items-center gap-1.5"><Check className="size-3.5 text-teal-600" /> Digital e-signature &amp; Stripe checkout</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setPreviewTemplateModal(null)} className="text-xs h-9">
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const tmpl = previewTemplateModal;
                    setPreviewTemplateModal(null);
                    handleTriggerAuthGate(`Customize ${tmpl.title}`);
                  }}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 font-semibold"
                >
                  Use Template with AI →
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AiMarketingLayout>
  );
}
