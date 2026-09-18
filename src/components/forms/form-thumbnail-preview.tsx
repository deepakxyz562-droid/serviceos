'use client';

import React from 'react';
import {
  FileText,
  User,
  Mail,
  Calendar,
  CreditCard,
  CheckSquare,
  Star,
  ShieldCheck,
  Camera,
  PenTool,
  Clock,
  Sparkles,
  Layers,
  HeartPulse,
  Wrench,
  CheckCircle2,
  DollarSign,
  Building2,
  MapPin,
  Upload,
  QrCode,
  Tag,
  Briefcase,
  Smile,
  ShieldAlert,
  Sliders,
  Check,
} from 'lucide-react';
import type { FormTemplate, TemplateCategoryId, TemplateIndustryId } from '@/lib/forms/templates';
import { getCategoryLabel, getIndustryLabel } from '@/lib/forms/templates';

interface FormThumbnailPreviewProps {
  template: FormTemplate;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// 12 Distinct Category Themes with rich gradients & accents
const CATEGORY_THEMES: Record<
  string,
  {
    gradient: string;
    headerBg: string;
    accentColor: string;
    buttonBg: string;
    badgeBg: string;
    badgeText: string;
    icon: typeof FileText;
    actionLabel: string;
  }
> = {
  order_forms: {
    gradient: 'from-violet-600 via-indigo-600 to-blue-600',
    headerBg: 'bg-indigo-50 dark:bg-indigo-950/40',
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    buttonBg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/60',
    badgeText: 'text-indigo-800 dark:text-indigo-300',
    icon: CreditCard,
    actionLabel: 'Complete Order',
  },
  payment_forms: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    icon: DollarSign,
    actionLabel: 'Pay Now · 0% Fee',
  },
  booking_forms: {
    gradient: 'from-teal-600 via-emerald-600 to-cyan-600',
    headerBg: 'bg-teal-50 dark:bg-teal-950/40',
    accentColor: 'text-teal-600 dark:text-teal-400',
    buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    badgeBg: 'bg-teal-100 dark:bg-teal-900/60',
    badgeText: 'text-teal-800 dark:text-teal-300',
    icon: Calendar,
    actionLabel: 'Book Appointment',
  },
  appointment_forms: {
    gradient: 'from-sky-600 via-blue-600 to-indigo-600',
    headerBg: 'bg-sky-50 dark:bg-sky-950/40',
    accentColor: 'text-sky-600 dark:text-sky-400',
    buttonBg: 'bg-sky-600 hover:bg-sky-700 text-white',
    badgeBg: 'bg-sky-100 dark:bg-sky-900/60',
    badgeText: 'text-sky-800 dark:text-sky-300',
    icon: Clock,
    actionLabel: 'Confirm Time Slot',
  },
  registration_forms: {
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    headerBg: 'bg-purple-50 dark:bg-purple-950/40',
    accentColor: 'text-purple-600 dark:text-purple-400',
    buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    icon: User,
    actionLabel: 'Register Attendee',
  },
  application_forms: {
    gradient: 'from-blue-600 via-indigo-600 to-slate-700',
    headerBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
    badgeText: 'text-blue-800 dark:text-blue-300',
    icon: Briefcase,
    actionLabel: 'Submit Application',
  },
  inspection_checklist: {
    gradient: 'from-amber-600 via-orange-600 to-yellow-600',
    headerBg: 'bg-amber-50 dark:bg-amber-950/40',
    accentColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    icon: CheckSquare,
    actionLabel: 'Complete Inspection',
  },
  waiver_consent: {
    gradient: 'from-slate-800 via-zinc-800 to-slate-950',
    headerBg: 'bg-slate-100 dark:bg-slate-800/60',
    accentColor: 'text-slate-800 dark:text-slate-200',
    buttonBg: 'bg-slate-900 hover:bg-black text-white',
    badgeBg: 'bg-slate-200 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    icon: ShieldCheck,
    actionLabel: 'Sign & Agree Digitally',
  },
  consent_forms: {
    gradient: 'from-rose-600 via-pink-600 to-purple-600',
    headerBg: 'bg-rose-50 dark:bg-rose-950/40',
    accentColor: 'text-rose-600 dark:text-rose-400',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    icon: HeartPulse,
    actionLabel: 'Submit Patient Info',
  },
  survey_forms: {
    gradient: 'from-cyan-600 via-sky-600 to-blue-600',
    headerBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    buttonBg: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/60',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    icon: Star,
    actionLabel: 'Submit Survey',
  },
  feedback_forms: {
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    headerBg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40',
    accentColor: 'text-fuchsia-600 dark:text-fuchsia-400',
    buttonBg: 'bg-fuchsia-600 hover:bg-fuchsia-700 text-white',
    badgeBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/60',
    badgeText: 'text-fuchsia-800 dark:text-fuchsia-300',
    icon: Sparkles,
    actionLabel: 'Send Review',
  },
  contact_forms: {
    gradient: 'from-emerald-600 via-teal-600 to-blue-600',
    headerBg: 'bg-emerald-50 dark:bg-emerald-950/40',
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
    badgeText: 'text-emerald-800 dark:text-emerald-300',
    icon: Mail,
    actionLabel: 'Send Inquiry',
  },
  quote_request: {
    gradient: 'from-amber-600 via-emerald-600 to-teal-600',
    headerBg: 'bg-amber-50 dark:bg-amber-950/40',
    accentColor: 'text-amber-600 dark:text-amber-400',
    buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
    badgeText: 'text-amber-800 dark:text-amber-300',
    icon: Wrench,
    actionLabel: 'Get Free Estimate',
  },
  donation_forms: {
    gradient: 'from-pink-600 via-rose-600 to-purple-600',
    headerBg: 'bg-pink-50 dark:bg-pink-950/40',
    accentColor: 'text-pink-600 dark:text-pink-400',
    buttonBg: 'bg-pink-600 hover:bg-pink-700 text-white',
    badgeBg: 'bg-pink-100 dark:bg-pink-900/60',
    badgeText: 'text-pink-800 dark:text-pink-300',
    icon: HeartPulse,
    actionLabel: 'Donate Now',
  },
};

