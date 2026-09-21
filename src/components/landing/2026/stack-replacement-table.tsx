'use client';

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface StackItem {
  feature: string;
  replaces: string;
  otherToolsCost: string;
  fieserosStatus: string;
}

const STACK_COMPARISON: StackItem[] = [
  { feature: 'CRM & Pipeline Management', replaces: 'HubSpot, ActiveCampaign', otherToolsCost: '$99/mo', fieserosStatus: 'Included' },
  { feature: 'Field Service & Dispatch Board', replaces: 'ServiceTitan, Jobber', otherToolsCost: '$299/mo', fieserosStatus: 'Included' },
  { feature: 'Technician Mobile PWA App', replaces: 'FieldEdge, Housecall Pro Mobile', otherToolsCost: '$99/mo', fieserosStatus: 'Included' },
  { feature: 'AI Form Engine & Calculators', replaces: 'Typeform, Jotform, FastField', otherToolsCost: '$79/mo', fieserosStatus: 'Included' },
  { feature: '24/7 AI Voice Phone Receptionist', replaces: 'Air AI, Synthflow', otherToolsCost: '$199/mo', fieserosStatus: 'Included' },
  { feature: 'Booking & Google Calendar 2-Way Sync', replaces: 'Calendly, Acuity Scheduling', otherToolsCost: '$29/mo', fieserosStatus: 'Included' },
  { feature: '2-Way SMS & WhatsApp Messaging', replaces: 'Podium, Skipio, Wati', otherToolsCost: '$99/mo', fieserosStatus: 'Included' },
  { feature: 'Visual Workflow Automations', replaces: 'Zapier, Keap, Make.com', otherToolsCost: '$169/mo', fieserosStatus: 'Included' },
  { feature: 'Email Marketing & Drip Campaigns', replaces: 'Mailchimp, Klaviyo', otherToolsCost: '$99/mo', fieserosStatus: 'Included' },
  { feature: 'Digital Invoicing & 0% Payment Fees', replaces: 'QuickBooks Invoicing, Stripe Billing', otherToolsCost: '$49/mo', fieserosStatus: 'Included' },
  { feature: 'E-Signatures & Document Drafting', replaces: 'DocuSign, PandaDoc', otherToolsCost: '$47/mo', fieserosStatus: 'Included' },
  { feature: 'Reputation & Automated Reviews', replaces: 'Birdeye, Podium Reviews', otherToolsCost: '$159/mo', fieserosStatus: 'Included' },
  { feature: 'Self-Service Customer Portal', replaces: 'TrackTik, Custom Client Portals', otherToolsCost: '$99/mo', fieserosStatus: 'Included' },
  { feature: 'Employee Timesheets & Payroll Prep', replaces: 'TSheets, Deputy', otherToolsCost: '$49/mo', fieserosStatus: 'Included' },
  { feature: 'Inventory & Purchase Orders', replaces: 'Sortly, Fishbowl', otherToolsCost: '$69/mo', fieserosStatus: 'Included' },
  { feature: 'Programmatic Local SEO Landing Pages', replaces: 'Yext, BrightLocal', otherToolsCost: '$99/mo', fieserosStatus: 'Included' },
  { feature: 'White-Label Branding & Custom Domain', replaces: 'HighLevel Agency Pro', otherToolsCost: '$199/mo', fieserosStatus: 'Included' },
];

