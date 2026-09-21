'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Laptop,
  Smartphone,
  MapPin,
  CheckCircle2,
  Clock,
  Wrench,
  Camera,
  Signature,
  FileCheck,
  Send,
  Sparkles,
  Navigation,
  Check,
  ShieldCheck,
  CreditCard,
  User,
  Phone,
  ArrowRight,
  Radio,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type JobStatus = 'assigned' | 'en_route' | 'on_site' | 'completed';

interface StageData {
  id: JobStatus;
  step: string;
  time: string;
  title: string;
  desc: string;
  officeTitle: string;
  officeBadge: string;
  officeDetail: string;
  officeAction: string;
  mobileTitle: string;
  mobileBadge: string;
  mobileStatusText: string;
  techActionText: string;
}

const STAGES: StageData[] = [
  {
    id: 'assigned',
    step: '01. Assigned',
    time: '09:00 AM',
    title: 'Instant Job Dispatch',
    desc: 'Job packet & diagnostic notes pushed directly to technician phone',
    officeTitle: 'Live Dispatch Board — Job #4829 Dispatched',
    officeBadge: 'Auto-Routed to Mike S.',
    officeDetail: 'Boiler pressure failure · 48 King Road, London · Quoted £450',
    officeAction: 'Tech notified via Mobile PWA · Customer calendar slot locked',
    mobileTitle: 'New Work Order Alert',
    mobileBadge: 'High Priority',
    mobileStatusText: 'Job Packet Received · 9:00 AM Slot',
    techActionText: 'Tap "Start Route" to notify customer with live tracking link',
  },
  {
    id: 'en_route',
    step: '02. En Route',
    time: '09:42 AM',
    title: 'Live GPS & Uber-Style ETA',
    desc: 'Customer receives automated SMS with live technician tracking map',
    officeTitle: 'GPS Fleet Tracking — Van #04 in Transit',
    officeBadge: 'ETA: 12 Minutes (2.4 miles)',
    officeDetail: 'Speed: 28 mph · Live traffic route optimized via Google Maps',
    officeAction: 'Automated SMS sent to Sarah Watson: "Mike is en route to you"',
    mobileTitle: 'Turn-by-Turn Navigation Active',
    mobileBadge: 'Live GPS',
    mobileStatusText: '48 King Road, London · 12 min ETA',
    techActionText: 'Customer tracking active · SMS confirmation delivered',
  },
  {
    id: 'on_site',
    step: '03. On Site',
    time: '10:00 AM',
    title: 'Digital Checklist & Photos',
    desc: 'Safety checklist verification and high-res before/after photo capture',
    officeTitle: 'On-Site Diagnostic & Safety Log Live',
    officeBadge: 'Checklist 4/4 Complete',
    officeDetail: 'Burner pressure tested (1.8 bar) · 2 Inspection photos uploaded',
    officeAction: 'Office receives live photo stream · Zero missing diagnostic notes',
    mobileTitle: 'Safety Checklist & Photos',
    mobileBadge: '4 of 4 Verified',
    mobileStatusText: 'Burner valve replaced · Pressure normalized',
    techActionText: 'Before photos attached · Ready for customer sign-off',
  },
  {
    id: 'completed',
    step: '04. Completed',
    time: '11:15 AM',
    title: 'E-Sign & Instant 0% Payment',
    desc: 'Customer e-signature captured and £450 payment processed on-site',
    officeTitle: 'Job Reconciled & Payment Received',
    officeBadge: '£450.00 Paid · 0% Fee',
    officeDetail: 'Digital sign-off by Sarah Watson · Invoice #INV-8924 settled',
    officeAction: 'Automated 5-Star Google Review request queued for 11:30 AM',
    mobileTitle: 'Sign-Off & Tap-to-Pay',
    mobileBadge: 'Payment Successful',
    mobileStatusText: 'Sarah Watson signed · £450.00 collected',
    techActionText: 'Work order closed · Auto-syncing with accounting ledger',
  },
];

