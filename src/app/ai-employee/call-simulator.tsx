'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PhoneCall,
  CalendarCheck,
  UserCheck,
  PhoneForwarded,
  Sparkles,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  MapPin,
  Wrench,
  Flame,
  Zap,
  Home,
  ShieldAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface Scenario {
  id: string;
  trade: string;
  icon: typeof Wrench;
  callerNumber: string;
  companyName: string;
  transcript: { who: 'AI' | 'Caller'; text: string }[];
  result: {
    issue: string;
    slot: string;
    technician: string;
    action: string;
    urgency: 'Emergency' | 'Standard' | 'Urgent';
  };
}

const scenarios: Scenario[] = [
  {
    id: 'plumbing',
    trade: 'Plumbing',
    icon: Wrench,
    callerNumber: '+1 (415) 555-0198',
    companyName: 'Apex Plumbing & Rooter',
    transcript: [
      { who: 'AI', text: 'Thank you for calling Apex Plumbing & Rooter. This is Ava, how can I help you today?' },
      { who: 'Caller', text: "Hi! My main water line is leaking under the sink and flooding my kitchen floor." },
      { who: 'AI', text: "I'm so sorry to hear that. That sounds like an emergency. What is your service address?" },
      { who: 'Caller', text: "It's 742 Evergreen Terrace, Springfield." },
      { who: 'AI', text: "Got it. I have our master technician Marco available to dispatch at 11:30 AM today. Would you like me to book that right now?" },
      { who: 'Caller', text: "Yes please, 11:30 AM works great!" },
      { who: 'AI', text: "You're all set! I've booked Marco for 11:30 AM, saved your job in our system, and sent a confirmation text with live tracking. Please turn off the shutoff valve under the sink while we head over." },
    ],
    result: {
      issue: 'Burst pipe flooding kitchen',
      slot: 'Today · 11:30 AM',
      technician: 'Marco S. (Master Plumber)',
      action: 'Dispatched & Confirmed via SMS',
      urgency: 'Emergency',
    },
  },
  {
    id: 'hvac',
    trade: 'HVAC',
    icon: Flame,
    callerNumber: '+1 (312) 555-0144',
    companyName: 'Polar Climate Solutions',
    transcript: [
      { who: 'AI', text: 'Polar Climate Solutions, this is Ava. Are you looking to schedule heating or cooling service?' },
      { who: 'Caller', text: "My furnace stopped blowing hot air last night and the temperature inside is 54 degrees." },
      { who: 'AI', text: "We will get that fixed for you right away. What is your name and home address?" },
      { who: 'Caller', text: "Dave Miller at 450 Oakridge Drive." },
      { who: 'AI', text: "Thanks Dave. Our senior HVAC specialist Elena has a priority diagnostic opening today between 1:00 PM and 3:00 PM. Shall I lock that in?" },
      { who: 'Caller', text: "Yes, that would be wonderful." },
      { who: 'AI', text: "Done! Dave, Elena is scheduled for 1:00 PM today. You'll receive an SMS notification when she is 15 minutes away." },
    ],
    result: {
      issue: 'Furnace no heat (54°F indoors)',
      slot: 'Today · 1:00 PM - 3:00 PM',
      technician: 'Elena R. (HVAC Tech)',
      action: 'Priority Diagnostic Booked',
      urgency: 'Urgent',
    },
  },
  {
    id: 'electrical',
    trade: 'Electrical',
    icon: Zap,
    callerNumber: '+1 (206) 555-0182',
    companyName: 'VoltCraft Electric',
    transcript: [
      { who: 'AI', text: 'VoltCraft Electric, Ava speaking. How can we assist with your electrical needs today?' },
      { who: 'Caller', text: "I just bought a Tesla Model Y and need an Level 2 EV wall charger installed in my garage." },
      { who: 'AI', text: "Congratulations on the new EV! We install Level 2 chargers every week. What size breaker panel do you currently have?" },
      { who: 'Caller', text: "I have a 200 amp panel in the basement." },
      { who: 'AI', text: "Perfect, 200 amps is ideal. I can schedule an on-site installation estimate tomorrow morning at 9:00 AM or 2:00 PM. Which suits you best?" },
      { who: 'Caller', text: "Tomorrow morning at 9:00 AM is great." },
      { who: 'AI', text: "Great! I've booked your EV charger installation consultation for tomorrow at 9:00 AM. I've sent a calendar invite to your phone." },
    ],
    result: {
      issue: 'Level 2 EV Charger Installation',
      slot: 'Tomorrow · 9:00 AM',
      technician: 'Aaron T. (Electrician)',
      action: 'Estimate Booked + Calendar Sent',
      urgency: 'Standard',
    },
  },
];

