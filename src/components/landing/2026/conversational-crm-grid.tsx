'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  Briefcase,
  Calendar,
  Wrench,
  PoundSterling,
  FileSpreadsheet,
  TrendingUp,
  MessageSquare,
  Star,
  Zap,
  CheckCircle2,
  ArrowRight,
  Terminal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CrmDomainPrompt {
  id: string;
  category: string;
  icon: any;
  prompt: string;
  response: string;
  metrics: string[];
  actionLabel: string;
}

const CRM_DOMAINS: CrmDomainPrompt[] = [
  {
    id: 'customers',
    category: 'Customers',
    icon: Users,
    prompt: 'Summarize Sarah Williams past service history and equipment warranty.',
    response:
      'Sarah Williams has 3 completed work orders with us (£1,420 total). Her Worcester Bosch combi-boiler was installed in Oct 2024 and has an active 10-year manufacturer warranty valid until 2034.',
    metrics: ['3 Past Jobs', '£1,420 Lifetime Value', 'Warranty Active'],
    actionLabel: 'View Customer 360° Profile →',
  },
  {
    id: 'leads',
    category: 'Leads',
    icon: Sparkles,
    prompt: 'Find high-value leads received in the last 48 hours that haven’t been contacted.',
    response:
      'Found 7 high-value leads (£18,900 estimated pipeline value). 4 submitted roof replacement estimates, 3 requested heat pump consultations. None have received a callback yet.',
    metrics: ['7 Uncontacted Leads', '£18,900 Pipeline', 'Avg Response Time: 4h'],
    actionLabel: 'Trigger AI Outreach SMS & Call →',
  },
  {
    id: 'jobs',
    category: 'Jobs',
    icon: Briefcase,
    prompt: 'Create commercial work orders from the 4 approved landlord quotes.',
    response:
      '4 work orders created for Apex Property Group. Parts pre-allocated from truck stock inventory. Safety compliance checklists automatically attached to each job packet.',
    metrics: ['4 Jobs Created', '£3,200 Revenue Locked', 'Parts Reserved'],
    actionLabel: 'Open Dispatch Board →',
  },
  {
    id: 'scheduling',
    category: 'Scheduling',
    icon: Calendar,
    prompt: 'Find the earliest available slot for an emergency 2-hour electrical repair in North London.',
    response:
      'Earliest slot: Tomorrow at 11:30 AM with Liam Carter (NICEIC Certified). Route transit from his 9:30 AM job is only 14 minutes (3.2 miles).',
    metrics: ['Tomorrow 11:30 AM', '14 min Drive Time', 'Liam Carter (NICEIC)'],
    actionLabel: 'Lock Slot & Dispatch Tech →',
  },
  {
    id: 'quotes',
    category: 'Quotes',
    icon: PoundSterling,
    prompt: 'Follow up on all quotes older than 5 days that have been viewed but not approved.',
    response:
      '12 open quotes identified (£14,850 total). All 12 clients opened the quote link but haven’t signed. Prepared a friendly WhatsApp message with a 10% seasonal lock-in incentive.',
    metrics: ['12 Open Quotes', '£14,850 Pipeline', '100% Viewed'],
    actionLabel: 'Send Automated WhatsApp Follow-up →',
  },
  {
    id: 'invoices',
    category: 'Invoices',
    icon: FileSpreadsheet,
    prompt: 'Invoice all 9 completed jobs from yesterday and collect balance payments.',
    response:
      '9 itemized invoices generated (£4,680 total). Pre-applied deposit deductions. Online payment links dispatched via SMS with 0% platform fee direct payout.',
    metrics: ['9 Invoices Issued', '£4,680 Total', '0% Platform Fee'],
    actionLabel: 'Dispatched Payment Reminders →',
  },
  {
    id: 'revenue',
    category: 'Revenue',
    icon: TrendingUp,
    prompt: 'Why did revenue dip 8% this week compared to last week?',
    response:
      'Root cause: 14 completed jobs from Tuesday/Wednesday have not been invoiced yet (£7,400 uncollected), and 6 quotes were stalled awaiting parts supplier confirmation.',
    metrics: ['£7,400 Uninvoiced', '6 Stalled Quotes', 'Margin Stable at 48%'],
    actionLabel: '1-Click Fix: Invoice Completed Jobs →',
  },
  {
    id: 'marketing',
    category: 'Reactivation',
    icon: Zap,
    prompt: 'Reactivate customers who haven’t booked any maintenance in the last 12 months.',
    response:
      '68 dormant residential clients found (£54,000 historical spend). Prepared a personalized "Annual Boiler & HVAC Safety Inspection" SMS/WhatsApp campaign.',
    metrics: ['68 Dormant Clients', 'Estimated £12k Bookings', 'WhatsApp Ready'],
    actionLabel: 'Launch Reactivation Broadcast →',
  },
];