export function FieldExperienceSplit() {
  const [activeJobStatus, setActiveJobStatus] = useState<JobStatus>('on_site');
  const currentStage = STAGES.find((s) => s.id === activeJobStatus) || STAGES[2];

  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-r from-amber-500/10 via-teal-500/10 to-emerald-500/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 relative z-10">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Wrench className="size-3.5" />
            <span>REAL-TIME OFFICE ↔ FIELD SYNCHRONIZATION</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Your office sees the business.{' '}
            <span className="bg-gradient-to-r from-amber-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
              Your technicians see the work.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Zero paper clipboards. Zero missing parts notes. The office dispatch board and field technician mobile PWA app stay synchronized in real time.
          </p>
        </div>

        {/* Live Interactive Status Stepper Bar */}
        <div className="max-w-5xl mx-auto bg-slate-900/90 rounded-2xl p-2 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 backdrop-blur-md shadow-2xl">
          {STAGES.map((st) => {
            const isActive = activeJobStatus === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setActiveJobStatus(st.id)}
                className={`p-3.5 rounded-xl text-left transition-all duration-300 cursor-pointer relative overflow-hidden ${
                  isActive
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg font-bold scale-[1.02]'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/70 border border-transparent'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-extrabold tracking-wide">{st.step}</span>
                  <span className={`font-mono text-[11px] ${isActive ? 'text-slate-900 font-bold' : 'text-slate-500'}`}>
                    {st.time}
                  </span>
                </div>
                <p className={`text-xs font-semibold truncate ${isActive ? 'text-slate-950' : 'text-slate-300'}`}>
                  {st.title}
                </p>
                <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-slate-900/80' : 'text-slate-500'}`}>
                  {st.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Split Screen Grid (Office Desktop vs Field Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* ═══════════════════════════════════════════════════════════════════
              LEFT: OFFICE DISPATCH & OPERATIONS COMMAND (7 cols)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-7 flex flex-col justify-between shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-white">
                <Laptop className="size-5 text-teal-400" />
                <span>Office Live Dispatch &amp; Operations Command</span>
              </div>
              <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/40 text-xs px-2.5 py-1">
                Live Desktop Web
              </Badge>
            </div>

            {/* Dynamic Stage Banner */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Radio className="size-3.5 animate-pulse text-emerald-400" />
                  {currentStage.officeTitle}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/30 font-semibold font-mono">
                  {currentStage.officeBadge}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-200">{currentStage.officeDetail}</p>
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                {currentStage.officeAction}
              </p>
            </div>

            {/* Visual Dispatch Board Representation */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner group">
              <Image
                src="/images/landing/step-dispatch.png"
                alt="Office Dispatch Board"
                fill
                className="object-cover object-top transition-transform duration-500 group-hover:scale-102"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end p-4">
                <div className="flex items-center justify-between w-full text-xs bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-700/80">
                  <div className="flex items-center gap-2">
                    <div className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span className="font-bold text-white">Technician Mike S. (Van #04)</span>
                  </div>
                  <span className="text-slate-300 font-mono text-[11px]">Last GPS Ping: 2s ago</span>
                </div>
              </div>
            </div>

            {/* 3 Fleet KPI Metric Cards */}
            <div className="grid grid-cols-3 gap-3 pt-1 text-center text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium">Active Fleet</p>
                <p className="text-base font-extrabold text-white mt-0.5">8 Technicians</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium">Scheduled Jobs</p>
                <p className="text-base font-extrabold text-teal-400 mt-0.5">23 Work Orders</p>
              </div>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[11px] text-slate-400 font-medium">Today's Pipeline</p>
                <p className="text-base font-extrabold text-emerald-400 mt-0.5">£8,940</p>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              RIGHT: FIELD TECHNICIAN MOBILE PWA APP (5 cols)
          ══════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-7 flex flex-col justify-between shadow-2xl space-y-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5 text-sm sm:text-base font-bold text-white">
                <Smartphone className="size-5 text-amber-400" />
                <span>Technician Mobile PWA App</span>
              </div>
              <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-xs px-2.5 py-1">
                iOS &amp; Android PWA
              </Badge>
            </div>

            {/* Smartphone Simulated Card */}
            <div className="p-5 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-xl space-y-4 relative">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {currentStage.mobileTitle}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-semibold">
                  {currentStage.mobileBadge}
                </span>
              </div>

              {/* Dynamic Content based on active tab */}
              {activeJobStatus === 'assigned' && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white">
                    <span>Emergency Boiler Service</span>
                    <span className="text-emerald-400">£450.00</span>
                  </div>
                  <p className="text-xs text-slate-300">Customer: Sarah Watson · 48 King Road</p>
                  <div className="flex items-center gap-2 pt-2">
                    <button type="button" className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition">
                      Accept Job Packet
                    </button>
                  </div>
                </div>
              )}

              {activeJobStatus === 'en_route' && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-teal-400">
                    <Navigation className="size-4 animate-bounce" />
                    <span>Live GPS Navigation · 12 min ETA</span>
                  </div>
                  <p className="text-xs text-slate-300">Destination: 48 King Road, London W1</p>
                  <div className="p-2 rounded-lg bg-teal-950/60 border border-teal-500/30 text-[11px] text-teal-300">
                    ✓ SMS Tracking link sent to customer phone (+44 7911 123456)
                  </div>
                </div>
              )}

              {activeJobStatus === 'on_site' && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>On-Site Safety Checklist</span>
                    <span className="text-xs text-emerald-400 font-mono">4/4 Complete</span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> Gas supply isolated</div>
                    <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> Burner pressure checked</div>
                    <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> Replacement valve fitted</div>
                    <div className="flex items-center gap-2"><Check className="size-3.5 text-emerald-400" /> 2 Before/after photos uploaded</div>
                  </div>
                </div>
              )}

              {activeJobStatus === 'completed' && (
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="text-xs font-bold text-white flex items-center justify-between">
                    <span>Customer Sign-Off &amp; Payment</span>
                    <span className="text-xs text-emerald-400 font-bold">PAID</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-300 space-y-1">
                    <div className="flex justify-between font-mono font-bold">
                      <span>Total Collected:</span>
                      <span>£450.00</span>
                    </div>
                    <p className="text-[11px] text-emerald-400">Payment via Apple Pay · 0% platform fee</p>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 font-medium">
                {currentStage.techActionText}
              </p>
            </div>

            {/* Offline PWA Capabilities List */}
            <ul className="space-y-2.5 pt-1 text-xs text-slate-300">
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" />
                <span>Full offline job packets &amp; GPS customer directions</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" />
                <span>On-site photo uploads with before/after damage notes</span>
              </li>
              <li className="flex items-center gap-2.5">
                <CheckCircle2 className="size-4 text-amber-400 shrink-0" />
                <span>Digital customer signature &amp; instant sign-off capture</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
