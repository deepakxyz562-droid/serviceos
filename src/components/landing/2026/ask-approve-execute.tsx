'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Eye,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Wand2,
  Terminal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Phase = 'idle' | 'reviewing' | 'approved' | 'executed';

interface ExecutionChange {
  label: string;
  detail: string;
  icon: typeof CheckCircle2;
}

const PROPOSED_CHANGES: ExecutionChange[] = [
  { label: 'Reassign Job #4829', detail: 'Move from Mike V. → David M. (saves 18 min drive)', icon: CheckCircle2 },
  { label: 'Reassign Job #4831', detail: 'Move from Sarah K. → Liam C. (closer to 11 AM slot)', icon: CheckCircle2 },
  { label: 'Reassign Job #4835', detail: 'Move from David M. → Mike V. (cert match for HVAC)', icon: CheckCircle2 },
  { label: 'Reassign Job #4840', detail: 'Move from Liam C. → Sarah K. (fills 2 PM gap)', icon: CheckCircle2 },
];

const EXECUTION_RESULTS = [
  '4 assignments updated',
  '4 technicians notified via PWA push',
  '3 customers sent updated ETA SMS',
  '42 minutes of drive time eliminated',
];

export function AskApproveExecute({ onGetStarted }: { onGetStarted?: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');

  const handleAsk = () => {
    setPhase('reviewing');
  };

  const handleApprove = () => {
    setPhase('approved');
    // Brief delay to show the approval transition, then execute
    setTimeout(() => setPhase('executed'), 600);
  };

  const handleReset = () => {
    setPhase('idle');
  };

  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[300px] bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-cyan-500/10 blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-400 text-xs font-semibold">
            <ShieldCheck className="size-3.5" />
            <span>HUMAN-IN-THE-LOOP AI EXECUTION</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Ask. Approve.{' '}
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Execute.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Fieseros never silently makes important changes to your business. It proposes a plan, you review the impact, and only then does it execute — keeping you in control.
          </p>
        </div>

        {/* 3-Step Pipeline */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ─── STEP 01: ASK ─── */}
          <div
            className={`rounded-3xl border p-6 space-y-5 transition-all duration-300 ${
              phase === 'idle'
                ? 'border-teal-500/50 bg-slate-900 shadow-xl ring-2 ring-teal-500/20'
                : 'border-slate-800 bg-slate-900/60 opacity-70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-black text-sm">
                01
              </div>
              <Badge variant="outline" className="text-[10px] border-teal-500/30 bg-teal-500/10 text-teal-400 font-bold">
                ASK
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Wand2 className="size-4 text-teal-400" /> You Ask
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Tell Fieseros what outcome you want in plain English.
              </p>
            </div>

            {/* Prompt box */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <p className="text-[10px] uppercase font-bold tracking-wider text-teal-400 flex items-center gap-1.5">
                <Terminal className="size-3" /> Command
              </p>
              <p className="text-xs font-mono text-white leading-relaxed">
                &ldquo;Optimize tomorrow&rsquo;s schedule across all 8 technicians.&rdquo;
              </p>
            </div>

            <Button
              type="button"
              onClick={handleAsk}
              disabled={phase !== 'idle'}
              className="w-full h-10 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="size-3.5" /> Ask Fieseros →
            </Button>
          </div>

          {/* ─── STEP 02: REVIEW ─── */}
          <div
            className={`rounded-3xl border p-6 space-y-5 transition-all duration-300 ${
              phase === 'reviewing' || phase === 'approved' || phase === 'executed'
                ? 'border-amber-500/50 bg-slate-900 shadow-xl ring-2 ring-amber-500/20'
                : 'border-slate-800 bg-slate-900/60 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black text-sm">
                02
              </div>
              <Badge variant="outline" className="text-[10px] border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold">
                {phase === 'approved' || phase === 'executed' ? '✓ APPROVED' : 'REVIEW'}
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Eye className="size-4 text-amber-400" /> Fieseros Proposes
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                See exactly what will change before anything happens.
              </p>
            </div>

            {/* Proposed changes summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-400">Schedule Analysis</span>
                <span className="font-mono text-slate-400">23 jobs · 8 techs</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                I can reduce estimated travel time by{' '}
                <span className="font-bold text-emerald-400">42 minutes</span> by changing{' '}
                <span className="font-bold text-white">4 assignments</span>.
              </p>

              {/* Proposed change list */}
              {phase !== 'idle' && (
                <div className="space-y-1.5 pt-2 border-t border-slate-800">
                  {PROPOSED_CHANGES.map((change, idx) => {
                    const Icon = change.icon;
                    const isApproved = phase === 'approved' || phase === 'executed';
                    return (
                      <div
                        key={idx}
                        className={`flex items-start gap-2 text-xs p-2 rounded-lg transition-all ${
                          isApproved
                            ? 'bg-emerald-950/40 border border-emerald-500/30'
                            : 'bg-slate-900 border border-slate-800'
                        }`}
                      >
                        <Icon className={`size-3.5 shrink-0 mt-0.5 ${isApproved ? 'text-emerald-400' : 'text-slate-500'}`} />
                        <div className="min-w-0">
                          <p className="font-bold text-white">{change.label}</p>
                          <p className="text-[11px] text-slate-400 truncate">{change.detail}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <Button
              type="button"
              onClick={handleApprove}
              disabled={phase !== 'reviewing'}
              className="w-full h-10 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs gap-2 cursor-pointer disabled:opacity-50"
            >
              {phase === 'approved' || phase === 'executed' ? (
                <><CheckCircle2 className="size-3.5" /> Approved</>
              ) : (
                <><ShieldCheck className="size-3.5" /> Review &amp; Approve →</>
              )}
            </Button>
          </div>

          {/* ─── STEP 03: EXECUTE ─── */}
          <div
            className={`rounded-3xl border p-6 space-y-5 transition-all duration-300 ${
              phase === 'executed'
                ? 'border-emerald-500/50 bg-slate-900 shadow-xl ring-2 ring-emerald-500/20'
                : 'border-slate-800 bg-slate-900/60 opacity-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-sm">
                03
              </div>
              <Badge variant="outline" className="text-[10px] border-emerald-500/30 bg-emerald-500/10 text-emerald-400 font-bold">
                {phase === 'executed' ? '✓ DONE' : 'EXECUTE'}
              </Badge>
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="size-4 text-emerald-400" /> Fieseros Executes
              </h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Changes applied across CRM, dispatch, and customer comms.
              </p>
            </div>

            {/* Execution results */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              {phase === 'executed' ? (
                <>
                  {EXECUTION_RESULTS.map((result, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30"
                    >
                      <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                      <span className="text-emerald-200 font-semibold">{result}</span>
                    </div>
                  ))}
                  <div className="pt-2 mt-2 border-t border-slate-800 text-center">
                    <p className="text-sm font-black text-emerald-400">✓ All Actions Completed</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">0.4s execution time</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 space-y-2">
                  <AlertTriangle className="size-6 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-500 font-medium">
                    Awaiting approval in Step 02
                  </p>
                </div>
              )}
            </div>

            {phase === 'executed' && (
              <Button
                type="button"
                onClick={handleReset}
                variant="outline"
                className="w-full h-10 rounded-xl border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold text-xs gap-2 cursor-pointer"
              >
                <RotateCcw className="size-3.5" /> Try Another Prompt
              </Button>
            )}
          </div>
        </div>

        {/* Bottom reassurance bar */}
        <div className="max-w-4xl mx-auto rounded-2xl bg-slate-900/80 border border-slate-800 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-center sm:text-left">
            <div className="size-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">You always approve before AI acts</p>
              <p className="text-[11px] text-slate-400">No silent changes to jobs, schedules, or customer records.</p>
            </div>
          </div>
          {onGetStarted ? (
            <Button
              onClick={onGetStarted}
              className="h-10 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 cursor-pointer shrink-0"
            >
              Try It Free <ArrowRight className="size-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
