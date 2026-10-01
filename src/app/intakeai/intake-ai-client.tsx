'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  FileCheck2,
  Layers,
  MessageCircle,
  MousePointer2,
  Paperclip,
  PhoneCall,
  Play,
  Send,
  ShieldCheck,
  Sparkle,
  Wand2,
  X,
  Zap,
  ArrowRight,
  Store,
  ClipboardList,
  Lock,
  CreditCard,
  CheckCircle2,
  HelpCircle,
  Clock,
  Calendar,
  Camera,
  FileText,
  UserCheck,
  TrendingUp,
  Flame,
  Volume2,
  Radio,
  Sliders,
  Globe,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function IntakeAiClientView() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [activeUseCase, setActiveUseCase] = useState<'booking' | 'answering' | 'qualification' | 'photo' | 'recovery'>('booking');
  const [demoStep, setDemoStep] = useState<number>(0);

  const getTierPrice = (base: number) => {
    if (billingPeriod === 'yearly') {
      return (base * (10 / 12)).toFixed(2).replace(/\.00$/, '');
    }
    return base.toString();
  };

  const useCases = [
    {
      id: 'booking',
      title: 'Appointment Scheduling',
      icon: CalendarCheck,
      badge: 'Live Calendar Sync',
      headline: 'Turn conversations into confirmed bookings in under 60 seconds.',
      desc: 'IntakeAI checks live Google Calendar and Outlook slots, collects customer details, and books real appointments directly with instant SMS confirmations.',
      stats: '84% faster booking conversion',
      preview: {
        customer: 'I need someone to inspect my commercial AC unit this Thursday afternoon.',
        agent: 'I have two technician slots available for AC inspection this Thursday, Oct 3rd: 2:00 PM or 4:30 PM. Which works best?',
        action: 'Selected: Thursday @ 2:00 PM · Dispatched to Senior HVAC Tech',
        actionType: 'calendar',
      },
    },
    {
      id: 'answering',
      title: '24/7 After-Hours Answering',
      icon: PhoneCall,
      badge: 'Voice & Chat 24/7',
      headline: 'Never lose a high-value customer to voicemail or delayed replies.',
      desc: 'Our autonomous AI receptionist answers calls and chats immediately at 2 AM or on weekends, triages urgent emergencies, and dispatches on-call teams.',
      stats: '100% response rate in < 2 seconds',
      preview: {
        customer: 'My basement pipe just burst and water is flooding the floor! Need help now!',
        agent: '🚨 Emergency detected. Please shut off the main water valve immediately. I have alerted our on-call emergency technician, Marcus, who is 12 mins away.',
        action: 'Priority 1 Emergency Dispatched · Main valve shutoff guide sent via SMS',
        actionType: 'emergency',
      },
    },
    {
      id: 'qualification',
      title: 'Lead Qualification & Scoring',
      icon: Flame,
      badge: 'Hot / Warm / Cold',
      headline: 'Intelligently score every lead by budget, urgency, and project scope.',
      desc: 'IntakeAI asks targeted qualifying questions to filter high-ticket clients, extracts budget and timeline, and automatically tags leads for high-priority routing.',
      stats: '3.4x higher sales close rate',
      preview: {
        customer: 'Looking for a complete bathroom remodel for our master suite next month. Budget is around $25k.',
        agent: 'Excellent! A master suite remodel typically takes 7-10 business days. Let me gather your fixture preferences and schedule a design consultation.',
        action: 'Lead Tag: 🔥 HOT LEAD ($25,000 Budget) · High Priority Route',
        actionType: 'qualification',
      },
    },
    {
      id: 'photo',
      title: 'Photo & Document Triage',
      icon: Camera,
      badge: 'Multimodal Vision',
      headline: 'Collect damage photos, blueprints, and insurance docs seamlessly.',
      desc: 'Customers can upload photos of leaking pipes, damaged roofs, or electrical panels directly inside the conversational chat for instant diagnostic prep.',
      stats: '92% quote accuracy on first dispatch',
      preview: {
        customer: 'Here is a photo of the leaking valve under the sink.',
        agent: 'Thanks! I see a corroded 1/2-inch copper ball valve in the image. I have attached this diagnostic photo to technician job ticket #4821.',
        action: 'Vision Analyzed: Corroded copper shutoff · Part #V-502 staged',
        actionType: 'photo',
      },
    },
    {
      id: 'recovery',
      title: 'Abandoned Lead Recovery',
      icon: Zap,
      badge: 'Automated SMS Nudges',
      headline: 'Re-engage dropped-off prospects with timed multi-channel follow-ups.',
      desc: 'If a customer leaves without finishing their booking or quote, IntakeAI sends a polite SMS or WhatsApp follow-up 15 minutes later with their prefilled state.',
      stats: '28% recovered drop-off revenue',
      preview: {
        customer: '[User dropped off at step 3 of 4 without selecting a time slot]',
        agent: 'Hi Sarah! We noticed you started an inquiry for water heater replacement. Would you like us to hold tomorrow 10:00 AM slot for you?',
        action: 'SMS Nudge Triggered (+15m) · Customer replied "YES" and confirmed',
        actionType: 'recovery',
      },
    },
  ];

  const currentUseCaseData = useCases.find((u) => u.id === activeUseCase) || useCases[0];

  return (
    <>
      {/* ── SECTION 1: HERO ── */}
      <section id="top" className="relative pt-12 sm:pt-20 pb-16 sm:pb-24 overflow-hidden border-b border-border bg-gradient-to-b from-background via-emerald-500/[0.03] to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            
            {/* Left Column: Value Proposition */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-semibold tracking-wide">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                INTAKE AI · AUTONOMOUS CUSTOMER INTAKE & TRIAGE
              </div>

              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.08]">
                Turn Every Inbound Lead Into a{' '}
                <span className="text-emerald-600 underline decoration-emerald-500/30 decoration-wavy underline-offset-8">
                  Booked Customer
                </span>
              </h1>

              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-xl">
                IntakeAI is your 24/7 autonomous employee across Web Chat, Voice Calls, SMS, and WhatsApp. It interviews inbound leads, qualifies budgets, schedules calendar appointments, and collects payments in real time.
              </p>

              {/* CTAs */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3.5">
                <Button
                  asChild
                  size="lg"
                  className="h-12 px-7 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-lg shadow-emerald-600/20 rounded-xl"
                >
                  <Link href="/register?product=intakeai">
                    Deploy Your Intake AI Free <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 font-semibold text-sm rounded-xl cursor-pointer hover:bg-muted"
                >
                  <a href="#use-cases">Explore Live Use Cases</a>
                </Button>
              </div>

              {/* Trust Badges */}
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>24/7 Voice & Chat</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Live Calendar Sync</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Hot/Cold Lead Scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Multimodal Photo Vision</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>SMS Follow-Up Nudges</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>0% Platform Fees</span>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Intake Simulator */}
            <div className="lg:col-span-6">
              <div className="relative rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
                {/* Simulator Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-muted/60 border-b border-border">
                  <div className="flex items-center gap-2.5">
                    <div className="size-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      <Bot className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        HydroPlumbing 24/7 Intake AI
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      </p>
                      <p className="text-[10px] text-muted-foreground">Active on Web, Voice &amp; SMS</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600 bg-emerald-500/5">
                    Live Simulator
                  </Badge>
                </div>

                {/* Simulator Chat Stream */}
                <div className="p-4 space-y-3.5 min-h-[320px] max-h-[380px] overflow-y-auto bg-slate-50/50 dark:bg-slate-950/40 text-xs">
                  {/* Step 0: Welcome */}
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      AI
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-xs bg-card border border-border text-foreground shadow-2xs space-y-1">
                      <p>Hello! Welcome to <strong>HydroPlumbing &amp; Heating</strong>. I am your 24/7 Intake Specialist. How can I assist you today?</p>
                    </div>
                  </div>

                  {/* Step 1: User Request */}
                  <div className="flex gap-2.5 max-w-[85%] ml-auto justify-end">
                    <div className="p-3 rounded-2xl rounded-tr-xs bg-emerald-600 text-white shadow-2xs">
                      <p>My hot water tank started leaking this morning. Can you get someone out here today or tomorrow?</p>
                    </div>
                  </div>

                  {/* Step 2: AI Qualification & Photo Request */}
                  <div className="flex gap-2.5 max-w-[85%]">
                    <div className="size-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      AI
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-xs bg-card border border-border text-foreground shadow-2xs space-y-2">
                      <p>I can certainly help with that! Is the water actively pooling on the floor right now?</p>
                      <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2">
                        <Flame className="size-4 text-emerald-600 shrink-0" />
                        <span>Qualifying: Emergency vs Standard Replacement</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3: Interactive Dynamic Booking Slot Card */}
                  <div className="p-3.5 rounded-2xl border-2 border-emerald-500/40 bg-card shadow-sm space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                        <Calendar className="size-3.5 text-emerald-600" /> Available Technician Slots
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                        Live Availability
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDemoStep(1);
                          toast.success('Selected Today @ 3:30 PM (Marcus - Senior Tech)');
                        }}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer',
                          demoStep === 1
                            ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : 'border-border bg-muted/40 hover:border-emerald-500/50'
                        )}
                      >
                        <span className="font-bold text-[11px]">Today · 3:30 PM</span>
                        <span className="text-[10px] text-muted-foreground">Marcus (Emergency Tech)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDemoStep(2);
                          toast.success('Selected Tomorrow @ 9:00 AM (Standard Slot)');
                        }}
                        className={cn(
                          'p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 cursor-pointer',
                          demoStep === 2
                            ? 'border-emerald-600 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : 'border-border bg-muted/40 hover:border-emerald-500/50'
                        )}
                      >
                        <span className="font-bold text-[11px]">Tomorrow · 9:00 AM</span>
                        <span className="text-[10px] text-muted-foreground">David (Master Plumber)</span>
                      </button>
                    </div>

                    {demoStep > 0 && (
                      <div className="p-2 rounded-xl bg-emerald-600 text-white font-semibold text-[11px] flex items-center justify-between animate-fade-in">
                        <span className="flex items-center gap-1.5">
                          <Check className="size-3.5" /> Slot Reserved &amp; SMS Dispatch Alert Sent!
                        </span>
                        <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">Hot Lead</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Simulator Footer Input Bar */}
                <div className="p-3 bg-card border-t border-border flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground flex items-center justify-between">
                    <span>Describe your request or tap a slot...</span>
                    <Camera className="size-4 text-muted-foreground/60 cursor-pointer hover:text-foreground" />
                  </div>
                  <Button size="icon" className="size-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shrink-0">
                    <Send className="size-4" />
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SECTION 2: OMNICHANNEL CHANNELS BAR ── */}
      <section className="py-8 bg-muted/40 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold text-muted-foreground tracking-wider uppercase mb-6">
            Autonomous Intake Deployed Across Every Customer Touchpoint
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[
              { name: 'Phone Voice Calls', sub: 'Inbound & Outbound AI', icon: PhoneCall },
              { name: 'Website Chat Widget', sub: 'Instant floating popup', icon: MessageCircle },
              { name: 'SMS & Text Messaging', sub: 'Two-way lead capture', icon: Send },
              { name: 'WhatsApp Business', sub: 'Global messaging triage', icon: Globe },
              { name: 'Hosted Intake URLs', sub: 'Shareable bio links', icon: Share2 },
              { name: 'QR Code Stickers', sub: 'Truck & job site scan', icon: Sliders },
            ].map((ch) => {
              const Icon = ch.icon;
              return (
                <div key={ch.name} className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 transition shadow-2xs text-center space-y-1">
                  <div className="size-8 mx-auto rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-2">
                    <Icon className="size-4" />
                  </div>
                  <p className="font-bold text-xs text-foreground truncate">{ch.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{ch.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: 5 CORE CHATLEY USE CASES (Interactive Showcase) ── */}
      <section id="use-cases" className="py-16 sm:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-semibold">
              5 Flagship Intake Solutions
            </Badge>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Built for High-Converting Customer Intake
            </h2>
            <p className="text-base text-muted-foreground">
              Explore how IntakeAI automates the entire front-office customer journey from initial inquiry to booking and revenue recovery.
            </p>
          </div>

          {/* Use Case Tabs */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8">
            {useCases.map((uc) => {
              const Icon = uc.icon;
              const isActive = activeUseCase === uc.id;
              return (
                <button
                  key={uc.id}
                  type="button"
                  onClick={() => setActiveUseCase(uc.id as any)}
                  className={cn(
                    'px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer border',
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-card text-muted-foreground border-border hover:border-foreground/30 hover:text-foreground'
                  )}
                >
                  <Icon className="size-4" />
                  <span>{uc.title}</span>
                </button>
              );
            })}
          </div>

          {/* Active Use Case Deep Dive Card */}
          <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl">
            <div className="grid lg:grid-cols-12 gap-8 items-center">
              {/* Info Column */}
              <div className="lg:col-span-6 space-y-4">
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 bg-emerald-500/5 text-xs font-semibold">
                  {currentUseCaseData.badge}
                </Badge>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
                  {currentUseCaseData.headline}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {currentUseCaseData.desc}
                </p>

                <div className="pt-2 flex items-center gap-2 text-xs font-bold text-emerald-600">
                  <TrendingUp className="size-4" />
                  <span>{currentUseCaseData.stats}</span>
                </div>

                <div className="pt-4">
                  <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-5 rounded-xl cursor-pointer">
                    <Link href="/register?product=intakeai">
                      Deploy {currentUseCaseData.title} →
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Simulation Preview Column */}
              <div className="lg:col-span-6">
                <div className="rounded-2xl border border-border/80 bg-muted/30 p-5 space-y-4 shadow-xs">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground border-b border-border/60 pb-3">
                    <span>Live Conversation Simulation</span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="size-2 rounded-full bg-emerald-500" /> Active Agent
                    </span>
                  </div>

                  {/* Customer Msg */}
                  <div className="p-3 rounded-2xl rounded-tr-xs bg-emerald-600 text-white text-xs max-w-[90%] ml-auto shadow-2xs">
                    <p>{currentUseCaseData.preview.customer}</p>
                  </div>

                  {/* AI Response */}
                  <div className="p-3 rounded-2xl rounded-tl-xs bg-card border border-border text-foreground text-xs max-w-[90%] shadow-2xs space-y-1.5">
                    <p>{currentUseCaseData.preview.agent}</p>
                  </div>

                  {/* Action Pill */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                    <span>{currentUseCaseData.preview.action}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: INTEGRATION ECOSYSTEM ── */}
      <section className="py-16 bg-muted/20 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-semibold">
              Universal Integrations
            </Badge>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Syncs with Your Existing Stack in 60 Seconds
            </h2>
            <p className="text-sm text-muted-foreground">
              Direct two-way synchronization with calendars, CRMs, payment gateways, and notification webhooks.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {[
              { name: 'Google Calendar', type: 'Real-time Booking' },
              { name: 'Outlook 365', type: 'Schedule Sync' },
              { name: 'Stripe Payments', type: 'Upfront Deposits' },
              { name: 'Twilio Telephony', type: 'Voice & SMS' },
              { name: 'HubSpot CRM', type: 'Lead Sync' },
              { name: 'Zapier & Make', type: '5,000+ Apps' },
              { name: 'ServiceOS CRM', type: 'Native Field Ops' },
              { name: 'Slack Alerts', type: 'Instant Dispatch' },
              { name: 'WhatsApp Cloud', type: 'Global Messaging' },
              { name: 'Square POS', type: 'Card Payments' },
              { name: 'Mailchimp', type: 'Drip Email' },
              { name: 'Custom Webhooks', type: 'REST JSON Events' },
            ].map((item) => (
              <div key={item.name} className="p-3.5 rounded-xl border border-border/80 bg-card text-center space-y-1 shadow-2xs">
                <p className="font-bold text-xs text-foreground truncate">{item.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{item.type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: PRICING SECTION ── */}
      <section id="pricing" className="py-16 sm:py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mx-auto max-w-2xl mb-12 space-y-3">
            <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-semibold">
              Simple Transparent Pricing
            </Badge>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Start Free. Scale as Your Inbound Grows.
            </h2>
            <p className="text-base text-muted-foreground">
              Deploy your first Intake AI agent in 2 minutes. No credit card required.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="flex items-center justify-center gap-3 pt-4">
              <div className="inline-flex items-center p-1 rounded-full bg-muted border border-border">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer',
                    billingPeriod === 'monthly'
                      ? 'bg-background text-foreground shadow-xs'
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
                      ? 'bg-background text-foreground shadow-xs'
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

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Free Forever</h3>
                <p className="text-xs text-muted-foreground mt-0.5">For solopreneurs &amp; testing</p>
                <div className="pt-3 pb-1">
                  <span className="font-display text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground"> / forever</span>
                </div>
                <div className="my-5 h-px bg-border/60" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  {[
                    '1 Active Intake AI Agent',
                    '100 Inbound Conversations / month',
                    'Live Google & Outlook Booking',
                    'Photo & File Upload Collection',
                    'Universal 1-line Web Embed',
                    '0% Platform Transaction Fees',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0 font-bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-8 w-full text-xs font-semibold h-11 cursor-pointer rounded-xl hover:border-emerald-600 hover:text-emerald-600"
              >
                <Link href="/register?plan=free&product=intakeai">Start Free Now</Link>
              </Button>
            </div>

            {/* Starter Tier */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-500 bg-slate-900 text-white p-6 sm:p-7 shadow-xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm">
                MOST POPULAR
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-0.5">For active service businesses &amp; clinics</p>
                <div className="pt-3 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-emerald-300">${getTierPrice(10)}</span>
                  <span className="text-xs text-slate-400"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
                </div>
                <div className="my-5 h-px bg-slate-800" />
                <ul className="space-y-2.5 text-xs text-slate-200">
                  {[
                    '5 Active Intake AI Agents',
                    '1,000 Conversations / month',
                    'Hot / Warm / Cold Lead Scoring',
                    'Automated SMS Drop-off Follow-ups',
                    'Multimodal Photo Vision Analysis',
                    'Custom Branding & Hosted Links',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-400 shrink-0 font-bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                className="mt-8 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-11 cursor-pointer rounded-xl shadow-md"
              >
                <Link href={`/register?plan=starter&product=intakeai&interval=${billingPeriod}`}>
                  Get Started (${getTierPrice(10)}/mo) →
                </Link>
              </Button>
            </div>

            {/* Business Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 sm:p-7 shadow-xs">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Business</h3>
                <p className="text-xs text-muted-foreground mt-0.5">For high-volume teams &amp; multi-locations</p>
                <div className="pt-3 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-foreground">${getTierPrice(19)}</span>
                  <span className="text-xs text-muted-foreground"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
                </div>
                <div className="my-5 h-px bg-border/60" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  {[
                    'Unlimited Intake AI Agents',
                    '10,000 Conversations / month',
                    'Dedicated AI Voice Receptionist Phone #',
                    'Two-way WhatsApp & SMS Routing',
                    'Priority Webhook & CRM Sync',
                    'Custom AI Guardrails & White-labeling',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0 font-bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-8 w-full text-xs font-semibold h-11 cursor-pointer rounded-xl hover:border-emerald-600 hover:text-emerald-600"
              >
                <Link href={`/register?plan=business&product=intakeai&interval=${billingPeriod}`}>
                  Get Business (${getTierPrice(19)}/mo)
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: FAQ ACCORDION ── */}
      <section className="py-16 sm:py-24 bg-muted/30 border-t border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mx-auto mb-10 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              FREQUENTLY ASKED QUESTIONS
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything You Need to Know About IntakeAI
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {[
              {
                q: 'What makes IntakeAI different from a traditional chatbot?',
                a: 'Traditional chatbots follow rigid rule trees and fail when users ask natural questions. IntakeAI is an autonomous agent trained on your business knowledge that actively extracts structured lead data, verifies calendar availability, scores lead urgency (Hot/Warm/Cold), and takes real actions like scheduling and sending SMS follow-ups.',
              },
              {
                q: 'Can IntakeAI answer phone calls as an AI Voice Receptionist?',
                a: 'Yes! On the Business plan, you can connect a dedicated phone number (via Twilio/Vapi). IntakeAI answers inbound calls with natural ultra-low-latency voice audio, speaks with callers, and books slots directly into your calendar.',
              },
              {
                q: 'How does live calendar booking prevent double-bookings?',
                a: 'IntakeAI syncs directly with Google Calendar and Outlook 365 schedules in real time. It checks busy blocks and travel buffers before offering slots to the customer, ensuring zero scheduling conflicts.',
              },
              {
                q: 'How does Lead Scoring (Hot/Warm/Cold) work?',
                a: 'IntakeAI analyzes the customer budget, timeline urgency, and problem severity. If a customer has an active leak with a $3,000 budget, IntakeAI tags them as a 🔥 HOT LEAD and immediately sends a priority dispatch alert to your phone.',
              },
              {
                q: 'Can customers upload photos of their issue during chat?',
                a: 'Yes. Customers can take a photo of a broken valve, dented fender, or roof damage on mobile. IntakeAI securely stores the image, analyzes the diagnostic context, and attaches it to the technician work order.',
              },
              {
                q: 'How do automated abandoned lead follow-ups work?',
                a: 'If a visitor starts an inquiry but drops off before confirming a slot, IntakeAI triggers an automated SMS or WhatsApp nudge 15 minutes later with a 1-click link to complete their booking.',
              },
              {
                q: 'Does IntakeAI charge transaction fees on customer payments?',
                a: 'No! IntakeAI has 0% platform transaction fees. You connect your own Stripe or Square account and receive 100% of customer deposits directly.',
              },
              {
                q: 'How do I embed IntakeAI on my website?',
                a: 'You can embed IntakeAI in under 60 seconds with a single line of JavaScript snippet, a full-width responsive iframe, or share a dedicated hosted link (/intake/your-company) on Instagram, Google Business, or SMS.',
              },
            ].map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="rounded-xl border border-border bg-card px-4 shadow-2xs"
              >
                <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-4 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-4 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── SECTION 7: HIGH-IMPACT CLOSING CTA ── */}
      <section className="bg-emerald-700 py-16 sm:py-20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 size-80 rounded-full bg-emerald-500/30 blur-3xl pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center relative z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              START CONVERTING VISITORS 24/7
            </p>
            <h2 className="mt-2 max-w-2xl font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Turn your next inbound lead into a confirmed appointment.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-emerald-100 max-w-xl">
              Deploy your autonomous Intake AI agent in 60 seconds. Free forever tier included.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-sm h-12 px-6 rounded-xl cursor-pointer shadow-lg"
            >
              <Link href="/register?product=intakeai">
                Deploy Intake AI Free <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold text-sm h-12 px-6 rounded-xl cursor-pointer"
            >
              <Link href="/templates">Explore Templates</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