const DEFAULT_THEME = {
  gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
  headerBg: 'bg-slate-50 dark:bg-slate-900/40',
  accentColor: 'text-emerald-600 dark:text-emerald-400',
  buttonBg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
  badgeText: 'text-emerald-800 dark:text-emerald-300',
  icon: FileText,
  actionLabel: 'Submit Form',
};

/**
 * FormThumbnailPreview — 12 Domain-Differentiated Visual Mockup Engines (Jotform Parity).
 * Generates an authentic, domain-tailored visual mockup for every template.
 */
export function FormThumbnailPreview({
  template,
  className = '',
}: FormThumbnailPreviewProps) {
  const primaryCat = template.categories[0] || 'general';
  const primaryInd = template.industries[0] || 'general';
  const theme = CATEGORY_THEMES[primaryCat] || DEFAULT_THEME;
  const CategoryIcon = theme.icon;

  const fields = template.schema.fields || [];

  // Determine which specific visual blueprint to render
  const isHealthcare = primaryCat.includes('consent') || primaryInd === 'dental' || primaryInd === 'healthcare' || template.id.includes('medical') || template.id.includes('patient');
  const isOrderOrPayment = primaryCat.includes('order') || primaryCat.includes('payment') || primaryInd === 'bakery' || primaryInd === 'restaurant' || template.id.includes('checkout') || template.id.includes('order');
  const isTradeOrHvac = primaryInd === 'hvac' || primaryInd === 'plumbing' || primaryInd === 'electrical' || primaryInd === 'roofing' || primaryInd === 'contractor' || primaryCat.includes('quote');
  const isInspection = primaryCat.includes('inspection') || primaryCat.includes('checklist') || template.id.includes('audit');
  const isWaiver = primaryCat.includes('waiver') || template.id.includes('liability') || template.id.includes('release') || template.id.includes('nda') || template.id.includes('agreement');
  const isSurveyOrFeedback = primaryCat.includes('survey') || primaryCat.includes('feedback') || template.id.includes('csat') || template.id.includes('nps') || template.id.includes('review');
  const isBookingOrSchedule = primaryCat.includes('booking') || primaryCat.includes('appointment') || template.id.includes('schedule') || template.id.includes('reservation');
  const isJobOrHR = primaryCat.includes('application') || primaryCat.includes('registration') || template.id.includes('job') || template.id.includes('hiring') || template.id.includes('volunteer');
  const isDonation = primaryCat.includes('donation') || template.id.includes('nonprofit') || template.id.includes('charity');

  return (
    <div
      className={`relative w-full h-44 sm:h-48 overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200/90 dark:from-slate-950 dark:to-slate-900/90 flex flex-col justify-end p-2.5 sm:p-3 select-none ${className}`}
    >
      {/* Background Dot Pattern */}
      <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Realistic Paper Form Card Mockup */}
      <div className="relative w-full h-[95%] bg-white dark:bg-slate-900 rounded-t-xl border-t border-x border-slate-200/90 dark:border-slate-700/80 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_18px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Form Header Gradient Ribbon */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${theme.gradient} shrink-0`} />

        {/* Paper Form Body */}
        <div className="p-2.5 sm:p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`p-1 rounded-md ${theme.badgeBg} ${theme.accentColor} shrink-0`}>
                <CategoryIcon className="size-3" />
              </div>
              <div className="min-w-0">
                <div className="h-2 w-20 sm:w-28 bg-slate-800 dark:bg-slate-200 rounded-full font-bold truncate text-[8px] leading-none text-transparent">
                  {template.name}
                </div>
                <div className="h-1.5 w-12 sm:w-16 bg-slate-300 dark:bg-slate-700 rounded-full mt-0.5" />
              </div>
            </div>

            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
              {fields.length || 8} fields
            </span>
          </div>

          {/* ════ DOMAIN-SPECIFIC VISUAL BLUEPRINT ════ */}
          <div className="space-y-1.5 flex-1 min-h-0">
            {isHealthcare ? (
              /* 1. HEALTHCARE / DENTAL / MEDICAL INTAKE BLUEPRINT */
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-5 rounded border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 px-1.5 flex items-center gap-1">
                    <User className="size-2.5 text-rose-500" />
                    <span className="text-[8px] text-rose-700 dark:text-rose-300 font-medium">Patient Name</span>
                  </div>
                  <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1">
                    <Calendar className="size-2.5 text-slate-400" />
                    <span className="text-[8px] text-slate-500">DOB: YYYY-MM-DD</span>
                  </div>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] text-slate-600 dark:text-slate-300 font-medium flex items-center gap-1">
                    <HeartPulse className="size-2.5 text-rose-500" /> Primary Insurance
                  </span>
                  <span className="text-[7px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1 rounded">Verified</span>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1">
                  <CheckCircle2 className="size-2.5 text-emerald-500 shrink-0" />
                  <span className="text-[7.5px] text-slate-500 truncate">I confirm medical history &amp; HIPAA consent</span>
                </div>
              </>
            ) : isOrderOrPayment ? (
              /* 2. ORDER / BAKERY / RESTAURANT / PAYMENT BLUEPRINT */
              <>
                <div className="h-5 rounded border border-indigo-200 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] text-indigo-800 dark:text-indigo-300 font-semibold">Custom Order Item</span>
                  <div className="flex items-center gap-1 text-[8px] font-bold text-slate-700 dark:text-slate-300">
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded">-</span>
                    <span>2</span>
                    <span className="bg-slate-200 dark:bg-slate-700 px-1 rounded">+</span>
                  </div>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[8px]">
                  <span className="text-slate-500">Subtotal + Tax (0% Fee):</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">$148.50</span>
                </div>
                <div className="h-5 rounded border border-purple-200 dark:border-purple-900/40 bg-purple-50/40 dark:bg-purple-950/20 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] font-semibold text-purple-700 dark:text-purple-300 flex items-center gap-1">
                    <CreditCard className="size-2.5" /> 33 Gateways
                  </span>
                  <span className="text-[7px] font-bold text-purple-600 dark:text-purple-400">Apple Pay · UPI · Card</span>
                </div>
              </>
            ) : isTradeOrHvac ? (
              /* 3. HVAC / PLUMBING / ELECTRICAL / TRADE BLUEPRINT */
              <>
                <div className="h-5 rounded border border-amber-200 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] text-amber-800 dark:text-amber-300 font-semibold flex items-center gap-1">
                    <Wrench className="size-2.5" /> System: Central AC / Heat Pump
                  </span>
                  <span className="text-[7px] text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-bold">HVAC</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['No Cool', 'Leaking', 'Noise'].map((tag, idx) => (
                    <div key={tag} className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center gap-1 text-[7px]">
                      <Check className={`size-2.5 ${idx === 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                      <span className="truncate text-slate-600 dark:text-slate-300 font-medium">{tag}</span>
                    </div>
                  ))}
                </div>
                <div className="h-5 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[8px] text-slate-500">
                  <span className="flex items-center gap-1"><Camera className="size-2.5 text-slate-400" /> Photo with Drawing Notes</span>
                  <span className="text-[7px] text-slate-400">Attach JPG/PNG</span>
                </div>
              </>
            ) : isInspection ? (
              /* 4. INSPECTION & SAFETY CHECKLIST BLUEPRINT */
              <>
                <div className="grid grid-cols-3 gap-1">
                  {['Exterior', 'Electrical', 'Plumbing'].map((item, idx) => (
                    <div key={item} className="h-5 rounded border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-1 flex items-center gap-1 text-[7px] font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-2.5 text-emerald-600" />
                      <span className="truncate">{item}</span>
                    </div>
                  ))}
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[8px]">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">Multi-Point Diagnostic Score:</span>
                  <span className="font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 rounded text-[7.5px]">100% PASS</span>
                </div>
                <div className="h-5 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7.5px] text-slate-500">
                  <span className="flex items-center gap-1"><PenTool className="size-2 text-slate-400" /> Inspector Sign-off</span>
                  <span className="font-mono text-[7px] text-slate-400">Timestamped</span>
                </div>
              </>
            ) : isWaiver ? (
              /* 5. LEGAL WAIVER & LIABILITY RELEASE BLUEPRINT */
              <>
                <div className="h-5 rounded border border-slate-300 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <ShieldCheck className="size-2.5 text-slate-700 dark:text-slate-300" /> Binding Legal Agreement
                  </span>
                  <span className="text-[7px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-1 rounded font-mono">E-SIGN</span>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1 text-[7px] text-slate-500">
                  <div className="h-1 w-full bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
                <div className="h-5 rounded border border-dashed border-slate-400 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-2 flex items-center justify-between">
                  <span className="text-[7.5px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-0.5">
                    <PenTool className="size-2 text-slate-500" /> Signature:
                  </span>
                  <svg className="w-16 h-3 text-slate-700 dark:text-slate-200" viewBox="0 0 70 15" fill="none">
                    <path d="M2 11 C 10 2, 20 14, 32 5 C 44 -2, 50 12, 68 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
              </>
            ) : isSurveyOrFeedback ? (
              /* 6. SURVEYS & CSAT FEEDBACK BLUEPRINT */
              <>
                <div className="h-5 rounded border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-2 flex items-center justify-between">
                  <span className="text-[8px] font-bold text-amber-700 dark:text-amber-400">Satisfaction Rating:</span>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="size-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <div className="h-5 rounded border border-sky-200 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20 px-1.5 flex items-center justify-between text-[7px]">
                  <span className="text-sky-700 dark:text-sky-300 font-semibold">Net Promoter:</span>
                  <div className="flex items-center gap-0.5 font-bold">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <span key={n} className={`px-0.5 rounded text-[6.5px] ${n >= 9 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'}`}>{n}</span>
                    ))}
                  </div>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1 text-[7.5px] text-slate-500">
                  <Smile className="size-2.5 text-amber-500" />
                  <span>How can we improve our service?</span>
                </div>
              </>
            ) : isBookingOrSchedule ? (
              /* 7. BOOKING & APPOINTMENT SCHEDULER BLUEPRINT */
              <>
                <div className="h-5 rounded border border-teal-200 dark:border-teal-900/40 bg-teal-50/40 dark:bg-teal-950/20 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] font-bold text-teal-800 dark:text-teal-300 flex items-center gap-1">
                    <Calendar className="size-2.5" /> Select Date: Oct 24, 2026
                  </span>
                  <span className="text-[7px] bg-teal-100 text-teal-800 font-bold px-1 rounded">Open</span>
                </div>
                <div className="grid grid-cols-3 gap-1">
                  {['09:00 AM', '01:30 PM', '04:00 PM'].map((slot, idx) => (
                    <div key={slot} className={`h-5 rounded border px-1 flex items-center justify-center text-[7px] font-semibold ${idx === 1 ? 'border-teal-500 bg-teal-600 text-white' : 'border-slate-200 dark:border-slate-700 bg-slate-50 text-slate-600'}`}>
                      {slot}
                    </div>
                  ))}
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1 text-[7.5px] text-slate-500">
                  <MapPin className="size-2.5 text-slate-400" />
                  <span>Service Address Autocomplete</span>
                </div>
              </>
            ) : isJobOrHR ? (
              /* 8. JOB APPLICATION & HR BLUEPRINT */
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1">
                    <User className="size-2.5 text-slate-400" />
                    <span className="text-[8px] text-slate-600">Full Legal Name</span>
                  </div>
                  <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1">
                    <Mail className="size-2.5 text-slate-400" />
                    <span className="text-[8px] text-slate-600">Email Address</span>
                  </div>
                </div>
                <div className="h-5 rounded border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 px-1.5 flex items-center justify-between text-[8px] text-blue-800 dark:text-blue-300">
                  <span className="flex items-center gap-1 font-semibold"><Upload className="size-2.5" /> Upload Resume (PDF)</span>
                  <span className="text-[7px] text-blue-600">Browse</span>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7.5px] text-slate-500">
                  <span>Years of Experience:</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">5+ Years ▼</span>
                </div>
              </>
            ) : isDonation ? (
              /* 9. DONATION & NON-PROFIT BLUEPRINT */
              <>
                <div className="grid grid-cols-4 gap-1">
                  {['$25', '$50', '$100', 'Custom'].map((amt, idx) => (
                    <div key={amt} className={`h-5 rounded border px-1 flex items-center justify-center text-[7.5px] font-bold ${idx === 2 ? 'border-pink-500 bg-pink-600 text-white' : 'border-slate-200 dark:border-slate-700 bg-slate-50 text-slate-600'}`}>
                      {amt}
                    </div>
                  ))}
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[8px]">
                  <span className="text-slate-600 font-medium">Make this donation monthly:</span>
                  <span className="text-[7px] font-bold text-pink-600 bg-pink-50 px-1 rounded">Recurring ✓</span>
                </div>
                <div className="h-5 rounded border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 px-1.5 flex items-center justify-between text-[8px] text-emerald-800 dark:text-emerald-300 font-bold">
                  <span className="flex items-center gap-1"><ShieldCheck className="size-2.5" /> 501(c)(3) Tax Deductible</span>
                  <span className="text-[7px]">0% Fee</span>
                </div>
              </>
            ) : (
              /* 10. GENERAL / SMART INTAKE BLUEPRINT */
              <>
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center gap-1">
                    <User className="size-2.5 text-slate-400" />
                    <div className="h-1.5 w-12 bg-slate-300 dark:bg-slate-600 rounded-full" />
                  </div>
                  <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center gap-1">
                    <Mail className="size-2.5 text-slate-400" />
                    <div className="h-1.5 w-14 bg-slate-300 dark:bg-slate-600 rounded-full" />
                  </div>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center justify-between">
                  <span className="text-[8px] text-slate-600 dark:text-slate-300 font-medium">Service Selection:</span>
                  <div className="h-1.5 w-16 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center gap-1">
                  <div className="h-1.5 w-28 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
              </>
            )}
          </div>

          {/* Mini Submit Button */}
          <div className="pt-0.5 shrink-0">
            <div
              className={`w-full h-5 rounded-md text-[8px] font-bold flex items-center justify-center gap-1 shadow-xs ${theme.buttonBg}`}
            >
              <span>{theme.actionLabel}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
