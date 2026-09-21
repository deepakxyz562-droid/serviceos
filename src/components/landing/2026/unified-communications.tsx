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
  Check,
  Clock,
  Shield,
  Bot,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Channel = 'sms' | 'whatsapp' | 'email' | 'chat' | 'call';

interface ChannelTab {
  id: Channel;
  label: string;
  customerName: string;
  avatar: string;
  icon: typeof MessageSquare;
  accent: string;
  bg: string;
  border: string;
  badgeBg: string;
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
    customerName: 'Sarah Williams',
    avatar: 'SW',
    icon: Smartphone,
    accent: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    badgeBg: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300',
    customerMessage: 'Can someone come earlier? My boiler is leaking.',
    customerTime: '10:24 AM',
    aiResponse: 'Yes — Mike has an opening at 2:30 PM. Would you like me to offer it?',
    aiAction: 'Detected urgency: leak. Checking technician calendar…',
    crmAction: 'Job #4829 rescheduled → 2:30 PM',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    customerName: 'Marcus Vance',
    avatar: 'MV',
    icon: MessageSquare,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300',
    customerMessage: 'Hi, is the quote ready? You said you\'d send it today.',
    customerTime: '11:02 AM',
    aiResponse: 'The £350 quote is ready. Sending you the e-sign link now — tap to approve.',
    aiAction: 'Generated quote PDF + deposit checkout link.',
    crmAction: 'Quote #Q-8924 sent · £500 deposit requested',
  },
  {
    id: 'email',
    label: 'Email',
    customerName: 'Emma Richardson',
    avatar: 'ER',
    icon: Mail,
    accent: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    badgeBg: 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300',
    customerMessage: 'Following up on the invoice from last week — can I pay online?',
    customerTime: 'Yesterday 4:15 PM',
    aiResponse: 'Yes — here\'s your secure payment link. Your invoice is £480 with 0% platform fee.',
    aiAction: 'Matched invoice #INV-7820 to customer record.',
    crmAction: 'Payment link dispatched · 0% commission',
  },
  {
    id: 'chat',
    label: 'Web Chat',
    customerName: 'James Thorne',
    avatar: 'JT',
    icon: Globe,
    accent: 'text-teal-600 dark:text-teal-400',
    bg: 'bg-teal-50 dark:bg-teal-950/40',
    border: 'border-teal-200 dark:border-teal-800',
    badgeBg: 'bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300',
    customerMessage: 'Do you do emergency callouts on weekends?',
    customerTime: 'Just now',
    aiResponse: 'Yes — our AI Receptionist books weekend emergencies 24/7. What\'s the issue?',
    aiAction: 'Captured lead source: website chat widget.',
    crmAction: 'New lead created → routed to AI Receptionist',
  },
  {
    id: 'call',
    label: 'Calls',
    customerName: 'Apex Properties',
    avatar: 'AP',
    icon: Phone,
    accent: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300',
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

        {/* LiveChat-style Omnichannel Switcher Bar */}
        <div className="flex items-center justify-start sm:justify-center overflow-x-auto pb-2 scrollbar-none gap-2 max-w-4xl mx-auto">
          {CHANNELS.map((channel) => {
            const Icon = channel.icon;
            const isActive = activeChannel === channel.id;
            return (
              <button
                key={channel.id}
                type="button"
                onClick={() => setActiveChannel(channel.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-xs whitespace-nowrap',
                  isActive
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-teal-600 dark:border-teal-500 shadow-md ring-2 ring-teal-500/20'
                    : 'bg-card text-slate-700 dark:text-slate-300 border-border hover:bg-slate-100 dark:hover:bg-slate-900'
                )}
              >
                <Icon className={cn('size-3.5', isActive ? 'text-teal-400' : 'text-teal-600 dark:text-teal-400')} />
                <span>{channel.label}</span>
              </button>
            );
          })}
        </div>

        {/* Inbox Demo */}
        <div className="max-w-5xl mx-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-card text-card-foreground shadow-2xl overflow-hidden">
          {/* Inbox window chrome */}
          <div className="bg-slate-100/90 dark:bg-slate-900/90 px-4 sm:px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
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
            <Badge variant="outline" className={cn('text-[10px] font-semibold border', current.border, current.accent, current.bg)}>
              ● Live Omnichannel Sync
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Conversation thread (8 cols) */}
            <div className="lg:col-span-8 p-5 sm:p-7 space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
              {/* Customer message */}
              <div className="flex items-start gap-3">
                <div className="size-8 rounded-xl bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
                  {current.avatar}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">{current.customerName}</span>
                    <span className="text-[10px] text-muted-foreground">{current.customerTime}</span>
                    <Badge variant="outline" className={cn('text-[9px] px-1.5 py-0', current.badgeBg)}>
                      via {current.label}
                    </Badge>
                  </div>
                  <div className="inline-block p-3.5 rounded-2xl rounded-tl-md bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 text-sm max-w-md shadow-xs leading-relaxed">
                    {current.customerMessage}
                  </div>
                </div>
              </div>

              {/* AI synthesis note */}
              <div className="ml-11 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-[11px] text-muted-foreground flex items-start gap-2">
                <Sparkles className="size-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-foreground">AI Copilot Analysis:</span>{' '}
                  {current.aiAction}
                </div>
              </div>

              {/* Fieseros response */}
              <div className="flex items-start gap-3 flex-row-reverse">
                <div className={cn('size-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs', current.bg, current.accent)}>
                  <ChannelIcon className="size-4" />
                </div>
                <div className="flex-1 min-w-0 space-y-1 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-[10px] text-muted-foreground">Automated in 0.3s</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">Fieseros AI</span>
                  </div>
                  <div className={cn('inline-block p-3.5 rounded-2xl rounded-tr-md border text-foreground text-sm max-w-md text-left shadow-xs leading-relaxed', current.bg, current.border)}>
                    {current.aiResponse}
                  </div>
                </div>
              </div>

              {/* CRM action confirmation */}
              <div className="ml-11 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400">CRM Action Executed</p>
                  <p className="text-xs text-emerald-950 dark:text-emerald-200 font-semibold">{current.crmAction}</p>
                </div>
              </div>

              {/* Reply composer (visual preview) */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <div className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-muted-foreground">
                  Type a response or let AI draft and execute…
                </div>
                <Button
                  type="button"
                  className="h-10 w-10 rounded-xl bg-teal-600 hover:bg-teal-700 text-white p-0 cursor-pointer shadow-xs"
                  aria-label="Send"
                >
                  <Send className="size-4" />
                </Button>
              </div>
            </div>

            {/* Side panel: CRM context (4 cols) */}
            <div className="lg:col-span-4 p-5 sm:p-6 bg-slate-50/60 dark:bg-slate-900/40 space-y-4">
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Customer Context</p>
                <div className="p-3.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs">
                      {current.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{current.customerName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">48 King Road, London</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <Badge className="bg-teal-500/15 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-500/30 text-[9px] font-bold">3 Past Jobs</Badge>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 text-[9px] font-bold">Warranty Active</Badge>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">Linked Records</p>
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
                    <Calendar className="size-4 text-teal-600 dark:text-teal-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground">Job #4829</p>
                      <p className="text-[10px] text-muted-foreground">Boiler repair · Tomorrow 10 AM</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
                    <Wrench className="size-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground">Tech: Mike Vance</p>
                      <p className="text-[10px] text-muted-foreground">Gas Safe · Tier 3</p>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-card border border-slate-200 dark:border-slate-800 flex items-center gap-2.5 shadow-xs">
                    <UserCheck className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-foreground">£350 Quote</p>
                      <p className="text-[10px] text-muted-foreground">Sent · Awaiting sign</p>
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
