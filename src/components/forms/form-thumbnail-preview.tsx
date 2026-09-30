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
  SlidersHorizontal,
  Bot,
  Camera,
  CheckCircle2,
  Sliders,
  CalendarCheck,
  ClipboardCheck,
  LayoutGrid,
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
    fallbackPhoto: 'https://images.unsplash.com/photo-1556742049-0a67c5574f73?auto=format&fit=crop&w=800&q=80',
  },
  booking_forms: {
    gradient: 'from-blue-600 via-cyan-600 to-teal-600',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/30',
    badgeText: 'text-cyan-200',
    icon: CalendarCheck,
    actionLabel: 'Confirm Appointment',
    fallbackPhoto: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80',
  },
  contact_forms: {
    gradient: 'from-slate-700 via-slate-800 to-slate-900',
    accentColor: 'text-slate-300',
    badgeBg: 'bg-slate-700/40 border-slate-600/40',
    badgeText: 'text-slate-200',
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
  // ── 25 additional category themes for visual diversity ──
  registration: {
    gradient: 'from-blue-600 via-indigo-600 to-violet-600',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 border-blue-400/30',
    badgeText: 'text-blue-200',
    icon: User,
    actionLabel: 'Register Now',
    fallbackPhoto: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80',
  },
  application: {
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
    accentColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/20 border-violet-400/30',
    badgeText: 'text-violet-200',
    icon: Briefcase,
    actionLabel: 'Submit Application',
    fallbackPhoto: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
  },
  survey: {
    gradient: 'from-purple-600 via-fuchsia-600 to-pink-600',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 border-purple-400/30',
    badgeText: 'text-purple-200',
    icon: Star,
    actionLabel: 'Submit Feedback',
    fallbackPhoto: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
  },
  feedback: {
    gradient: 'from-orange-600 via-amber-600 to-yellow-600',
    accentColor: 'text-orange-400',
    badgeBg: 'bg-orange-500/20 border-orange-400/30',
    badgeText: 'text-orange-200',
    icon: Star,
    actionLabel: 'Share Feedback',
    fallbackPhoto: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
  },
  lead_generation: {
    gradient: 'from-emerald-600 via-green-600 to-teal-600',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
    badgeText: 'text-emerald-200',
    icon: Zap,
    actionLabel: 'Get Started',
    fallbackPhoto: 'https://images.unsplash.com/photo-1556761175-5973dc0f32f7?auto=format&fit=crop&w=800&q=80',
  },
  request: {
    gradient: 'from-cyan-600 via-blue-600 to-indigo-600',
    accentColor: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/20 border-cyan-400/30',
    badgeText: 'text-cyan-200',
    icon: Phone,
    actionLabel: 'Submit Request',
    fallbackPhoto: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=800&q=80',
  },
  inspection: {
    gradient: 'from-emerald-600 via-green-600 to-lime-600',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
    badgeText: 'text-emerald-200',
    icon: ClipboardCheck,
    actionLabel: 'Complete Inspection',
    fallbackPhoto: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80',
  },
  checklist: {
    gradient: 'from-green-600 via-emerald-600 to-teal-600',
    accentColor: 'text-green-400',
    badgeBg: 'bg-green-500/20 border-green-400/30',
    badgeText: 'text-green-200',
    icon: CheckSquare,
    actionLabel: 'Complete Checklist',
    fallbackPhoto: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=80',
  },
  consent: {
    gradient: 'from-rose-600 via-red-600 to-orange-600',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 border-rose-400/30',
    badgeText: 'text-rose-200',
    icon: ShieldCheck,
    actionLabel: 'I Consent',
    fallbackPhoto: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
  },
  waiver: {
    gradient: 'from-red-600 via-rose-600 to-pink-600',
    accentColor: 'text-red-400',
    badgeBg: 'bg-red-500/20 border-red-400/30',
    badgeText: 'text-red-200',
    icon: ShieldCheck,
    actionLabel: 'Sign Waiver',
    fallbackPhoto: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
  },
  intake: {
    gradient: 'from-indigo-600 via-blue-600 to-cyan-600',
    accentColor: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/20 border-indigo-400/30',
    badgeText: 'text-indigo-200',
    icon: User,
    actionLabel: 'Begin Intake',
    fallbackPhoto: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
  },
  onboarding: {
    gradient: 'from-teal-600 via-cyan-600 to-blue-600',
    accentColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/20 border-teal-400/30',
    badgeText: 'text-teal-200',
    icon: User,
    actionLabel: 'Get Onboarded',
    fallbackPhoto: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80',
  },
  event: {
    gradient: 'from-fuchsia-600 via-purple-600 to-violet-600',
    accentColor: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/20 border-fuchsia-400/30',
    badgeText: 'text-fuchsia-200',
    icon: CalendarCheck,
    actionLabel: 'Register for Event',
    fallbackPhoto: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80',
  },
  employment: {
    gradient: 'from-slate-600 via-blue-600 to-indigo-600',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 border-blue-400/30',
    badgeText: 'text-blue-200',
    icon: Briefcase,
    actionLabel: 'Apply Now',
    fallbackPhoto: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
  },
  healthcare: {
    gradient: 'from-rose-600 via-pink-600 to-red-600',
    accentColor: 'text-rose-400',
    badgeBg: 'bg-rose-500/20 border-rose-400/30',
    badgeText: 'text-rose-200',
    icon: HeartPulse,
    actionLabel: 'Complete Intake',
    fallbackPhoto: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=800&q=80',
  },
  real_estate: {
    gradient: 'from-amber-600 via-orange-600 to-red-600',
    accentColor: 'text-amber-400',
    badgeBg: 'bg-amber-500/20 border-amber-400/30',
    badgeText: 'text-amber-200',
    icon: MapPin,
    actionLabel: 'Request Info',
    fallbackPhoto: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80',
  },
  education: {
    gradient: 'from-blue-600 via-indigo-600 to-purple-600',
    accentColor: 'text-blue-400',
    badgeBg: 'bg-blue-500/20 border-blue-400/30',
    badgeText: 'text-blue-200',
    icon: FileText,
    actionLabel: 'Enroll Now',
    fallbackPhoto: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?auto=format&fit=crop&w=800&q=80',
  },
  assessment: {
    gradient: 'from-purple-600 via-violet-600 to-indigo-600',
    accentColor: 'text-purple-400',
    badgeBg: 'bg-purple-500/20 border-purple-400/30',
    badgeText: 'text-purple-200',
    icon: CheckCircle2,
    actionLabel: 'Start Assessment',
    fallbackPhoto: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
  },
  report: {
    gradient: 'from-slate-600 via-gray-600 to-zinc-600',
    accentColor: 'text-slate-400',
    badgeBg: 'bg-slate-500/20 border-slate-400/30',
    badgeText: 'text-slate-200',
    icon: FileText,
    actionLabel: 'Submit Report',
    fallbackPhoto: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80',
  },
  membership: {
    gradient: 'from-violet-600 via-purple-600 to-fuchsia-600',
    accentColor: 'text-violet-400',
    badgeBg: 'bg-violet-500/20 border-violet-400/30',
    badgeText: 'text-violet-200',
    icon: Star,
    actionLabel: 'Join Now',
    fallbackPhoto: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=800&q=80',
  },
  finance: {
    gradient: 'from-emerald-600 via-green-600 to-teal-600',
    accentColor: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/20 border-emerald-400/30',
    badgeText: 'text-emerald-200',
    icon: DollarSign,
    actionLabel: 'Submit',
    fallbackPhoto: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=80',
  },
  legal: {
    gradient: 'from-slate-700 via-gray-700 to-zinc-700',
    accentColor: 'text-slate-300',
    badgeBg: 'bg-slate-600/40 border-slate-500/40',
    badgeText: 'text-slate-200',
    icon: ShieldCheck,
    actionLabel: 'Submit',
    fallbackPhoto: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=800&q=80',
  },
  internal_operations: {
    gradient: 'from-gray-600 via-slate-600 to-zinc-600',
    accentColor: 'text-gray-400',
    badgeBg: 'bg-gray-500/20 border-gray-400/30',
    badgeText: 'text-gray-200',
    icon: Briefcase,
    actionLabel: 'Submit',
    fallbackPhoto: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=800&q=80',
  },
  marketing: {
    gradient: 'from-fuchsia-600 via-pink-600 to-rose-600',
    accentColor: 'text-fuchsia-400',
    badgeBg: 'bg-fuchsia-500/20 border-fuchsia-400/30',
    badgeText: 'text-fuchsia-200',
    icon: Zap,
    actionLabel: 'Get Started',
    fallbackPhoto: 'https://images.unsplash.com/photo-1556761175-5973dc0f32f7?auto=format&fit=crop&w=800&q=80',
  },
  customer_service: {
    gradient: 'from-teal-600 via-cyan-600 to-blue-600',
    accentColor: 'text-teal-400',
    badgeBg: 'bg-teal-500/20 border-teal-400/30',
    badgeText: 'text-teal-200',
    icon: Phone,
    actionLabel: 'Submit Ticket',
    fallbackPhoto: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=800&q=80',
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
 * Modern Form Thumbnail Preview
 *
 * Visually distinguishes templates according to their 10 Master Experience Engines:
 * 1. Quote Calculator (Sliders, dynamic math, price pills)
 * 2. Booking / Calendar First (Calendar dates, available time slots)
 * 3. Operational / Field Checklist (Inspection items, pass/fail, photo evidence)
 * 4. Visual Choice Card Grid (Product/service cards with badges)
 * 5. Conversational / Card Swipe (Typeform-style one-at-a-time viewport)
 * 6. E-Signature Contract & Waiver (Legal terms, digital signature draw path)
 * 7. Two-Column Split Hero (Dual-column with persistent hero media)
 * 8. Multi-Step Milestone Stepper (01, 02, 03 step milestones)
 * 9. Hero + Form Landing Page (Prominent hero banner + floating input card)
 * 10. AI Dynamic Concierge (AI prompt bubble + adaptive quick chips)
 */
export function FormThumbnailPreview({
  template,
  className = '',
}: FormThumbnailPreviewProps) {
  const primaryCat = template.categories[0] || 'general';
  const theme = CATEGORY_THEMES[primaryCat] || DEFAULT_THEME;

  const rawFields = template.schema?.fields || [];
  const primaryColor = template.schema?.theme?.primaryColor || '#059669';
  const submitText = template.schema?.settings?.submitButtonText || theme.actionLabel;
  const isMultiStep = (template.schema?.steps?.length || 0) > 1;
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

  // ─── Detect Master Engine Archetype ──────────────────────────────────────
  const engine = (() => {
    if (template.engine) return template.engine;
    const c = (template.categories?.[0] || '').toLowerCase();
    const i = (template.industries?.[0] || '').toLowerCase();
    const hasSlider = rawFields.some((f) => f.widgetType === 'slider' || f.type === 'calculated');
    if (hasSlider || c.includes('quote') || c.includes('estimate') || c.includes('calculator') || i.includes('solar') || i.includes('roof')) {
      return 'quote_calculator';
    }
    const hasAppt = rawFields.some((f) => f.widgetType === 'appointment' || f.type === 'date');
    if (hasAppt || c.includes('booking') || c.includes('appointment') || i.includes('salon') || i.includes('barber')) {
      return 'booking_scheduler';
    }
    const hasChecklist = rawFields.some((f) => f.widgetType === 'image_upload_with_notes' || f.id.includes('inspection'));
    if (hasChecklist || c.includes('inspection') || c.includes('checklist') || c.includes('audit')) {
      return 'field_inspection';
    }
    const hasSig = rawFields.some((f) => f.type === 'signature' || f.widgetType === 'smooth_signature');
    if (hasSig || c.includes('waiver') || c.includes('consent')) {
      return 'contract_signature';
    }
    if (template.schema?.theme?.layout === 'card' || c.includes('quiz') || c.includes('survey')) {
      return 'card_swipe';
    }
    if (isSplitLayout) {
      return 'split_hero';
    }
    if (isMultiStep) {
      return 'milestone_stepper';
    }
    if (c.includes('package') || c.includes('tier') || c.includes('menu')) {
      return 'visual_choice_grid';
    }
    return 'classic_business';
  })();

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
              className="w-full h-full object-cover opacity-40 scale-100 group-hover:scale-105 transition-transform duration-700 ease-out"
              loading="lazy"
            />
            {/* Cinematic Gradient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/40" />
          </>
        )}
      </div>

      {/* ─── Top Layout & Experience Engine Badge ─── */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10 pointer-events-none">
        <div className="flex items-center gap-1">
          {engine === 'quote_calculator' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/90 text-amber-950 backdrop-blur-md shadow-xs">
              <Sliders className="size-2.5" /> Interactive Calculator
            </span>
          )}
          {engine === 'booking_scheduler' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-sky-500/90 text-sky-950 backdrop-blur-md shadow-xs">
              <CalendarCheck className="size-2.5" /> Calendar &amp; Slots
            </span>
          )}
          {engine === 'field_inspection' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/90 text-emerald-950 backdrop-blur-md shadow-xs">
              <ClipboardCheck className="size-2.5" /> Field Inspection
            </span>
          )}
          {engine === 'card_swipe' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-purple-500/90 text-purple-950 backdrop-blur-md shadow-xs">
              <Zap className="size-2.5" /> 1-Question Swipe
            </span>
          )}
          {engine === 'visual_choice_grid' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/90 text-indigo-950 backdrop-blur-md shadow-xs">
              <LayoutGrid className="size-2.5" /> Visual Cards
            </span>
          )}
          {engine === 'split_hero' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-teal-500/90 text-teal-950 backdrop-blur-md shadow-xs">
              <LayoutTemplate className="size-2.5" /> Split Hero
            </span>
          )}
          {engine === 'contract_signature' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/90 text-white backdrop-blur-md shadow-xs">
              <PenTool className="size-2.5" /> E-Signature
            </span>
          )}
          {engine === 'milestone_stepper' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/90 text-white backdrop-blur-md shadow-xs">
              <Layers className="size-2.5" /> {stepsCount} Milestone Steps
            </span>
          )}
          {engine === 'hero_landing' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-fuchsia-500/90 text-white backdrop-blur-md shadow-xs">
              <Sparkles className="size-2.5" /> Hero Landing
            </span>
          )}
          {engine === 'ai_dynamic_concierge' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-violet-500/90 text-white backdrop-blur-md shadow-xs">
              <Bot className="size-2.5" /> AI Concierge
            </span>
          )}
          {engine === 'classic_business' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/20 shadow-xs">
              <Sparkles className="size-2.5 text-emerald-400" /> Standard Form
            </span>
          )}
        </div>

        <span className="text-[8.5px] font-bold text-white/90 bg-white/15 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded-full shadow-xs">
          {rawFields.length || 6} Fields
        </span>
      </div>

      {/* ─── Distinct Engine Miniature Renderers ─── */}
      {engine === 'quote_calculator' ? (
        /* ════ 1. QUOTE CALCULATOR MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-amber-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <SlidersHorizontal className="size-2.5 text-amber-500" /> Dynamic Estimator
            </span>
            <span className="text-[8px] font-extrabold text-white bg-amber-600 px-1.5 py-0.2 rounded-full shadow-xs">
              $1,250 – $3,400
            </span>
          </div>

          <div className="space-y-1.5 py-1">
            <div className="space-y-0.5">
              <div className="flex justify-between text-[7px] font-bold text-slate-600 dark:text-slate-300">
                <span>Scope / Square Footage</span>
                <span className="text-amber-600 dark:text-amber-400">1,450 sq ft</span>
              </div>
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full relative overflow-hidden">
                <div className="h-full w-2/3 bg-amber-500 rounded-full" />
                <div className="absolute top-0 bottom-0 left-[66%] size-2 -translate-x-1/2 rounded-full bg-white shadow-xs border border-amber-500" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[7px]">
              <div className="p-1 rounded bg-slate-100 dark:bg-slate-800/60 flex items-center justify-between">
                <span className="text-slate-500">Tier:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Premium Pro</span>
              </div>
              <div className="p-1 rounded bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                <span>Deposit:</span>
                <span className="font-bold">$250.00</span>
              </div>
            </div>
          </div>

          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Lock In Instant Estimate →</span>
          </div>
        </div>
      ) : engine === 'booking_scheduler' ? (
        /* ════ 2. BOOKING & CALENDAR FIRST MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-sky-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-sky-700 dark:text-sky-300 flex items-center gap-1">
              <CalendarCheck className="size-2.5 text-sky-500" /> October 2026
            </span>
            <span className="text-[7.5px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-1 py-0.2 rounded">
              3 Slots Open
            </span>
          </div>

          {/* 5-Day Mini Calendar Strip */}
          <div className="grid grid-cols-5 gap-1 py-1">
            {['14 Mon', '15 Tue', '16 Wed', '17 Thu', '18 Fri'].map((d, i) => (
              <div
                key={d}
                className={`py-1 text-center rounded text-[6.5px] font-bold ${
                  i === 2
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Available Slot Pills */}
          <div className="grid grid-cols-3 gap-1">
            {['09:00 AM', '11:30 AM', '02:00 PM'].map((slot, i) => (
              <div
                key={slot}
                className={`py-0.5 text-center rounded text-[7px] font-bold border ${
                  i === 1
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {slot}
              </div>
            ))}
          </div>

          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Confirm Booking Time</span>
          </div>
        </div>
      ) : engine === 'field_inspection' ? (
        /* ════ 3. FIELD INSPECTION & CHECKLIST MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-emerald-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
              <ClipboardCheck className="size-2.5 text-emerald-500" /> Multi-Point Audit
            </span>
            <span className="text-[7.5px] font-bold text-slate-500">12 Points</span>
          </div>

          <div className="space-y-1 py-0.5">
            <div className="flex items-center justify-between p-1 rounded bg-slate-50 dark:bg-slate-800/40 text-[7px]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">1. Mechanical Integrity</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                <Check className="size-2" /> PASS
              </span>
            </div>
            <div className="flex items-center justify-between p-1 rounded bg-slate-50 dark:bg-slate-800/40 text-[7px]">
              <span className="font-semibold text-slate-700 dark:text-slate-200">2. Safety Controls</span>
              <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                <Check className="size-2" /> PASS
              </span>
            </div>
            <div className="flex items-center justify-between p-1 rounded bg-amber-50 dark:bg-amber-950/30 text-[7px]">
              <span className="font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1">
                <Camera className="size-2" /> Photo Evidence
              </span>
              <span className="font-bold text-amber-600">Verified</span>
            </div>
          </div>

          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Complete &amp; Sign-Off</span>
          </div>
        </div>
      ) : engine === 'card_swipe' ? (
        /* ════ 4. CONVERSATIONAL / TYPEFORM 1-QUESTION MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-purple-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between text-[7px] text-purple-600 dark:text-purple-400 font-bold">
            <span>QUESTION 1 OF 4</span>
            <span>25% COMPLETED</span>
          </div>

          <div className="my-auto space-y-1.5">
            <p className="text-[9px] font-black text-slate-900 dark:text-white leading-tight">
              What is your primary project goal?
            </p>
            <div className="h-6 rounded-lg border border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 px-2 flex items-center justify-between text-[7.5px] text-purple-900 dark:text-purple-200">
              <span className="truncate">e.g. Complete Renovation</span>
              <span className="bg-purple-200 dark:bg-purple-800 text-[6.5px] font-bold px-1 rounded">
                Enter ↵
              </span>
            </div>
          </div>

          <div
            className="h-4 w-full rounded text-[7.5px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Next Question →</span>
          </div>
        </div>
      ) : engine === 'contract_signature' ? (
        /* ════ 5. E-SIGNATURE CONTRACT MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-rose-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-rose-800 dark:text-rose-300 flex items-center gap-1">
              <PenTool className="size-2.5 text-rose-500" /> Digital Agreement
            </span>
            <span className="text-[7px] font-bold text-slate-500">Legal Binding</span>
          </div>

          <div className="space-y-1 py-1">
            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-1.5 w-4/5 bg-slate-200 dark:bg-slate-800 rounded" />
            <div className="h-5 rounded border border-dashed border-rose-300 dark:border-rose-800 bg-rose-50/40 dark:bg-rose-950/20 px-1.5 flex items-center justify-between text-[7px]">
              <span className="text-slate-500">Signature:</span>
              <svg className="w-12 h-3 text-rose-600 dark:text-rose-400" viewBox="0 0 60 12" fill="none">
                <path d="M2 9 C 8 2, 16 11, 26 4 C 36 -2, 42 10, 56 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Execute &amp; Sign</span>
          </div>
        </div>
      ) : engine === 'visual_choice_grid' ? (
        /* ════ 6. VISUAL CHOICE CARDS MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-indigo-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
              <LayoutGrid className="size-2.5 text-indigo-500" /> Select Tier
            </span>
            <span className="text-[7px] font-bold text-indigo-600">3 Packages</span>
          </div>

          <div className="grid grid-cols-3 gap-1 py-1">
            <div className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[7px] font-bold text-slate-800 dark:text-slate-200">Basic</p>
              <p className="text-[6.5px] text-slate-500">$49</p>
            </div>
            <div className="p-1 rounded-lg border-2 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 text-center shadow-xs">
              <p className="text-[7px] font-black text-indigo-700 dark:text-indigo-300">Pro ✓</p>
              <p className="text-[6.5px] font-bold text-indigo-600">$89</p>
            </div>
            <div className="p-1 rounded-lg border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[7px] font-bold text-slate-800 dark:text-slate-200">Elite</p>
              <p className="text-[6.5px] text-slate-500">$149</p>
            </div>
          </div>

          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Continue with Selected Tier</span>
          </div>
        </div>
      ) : engine === 'hero_landing' ? (
        /* ════ 7. HERO LANDING MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-fuchsia-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-fuchsia-700 dark:text-fuchsia-300 flex items-center gap-1">
              <Sparkles className="size-2.5 text-fuchsia-500" /> Landing Page
            </span>
            <span className="text-[7px] font-bold text-fuchsia-600">Conversion</span>
          </div>

          {/* Hero headline + CTA */}
          <div className="flex-1 flex flex-col justify-center space-y-1.5">
            <div className="h-2 w-4/5 rounded bg-fuchsia-200 dark:bg-fuchsia-900/40" />
            <div className="h-1.5 w-3/5 rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-1.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
            <div
              className="h-4 w-2/3 rounded text-[7px] font-bold flex items-center justify-center text-white shadow-xs mt-1"
              style={{ backgroundColor: primaryColor }}
            >
              Get Started Free →
            </div>
          </div>

          {/* Mini form fields below hero */}
          <div className="grid grid-cols-2 gap-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {rawFields.slice(3, 5).map((field, idx) => (
              <MiniFieldRow key={field.id || idx} field={field} primaryColor={primaryColor} />
            ))}
          </div>
        </div>
      ) : engine === 'ai_dynamic_concierge' ? (
        /* ════ 8. AI DYNAMIC CONCIERGE MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-violet-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-violet-700 dark:text-violet-300 flex items-center gap-1">
              <Bot className="size-2.5 text-violet-500" /> AI Assistant
            </span>
            <span className="text-[7px] font-bold text-violet-600">Smart Intake</span>
          </div>

          {/* Chat bubbles */}
          <div className="flex-1 flex flex-col justify-center space-y-1.5 py-1">
            <div className="self-start max-w-[75%] rounded-lg rounded-tl-sm bg-violet-100 dark:bg-violet-950/50 px-1.5 py-0.5 text-[7px] text-violet-900 dark:text-violet-200">
              Hi! I'll help you get started.
            </div>
            <div className="self-end max-w-[65%] rounded-lg rounded-tr-sm bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 text-[7px] text-slate-700 dark:text-slate-300">
              I need a quote for my project
            </div>
            <div className="self-start max-w-[80%] rounded-lg rounded-tl-sm bg-violet-100 dark:bg-violet-950/50 px-1.5 py-0.5 text-[7px] text-violet-900 dark:text-violet-200">
              Great! What type of project? 🔧
            </div>
          </div>

          {/* AI summary card */}
          <div className="rounded bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-900/50 px-1.5 py-1 text-[6.5px] text-violet-700 dark:text-violet-300 flex items-center justify-between">
            <span className="flex items-center gap-0.5"><Check className="size-2" /> Extracting details...</span>
            <span className="font-bold">AI</span>
          </div>
        </div>
      ) : isSplitLayout ? (
        /* ════ 7. TWO-COLUMN SPLIT HERO MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-md rounded-xl border border-white/15 shadow-2xl grid grid-cols-12 overflow-hidden">
          <div className="col-span-5 relative p-2 flex flex-col justify-between overflow-hidden border-r border-white/10 bg-slate-950/40">
            <div className="space-y-1">
              {isMap ? (
                <span className="inline-flex items-center gap-0.5 text-[7px] font-bold text-rose-300 bg-rose-500/20 border border-rose-500/30 px-1 py-0.2 rounded">
                  <MapPin className="size-2 text-rose-400" /> Map Dispatch
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

          <div className="col-span-7 p-2 flex flex-col justify-between space-y-1 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white">
            <div className="space-y-1 flex-1">
              {/* Skip baseContact fields — show category-specific fields */}
              {(rawFields.length > 3 ? rawFields.slice(3, 6) : rawFields.slice(0, 3)).map((field, idx) => (
                <MiniFieldRow key={field.id || idx} field={field} primaryColor={primaryColor} />
              ))}
            </div>

            <div
              className="h-4 w-full rounded text-[7.5px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
              style={{ backgroundColor: primaryColor }}
            >
              <span className="truncate px-1">{submitText}</span>
            </div>
          </div>
        </div>
      ) : isMultiStep ? (
        /* ════ 8. MULTI-STEP MILESTONE STEPPER MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-blue-500/30 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-blue-800 dark:text-blue-300 flex items-center gap-1">
              <Layers className="size-2.5 text-blue-500" /> Step 1 of {stepsCount}
            </span>
            <span className="text-[7px] font-bold text-slate-500">Contact &amp; Details</span>
          </div>

          <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden my-0.5">
            <div className="h-full w-1/3 bg-blue-500 rounded-full" />
          </div>

          <div className="space-y-1 flex-1 py-0.5">
            {/* Skip baseContact fields — show category-specific fields */}
            {(rawFields.length > 3 ? rawFields.slice(3, 5) : rawFields.slice(0, 2)).map((field, idx) => (
              <MiniFieldRow key={field.id || idx} field={field} primaryColor={primaryColor} />
            ))}
          </div>

          <div
            className="h-4.5 w-full rounded text-[8px] font-bold flex items-center justify-center text-white shadow-2xs shrink-0"
            style={{ backgroundColor: primaryColor }}
          >
            <span>Next Step →</span>
          </div>
        </div>
      ) : (
        /* ════ 9. CLASSIC MODERN CARD MINIATURE ════ */
        <div className="relative z-10 w-full h-[78%] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-2xl p-2.5 flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-1 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <div
                className="size-4 rounded-md flex items-center justify-center text-white shrink-0 shadow-2xs text-[9px]"
                style={{ backgroundColor: primaryColor }}
              >
                <FileText className="size-2.5" />
              </div>
              <p className="text-[9px] font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                {template.name}
              </p>
            </div>
          </div>

          <div className="space-y-1 flex-1 py-0.5">
            {/* Skip the first 3 baseContact fields (Full Legal Name, Phone, Email)
                which are identical across ALL synthesized templates — show
                category-specific fields (positions 4-6) instead so each
                template's thumbnail looks distinct. */}
            {(rawFields.length > 3 ? rawFields.slice(3, 6) : rawFields.slice(0, 3)).map((field, idx) => (
              <MiniFieldRow key={field.id || idx} field={field} primaryColor={primaryColor} />
            ))}
          </div>

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
  const type = field.widgetType || field.type || 'short_answer';
  const label = field.label || 'Field';

  if (type === 'rating' || type === 'star_rating') {
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

  if (type === 'signature' || type === 'smooth_signature') {
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

  if (type === 'checkbox' || type === 'terms_and_conditions') {
    return (
      <div className="h-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center gap-1 text-[7px]">
        <div className="size-2 rounded bg-emerald-500 flex items-center justify-center text-white shrink-0">
          <Check className="size-1.5 stroke-[3]" />
        </div>
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
      </div>
    );
  }

  if (type === 'date' || type === 'date_picker') {
    return (
      <div className="h-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center justify-between text-[7px]">
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
        <Calendar className="size-2 text-slate-400 shrink-0" />
      </div>
    );
  }

  if (type === 'slider') {
    return (
      <div className="h-4 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 px-1 flex items-center justify-between text-[7px]">
        <span className="text-slate-600 dark:text-slate-300 font-medium truncate">{label}</span>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full relative">
          <div className="w-1/2 h-full bg-emerald-500 rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-4 rounded border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40 px-1.5 flex items-center justify-between text-[7px]">
      <span className="text-slate-500 dark:text-slate-400 font-medium truncate">{label}</span>
      <span className="text-slate-300 dark:text-slate-600 text-[6.5px]">...</span>
    </div>
  );
}
