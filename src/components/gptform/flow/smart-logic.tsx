'use client';

import React, { useState } from 'react';
import {
  Type,
  Mail,
  Phone,
  CheckSquare,
  Camera,
  FileText,
  PenTool,
  Calendar,
  CreditCard,
  Calculator,
  Bot,
  Sparkles,
  GitBranch,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const FIELD_PALETTE = [
  { name: 'Short & Long Text', icon: Type, type: 'Input' },
  { name: 'Verified Email', icon: Mail, type: 'Validation' },
  { name: 'SMS Phone (OTP)', icon: Phone, type: 'Validation' },
  { name: 'Multiple Choice', icon: CheckSquare, type: 'Selection' },
  { name: 'Photo & Damage Upload', icon: Camera, type: 'Media' },
  { name: 'Document / PDF', icon: FileText, type: 'Media' },
  { name: 'Digital E-Signature', icon: PenTool, type: 'Legal' },
  { name: 'Live Calendar Booking', icon: Calendar, type: 'Booking' },
  { name: 'Stripe / 0% Fee Payout', icon: CreditCard, type: 'Payment' },
  { name: 'Dynamic Price Formula', icon: Calculator, type: 'Math' },
  { name: 'AI Clarifying Question', icon: Bot, type: 'AI' },
  { name: 'AI Summary & Triage', icon: Sparkles, type: 'AI' },
];

export function SmartLogic() {
  const [activeRuleTab, setActiveRuleTab] = useState<'emergency' | 'discount' | 'dispatch'>('emergency');

  const rulesData = {
    emergency: [
      { tag: 'IF', text: 'Treatment or Repair Issue is flagged "Emergency / Active Leak"', color: 'bg-purple-600 text-white' },
      { tag: 'THEN', text: 'Require Photo Upload of damaged area + Emergency Contact Number', color: 'bg-emerald-400 text-slate-950' },
      { tag: 'AND', text: 'Set CRM Priority to "CRITICAL — Dispatch Within 60 Mins"', color: 'bg-emerald-400 text-slate-950' },
      { tag: 'AND', text: 'Collect £89 Diagnostic Hold via Stripe Authorization Link', color: 'bg-emerald-400 text-slate-950' },
    ],
    discount: [
      { tag: 'IF', text: 'Service Frequency selected is "Weekly or Bi-Weekly Subscription"', color: 'bg-purple-600 text-white' },
      { tag: 'THEN', text: 'Apply 20% Recurring Rate Discount to calculated subtotal', color: 'bg-emerald-400 text-slate-950' },
      { tag: 'AND', text: 'Offer Free Re-clean Guarantee badge on final checkout card', color: 'bg-emerald-400 text-slate-950' },
      { tag: 'AND', text: 'Auto-enroll customer into VIP Maintenance Reminder SMS', color: 'bg-emerald-400 text-slate-950' },
    ],
    dispatch: [
      { tag: 'IF', text: 'Customer Postcode is within "Zone 1 Premium Coverage Area"', color: 'bg-purple-600 text-white' },
      { tag: 'THEN', text: 'Assign Senior Certified Specialist (Technician #3 — Dave)', color: 'bg-emerald-400 text-slate-950' },
      { tag: 'AND', text: 'Calculate travel buffer time and lock arrival window', color: 'bg-emerald-400 text-slate-950' },
      { tag: 'AND', text: 'Send live technician GPS tracking SMS upon departure', color: 'bg-emerald-400 text-slate-950' },
    ],
  };

  return (
    <section className="section-pad bg-background">
      <div className="page-shell">
        <div className="section-heading max-w-3xl mb-12">
          <p className="eyebrow text-emerald-600 font-bold">SMART BUSINESS LOGIC &amp; FIELD ENGINE</p>
          <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Forms that respond dynamically to your customers.
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-muted-foreground">
            Collect exactly what you need, apply customized pricing formulas, and automatically route high-priority jobs directly to available field technicians.
          </p>
        </div>

        {/* 2-Column: Palette on Left, Rule Builder on Right */}
        <div className="grid gap-6 lg:grid-cols-[1.1fr_1.15fr] items-start">
          {/* Left: 12 Field Palette */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="text-sm font-bold text-foreground">12-Field Component Palette</p>
                <p className="text-xs text-muted-foreground">Drag or tap to add to any form layout</p>
              </div>
              <Badge variant="outline" className="text-xs">Drag &amp; Drop</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {FIELD_PALETTE.map((field) => {
                const Icon = field.icon;
                return (
                  <div
                    key={field.name}
                    className="flex flex-col justify-between rounded-xl border border-border p-3 text-xs transition-all hover:border-emerald-600 hover:bg-emerald-500/5 hover:shadow-xs cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="grid size-7 place-items-center rounded-lg bg-muted text-muted-foreground group-hover:bg-emerald-500/10 group-hover:text-emerald-600 transition-colors">
                        <Icon className="size-3.5" />
                      </span>
                      <span className="text-[9px] font-mono uppercase text-muted-foreground">{field.type}</span>
                    </div>
                    <span className="font-semibold text-foreground leading-tight text-[11px]">{field.name}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Conditional Logic Visual Builder */}
          <div className="rounded-2xl bg-slate-950 p-6 sm:p-7 text-white shadow-xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <GitBranch className="size-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Visual Branching Rules
                </span>
              </div>
              {/* Scenario Toggles */}
              <div className="flex gap-1 rounded-lg bg-white/10 p-1">
                {(['emergency', 'discount', 'dispatch'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveRuleTab(tab)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer capitalize',
                      activeRuleTab === tab ? 'bg-emerald-400 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule Steps */}
            <div className="space-y-3">
              {rulesData[activeRuleTab].map((rule, idx) => (
                <div
                  key={rule.text}
                  className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-xs transition-all animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
                  <span className={cn('grid h-7 w-14 shrink-0 place-items-center rounded-lg text-xs font-bold', rule.color)}>
                    {rule.tag}
                  </span>
                  <span className="text-xs sm:text-sm text-slate-200 pt-0.5 leading-relaxed font-medium">
                    {rule.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
              <span>Status: Active in Production</span>
              <span className="text-emerald-400 font-semibold">0ms Evaluation Latency</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
