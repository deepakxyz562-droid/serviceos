'use client';

import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DemoWidget, scenarios, ScenarioName, journeySteps } from './hero-demo';

export function JourneySection() {
  const [scenario, setScenario] = useState<ScenarioName>('Dental');
  const [step, setStep] = useState(0);

  return (
    <section id="product" className="section-pad bg-slate-950 text-white relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 -z-10 size-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 -z-10 size-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      <div className="page-shell">
        <div className="section-heading text-white max-w-3xl mb-8">
          <p className="eyebrow text-emerald-400 font-bold">THE COMPLETE JOURNEY</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl font-bold tracking-tight">
            From first website conversation to a booked job.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-slate-300">
            See how one intelligent flow guides the customer, qualifies their requirements, and automatically transfers every answer directly into your CRM.
          </p>
        </div>

        {/* Scenario Switcher Tabs */}
        <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {(Object.keys(scenarios) as ScenarioName[]).map((item) => (
            <button
              key={item}
              onClick={() => {
                setScenario(item);
                setStep(0);
              }}
              className={cn(
                'rounded-full border px-5 py-2 text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap',
                scenario === item
                  ? 'border-emerald-400 bg-emerald-400 text-slate-950 shadow-md'
                  : 'border-white/20 bg-white/5 text-slate-300 hover:border-white/40 hover:text-white'
              )}
            >
              {item === 'Dental' ? '🦷 Dental Intake' : item === 'Roofing' ? '🏗️ Roofing Inspection' : item === 'HVAC' ? '🔧 HVAC Emergency' : '🧹 Cleaning Quote'}
            </button>
          ))}
        </div>

        {/* 2-Column Stepper & Live Interactive Widget */}
        <div className="grid gap-8 lg:grid-cols-[300px_1fr] items-start">
          {/* Stepper Navigation */}
          <div className="space-y-2">
            {journeySteps.map((label, index) => (
              <button
                key={label}
                onClick={() => setStep(index)}
                className={cn(
                  'flex w-full items-center gap-3.5 rounded-xl border p-4 text-left text-sm font-semibold transition-all cursor-pointer',
                  step === index
                    ? 'border-emerald-400 bg-white/10 text-white shadow-sm'
                    : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                )}
              >
                <span
                  className={cn(
                    'grid size-7 place-items-center rounded-full text-xs font-bold transition-colors',
                    step === index
                      ? 'bg-emerald-400 text-slate-950 font-extrabold'
                      : 'bg-white/10 text-slate-300'
                  )}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="truncate">{label}</p>
                  <p className="text-[11px] font-normal opacity-70 mt-0.5">
                    {index === 0
                      ? 'AI trigger popover'
                      : index === 1
                      ? 'Natural conversation'
                      : index === 2
                      ? 'Real-time slot lock'
                      : index === 3
                      ? 'Summary verification'
                      : 'Zero-retype submission'}
                  </p>
                </div>
                <ArrowRight
                  className={cn(
                    'size-4 transition-transform',
                    step === index ? 'text-emerald-400 translate-x-0.5' : 'opacity-40'
                  )}
                />
              </button>
            ))}
          </div>

          {/* Live Preview Widget */}
          <div className="text-slate-900 dark:text-slate-100">
            <DemoWidget step={step} scenario={scenario} />
          </div>
        </div>
      </div>
    </section>
  );
}
