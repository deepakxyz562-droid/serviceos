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
} from 'lucide-react';
import { cn } from '@/lib/utils';

const agents = [
  {
    id: 'command',
    label: 'Fieseros Command',
    icon: Brain,
    headline: 'One prompt runs the whole business.',
    body: 'Type or speak a plain instruction and Fieseros orchestrates every module — CRM, dispatch, quoting, invoicing and messaging — in a single connected run.',
    bullets: ['Natural language commands', 'Cross-module orchestration', 'Full audit trail'],
  },
  {
    id: 'receptionist',
    label: 'AI Receptionist',
    icon: PhoneCall,
    headline: 'Every call answered, qualified and booked.',
    body: '24/7 voice agent that handles overflow, after-hours and emergency triage, then writes the job straight into your calendar.',
    bullets: ['First-ring pickup', 'Emergency warm transfer', '30+ languages'],
  },
  {
    id: 'dispatcher',
    label: 'AI Dispatcher',
    icon: Truck,
    headline: 'The right tech, the shortest route.',
    body: 'Matches certification, parts on van, live GPS position and traffic to assign work automatically and re-optimise when the day changes.',
    bullets: ['Skills + GPS matching', 'Live re-routing', 'Drag-and-drop override'],
  },
  {
    id: 'revenue',
    label: 'AI Revenue Manager',
    icon: Banknote,
    headline: 'Quotes out fast, invoices paid faster.',
    body: 'Builds itemised quotes from job notes, chases approvals, issues invoices and nudges late payers until the cash lands.',
    bullets: ['Instant itemised quotes', 'Automated payment chasing', '0% platform commission'],
  },
  {
    id: 'growth',
    label: 'AI Growth Manager',
    icon: Rocket,
    headline: "Fills tomorrow's calendar while you work.",
    body: 'Reactivates dormant customers, follows up on unconverted quotes and requests reviews at the perfect moment.',
    bullets: ['Lead follow-up sequences', 'Reactivation campaigns', 'Review generation'],
  },
  {
    id: 'analyst',
    label: 'AI Business Analyst',
    icon: BarChart3,
    headline: 'Ask your numbers a question.',
    body: 'Margin per trade, tech utilisation, first-time fix rate — answered in a sentence, with the chart to back it up.',
    bullets: ['Plain-English reporting', 'Margin & utilisation', 'Weekly digest'],
  },
];

const domains = [
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    query: 'Show customers with no job in 9 months',
    rows: [
      'Sarah Williams · last job Dec 2025',
      'Riverside Dental · last job Nov 2025',
      'M. Okonkwo · last job Oct 2025',
    ],
  },
  {
    id: 'leads',
    label: 'Leads',
    icon: UserPlus,
    query: 'Which leads came in this week and are unqualified?',
    rows: [
      '14 Oak Lane — roof, web form',
      'Hallam Cafe — HVAC, missed call',
      'J. Pryce — boiler, WhatsApp',
    ],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: Wrench,
    query: "List today's jobs still unassigned",
    rows: [
      '#4826 Emergency leak · SW4',
      '#4829 Annual service · SE1',
      '#4831 Fuse board · N7',
    ],
  },
  {
    id: 'quotes',
    label: 'Quotes',
    icon: FileText,
    query: 'Quotes over £1,000 awaiting approval',
    rows: [
      'Riverside Dental · £24,750',
      '14 Oak Lane · £10,960',
      'Hallam Cafe · £3,420',
    ],
  },
  {
    id: 'invoices',
    label: 'Invoices',
    icon: Receipt,
    query: 'Invoices overdue by more than 14 days',
    rows: [
      'INV-2214 · £890 · 21 days',
      'INV-2198 · £1,340 · 17 days',
      'INV-2187 · £415 · 15 days',
    ],
  },
  {
    id: 'reactivation',
    label: 'Reactivation',
    icon: RefreshCw,
    query: 'Draft a reactivation offer for lapsed boiler customers',
    rows: [
      '142 contacts matched',
      'Offer: £59 winter service',
      'Send via SMS + email',
    ],
  },
];

export function FlowCommandCenter() {
  const [agent, setAgent] = useState(0);
  const [domain, setDomain] = useState(0);
  const a = agents[agent]!;
  const d = domains[domain]!;

  return (
    <section id="command" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex rounded-full bg-accent px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
            AI Command Center
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl tracking-tight">
            Six AI specialists. <span className="text-gradient-brand">One operating system.</span>
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-2.5">
          {agents.map((g, i) => (
            <button
              key={g.id}
              onClick={() => setAgent(i)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold transition-all duration-200 cursor-pointer',
                i === agent
                  ? 'bg-navy text-primary-foreground shadow-[0_14px_30px_-18px_oklch(0.21_0.045_258)]'
                  : 'bg-surface text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <g.icon className="size-4" /> {g.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mt-8 rounded-3xl border border-border bg-surface p-7 sm:p-10 shadow-sm"
          >
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
              <div>
                <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <a.icon className="size-5" />
                </span>
                <h3 className="mt-5 text-2xl font-extrabold text-navy tracking-tight">{a.headline}</h3>
                <p className="mt-3 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">{a.body}</p>
              </div>
              <ul className="space-y-2.5">
                {a.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3.5 text-sm font-medium text-navy shadow-xs"
                  >
                    <span className="size-2 rounded-full bg-primary" /> {b}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="mt-8 rounded-3xl border border-border bg-navy-deep p-6 sm:p-8 shadow-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-glow">
            CRM domain query preview
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {domains.map((x, i) => (
              <button
                key={x.id}
                onClick={() => setDomain(i)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-semibold transition-colors cursor-pointer',
                  i === domain
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-primary-foreground/65 hover:bg-white/10'
                )}
              >
                <x.icon className="size-3.5" /> {x.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-2xl bg-white/5 p-4 font-mono text-[13px] text-primary-foreground/90 border border-white/5">
            <span className="text-brand-glow">fieseros ›</span> {d.query}
          </div>
          <ul className="mt-3 space-y-2">
            {d.rows.map((r) => (
              <motion.li
                key={r}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-[13px] text-primary-foreground/80 font-mono"
              >
                {r}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
