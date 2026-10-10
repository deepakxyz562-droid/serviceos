'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernPricingProps {
  onSelectPlan?: (planId: string) => void;
}

export function ModernPricing({ onSelectPlan }: ModernPricingProps) {
  const [isYearly, setIsYearly] = React.useState(false);

  return (
    <section id="pricing" className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Simple and Transparent Pricing
          </h2>
          <p className="mt-1 text-sm sm:text-base text-slate-500">
            Start free and upgrade as you grow.
          </p>

          {/* Monthly / Yearly Switcher */}
          <div className="inline-flex items-center gap-2 p-1 mt-6 rounded-full bg-slate-200/80 border border-slate-300">
            <button
              type="button"
              onClick={() => setIsYearly(false)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                !isYearly
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setIsYearly(true)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isYearly
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900'
              }`}
            >
              <span>Yearly</span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* 4 Tier Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. Free */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Free</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">₹0</span>
                  <span className="text-xs text-slate-500">/month</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">First 100 jobs included</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>CRM &amp; leads</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Basic scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>100 form submissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Customer portal</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectPlan?.('free')}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-lg cursor-pointer"
            >
              Get Started Free
            </Button>
          </div>

          {/* 2. Starter */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Starter</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {isYearly ? '₹23' : '₹29'}
                  </span>
                  <span className="text-xs text-slate-500">/month</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Up to 3 users</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Everything in Free</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Advanced scheduling</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Invoicing &amp; payments</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Email &amp; SMS notifications</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectPlan?.('starter')}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 rounded-lg cursor-pointer"
            >
              Start Free Trial
            </Button>
          </div>

          {/* 3. Professional (Most Popular) */}
          <div className="relative rounded-2xl bg-white border-2 border-emerald-500 p-6 flex flex-col justify-between shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full shadow-xs">
              Most Popular
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Professional</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-slate-900">
                    {isYearly ? '₹63' : '₹79'}
                  </span>
                  <span className="text-xs text-slate-500">/month</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">Up to 10 users</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Everything in Starter</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Live dispatch &amp; GPS</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>AI Employee (add-on)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Reports &amp; automations</span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectPlan?.('pro')}
              className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-lg shadow-md cursor-pointer"
            >
              Start Free Trial
            </Button>
          </div>

          {/* 4. Enterprise */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 flex flex-col justify-between shadow-xs hover:shadow-md transition-all">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Enterprise</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-2xl font-extrabold text-slate-900">Custom Pricing</span>
                </div>
                <p className="text-xs text-slate-500 mt-1">For larger teams</p>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Unlimited users</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Advanced permissions</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Dedicated support</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                  <span>Custom integrations</span>
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              asChild
              className="w-full mt-6 border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs h-10 rounded-lg cursor-pointer"
            >
              <Link href="/contact-us">Contact Sales</Link>
            </Button>
          </div>

        </div>

      </div>
    </section>
  );
}
