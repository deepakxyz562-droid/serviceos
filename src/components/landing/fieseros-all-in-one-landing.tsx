'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Wrench,
  Snowflake,
  Zap,
  Sparkles,
  Leaf,
  Home,
  ShieldCheck,
  Hammer,
  Waves,
  ArrowRight,
  CheckCircle2,
  PhoneCall,
  MessageSquare,
  Calendar,
  Truck,
  CreditCard,
  Search,
  Bot,
  Play,
  Check,
  ChevronDown,
  Menu,
  X,
  Users,
  BarChart3,
  FileText,
  Star,
  MapPin,
  Clock,
  Send,
  Smartphone,
  Shield,
  HelpCircle,
  Globe,
} from 'lucide-react';
import { BrandLogo, BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface FieserosAllInOneLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
  onSelectPlan?: (planId: string) => void;
}

// ─── Trade List Data ──────────────────────────────────────────────────────────
const TRADES = [
  { name: 'Plumbing', icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
  { name: 'HVAC', icon: Snowflake, color: 'text-sky-600', bg: 'bg-sky-50 border-sky-100' },
  { name: 'Electrical', icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-100' },
  { name: 'Cleaning', icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
  { name: 'Landscaping', icon: Leaf, color: 'text-green-600', bg: 'bg-green-50 border-green-100' },
  { name: 'Roofing', icon: Home, color: 'text-rose-600', bg: 'bg-rose-50 border-rose-100' },
  { name: 'Pest Control', icon: ShieldCheck, color: 'text-teal-600', bg: 'bg-teal-50 border-teal-100' },
  { name: 'Handyman', icon: Hammer, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
  { name: 'Pool Services', icon: Waves, color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-100' },
];

// ─── Workflow Steps Data ──────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  {
    step: '1',
    title: 'Get the lead',
    desc: 'AI answers calls, chatbot or forms capture leads 24/7.',
    icon: PhoneCall,
  },
  {
    step: '2',
    title: 'Send a quote',
    desc: 'Create professional quotes with e-signature in seconds.',
    icon: FileText,
  },
  {
    step: '3',
    title: 'Schedule the job',
    desc: 'Find the best technician and time slot automatically.',
    icon: Calendar,
  },
  {
    step: '4',
    title: 'Dispatch & complete',
    desc: 'Track your team in real time with GPS and checklists.',
    icon: Truck,
  },
  {
    step: '5',
    title: 'Get paid',
    desc: 'Send invoices and accept online payments instantly.',
    icon: CreditCard,
  },
];

// ─── Feature Tabs Data ────────────────────────────────────────────────────────
const FEATURE_TABS = [
  { id: 'crm', label: 'CRM & Leads' },
  { id: 'dispatch', label: 'Scheduling & Dispatch' },
  { id: 'invoices', label: 'Quotes & Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'forms', label: 'Forms & Automation' },
  { id: 'reports', label: 'Reports' },
  { id: 'team', label: 'Team Management' },
] as const;

type FeatureTabId = (typeof FEATURE_TABS)[number]['id'];

// ─── CRM Sample Leads for Live Mockup ─────────────────────────────────────────
const CRM_SAMPLE_LEADS = [
  {
    id: '1',
    name: 'Sarah Johnson',
    service: 'Boiler Repair',
    source: 'Website',
    status: 'New',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    value: '$450',
    time: '2m ago',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=96&h=96&fit=crop&crop=faces',
  },
  {
    id: '2',
    name: 'Michael Chen',
    service: 'Plumbing',
    source: 'Google',
    status: 'Contacted',
    statusColor: 'bg-sky-50 text-sky-700 border-sky-200',
    value: '$620',
    time: '15m ago',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&crop=faces',
  },
  {
    id: '3',
    name: 'Emma Wilson',
    service: 'Electrical',
    source: 'Referral',
    status: 'Quoted',
    statusColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    value: '$1,200',
    time: '1h ago',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&fit=crop&crop=faces',
  },
  {
    id: '4',
    name: 'James White',
    service: 'Cleaning',
    source: 'Facebook',
    status: 'New',
    statusColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    value: '$380',
    time: '3h ago',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=96&h=96&fit=crop&crop=faces',
  },
  {
    id: '5',
    name: 'Olivia Brown',
    service: 'Landscaping',
    source: 'Website',
    status: 'Contacted',
    statusColor: 'bg-sky-50 text-sky-700 border-sky-200',
    value: '$950',
    time: '5h ago',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&crop=faces',
  },
];

export function FieserosAllInOneLanding({
  onGetStarted,
  onSignIn,
  onTryDemo,
  onSelectPlan,
}: FieserosAllInOneLandingProps) {
  const [billingCycle, setBillingCycle] = React.useState<'monthly' | 'yearly'>('monthly');
  const [activeFeatureTab, setActiveFeatureTab] = React.useState<FeatureTabId>('crm');
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [demoModalOpen, setDemoModalOpen] = React.useState(false);
  const [aiPromptInput, setAiPromptInput] = React.useState('');
  const [activeChatStep, setActiveChatStep] = React.useState(4);

  const handleWatchDemoClick = () => {
    if (onTryDemo) {
      onTryDemo();
    } else {
      setDemoModalOpen(true);
    }
  };

  const handleCtaClick = (planId?: string) => {
    if (planId && onSelectPlan) {
      onSelectPlan(planId);
    } else if (onGetStarted) {
      onGetStarted();
    } else {
      window.location.href = `/register${planId ? `?plan=${planId}` : ''}`;
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 font-sans antialiased selection:bg-emerald-100 selection:text-emerald-900">
      {/* ─── 1. STICKY HEADER / NAVBAR ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-100 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <BrandLogo size={34} textClassName="text-xl font-bold tracking-tight text-slate-900" />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-7 text-[14px] font-medium text-slate-600">
              <a href="#features" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
                Solutions <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#industries" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
                Industries <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#ai-assistant" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
                AI Features <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </a>
              <a href="#pricing" className="hover:text-emerald-600 transition-colors">
                Pricing
              </a>
              <a href="#mobile-app" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
                Resources <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </a>
            </nav>
          </div>

          {/* Right Action Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 rounded-md hover:bg-slate-50 transition-colors cursor-pointer">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>AU</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </div>

            <button
              onClick={onSignIn}
              className="text-sm font-semibold text-slate-700 hover:text-emerald-600 px-3 py-2 transition-colors"
            >
              Login
            </button>

            <button
              onClick={() => handleCtaClick('starter')}
              className="bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold px-5 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-1.5 group"
            >
              <span>Start Free – 100 Jobs</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-slate-100 px-5 pt-3 pb-6 space-y-3 shadow-lg animate-in slide-in-from-top-2">
            <a
              href="#features"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700"
            >
              Solutions
            </a>
            <a
              href="#industries"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700"
            >
              Industries
            </a>
            <a
              href="#ai-assistant"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700"
            >
              AI Features
            </a>
            <a
              href="#pricing"
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-base font-medium text-slate-700"
            >
              Pricing
            </a>
            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <Button
                variant="outline"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onSignIn?.();
                }}
                className="w-full justify-center"
              >
                Login
              </Button>
              <Button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleCtaClick('starter');
                }}
                className="w-full justify-center bg-[#059669] hover:bg-[#047857] text-white"
              >
                Start Free – 100 Jobs
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* ─── 2. HERO SECTION ─────────────────────────────────────────────────── */}
      <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden bg-gradient-to-b from-emerald-50/40 via-white to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column: Headline & Value Prop */}
            <div className="lg:col-span-6 space-y-6 text-left">
              {/* Pill Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/70 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>AI-Powered Field Service Platform</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.08]">
                Run your service business.{' '}
                <span className="text-[#059669] block sm:inline">Not the busywork.</span>
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                CRM, scheduling, dispatch, quotes, invoices, payments and AI employees — all in one platform.
                From the first enquiry to the final payment, Fieseros helps you win more jobs and grow your business.
              </p>

              {/* CTA Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <button
                  onClick={() => handleCtaClick('starter')}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-base px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Start Free – 100 Jobs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleWatchDemoClick}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-semibold text-base px-6 py-3.5 rounded-xl shadow-xs hover:border-slate-300 transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Watch Demo</span>
                </button>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs sm:text-sm font-medium text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Free AI chatbot included</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                  <span>Live in under 10 minutes</span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Graphic */}
            <div className="lg:col-span-6 relative">
              {/* Top-Right Handwritten Annotation */}
              <div className="absolute -top-10 -right-2 md:right-4 z-20 hidden sm:block">
                <Image
                  src="/images/landing/v2/annotation-call-to-cash.png"
                  alt="From call to cash. All in one place."
                  width={140}
                  height={80}
                  className="drop-shadow-xs rotate-[-2deg]"
                  priority
                />
              </div>

              {/* Main Collage Asset */}
              <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-xl hover:shadow-2xl transition-all">
                <Image
                  src="/images/landing/v2/hero-mockup-collage.png"
                  alt="Fieseros Platform Overview"
                  width={900}
                  height={650}
                  className="w-full h-auto object-cover"
                  priority
                />

                {/* Floating Quick Action Pills */}
                <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-4 flex flex-wrap items-center justify-center gap-2 bg-white/90 backdrop-blur-md p-2 rounded-xl border border-slate-200/60 shadow-md">
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer">
                    + Create job
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
                    ✉ Send quote
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer">
                    📅 Book appointment
                  </span>
                  <span className="text-xs text-slate-400 font-medium px-1 cursor-pointer hover:text-slate-600">
                    More...
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 3. TRADES / INDUSTRIES BAR ─────────────────────────────────────── */}
      <section id="industries" className="py-14 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Built for every service business
              </h2>
              <p className="text-sm sm:text-base text-slate-500 mt-1">
                Trusted by service businesses across Australia, US, UK and Canada.
              </p>
            </div>

            {/* Social Proof Badge */}
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/70">
              <div className="flex -space-x-2">
                <Image
                  src="/images/landing/v2/avatar-matt.png"
                  alt="Customer"
                  width={24}
                  height={24}
                  className="rounded-full border border-white"
                />
                <Image
                  src="/images/landing/v2/avatar-sarah.png"
                  alt="Customer"
                  width={24}
                  height={24}
                  className="rounded-full border border-white"
                />
                <Image
                  src="/images/landing/v2/avatar-james.png"
                  alt="Customer"
                  width={24}
                  height={24}
                  className="rounded-full border border-white"
                />
              </div>
              <span className="text-xs font-semibold text-slate-700">
                <strong className="text-emerald-700">10,000+</strong> service businesses already growing
              </span>
            </div>
          </div>

          {/* Trade Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-3">
            {TRADES.map((trade) => {
              const Icon = trade.icon;
              return (
                <div
                  key={trade.name}
                  className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-slate-200/70 bg-white hover:border-emerald-300 hover:shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer group text-center"
                >
                  <div
                    className={cn(
                      'w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 transition-transform group-hover:scale-105 border',
                      trade.bg
                    )}
                  >
                    <Icon className={cn('w-5 h-5', trade.color)} />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
                    {trade.name}
                  </span>
                </div>
              );
            })}

            {/* "And more trades" card */}
            <div className="flex flex-col items-center justify-center p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition-all cursor-pointer group text-center">
              <div className="w-11 h-11 rounded-lg flex items-center justify-center mb-2.5 bg-white border border-slate-200 text-slate-500 group-hover:text-emerald-600 transition-colors">
                <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
              <span className="text-xs font-semibold text-slate-700 group-hover:text-emerald-700 transition-colors">
                And more trades →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. WORKFLOW TIMELINE: FIRST ENQUIRY TO PAYMENT ─────────────────── */}
      <section className="py-20 bg-[#fafbfc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70">
              HOW IT WORKS
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              From first enquiry to final payment
            </h2>
            <p className="text-base text-slate-600">
              Fieseros connects every step of your workflow, so nothing falls through the cracks.
            </p>
          </div>

          {/* 5 Connected Steps Horizontal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
            {WORKFLOW_STEPS.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="relative flex flex-col items-center text-center group">
                  {/* Step Connector Line (Desktop) */}
                  {idx < WORKFLOW_STEPS.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-1/2 w-full h-[2px] border-t-2 border-dashed border-emerald-200 -z-0" />
                  )}

                  {/* Step Icon Badge */}
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-white border-2 border-emerald-500 shadow-sm flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-emerald-600 transition-all">
                    <Icon className="w-6 h-6 text-emerald-600 group-hover:text-white transition-colors" />
                    <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                      {step.step}
                    </span>
                  </div>

                  {/* Step Text */}
                  <h3 className="text-base font-bold text-slate-900 mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-[190px]">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 5. AI ASSISTANT / AI EMPLOYEE SPOTLIGHT ────────────────────────── */}
      <section id="ai-assistant" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Column: AI Value Proposition & Speech Quote */}
            <div className="lg:col-span-5 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>AI ASSISTANT</span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Turn one instruction into a complete workflow.
              </h2>

              <p className="text-base text-slate-600 leading-relaxed">
                Your team shouldn't spend the day jumping between customers, jobs, calendars, quotes, invoices and
                messages. Fieseros AI turns one simple instruction into an entire connected workflow.
              </p>

              {/* Speech Bubble Quote Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 shadow-xs flex items-start gap-3.5">
                <Image
                  src="/images/landing/v2/avatar-prompt-user.png"
                  alt="Technician prompt"
                  width={40}
                  height={40}
                  className="rounded-full shrink-0 border border-slate-200"
                />
                <div>
                  <p className="text-xs text-slate-500 font-semibold mb-1">Owner / Technician Instruction:</p>
                  <p className="text-sm text-slate-800 font-medium italic leading-snug">
                    “Sarah needs an emergency boiler repair tomorrow. Schedule Mike, create a £350 quote, and confirm
                    with her on WhatsApp.”
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleCtaClick('professional')}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                >
                  <span>Try AI Assistant</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right Column: Live AI Execution Simulation Card */}
            <div className="lg:col-span-7">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
                {/* Simulation Top Bar */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Fieseros AI Assistant</h4>
                      <p className="text-xs text-slate-400">Autonomous Business Engine</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                    Online
                  </span>
                </div>

                {/* Simulated Steps Checklist */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Found customer — Sarah Johnson</span>
                      <span className="text-xs text-slate-500">Existing contact · 12 Main St, London · +44 7911 123456</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Created quote — #Q-1048 (£350)</span>
                      <span className="text-xs text-slate-500">Boiler repair diagnostics + replacement sensor kit</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Scheduled job (Mike – Tomorrow, 9:00 AM)</span>
                      <span className="text-xs text-slate-500">Slot locked in schedule · GPS route updated</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100">
                    <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Sent WhatsApp confirmation</span>
                      <span className="text-xs text-slate-500">“Hi Sarah, Mike is confirmed for tomorrow 9 AM. View quote & tracking here.”</span>
                    </div>
                  </div>
                </div>

                {/* Interactive Simulated Prompt Input */}
                <div className="pt-2">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={aiPromptInput}
                      onChange={(e) => setAiPromptInput(e.target.value)}
                      placeholder="Ask anything... e.g. create job, send invoice, find leads..."
                      className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 bg-slate-50/50"
                    />
                    <button
                      onClick={() => {
                        if (!aiPromptInput) return;
                        setAiPromptInput('');
                      }}
                      className="absolute right-2 p-2 rounded-lg bg-[#059669] text-white hover:bg-[#047857] transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Capability Badges */}
                <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500 font-medium">
                  <span className="font-semibold text-slate-700">You can ask AI to:</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100">Create jobs</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100">Assign techs</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100">Quotes & invoices</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100">WhatsApp & SMS</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100">Check availability</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. DUAL AI: RECEPTIONIST & FREE CHATBOT ─────────────────────────── */}
      <section className="py-20 bg-[#fafbfc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Card 1: AI Receptionist */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <PhoneCall className="w-3 h-3 text-emerald-600" />
                  <span>AI RECEPTIONIST</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Never miss another call
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Let Fieseros AI handle incoming calls, qualify leads, answer questions, check availability and book
                  jobs automatically — even after hours.
                </p>

                <ul className="space-y-2.5 pt-2">
                  {[
                    'Answers calls 24/7 with human-like voice',
                    'Captures customer details & address',
                    'Checks team availability in real-time',
                    'Books jobs directly into your calendar',
                    'Sends instant confirmation to customer',
                    'Transfers urgent calls to your team when needed',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Phone Mockup Image */}
              <div className="pt-4 flex items-center justify-center">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg max-w-[240px]">
                  <Image
                    src="/images/landing/v2/ai-receptionist-phone.png"
                    alt="AI Receptionist Incoming Call"
                    width={260}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleCtaClick('professional')}
                  className="w-full sm:w-auto bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>See AI Receptionist</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 2: Free AI Chatbot */}
            <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70">
                  <MessageSquare className="w-3 h-3 text-emerald-600" />
                  <span>FREE AI CHATBOT</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  Turn website visitors into customers
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  Get a free AI chatbot to capture leads, answer questions, provide quotes and book jobs directly from
                  your website — at no extra cost.
                </p>

                <ul className="space-y-2.5 pt-2">
                  {[
                    'Answers customer questions instantly',
                    'Captures qualified leads & bookings',
                    'Works 24/7 on your website',
                    'Trained on your services, areas and pricing',
                    'Integrates natively with your CRM',
                    '100% free included with all plans',
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Chatbot Widget Preview Mockup */}
              <div className="pt-4 flex items-center justify-center">
                <div className="relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-lg max-w-[260px] bg-white">
                  <Image
                    src="/images/landing/v2/ai-chatbot-preview.png"
                    alt="AI Chatbot Preview"
                    width={280}
                    height={400}
                    className="w-full h-auto object-cover"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => handleCtaClick('starter')}
                  className="w-full sm:w-auto bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <span>See Chatbot in Action</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. POWERFUL FEATURES INTERACTIVE TABS ───────────────────────────── */}
      <section id="features" className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70">
              POWERFUL FEATURES
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Everything you need to run a modern service business
            </h2>
            <p className="text-base text-slate-600">
              All the tools in one place. No more jumping between apps.
            </p>
          </div>

          {/* Feature Tabs Switcher */}
          <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
            {FEATURE_TABS.map((tab) => {
              const active = activeFeatureTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveFeatureTab(tab.id)}
                  className={cn(
                    'px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap',
                    active
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Box */}
          <div className="rounded-2xl border border-slate-200 bg-[#fafbfc] p-6 lg:p-8 shadow-sm">
            {activeFeatureTab === 'crm' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                {/* Left: Tab Copy */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                    Win more jobs with a powerful CRM
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Capture leads from calls, forms, chat and messages. Keep all customer information in one place and
                    turn more enquiries into booked jobs.
                  </p>
                  <ul className="space-y-2.5">
                    {[
                      'Unified inbox (Email, SMS, WhatsApp, Chat)',
                      'Pipeline & lead scoring (Hot, Warm, Cold)',
                      'Customer 360° view with full service history',
                      'Automated follow-up reminders',
                    ].map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2 text-xs sm:text-sm font-medium text-slate-700">
                        <Check className="w-4 h-4 text-emerald-600 stroke-[3]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-2">
                    <button
                      onClick={() => handleCtaClick('starter')}
                      className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all flex items-center gap-2"
                    >
                      <span>Explore CRM</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Right: Live CRM Mockup Table */}
                <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                  {/* Table Header Controls */}
                  <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">Leads</span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold border border-emerald-200">
                        29 Active
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        placeholder="Search leads, customers..."
                        className="pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs w-full sm:w-48 bg-slate-50 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Filter Pills */}
                  <div className="px-4 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-semibold text-slate-600">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-600 text-white">New (12)</span>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      Contacted (8)
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      Quoted (5)
                    </span>
                    <span className="px-2.5 py-1 rounded-md bg-white border border-slate-200 hover:bg-slate-100 cursor-pointer">
                      Won (27)
                    </span>
                  </div>

                  {/* Leads Rows */}
                  <div className="divide-y divide-slate-100">
                    {CRM_SAMPLE_LEADS.map((lead) => (
                      <div
                        key={lead.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <img
                            src={lead.avatar}
                            alt={lead.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                          <div>
                            <span className="text-xs font-bold text-slate-900 block">{lead.name}</span>
                            <span className="text-[11px] text-slate-500">
                              {lead.service} · {lead.source}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-md border', lead.statusColor)}>
                            {lead.status}
                          </span>
                          <span className="text-xs font-bold text-slate-900">{lead.value}</span>
                          <span className="text-[11px] text-slate-400 hidden sm:inline">{lead.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Other tabs fallback view */}
            {activeFeatureTab !== 'crm' && (
              <div className="py-12 text-center space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  {activeFeatureTab === 'dispatch' && <Calendar className="w-7 h-7" />}
                  {activeFeatureTab === 'invoices' && <FileText className="w-7 h-7" />}
                  {activeFeatureTab === 'payments' && <CreditCard className="w-7 h-7" />}
                  {activeFeatureTab === 'forms' && <Sparkles className="w-7 h-7" />}
                  {activeFeatureTab === 'reports' && <BarChart3 className="w-7 h-7" />}
                  {activeFeatureTab === 'team' && <Users className="w-7 h-7" />}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 capitalize">
                  {FEATURE_TABS.find((t) => t.id === activeFeatureTab)?.label}
                </h3>
                <p className="text-sm text-slate-600 max-w-lg mx-auto">
                  Streamlined, high-performance module designed specifically for service contractors and field teams.
                </p>
                <button
                  onClick={() => handleCtaClick('starter')}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs sm:text-sm px-5 py-2.5 rounded-lg shadow-sm transition-all"
                >
                  Start Free Trial →
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── 8. MOBILE FIELD APP SECTION ────────────────────────────────────── */}
      <section id="mobile-app" className="py-20 bg-[#fafbfc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left: Technician + Phone Mockup Card */}
            <div className="lg:col-span-6 relative">
              <div className="rounded-2xl overflow-hidden border border-slate-200/80 bg-white shadow-xl">
                <Image
                  src="/images/landing/v2/mobile-app-card.png"
                  alt="Technician using Fieseros Mobile App"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>

            {/* Right: Copy + QR Code + App Store Badges */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-3">
                <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                  Mobile app for your field team
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Give your technicians everything they need on the go.
                </p>
              </div>

              {/* Feature Checklist */}
              <ul className="space-y-3">
                {[
                  'View and manage assigned jobs in real time',
                  'GPS tracking and turn-by-turn route optimization',
                  'Job checklists, equipment logs and technician notes',
                  'Capture before & after photos and customer signatures',
                  'Work offline with automatic background sync',
                  'Available natively on iOS, Android and PWA',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Action Buttons + QR Code Scanner Card */}
              <div className="pt-3 flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div>
                  <button
                    onClick={() => handleCtaClick('professional')}
                    className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm px-6 py-3 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                  >
                    <span>See Mobile App</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {/* QR Code + App Badges Card */}
                <div className="p-2.5 rounded-xl border border-slate-200 bg-white shadow-xs flex items-center gap-3">
                  <Image
                    src="/images/landing/v2/mobile-qr-badges.png"
                    alt="Scan to download Fieseros app"
                    width={100}
                    height={120}
                    className="w-20 h-auto"
                  />
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block">Get the mobile app</span>
                    <span className="text-[11px] text-slate-500 block mb-1">Scan to download</span>
                    <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      iOS & Android
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 9. REAL BUSINESSES TESTIMONIALS ─────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Real businesses. Real results.
            </h2>
            <p className="text-base text-slate-600">
              Start free and scale as you grow. No long-term contracts. Cancel anytime.
            </p>
          </div>

          {/* 3 Customer Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Testimonial 1 */}
            <div className="rounded-2xl border border-slate-200/90 bg-[#fafbfc] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5">
              <p className="text-sm text-slate-700 leading-relaxed italic">
                “Fieseros has saved us hours every week. The AI receptionist books jobs even when we're on the tools.”
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                <Image
                  src="/images/landing/v2/avatar-matt.png"
                  alt="Matt R."
                  width={40}
                  height={40}
                  className="rounded-full border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Matt R.</h4>
                  <p className="text-[11px] text-slate-500">Plumbing business, Sydney</p>
                  <div className="flex items-center text-amber-400 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="rounded-2xl border border-slate-200/90 bg-[#fafbfc] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5">
              <p className="text-sm text-slate-700 leading-relaxed italic">
                “Our scheduling and dispatch are finally organized. We save hours and our customers love the fast
                response.”
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                <Image
                  src="/images/landing/v2/avatar-sarah.png"
                  alt="Sarah L."
                  width={40}
                  height={40}
                  className="rounded-full border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Sarah L.</h4>
                  <p className="text-[11px] text-slate-500">HVAC business, Melbourne</p>
                  <div className="flex items-center text-amber-400 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="rounded-2xl border border-slate-200/90 bg-[#fafbfc] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5">
              <p className="text-sm text-slate-700 leading-relaxed italic">
                “Everything from quotes to invoices is in one place. So much easier for our team and our customers.”
              </p>
              <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60">
                <Image
                  src="/images/landing/v2/avatar-james.png"
                  alt="James T."
                  width={40}
                  height={40}
                  className="rounded-full border border-slate-200"
                />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">James T.</h4>
                  <p className="text-[11px] text-slate-500">Electrical business, Brisbane</p>
                  <div className="flex items-center text-amber-400 mt-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400" />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 10. TRANSPARENT PRICING SECTION ────────────────────────────────── */}
      <section id="pricing" className="py-20 bg-[#fafbfc]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Header */}
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200/70">
              SIMPLE, TRANSPARENT PRICING
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Start free and scale as you grow.
            </h2>
            <p className="text-base text-slate-600">
              No long-term contracts. Cancel anytime.
            </p>

            {/* Billing Toggle */}
            <div className="pt-4 flex items-center justify-center gap-3">
              <div className="bg-slate-200/70 p-1 rounded-full flex items-center">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-bold transition-all',
                    billingCycle === 'monthly' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5',
                    billingCycle === 'yearly' ? 'bg-[#059669] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  )}
                >
                  <span>Yearly</span>
                  <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded-full">Save 20%</span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Free CRM */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Free CRM</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">$0</span>
                    <span className="text-xs text-slate-500 font-medium">/forever</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>100 jobs included</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>100 form submissions</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Basic CRM features</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>1 user account</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('free')}
                className="w-full py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-2xs transition-all"
              >
                Get Started
              </button>
            </div>

            {/* Starter (Most Popular) */}
            <div className="relative rounded-2xl border-2 border-emerald-500 bg-white p-6 shadow-md flex flex-col justify-between space-y-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#059669] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Most Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Starter</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      ${billingCycle === 'yearly' ? '23' : '29'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-600">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Everything in Free</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Up to 5 users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Scheduling & Dispatch</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Quotes & Invoices</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Online payments</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>AI Assistant (basic)</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('starter')}
                className="w-full py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs shadow-xs transition-all"
              >
                Start Free Trial
              </button>
            </div>

            {/* Professional */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Professional</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      ${billingCycle === 'yearly' ? '63' : '79'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-600">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Everything in Starter</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Up to 10 users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Advanced automation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>AI Receptionist (50 min)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Advanced reporting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Mobile app for teams</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('professional')}
                className="w-full py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-2xs transition-all"
              >
                Start Free Trial
              </button>
            </div>

            {/* Business */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Business</h3>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900">
                      ${billingCycle === 'yearly' ? '119' : '149'}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">/month</span>
                  </div>
                </div>

                <ul className="space-y-2.5 pt-2 text-xs font-medium text-slate-600">
                  <li className="flex items-center gap-2 font-semibold text-slate-900">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Everything in Professional</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Up to 20 users</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>AI Receptionist (200 min)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    <span>Advanced permissions</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => handleCtaClick('business')}
                className="w-full py-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-semibold text-xs shadow-2xs transition-all"
              >
                Start Free Trial
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 11. BOTTOM HIGH-IMPACT CTA BANNER ──────────────────────────────── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-3xl bg-[#022c22] text-white p-8 sm:p-14 overflow-hidden shadow-2xl">
            {/* Background Radial Glow */}
            <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

            {/* Handwritten cursive annotation on the right */}
            <div className="absolute bottom-4 right-4 sm:bottom-8 sm:right-8 z-10 hidden md:block">
              <Image
                src="/images/landing/v2/annotation-more-jobs.png"
                alt="More jobs. Happier customers. A simpler business."
                width={170}
                height={70}
                className="drop-shadow-sm rotate-[1deg]"
              />
            </div>

            <div className="relative z-10 max-w-2xl space-y-6">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
                Ready to run a better service business?
              </h2>

              <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed">
                Join thousands of pros who trust Fieseros to manage their business.
              </p>

              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <button
                  onClick={() => handleCtaClick('starter')}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-semibold text-sm sm:text-base px-7 py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Start Free – 100 Jobs</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleWatchDemoClick}
                  className="bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm sm:text-base px-6 py-3.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                  <span>Watch Demo</span>
                </button>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-emerald-200/90 font-medium">
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Free AI chatbot included</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  <span>Live in under 10 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. COMPREHENSIVE FOOTER ────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-100 pt-16 pb-12 text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            {/* Col 1: Brand & Bio */}
            <div className="col-span-2 space-y-4">
              <BrandLogo size={32} textClassName="text-lg font-bold text-slate-900" />
              <p className="text-slate-500 text-xs max-w-sm leading-relaxed">
                The all-in-one AI field service platform. CRM, scheduling, quotes, dispatch, mobile app and AI
                receptionist built for modern service trade contractors.
              </p>
              <div className="pt-2 text-[11px] text-slate-400">
                © {new Date().getFullYear()} Fieseros Technologies. All rights reserved.
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Product</h4>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">CRM & Leads</a></li>
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Scheduling & Dispatch</a></li>
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Quotes & Invoices</a></li>
                <li><a href="#features" className="hover:text-emerald-600 transition-colors">Online Payments</a></li>
                <li><a href="#mobile-app" className="hover:text-emerald-600 transition-colors">Mobile Field App</a></li>
                <li><a href="#pricing" className="hover:text-emerald-600 transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Col 3: AI Employees */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">AI Employees</h4>
              <ul className="space-y-2">
                <li><a href="#ai-assistant" className="hover:text-emerald-600 transition-colors">AI Receptionist</a></li>
                <li><a href="#ai-assistant" className="hover:text-emerald-600 transition-colors">Free AI Chatbot</a></li>
                <li><a href="#ai-assistant" className="hover:text-emerald-600 transition-colors">AI Assistant</a></li>
                <li><a href="#ai-assistant" className="hover:text-emerald-600 transition-colors">Automated Dispatch</a></li>
                <li><a href="#ai-assistant" className="hover:text-emerald-600 transition-colors">WhatsApp & SMS Bot</a></li>
              </ul>
            </div>

            {/* Col 4: Industries */}
            <div className="space-y-3">
              <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">Industries</h4>
              <ul className="space-y-2">
                <li><a href="#industries" className="hover:text-emerald-600 transition-colors">Plumbing</a></li>
                <li><a href="#industries" className="hover:text-emerald-600 transition-colors">HVAC</a></li>
                <li><a href="#industries" className="hover:text-emerald-600 transition-colors">Electrical</a></li>
                <li><a href="#industries" className="hover:text-emerald-600 transition-colors">Cleaning</a></li>
                <li><a href="#industries" className="hover:text-emerald-600 transition-colors">Roofing</a></li>
                <li><a href="#industries" className="hover:text-emerald-600 transition-colors">Handyman</a></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── DEMO WALKTHROUGH MODAL ─────────────────────────────────────────── */}
      <Dialog open={demoModalOpen} onOpenChange={setDemoModalOpen}>
        <DialogContent className="max-w-2xl bg-white p-6 rounded-2xl">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BrandMark size={24} />
              <span>Experience Fieseros Interactive Demo</span>
            </DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Explore how Fieseros handles your calls, jobs, schedule, and invoices in seconds.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md w-fit">
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                Live Demo Environment Available
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                Click below to launch an instant pre-loaded workspace with live sample jobs, dispatch board, and AI
                voice simulator — no setup or sign up required.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDemoModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                setDemoModalOpen(false);
                if (onTryDemo) onTryDemo();
                else handleCtaClick('starter');
              }}
              className="bg-[#059669] hover:bg-[#047857] text-white"
            >
              Launch Live Workspace →
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FieserosAllInOneLanding;
