'use client';

import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Bot,
  FileCheck2,
  Paperclip,
  Play,
  Send,
  Sparkle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const journeySteps = ['Invite', 'Conversation', 'Availability', 'Confirm', 'Prefilled form'];

export const scenarios = {
  Dental: {
    assistant: 'Mia',
    title: 'Book a dental appointment',
    greeting: 'Hi! I can help you find the right appointment. What do you need help with?',
    choice: 'Dental check-up',
    prompt: 'Create a dental appointment assistant with treatment, urgency, insurance and calendar booking.',
    fields: ['Patient details', 'Treatment & symptoms', 'Urgency', 'Preferred appointment', 'Insurance', 'Consent'],
  },
  Roofing: {
    assistant: 'Alex',
    title: 'Request a roof inspection',
    greeting: 'Tell me what is happening with your roof and I’ll arrange the right inspection.',
    choice: 'Active roof leak',
    prompt: 'Create a roofing inspection flow with damage photos, urgency, estimate and booking.',
    fields: ['Customer details', 'Property address', 'Roof issue', 'Damage photos', 'Estimate', 'Inspection booking'],
  },
  HVAC: {
    assistant: 'Sam',
    title: 'Book an HVAC visit',
    greeting: 'I can help diagnose the issue and find a suitable service visit.',
    choice: 'No heating',
    prompt: 'Create an HVAC diagnostic assistant with equipment details, urgency and technician booking.',
    fields: ['Customer details', 'Equipment', 'Symptoms', 'Urgency', 'Service area', 'Technician visit'],
  },
  Cleaning: {
    assistant: 'Nina',
    title: 'Get a cleaning quote',
    greeting: 'I’ll build your cleaning quote and find an available date.',
    choice: 'Regular home clean',
    prompt: 'Create a cleaning quote with room count, property size, frequency, add-ons and booking.',
    fields: ['Customer details', 'Property size', 'Rooms', 'Frequency', 'Add-ons', 'Cleaning date'],
  },
};

export type ScenarioName = keyof typeof scenarios;

