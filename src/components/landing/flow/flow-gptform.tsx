'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquareText, Sparkles } from 'lucide-react';

const chips = ['20,000+ prebuilt templates', 'AI-powered builder', 'No coding required', '0% fee Stripe payments'];

export function FlowGptForm({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="gptform" className="bg-slate-50/70 dark:bg-slate-900/60 py-20 border-b border-border relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-teal-500/30 bg-white dark:bg-slate-950 p-8 sm:p-12 shadow-2xl"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-teal-500/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-teal-500/10 border border-teal-500/30 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700 dark:text-teal-400">
                <MessageSquareText className="size-3.5" /> GPTForm™ · Conversational Intake
              </span>
              <h2 className="text-3xl font-extrabold leading-tight text-slate-900 dark:text-white sm:text-4xl tracking-tight">
                Build forms that chat with your customers.
              </h2>
              <p className="max-w-xl text-sm sm:text-base text-muted-foreground leading-relaxed">
                Create smart forms, price calculators, and conversational AI chatbots to collect information,
                qualify trade leads, estimate job sizes, and book calendar appointments — all in one place.
              </p>
              <ul className="flex flex-wrap gap-2 pt-1">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-border bg-slate-50 dark:bg-slate-900 px-3.5 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-200"
                  >
                    ✓ {c}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-3">
                <Link
                  href="/gptform"
                  className="group inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3.5 text-xs sm:text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-teal-700 shadow-md cursor-pointer"
                >
                  Create Your Form Free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/gptform#templates"
                  className="rounded-full border border-border bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-6 py-3.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 transition cursor-pointer"
                >
                  Explore 180+ Templates
                </Link>
              </div>
            </div>

            {/* Interactive Bot Dialogue Preview */}
            <div className="rounded-3xl border border-border bg-slate-50 dark:bg-slate-900 p-5 space-y-2.5 shadow-inner">
              {[
                { who: 'bot', text: 'Hi! What can we help with today?' },
                { who: 'user', text: 'Boiler making a banging noise.' },
                { who: 'bot', text: 'Got it. Are you free tomorrow morning?' },
                { who: 'user', text: 'Yes, before 11.' },
                { who: 'bot', text: 'Booked 9:30 AM with Mike. Confirmation sent ✅' },
              ].map((m, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.12 }}
                  className={m.who === 'bot' ? 'flex justify-start' : 'flex justify-end'}
                >
                  <p
                    className={
                      m.who === 'bot'
                        ? 'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-border shadow-xs'
                        : 'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] bg-teal-600 text-white font-medium shadow-xs'
                    }
                  >
                    {m.text}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
