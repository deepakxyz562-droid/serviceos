'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  TrendingUp,
  MapPin,
  Clock,
  Phone,
  Bot,
  Calendar,
  Sparkles,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernHeroProps {
  onGetStarted?: () => void;
  onExplore?: () => void;
}

const checkItems = [
  'CRM & Leads',
  'Scheduling & Live Dispatch',
  'Invoicing & Online Payments',
  'AI Voice Receptionist (24/7)',
  'Forms, Websites, Marketing & More',
];

export function ModernHero({ onGetStarted, onExplore }: ModernHeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50/60 via-white to-white pt-10 pb-16 lg:pt-16 lg:pb-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* ── Left Column: Copy, Value Props & CTAs ── */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                AI OPERATING SYSTEM FOR SERVICE BUSINESSES
              </span>
            </div>

            {/* Main H1 Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[54px] font-extrabold text-slate-900 tracking-tight leading-[1.12]">
              Run your entire <br className="hidden sm:inline" />
              service business. <br />
              <span className="text-emerald-500">One powerful platform.</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              Get more leads, book jobs, dispatch your team, send invoices, get paid and grow — with AI. Everything you need to run and scale your service business, in one place.
            </p>

            {/* 5 Checkpoints */}
            <ul className="space-y-2.5 pt-1">
              {checkItems.map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-3">
              <Button
                onClick={onGetStarted}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm sm:text-base h-12 px-6 rounded-lg shadow-md flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Start Free — 100 Jobs Included</span>
                <ArrowRight className="h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                onClick={onExplore}
                className="border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm sm:text-base h-12 px-6 rounded-lg cursor-pointer"
              >
                Explore Platform
              </Button>
            </div>

            {/* Trust Footnote */}
            <p className="text-xs text-slate-500 pt-1">
              No credit card required · Live in under 10 minutes
            </p>
          </div>

          {/* ── Right Column: Interactive Visual Showcase & Mockups ── */}
          <div className="lg:col-span-6 relative">
            
            {/* Background technician hero photo container */}
            <div className="relative mx-auto max-w-lg lg:max-w-none rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-900 border border-slate-200 aspect-[4/3] sm:aspect-[16/11]">
              <Image
                src="/images/landing/hero-worker.png"
                alt="Service professional with tablet and service van"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-center opacity-85 hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
            </div>

            {/* Floating Card 1: Dashboard & Schedule Card (Top-Left / Center Overlay) */}
            <div className="absolute -top-4 sm:-top-6 -left-2 sm:-left-6 w-72 sm:w-84 rounded-2xl bg-white/95 backdrop-blur-md p-4 sm:p-5 shadow-2xl border border-slate-200/90 text-slate-900 z-20 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    F
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">Good morning, Singh! 👋</p>
                    <p className="text-[10px] text-slate-500">Live Dispatch Dashboard</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5 justify-end">
                    <TrendingUp className="h-3 w-3" /> ₹82,490
                  </span>
                  <span className="text-[9px] text-slate-400">Today's Revenue</span>
                </div>
              </div>

              {/* Today's Schedule Mini-list */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Today's Schedule</p>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-500" />
                    <span className="font-semibold text-slate-800 text-[11px]">AC Repair</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">10:00 AM · Sec 56</span>
                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">On Job</span>
                </div>

                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-blue-500" />
                    <span className="font-semibold text-slate-800 text-[11px]">Plumbing Check</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">11:30 AM · DLF Phase 2</span>
                  <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">Scheduled</span>
                </div>
              </div>

              {/* Mini Dispatch Map Footer */}
              <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600">
                <div className="flex items-center gap-1 text-emerald-600 font-semibold">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>4 Technicians Live</span>
                </div>
                <span className="text-slate-400 text-[10px]">Gurugram Central</span>
              </div>
            </div>

            {/* Floating Card 2: AI Voice Receptionist Widget (Bottom-Right Overlay) */}
            <div className="absolute -bottom-6 sm:-bottom-8 -right-2 sm:-right-6 w-68 sm:w-76 rounded-2xl bg-white/95 backdrop-blur-md p-4 shadow-2xl border border-slate-200/90 text-slate-900 z-30 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Bot className="h-3.5 w-3.5 text-emerald-600" />
                    AI Voice Receptionist
                  </span>
                </div>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                  24/7 Active
                </span>
              </div>

              {/* Speech bubble */}
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-700 leading-tight">
                <p className="italic text-slate-600">"Hi, I need an AC repair in Gurugram tomorrow afternoon."</p>
              </div>

              {/* AI Actions Completed List */}
              <div className="space-y-1 pt-0.5">
                {[
                  'Lead captured in CRM',
                  'Customer details saved',
                  'Appointment booked (2:00 PM)',
                  'Confirmation sent via SMS',
                ].map((act) => (
                  <div key={act} className="flex items-center gap-1.5 text-[10px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>{act}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
