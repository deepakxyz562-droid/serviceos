'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  FileInput,
  Users,
  Calendar,
  Wrench,
  FileSpreadsheet,
  DollarSign,
  Star,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface LifecycleStage {
  id: string;
  number: string;
  name: string;
  shortDesc: string;
  icon: any;
  headline: string;
  details: string[];
  imageSrc: string;
  badge: string;
}

const STAGES: LifecycleStage[] = [
  {
    id: 'lead',
    number: '01',
    name: 'Lead Intake',
    shortDesc: 'AI Web Form / Call',
    icon: FileInput,
    headline: 'Customer Submits Request via GPTForm or AI Voice Call',
    details: [
      'Captures property address, urgency level, and scope size in real time',
      'Dynamic formula calculates instant price estimate (£14,160)',
      'Ghost form engine saves contact info even if prospect abandons halfway',
    ],
    imageSrc: '/images/landing/pillar-crm.png',
    badge: 'Instant AI Capture',
  },
  {
    id: 'dispatch',
    number: '02',
    name: 'Smart Dispatch',
    shortDesc: 'Live GPS Calendar',
    icon: Calendar,
    headline: 'AI Matches Qualified Technician & Optimizes Route',
    details: [
      'Considers Gas Safe / EPA certifications, truck inventory, and location',
      '2-Way Google Calendar sync prevents double bookings',
      'Calculates transit travel buffer automatically',
    ],
    imageSrc: '/images/landing/step-dispatch.png',
    badge: 'Route Optimized',
  },
  {
    id: 'field',
    number: '03',
    name: 'Field Execution',
    shortDesc: 'Mobile PWA App',
    icon: Wrench,
    headline: 'Technician Executes Job with Digital Safety Checklists & Photos',
    details: [
      'Technician accesses full job packet offline on mobile phone',
      'Captures before/after photos with visual damage annotations',
      'Collects customer e-signature directly on mobile screen',
    ],
    imageSrc: '/images/landing/persona-technician.png',
    badge: 'Mobile PWA Ready',
  },
  {
    id: 'invoice',
    number: '04',
    name: 'Invoice & Paid',
    shortDesc: '0% Platform Fee',
    icon: DollarSign,
    headline: 'Work Order Converts to Digital Invoice with Instant Online Payment',
    details: [
      'Itemized PDF invoice generated in 1-click with pre-applied deposit',
      'SMS & WhatsApp payment link dispatched directly to customer phone',
      '0% platform commission: Funds deposit straight into your merchant account',
    ],
    imageSrc: '/images/landing/step-invoice.png',
    badge: '0% Transaction Fee',
  },
  {
    id: 'review',
    number: '05',
    name: '5-Star Review',
    shortDesc: 'Automated Growth',
    icon: Star,
    headline: 'Automated 5-Star Review Request Sent Within 30 Minutes',
    details: [
      'Sends personalized WhatsApp/SMS review prompt after sign-off',
      'Direct 1-tap link to your Google Business Profile',
      'Enrolls client into annual seasonal maintenance reminder campaign',
    ],
    imageSrc: '/images/landing/channel-whatsapp.png',
    badge: 'Automated Retention',
  },
];

export function LifecycleStory() {
  const [activeStageId, setActiveStageId] = useState('lead');
  const currentStage = STAGES.find((s) => s.id === activeStageId) || STAGES[0];
  const CurrentIcon = currentStage.icon;

  return (
    <section className="py-20 bg-background text-foreground border-b border-border dark:bg-slate-900/90 dark:text-white dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs font-semibold">
            <Sparkles className="size-3.5" />
            <span>END-TO-END SERVICE LIFECYCLE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground dark:text-white leading-tight">
            From customer request to paid invoice —{' '}
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
              automatically connected.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Click through each stage to see how Fieseros connects every department without manual data re-entry or broken third-party integrations.
          </p>
        </div>

        {/* Horizontal Navigation Stepper */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3">
          {STAGES.map((stage) => {
            const isSelected = activeStageId === stage.id;
            const IconComponent = stage.icon;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStageId(stage.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 border-teal-500 shadow-lg ring-2 ring-teal-500/30'
                    : 'bg-card border-border text-muted-foreground hover:border-slate-300 hover:bg-muted/60 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[10px] font-mono font-black opacity-75">
                    STEP {stage.number}
                  </span>
                  <div className={`size-5 rounded-md flex items-center justify-center ${isSelected ? 'bg-white/20 text-white dark:bg-slate-950 dark:text-teal-400' : 'bg-muted text-muted-foreground dark:bg-slate-900 dark:text-slate-400'}`}>
                    <IconComponent className="size-3" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold truncate text-foreground dark:text-inherit">{stage.name}</p>
                  <p className="text-[10px] opacity-75 truncate">{stage.shortDesc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Interactive Showcase Screen */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl dark:border-slate-700 dark:bg-slate-950 dark:shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Text & Breakdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3">
              <Badge className="bg-teal-500/10 text-teal-700 border border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-400 text-xs font-bold">
                {currentStage.badge}
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-black text-foreground dark:text-white leading-snug">
                {currentStage.headline}
              </h3>
            </div>

            <ul className="space-y-3 border-t border-border dark:border-slate-800 pt-4">
              {currentStage.details.map((detail, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <span className="text-[11px] font-mono text-muted-foreground dark:text-slate-500">
                Data automatically flows to Step 0{Number(currentStage.number) < 5 ? Number(currentStage.number) + 1 : 1}
              </span>
            </div>
          </div>

          {/* Right Real Product Screenshot Frame (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-border bg-muted/40 dark:border-slate-800 dark:bg-slate-900/60 p-2 sm:p-3 overflow-hidden shadow-inner">
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-background border border-border dark:bg-slate-950 dark:border-slate-800">
              <Image
                src={currentStage.imageSrc}
                alt={currentStage.headline}
                fill
                className="object-cover object-top hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