export function DemoWidget({ step, scenario }: { step: number; scenario: ScenarioName }) {
  const data = scenarios[scenario];
  return (
    <div className="relative min-h-[470px] overflow-hidden rounded-xl border border-border bg-surface-soft p-4 sm:p-7 shadow-sm">
      {/* Top Browser Bar */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <div className="size-2.5 rounded-full bg-red-400/80" />
          <div className="size-2.5 rounded-full bg-amber-400/80" />
          <div className="size-2.5 rounded-full bg-emerald-400/80" />
          <div className="ml-2 h-2.5 w-20 rounded-full bg-border" />
        </div>
        <div className="flex gap-2">
          <div className="h-2.5 w-10 rounded-full bg-border" />
          <div className="h-2.5 w-10 rounded-full bg-border" />
        </div>
      </div>

      {/* Placeholder Website Background */}
      <div className="mt-6 space-y-3 opacity-60">
        <div className="h-3 w-2/3 rounded-full bg-border" />
        <div className="h-3 w-1/2 rounded-full bg-border" />
        <div className="h-3 w-2/5 rounded-full bg-border" />
      </div>

      {step === 0 ? (
        <div className="absolute bottom-5 right-4 flex items-end gap-3 animate-fade-in sm:bottom-8 sm:right-7">
          <div className="max-w-[240px] rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold shadow-xl">
            Need to {scenario === 'Dental' ? 'book a dental appointment' : 'get started'}? Chat with {data.assistant}.
          </div>
          <div className="grid size-12 place-items-center rounded-full bg-ai text-ai-foreground shadow-lg animate-bounce">
            <Sparkle className="size-5" />
          </div>
        </div>
      ) : (
        <div className="absolute inset-x-3 bottom-3 top-20 ml-auto flex max-w-[380px] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl animate-scale-in sm:inset-x-auto sm:right-6 sm:w-[380px]">
          {/* Widget Header */}
          <div className="flex items-center gap-3 bg-emerald-600 px-4 py-3.5 text-white">
            <div className="grid size-9 place-items-center rounded-full bg-white/20">
              <Bot className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold leading-none">{data.assistant}</p>
              <p className="text-xs text-emerald-100 opacity-90 mt-0.5">GPTForm AI Assistant</p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium bg-emerald-700/60 px-2 py-0.5 rounded-full">
              <span className="size-1.5 rounded-full bg-emerald-300 animate-pulse" /> Live
            </span>
          </div>

          {/* Widget Body */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{data.title}</p>
            <div className="max-w-[88%] rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm leading-relaxed text-foreground">
              {data.greeting}
            </div>

            {step >= 2 && (
              <div className="ml-auto rounded-2xl rounded-tr-sm bg-emerald-600 px-3.5 py-2 text-sm text-white font-medium shadow-xs">
                {data.choice}
              </div>
            )}

            {step === 2 && (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground py-1">
                <span className="thinking-dots text-emerald-600"><i /><i /><i /></span> Checking available schedule slots
              </div>
            )}

            {step >= 3 && (
              <div className="space-y-2 animate-fade-in">
                <div className="rounded-2xl rounded-tl-sm bg-muted px-3.5 py-2.5 text-sm text-foreground">
                  Tuesday at 10:30 AM is available with Dr. Mitchell. Does that work for you?
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full border border-emerald-500 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
                    ✓ Tuesday 10:30 AM
                  </span>
                  <span className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted cursor-pointer">
                    Tuesday 2:00 PM
                  </span>
                </div>
              </div>
            )}

            {step >= 4 && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3.5 animate-fade-in">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold text-emerald-800 dark:text-emerald-300">
                  <FileCheck2 className="size-4 text-emerald-600" />
                  Appointment Form Pre-Filled
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Service:</span>
                  <b className="text-foreground">{data.choice}</b>
                  <span>Confirmed Date:</span>
                  <b className="text-foreground">Tuesday, 10:30 AM</b>
                </div>
                <Button className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 cursor-pointer" size="sm">
                  Complete Booking <ArrowRight className="size-3.5 ml-1" />
                </Button>
              </div>
            )}
          </div>

          {/* Widget Footer */}
          <div className="border-t border-border p-3 bg-card">
            <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <Paperclip className="size-4 opacity-70" />
              <span className="flex-1">Ask anything or type details...</span>
              <span className="grid size-7 place-items-center rounded-full bg-primary text-primary-foreground">
                <Send className="size-3.5" />
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="absolute bottom-5 left-5 grid size-10 place-items-center rounded-full bg-ai text-ai-foreground shadow-md">
        <Sparkle className="size-4" />
      </div>
    </div>
  );
}

export function HeroDemo() {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      setStep((val) => (val + 1) % journeySteps.length);
    }, 2400);
    return () => window.clearInterval(timer);
  }, [playing]);

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>LIVE PRODUCT WALKTHROUGH</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer"
          onClick={() => setPlaying((val) => !val)}
        >
          {playing ? 'Pause Tour' : 'Resume Tour'}
          <Play className={cn('size-3.5 fill-current', playing && 'opacity-50')} />
        </Button>
      </div>

      <DemoWidget step={step} scenario="Dental" />

      {/* Stepper Tabs */}
      <div className="mt-4 grid grid-cols-5 gap-1.5">
        {journeySteps.map((label, index) => (
          <button
            key={label}
            onClick={() => {
              setStep(index);
              setPlaying(false);
            }}
            className={cn(
              'min-w-0 border-t-2 pt-2 text-left text-[11px] font-semibold transition-all cursor-pointer',
              index <= step
                ? 'border-emerald-600 text-foreground'
                : 'border-border text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="hidden sm:inline opacity-60">0{index + 1} </span>
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
