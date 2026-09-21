'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  FileInput,
  Users,
  CalendarCheck,
  Calculator,
  DollarSign,
  Send,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const PIPELINE_STEPS = [
  {
    step: '01',
    name: 'Conversation',
    desc: 'AI Assistant engages visitor on your website, answers FAQs, and collects qualification answers naturally.',
    icon: MessageSquare,
  },
  {
    step: '02',
    name: 'Smart Form',
    desc: 'Pre-filled smart form captures verified contact info, photo evidence, and digital signatures without retyping.',
    icon: FileInput,
  },
  {
    step: '03',
    name: 'Lead Capture',
    desc: 'AI structures the enquiry, validates phone & email, geocodes the address, and organizes the record.',
    icon: Users,
  },
  {
    step: '04',
    name: 'Calendar Lock',
    desc: 'Appointment slot is locked in real time with Google Calendar, Outlook, or CRM schedule availability.',
    icon: CalendarCheck,
  },
  {
    step: '05',
    name: 'Instant Quote',
    desc: 'Dynamic formula calculates materials, labor hours, and optional tiered upgrades for customer sign-off.',
    icon: Calculator,
  },
  {
    step: '06',
    name: '0% Fee Payment',
    desc: 'Deposit or invoice paid securely via your connected Stripe account with 0% Fieseros platform fee.',
    icon: DollarSign,
  },
  {
    step: '07',
    name: 'Automate & Sync',
    desc: 'Instant email/SMS confirmations sent to customer, with real-time webhook sync to Zapier, your CRM, or Fieseros.',
    icon: Send,
  },
];

export function ConnectedPipeline() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="integrations" className="section-pad bg-slate-950 text-white relative overflow-hidden">
      <div className="page-shell">
        <div className="section-heading text-white max-w-3xl mb-12">
          <div className="flex items-center gap-2">
            <p className="eyebrow text-emerald-400 font-bold">CONNECTED WORKFLOW PIPELINE</p>
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
              Works with Any Website
            </Badge>
          </div>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight">
            A submission should never disappear into a static inbox.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300">
            Keep customer data moving seamlessly from the very first website chat interaction to verified quotes, calendar slots, Stripe payments, and instant CRM webhooks.
          </p>
        </div>

        {/* Horizontal Pipeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {PIPELINE_STEPS.map((item, index) => {
            const Icon = item.icon;
            const isCurrent = activeStep === index;
            return (
              <div
                key={item.name}
                onClick={() => setActiveStep(index)}
                className={cn(
                  'flex flex-col justify-between rounded-xl border p-4 transition-all duration-300 cursor-pointer min-h-[140px]',
                  isCurrent
                    ? 'border-emerald-400 bg-emerald-500/10 text-white shadow-md'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/30 hover:bg-white/10'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('text-xs font-mono font-bold', isCurrent ? 'text-emerald-400' : 'text-slate-400')}>
                    {item.step}
                  </span>
                  <Icon className={cn('size-4', isCurrent ? 'text-emerald-400' : 'opacity-60')} />
                </div>
                <div className="mt-3">
                  <p className="font-display font-bold text-sm">{item.name}</p>
                  <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-tight">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Detail Showcase */}
        <div className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-6 sm:p-8 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-slate-950 font-bold text-sm">
                {PIPELINE_STEPS[activeStep].step}
              </span>
              <div>
                <h3 className="font-display text-xl font-bold text-white">Stage {PIPELINE_STEPS[activeStep].step}: {PIPELINE_STEPS[activeStep].name}</h3>
                <p className="text-xs text-slate-400">Automated end-to-end event execution</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
              <Sparkles className="size-3.5" />
              <span>Real-Time Webhook &amp; Instant Sync</span>
            </div>
          </div>
          <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed max-w-3xl">
            {PIPELINE_STEPS[activeStep].desc}
          </p>
        </div>
      </div>
    </section>
  );
}
