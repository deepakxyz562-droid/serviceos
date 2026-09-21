'use client';

import React, { useState } from 'react';
import {
  PoundSterling,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export function RevenueCommandCenter() {
  const [fixedState, setFixedState] = useState(false);

  return (
    <section className="py-20 bg-background text-foreground border-b border-border dark:bg-slate-900/80 dark:text-white dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
            <PoundSterling className="size-3.5" />
            <span>REVENUE COMMAND CENTER</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground dark:text-white leading-tight">
            Don&apos;t just manage jobs.{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400 bg-clip-text text-transparent">
              Understand the money.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Fieseros continuously monitors cash flow, detects unbilled work orders, and follows up on unpaid balances automatically with zero merchant commission.
          </p>
        </div>

        {/* 4 Big Live Financial Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-3xl bg-card border border-border shadow-md dark:bg-slate-950 dark:border-slate-800 dark:shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-slate-400">
              <span className="font-semibold">Revenue This Month</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center">
                <ArrowUpRight className="size-3.5" /> +14.2%
              </span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-foreground dark:text-white">£48,240</p>
            <p className="text-[11px] text-muted-foreground dark:text-slate-500">From 142 completed work orders</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-amber-500/30 shadow-md dark:bg-slate-950 dark:shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-slate-400">
              <span className="font-semibold text-amber-700 dark:text-amber-300">Unbilled / Outstanding</span>
              <Badge className="bg-amber-500/10 text-amber-800 border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 text-[10px]">Action Needed</Badge>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-amber-600 dark:text-amber-400">£8,420</p>
            <p className="text-[11px] text-muted-foreground dark:text-slate-400">14 completed jobs awaiting invoice</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-border shadow-md dark:bg-slate-950 dark:border-slate-800 dark:shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-slate-400">
              <span className="font-semibold">Open Quotes Pending</span>
              <span className="text-teal-600 dark:text-teal-400 font-bold">12 Quotes</span>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-foreground dark:text-white">£12,600</p>
            <p className="text-[11px] text-muted-foreground dark:text-slate-500">68% historical approval rate</p>
          </div>

          <div className="p-6 rounded-3xl bg-card border border-emerald-500/30 shadow-md dark:bg-slate-950 dark:shadow-xl space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground dark:text-slate-400">
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">Platform Commission</span>
              <Badge className="bg-emerald-600 text-white dark:bg-emerald-500 dark:text-slate-950 text-[10px] font-bold">Guaranteed</Badge>
            </div>
            <p className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">0%</p>
            <p className="text-[11px] text-muted-foreground dark:text-slate-400">Keep 100% of your customer payments</p>
          </div>
        </div>

        {/* AI Root Cause & 1-Click Fix Box */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-8 space-y-6 shadow-xl dark:border-slate-700 dark:bg-slate-950 dark:shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-teal-500/10 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400 flex items-center justify-center font-bold">
                <Sparkles className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-foreground dark:text-white">
                  AI Financial Analysis &amp; Revenue Recovery
                </h3>
                <p className="text-xs text-muted-foreground dark:text-slate-400">Inquiry: &quot;Why did revenue dip this week?&quot;</p>
              </div>
            </div>
            <Badge className="bg-teal-500/10 text-teal-700 border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-400 text-xs font-mono self-start sm:self-auto">
              AI Revenue Diagnostic
            </Badge>
          </div>

          {/* Diagnostic Findings */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-muted/50 border border-border dark:bg-slate-900 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">01. Uninvoiced Jobs</span>
              <p className="text-xs font-bold text-foreground dark:text-white">14 Completed Jobs Unbilled</p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                £7,400 in signed-off work orders have not been converted to invoices.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/50 border border-border dark:bg-slate-900 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400">02. Stalled Quotes</span>
              <p className="text-xs font-bold text-foreground dark:text-white">6 Quotes Awaiting Follow-up</p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                £8,200 in quotes viewed over 5 days ago without customer response.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-muted/50 border border-border dark:bg-slate-900 dark:border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-400">03. Dormant Retention</span>
              <p className="text-xs font-bold text-foreground dark:text-white">22 Clients Past Annual Tune-Up</p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                £16,500 historical value eligible for spring maintenance reactivation.
              </p>
            </div>
          </div>

          {/* 1-Click Fix Action */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 dark:bg-teal-950/40 dark:border-teal-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-0.5 text-center sm:text-left">
              <p className="text-xs font-bold text-foreground dark:text-white">
                {fixedState
                  ? '✓ 14 Invoices Generated & SMS Payment Links Dispatched!'
                  : 'Recommended 1-Click Action: Invoice All 14 Completed Jobs'}
              </p>
              <p className="text-[11px] text-muted-foreground dark:text-slate-400">
                {fixedState
                  ? 'Estimated £7,400 in payouts arriving over next 24-48 hours.'
                  : 'Will generate itemized PDF invoices and send instant online payment links via WhatsApp/SMS.'}
              </p>
            </div>

            <Button
              onClick={() => setFixedState(true)}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer shadow-md"
            >
              {fixedState ? '✓ Completed' : 'Execute 1-Click Invoice Generation →'}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
