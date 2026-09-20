'use client';

import * as React from 'react';
import {
  Inbox,
  FileText,
  CalendarCheck,
  Send,
  Wrench,
  Receipt,
  CheckCircle2,
  Star,
  ArrowRight,
  Sparkles,
  Clock,
  MapPin,
  Camera,
  Check,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface StageInfo {
  id: string;
  stepNumber: string;
  title: string;
  shortDesc: string;
  badge: string;
  icon: React.ElementType;
}

export const STAGES: StageInfo[] = [
  {
    id: 'lead',
    stepNumber: '01',
    title: 'Lead Captured',
    shortDesc: 'Instant inquiry from AI form or marketplace',
    badge: 'New Lead',
    icon: Inbox,
  },
  {
    id: 'quote',
    stepNumber: '02',
    title: 'Quoted & Booked',
    shortDesc: 'Upfront estimate approved & slot scheduled',
    badge: 'Confirmed',
    icon: FileText,
  },
  {
    id: 'dispatch',
    stepNumber: '03',
    title: 'Smart Dispatched',
    shortDesc: 'Matched to nearest available technician',
    badge: 'En Route',
    icon: Send,
  },
  {
    id: 'field',
    stepNumber: '04',
    title: 'Technician on Site',
    shortDesc: 'PIN verified, photos taken, work signed off',
    badge: 'In Progress',
    icon: Wrench,
  },
  {
    id: 'invoice',
    stepNumber: '05',
    title: 'Instant Invoice',
    shortDesc: '1-click checkout via card, Apple Pay or link',
    badge: 'Paid $285',
    icon: Receipt,
  },
  {
    id: 'repeat',
    stepNumber: '06',
    title: 'Review & Repeat',
    shortDesc: '5-star review collected & automated recall set',
    badge: '5.0 ★ Repeat',
    icon: Star,
  },
];

export function InteractiveJobSimulator() {
  const [activeStageIndex, setActiveStageIndex] = React.useState(0);
  const activeStage = STAGES[activeStageIndex];

  return (
    <div className="w-full max-w-6xl mx-auto rounded-2xl border border-border/80 bg-card/70 backdrop-blur-md shadow-2xl p-6 sm:p-8 space-y-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-3 py-1">
          <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Interactive Job Lifecycle
        </Badge>
        <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Watch a job move through Fieseros
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground">
          From first inquiry to final payment and 5-star review — one connected system, zero dropped balls.
        </p>
      </div>

      {/* Stepper Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {STAGES.map((stage, idx) => {
          const isActive = idx === activeStageIndex;
          const isPassed = idx < activeStageIndex;
          const Icon = stage.icon;

          return (
            <button
              key={stage.id}
              onClick={() => setActiveStageIndex(idx)}
              className={cn(
                'flex flex-col items-start p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer relative overflow-hidden',
                isActive
                  ? 'bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40'
                  : isPassed
                  ? 'bg-muted/40 border-border text-foreground hover:bg-muted/70'
                  : 'bg-background/40 border-border/60 text-muted-foreground hover:bg-muted/30'
              )}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <span className={cn('text-[11px] font-mono font-semibold', isActive ? 'text-primary' : 'text-muted-foreground')}>
                  {stage.stepNumber}
                </span>
                <div
                  className={cn(
                    'w-6 h-6 rounded-md flex items-center justify-center text-xs',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : isPassed
                      ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>
              <span className="text-xs font-bold truncate w-full">{stage.title}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{stage.shortDesc}</span>
            </button>
          );
        })}
      </div>

      {/* Simulated Live UI Screen */}
      <div className="rounded-xl border border-border bg-background/90 p-5 sm:p-7 shadow-inner">
        {activeStageIndex === 0 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  01
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">New Lead Ingested</h4>
                  <p className="text-xs text-muted-foreground">Source: AI Plumbing Emergency Form · Just now</p>
                </div>
              </div>
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30">Needs Quote</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-1">
                <span className="text-muted-foreground font-medium">Customer Details</span>
                <p className="font-semibold text-foreground text-sm">Sarah Jenkins</p>
                <p className="text-muted-foreground">07700 900123 · sarah.j@example.com</p>
                <p className="text-muted-foreground">42 Kensington Gardens, London W8</p>
              </div>
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-1">
                <span className="text-muted-foreground font-medium">Service Requested</span>
                <p className="font-semibold text-foreground text-sm">Boiler Leaking & Pressure Loss</p>
                <p className="text-muted-foreground">Urgency: High · Preferred: Today Morning</p>
                <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                  <Camera className="w-3.5 h-3.5" /> 2 Photos Attached
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-primary font-semibold">AI Pre-Analysis</span>
                  <p className="text-muted-foreground mt-0.5">Estimated time: 45-60 mins. Recommended tech: Dave M. (Boiler Specialist).</p>
                </div>
                <Button size="sm" onClick={() => setActiveStageIndex(1)} className="w-full text-xs h-8">
                  Generate Instant Quote <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStageIndex === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  02
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Estimate Approved & Slot Booked</h4>
                  <p className="text-xs text-muted-foreground">Scheduled for Today at 10:30 AM · Google Calendar Synced</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Customer Approved</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2 col-span-2">
                <span className="text-muted-foreground font-medium">Itemized Quote #Q-1082</span>
                <div className="space-y-1.5">
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span>Emergency Boiler Diagnostic & Pressure Valve Seal</span>
                    <span className="font-semibold">£185.00</span>
                  </div>
                  <div className="flex justify-between border-b border-border/40 pb-1">
                    <span>Replacement O-Ring Kit & System Repressurization</span>
                    <span className="font-semibold">£65.00</span>
                  </div>
                  <div className="flex justify-between font-bold text-foreground pt-1">
                    <span>Total Quoted Amount</span>
                    <span className="text-primary text-sm">£250.00 (+ VAT)</span>
                  </div>
                </div>
              </div>
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2 flex flex-col justify-between">
                <div className="space-y-1">
                  <span className="text-muted-foreground font-medium">Customer Signature</span>
                  <p className="text-xs font-serif italic text-emerald-600">Sarah Jenkins</p>
                  <p className="text-[10px] text-muted-foreground">Digitally signed at 09:12 AM</p>
                </div>
                <Button size="sm" onClick={() => setActiveStageIndex(2)} className="w-full text-xs h-8">
                  Dispatch Nearest Tech <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStageIndex === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  03
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Smart Auto-Dispatch Active</h4>
                  <p className="text-xs text-muted-foreground">Assigned to Dave Miller · 3.8 miles away · ETA 12 mins</p>
                </div>
              </div>
              <Badge className="bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30">Dave En Route (GPS Live)</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2">
                <span className="text-muted-foreground font-medium">Assigned Technician</span>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center font-bold text-xs">DM</div>
                  <div>
                    <p className="font-semibold text-foreground">Dave Miller</p>
                    <p className="text-[10px] text-muted-foreground">Gas Safe Certified · 4.9 ★ Rating</p>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground flex items-center gap-1 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Live GPS location broadcasting to customer
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2">
                <span className="text-muted-foreground font-medium">Customer Notifications</span>
                <div className="space-y-1">
                  <p className="text-emerald-600 dark:text-emerald-400 font-semibold">✓ SMS Sent with Live Tracking Link</p>
                  <p className="text-muted-foreground text-[11px]">Verification PIN generated: <strong className="text-foreground">8419</strong></p>
                  <p className="text-[10px] text-muted-foreground">Tech must enter PIN on arrival to start timer.</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-muted-foreground font-medium">Technician Mobile Sync</span>
                  <p className="text-muted-foreground mt-1">Dave received job instructions, customer notes & parts checklist on his phone.</p>
                </div>
                <Button size="sm" onClick={() => setActiveStageIndex(3)} className="w-full text-xs h-8">
                  View On-Site Work <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStageIndex === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  04
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">On-Site Work Completed</h4>
                  <p className="text-xs text-muted-foreground">Dave verified PIN 8419 · Work timer: 48 mins · Completed</p>
                </div>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">Work Completed</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-1.5">
                <span className="text-muted-foreground font-medium">Photo Proof of Work</span>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <div className="h-16 rounded bg-muted/60 border border-border/40 flex flex-col items-center justify-center text-[10px] text-muted-foreground">
                    <Camera className="w-4 h-4 mb-0.5 text-muted-foreground" />
                    Before Leak
                  </div>
                  <div className="h-16 rounded bg-emerald-500/10 border border-emerald-500/30 flex flex-col items-center justify-center text-[10px] text-emerald-600">
                    <Check className="w-4 h-4 mb-0.5" />
                    Fixed Seal
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-1.5">
                <span className="text-muted-foreground font-medium">Safety Checklist & QA</span>
                <div className="space-y-1 text-[11px]">
                  <p className="text-emerald-600 flex items-center gap-1 font-semibold">✓ Gas Pressure Check Passed</p>
                  <p className="text-emerald-600 flex items-center gap-1 font-semibold">✓ Flue Flow Test Passed</p>
                  <p className="text-emerald-600 flex items-center gap-1 font-semibold">✓ Area Cleaned & Tested</p>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-muted-foreground font-medium">Customer Sign-Off</span>
                  <p className="text-xs font-serif italic text-emerald-600">Sarah Jenkins (on Dave's phone)</p>
                  <p className="text-[10px] text-muted-foreground">Sign-off captured at 11:18 AM</p>
                </div>
                <Button size="sm" onClick={() => setActiveStageIndex(4)} className="w-full text-xs h-8">
                  Generate & Send Invoice <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStageIndex === 4 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  05
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Invoice Paid — £285.00 Settled</h4>
                  <p className="text-xs text-muted-foreground">Paid via Apple Pay on customer portal · Receipt auto-sent</p>
                </div>
              </div>
              <Badge className="bg-emerald-500 text-white border-transparent">PAID IN FULL</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-1 col-span-2">
                <span className="text-muted-foreground font-medium">Payment Transaction Details</span>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    <span className="font-semibold text-foreground">Apple Pay (Card ending •••• 4242)</span>
                  </div>
                  <span className="text-sm font-bold text-emerald-600">£285.00</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Transaction ID: tx_981a4bc82 · Funds routed directly to your connected merchant account</p>
              </div>

              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-muted-foreground font-medium">Accounting Sync</span>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Automatically recorded in Revenue & Tax Reports.</p>
                </div>
                <Button size="sm" onClick={() => setActiveStageIndex(5)} className="w-full text-xs h-8">
                  Review & Retention <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeStageIndex === 5 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-sm">
                  06
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">5-Star Review & Automated Retention</h4>
                  <p className="text-xs text-muted-foreground">Sarah left a verified 5.0 ★ review · 12-month boiler service reminder scheduled</p>
                </div>
              </div>
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">⭐⭐⭐⭐⭐ 5.0</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-card border border-border/60 space-y-1.5 col-span-2">
                <span className="text-muted-foreground font-medium">Customer Feedback</span>
                <p className="text-foreground italic">
                  "Dave arrived in 15 minutes, showed me photos of the leak and fixed it right away. Flawless service and easy payment on my phone!"
                </p>
                <p className="text-[10px] text-muted-foreground font-semibold">— Sarah Jenkins · Kensington</p>
              </div>

              <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="text-primary font-semibold">Future Lifetime Value</span>
                  <p className="text-muted-foreground mt-1 text-[11px]">Customer 360 profile updated. Automated annual inspection campaign active.</p>
                </div>
                <Button size="sm" onClick={() => setActiveStageIndex(0)} variant="outline" className="w-full text-xs h-8">
                  Restart Simulation ↺
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reassurance Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-1 border-t border-border/50">
        <span>One customer record · One job timeline · Zero dropped tasks</span>
        <span className="font-semibold text-foreground">Every step is connected natively in Fieseros</span>
      </div>
    </div>
  );
}
