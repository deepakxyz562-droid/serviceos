'use client';

import React, { useState } from 'react';
import {
  XCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Layers,
  Clock,
  Zap,
  MousePointerClick,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export function OldWayVsFieseros() {
  const [activeTab, setActiveTab] = useState<'compare' | 'fieseros'>('compare');

  const oldSteps = [
    { title: 'Open Customer Tab', desc: 'Search or create contact record manually' },
    { title: 'Create Job & Fill Form', desc: 'Type address, equipment notes, and line items' },
    { title: 'Open Calendar', desc: 'Manually check 8 technicians for drive time & availability' },
    { title: 'Assign Technician', desc: 'Double-check certifications and phone numbers' },
    { title: 'Generate Quote', desc: 'Calculate materials on spreadsheet and upload PDF' },
    { title: 'Send Confirmation', desc: 'Switch to email or SMS app to message customer' },
    { title: 'Chase Invoice & Payment', desc: 'Export to accounting software and wait 30 days' },
  ];

  return (
    <section id="how-it-works" className="py-20 bg-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold">
            <Flame className="size-3.5" />
            <span>THE WORKFLOW REVOLUTION</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Your software shouldn't make you{' '}
            <span className="bg-gradient-to-r from-rose-400 to-amber-300 bg-clip-text text-transparent">
              work for it.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Traditional CRMs force you to click through 7 disconnected screens for every single service call. Fieseros lets you speak your intent and executes the entire workflow in seconds.
          </p>
        </div>

        {/* Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left: The Traditional Disconnected Way (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-rose-500/20 bg-slate-900/50 p-6 sm:p-8 space-y-6 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                <span className="text-sm font-extrabold text-rose-400 flex items-center gap-2">
                  <XCircle className="size-5" /> Traditional Field Software
                </span>
                <Badge variant="outline" className="text-[10px] text-rose-400 border-rose-500/40 bg-rose-500/10">
                  ~14 mins per job
                </Badge>
              </div>

              <p className="text-xs text-slate-400 font-medium">
                Click. Open. Type. Save. Open Calendar. Assign. Generate Quote. Copy-paste message. Repeat 30 times a day.
              </p>

              {/* Step Sequence */}
              <div className="space-y-2.5 pt-2">
                {oldSteps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs flex items-start gap-3 opacity-80"
                  >
                    <span className="size-5 rounded-md bg-rose-500/20 text-rose-400 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                      0{idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-slate-200">{step.title}</p>
                      <p className="text-[11px] text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="size-4 shrink-0" />
              <span>Result: 12+ wasted administrative hours every week.</span>
            </div>
          </div>

          {/* Right: The Fieseros AI Way (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border-2 border-teal-500/40 bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 space-y-6 flex flex-col justify-between shadow-2xl shadow-teal-950/30">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-teal-500/30">
                <span className="text-sm font-extrabold text-teal-400 flex items-center gap-2">
                  <Sparkles className="size-5" /> The Fieseros AI Way
                </span>
                <Badge className="bg-teal-500 text-slate-950 text-[10px] font-bold">
                  Instant (0.4s)
                </Badge>
              </div>

              <div className="p-4 rounded-2xl bg-teal-950/40 border border-teal-500/30 space-y-2">
                <p className="text-[10px] uppercase font-bold tracking-wider text-teal-400">
                  You Say:
                </p>
                <p className="text-sm sm:text-base font-mono text-white leading-relaxed">
                  "Sarah needs an emergency boiler repair tomorrow. Schedule Mike, create a £350 quote, and confirm with her on WhatsApp."
                </p>
              </div>

              {/* Fieseros 4-Step Autonomous Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/20 space-y-1.5">
                  <div className="size-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                    01
                  </div>
                  <p className="text-xs font-bold text-white">AI Understands Intent</p>
                  <p className="text-[11px] text-slate-400">
                    Extracts customer, trade urgency, certifications, pricing formulas, and calendar buffers.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/20 space-y-1.5">
                  <div className="size-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                    02
                  </div>
                  <p className="text-xs font-bold text-white">Coordinates Dispatch</p>
                  <p className="text-[11px] text-slate-400">
                    Matches technician skills, GPS proximity, and locks the calendar slot automatically.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/20 space-y-1.5">
                  <div className="size-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                    03
                  </div>
                  <p className="text-xs font-bold text-white">Prepares Digital Quote</p>
                  <p className="text-[11px] text-slate-400">
                    Generates itemized proposal with online approval and deposit checkout link.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/20 space-y-1.5">
                  <div className="size-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold text-xs">
                    04
                  </div>
                  <p className="text-xs font-bold text-white">Dispatches Customer Comms</p>
                  <p className="text-[11px] text-slate-400">
                    Sends branded WhatsApp &amp; SMS confirmation with real-time technician tracking link.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-200 text-xs font-bold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-teal-400 shrink-0" />
                <span>One prompt. Zero double-entry. Business moves forward.</span>
              </span>
              <span className="text-[11px] font-mono text-teal-400 uppercase tracking-wider">
                100% Autonomous
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
