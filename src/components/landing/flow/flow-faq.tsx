'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'How does Fieseros create a job from plain language?',
    a: 'You type or speak an instruction like “Book Sarah in for an emergency boiler repair tomorrow.” Fieseros finds the customer in your CRM, creates the job, checks availability, assigns a technician, drafts the quote and sends the confirmation — all in one run you can review before it goes out.',
  },
  {
    q: 'How are technicians assigned?',
    a: 'The AI dispatcher matches required certifications, parts on the van, live GPS position, traffic and existing schedule. You can always drag and drop to override, and the board re-optimises the rest of the day automatically.',
  },
  {
    q: 'Is there a mobile app for my crew?',
    a: 'Yes — a mobile PWA that installs on iOS and Android without an app store. It works offline on site and syncs checklists, photos, signatures and payments as soon as signal returns.',
  },
  {
    q: 'What is GPTForm™?',
    a: 'GPTForm™ is the built-in form and chatbot builder. Create booking forms, quote requests and lead qualifiers from 20,000+ templates, embed them on your site, and have an AI chat with visitors and book them straight into your calendar.',
  },
  {
    q: 'Do I need my own Vapi or WhatsApp account?',
    a: 'The AI receptionist supports bring-your-own Vapi key so you control voice costs, and WhatsApp runs on your own Business API number. Email, SMS, push and in-app messaging are included on every paid plan.',
  },
  {
    q: 'How is Fieseros different from Jobber?',
    a: 'Jobber is a strong scheduling and invoicing tool that still expects you to do the clicking. Fieseros adds an autonomous AI layer — voice reception, dispatch, quoting and follow-up run themselves — and includes forms, chatbots and marketing that Jobber sells separately or not at all.',
  },
  {
    q: 'How is Fieseros different from Housecall Pro?',
    a: 'Housecall Pro charges per-transaction payment fees and prices AI add-ons on top. Fieseros charges 0% platform commission, includes the AI receptionist and dispatcher in the plan, and gives you one prompt-driven interface instead of a dozen screens.',
  },
  {
    q: 'Will it work with QuickBooks and my accountant?',
    a: 'Yes. Invoices, payments and payouts export cleanly to QuickBooks and Xero, and your accountant can be given a read-only seat at no extra cost.',
  },
  {
    q: 'How long does setup take?',
    a: 'Most businesses are live in under an hour. Import customers from a CSV or your current tool, connect your number and calendar, and the AI receptionist can take its first call tonight.',
  },
  {
    q: 'What does 0% platform commission actually mean?',
    a: 'Fieseros never takes a cut of the money you collect. You pay your card processor’s standard rate and nothing to us on top — tap-to-pay in the field included.',
  },
];

export function FlowFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 bg-background">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="inline-flex rounded-full bg-teal-500/10 dark:bg-teal-500/20 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-300 border border-teal-500/20">
            Answers & knowledge base
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight text-foreground sm:text-4xl">
            Everything contractors ask us.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Clear answers about features, migrations, 0% platform fee, and how AI handles your daily operations.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          {faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className={cn(
                  'rounded-2xl border transition-all duration-200',
                  isOpen
                    ? 'border-teal-500/40 bg-card shadow-sm'
                    : 'border-border/70 bg-card/60 hover:border-teal-500/30 hover:bg-card'
                )}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className="text-[15px] font-semibold text-foreground">{f.q}</span>
                  <Plus
                    className={cn(
                      'size-4 shrink-0 text-teal-600 dark:text-teal-400 transition-transform duration-300',
                      isOpen && 'rotate-45'
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground border-t border-border/40 pt-3">
                        {f.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