export function CallSimulator() {
  const [activeScenario, setActiveScenario] = useState<Scenario>(scenarios[0]);
  const [shownIndex, setShownIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const timers = useRef<NodeJS.Timeout[]>([]);

  const startPlayback = (scenario: Scenario) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setShownIndex(0);
    setIsPlaying(true);

    scenario.transcript.forEach((_, idx) => {
      const timer = setTimeout(() => {
        setShownIndex(idx + 1);
        if (idx === scenario.transcript.length - 1) {
          setIsPlaying(false);
        }
      }, 1000 * (idx + 1));
      timers.current.push(timer);
    });
  };

  const handleScenarioChange = (s: Scenario) => {
    setActiveScenario(s);
    startPlayback(s);
  };

  useEffect(() => {
    startPlayback(activeScenario);
    return () => timers.current.forEach(clearTimeout);
  }, []);

  const isLive = shownIndex < activeScenario.transcript.length;

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden text-slate-100">
      {/* Top Scenario Switcher Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 px-4 py-3 sm:px-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Interactive Call Simulation
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {scenarios.map((s) => {
            const Icon = s.icon;
            const isSelected = activeScenario.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleScenarioChange(s)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon className="size-3.5" />
                <span>{s.trade}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left Col: Live Call Feed (7 cols) */}
        <div className="lg:col-span-7 p-5 sm:p-7 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div>
            {/* Call State Bar */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
              <div className="flex items-center gap-3">
                <div className="relative size-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <PhoneCall className="size-5" />
                  {isLive && <span className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-white tracking-tight">{activeScenario.callerNumber}</p>
                  <p className="text-[11px] text-slate-400">Incoming to {activeScenario.companyName}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                    isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                  )}
                >
                  {isLive ? 'Call in Progress' : 'Call Completed'}
                </span>
                <button
                  type="button"
                  onClick={() => startPlayback(activeScenario)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Replay Call"
                  aria-label="Replay Call"
                >
                  <RotateCcw className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Audio Waveform Bar */}
            <div className="flex items-center gap-1 h-9 px-3 rounded-xl bg-slate-950/60 border border-slate-800 mb-5">
              {Array.from({ length: 32 }).map((_, i) => (
                <motion.span
                  key={i}
                  className={cn(
                    'w-full rounded-full transition-colors',
                    isLive ? 'bg-emerald-400/80' : 'bg-slate-700'
                  )}
                  animate={{
                    height: isLive ? [4, Math.max(4, ((i * 11) % 24) + 4), 4] : 4,
                  }}
                  transition={{
                    duration: 0.6 + (i % 4) * 0.15,
                    repeat: isLive ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            {/* Conversation Flow */}
            <div className="space-y-3 min-h-[220px] max-h-[300px] overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {activeScenario.transcript.slice(0, shownIndex).map((line, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 8, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className={cn('flex', line.who === 'AI' ? 'justify-start' : 'justify-end')}
                  >
                    <div
                      className={cn(
                        'max-w-[86%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed',
                        line.who === 'AI'
                          ? 'bg-slate-800 border border-slate-700/60 text-slate-100 rounded-tl-sm'
                          : 'bg-emerald-600 text-white rounded-tr-sm shadow-md'
                      )}
                    >
                      <div className="flex items-center gap-1.5 mb-1 font-semibold text-[10px] uppercase tracking-wider opacity-80">
                        {line.who === 'AI' ? (
                          <>
                            <Sparkles className="size-2.5 text-emerald-400" />
                            <span>AI Receptionist (Ava)</span>
                          </>
                        ) : (
                          <span>Caller</span>
                        )}
                      </div>
                      <p>{line.text}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>⚡ Ultra-low latency voice AI</span>
            <span>Zero hold time · 1st ring pickup</span>
          </div>
        </div>

        {/* Right Col: Instant CRM Automation Card (5 cols) */}
        <div className="lg:col-span-5 p-5 sm:p-7 bg-slate-950/50 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Auto-Synced to Fieseros CRM
              </span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Urgency Level</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                      activeScenario.result.urgency === 'Emergency'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                        : activeScenario.result.urgency === 'Urgent'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    )}
                  >
                    {activeScenario.result.urgency}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white">{activeScenario.result.issue}</p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-3 text-emerald-400" /> Scheduled Slot
                  </span>
                  <span className="font-semibold text-slate-200">{activeScenario.result.slot}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="size-3 text-emerald-400" /> Assigned Pro
                  </span>
                  <span className="font-semibold text-slate-200">{activeScenario.result.technician}</span>
                </div>
              </div>

              <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  Automated Dispatch Action
                </span>
                <p className="text-xs font-medium text-emerald-200">{activeScenario.result.action}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-center">
            <a
              href="/#signup"
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <PhoneCall className="size-3.5" />
              <span>Get AI Phone Agent for Your Business</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
