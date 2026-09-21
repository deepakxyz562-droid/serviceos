'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  const currentPreset = HERO_PROMPTS[selectedPromptIndex] || HERO_PROMPTS[0];

  const handleTriggerPrompt = (index: number) => {
    setSelectedPromptIndex(index);
    setExecutionState('understanding');
    setActiveStepIndex(0);

    // Progressive execution sequence
    setTimeout(() => {
      setExecutionState('executing');
      setActiveStepIndex(1);
    }, 400);

    setTimeout(() => setActiveStepIndex(2), 800);
    setTimeout(() => setActiveStepIndex(3), 1200);
    setTimeout(() => setActiveStepIndex(4), 1600);
    setTimeout(() => {
      setActiveStepIndex(5);
      setExecutionState('done');
    }, 2000);
  };

  const stepsList = [
    { label: 'Customer Created', value: currentPreset.result.customerName, icon: User, color: 'text-blue-400' },
    { label: 'Work Order Scheduled', value: `${currentPreset.result.jobTitle} (${currentPreset.result.timeSlot})`, icon: Calendar, color: 'text-teal-400' },
    { label: 'Technician Assigned', value: `${currentPreset.result.technician} — ${currentPreset.result.technicianRole}`, icon: Wrench, color: 'text-amber-400' },
    { label: 'Quote & Deposit Ready', value: currentPreset.result.quoteAmount, icon: PoundSterling, color: 'text-emerald-400' },
    { label: 'Omnichannel Sent', value: currentPreset.result.notificationChannel, icon: MessageSquare, color: 'text-indigo-400' },
  ];

  return (
    <div className="w-full space-y-10">
      {/* ─── Hero Value Headline & Eyebrow ─── */}
      <div className="text-center max-w-4xl mx-auto space-y-5">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs sm:text-sm font-semibold shadow-sm backdrop-blur-md">
          <Sparkles className="size-4 animate-pulse text-teal-400" />
          <span>THE AI OPERATING SYSTEM FOR SERVICE BUSINESSES</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.08]">
          Run your entire service business{' '}
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
            with a prompt.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-300 leading-relaxed max-w-2xl mx-auto font-normal">
          Tell Fieseros what needs to happen. It creates the customer, schedules the job, assigns your team, prepares the quote, and keeps your revenue moving.
        </p>

        {/* Hero Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
          <Button
            size="lg"
            onClick={onGetStarted}
            className="h-13 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-emerald-950/50 cursor-pointer gap-2 transition hover:scale-105"
          >
            Start Free →
          </Button>
          <a
            href="#how-it-works"
            className="h-13 px-7 rounded-2xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center gap-2 transition"
          >
            <Play className="size-4 text-teal-400 fill-teal-400" /> See How It Works
          </a>
        </div>

        {/* Micro-Trust Strip */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 pt-2 font-medium">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-emerald-400" /> No credit card required
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="size-4 text-teal-400" /> Set up in 5 minutes
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="size-4 text-amber-400" /> 0% platform transaction fee
          </span>
        </div>
      </div>

      {/* ─── Hero Visual: Interactive AI Command ⌘K Execution Interface ─── */}
      <div className="max-w-4xl mx-auto rounded-3xl border border-slate-700/80 bg-slate-950 shadow-2xl shadow-teal-950/40 overflow-hidden">
        {/* Window Top Accent Bar */}
        <div className="bg-slate-900/90 px-4 sm:px-6 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-full bg-rose-500/80" />
            <div className="size-3 rounded-full bg-amber-500/80" />
            <div className="size-3 rounded-full bg-emerald-500/80" />
            <span className="text-xs font-mono font-bold text-slate-400 ml-2 flex items-center gap-1.5">
              <Terminal className="size-3.5 text-teal-400" /> Fieseros Command ⌘K
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30 bg-emerald-500/10">
              ● AI Engine Active
            </Badge>
          </div>
        </div>

        {/* ⌘K Interactive Prompt Box */}
        <div className="p-5 sm:p-7 space-y-6">
          {/* Preset Selector Chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Try an Instant Business Prompt:</span>
              <span className="text-[11px] text-teal-400">Click any prompt to execute ↓</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {HERO_PROMPTS.map((preset, idx) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleTriggerPrompt(idx)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedPromptIndex === idx
                      ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md ring-2 ring-teal-500/30'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Active Prompt Box */}
          <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-4 sm:p-5 shadow-inner space-y-3">
            <p className="text-[11px] uppercase tracking-wider font-bold text-teal-400 flex items-center gap-1.5">
              <Sparkles className="size-3.5" /> Natural Language Command
            </p>
            <p className="text-sm sm:text-base font-mono text-white leading-relaxed">
              "{currentPreset.prompt}"
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-[11px] text-slate-400">
              <span>Understands context, skills, calendars &amp; pricing</span>
              <button
                type="button"
                onClick={() => handleTriggerPrompt(selectedPromptIndex)}
                className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="size-3" /> Re-run
              </button>
            </div>
          </div>

          {/* ─── Real-Time Execution Pipeline Result ─── */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <span>Autonomous Execution Result</span>
                {executionState === 'done' ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ All Actions Completed
                  </Badge>
                ) : (
                  <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold animate-pulse">
                    ⏳ Executing Actions...
                  </Badge>
                )}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">0.4s Execution Speed</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stepsList.map((step, idx) => {
                const isCompleted = activeStepIndex >= idx + 1;
                const IconComponent = step.icon;

                return (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-start gap-3 ${
                      isCompleted
                        ? 'bg-slate-900/90 border-slate-700/90 shadow-sm'
                        : 'bg-slate-950/40 border-slate-900 opacity-40'
                    }`}
                  >
                    <div
                      className={`size-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isCompleted ? 'bg-slate-800 text-white' : 'bg-slate-900 text-slate-600'
                      }`}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="size-4 text-emerald-400" />
                      ) : (
                        <IconComponent className="size-4 text-slate-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        {step.label}
                      </p>
                      <p className="text-xs font-semibold text-slate-100 truncate">
                        {step.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
