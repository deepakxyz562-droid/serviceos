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
  Sparkles,
  MapPin,
  Layers,
  Zap,
  Phone,
  LayoutTemplate,
} from 'lucide-react';
import type { FormTemplate, TemplateCategoryId, TemplateIndustryId } from '@/lib/forms/templates';
import { getCategoryLabel, getIndustryLabel } from '@/lib/forms/templates';

interface FormThumbnailPreviewProps {
  template: FormTemplate;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

// ─── 4K Curated Industry Backdrops Map ───────────────────────────────────────
const INDUSTRY_BACKDROPS: Record<string, string> = {
  dental: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=800&q=80',
  healthcare: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  veterinary: 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&w=800&q=80',
  pet_services: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?auto=format&fit=crop&w=800&q=80',
  hvac: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  plumbing: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
  electrical: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=800&q=80',
  solar: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=800&q=80',
  roofing: 'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=800&q=80',
  construction: 'https://images.unsplash.com/photo-1541888946425-d0fbb18f15f6?auto=format&fit=crop&w=800&q=80',
  real_estate: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
  automotive: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=800&q=80',
  events: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
  wedding: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=800&q=80',
  hospitality: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
  fitness: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  beauty: 'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?auto=format&fit=crop&w=800&q=80',
  salon: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80',
  legal: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  accounting: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
  financial_services: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  finance: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  technology: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80',
  saas: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  home_services: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=800&q=80',
  landscaping: 'https://images.unsplash.com/photo-1558904541-efa8c4a08931?auto=format&fit=crop&w=800&q=80',
  pest_control: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  education: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
  travel: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80',
  photography: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=800&q=80',
};

const CATEGORY_THEMES: Record<
  string,
  {
    gradient: string;
    accentColor: string;
    badgeBg: string;
    badgeText: string;
    icon: typeof FileText;
    actionLabel: string;
    fallbackPhoto: string;
  }
> = {
  order_forms: {
    gradient: 'from-violet-600 via-indigo-600 to-blue-600',
    accentColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 border-indigo-400/30',
    badgeText: 'text-indigo-200',
    icon: CreditCard,
    actionLabel: 'Complete Order',
    fallbackPhoto: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
  },
  payment_forms: {
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
    badgeText: 'text-emerald-200',
    icon: DollarSign,
    actionLabel: 'Pay Now · Secure',
    fallbackPhoto: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
  },
  booking_forms: {
    gradient: 'from-teal-600 via-emerald-600 to-cyan-600',
    accentColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/20 border-teal-400/30',
    badgeText: 'text-teal-200',
    icon: Calendar,
    actionLabel: 'Book Appointment',
    fallbackPhoto: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
  },
  appointment_forms: {
    gradient: 'from-sky-600 via-blue-600 to-indigo-600',
    accentColor: 'text-sky-400',
    badgeBg: 'bg-sky-500/20 border-sky-400/30',
    badgeText: 'text-sky-200',
    icon: Clock,
    actionLabel: 'Confirm Time Slot',
    fallbackPhoto: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
  },
  registration_forms: {
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 border-purple-400/30',
    badgeText: 'text-purple-200',
    icon: User,
    actionLabel: 'Register Attendee',
    fallbackPhoto: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80',
  },
  application_forms: {
    gradient: 'from-blue-600 via-indigo-600 to-slate-700',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 border-blue-400/30',
    badgeText: 'text-blue-200',
    icon: Briefcase,
    actionLabel: 'Submit Application',
    fallbackPhoto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  },
  inspection_checklist: {
    gradient: 'from-amber-600 via-orange-600 to-yellow-600',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 border-amber-400/30',
    badgeText: 'text-amber-200',
    icon: CheckSquare,
    actionLabel: 'Complete Inspection',
    fallbackPhoto: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
  },
  waiver_consent: {
    gradient: 'from-slate-800 via-zinc-800 to-slate-950',
    accentColor: 'text-slate-300',
    badgeBg: 'bg-slate-500/20 border-slate-400/30',
    badgeText: 'text-slate-200',
    icon: ShieldCheck,
    actionLabel: 'Sign & Agree Digitally',
    fallbackPhoto: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
  },
  consent_forms: {
    gradient: 'from-rose-600 via-pink-600 to-purple-600',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 border-rose-400/30',
    badgeText: 'text-rose-200',
    icon: HeartPulse,
    actionLabel: 'Submit Patient Info',
    fallbackPhoto: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
  },
  survey_forms: {
    gradient: 'from-cyan-600 via-sky-600 to-blue-600',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/30',
    badgeText: 'text-cyan-200',
    icon: Star,
    actionLabel: 'Submit Survey',
    fallbackPhoto: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=800&q=80',
  },
  feedback_forms: {
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    accentColor: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/20 border-fuchsia-400/30',
    badgeText: 'text-fuchsia-200',
    icon: Sparkles,
    actionLabel: 'Send Review',
    fallbackPhoto: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=800&q=80',
  },
  contact_forms: {
    gradient: 'from-emerald-600 via-teal-600 to-blue-600',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
    badgeText: 'text-emerald-200',
    icon: Mail,
    actionLabel: 'Send Inquiry',
    fallbackPhoto: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
  },
  quote_request: {
    gradient: 'from-amber-600 via-emerald-600 to-teal-600',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 border-amber-400/30',
    badgeText: 'text-amber-200',
    icon: Wrench,
    actionLabel: 'Get Free Estimate',
    fallbackPhoto: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  },
  donation_forms: {
    gradient: 'from-pink-600 via-rose-600 to-purple-600',
    accentColor: 'text-pink-400',
    badgeBg: 'bg-pink-500/20 border-pink-400/30',
    badgeText: 'text-pink-200',
    icon: HeartPulse,
    actionLabel: 'Donate Now',
    fallbackPhoto: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?auto=format&fit=crop&w=800&q=80',
  },
};

const DEFAULT_THEME = {
  gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
  accentColor: 'text-emerald-400',
  badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
  badgeText: 'text-emerald-200',
  icon: FileText,
  actionLabel: 'Submit Form',
  fallbackPhoto: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
};

/**
 * 2026 UI/UX Modernized Form Thumbnail Preview
 *
 * Dynamically visualizes:
 * - 4K High-Res Hero Media Backdrop (from template mediaPanel or curated industry photography)
 * - 2-Part Split Hero dual-column layout vs Single/Stepped Glassmorphism forms
 * - Live scaled schema fields with luminous interactive tokens
 * - Multi-Step Stepper indicators and 2026 design style badges
 */
export function FormThumbnailPreview({
  template,
  className = '',
}: FormThumbnailPreviewProps) {
  const primaryCat = template.categories[0] || 'general';
  const theme = CATEGORY_THEMES[primaryCat] || DEFAULT_THEME;
  const CategoryIcon = theme.icon;

  const rawFields = template.schema?.fields || [];
  const primaryColor = template.schema?.theme?.primaryColor || '#059669';
  const submitText = template.schema?.settings?.submitButtonText || theme.actionLabel;
  const isMultiStep = (template.schema?.steps?.length || 0) > 1 && template.schema?.theme?.layout !== 'classic';
  const stepsCount = template.schema?.steps?.length || 1;

  const mediaPanel = template.schema?.mediaPanel || template.schema?.theme?.mediaPanel;
  const isSplitLayout =
    template.schema?.theme?.layout === 'split_media' ||
    (mediaPanel && mediaPanel.enabled !== false);

  // Determine the photo backdrop URL
  const primaryIndustry = template.industries?.[0] || 'general';
  const photoUrl =
    mediaPanel?.mediaUrl ||
    INDUSTRY_BACKDROPS[primaryIndustry] ||
    theme.fallbackPhoto;

  const isMap = mediaPanel?.mediaType === 'map';
  const isGradient = mediaPanel?.mediaType === 'gradient';
  const isVideo = mediaPanel?.mediaType === 'video' || mediaPanel?.mediaType === 'youtube';

  const displayFields = rawFields.slice(0, 3);

  return (
    <div
      className={`relative w-full h-48 sm:h-52 overflow-hidden bg-slate-950 flex flex-col justify-end p-2 sm:p-2.5 select-none group transition-all ${className}`}
    >
      {/* ─── 4K Photo / Map / Gradient Ambient Backdrop ─── */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {isGradient ? (
          <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950">
            <div className="absolute -top-10 -left-10 size-48 rounded-full blur-2xl opacity-40 bg-emerald-500" />
            <div className="absolute -bottom-10 -right-10 size-48 rounded-full blur-2xl opacity-30 bg-blue-500" />
          </div>
        ) : (
          <>
            <img
              src={photoUrl}
              alt={template.name}
              className="w-full h-full object-cover opacity-50 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            {/* Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-slate-900/30" />
          </>
        )}
      </div>

      {/* ─── Top 2026 Layout / Industry Badge Bar ─── */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1">
          {isSplitLayout ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
              <LayoutTemplate className="size-2.5 text-emerald-400" /> 2-Part Split
            </span>
          ) : isMultiStep ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
              <Zap className="size-2.5 text-amber-400" /> {stepsCount} Steps
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
              <Sparkles className="size-2.5 text-teal-300" /> 2026 UI
            </span>
          )}
        </div>

        <span className="text-[8.5px] font-bold text-white/90 bg-white/15 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full shadow-xs">
          {rawFields.length || 6} Fields
        </span>
      </div>

      {/* ─── Visual Form Container: Split vs Standard Card ─── */}
      {isSplitLayout ? (
        /* ════ 2-PART SPLIT HERO MINIATURE CARD ════ */
        <div className="relative z-10 w-full h-[78%] bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md rounded-xl border border-white/15 shadow-2xl grid grid-cols-12 overflow-hidden">
          {/* Left Mini Hero Column */}
          <div className="col-span-5 relative p-2 flex flex-col justify-between overflow-hidden border-r border-white/10 bg-slate-950/40">
            <div className="space-y-1">
              {isMap ? (
                <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-1 py-0.2 rounded">
                  <MapPin className="size-2 text-rose-400" /> Map Dispatch
                </span>
              ) : isVideo ? (
                <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-sky-300 bg-sky-500/20 border border-sky-500/30 px-1 py-0.2 rounded">
                  ▶ Video Hero
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/30 px-1 py-0.2 rounded">
                  ⭐ Verified Pro
                </span>
              )}
              <p className="text-[8.5px] font-extrabold text-white leading-tight line-clamp-2 mt-0.5">
                {mediaPanel?.headline || template.name}
              </p>
            </div>

            <div className="flex items-center gap-1 text-[7px] text-emerald-300">
              <Check className="size-2 text-emerald-400" />
              <span className="truncate">Instant AI Estimate</span>
            </div>
          </div>

          {/* Right Mini Form Fields Column */}
          <div className="col-span-7 p-2 flex flex-col justify-between space-y-1 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white">
            <div className="space-y-1 flex-1">
              {displayFields.map((field, idx) => (
                <MiniFieldRow key={field.id || idx} field={field} primaryColor={primaryColor} />
              ))}
            </div>

            {/* Mini Submit Button */}
            <div
              className="h-4 w-full rounded text-[7.5px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="truncate px-1">{submitText}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ════ MODERN GLASSMORPHIC SINGLE / MULTI-STEP CARD ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          {/* Header Bar */}
          <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="size-4 rounded-md flex items-center justify-center text-white shrink-0 shadow-2xs text-[9px]"
                style={{ backgroundColor: primaryColor }}
              >
                <CategoryIcon className="size-2.5" />
              </div>
              <p className="text-[9px] font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                {template.name}
              </p>
            </div>

            {isMultiStep && (
              <span className="text-[7.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.2 rounded shrink-0">
                Step 1 of {stepsCount}
              </span>
            )}
          </div>

          {/* Form Fields Preview */}
          <div className="space-y-1 flex-1 py-0.5">
            {displayFields.map((field, idx) => (
              <MiniFieldRow key={field.id || idx} field={field} primaryColor={primaryColor} />
            ))}
          </div>

          {/* Stepper Progress Bar (if Multi-Step) */}
          {isMultiStep && (
            <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mb-1">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.round((1 / stepsCount) * 100)}%`, backgroundColor: primaryColor }}
              />
            </div>
          )}

          {/* Mini Submit Button */}
          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span className="truncate px-1.5">{submitText}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Renders miniature representation of individual form field types
 */
function MiniFieldRow({ field, primaryColor }: { field: any; primaryColor: string }) {
  const type = field.type || 'text';
  const label = field.label || 'Field';

  if (type === 'rating') {
    return (
      <div className="h-4 rounded border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 px-1 flex items-center justify-between text-[7px]">
        <span className="font-bold text-amber-800 dark:text-amber-300 truncate max-w-[50%]">{label}</span>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star key={s} className="size-1.5 fill-amber-400 text-amber-400" />
          ))}
        </div>
      </div>
    );
  }

  if (type === 'signature') {
    return (
      <div className="h-4 rounded border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center justify-between text-[7px]">
        <span className="text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[45%] flex items-center gap-0.5">
          <PenTool className="size-1.5 text-slate-400" /> {label}
        </span>
        <svg className="w-8 h-2 text-slate-600 dark:text-slate-300" viewBox="0 0 60 12" fill="none">
          <path d="M2 9 C 8 2, 16 11, 26 4 C 36 -2, 42 10, 56 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="h-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center gap-1 text-[7px]">
        <div className="size-2 rounded bg-emerald-500 flex items-center justify-center text-white shrink-0">
          <Check className="size-1.5" />
        </div>
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
      </div>
    );
  }

  if (type === 'radio' || type === 'select' || type === 'dropdown') {
    return (
      <div className="h-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center justify-between text-[7px]">
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[50%]">{label}</span>
        <span className="text-[6.5px] text-slate-400 font-semibold bg-white dark:bg-slate-700 px-1 rounded border border-slate-200 dark:border-slate-600 truncate max-w-[45%]">
          Options ▼
        </span>
      </div>
    );
  }

  const Icon = type === 'email' ? Mail : type === 'phone' ? Phone : type === 'date' ? Calendar : User;
  return (
    <div className="h-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center justify-between text-[7px]">
      <div className="flex items-center gap-1 min-w-0 max-w-[60%]">
        <Icon className="size-1.5 text-slate-400 shrink-0" />
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
      </div>
      <div className="h-1 w-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
    </div>
  );
}
