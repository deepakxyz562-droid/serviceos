'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  ArrowRight,
  FileText,
  CreditCard,
  PenTool,
  UploadCloud,
  Layers,
  Smartphone,
  Sparkles,
  Sliders,
  Type,
  Phone,
  Mail,
  CheckSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ModernFormStudioProps {
  onExploreStudio?: () => void;
}

const formBullets = [
  '20,000+ templates & 200+ widgets',
  'Payments, e-signature and file uploads',
  'Photo markup, GPS and calculations',
  'Automate workflows and follow-ups',
];

export function ModernFormStudio({ onExploreStudio }: ModernFormStudioProps) {
  const [selectedService, setSelectedService] = React.useState('repair');

  return (
    <section className="py-16 sm:py-24 bg-slate-50/70 border-b border-slate-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* ── Left Column: Headline, Bullets & CTA ── */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              AI FORMS &amp; AUTOMATION
            </p>

            <h2 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-slate-900 tracking-tight leading-[1.18]">
              Collect information, <br />
              payments and signatures <br />
              — with AI.
            </h2>

            <p className="text-base text-slate-600 leading-relaxed">
              Create smart forms, surveys and documents for estimates, inspections, contracts and more.
            </p>

            <ul className="space-y-3 pt-2">
              {formBullets.map((bullet) => (
                <li key={bullet} className="flex items-center gap-2.5 text-sm font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <Button
                onClick={onExploreStudio}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-12 px-6 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <span>Explore Form Studio</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* ── Right Column: Form Studio Visual Mockup ── */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-white border border-slate-200/90 shadow-xl overflow-hidden">
              
              {/* Studio Topbar */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/80">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <span className="text-slate-400">Form Studio</span>
                  <span className="text-slate-300">→</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <FileText className="h-3.5 w-3.5" /> AC Service Request
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ● Live Embed Ready
                  </span>
                </div>
              </div>

              {/* Studio Canvas Grid: Left Palette + Center Form + Right Mobile Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-12 min-h-[360px] bg-slate-50/30">
                
                {/* Left Field Palette (3 cols) */}
                <div className="hidden sm:block sm:col-span-3 p-3 border-r border-slate-200/80 bg-white space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Form Fields
                  </p>
                  {[
                    { label: 'Short Text', icon: Type },
                    { label: 'Phone Number', icon: Phone },
                    { label: 'Email Address', icon: Mail },
                    { label: 'Service Choice', icon: CheckSquare },
                    { label: 'Photo Upload', icon: UploadCloud },
                    { label: 'E-Signature', icon: PenTool },
                    { label: 'Online Payment', icon: CreditCard },
                  ].map((field) => {
                    const Icon = field.icon;
                    return (
                      <div
                        key={field.label}
                        className="flex items-center gap-2 p-2 rounded-lg border border-slate-100 bg-slate-50 text-[11px] font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors cursor-grab"
                      >
                        <Icon className="h-3.5 w-3.5 text-slate-500" />
                        <span>{field.label}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Center Live Form Canvas (6 cols) */}
                <div className="sm:col-span-6 p-4 sm:p-5 bg-white space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-slate-900">AC Service Request</h3>
                    <p className="text-xs text-slate-500">Book an expert technician in Gurugram</p>
                  </div>

                  <div className="space-y-3 text-xs">
                    {/* Full Name field */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 text-[11px]">Full Name</label>
                      <div className="h-9 px-3 rounded-lg border border-slate-200 flex items-center text-slate-600 bg-slate-50/50">
                        Rajesh Khanna
                      </div>
                    </div>

                    {/* Phone Number field */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 text-[11px]">Phone Number</label>
                      <div className="h-9 px-3 rounded-lg border border-slate-200 flex items-center text-slate-600 bg-slate-50/50">
                        +91 98765 43210
                      </div>
                    </div>

                    {/* Service Type Pills */}
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700 text-[11px]">Service Type</label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'repair', label: 'AC Repair' },
                          { id: 'maint', label: 'AC Maintenance' },
                          { id: 'install', label: 'New Install' },
                        ].map((srv) => (
                          <button
                            key={srv.id}
                            type="button"
                            onClick={() => setSelectedService(srv.id)}
                            className={`p-1.5 text-center text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                              selectedService === srv.id
                                ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                                : 'border-slate-200 bg-slate-50 text-slate-600'
                            }`}
                          >
                            {srv.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Photo Upload Zone */}
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 text-[11px]">Upload Photos</label>
                      <div className="p-3 rounded-lg border-2 border-dashed border-slate-200 text-center space-y-1 bg-slate-50/40">
                        <UploadCloud className="h-4 w-4 text-emerald-600 mx-auto" />
                        <p className="text-[10px] text-slate-500 font-medium">Click or drag photos of the AC unit</p>
                      </div>
                    </div>
                  </div>

                  <Button className="w-full h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg">
                    Next Step →
                  </Button>
                </div>

                {/* Right Mobile Phone Preview (3 cols) */}
                <div className="hidden sm:flex sm:col-span-3 p-3 border-l border-slate-200/80 bg-slate-50/60 flex-col items-center justify-center">
                  <div className="w-full max-w-[150px] rounded-2xl border-4 border-slate-800 bg-white p-2.5 shadow-md space-y-2 text-[8px]">
                    <div className="h-1.5 w-8 bg-slate-300 rounded-full mx-auto" />
                    <p className="font-bold text-slate-900 text-[9px]">AC Service</p>
                    <div className="h-4 rounded bg-slate-100 px-1.5 flex items-center text-slate-500">Rajesh</div>
                    <div className="h-4 rounded bg-slate-100 px-1.5 flex items-center text-slate-500">+91 98765...</div>
                    <div className="h-8 rounded bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 font-bold">
                      AC Repair (Selected)
                    </div>
                    <div className="h-4 rounded bg-emerald-600 text-white flex items-center justify-center font-bold">
                      Book Now
                    </div>
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
