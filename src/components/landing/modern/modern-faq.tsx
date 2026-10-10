'use client';

import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'What is Fieseros?',
    a: 'Fieseros is an all-in-one AI operating system and field service management platform built for trade and service businesses. It unifies CRM, real-time scheduling & dispatch, invoicing & payments, 24/7 AI voice phone reception, and online customer intake in one place.',
  },
  {
    q: 'Is there a setup fee?',
    a: 'No. There are zero setup fees or hidden activation costs. You can get started immediately on our Free plan with your first 100 jobs included at 0% platform commission.',
  },
  {
    q: 'How does the AI receptionist work?',
    a: 'The AI Voice Receptionist connects to your business phone number and answers incoming calls 24/7. It understands customer requests in natural language, quotes pricing, captures contact details, and books appointments directly onto your live dispatch calendar.',
  },
  {
    q: 'Do you work in my area?',
    a: 'Yes. Fieseros operates globally with localized currencies (USD, INR, GBP, EUR, CAD, AUD), regional SMS and WhatsApp gateways, and multi-timezone dispatching for service pros worldwide.',
  },
  {
    q: 'Can I try Fieseros for free?',
    a: 'Yes! You can sign up with no credit card required and run your first 100 jobs completely free. You keep 100% of the money you collect.',
  },
  {
    q: 'Can I migrate my existing data?',
    a: 'Absolutely. Fieseros includes 1-click CSV import tools for customers, price lists, and job history from Jobber, Housecall Pro, ServiceTitan, spreadsheets, and Google Contacts.',
  },
];

export function ModernFaq() {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 sm:py-24 bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Heading */}
          <div className="lg:col-span-4 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-sm sm:text-base text-slate-500">
              Everything you need to know about Fieseros.
            </p>
          </div>

          {/* Right Column: 2-Column Accordion Grid */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {faqs.map((faq, idx) => {
                const isOpen = openIndex === idx;
                return (
                  <div
                    key={faq.q}
                    className="rounded-xl border border-slate-200/90 bg-white transition-all overflow-hidden h-fit"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(idx)}
                      className="w-full flex items-center justify-between gap-3 p-4 text-left hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
                        {faq.q}
                      </span>
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200',
                          isOpen && 'rotate-180 text-emerald-600'
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100 bg-slate-50/40">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
