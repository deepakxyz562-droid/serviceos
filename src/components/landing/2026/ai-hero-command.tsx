'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
  Bot,
  Calendar,
  User,
  Wrench,
  PoundSterling,
  MessageSquare,
  ShieldCheck,
  Zap,
  Clock,
  Terminal,
  PhoneCall,
  Smartphone,
  Sliders,
  CreditCard,
  Lock,
  Mic,
  Volume2,
  Check,
  FileCheck,
  Activity,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PromptPreset {
  id: string;
  label: string;
  prompt: string;
  trade: string;
  result: {
    customerName: string;
    jobTitle: string;
    timeSlot: string;
    technician: string;
    technicianRole: string;
    quoteAmount: string;
    notificationChannel: string;
  };
}

const HERO_PROMPTS: PromptPreset[] = [
  {
    id: 'boiler_repair',
    label: '🔧 Emergency Boiler Repair',
    prompt:
      'Create a boiler repair for Sarah Williams tomorrow at 10am, assign Mike, prepare a £350 quote and send confirmation.',
    trade: 'Plumbing & Heating',
    result: {
      customerName: 'Sarah Williams (48 King Road, London)',
      jobTitle: 'Emergency Combi-Boiler Pressure Diagnostic',
      timeSlot: 'Tomorrow · 10:00 AM – 11:30 AM',
      technician: 'Mike Vance',
      technicianRole: 'Gas Safe Registered · Tier 3 Engineer',
      quoteAmount: '£350.00 (Standard Diagnostic + Seal Kit)',
      notificationChannel: 'WhatsApp & SMS Confirmation Sent',
    },
  },
  {
    id: 'hvac_service',
    label: '❄️ Commercial HVAC Overhaul',
    prompt:
      'Schedule quarterly AC maintenance for Apex Towers on Friday 2pm, assign David with refrigeration cert, generate £850 invoice.',
    trade: 'HVAC & Refrigeration',
    result: {
      customerName: 'Apex Towers Management (Suite 400)',
      jobTitle: 'Quarterly Multi-Split VRV System Overhaul',
      timeSlot: 'This Friday · 02:00 PM – 05:00 PM',
      technician: 'David Miller',
      technicianRole: 'EPA Universal & Commercial HVAC Certified',
      quoteAmount: '£850.00 (Full 16-Unit Coil Sanitization)',
      notificationChannel: 'Client Portal Packet & SMS Dispatched',
    },
  },
  {
    id: 'roof_estimate',
    label: '🏗️ Roof Replacement Quote',
    prompt:
      'Build a roof estimate for James Thorne, 2400 sq ft architectural metal, schedule inspection for Thursday, request £500 deposit.',
    trade: 'Roofing & Exterior',
    result: {
      customerName: 'James Thorne (12 Oakridge Lane)',
      jobTitle: 'Architectural Standing Seam Roof Replacement',
      timeSlot: 'This Thursday · 09:00 AM – 10:30 AM',
      technician: 'Alex Rivera',
      technicianRole: 'Lead Roof Estimator & Drone Inspector',
      quoteAmount: '£14,160.00 (£500 Deposit Link Attached)',
      notificationChannel: 'E-Sign Quote & Deposit Link Sent',
    },
  },
];

