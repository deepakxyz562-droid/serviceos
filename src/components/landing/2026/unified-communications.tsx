'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  Mail,
  Phone,
  Smartphone,
  Globe,
  Sparkles,
  Send,
  CheckCircle2,
  ArrowRight,
  Calendar,
  Wrench,
  UserCheck,
  Inbox,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Channel = 'sms' | 'whatsapp' | 'email' | 'chat' | 'call';

interface ChannelTab {
  id: Channel;
  label: string;
  icon: typeof MessageSquare;
  accent: string;
  bg: string;
  border: string;
  customerMessage: string;
  customerTime: string;
  aiResponse: string;
  aiAction: string;
  crmAction: string;
}

const CHANNELS: ChannelTab[] = [
  {
    id: 'sms',
    label: 'SMS',
    icon: Smartphone,
    accent: 'text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/30',
    customerMessage: 'Can someone come earlier? My boiler is leaking.',
    customerTime: '10:24 AM',
    aiResponse: 'Yes — Mike has an opening at 2:30 PM. Would you like me to offer it?',
    aiAction: 'Detected urgency: leak. Checking technician calendar…',
    crmAction: 'Job #4829 rescheduled → 2:30 PM',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageSquare,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    customerMessage: 'Hi, is the quote ready? You said you\'d send it today.',
    customerTime: '11:02 AM',
    aiResponse: 'The £350 quote is ready. Sending you the e-sign link now — tap to approve.',
    aiAction: 'Generated quote PDF + deposit checkout link.',
    crmAction: 'Quote #Q-8924 sent · £500 deposit requested',
  },
  {
    id: 'email',
    label: 'Email',
    icon: Mail,
    accent: 'text-amber-400',
    bg: 'bg-amber-500/20',
    border: 'border-amber-500/30',
    customerMessage: 'Following up on the invoice from last week — can I pay online?',
    customerTime: 'Yesterday 4:15 PM',
    aiResponse: 'Yes — here\'s your secure payment link. Your invoice is £480 with 0% platform fee.',
    aiAction: 'Matched invoice #INV-7820 to customer record.',
    crmAction: 'Payment link dispatched · 0% commission',
  },
  {
    id: 'chat',
    label: 'Web Chat',
    icon: Globe,
    accent: 'text-teal-400',
    bg: 'bg-teal-500/20',
    border: 'border-teal-500/30',
    customerMessage: 'Do you do emergency callouts on weekends?',
    customerTime: 'Just now',
    aiResponse: 'Yes — our AI Receptionist books weekend emergencies 24/7. What\'s the issue?',
    aiAction: 'Captured lead source: website chat widget.',
    crmAction: 'New lead created → routed to AI Receptionist',
  },
  {
    id: 'call',
    label: 'Calls',
    icon: Phone,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/30',
    customerMessage: 'Inbound call: "My basement pipe burst and water is everywhere!"',
    customerTime: '9:47 AM',
    aiResponse: 'Triaged as Emergency. Nearest on-call plumber dispatched. £120 diagnostic pre-authorized.',
    aiAction: 'Voice AI classified urgency + captured address.',
    crmAction: 'Emergency job created · tech en route',
  },
];

