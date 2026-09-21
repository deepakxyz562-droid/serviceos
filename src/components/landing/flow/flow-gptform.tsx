'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import Link from 'next/link';

const chips = ['20,000+ prebuilt templates', 'AI-powered', 'No coding required'];

export function FlowGptForm() {
  return (
    <section id="gptform" className="bg-surface py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-background p-8 shadow-[0_40px_90px_-60px_oklch(0.21_0.045_258/0.55)] sm:p-12"
        >
          <div className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
                <MessageSquareText className="size-3.5" /> GPTForm™
              </span>
              <h2 className="mt-5 text-3xl font-extrabold leading-tight text-navy sm:text-4xl tracking-tight">
                Build forms that chat with your customers.
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground text-sm sm:text-base leading-relaxed">
                Create smart forms + AI chatbots to collect information, answer questions, qualify leads,
                and book appointments—all in one place.
              </p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-[12.5px] font-medium text-navy"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/gptform"
                  className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-deep cursor-pointer"
                >
                  Create Your Form Free
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/gptform"
                  className="rounded-full border border-border px-6 py-3.5 text-sm font-semibold text-navy transition-colors hover:border-primary/40 hover:bg-accent cursor-pointer"
                >
                  Explore Templates
                </Link>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-surface p-5 shadow-xs">
              {[
                { who: 'bot', text: 'Hi! What can we help with today?' },
                { who: 'user', text: 'Boiler making a banging noise.' },
                { who: 'bot', text: 'Got it. Are you free tomorrow morning?' },
                { who: 'user', text: 'Yes, before 11.' },
                { who: 'bot', text: 'Booked 9:30 AM. Confirmation sent ✅' },
              ].map((m, i) => (
                <motion.p
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className={
                    m.who === 'bot'
                      ? 'mb-2 max-w-[85%] rounded-2xl bg-background px-3.5 py-2.5 text-[13px] text-navy border border-border/50 shadow-xs'
                      : 'mb-2 ml-auto max-w-[85%] rounded-2xl bg-primary px-3.5 py-2.5 text-[13px] text-primary-foreground shadow-xs'
                  }
                >
                  {m.text}
                </motion.p>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
