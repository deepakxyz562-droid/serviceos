'use client';

import React, { useEffect, useState } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlowFooterCtaProps {
  onGetStarted?: () => void;
}

export function FlowFooterCta({ onGetStarted }: FlowFooterCtaProps) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSent(true);
      if (onGetStarted) {
        onGetStarted();
      }
    }
  };

  return (
    <>
      <section id="cta" className="relative overflow-hidden bg-slate-950 py-24 text-white">
        {/* Ambient Glows */}
        <div className="pointer-events-none absolute -left-24 top-0 size-[32rem] rounded-full bg-teal-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 size-[28rem] rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-400/30 bg-teal-400/10 px-4 py-1.5 text-xs font-semibold text-teal-300">
            <Sparkles className="size-3.5 text-teal-300" />
            Zero Onboarding Friction
          </span>

          <h2 className="mt-6 text-3xl font-extrabold leading-tight sm:text-5xl tracking-tight">
            Stop doing admin at 9 PM.{' '}
            <span className="bg-gradient-to-r from-teal-300 via-emerald-300 to-amber-200 bg-clip-text text-transparent">
              Let Fieseros run your back office.
            </span>
          </h2>
          <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal">
            Set up in five minutes. Your 24/7 AI voice receptionist and smart dispatcher can take their first call tonight.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mx-auto mt-9 flex max-w-md flex-col gap-3 sm:flex-row"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourcompany.com"
              className="flex-1 rounded-full border border-white/20 bg-white/10 px-5 py-3.5 text-sm text-white outline-none placeholder:text-white/50 focus:border-teal-400 focus:bg-white/15 transition-colors"
            />
            <button
              type="submit"
              className="group inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all hover:brightness-110 hover:-translate-y-0.5 active:translate-y-0"
            >
              {sent ? 'Redirecting...' : 'Start Free Trial'}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </button>
          </form>

          <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-400">
            {['No credit card required', '5-minute setup', '0% platform transaction fee', 'Cancel anytime'].map((c) => (
              <li key={c} className="flex items-center gap-1.5">
                <Check className="size-4 text-emerald-400" /> {c}
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
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-2xl border border-border/80 bg-background/90 px-5 py-3 shadow-2xl backdrop-blur-xl">
        <div className="hidden sm:block">
          <p className="text-xs font-semibold text-foreground">
            Stop doing admin at 9 PM.
          </p>
          <p className="text-[11px] text-muted-foreground">
            AI receptionist + auto dispatch + instant invoicing.
          </p>
        </div>
        <div className="sm:hidden">
          <p className="text-xs font-semibold text-foreground">Fieseros AI Field Flow</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="#pricing"
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            See Pricing
          </a>
          <button
            onClick={() => onGetStarted ? onGetStarted() : window.location.assign('/auth')}
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 dark:bg-teal-500 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-teal-700 dark:hover:bg-teal-600 transition-colors"
          >
            Start Free Trial
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
