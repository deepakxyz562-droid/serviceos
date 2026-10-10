'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  MapPin,
  Clock,
  User,
  Truck,
  Calendar,
  Layers,
  Search,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernDispatchProps {
  onViewDemo?: () => void;
}

const dispatchBullets = [
  'Live GPS tracking',
  'Drag & drop dispatch board',
  'Route optimization (OSRM)',
  'Customer & employee portals',
  'Recurring jobs and maintenance contracts',
];

const mockJobs = [
  {
    title: 'AC Repair',
    customer: 'Gaurav Sharma',
    time: '10:00 AM · Sector 56',
    status: 'On Job',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    typeColor: 'bg-emerald-500',
  },
  {
    title: 'Plumbing Inspection',
    customer: 'Amit Verma',
    time: '11:30 AM · DLF Phase 2',
    status: 'Scheduled',
    statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
    typeColor: 'bg-blue-500',
  },
  {
    title: 'Electrical Installation',
    customer: 'Sunidhi Yadav',
    time: '02:00 PM · Udyog Vihar',
    status: 'On Job',
    statusColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    typeColor: 'bg-amber-500',
  },
  {
    title: 'HVAC Maintenance',
    customer: 'Anil Gupta',
    time: '04:30 PM · Golf Course Road',
    status: 'Scheduled',
    statusColor: 'bg-blue-100 text-blue-800 border-blue-200',
    typeColor: 'bg-purple-500',
  },
];

export function ModernDispatch({ onViewDemo }: ModernDispatchProps) {
  const [activeTab, setActiveTab] = React.useState('all');

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* ── Left Column: Headline, Bullets & CTA ── */}
          <div className="lg:col-span-5 space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.18]">
              Dispatch smarter. <br />
              Complete more jobs.
            </h2>

            <p className="text-base text-slate-600 leading-relaxed">
              See your team in real time, assign jobs with AI, pick the best routes and keep customers updated.
            </p>

            <ul className="space-y-3 pt-2">
              {dispatchBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button
                onClick={onViewDemo}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-12 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>View Dispatch Demo</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Right Column: Interactive Dispatch Board Mockup ── */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden">
              
              {/* Mockup Window Topbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="text-slate-400">Fieseros</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-emerald-700 flex items-center gap-1.5 font-bold">
                    <Navigation className="h-3.5 w-3.5" /> Live Dispatch
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    ● Real-time GPS Active
                  </span>
                </div>
              </div>

              {/* Mockup Filter Tabs */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-100 bg-white text-xs font-medium">
                <button
                  type="button"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'all'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  All Jobs (12)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('unassigned')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'unassigned'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Unassigned (1)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('onjob')}
                  className={`px-3 py-1 rounded-md transition-colors ${
                    activeTab === 'onjob'
                      ? 'bg-emerald-50 text-emerald-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  On Job (4)
                </button>
              </div>

              {/* Split Board: Jobs List + Live Map */}
              <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[340px]">
                
                {/* Left Jobs Column (5 cols) */}
                <div className="sm:col-span-5 p-3 border-r border-slate-100 space-y-2.5 bg-slate-50/40">
                  {mockJobs.map((job) => (
                    <div
                      key={job.title}
                      className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs hover:border-emerald-400 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className={`size-2 rounded-full ${job.typeColor}`} />
                          <span className="font-bold text-xs text-slate-900">{job.title}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${job.statusColor}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 font-medium">{job.customer}</p>
                      <p className="text-[10px] text-slate-400">{job.time}</p>
                    </div>
                  ))}
                </div>

                {/* Right Live Map Column (7 cols) */}
                <div className="sm:col-span-7 relative bg-slate-100 overflow-hidden flex items-center justify-center p-4">
                  {/* Subtle Map Grid Representation */}
                  <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-70" />

                  {/* Visual Route Line SVG */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M 60 80 Q 150 120 220 180 T 320 220"
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="3"
                      strokeDasharray="6 4"
                      className="animate-pulse"
                    />
                  </svg>

                  {/* Map Pin 1 */}
                  <div className="absolute top-12 left-10 flex flex-col items-center">
                    <div className="size-6 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                      <MapPin className="size-3.5" />
                    </div>
                    <span className="text-[9px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-xs mt-0.5 text-slate-700">
                      Sector 56
                    </span>
                  </div>

                  {/* Map Pin 2 */}
                  <div className="absolute bottom-16 left-28 flex flex-col items-center">
                    <div className="size-6 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-lg ring-2 ring-white">
                      <MapPin className="size-3.5" />
                    </div>
                    <span className="text-[9px] font-bold bg-white/90 px-1.5 py-0.5 rounded shadow-xs mt-0.5 text-slate-700">
                      DLF Ph 2
                    </span>
                  </div>

                  {/* Active Technician Floating Tooltip Pin */}
                  <div className="absolute top-28 right-8 z-10">
                    <div className="flex items-center gap-2 p-2 rounded-xl bg-white shadow-xl border border-emerald-500/80 ring-2 ring-emerald-500/20">
                      <div className="size-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                        R
                      </div>
                      <div className="pr-1">
                        <p className="text-xs font-bold text-slate-900">Rakesh</p>
                        <p className="text-[10px] font-semibold text-emerald-600">On Job · 12 mins left</p>
                      </div>
                    </div>
                  </div>

                  {/* Map Location Badge */}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-600 border border-slate-200 shadow-2xs">
                    📍 Gurugram Live Coverage
                  </div>

                </div>

              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
