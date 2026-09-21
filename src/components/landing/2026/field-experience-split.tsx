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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function FieldExperienceSplit() {
  const [activeJobStatus, setActiveJobStatus] = useState<'assigned' | 'en_route' | 'on_site' | 'completed'>('on_site');

  const statusList = [
    { id: 'assigned', label: '01. Assigned', time: '09:00 AM', desc: 'Job packet pushed to tech phone' },
    { id: 'en_route', label: '02. En Route', time: '09:42 AM', desc: 'Customer receives live Uber-style ETA link' },
    { id: 'on_site', label: '03. On Site', time: '10:00 AM', desc: 'Digital safety checklist & before photos taken' },
    { id: 'completed', label: '04. Completed', time: '11:15 AM', desc: 'Sign-off collected & invoice payment link sent' },
  ];

  return (
    <section className="py-20 bg-slate-950 text-white border-b border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold">
            <Wrench className="size-3.5" />
            <span>SEAMLESS OFFICE &amp; FIELD SYNC</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Your office sees the business.{' '}
            <span className="bg-gradient-to-r from-amber-400 to-teal-400 bg-clip-text text-transparent">
              Your technicians see the work.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Zero paper clipboards. Zero missing parts notes. The office dispatch board and field technician mobile app stay synchronized in real time.
          </p>
        </div>

        {/* Live Status Tracker Bar */}
        <div className="max-w-4xl mx-auto bg-slate-900/90 rounded-2xl p-2.5 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statusList.map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setActiveJobStatus(st.id as any)}
              className={`p-3 rounded-xl text-left transition-all cursor-pointer ${
                activeJobStatus === st.id
                  ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-extrabold">{st.label}</span>
                <span className="opacity-75 font-mono">{st.time}</span>
              </div>
              <p className="text-[10px] opacity-80 truncate mt-0.5">{st.desc}</p>
            </button>
          ))}
        </div>

        {/* Split Screen Grid (Office Desktop vs Field Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Office Dispatch & Operations View (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Laptop className="size-4 text-teal-400" />
                <span>Office Live Dispatch &amp; Operations Command</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-teal-400 border-teal-500/30">
                Desktop Web
              </Badge>
            </div>

            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
              <Image
                src="/images/landing/step-dispatch.png"
                alt="Office Dispatch Board"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 60vw"
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400">Active Fleet</p>
                <p className="text-sm font-bold text-white">8 Technicians</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400">Scheduled Jobs</p>
                <p className="text-sm font-bold text-teal-400">23 Work Orders</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400">Today's Pipeline</p>
                <p className="text-sm font-bold text-emerald-400">£8,940</p>
              </div>
            </div>
          </div>

          {/* Right: Field Technician Mobile PWA App (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/70 p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <Smartphone className="size-4 text-amber-400" />
                <span>Technician Mobile PWA App</span>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-400 border-amber-500/30">
                iOS &amp; Android PWA
              </Badge>
            </div>

            <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-inner">
              <Image
                src="/images/landing/persona-technician.png"
                alt="Mobile Technician Work Execution"
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>

            <ul className="space-y-2 pt-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
                <span>Full offline job packets &amp; GPS customer directions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
                <span>On-site photo uploads with before/after damage notes</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="size-3.5 text-amber-400 shrink-0" />
                <span>Digital customer signature &amp; instant sign-off capture</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
