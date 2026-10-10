'use client';

import * as React from 'react';
import {
  PhoneCall,
  Calendar,
  Truck,
  CreditCard,
  ArrowRight,
} from 'lucide-react';

const steps = [
  {
    num: '1',
    icon: PhoneCall,
    title: 'Capture Lead',
    description: 'Get leads from calls, website, marketplace or social media.',
  },
  {
    num: '2',
    icon: Calendar,
    title: 'Book Job',
    description: 'Create a job, schedule it or let AI book it for you.',
  },
  {
    num: '3',
    icon: Truck,
    title: 'Dispatch Team',
    description: 'Assign the right technician and optimize the route.',
  },
  {
    num: '4',
    icon: CreditCard,
    title: 'Get Paid',
    description: 'Send invoice and receive online payment.',
  },
];

export function ModernHowItWorks() {
  return (
    <section className="py-16 sm:py-20 bg-slate-50/70 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            How Fieseros Works
          </h2>
          <p className="mt-1 text-sm sm:text-base text-slate-500">
            From lead to payment in four simple steps.
          </p>
        </div>

        {/* 4 Connected Step Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                className="relative flex flex-col p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs hover:border-emerald-500 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  {/* Step Number Circle */}
                  <div className="size-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                    {step.num}
                  </div>
                  {/* Icon */}
                  <div className="size-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1.5">
                  {step.title}
                </h3>
                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  {step.description}
                </p>

                {/* Arrow to next on desktop */}
                {idx < steps.length - 1 && (
                  <div className="hidden lg:block absolute -right-3.5 top-1/2 -translate-y-1/2 z-10 size-7 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center shadow-xs">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