export function StackReplacementTable({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <Layers className="size-3.5" />
            <span>ALL-IN-ONE STACK REPLACEMENT</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Stop paying for a stack of{' '}
            <span className="bg-gradient-to-r from-teal-400 via-emerald-300 to-cyan-400 bg-clip-text text-transparent">
              disconnected tools.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Replace $2,347/month in point solutions, broken Zapier webhooks, and separate logins with one unified AI-native operating system.
          </p>
        </div>

        {/* Comparison Table Box */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden">
          {/* Table Header Row */}
          <div className="grid grid-cols-12 bg-slate-950 px-5 sm:px-8 py-4 border-b border-slate-800 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            <div className="col-span-5 sm:col-span-4">Capability &amp; Features</div>
            <div className="col-span-4 sm:col-span-4">Replaces Disconnected Tools</div>
            <div className="col-span-3 sm:col-span-2 text-right sm:text-center">Point Tools</div>
            <div className="hidden sm:block sm:col-span-2 text-right text-teal-400">Fieseros</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-slate-800/80">
            {STACK_COMPARISON.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 px-5 sm:px-8 py-3.5 items-center text-xs transition-colors hover:bg-slate-800/40"
              >
                <div className="col-span-5 sm:col-span-4 font-bold text-white pr-2">
                  {item.feature}
                </div>
                <div className="col-span-4 sm:col-span-4 text-slate-400 truncate pr-2 font-medium">
                  {item.replaces}
                </div>
                <div className="col-span-3 sm:col-span-2 text-right sm:text-center font-mono text-rose-400/90 font-bold line-through">
                  {item.otherToolsCost}
                </div>
                <div className="hidden sm:flex sm:col-span-2 justify-end items-center gap-1.5 text-teal-400 font-extrabold">
                  <Check className="size-4 text-teal-400 stroke-[3]" />
                  <span>{item.fieserosStatus}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Table Bottom Total ROI Summary Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 bg-slate-950 px-6 sm:px-8 py-6 border-t-2 border-teal-500/40 items-center gap-4">
            <div className="sm:col-span-5 space-y-0.5 text-center sm:text-left">
              <span className="text-xs uppercase font-extrabold tracking-wider text-teal-400">
                Total Monthly Stack Replacement Value
              </span>
              <p className="text-xs text-slate-400">17 Dedicated software categories in 1 platform</p>
            </div>

            <div className="sm:col-span-4 text-center sm:text-right font-mono">
              <span className="text-sm text-slate-400 line-through mr-3">
                $2,347 / month
              </span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400">
                Included in Plan
              </span>
            </div>

            <div className="sm:col-span-3 flex justify-center sm:justify-end">
              <Button
                onClick={onGetStarted}
                className="h-11 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg cursor-pointer"
              >
                Start Free Forever →
              </Button>
            </div>
          </div>
        </div>

        {/* ─── "REPLACES THE WORK BETWEEN SOFTWARE" ARCHITECTURAL CONTRAST ─── */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Fieseros replaces more than software.{' '}
              <span className="text-teal-400">It replaces the work between software.</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Every arrow in a traditional stack is where human error, lost leads, and manual data re-entry happen.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Traditional Stack Box */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-rose-500/20 space-y-4">
              <div className="flex items-center justify-between text-rose-400 font-bold text-xs pb-2 border-b border-rose-500/20">
                <span>Traditional Disconnected Stack</span>
                <span>⚠️ 7 Manual Handoffs</span>
              </div>
              <p className="text-xs font-mono text-slate-300 leading-loose">
                Web Form <span className="text-rose-400">→</span> Copy to CRM <span className="text-rose-400">→</span> Check Calendar <span className="text-rose-400">→</span> Call Tech <span className="text-rose-400">→</span> Paper Notes <span className="text-rose-400">→</span> Export Invoice <span className="text-rose-400">→</span> Chase Check
              </p>
              <p className="text-[11px] text-slate-400">
                High friction, double data-entry, and hours of administrative paperwork.
              </p>
            </div>

            {/* Fieseros AI Engine Box */}
            <div className="p-6 rounded-2xl bg-teal-950/40 border border-teal-500/30 space-y-4">
              <div className="flex items-center justify-between text-teal-400 font-bold text-xs pb-2 border-b border-teal-500/30">
                <span>The Fieseros Unified AI Operating Layer</span>
                <span>✓ 1 Autonomous Flow</span>
              </div>
              <p className="text-xs font-mono text-teal-200 leading-loose">
                ONE PROMPT <span className="text-teal-400">→</span> FIESEROS AI <span className="text-teal-400">→</span> [Customer · Job · Schedule · Tech · Quote · WhatsApp · Invoice · 0% Payment]
              </p>
              <p className="text-[11px] text-slate-300">
                Instant execution in 0.4 seconds across every department simultaneously.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
