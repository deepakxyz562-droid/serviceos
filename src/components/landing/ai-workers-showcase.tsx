'use client';

import * as React from 'react';
import {
  Bot,
  PhoneCall,
  Send,
  Wrench,
  FileCheck2,
  Sparkles,
  Check,
  ArrowRight,
  Headphones,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface AIWorker {
  id: string;
  name: string;
  role: string;
  headline: string;
  description: string;
  icon: React.ElementType;
  liveAction: string;
  details: string[];
}

export const AI_WORKERS: AIWorker[] = [
  {
    id: 'receptionist',
    name: 'Riley',
    role: 'AI Receptionist',
    headline: 'Answers every call 24/7, qualifies requests & books jobs',
    description: 'Never lose a high-value emergency job because the phone rang after 6 PM or while your team was on a ladder.',
    icon: PhoneCall,
    liveAction: 'Answers incoming call ➔ Qualifies boiler issue ➔ Checks calendar ➔ Books 10:30 AM slot ➔ Creates CRM lead',
    details: [
      '24/7 instant voice call answering with zero hold time',
      'Knowledge-based Q&A using your custom services and pricing rules',
      'Live appointment booking synced with Google Calendar',
      'Instant SMS confirmation sent to the customer',
    ],
  },
  {
    id: 'dispatcher',
    name: 'Dispatch AI',
    role: 'Smart Auto-Dispatcher',
    headline: 'Matches the nearest qualified technician to every job',
    description: 'Optimizes driving routes, eliminates empty miles, and dispatches emergencies in seconds.',
    icon: Send,
    liveAction: 'Analyzes 12 technicians ➔ Selects Dave M. (nearest + gas safe certified) ➔ Routes turn-by-turn GPS',
    details: [
      'Proximity-based dispatching with live technician GPS',
      'Skill and certification matching per trade',
      'Real-time traffic route optimization',
      'Automatic customer arrival ETA broadcasts',
    ],
  },
  {
    id: 'jobscribe',
    name: 'JobScribe AI',
    role: 'On-Site Documentation & Scribe',
    headline: 'Turns messy field voice notes into polished customer invoices',
    description: 'Technicians speak into their phone on site; JobScribe drafts itemized line items, descriptions, and summaries.',
    icon: FileCheck2,
    liveAction: 'Tech says: "Replaced 2-inch valve seal, pressure tested to 1.5 bar" ➔ Drafts itemized invoice in 3 seconds',
    details: [
      'Instant voice-to-invoice line item extraction',
      'Professional scope descriptions for customer approvals',
      'Before/after photo tagging and captioning',
      'Automated safety and compliance checklist verification',
    ],
  },
  {
    id: 'campaign',
    name: 'Campaign & Recall AI',
    role: 'Automated Retention Assistant',
    headline: 'Brings previous customers back for annual maintenance',
    description: 'Watches your customer history to trigger timely seasonal service reminders and collect 5-star Google reviews.',
    icon: MessageSquare,
    liveAction: '11 months after install ➔ Sends personalized annual service SMS ➔ Customer clicks & books in 30 seconds',
    details: [
      'Automated review requests after job sign-off',
      'Seasonal maintenance campaigns (boiler, AC, guttering)',
      'Lapsed customer re-engagement follow-ups',
      'Zero manual marketing effort required',
    ],
  },
];

export function AiWorkersShowcase() {
  const [selectedWorkerId, setSelectedWorkerId] = React.useState('receptionist');
  const selectedWorker = AI_WORKERS.find((w) => w.id === selectedWorkerId) || AI_WORKERS[0];
  const Icon = selectedWorker.icon;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1">
          <Bot className="w-3.5 h-3.5 mr-1.5" /> AI Workers (Not Just a Chatbot)
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Meet the AI team inside your business
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          Dedicated AI workers integrated directly into calls, dispatch, field notes, and customer retention.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {AI_WORKERS.map((worker) => {
          const isSelected = worker.id === selectedWorkerId;
          const WorkerIcon = worker.icon;

          return (
            <button
              key={worker.id}
              onClick={() => setSelectedWorkerId(worker.id)}
              className={cn(
                'flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer',
                isSelected
                  ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/30'
                  : 'bg-card/60 border-border/70 text-muted-foreground hover:bg-muted/40 hover:text-foreground'
              )}
            >
              <div
                className={cn(
                  'w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-sm font-semibold',
                  isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                )}
              >
                <WorkerIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold truncate text-foreground">{worker.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{worker.role}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Worker Spotlight Card */}
      <div className="rounded-2xl border border-border/80 bg-card/80 backdrop-blur-sm p-6 sm:p-8 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/15 text-primary border-primary/30 text-xs font-semibold px-2.5 py-0.5">
                {selectedWorker.role}
              </Badge>
              <span className="text-xs text-muted-foreground font-medium">Active in Fieseros OS</span>
            </div>

            <h4 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
              {selectedWorker.headline}
            </h4>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {selectedWorker.description}
            </p>

            <div className="space-y-2.5 pt-2">
              {selectedWorker.details.map((detail, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs text-foreground/90 font-medium">
                  <div className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  <span>{detail}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-xl border border-border/80 bg-background p-5 shadow-md space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-foreground">Live Worker Execution</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">Real-time</span>
              </div>

              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-1.5">
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">Simulated Trigger</span>
                <p className="text-xs text-foreground font-medium leading-snug">
                  {selectedWorker.liveAction}
                </p>
              </div>

              <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1">
                <span>Autonomous execution</span>
                <span className="text-foreground font-semibold">Zero manual entry</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
