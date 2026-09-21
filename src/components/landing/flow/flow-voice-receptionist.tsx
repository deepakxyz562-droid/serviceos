'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarCheck,
  Globe,
  KeyRound,
  PhoneCall,
  PhoneForwarded,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const transcript = [
  { who: 'AI', text: 'Thanks for calling Brightwater Plumbing — this is Ava. How can I help?' },
  { who: 'Caller', text: "My kitchen sink is leaking everywhere, it's an emergency." },
  { who: 'AI', text: "I'm sorry about that. I can get an engineer out today. What's the postcode?" },
  { who: 'Caller', text: 'SW4 7DL — as soon as possible please.' },
  { who: 'AI', text: 'Tom is free at 2:15 PM today. Shall I lock that in for you?' },
  { who: 'Caller', text: 'Yes, perfect.' },
  { who: 'AI', text: 'Booked for 2:15 PM. Saved to your CRM and a confirmation text is on the way.' },
];

const badges = [
  { icon: PhoneCall, label: 'Answers 24/7' },
  { icon: CalendarCheck, label: 'Books appointments live' },
  { icon: UserCheck, label: 'Qualifies leads' },
  { icon: PhoneForwarded, label: 'Warm-transfers emergencies' },
  { icon: Globe, label: '30+ languages' },
  { icon: KeyRound, label: 'BYO Vapi key' },
];

const bars = Array.from({ length: 28 }, (_, i) => i);

export function FlowVoiceReceptionist() {
  const [shown, setShown] = useState(0);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const start = () => {
    timers.current.forEach(clearTimeout);
    setShown(0);
    timers.current = transcript.map((_, i) =>
      setTimeout(() => setShown(i + 1), 900 * (i + 1))
    );
  };

  useEffect(() => {
    start();
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const live = shown < transcript.length;

  return (
    <section id="receptionist" className="relative overflow-hidden bg-navy-deep py-24">
      <div className="pointer-events-none absolute -left-32 top-10 size-[30rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 lg:grid-cols-2 lg:items-center">
        <div className="text-primary-foreground">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-glow">
            <Sparkles className="size-3.5" /> 24/7 AI Voice Receptionist
          </span>
          <h2 className="mt-5 text-3xl font-extrabold leading-tight sm:text-4xl">
            Never miss another call.{' '}
            <span className="text-brand-glow">Your AI receptionist answers 24/7.</span>
          </h2>
          <p className="mt-5 max-w-xl text-primary-foreground/70 text-base leading-relaxed">
            Powered by Vapi voice AI. Every ring is picked up on the first tone, qualified, booked into
            the right technician&apos;s calendar and written straight into your CRM.
          </p>

          <ul className="mt-8 flex flex-wrap gap-2.5">
            {badges.map((b) => (
              <li
                key={b.label}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-[13px] font-medium text-primary-foreground/85 transition-colors hover:border-brand-glow/50 hover:text-primary-foreground"
              >
                <b.icon className="size-4 text-brand-glow" /> {b.label}
              </li>
            ))}
          </ul>

          <button
            onClick={start}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:-translate-y-0.5 hover:bg-brand-glow hover:text-navy-deep cursor-pointer"
          >
            <PhoneCall className="size-4" /> Replay live call
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6 backdrop-blur-xl shadow-2xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
                <PhoneCall className="size-5" />
                {live && <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />}
              </span>
              <div>
                <p className="text-sm font-bold text-primary-foreground">+1 (415) 555-0142</p>
                <p className="text-xs text-primary-foreground/60">Incoming → Brightwater Plumbing</p>
              </div>
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold',
                live ? 'bg-brand-glow/20 text-brand-glow' : 'bg-white/10 text-primary-foreground/70'
              )}
            >
              {live ? 'LIVE' : 'COMPLETED'}
            </span>
          </div>

          <div className="mt-5 flex h-14 items-center gap-1 rounded-2xl bg-navy-deep/60 px-4">
            {bars.map((b) => (
              <motion.span
                key={b}
                className="w-full rounded-full bg-brand-glow/70"
                animate={{ height: live ? [6, 8 + ((b * 7) % 30), 6] : 5 }}
                transition={{ duration: 0.8 + (b % 5) * 0.12, repeat: live ? Infinity : 0, ease: 'easeInOut' }}
              />
            ))}
          </div>

          <div className="mt-5 max-h-80 space-y-2.5 overflow-hidden">
            <AnimatePresence initial={false}>
              {transcript.slice(0, shown).map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', t.who === 'AI' ? 'justify-start' : 'justify-end')}
                >
                  <p
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed',
                      t.who === 'AI'
                        ? 'bg-primary/20 text-primary-foreground'
                        : 'bg-white/10 text-primary-foreground/80'
                    )}
                  >
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-brand-glow">
                      {t.who}
                    </span>
                    {t.text}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!live && (
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                ['Emergency', 'sink leak'],
                ['Slot', '2:15 PM'],
                ['CRM', 'saved'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-white/5 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-primary-foreground/50">{k}</p>
                  <p className="text-[13px] font-semibold text-brand-glow">{v}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
