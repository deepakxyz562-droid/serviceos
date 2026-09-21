'use client';

import React, { useState } from 'react';
import {
  Wrench,
  Sparkles,
  CheckCircle2,
  Calendar,
  PoundSterling,
  ShieldCheck,
  ChevronRight,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface IndustryPreset {
  id: string;
  name: string;
  icon: string;
  heroPrompt: string;
  fields: string[];
  workflow: string;
  avgJobValue: string;
}

const INDUSTRIES: IndustryPreset[] = [
  {
    id: 'plumbing',
    name: 'Plumbing & Heating',
    icon: '🔧',
    heroPrompt: 'Create an emergency combi-boiler diagnostic for Sarah Williams tomorrow at 10am, assign Mike (Gas Safe), prepare £350 quote and dispatch confirmation.',
    fields: ['Boiler Make & Model', 'Water Pressure PSI', 'Gas Safe Certification', 'Part Seal Kit Attached'],
    workflow: 'Lead Intake → Gas Safe Matching → 2-Way WhatsApp Booking → On-site Sign-off → 0% Fee Payment',
    avgJobValue: '£350 – £2,800',
  },
  {
    id: 'hvac',
    name: 'HVAC & Cooling',
    icon: '❄️',
    heroPrompt: 'Schedule quarterly AC condenser overhaul for Apex Commercial on Friday 2pm, assign EPA certified tech, generate £850 invoice.',
    fields: ['Refrigerant Type (R410A)', 'Multi-Split Unit Count', 'Filter Micron Spec', 'EPA Certification #'],
    workflow: 'Commercial Request → EPA Route Matching → Digital Maintenance Checklist → Itemized Invoice',
    avgJobValue: '£450 – £6,500',
  },
  {
    id: 'electrical',
    name: 'Electrical Contracting',
    icon: '⚡',
    heroPrompt: 'Create electrical panel upgrade assessment for 200A breaker replacement, assign Liam (NICEIC), prepare £1,200 quote with safety certificate.',
    fields: ['Main Panel Amperage', 'NICEIC Compliance #', 'Breaker Box Photos', 'EICR Test Certificate'],
    workflow: 'Inspection Request → NICEIC Dispatch → Photo Markup → E-Sign Certificate → Payment',
    avgJobValue: '£280 – £3,400',
  },
  {
    id: 'roofing',
    name: 'Roofing & Solar',
    icon: '🏗️',
    heroPrompt: 'Build a roof estimate for James Thorne, 2,400 sq ft architectural standing seam, schedule drone inspection, request £500 deposit.',
    fields: ['Roof Pitch & Slope', 'Material (Architectural Metal)', 'Drone Inspection Photos', '10-Yr Workmanship Warranty'],
    workflow: 'Sq Ft Scope Slider → Live Formula Estimate → Drone Upload → E-Sign Contract → £500 Deposit',
    avgJobValue: '£3,500 – £18,000',
  },
  {
    id: 'cleaning',
    name: 'Residential & Commercial Cleaning',
    icon: '🧹',
    heroPrompt: 'Create a deep clean quote for 4-bed 3-bath home with carpet steam cleaning add-on, recurring bi-weekly discount, and instant calendar booking.',
    fields: ['Bedroom & Bathroom Count', 'Deep Cleaning Add-ons', 'Recurring Frequency (Bi-Weekly)', 'Access Key Code'],
    workflow: 'Room Count Formula → Recurring Discount Applied → Stripe Card on File → Automated Dispatch',
    avgJobValue: '£180 – £850',
  },
  {
    id: 'landscaping',
    name: 'Landscaping & Tree Care',
    icon: '🌳',
    heroPrompt: 'Schedule commercial lawn mowing & hedge trimming route for 6 properties on Thursday morning, assign 3-man crew with trailer equipment.',
    fields: ['Acreage / Lawn Size', 'Tree Height & Pruning Notes', 'Crew & Trailer Allocation', 'Recurring Route'],
    workflow: 'Property Geocode → Route Optimization → Crew Mobile Time Tracking → Automated Monthly Billing',
    avgJobValue: '£250 – £4,200',
  },
];

export function IndustryInteractiveSelector({ onGetStarted }: { onGetStarted?: () => void }) {
  const [selectedIndustryId, setSelectedIndustryId] = useState('plumbing');
  const activeIndustry = INDUSTRIES.find((i) => i.id === selectedIndustryId) || INDUSTRIES[0];

  return (
    <section className="py-20 bg-background text-foreground border-b border-border dark:bg-slate-900/90 dark:text-white dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs font-semibold">
            <Zap className="size-3.5" />
            <span>TAILORED FOR 25+ TRADES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground dark:text-white leading-tight">
            Built around how your trade{' '}
            <span className="bg-gradient-to-r from-teal-600 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
              actually works.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Select your industry to see how Fieseros customizes prompt understanding, technician certifications, specialized fields, and pricing formulas.
          </p>
        </div>

        {/* Industry Pill Selector */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-4xl mx-auto">
          {INDUSTRIES.map((ind) => (
            <button
              key={ind.id}
              type="button"
              onClick={() => setSelectedIndustryId(ind.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                selectedIndustryId === ind.id
                  ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 border-teal-500 shadow-md ring-2 ring-teal-500/30'
                  : 'bg-card border-border text-foreground hover:border-slate-300 hover:bg-muted/60 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900'
              }`}
            >
              <span>{ind.icon}</span>
              <span>{ind.name}</span>
            </button>
          ))}
        </div>

        {/* Industry Detailed Theatre Card */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl dark:border-slate-700 dark:bg-slate-950 dark:shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeIndustry.icon}</span>
                <h3 className="text-2xl sm:text-3xl font-black text-foreground dark:text-white">{activeIndustry.name}</h3>
              </div>
              <p className="text-xs text-muted-foreground dark:text-slate-400">Typical Job Value Range: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{activeIndustry.avgJobValue}</span></p>
            </div>

            {/* Prompt */}
            <div className="p-4 rounded-2xl bg-muted/60 border border-border dark:bg-slate-900 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-700 dark:text-teal-400">Natural Language Prompt:</span>
              <p className="text-xs sm:text-sm font-mono text-foreground dark:text-white leading-relaxed">
                &quot;{activeIndustry.heroPrompt}&quot;
              </p>
            </div>

            {/* Custom Trade Fields */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground dark:text-slate-400">Custom Specialized Fields:</span>
              <div className="flex flex-wrap gap-2">
                {activeIndustry.fields.map((field, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-xl bg-slate-100 text-slate-800 border border-slate-200 dark:bg-slate-900 dark:text-teal-300 dark:border-teal-500/30 text-xs font-mono font-semibold">
                    ✓ {field}
                  </span>
                ))}
              </div>
            </div>

            {/* Workflow Pipeline */}
            <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200 dark:bg-teal-950/30 dark:border-teal-500/30 text-xs text-teal-900 dark:text-teal-200 font-medium">
              <span className="font-bold text-teal-700 dark:text-teal-400">Automated Pipeline:</span> {activeIndustry.workflow}
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-center space-y-4 rounded-2xl bg-muted/40 border border-border dark:bg-slate-900/60 dark:border-slate-800 p-6 text-center">
            <h4 className="text-base font-black text-foreground dark:text-white">Ready for {activeIndustry.name}?</h4>
            <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed">
              Launch pre-configured industry templates, checklists, and 0% payment workflows in 5 minutes.
            </p>
            <Button
              onClick={onGetStarted}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer"
            >
              Start Free in {activeIndustry.name} →
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
