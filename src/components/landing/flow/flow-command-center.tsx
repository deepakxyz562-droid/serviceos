'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Banknote,
  Brain,
  FileText,
  PhoneCall,
  Receipt,
  RefreshCw,
  Rocket,
  Truck,
  UserPlus,
  Users,
  Wrench,
  Sparkles,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const agents = [
  {
    id: 'command',
    label: 'Fieseros Command',
    icon: Brain,
    headline: 'One prompt runs the whole business.',
    body: 'Type or speak a plain instruction and Fieseros orchestrates every module — CRM, dispatch, quoting, invoicing and messaging — in a single connected run.',
    bullets: ['Natural language commands', 'Cross-module orchestration', 'Full audit trail & human approval'],
  },
  {
    id: 'receptionist',
    label: 'AI Receptionist',
    icon: PhoneCall,
    headline: 'Every call answered, qualified and booked.',
    body: '24/7 voice agent that handles overflow, after-hours and emergency triage, then writes the job straight into your calendar.',
    bullets: ['First-ring pickup', 'Emergency warm transfer', '30+ languages supported'],
  },
  {
    id: 'dispatcher',
    label: 'AI Dispatcher',
    icon: Truck,
    headline: 'The right tech, the shortest route.',
    body: 'Matches certification, parts on van, live GPS position and traffic to assign work automatically and re-optimise when the day changes.',
    bullets: ['Skills + GPS proximity matching', 'Live traffic re-routing', 'Drag-and-drop manual override'],
  },
  {
    id: 'revenue',
    label: 'AI Revenue Manager',
    icon: Banknote,
    headline: 'Quotes out fast, invoices paid faster.',
    body: 'Builds itemised quotes from job notes, chases approvals, issues invoices and nudges late payers until the cash lands.',
    bullets: ['Instant itemised quotes', 'Automated payment chasing', '0% platform commission direct payout'],
  },
  {
    id: 'growth',
    label: 'AI Growth Manager',
    icon: Rocket,
    headline: 'Fills tomorrow\'s calendar while you work.',
    body: 'Reactivates dormant customers, follows up on unconverted quotes and requests reviews at the perfect moment.',
    bullets: ['Lead follow-up sequences', 'Seasonal reactivation campaigns', '5-star Google review generation'],
  },
  {
    id: 'analyst',
    label: 'AI Business Analyst',
    icon: BarChart3,
    headline: 'Ask your numbers a question.',
    body: 'Margin per trade, tech utilisation, first-time fix rate — answered in a sentence, with the chart to back it up.',
    bullets: ['Plain-English reporting', 'Margin & utilization analytics', 'Weekly executive digest'],
  },
];

const domains = [
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    query: 'Show customers with no job in 9 months',
    rows: ['Sarah Williams · last job Dec 2025 (£1,420 LTV)', 'Riverside Dental · last job Nov 2025 (£4,900 LTV)', 'M. Okonkwo · last job Oct 2025 (£850 LTV)'],
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: UserPlus,
    query: 'Which leads came in this week and are unqualified?',
    rows: ['14 Oak Lane — roof replacement, web form', 'Hallam Cafe — commercial HVAC, missed call', 'J. Pryce — boiler repair, WhatsApp'],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: Wrench,
    query: 'List today\'s jobs still unassigned',
    rows: ['#4826 Emergency leak · SW4 (High priority)', '#4829 Annual boiler service · SE1', '#4831 Fuse board inspection · N7'],
  },
  {
    id: 'quotes',
    label: 'Quotes',
    icon: FileText,
    query: 'Quotes over £1,000 awaiting approval',
    rows: ['Riverside Dental · £24,750 (Multi-unit VRV)', '14 Oak Lane · £10,960 (Architectural standing seam)', 'Hallam Cafe · £3,420 (Coil maintenance)'],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    query: 'Invoices overdue by more than 14 days',
    rows: ['INV-2214 · £890 · 21 days overdue (Nudge sent)', 'INV-2198 · £1,340 · 17 days overdue', 'INV-2187 · £415 · 15 days overdue'],
  },
  {
    id: 'reactivation',
    label: 'Reactivation',
    icon: RefreshCw,
    query: 'Draft a reactivation offer for lapsed boiler customers',
    rows: ['142 contacts matched across London', 'Offer: £59 seasonal boiler & safety inspection', 'Broadcast ready via SMS + WhatsApp'],
  },
];

export function FlowCommandCenter({ onGetStarted }: { onGetStarted?: () => void }) {
  const [agent, setAgent] = useState(0);
  const [domain, setDomain] = useState(0);
  const a = agents[agent];
  const d = domains[domain];

  return (
    <section id="command" className="bg-background py-24 border-b border-border relative overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="mx-auto max-w-2xl text-center space-y-3">
          <span className="inline-flex rounded-full bg-teal-500/10 border border-teal-500/30 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
            <Sparkles className="size-3.5" /> AI Command Center
          </span>
          <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">
            Six AI specialists.{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              One operating system.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground">
            Specialized autonomous teammates trained specifically in contractor workflows, dispatch algorithms, and revenue guardian logic.
          </p>
        </div>

        {/* 6 Agents Tabs */}
        <div className="flex flex-wrap justify-center gap-2 max-w-4xl mx-auto">
          {agents.map((g, i) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setAgent(i)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs sm:text-[13px] font-semibold transition-all duration-200 cursor-pointer border shadow-xs',
                i === agent
                  ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-500 shadow-md ring-2 ring-teal-500/20'
                  : 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-border hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <g.icon className="size-3.5" /> {g.label}
            </button>
          ))}
        </div>

        {/* Active Agent Banner */}
        <AnimatePresence mode="wait">
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 p-6 sm:p-10 shadow-xl max-w-5xl mx-auto"
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-teal-600 text-white shadow-md">
                  <a.icon className="size-6" />
                </span>
                <h3 className="mt-4 text-2xl font-extrabold text-slate-900 dark:text-white">{a.headline}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{a.body}</p>
              </div>
              <ul className="space-y-2.5">
                {a.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-white dark:bg-slate-950 px-4 py-3 text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 shadow-xs"
                  >
                    <span className="size-2 rounded-full bg-teal-600 dark:bg-teal-400 shrink-0" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* CRM Domain Query Preview */}
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-900 dark:bg-slate-950 text-white p-6 sm:p-8 max-w-5xl mx-auto shadow-2xl space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-teal-400">
            CRM Domain Query &amp; Action Preview
          </p>
          <div className="flex flex-wrap gap-2">
            {domains.map((x, i) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setDomain(i)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer border',
                  i === domain
                    ? 'bg-teal-600 text-white border-teal-500 shadow-md'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700'
                )}
              >
                <x.icon className="size-3.5 text-teal-300" />
                <span>{x.label}</span>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono text-teal-300">&gt; &quot;{d.query}&quot;</span>
              <span className="text-[10px] uppercase font-bold text-emerald-400">● 3 Results Found</span>
            </div>
            <ul className="space-y-1.5">
              {d.rows.map((r, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-slate-200 bg-slate-900/60 p-2 rounded-lg border border-slate-800 font-mono">
                  <span className="text-teal-400">✓</span> {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