export function ConversationalCrmGrid() {
  const [selectedDomainId, setSelectedDomainId] = useState<string>('customers');

  const currentDomain = CRM_DOMAINS.find((d) => d.id === selectedDomainId) || CRM_DOMAINS[0];
  const IconComponent = currentDomain.icon;

  return (
    <section className="py-20 bg-slate-900/80 text-white border-b border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <Terminal className="size-3.5" />
            <span>CONVERSATIONAL CRM</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Every CRM action.{' '}
            <span className="bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text text-transparent">
              One conversational prompt.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Instead of navigating complex menus and 40 different dashboard filters, simply ask Fieseros. It understands context, queries your database, and executes real actions.
          </p>
        </div>

        {/* 12-Domain Interactive Grid & Live Interactive Response Theatre */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Domain Chips List (4.5 cols) */}
          <div className="lg:col-span-5 space-y-2">
            <p className="text-xs uppercase font-bold tracking-wider text-slate-400 mb-3">
              Select a CRM Domain to Query:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {CRM_DOMAINS.map((domain) => {
                const isSelected = selectedDomainId === domain.id;
                const DomainIcon = domain.icon;

                return (
                  <button
                    key={domain.id}
                    type="button"
                    onClick={() => setSelectedDomainId(domain.id)}
                    className={`p-3.5 rounded-2xl text-left border transition-all flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-md ring-2 ring-teal-500/30'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`size-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-slate-950 text-teal-400' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        <DomainIcon className="size-4" />
                      </div>
                      <span className="text-xs font-bold truncate">{domain.category}</span>
                    </div>
                    <span className="text-[11px] font-bold opacity-80">→</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive AI Response Terminal (7.5 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-700 bg-slate-950 p-6 sm:p-8 space-y-6 shadow-2xl">
            {/* Terminal Window Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="size-8 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <IconComponent className="size-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    Fieseros AI CRM Engine
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono">
                      Real-time Action
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-400">Domain: {currentDomain.category}</p>
                </div>
              </div>

              <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/30 bg-teal-500/10">
                ⌘ Query Active
              </Badge>
            </div>

            {/* Prompt Inquiry Box */}
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
                User Question / Command:
              </span>
              <p className="text-sm sm:text-base font-mono font-semibold text-white">
                "{currentDomain.prompt}"
              </p>
            </div>

            {/* AI Answer & Synthesis */}
            <div className="p-5 rounded-2xl bg-teal-950/30 border border-teal-500/30 space-y-3">
              <div className="flex items-center gap-1.5 text-teal-400 font-bold text-xs">
                <Sparkles className="size-4" /> Fieseros Synthesis:
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {currentDomain.response}
              </p>

              {/* Extracted Metrics Chips */}
              <div className="flex flex-wrap gap-2 pt-2">
                {currentDomain.metrics.map((metric, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-xl bg-slate-900 text-teal-300 border border-teal-500/30 text-xs font-mono font-bold"
                  >
                    ✓ {metric}
                  </span>
                ))}
              </div>
            </div>

            {/* 1-Click Action Button */}
            <div className="pt-2">
              <Button className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 shadow-lg cursor-pointer transition hover:scale-[1.01]">
                <span>{currentDomain.actionLabel}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
