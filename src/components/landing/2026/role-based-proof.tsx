'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  Users,
  Briefcase,
  Wrench,
  HeartHandshake,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  MapPin,
  Smartphone,
  CreditCard,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface RoleProof {
  id: string;
  role: string;
  title: string;
  tagline: string;
  icon: any;
  benefits: string[];
  imageSrc: string;
}

const ROLES: RoleProof[] = [
  {
    id: 'owner',
    role: 'Business Owner',
    title: 'Complete Revenue Visibility & Growth',
    tagline: 'Track profit margins, monitor team yields, and keep 100% of customer payments with 0% platform fee.',
    icon: TrendingUp,
    benefits: [
      'Real-time cash flow & unbilled revenue monitoring',
      'Autonomous customer reactivation & review collection',
      'Zero double data-entry across accounting & field ops',
    ],
    imageSrc: '/images/landing/persona-owner.png',
  },
  {
    id: 'dispatcher',
    role: 'Office Dispatcher',
    title: 'Frictionless Schedule & Route Control',
    tagline: 'Match the right technician to the right job with live GPS proximity, skill tags, and emergency re-routing.',
    icon: MapPin,
    benefits: [
      'Live drag-and-drop calendar with Google 2-way sync',
      'Automated transit travel buffers between consecutive calls',
      'Unified SMS, WhatsApp, and email customer messaging',
    ],
    imageSrc: '/images/landing/persona-dispatcher.png',
  },
  {
    id: 'technician',
    role: 'Field Technician',
    title: 'Everything Needed in the Mobile Palm',
    tagline: 'Full offline job packets, digital safety checklists, photo damage markup, and on-screen signature collection.',
    icon: Wrench,
    benefits: [
      'Turn-by-turn navigation and property access codes',
      'On-site photo uploads with notes and line item additions',
      'Instant job completion and automated invoice triggers',
    ],
    imageSrc: '/images/landing/persona-technician.png',
  },
  {
    id: 'customer',
    role: 'Customer / Client',
    title: '5-Star Modern Digital Experience',
    tagline: 'Transparent live pricing quotes, Uber-style technician tracking, and frictionless one-tap card payments.',
    icon: HeartHandshake,
    benefits: [
      'Interactive online estimates with e-sign approvals',
      'SMS & WhatsApp live ETA updates with tech photo',
      'Instant digital receipts with 0% surcharge checkout',
    ],
    imageSrc: '/images/landing/persona-customer.png',
  },
];

export function RoleBasedProof() {
  const [selectedRoleId, setSelectedRoleId] = useState('owner');
  const activeRole = ROLES.find((r) => r.id === selectedRoleId) || ROLES[0];
  const ActiveIcon = activeRole.icon;

  return (
    <section className="py-20 bg-slate-50 text-slate-900 border-b border-border dark:bg-slate-950 dark:text-white dark:border-slate-800 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-700 dark:text-teal-400 text-xs font-semibold">
            <Users className="size-3.5" />
            <span>ROLE-SPECIFIC EXPERIENCE</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground dark:text-white leading-tight">
            Built for the people who{' '}
            <span className="bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 dark:from-teal-400 dark:via-emerald-300 dark:to-cyan-400 bg-clip-text text-transparent">
              actually run the work.
            </span>
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
            From the business owner tracking net margins to the field technician on a roof, every stakeholder gets a purpose-built experience.
          </p>
        </div>

        {/* 4 Role Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
          {ROLES.map((r) => {
            const isSelected = selectedRoleId === r.id;
            const Icon = r.icon;

            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedRoleId(r.id)}
                className={`p-3.5 rounded-2xl text-center border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-teal-600 text-white dark:bg-teal-500 dark:text-slate-950 border-teal-500 shadow-md ring-2 ring-teal-500/30 font-bold'
                    : 'bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="size-5" />
                <span className="text-xs font-semibold">{r.role}</span>
              </button>
            );
          })}
        </div>

        {/* Selected Role Proof Showcase */}
        <div className="rounded-3xl border border-border bg-card p-6 sm:p-10 shadow-xl dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <Badge className="bg-teal-500/10 text-teal-700 border border-teal-500/30 dark:bg-teal-500/20 dark:text-teal-400 text-xs font-bold">
                {activeRole.role} Experience
              </Badge>
              <h3 className="text-2xl sm:text-3xl font-black text-foreground dark:text-white">{activeRole.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground dark:text-slate-300 leading-relaxed">{activeRole.tagline}</p>
            </div>

            <ul className="space-y-3 border-t border-border dark:border-slate-800 pt-4">
              {activeRole.benefits.map((b, idx) => (
                <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                  <CheckCircle2 className="size-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6 rounded-2xl border border-border bg-muted/40 p-3 overflow-hidden shadow-inner dark:border-slate-800 dark:bg-slate-950">
            <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-background border border-border dark:bg-slate-900 dark:border-slate-800">
              <Image
                src={activeRole.imageSrc}
                alt={activeRole.title}
                fill
                className="object-cover object-top"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
