'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Grid,
  Bot,
  User,
  Sparkles,
  Volume2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernAiEmployeeProps {
  onLearnMore?: () => void;
}

const aiBullets = [
  'Natural, human-like conversations',
  'Books directly on your calendar',
  'Creates leads and jobs automatically',
  'Handles multiple calls at the same time',
  'Transfer to your team when needed',
];

export function ModernAiEmployee({ onLearnMore }: ModernAiEmployeeProps) {
  return (
    <section className="py-16 sm:py-24 bg-white border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* ── Left Column: Active Call Screen & Live Transcript Mockup ── */}
          <div className="lg:col-span-7">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 rounded-3xl bg-slate-50 border border-slate-200/90 p-4 sm:p-6 shadow-xl items-center">
              
              {/* Phone Caller Card (5 cols on sm) */}
              <div className="sm:col-span-5 rounded-2xl bg-white border border-slate-200/80 p-4 shadow-md flex flex-col items-center text-center space-y-4">
                
                {/* Caller Photo */}
                <div className="relative size-20 rounded-full overflow-hidden border-2 border-emerald-500 shadow-md">
                  <Image
                    src="/images/landing/persona-customer.png"
                    alt="Customer on call"
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                    AI Voice Receptionist
                  </div>
                  <p className="text-xs text-slate-400 font-mono">00:36</p>
                </div>

                {/* Animated Waveform Visualizer */}
                <div className="flex items-center justify-center gap-1 h-8 w-full px-4">
                  <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1s_ease-in-out_infinite] h-3" />
                  <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1.2s_ease-in-out_infinite] h-6" />
                  <span className="w-1 bg-emerald-600 rounded-full animate-[pulse_0.8s_ease-in-out_infinite] h-8" />
                  <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1.1s_ease-in-out_infinite] h-5" />
                  <span className="w-1 bg-emerald-400 rounded-full animate-[pulse_0.9s_ease-in-out_infinite] h-7" />
                  <span className="w-1 bg-emerald-500 rounded-full animate-[pulse_1.3s_ease-in-out_infinite] h-4" />
                </div>

                {/* Call Action Controls */}
                <div className="flex items-center justify-center gap-4 pt-1">
                  <div className="size-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
                    <Mic className="size-4" />
                  </div>
                  <div className="size-10 rounded-full bg-red-500 text-white flex items-center justify-center shadow-sm">
                    <PhoneOff className="size-4.5" />
                  </div>
                  <div className="size-9 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs">
                    <Grid className="size-4" />
                  </div>
                </div>
              </div>

              {/* Live Transcript & CRM Sync Panel (7 cols on sm) */}
              <div className="sm:col-span-7 space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 pb-1 border-b border-slate-200">
                  <span className="size-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Live Transcript</span>
                </div>

                {/* Chat Transcript Bubbles */}
                <div className="space-y-2.5 text-xs">
                  {/* Caller line */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
                    <p className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                      <User className="size-3 text-slate-400" /> Caller
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      "Hi, I have a leaking pipe in my kitchen."
                    </p>
                  </div>

                  {/* AI Employee line */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs space-y-0.5">
                    <p className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                      <Bot className="size-3 text-emerald-600" /> AI Employee
                    </p>
                    <p className="text-emerald-950 leading-relaxed">
                      "I can help with that. Can I get your address and a good time for a visit?"
                    </p>
                  </div>

                  {/* Caller line 2 */}
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 shadow-2xs space-y-0.5">
                    <p className="font-bold text-slate-800 flex items-center gap-1 text-[11px]">
                      <User className="size-3 text-slate-400" /> Caller
                    </p>
                    <p className="text-slate-600 leading-relaxed">
                      "Sure, 114 Sector 54, Gurugram. Tomorrow afternoon."
                    </p>
                  </div>

                  {/* AI Employee line 2 */}
                  <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200/80 shadow-2xs space-y-0.5">
                    <p className="font-bold text-emerald-800 flex items-center gap-1 text-[11px]">
                      <Bot className="size-3 text-emerald-600" /> AI Employee
                    </p>
                    <p className="text-emerald-950 leading-relaxed">
                      "Great! I've booked an appointment for tomorrow at 2:00 PM. You'll get a confirmation by text."
                    </p>
                  </div>
                </div>

                {/* 4 Auto-sync checklist items */}
                <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-200">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                    <span>Lead captured in CRM</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                    <span>Appointment booked</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                    <span>Job created &amp; assigned</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700">
                    <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
                    <span>Confirmation sent to customer</span>
                  </div>
                </div>

              </div>

            </div>
          </div>

          {/* ── Right Column: Copy, Bullets & CTA ── */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.18]">
              Never miss another call <br />
              with AI Employee.
            </h2>

            <p className="text-base text-slate-600 leading-relaxed">
              Your 24/7 AI receptionist answers calls, qualifies leads, books appointments and syncs everything to your CRM — even after hours.
            </p>

            <ul className="space-y-3 pt-2">
              {aiBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button
                onClick={onLearnMore}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-12 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Learn About AI Employee</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
