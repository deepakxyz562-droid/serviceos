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
} from 'lucide-react';
import type { FormTemplate, TemplateCategoryId } from '@/lib/forms/templates';
import { getCategoryLabel, getIndustryLabel } from '@/lib/forms/templates';

interface FormThumbnailPreviewProps {
  template: FormTemplate;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// Category theme palette definitions for high-fidelity Jotform-style styling
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
    actionLabel: 'Pay Now',
  },
  booking_forms: {
    gradient: 'from-blue-600 via-cyan-600 to-teal-600',
    headerBg: 'bg-blue-50 dark:bg-blue-950/40',
    accentColor: 'text-blue-600 dark:text-blue-400',
    buttonBg: 'bg-blue-600 hover:bg-blue-700 text-white',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
    badgeText: 'text-blue-800 dark:text-blue-300',
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
    actionLabel: 'Confirm Booking',
  },
  registration_forms: {
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    headerBg: 'bg-purple-50 dark:bg-purple-950/40',
    accentColor: 'text-purple-600 dark:text-purple-400',
    buttonBg: 'bg-purple-600 hover:bg-purple-700 text-white',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/60',
    badgeText: 'text-purple-800 dark:text-purple-300',
    icon: User,
    actionLabel: 'Register Now',
  },
  application_forms: {
    gradient: 'from-teal-600 via-emerald-600 to-green-600',
    headerBg: 'bg-teal-50 dark:bg-teal-950/40',
    accentColor: 'text-teal-600 dark:text-teal-400',
    buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    badgeBg: 'bg-teal-100 dark:bg-teal-900/60',
    badgeText: 'text-teal-800 dark:text-teal-300',
    icon: FileText,
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
    gradient: 'from-slate-700 via-zinc-700 to-slate-900',
    headerBg: 'bg-slate-100 dark:bg-slate-800/60',
    accentColor: 'text-slate-700 dark:text-slate-300',
    buttonBg: 'bg-slate-800 hover:bg-slate-900 text-white',
    badgeBg: 'bg-slate-200 dark:bg-slate-800',
    badgeText: 'text-slate-800 dark:text-slate-200',
    icon: ShieldCheck,
    actionLabel: 'Sign & Agree',
  },
  consent_forms: {
    gradient: 'from-rose-600 via-pink-600 to-purple-600',
    headerBg: 'bg-rose-50 dark:bg-rose-950/40',
    accentColor: 'text-rose-600 dark:text-rose-400',
    buttonBg: 'bg-rose-600 hover:bg-rose-700 text-white',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/60',
    badgeText: 'text-rose-800 dark:text-rose-300',
    icon: HeartPulse,
    actionLabel: 'Submit Consent',
  },
  survey_forms: {
    gradient: 'from-cyan-600 via-sky-600 to-blue-600',
    headerBg: 'bg-cyan-50 dark:bg-cyan-950/40',
    accentColor: 'text-cyan-600 dark:text-cyan-400',
    buttonBg: 'bg-cyan-600 hover:bg-cyan-700 text-white',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/60',
    badgeText: 'text-cyan-800 dark:text-cyan-300',
    icon: Star,
    actionLabel: 'Submit Feedback',
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
    actionLabel: 'Send Message',
  },
  quote_request: {
    gradient: 'from-teal-600 via-cyan-600 to-blue-600',
    headerBg: 'bg-teal-50 dark:bg-teal-950/40',
    accentColor: 'text-teal-600 dark:text-teal-400',
    buttonBg: 'bg-teal-600 hover:bg-teal-700 text-white',
    badgeBg: 'bg-teal-100 dark:bg-teal-900/60',
    badgeText: 'text-teal-800 dark:text-teal-300',
    icon: Wrench,
    actionLabel: 'Request Free Quote',
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
 * FormThumbnailPreview — High-fidelity miniaturized form preview (Jotform style).
 * Renders an authentic paper form card mockup with category-specific banner,
 * realistic input field outlines, signature curves, ratings, and action button.
 */
export function FormThumbnailPreview({
  template,
  className = '',
  size = 'md',
}: FormThumbnailPreviewProps) {
  const primaryCat = template.categories[0] || 'general';
  const theme = CATEGORY_THEMES[primaryCat] || DEFAULT_THEME;
  const CategoryIcon = theme.icon;

  const fields = template.schema.fields || [];
  const hasSignature = fields.some((f) => f.type === 'signature' || f.widgetType === 'signature');
  const hasRating = fields.some((f) => f.type === 'rating' || f.type === 'nps' || primaryCat.includes('survey') || primaryCat.includes('feedback'));
  const hasPayment = fields.some((f) => f.type === 'payment' || f.widgetType === 'payment' || primaryCat.includes('order') || primaryCat.includes('payment'));
  const hasChecklist = fields.some((f) => f.type === 'checkbox' || f.type === 'multi_select' || primaryCat.includes('inspection') || primaryCat.includes('checklist'));
  const hasDate = fields.some((f) => f.type === 'date' || f.type === 'time' || primaryCat.includes('booking') || primaryCat.includes('appointment'));

  return (
    <div
      className={`relative w-full h-44 sm:h-48 overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200/90 dark:from-slate-950 dark:to-slate-900/90 flex flex-col justify-end p-2.5 sm:p-3 select-none ${className}`}
    >
      {/* Top Background Pattern & Subtle Ambient Glow */}
      <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Realistic Paper Form Card Container */}
      <div className="relative w-full h-[94%] bg-white dark:bg-slate-900 rounded-t-xl border-t border-x border-slate-200/90 dark:border-slate-700/80 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.4)] flex flex-col overflow-hidden">
        
        {/* Form Header Top Banner Strip */}
        <div className={`h-2.5 w-full bg-gradient-to-r ${theme.gradient} shrink-0`} />

        {/* Paper Form Body */}
        <div className="p-2.5 sm:p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Header Row: Mini Logo & Title Placeholder */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`p-1 rounded-md ${theme.badgeBg} ${theme.accentColor} shrink-0`}>
                <CategoryIcon className="size-3" />
              </div>
              <div className="min-w-0">
                <div className="h-2 w-20 sm:w-24 bg-slate-800 dark:bg-slate-200 rounded-full font-bold truncate text-[8px] leading-none text-transparent">
                  {template.name}
                </div>
                <div className="h-1.5 w-12 sm:w-16 bg-slate-300 dark:bg-slate-700 rounded-full mt-0.5" />
              </div>
            </div>

            {/* Field Count Badge */}
            <span className="text-[9px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
              {fields.length || 8} fields
            </span>
          </div>

          {/* Mini Input Fields Visual Grid */}
          <div className="space-y-1.5 flex-1 min-h-0">
            {/* Row 1: Split Name Fields */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center gap-1">
                <User className="size-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
                <div className="h-1.5 w-10 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>
              <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center gap-1">
                <div className="h-1.5 w-12 bg-slate-300 dark:bg-slate-600 rounded-full" />
              </div>
            </div>

            {/* Row 2: Contact Info / Email / Phone */}
            <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center gap-1">
              <Mail className="size-2.5 text-slate-400 dark:text-slate-500 shrink-0" />
              <div className="h-1.5 w-24 sm:w-32 bg-slate-300 dark:bg-slate-600 rounded-full" />
            </div>

            {/* Row 3: Category-Specific Visual Feature Widget */}
            {hasRating ? (
              <div className="h-5 rounded border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-2 flex items-center justify-between">
                <span className="text-[8px] font-semibold text-amber-700 dark:text-amber-400">Rating:</span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
            ) : hasSignature ? (
              <div className="h-5 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 px-2 flex items-center justify-between">
                <span className="text-[8px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-0.5">
                  <PenTool className="size-2 text-slate-400" /> Signature
                </span>
                <svg className="w-12 h-3 text-slate-600 dark:text-slate-300" viewBox="0 0 60 15" fill="none">
                  <path d="M2 10 C 10 2, 15 14, 25 6 C 35 -2, 40 12, 58 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            ) : hasPayment ? (
              <div className="h-5 rounded border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 px-2 flex items-center justify-between">
                <span className="text-[8px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CreditCard className="size-2.5" /> Direct Checkout
                </span>
                <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">0% Fee</span>
              </div>
            ) : hasChecklist ? (
              <div className="grid grid-cols-3 gap-1">
                {['Item A', 'Item B', 'Item C'].map((chk, i) => (
                  <div
                    key={chk}
                    className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 px-1 flex items-center gap-1 text-[7px]"
                  >
                    <CheckCircle2 className={`size-2.5 ${i === 0 ? 'text-emerald-500' : 'text-slate-400'}`} />
                    <div className="h-1 w-6 bg-slate-300 dark:bg-slate-600 rounded-full" />
                  </div>
                ))}
              </div>
            ) : hasDate ? (
              <div className="h-5 rounded border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 px-2 flex items-center justify-between">
                <span className="text-[8px] font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                  <Calendar className="size-2.5" /> Preferred Date & Time
                </span>
                <div className="h-1.5 w-8 bg-blue-300 dark:bg-blue-700 rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center">
                  <div className="h-1.5 w-14 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/50 px-1.5 flex items-center">
                  <div className="h-1.5 w-10 bg-slate-300 dark:bg-slate-600 rounded-full" />
                </div>
              </div>
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
