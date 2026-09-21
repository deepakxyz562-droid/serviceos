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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AiTeammate {
  id: string;
  title: string;
  role: string;
  tagline: string;
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
    icon: Sparkles,
    accentColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
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
    icon: PhoneCall,
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
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
    icon: MapPin,
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
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
    icon: PoundSterling,
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
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
    icon: TrendingUp,
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
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
    icon: BarChart3,
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
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
  const activeTeammate = AI_TEAM.find((t) => t.id === selectedTeammateId) || AI_TEAM[0];
  const ActiveIcon = activeTeammate.icon;

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
                className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-5 cursor-pointer ${
                  isSelected
                    ? 'bg-white border-teal-500 ring-2 ring-teal-500/20 shadow-xl dark:bg-slate-900 dark:border-teal-500/80 dark:ring-teal-500/30'
                    : 'bg-card border-border hover:border-slate-300 hover:bg-white/80 shadow-xs dark:bg-slate-950 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-900/60'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`size-11 rounded-2xl bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 flex items-center justify-center ${teammate.accentColor}`}>
                      <IconComponent className="size-6" />
                    </div>
                    <Badge variant="outline" className={`text-[10px] font-bold ${teammate.badgeBg}`}>
                      {teammate.role}
                    </Badge>
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-foreground dark:text-white">{teammate.title}</h3>
                    <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1 leading-relaxed">
                      {teammate.tagline}
                    </p>
                  </div>

                  {/* Capabilities */}
                  <ul className="space-y-2 pt-2 border-t border-border dark:border-slate-800/80">
                    {teammate.capabilities.map((cap, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <CheckCircle2 className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                        <span>{cap}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Example Interaction Box */}
                <div className="p-3 rounded-2xl bg-muted/60 border border-border dark:bg-slate-950/80 dark:border-slate-800/90 text-[11px] space-y-1.5">
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
