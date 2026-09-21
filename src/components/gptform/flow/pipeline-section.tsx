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
    name: 'Form',
    desc: 'Pre-filled smart form captures verified contact info, photo evidence, and e-signatures without retyping.',
    icon: FileInput,
  },
  {
    step: '03',
    name: 'Lead',
    desc: 'AI scores the enquiry, validates phone & email, geocodes the property, and pushes into your CRM.',
    icon: Users,
  },
  {
    step: '04',
    name: 'Appointment',
    desc: 'Calendar slot is locked in real time with travel buffers and automated 2-way SMS confirmations.',
    icon: CalendarCheck,
  },
  {
    step: '05',
    name: 'Quote',
    desc: 'Dynamic formula calculates materials, labor hours, and optional tiered upgrades for customer sign-off.',
    icon: Calculator,
  },
  {
    step: '06',
    name: 'Payment',
    desc: 'Deposit or full invoice paid securely via Stripe with 0% platform transaction fee.',
    icon: DollarSign,
  },
  {
    step: '07',
    name: 'Follow-up',
    desc: 'Automated job packets sent to technician PWA app and automated review request sent upon completion.',
    icon: Send,
  },
];

export function ConnectedPipeline() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section id="integrations" className="section-pad bg-slate-950 text-white relative overflow-hidden">
      <div className="page-shell">
        <div className="section-heading text-white max-w-3xl mb-12">
          <p className="eyebrow text-emerald-400 font-bold">CONNECTED WORKFLOW PIPELINE</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight">
            A submission should never disappear into a static inbox.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300">
            Keep customer data moving seamlessly from the very first website interaction all the way to dispatch, invoice, and payment.
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
                <h3 className="font-display text-xl font-bold text-white">Stage {PIPELINE_STEPS[activeStep].step}: {PIPELINE_STEPS[activeStep].name} Stage</h3>
                <p className="text-xs text-slate-400">Automated end-to-end event triggering</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-full">
              <Sparkles className="size-3.5" />
              <span>Real-Time Webhook &amp; CRM Sync</span>
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
