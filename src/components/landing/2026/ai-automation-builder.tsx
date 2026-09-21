'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  FileCheck,
  Wrench,
  UserCheck,
  MessageSquare,
  Bell,
  Clock,
  ArrowRight,
  Zap,
  Workflow,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface WorkflowNode {
  step: string;
  label: string;
  detail: string;
  icon: typeof Workflow;
  accent: string;
}

const WORKFLOW_NODES: WorkflowNode[] = [
  { step: '01', label: 'Quote Accepted', detail: 'Customer signs the digital quote', icon: FileCheck, accent: 'text-teal-400' },
  { step: '02', label: 'Create Job', detail: 'Work order generated automatically', icon: Workflow, accent: 'text-emerald-400' },
  { step: '03', label: 'Find Technician', detail: 'AI matches skills, location & calendar', icon: UserCheck, accent: 'text-amber-400' },
  { step: '04', label: 'Assign', detail: 'Slot locked, tech notified via PWA', icon: Wrench, accent: 'text-teal-400' },
  { step: '05', label: 'Notify Customer', detail: 'WhatsApp + SMS confirmation sent', icon: MessageSquare, accent: 'text-emerald-400' },
  { step: '06', label: 'Reminder', detail: '1-hour before appointment', icon: Bell, accent: 'text-amber-400' },
];

const AUTOMATION_PROMPT =
  'When a quote is accepted, create the job, assign the best technician, notify the customer, send the technician the job details, and remind them one hour before.';

export function AiAutomationBuilder({ onGetStarted }: { onGetStarted?: () => void }) {
  const [built, setBuilt] = useState(false);
  const [visibleNodes, setVisibleNodes] = useState(0);

  const handleBuild = () => {
    setBuilt(false);
    setVisibleNodes(0);
    // Progressive node reveal
    WORKFLOW_NODES.forEach((_, idx) => {
      setTimeout(() => {
        setVisibleNodes(idx + 1);
        if (idx === WORKFLOW_NODES.length - 1) {
          setTimeout(() => setBuilt(true), 300);
        }
      }, (idx + 1) * 400);
    });
  };

  return (
    <section className="py-20 bg-slate-50 text-slate-900 dark:bg-slate-900/80 dark:text-white border-b border-border dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
            <Workflow className="size-3.5" />
            <span>AI AUTOMATION BUILDER</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            Describe your workflow.{' '}
            <span className="bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500 dark:from-amber-400 dark:via-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
              Fieseros builds it.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            No drag-and-drop flow builders. No Zapier webhooks. Just tell Fieseros what should happen, and it wires up the automation across your CRM, dispatch, and messaging.
          </p>
        </div>

        {/* Interactive Builder */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Prompt + Build Button (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Prompt box */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-card text-card-foreground p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-xl bg-teal-500/15 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Terminal className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">Automation Prompt</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Natural language → workflow</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold">
                  ⌘ Trigger
                </Badge>
              </div>

              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-sm font-mono text-slate-900 dark:text-white leading-relaxed">
                  &ldquo;{AUTOMATION_PROMPT}&rdquo;
                </p>
              </div>

              <Button
                type="button"
                onClick={handleBuild}
                disabled={visibleNodes > 0 && !built}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm gap-2 cursor-pointer disabled:opacity-60"
              >
                {built ? (
                  <><CheckCircle2 className="size-4" /> Workflow Built — Rebuild</>
                ) : visibleNodes > 0 ? (
                  <><Zap className="size-4 animate-pulse" /> Building Workflow…</>
                ) : (
                  <><Sparkles className="size-4" /> Build This Workflow →</>
                )}
              </Button>
            </div>

            {/* Reassurance */}
            <div className="rounded-2xl bg-card border border-slate-200 dark:border-slate-800 p-4 space-y-2">
              <p className="text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">What Fieseros connects:</p>
              <div className="flex flex-wrap gap-2">
                {['CRM Records', 'Job Board', 'Dispatch Calendar', 'WhatsApp', 'SMS', 'Email', 'PWA Push', 'Invoices', 'Payments'].map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-[11px] text-teal-700 dark:text-teal-300 font-medium">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Workflow Visualization (7 cols) */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-card text-card-foreground p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Workflow className="size-5 text-amber-500 dark:text-amber-400" />
                  <span className="text-sm font-bold text-slate-900 dark:text-white">Generated Automation Flow</span>
                </div>
                {built ? (
                  <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    ✓ Active
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    Awaiting build
                  </Badge>
                )}
              </div>

              {/* Workflow nodes */}
              <div className="space-y-2">
                {WORKFLOW_NODES.map((node, idx) => {
                  const Icon = node.icon;
                  const isVisible = idx < visibleNodes;
                  const isLast = idx === WORKFLOW_NODES.length - 1;

                  return (
                    <div key={idx}>
                      <div
                        className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-400 ${
                          isVisible
                            ? 'bg-slate-100/90 dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-100 translate-x-0'
                            : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/50 dark:border-slate-900 opacity-40 -translate-x-2'
                        }`}
                      >
                        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-black text-[11px] ${
                          isVisible ? 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-600'
                        }`}>
                          {isVisible ? <Icon className={`size-4 ${node.accent}`} /> : node.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{node.label}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{node.detail}</p>
                        </div>
                        {isVisible && (
                          <CheckCircle2 className="size-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        )}
                      </div>
                      {/* Connector arrow */}
                      {!isLast && (
                        <div className="flex justify-center py-0.5">
                          <ArrowRight className={`size-3 rotate-90 transition-opacity duration-300 ${idx < visibleNodes - 1 ? 'opacity-60 text-teal-600 dark:text-teal-400' : 'opacity-20 text-slate-400 dark:text-slate-700'}`} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Completion banner */}
              {built && (
                <div className="mt-4 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-500/30 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">Automation is live</p>
                      <p className="text-[11px] text-emerald-700 dark:text-slate-400">Trigger: Quote Accepted → 6 actions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                    <Clock className="size-3.5 text-teal-600 dark:text-teal-400" />
                    <span className="font-mono">runs in &lt;1s</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            {onGetStarted && (
              <div className="mt-5 text-center">
                <Button
                  onClick={onGetStarted}
                  variant="outline"
                  className="h-11 px-6 rounded-xl border-teal-500/40 text-teal-700 dark:text-teal-300 hover:bg-teal-500/10 dark:hover:bg-teal-950/40 font-bold text-xs gap-2 cursor-pointer"
                >
                  Build Your Own Workflow <ArrowRight className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
