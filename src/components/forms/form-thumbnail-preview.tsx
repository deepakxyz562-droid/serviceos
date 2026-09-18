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
  PenTool,
  Clock,
  HeartPulse,
  Wrench,
  DollarSign,
  Upload,
  Briefcase,
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
/**
 * FormThumbnailPreview — Live Scaled Form Micro-Canvas (Method 2).
 * Reads the actual fields and theme from the template schema and renders
 * a miniature, authentic paper form document with live field types.
 */
export function FormThumbnailPreview({
  template,
  className = '',
}: FormThumbnailPreviewProps) {
  const primaryCat = template.categories[0] || 'general';
  const theme = CATEGORY_THEMES[primaryCat] || DEFAULT_THEME;
  const CategoryIcon = theme.icon;

  const rawFields = template.schema?.fields || [];
  const primaryColor = template.schema?.theme?.primaryColor || '#10b981';
  const submitText = template.schema?.settings?.submitButtonText || theme.actionLabel;

  // Display top 3-4 fields from the actual template schema
  const displayFields = rawFields.slice(0, 4);

  return (
    <div
      className={`relative w-full h-44 sm:h-48 overflow-hidden bg-gradient-to-b from-slate-100 to-slate-200/90 dark:from-slate-950 dark:to-slate-900/90 flex flex-col justify-end p-2.5 sm:p-3 select-none ${className}`}
    >
      {/* Background Dot Grid Matrix */}
      <div className="absolute inset-0 opacity-40 dark:opacity-20 pointer-events-none bg-[radial-gradient(#94a3b8_1px,transparent_1px)] [background-size:12px_12px]" />

      {/* Realistic Paper Form Card Mockup */}
      <div className="relative w-full h-[95%] bg-white dark:bg-slate-900 rounded-t-xl border-t border-x border-slate-200/90 dark:border-slate-700/80 shadow-[0_-4px_18px_rgba(0,0,0,0.08)] dark:shadow-[0_-4px_18px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
        
        {/* Form Header Accent Ribbon */}
        <div
          className="h-2 w-full shrink-0"
          style={{
            background: primaryColor.startsWith('#')
              ? `linear-gradient(90deg, ${primaryColor}, ${primaryColor}dd)`
              : undefined,
          }}
        />

        {/* Paper Form Body */}
        <div className="p-2.5 sm:p-3 space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-1.5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`p-1 rounded-md ${theme.badgeBg} ${theme.accentColor} shrink-0`}>
                <CategoryIcon className="size-3" />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold text-slate-900 dark:text-slate-100 truncate max-w-[130px] sm:max-w-[180px] leading-tight">
                  {template.name}
                </p>
                <p className="text-[7.5px] text-slate-500 dark:text-slate-400 truncate max-w-[130px] sm:max-w-[180px] leading-none mt-0.5">
                  {template.shortDescription}
                </p>
              </div>
            </div>

            <span className="text-[8.5px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
              {rawFields.length || 6} fields
            </span>
          </div>

          {/* ════ LIVE SCALED SCHEMA FIELDS (METHOD 2) ════ */}
          <div className="space-y-1.5 flex-1 min-h-0">
            {displayFields.length > 0 ? (
              displayFields.map((field, idx) => {
                const type = field.type || 'text';
                const label = field.label || 'Field';

                if (type === 'rating') {
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-amber-200/90 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 px-1.5 flex items-center justify-between">
                      <span className="text-[7.5px] font-bold text-amber-800 dark:text-amber-300 truncate max-w-[55%]">{label}</span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="size-2 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                  );
                }

                if (type === 'radio' || type === 'select' || type === 'dropdown') {
                  const options = field.options || [];
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7.5px]">
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[50%]">{label}</span>
                      <span className="text-[7px] text-slate-500 font-semibold bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600 truncate max-w-[45%]">
                        {options[0]?.label || 'Select option ▼'}
                      </span>
                    </div>
                  );
                }

                if (type === 'checkbox') {
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1.5 text-[7.5px]">
                      <div className="size-2.5 rounded bg-emerald-500 flex items-center justify-center text-white shrink-0">
                        <Check className="size-2" />
                      </div>
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
                    </div>
                  );
                }

                if (type === 'signature') {
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50 px-1.5 flex items-center justify-between text-[7.5px]">
                      <span className="text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-1 truncate max-w-[50%]">
                        <PenTool className="size-2 text-slate-400" /> {label}
                      </span>
                      <svg className="w-14 h-2.5 text-slate-600 dark:text-slate-300" viewBox="0 0 60 12" fill="none">
                        <path d="M2 9 C 8 2, 16 11, 26 4 C 36 -2, 42 10, 56 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </div>
                  );
                }

                if (type === 'date' || type === 'time') {
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7.5px]">
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[55%]">{label}</span>
                      <span className="flex items-center gap-0.5 text-slate-400 font-mono text-[7px]">
                        <Calendar className="size-2 text-slate-400" /> YYYY-MM-DD
                      </span>
                    </div>
                  );
                }

                if (type === 'file' || type === 'image') {
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-dashed border-blue-300 dark:border-blue-700 bg-blue-50/40 dark:bg-blue-950/20 px-1.5 flex items-center justify-between text-[7.5px] text-blue-800 dark:text-blue-300">
                      <span className="flex items-center gap-1 font-semibold truncate max-w-[65%]">
                        <Upload className="size-2 text-blue-500" /> {label}
                      </span>
                      <span className="text-[7px] text-blue-600">Browse</span>
                    </div>
                  );
                }

                if (type === 'textarea') {
                  return (
                    <div key={field.id || idx} className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7.5px]">
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[60%]">{label}</span>
                      <div className="h-1 w-12 bg-slate-300 dark:bg-slate-600 rounded-full" />
                    </div>
                  );
                }

                // Default short_answer / text / email / phone
                const Icon = type === 'email' ? Mail : type === 'phone' ? Clock : User;
                return (
                  <div key={field.id || idx} className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7.5px]">
                    <div className="flex items-center gap-1 min-w-0 max-w-[60%]">
                      <Icon className="size-2 text-slate-400 shrink-0" />
                      <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
                    </div>
                    <div className="h-1.5 w-10 bg-slate-200 dark:bg-slate-700 rounded-full" />
                  </div>
                );
              })
            ) : (
              /* Fallback Mockup */
              <div className="space-y-1.5">
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1">
                  <User className="size-2.5 text-slate-400" />
                  <span className="text-[8px] text-slate-600">Full Name</span>
                </div>
                <div className="h-5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center gap-1">
                  <Mail className="size-2.5 text-slate-400" />
                  <span className="text-[8px] text-slate-600">Email Address</span>
                </div>
              </div>
            )}
          </div>

          {/* Mini Submit Button */}
          <div className="pt-0.5 shrink-0">
            <div
              className="w-full h-5 rounded-md text-[8px] font-bold flex items-center justify-center gap-1 shadow-xs text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="truncate px-2">{submitText}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