export function UnifiedCommunications({ onGetStarted }: { onGetStarted?: () => void }) {
  const [activeChannel, setActiveChannel] = useState<Channel>('sms');
  const current = CHANNELS.find((c) => c.id === activeChannel) || CHANNELS[0];
  const ChannelIcon = current.icon;

  return (
    <section className="py-20 bg-background text-foreground border-b border-border dark:bg-slate-950 dark:text-white dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-semibold">
            <Inbox className="size-3.5" />
            <span>UNIFIED COMMUNICATIONS</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Every customer conversation.{' '}
            <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-teal-400 dark:from-teal-400 dark:via-emerald-400 dark:to-teal-300 bg-clip-text text-transparent">
              One place.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            SMS, WhatsApp, email, web chat, and AI voice calls — all in one shared inbox. Every message can trigger a real CRM action, not just a reply.
          </p>
        </div>

        {/* Channel Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-3xl mx-auto">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isActive = activeChannel === channel.id;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveChannel(channel.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border ${
                  isActive
                    ? 'bg-teal-500 text-slate-950 border-teal-400 shadow-lg ring-2 ring-teal-500/30'
                    : 'bg-card border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
              >
                <Icon className="size-3.5" />
                <span>{channel.label}</span>
              </button>
            );
          })}
        </div>

        {/* Inbox Demo */}
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-700 bg-card text-card-foreground shadow-2xl overflow-hidden">
          {/* Inbox window chrome */}
          <div className="bg-slate-100 dark:bg-slate-900/90 px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="size-2.5 rounded-full bg-rose-500/80" />
                <div className="size-2.5 rounded-full bg-amber-500/80" />
                <div className="size-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 ml-2 flex items-center gap-1.5">
                <Inbox className="size-3.5 text-teal-600 dark:text-teal-400" /> Unified Inbox · {current.label}
              </span>
            </div>
            <Badge variant="outline" className={`text-[10px] ${current.border} ${current.accent} ${current.bg}`}>
              ● Live
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Conversation thread (8 cols) */}
            <div className="lg:col-span-8 p-5 sm:p-7 space-y-4 border-r border-slate-200 dark:border-slate-800">
              {/* Customer message */}
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shrink-0 text-xs font-bold">
                  SW
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">Sarah Williams</span>
                    <span className="text-[10px] text-slate-500">{current.customerTime}</span>
                  </div>
                  <div className="inline-block p-3 rounded-2xl rounded-tl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 text-sm max-w-md">
                    {current.customerMessage}
                  </div>
                </div>
              </div>

              {/* AI synthesis note */}
              <div className="ml-11 p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <Sparkles className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-teal-600 dark:text-teal-400">AI Engine:</span>{' '}
                  {current.aiAction}
                </div>
              </div>

              {/* Fieseros response */}
              <div className="flex items-start gap-3 flex-row-reverse">
                <div className={`size-8 rounded-lg ${current.bg} ${current.accent} flex items-center justify-center shrink-0`}>
                  <ChannelIcon className="size-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] text-slate-500">just now</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Fieseros AI</span>
                  </div>
                  <div className={`inline-block p-3 rounded-2xl rounded-tr-md ${current.bg} ${current.border} border text-slate-900 dark:text-slate-100 text-sm max-w-md text-left`}>
                    {current.aiResponse}
                  </div>
                </div>
              </div>

              {/* CRM action confirmation */}
              <div className="ml-11 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">CRM Action Executed</p>
                  <p className="text-xs text-emerald-900 dark:text-emerald-200 font-semibold">{current.crmAction}</p>
                </div>
              </div>

              {/* Reply composer (visual only) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <div className="flex-1 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                  Type a message or let AI draft it…
                </div>
                <Button
                  type="button"
                  className="h-9 w-9 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 p-0 cursor-pointer"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>

            {/* Side panel: CRM context (4 cols) */}
            <div className="lg:col-span-4 p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">Customer Context</p>
                <div className="p-3 rounded-xl bg-card border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="size-9 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                      SW
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">Sarah Williams</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">48 King Road, London</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px]">
                    <Badge className="bg-teal-500/15 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-500/30 text-[9px] font-bold">3 Past Jobs</Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">Warranty Active</Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-2">Related Records</p>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Calendar className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white">Job #4829</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Boiler repair · Tomorrow 10 AM</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <Wrench className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white">Tech: Mike Vance</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Gas Safe · Tier 3</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-900 dark:text-white">£350 Quote</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">Sent · Awaiting sign</p>
                    </div>
                  </div>
                </div>
              </div>

              {onGetStarted && (
                <Button
                  onClick={onGetStarted}
                  variant="outline"
                  className="w-full h-9 rounded-xl border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 dark:hover:bg-teal-950/40 font-bold text-xs gap-2 cursor-pointer"
                >
                  Try Unified Inbox <ArrowRight className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
