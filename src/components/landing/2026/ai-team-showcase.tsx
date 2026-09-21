'use client';

import React, { useState } from 'react';
import {
  Bot,
  PhoneCall,
  MapPin,
  PoundSterling,
  TrendingUp,
  BarChart3,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  PhoneForwarded,
  Check,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AiTeammate {
  id: string;
  title: string;
  role: string;
  tagline: string;
  status: string;
  icon: any;
  accentColor: string;
  badgeBg: string;
  capabilities: string[];
  livePromptExample: {
    prompt: string;
    result: string;
  };
}

const AI_TEAM: AiTeammate[] = [
  {
    id: 'command',
    title: 'Fieseros Command',
    role: 'AI Business Operator',
    tagline: 'Understands your entire company and coordinates cross-module actions.',
    status: 'Active 24/7',
    icon: Sparkles,
    accentColor: 'text-teal-600 dark:text-teal-400',
    badgeBg: 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    capabilities: [
      'Executes multi-step workflows from a single prompt',
      'Coordinates CRM, dispatch, invoicing, and messaging',
      'Detects bottlenecks and suggests next best business actions',
    ],
    livePromptExample: {
      prompt: '"Schedule Sarah for a boiler repair tomorrow at 10am, assign Mike, prepare £350 quote and notify her."',
      result: '✓ Customer created · ✓ Slot booked · ✓ Mike assigned · ✓ Quote ready · ✓ WhatsApp confirmation dispatched.',
    },
  },
  {
    id: 'receptionist',
    title: 'AI Receptionist',
    role: '24/7 Voice & Call Intake',
    tagline: 'Answers calls, qualifies emergency inquiries, and books calendar slots.',
    status: 'Listening on Phone Lines',
    icon: PhoneCall,
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    badgeBg: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    capabilities: [
      'Handles natural phone conversations with zero hold time',
      'Distinguishes emergency calls from routine maintenance',
      'Syncs directly to your live Google Calendar & CRM',
    ],
    livePromptExample: {
      prompt: 'Inbound Customer Call: "My basement pipe burst and water is leaking everywhere!"',
      result: '✓ Triaged as Emergency · ✓ Nearest on-call plumber dispatched · ✓ £120 diagnostic fee pre-authorized.',
    },
  },
  {
    id: 'dispatcher',
    title: 'AI Dispatcher',
    role: 'Intelligent Route & Fleet Dispatcher',
    tagline: 'Schedules the right technician for the right job based on location and skills.',
    status: 'GPS Fleet Optimizing',
    icon: MapPin,
    accentColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    capabilities: [
      'Minimizes windshield drive time with route clustering',
      'Enforces license & certification requirements per job',
      'Handles emergency cancellations and auto-reallocates slots',
    ],
    livePromptExample: {
      prompt: '"Optimize tomorrow’s 18 work orders across our 5 technicians."',
      result: '✓ Re-routed 4 assignments · Saved 52 minutes total drive time · Reduced fuel cost by £38.',
    },
  },
  {
    id: 'revenue',
    title: 'AI Revenue Manager',
    role: 'Cash Flow & Unbilled Revenue Guardian',
    tagline: 'Finds the money you are leaving behind and accelerates client payouts.',
    status: 'Tracking Unbilled Jobs',
    icon: PoundSterling,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    badgeBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    capabilities: [
      'Identifies completed jobs that have not been invoiced',
      'Sends automated SMS/WhatsApp nudges for overdue balances',
      'Collects 0% platform fee merchant deposits upfront',
    ],
    livePromptExample: {
      prompt: '"What money is uncollected from this week’s completed jobs?"',
      result: 'Found 8 unbilled work orders (£4,200). 1-click generated itemized invoices and sent payment links.',
    },
  },
  {
    id: 'growth',
    title: 'AI Growth Manager',
    role: 'Customer Retention & Review Engine',
    tagline: 'Brings customers back and drives 5-star Google reputation automatically.',
    status: 'Review Funnel Active',
    icon: TrendingUp,
    accentColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    capabilities: [
      'Dispatches review requests 30 mins after job sign-off',
      'Re-engages dormant clients with seasonal maintenance offers',
      'Monitors customer satisfaction and alerts on negative feedback',
    ],
    livePromptExample: {
      prompt: '"Send review requests to all 14 clients serviced yesterday."',
      result: 'Dispatched 14 SMS review links · 9 five-star Google reviews captured within 3 hours.',
    },
  },
  {
    id: 'analyst',
    title: 'AI Business Analyst',
    role: 'Executive Intelligence & Margins',
    tagline: 'Answers complex financial and operational questions about your business.',
    status: 'Margin Yields Synced',
    icon: BarChart3,
    accentColor: 'text-rose-600 dark:text-rose-400',
    badgeBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    capabilities: [
      'Calculates real technician gross margins and hourly yields',
      'Tracks lead-to-job conversion rates across marketing channels',
      'Forecasts next month’s material and equipment demands',
    ],
    livePromptExample: {
      prompt: '"Which trade service had the highest profit margin last month?"',
      result: 'Roof repairs delivered 62% gross margin (£24,800 profit), compared to boiler replacements at 38%.',
    },
  },
];

export function AiTeamShowcase() {
  const [selectedTeammateId, setSelectedTeammateId] = useState('command');

  return (
    <section className="py-20 bg-slate-50 text-slate-900 border-b border-border dark:bg-slate-950 dark:text-white dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs font-semibold">
            <Bot className="size-3.5" />
            <span>SPECIALIZED AI TEAMMATES</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground dark:text-white leading-tight">
            Your business doesn&apos;t need another chatbot.{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              It needs an AI team.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Meet your 6 autonomous AI teammates. Each is a specialist trained in trade business workflows, scheduling algorithms, and revenue collection.
          </p>
        </div>

        {/* 6 Teammate Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AI_TEAM.map((teammate) => {
            const IconComponent = teammate.icon;
            const isSelected = selectedTeammateId === teammate.id;

            return (
              <div
                key={teammate.id}
                onClick={() => setSelectedTeammateId(teammate.id)}
                className={cn(
                  'p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-5 cursor-pointer',
                  isSelected
                    ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-xl dark:bg-slate-900 dark:border-teal-500/80 dark:ring-teal-500/30'
                    : 'bg-card border-border hover:border-slate-300 hover:bg-white/80 shadow-xs dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/60'
                )}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={cn('size-11 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-center shadow-xs', teammate.accentColor)}>
                      <IconComponent className="size-5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Badge variant="outline" className={cn('text-[10px] font-bold border', teammate.badgeBg)}>
                        {teammate.role}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-black text-foreground dark:text-white">{teammate.title}</h3>
                      <span className="text-[10px] text-muted-foreground font-mono">{teammate.status}</span>
                    </div>
                    <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 leading-relaxed">
                      {teammate.tagline}
                    </p>
                  </div>

                  {/* Capabilities */}
                  <ul className="space-y-2 pt-2 border-t border-border dark:border-slate-800/80">
                    {teammate.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <Check className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Example Interaction Box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-border dark:border-slate-800/90 text-[11px] space-y-1.5 shadow-xs">
                  <p className="text-[9px] uppercase tracking-wider font-bold text-muted-foreground dark:text-slate-400">Live Execution:</p>
                  <p className="font-mono text-foreground dark:text-slate-200">{teammate.livePromptExample.prompt}</p>
                  <p className="text-teal-700 dark:text-teal-400 font-bold">{teammate.livePromptExample.result}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
