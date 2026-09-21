'use client';

import React from 'react';
import {
  MessageCircle,
  CalendarCheck,
  FileCheck2,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function AgentExtract() {
  return (
    <section id="agent" className="section-pad bg-muted/40 relative overflow-hidden">
      <div className="page-shell grid items-center gap-12 lg:grid-cols-2">
        <div>
          <p className="eyebrow text-emerald-600 font-bold">AI FORM AGENT &amp; EXTRACTION ENGINE</p>
          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Customers never repeat what they already told you.
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
            GPTForm listens to the conversation in natural language, extracts structured lead parameters in real time, and pre-populates your booking flow and CRM pipeline.
          </p>

          <div className="mt-8 space-y-4">
            {[
              {
                icon: MessageCircle,
                title: 'Understands natural customer descriptions',
                desc: 'Processes freeform language, voice dictation, and messy symptoms without rigid input fields.',
              },
              {
                icon: CalendarCheck,
                title: 'Offers real-time availability slots',
                desc: 'Directly checks technician or clinic calendars and presents matching times instant.',
              },
              {
                icon: FileCheck2,
                title: 'Pre-fills connected CRM lead cards',
                desc: 'Generates zero-retype forms with verified addresses, phone numbers, and calculated estimates.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                  <Icon className="size-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-foreground">{title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comparison Showcase Container */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Card 1: Raw Conversation */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="size-3 text-muted-foreground" /> Customer Conversation
              </span>
              <Badge variant="outline" className="text-[9px]">Raw Transcript</Badge>
            </div>
            <div className="space-y-3 text-xs">
              <div className="rounded-xl bg-muted p-3 text-foreground leading-relaxed">
                “Hi! I need a dental check-up and clean next week, preferably Tuesday morning with Dr. Mitchell.”
              </div>
              <div className="ml-auto max-w-[85%] rounded-xl bg-emerald-600 p-3 text-white leading-relaxed font-medium">
                “Tuesday at 10:30 AM is available with Dr. Mitchell. Shall I reserve it for you?”
              </div>
              <div className="rounded-xl bg-muted p-3 text-foreground leading-relaxed">
                “Yes please, lock in 10:30 AM for Gurinder Singh.”
              </div>
            </div>
          </div>

          {/* Card 2: Structured CRM Lead Data */}
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3 mb-4">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="size-3 text-emerald-600" /> Structured CRM Record
              </span>
              <Badge className="bg-emerald-600 text-white text-[9px]">Verified</Badge>
            </div>
            <div className="space-y-3 text-xs">
              {[
                ['Customer Name', 'Gurinder Singh'],
                ['Service Type', 'Dental Check-up & Clean'],
                ['Assigned Doctor', 'Dr. Sarah Mitchell, DDS'],
                ['Locked Timeslot', 'Tuesday · 10:30 AM'],
                ['Triage Priority', 'High / Preferred Slot'],
                ['Status', 'Verified Submission'],
              ].map(([key, val]) => (
                <div key={key} className="flex items-center justify-between border-b border-emerald-500/10 pb-2">
                  <span className="text-muted-foreground text-[11px]">{key}</span>
                  <span className="font-bold text-foreground">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
