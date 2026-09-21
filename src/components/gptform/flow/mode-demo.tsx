'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  LayoutGrid,
  CreditCard,
  MessageSquare,
  CheckCircle2,
  Send,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ModeDemo() {
  const [mode, setMode] = useState<'Classic' | 'Card' | 'Conversational' | 'AI Agent'>('AI Agent');
  const [selectedCardOption, setSelectedCardOption] = useState('Routine Check-up & Clean');
  const [agentInputText, setAgentInputText] = useState(
    'I’ve had a cracked back tooth with mild pain since yesterday, and need Dr. Mitchell this Tuesday morning.'
  );

  const modes: Array<{ id: 'Classic' | 'Card' | 'Conversational' | 'AI Agent'; label: string; icon: typeof LayoutGrid }> = [
    { id: 'Classic', label: 'Classic Grid Form', icon: LayoutGrid },
    { id: 'Card', label: 'Step Card Stepper', icon: CreditCard },
    { id: 'Conversational', label: 'Conversational Chat', icon: MessageSquare },
    { id: 'AI Agent', label: 'AI Natural Language Agent', icon: Bot },
  ];

  return (
    <div>
      {/* 4 Mode Selector */}
      <div className="mx-auto mb-8 flex max-w-2xl overflow-x-auto rounded-xl border border-border bg-muted/60 p-1.5 shadow-xs">
        {modes.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setMode(item.id)}
              className={cn(
                'flex items-center justify-center gap-2 flex-1 min-w-max rounded-lg px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer',
                mode === item.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
              )}
            >
              <Icon className={cn('size-4', mode === item.id ? 'text-emerald-600' : 'opacity-70')} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Runtime Container Frame */}
      <div className="mx-auto grid min-h-[420px] max-w-4xl place-items-center rounded-2xl border border-border bg-surface-soft p-5 sm:p-10 shadow-inner">
        <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xl animate-scale-in" key={mode}>
          {/* Header */}
          <div className="mb-6 flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Harbour Dental Clinic</p>
              <h3 className="mt-1 font-display text-xl sm:text-2xl font-bold text-foreground">New Patient Intake &amp; Booking</h3>
            </div>
            <Badge variant="outline" className="text-xs font-semibold px-3 py-1 bg-muted">
              {mode} Experience
            </Badge>
          </div>

          {/* MODE 1: Classic Grid */}
          {mode === 'Classic' && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">Full Name</label>
                  <input
                    type="text"
                    defaultValue="Gurinder Singh"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">Email Address</label>
                  <input
                    type="email"
                    defaultValue="gurinder@example.com"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">Treatment Needed</label>
                  <select className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600">
                    <option>Tooth Sensitivity / Pain</option>
                    <option>Routine Check-up &amp; Clean</option>
                    <option>Orthodontic Consultation</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-foreground">Preferred Appointment</label>
                  <input
                    type="text"
                    defaultValue="Tuesday 10:30 AM"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                  />
                </div>
              </div>
              <Button className="mt-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 cursor-pointer">
                Submit Patient Registration <ArrowRight className="size-3.5 ml-1.5" />
              </Button>
            </div>
          )}

          {/* MODE 2: Card Stepper */}
          {mode === 'Card' && (
            <div className="py-4 text-center animate-fade-in">
              <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Step 2 of 4 · Treatment</span>
              <p className="mt-2 text-lg sm:text-xl font-bold text-foreground">What primary care do you need today?</p>
              <div className="mx-auto mt-5 max-w-md space-y-2.5 text-left">
                {[
                  'Tooth Sensitivity / Emergency Pain',
                  'Routine Check-up & Clean',
                  'Cosmetic & Whitening',
                  'Invisalign Consultation',
                ].map((option) => (
                  <div
                    key={option}
                    onClick={() => setSelectedCardOption(option)}
                    className={cn(
                      'rounded-xl border p-3.5 text-xs font-semibold transition-all cursor-pointer flex items-center justify-between',
                      selectedCardOption === option
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-xs'
                        : 'border-border bg-background text-foreground hover:border-foreground/30'
                    )}
                  >
                    <span>{option}</span>
                    {selectedCardOption === option && <CheckCircle2 className="size-4 text-emerald-600" />}
                  </div>
                ))}
              </div>
              <div className="mx-auto mt-6 max-w-md flex gap-3">
                <Button variant="outline" className="flex-1 text-xs h-9 cursor-pointer">
                  Back
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 cursor-pointer">
                  Continue to Calendar <ArrowRight className="size-3 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* MODE 3: Conversational Chat */}
          {mode === 'Conversational' && (
            <div className="space-y-3.5 py-2 animate-fade-in">
              <div className="flex gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                  <Bot className="size-4" />
                </div>
                <div className="max-w-md rounded-2xl rounded-tl-sm bg-muted p-3.5 text-xs leading-relaxed text-foreground">
                  Hello Gurinder! I can lock in your dental slot right now. What kind of appointment are you looking for?
                </div>
              </div>

              <div className="flex justify-end">
                <div className="max-w-sm rounded-2xl rounded-tr-sm bg-emerald-600 p-3.5 text-xs text-white leading-relaxed font-medium shadow-xs">
                  I have tooth sensitivity on my upper left molar and would prefer Tuesday morning.
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="grid size-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                  <Bot className="size-4" />
                </div>
                <div className="max-w-md rounded-2xl rounded-tl-sm bg-muted p-3.5 text-xs leading-relaxed text-foreground">
                  Understood. Dr. Sarah Mitchell has an opening on Tuesday at 10:30 AM. Shall I reserve this for you?
                </div>
              </div>

              <div className="flex gap-2 pl-10 pt-1">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer">
                  Confirm Tuesday 10:30 AM
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-8 cursor-pointer">
                  View other times
                </Button>
              </div>
            </div>
          )}

          {/* MODE 4: AI Agent Natural Language Extractor */}
          {mode === 'AI Agent' && (
            <div className="grid gap-5 sm:grid-cols-2 animate-fade-in items-start">
              <div className="rounded-xl bg-muted/60 p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Bot className="size-3 text-purple-600" /> Natural Language Intake
                  </span>
                  <span className="text-[10px] text-emerald-600 font-semibold">Live Parser</span>
                </div>
                <textarea
                  value={agentInputText}
                  onChange={(e) => setAgentInputText(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border bg-background p-2.5 text-xs leading-relaxed text-foreground outline-none focus:border-purple-500"
                />
                <p className="text-[10px] text-muted-foreground mt-2">
                  Customer simply speaks or types in plain English.
                </p>
              </div>

              <div className="space-y-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-xs">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="size-3 text-emerald-600" />
                    Structured Automatically
                  </span>
                  <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0">99.8% Match</Badge>
                </div>
                <div className="space-y-1.5 pt-1">
                  <p className="text-foreground">
                    <span className="font-bold text-muted-foreground">Primary Concern:</span> Cracked back tooth / Pain
                  </p>
                  <p className="text-foreground">
                    <span className="font-bold text-muted-foreground">Preferred Doctor:</span> Dr. Sarah Mitchell
                  </p>
                  <p className="text-foreground">
                    <span className="font-bold text-muted-foreground">Time Window:</span> Tuesday Morning (10:30 AM)
                  </p>
                  <p className="text-foreground">
                    <span className="font-bold text-muted-foreground">Triage Priority:</span> High (Emergency Slot Offered)
                  </p>
                </div>
                <div className="pt-2 border-t border-emerald-500/20">
                  <Button size="sm" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 cursor-pointer">
                    Book &amp; Dispatch to CRM
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