export function AiHeroCommand({ onGetStarted }: { onGetStarted?: () => void }) {
  const [selectedPromptIndex, setSelectedPromptIndex] = useState(0);
  const [executionState, setExecutionState] = useState<'idle' | 'understanding' | 'executing' | 'done'>('done');
  const [activeStepIndex, setActiveStepIndex] = useState(5);
  const [activeCapabilityTab, setActiveCapabilityTab] = useState<'command' | 'dispatch' | 'voice' | 'pwa'>('command');

  const currentPreset = HERO_PROMPTS[selectedPromptIndex] || HERO_PROMPTS[0];

  const handleTriggerPrompt = (index: number) => {
    setSelectedPromptIndex(index);
    setExecutionState('understanding');
    setActiveStepIndex(0);

    setTimeout(() => {
      setExecutionState('executing');
      setActiveStepIndex(1);
    }, 300);

    setTimeout(() => setActiveStepIndex(2), 600);
    setTimeout(() => setActiveStepIndex(3), 900);
    setTimeout(() => setActiveStepIndex(4), 1200);
    setTimeout(() => {
      setActiveStepIndex(5);
      setExecutionState('done');
    }, 1500);
  };

  const stepsList = [
    { label: 'Customer Created', value: currentPreset.result.customerName, icon: User, color: 'text-cyan-400' },
    { label: 'Work Order Scheduled', value: `${currentPreset.result.jobTitle} (${currentPreset.result.timeSlot})`, icon: Calendar, color: 'text-teal-400' },
    { label: 'Technician Assigned', value: `${currentPreset.result.technician} — ${currentPreset.result.technicianRole}`, icon: Wrench, color: 'text-amber-400' },
    { label: 'Quote & Deposit Ready', value: currentPreset.result.quoteAmount, icon: PoundSterling, color: 'text-emerald-400' },
    { label: 'Omnichannel Sent', value: currentPreset.result.notificationChannel, icon: MessageSquare, color: 'text-emerald-400' },
  ];

  return (
    <div className="w-full space-y-12">
      {/* ─── Hero Value Headline & Eyebrow ─── */}
      <div className="text-center max-w-4xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs sm:text-sm font-semibold shadow-xs backdrop-blur-md">
          <Sparkles className="size-4 animate-pulse text-teal-600 dark:text-teal-400" />
          <span>THE AI OPERATING SYSTEM FOR SERVICE BUSINESSES</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.08]">
          Run your entire service business{' '}
          <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
            with a prompt.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
          Tell Fieseros what needs to happen. It creates the customer, schedules the job, assigns your team, prepares the quote, and keeps your revenue moving.
        </p>

        {/* Hero Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="h-13 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-emerald-950/20 dark:shadow-emerald-950/50 cursor-pointer gap-2 transition hover:scale-105"
          >
            Start Free →
          </Button>
          <a
            href="#how-it-works"
            className="h-13 px-7 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-200 dark:border-slate-700 text-sm font-semibold flex items-center gap-2 transition shadow-xs cursor-pointer"
          >
            <Play className="size-4 text-teal-600 dark:text-teal-400 fill-teal-600 dark:fill-teal-400" /> See How It Works
          </a>
        </div>

        {/* Micro-Trust Strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 dark:text-slate-400 pt-2 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-600 dark:text-emerald-400" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-teal-600 dark:text-teal-400" /> Set up in 5 minutes
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="size-4 text-amber-600 dark:text-amber-400" /> 0% platform transaction fee
          </span>
        </div>
      </div>

      {/* ─── LIVECHAT-INSPIRED CAPABILITY SWITCHER & INTERACTIVE STUDIO ─── */}
      <div className="space-y-4 max-w-5xl mx-auto">
        {/* Capability Selector Pills */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2">
          {[
            { id: 'command', label: '1. AI Command ⌘K', icon: Terminal, badge: 'Natural Language' },
            { id: 'dispatch', label: '2. Real-Time Dispatch', icon: Calendar, badge: 'Skills & Proximity' },
            { id: 'voice', label: '3. 24/7 AI Voice Phone', icon: PhoneCall, badge: 'Zero Missed Calls' },
            { id: 'pwa', label: '4. Field PWA & 0% Payments', icon: Smartphone, badge: 'Direct Payout' },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeCapabilityTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCapabilityTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer border shadow-xs',
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-500 shadow-md ring-2 ring-teal-500/20'
                    : 'bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                )}
              >
                <Icon className={cn('size-3.5', isActive ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400')} />
                <span>{tab.label}</span>
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-0.5',
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                )}>
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Studio Window Frame */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl overflow-hidden">
          {/* Studio Top Navigation Chrome */}
          <div className="bg-slate-100/90 dark:bg-slate-900/90 px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="size-3 rounded-full bg-rose-500/80" />
                <div className="size-3 rounded-full bg-amber-500/80" />
                <div className="size-3 rounded-full bg-emerald-500/80" />
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground font-mono ml-2">
                <Lock className="size-3 text-emerald-600" />
                <span>fieseros.com/command/ai-engine</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
                ● AI Engine Active
              </Badge>
              {onGetStarted && (
                <Button
                  size="sm"
                  onClick={onGetStarted}
                  className="bg-teal-600 hover:bg-teal-700 text-white text-xs h-7 px-3 rounded-lg font-semibold cursor-pointer"
                >
                  Try Live →
                </Button>
              )}
            </div>
          </div>

          {/* Studio Body Content Based on Selected Tab */}
          <div className="p-5 sm:p-7">
            {/* TAB 1: ⌘K Interactive Prompt Box */}
            {activeCapabilityTab === 'command' && (
              <div className="space-y-6">
                {/* Preset Selector Chips */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold uppercase tracking-wider text-[10px]">Try an Instant Business Prompt:</span>
                    <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">Click any prompt to execute ↓</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {HERO_PROMPTS.map((preset, idx) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleTriggerPrompt(idx)}
                        className={cn(
                          'px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border',
                          selectedPromptIndex === idx
                            ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 border-teal-500 shadow-md ring-2 ring-teal-500/30'
                            : 'bg-slate-100 text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-200/70 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Prompt Box */}
                <div className="relative rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-inner space-y-3">
                  <p className="text-[11px] uppercase tracking-wider font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="size-3.5" /> Natural Language Command
                  </p>
                  <p className="text-sm sm:text-base font-mono text-slate-900 dark:text-white leading-relaxed">
                    &quot;{currentPreset.prompt}&quot;
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Understands context, skills, calendars &amp; pricing</span>
                    <button
                      type="button"
                      onClick={() => handleTriggerPrompt(selectedPromptIndex)}
                      className="text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="size-3" /> Re-run
                    </button>
                  </div>
                </div>

                {/* Real-Time Execution Pipeline Result */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                      <span>Autonomous Execution Result</span>
                      {executionState === 'done' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                          ✓ All Actions Completed
                        </Badge>
                      ) : (
                        <Badge className="bg-amber-500/10 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                          ⏳ Executing Actions...
                        </Badge>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">0.4s Execution Speed</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {stepsList.map((step, idx) => {
                      const isCompleted = activeStepIndex >= idx + 1;
                      const IconComponent = step.icon;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3',
                            isCompleted
                              ? 'bg-slate-50 border-slate-200 dark:bg-slate-900/90 dark:border-slate-700/90 shadow-xs'
                              : 'bg-slate-100/40 border-slate-200/60 dark:bg-slate-950/40 dark:border-slate-900 opacity-40'
                          )}
                        >
                          <div
                            className={cn(
                              'size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                              isCompleted ? 'bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
                            )}
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <IconComponent className="size-4 text-slate-400 dark:text-slate-500" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                              {step.label}
                            </p>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {step.value}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Real-Time Dispatch & Scheduling */}
            {activeCapabilityTab === 'dispatch' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Live Engineer Schedule Board</h4>
                      <p className="text-[11px] text-muted-foreground">Skill, GPS &amp; Certification Match Engine</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                      3 Active Dispatches
                    </Badge>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    {[
                      {
                        tech: 'Mike Vance (Gas Safe #59201)',
                        job: 'Emergency Boiler Diagnostic',
                        time: '10:00 AM – 11:30 AM',
                        status: 'En Route (2.4 mi away)',
                        statusColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
                      },
                      {
                        tech: 'David Miller (EPA Universal)',
                        job: 'Quarterly Multi-Split VRV Overhaul',
                        time: '02:00 PM – 05:00 PM',
                        status: 'Scheduled & Confirmed',
                        statusColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300',
                      },
                      {
                        tech: 'Alex Rivera (Drone Roof Certified)',
                        job: 'Architectural Roof Estimate',
                        time: 'Thursday · 09:00 AM',
                        status: 'Inspection Locked',
                        statusColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
                      },
                    ].map((d, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border flex items-center justify-between">
                        <div className="space-y-1">
                          <p className="font-bold text-foreground">{d.tech}</p>
                          <p className="text-[11px] text-muted-foreground">{d.job} · <span className="font-semibold text-slate-700 dark:text-slate-300">{d.time}</span></p>
                        </div>
                        <span className={cn('text-[10px] px-2.5 py-1 rounded-full font-bold', d.statusColor)}>
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-teal-500/30 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Zap className="size-4 text-teal-600" />
                    <span className="font-bold text-foreground">AI Dispatch Logic</span>
                  </div>
                  <ul className="space-y-2 text-muted-foreground text-[11px]">
                    <li className="flex items-start gap-1.5">
                      <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>Auto-detects required certification (Gas Safe, EPA, NICEIC)</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>Optimizes technician driving route via live GPS</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <Check className="size-3.5 text-teal-600 shrink-0 mt-0.5" />
                      <span>Sends instant ETA SMS link to homeowner</span>
                    </li>
                  </ul>
                  <Button
                    size="sm"
                    onClick={onGetStarted}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 rounded-lg font-semibold"
                  >
                    Explore Scheduling Engine →
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 3: 24/7 AI Voice Phone Receptionist */}
            {activeCapabilityTab === 'voice' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-foreground">Live Call Handling &amp; Booking</span>
                    </div>
                    <Badge className="bg-emerald-600 text-white text-[10px]">Zero Missed Calls</Badge>
                  </div>

                  <div className="space-y-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-900 border border-border flex items-start gap-3">
                      <div className="size-7 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold shrink-0">
                        Caller
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-foreground">&quot;Hi, our boiler started leaking water across the floor! Can someone come out today?&quot;</p>
                        <p className="text-[10px] text-muted-foreground">Urgency detected: High (Leak)</p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 flex items-start gap-3">
                      <div className="size-7 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        AI
                      </div>
                      <div className="space-y-0.5">
                        <p className="font-semibold text-teal-950 dark:text-teal-200">
                          &quot;I understand, let's get that fixed. Mike Vance is near you and has an emergency opening at 2:30 PM today. Shall I book that slot?&quot;
                        </p>
                        <p className="text-[10px] text-teal-700 dark:text-teal-400 font-medium">Auto-crosschecked live calendar availability in 0.3s</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Call Transcript &amp; CRM Sync</span>
                    <Badge variant="outline" className="text-[10px] text-teal-600 border-teal-300">Logged</Badge>
                  </div>
                  <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-border space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Caller:</span>
                      <span className="font-semibold text-foreground">Sarah Williams</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Appointment:</span>
                      <span className="font-semibold text-teal-600">Today @ 2:30 PM</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Emergency Routing:</span>
                      <span className="font-semibold text-emerald-600">Dispatched to Mike</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={onGetStarted}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-9 rounded-lg font-semibold"
                  >
                    Activate AI Phone Number →
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 4: Field PWA & 0% Payments */}
            {activeCapabilityTab === 'pwa' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <span className="text-xs font-bold text-foreground">On-Site Mobile PWA &amp; E-Sign</span>
                    <Badge className="bg-emerald-600 text-white text-[10px]">0% Platform Commission</Badge>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-border space-y-3 text-xs">
                    <div className="flex justify-between font-semibold text-foreground">
                      <span>Emergency Boiler Diagnostic (#4829)</span>
                      <span>£350.00</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Fieseros Platform Commission</span>
                      <span className="text-emerald-600 font-bold">£0.00 (0% Take Rate)</span>
                    </div>
                    <div className="pt-2 border-t border-border flex justify-between font-bold text-foreground">
                      <span>Direct Merchant Payout</span>
                      <span className="text-teal-600">£350.00</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-dashed border-border flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <FileCheck className="size-4 text-teal-600" />
                      <span className="font-medium text-muted-foreground">Customer Signature Collected</span>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600">✓ Signed on Device</span>
                  </div>
                </div>

                <div className="lg:col-span-5 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/80 border border-emerald-500/30 space-y-3 text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-emerald-600" />
                    <span className="font-bold text-foreground">Instant Payment Collection</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Technicians take contactless card payments, Apple Pay, and deposits on-site. Payments land in your Stripe account directly.
                  </p>
                  <Button
                    size="sm"
                    onClick={onGetStarted}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 rounded-lg font-semibold"
                  >
                    Start Free Forever →
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
