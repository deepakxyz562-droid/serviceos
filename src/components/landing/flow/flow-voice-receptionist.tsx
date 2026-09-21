'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarCheck, Globe, KeyRound, PhoneCall, PhoneForwarded, Sparkles, UserCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

const transcript = [
  { who: 'AI', text: 'Thanks for calling Brightwater Plumbing — this is Ava. How can I help?' },
  { who: 'Caller', text: 'My kitchen sink is leaking everywhere, it\'s an emergency.' },
  { who: 'AI', text: 'I\'m sorry about that. I can get an engineer out today. What\'s the postcode?' },
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

export function FlowVoiceReceptionist({ onGetStarted }: { onGetStarted?: () => void }) {
  const [shown, setShown] = useState(0);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const start = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
    setShown(0);
    timers.current = transcript.map((_, i) =>
      setTimeout(() => setShown(i + 1), 900 * (i + 1))
    );
  };

  useEffect(() => {
    start();
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const live = shown < transcript.length;

  return (
    <section id="receptionist" className="relative overflow-hidden bg-slate-900 text-white dark:bg-slate-950 py-24 border-b border-border">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -left-32 top-10 size-[30rem] rounded-full bg-teal-500/15 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-teal-500/30 bg-teal-500/15 px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-300">
            <Sparkles className="size-3.5" /> 24/7 AI Voice Receptionist
          </span>
          <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl tracking-tight">
            Never miss another call.{' '}
            <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Your AI receptionist answers 24/7.
            </span>
          </h2>
          <p className="max-w-xl text-slate-300 text-sm sm:text-base leading-relaxed">
            Powered by Vapi voice AI. Every ring is picked up on the first tone, qualified, booked into
            the right technician&apos;s calendar and written straight into your CRM.
          </p>

          <ul className="flex flex-wrap gap-2.5 pt-2">
            {badges.map((b) => (
              <li
                key={b.label}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-teal-400 hover:text-white"
              >
                <b.icon className="size-4 text-teal-400" /> {b.label}
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-teal-500 cursor-pointer shadow-lg"
            >
              <PhoneCall className="size-4" /> Replay live call
            </button>
            {onGetStarted && (
              <button
                type="button"
                onClick={onGetStarted}
                className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition cursor-pointer"
              >
                Get Phone Number →
              </button>
            )}
          </div>
        </div>

        {/* Live Call Simulator */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 sm:p-6 backdrop-blur-xl shadow-2xl space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="relative grid size-11 place-items-center rounded-full bg-teal-600 text-white">
                <PhoneCall className="size-5" />
                {live && <span className="absolute inset-0 animate-ping rounded-full bg-teal-400/40" />}
              </span>
              <div>
                <p className="text-sm font-bold text-white">+1 (415) 555-0142</p>
                <p className="text-xs text-slate-400">Incoming → Brightwater Plumbing</p>
              </div>
            </div>
            <span
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-bold',
                live ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800 text-slate-400'
              )}
            >
              {live ? '● LIVE' : '✓ COMPLETED'}
            </span>
          </div>

          {/* Audio Waveform Equalizer */}
          <div className="flex h-14 items-center gap-1 rounded-2xl bg-slate-950/80 px-4 border border-slate-800">
            {bars.map((b) => (
              <motion.span
                key={b}
                className="w-full rounded-full bg-teal-400/70"
                animate={{ height: live ? [6, 8 + ((b * 7) % 30), 6] : 5 }}
                transition={{ duration: 0.8 + (b % 5) * 0.12, repeat: live ? Infinity : 0, ease: 'easeInOut' }}
              />
            ))}
          </div>

          {/* Transcript stream */}
          <div className="max-h-80 space-y-2.5 overflow-hidden pt-1">
            <AnimatePresence initial={false}>
              {transcript.slice(0, shown).map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex', t.who === 'AI' ? 'justify-start' : 'justify-end')}
                >
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-xs',
                      t.who === 'AI'
                        ? 'bg-teal-950/70 border border-teal-800/80 text-teal-100'
                        : 'bg-slate-800 text-slate-100'
                    )}
                  >
                    <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-teal-400">
                      {t.who}
                    </span>
                    {t.text}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {!live && (
            <div className="grid grid-cols-3 gap-2 text-center pt-2">
              {[
                ['Emergency', 'sink leak'],
                ['Slot', '2:15 PM'],
                ['CRM', 'saved'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-slate-800/60 border border-slate-700/60 py-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-400">{k}</p>
                  <p className="text-xs sm:text-[13px] font-semibold text-teal-300">{v}</p>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}
