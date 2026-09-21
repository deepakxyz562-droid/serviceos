'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function FlowFooterCta({ onGetStarted }: { onGetStarted?: () => void }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  return (
    <>
      <section id="cta" className="relative overflow-hidden bg-navy-deep py-24">
        <div className="pointer-events-none absolute -left-24 top-0 size-[32rem] rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[28rem] rounded-full bg-brand-glow/20 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center text-primary-foreground">
          <h2 className="text-3xl font-extrabold leading-tight sm:text-5xl tracking-tight">
            Stop doing admin at 9 PM.{' '}
            <span className="text-brand-glow">Let Fieseros run your back office.</span>
          </h2>
          <p className="mt-5 text-primary-foreground/70 text-base sm:text-lg">
            Set up in five minutes. Your AI receptionist takes its first call tonight.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email.trim()) {
                setSent(true);
                if (onGetStarted) onGetStarted();
              }
            }}
            className="mx-auto mt-9 flex max-w-lg flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="flex-1 rounded-full border border-white/15 bg-white/10 px-5 py-3.5 text-sm text-primary-foreground outline-none placeholder:text-primary-foreground/45 focus:border-brand-glow/60 transition-colors"
            />
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-glow hover:text-navy-deep cursor-pointer"
            >
              {sent ? 'Check your inbox' : 'Start Free Trial'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/60">
            {['No credit card required', '5-minute setup', '0% platform transaction fee'].map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <Check className="size-4 text-brand-glow" /> {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <StickyBar onGetStarted={onGetStarted} />
    </>
  );
}

function StickyBar({ onGetStarted }: { onGetStarted?: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 800);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 p-4 transition-all duration-300',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'
      )}
    >
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/95 px-5 py-3.5 shadow-[0_24px_60px_-30px_oklch(0.21_0.045_258/0.7)] backdrop-blur-xl">
        <p className="text-sm font-semibold text-navy">
          Stop doing admin at 9 PM. Let Fieseros run your back office.
        </p>
        <button
          onClick={onGetStarted}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-brand-deep cursor-pointer"
        >
          Start Free Trial
        </button>
      </div>
    </div>
  );
}
