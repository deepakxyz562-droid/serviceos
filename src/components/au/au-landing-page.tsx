'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Bot,
  Wrench,
  Zap,
  Fan,
  Trees,
  Sparkle,
  Hammer,
  DollarSign,
  FileText,
  ChevronDown,
  Check,
  Users,
  Play,
  ArrowUpRight,
  Smartphone,
  ExternalLink,
  Loader2,
  BadgeAlert,
  Send,
  Building2,
  ThumbsUp,
  Receipt,
  Headphones,
  CheckCircle,
} from 'lucide-react';
import { trackEvent } from '@/lib/analytics/consent';

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18483108780';
const GOOGLE_ADS_CONVERSION_LABEL = process.env.NEXT_PUBLIC_GOOGLE_ADS_CONVERSION_LABEL || '';

// Helper to push conversion to Google Ads and GA4
function triggerConversionEvents(trade: string, email: string) {
  // 1. GA4 custom lead event
  trackEvent('generate_lead', {
    currency: 'AUD',
    value: 150.0,
    page_location: '/au',
    lead_source: 'au_demo_form',
    trade_type: trade,
  });

  // 2. Google Ads conversion if gtag is loaded
  if (typeof window !== 'undefined') {
    const w = window as unknown as { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[] };
    if (typeof w.gtag === 'function') {
      const sendTo = GOOGLE_ADS_CONVERSION_LABEL
        ? `${GOOGLE_ADS_ID}/${GOOGLE_ADS_CONVERSION_LABEL}`
        : GOOGLE_ADS_ID;

      w.gtag('event', 'conversion', {
        send_to: sendTo,
        value: 150.0,
        currency: 'AUD',
      });
    }
  }
}

export default function AustralianLandingPage({ activeCategory }: { activeCategory?: string } = {}) {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessName: '',
    trade: 'Plumbing',
    teamSize: '2-5 crew',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [leadRef, setLeadRef] = useState('');

  // Instant demo launching state
  const [isLaunchingDemo, setIsLaunchingDemo] = useState(false);

  // Active step in 5-step flow
  const [activeStep, setActiveStep] = useState(0);

  // FAQ Accordion open states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  React.useEffect(() => {
    if (!activeCategory) return;
    if (activeCategory === 'ai-receptionist' || activeCategory === 'tradie-ai') {
      const el = document.getElementById('ai-section');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (
      activeCategory === 'repeat-jobs' ||
      activeCategory === 'recurring-jobs' ||
      activeCategory === 'field-service' ||
      activeCategory === 'tradie-software'
    ) {
      const el = document.getElementById('features');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeCategory]);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/au/demo-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit demo request.');
      }

      setIsSubmitted(true);
      setLeadRef(data.leadRef || 'AU-DEMO');
      triggerConversionEvents(formData.trade, formData.email);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaunchInstantDemo = async () => {
    setIsLaunchingDemo(true);
    trackEvent('demo_login_click', {
      currency: 'AUD',
      location: 'au_landing_hero',
    });

    try {
      const res = await fetch('/api/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.user) {
        window.location.href = '/dashboard';
      } else {
        window.location.href = '/login?demo=1';
      }
    } catch {
      window.location.href = '/login?demo=1';
    } finally {
      setIsLaunchingDemo(false);
    }
  };

  const trades = [
    { name: 'Plumbing', icon: Wrench, desc: 'Hot water, emergency leaks & drains' },
    { name: 'Electrical', icon: Zap, desc: 'Switchboards, fitouts & safety checks' },
    { name: 'HVAC', icon: Fan, desc: 'Air conditioning, split systems & ducting' },
    { name: 'Cleaning', icon: Sparkle, desc: 'Commercial, bond & pressure cleaning' },
    { name: 'Landscaping', icon: Trees, desc: 'Lawn care, turf & outdoor maintenance' },
    { name: 'Roofing & Building', icon: Hammer, desc: 'Gutters, repairs & renovations' },
  ];

  const steps = [
    {
      num: '01',
      title: 'Quote',
      short: 'Fast estimates sent from phone or desk',
      desc: 'Create professional, branded Australian quotes in under 2 minutes. Itemise labour, materials, callout fees, and 10% GST. Clients approve in one tap with SMS e-signatures.',
      highlight: 'Quotes approved 60% faster',
    },
    {
      num: '02',
      title: 'Schedule',
      short: 'Smart dispatch matching crew, parts & location',
      desc: 'Drag and drop jobs onto a visual calendar board. Route crew members efficiently across Melbourne, Sydney, Brisbane, and regional hubs to slash fuel and driving time.',
      highlight: 'Cut daily travel by 45 mins',
    },
    {
      num: '03',
      title: 'Do the work',
      short: 'Checklists, photos and notes on mobile',
      desc: 'Technicians receive instant job details on their phones. Fill safety SWMS checklists, capture before/after photos, and collect client sign-offs even when working offline.',
      highlight: '100% offline field capability',
    },
    {
      num: '04',
      title: 'Invoice',
      short: 'Generated in one tap from completed work',
      desc: 'Completed jobs convert instantly into ATO-compliant tax invoices with accurate Australian GST. Seamless two-way integration with Xero, MYOB, and QuickBooks.',
      highlight: 'Zero double-handling into Xero',
    },
    {
      num: '05',
      title: 'Get paid',
      short: 'Instant card payments, direct debit, or bank transfer',
      desc: 'Take tap-to-pay on site with zero terminal rental, or send SMS payment links with PayID and credit card options. Automated polite payment chasing for overdue invoices.',
      highlight: 'Get paid on average in 48 hours',
    },
  ];

  const faqs = [
    {
      q: 'Does Fieseros comply with Australian tax and GST requirements?',
      a: 'Yes, 100%. Fieseros is fully localized for Australia. It automatically calculates the 10% Goods and Services Tax (GST) on quotes and invoices, generates ATO-compliant Tax Invoices with your Australian Business Number (ABN), and syncs directly into Xero, MYOB, and QuickBooks.',
    },
    {
      q: 'Can my tradies use the mobile app offline in low-reception areas?',
      a: 'Yes. Our mobile Progressive Web App (PWA) operates with full offline capability. Technicians can view job sheets, update job statuses, fill safety SWMS checklists, snap site photos, and collect signatures with zero cellular signal. All data synchronizes the moment they return to coverage.',
    },
    {
      q: 'How does the AI voice receptionist handle Australian accents and trade slang?',
      a: 'Our AI receptionist uses specialized Australian acoustic models trained specifically on local accents and trade terminology. It understands terms like "hot water system", "switchboard", "rough-in", "sparky", "dunny", and "call-out fee". It answers incoming calls 24/7, qualifies the emergency, gathers job details, and books appointments onto your schedule.',
    },
    {
      q: 'How does Fieseros compare to Jobber, Fergus, or ServiceM8?',
      a: 'Unlike traditional software that only provides forms and buttons, Fieseros adds an autonomous AI layer. It includes a 24/7 Australian AI phone receptionist, automated SMS quoting, smart route optimization, and 0% platform commission on payments. You get one seamless system without needing 5 expensive third-party add-ons.',
    },
    {
      q: 'How much does Fieseros cost in Australia?',
      a: 'All plans are priced transparently in Australian Dollars (AUD) with no lock-in contracts, no hidden setup fees, and 0% platform commission on payments you process. You can start with a 14-day free trial and experience immediate time savings.',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* ── HEADER / NAVBAR ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-md transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/au" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                  Fieseros
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                    AU 🇦🇺
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                  Field Service Software
                </span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              Features
            </a>
            <a href="#ai-section" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              AI Receptionist
            </a>
            <a href="#for-your-trade" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              For your trade
            </a>
            <a href="#faqs" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
              FAQs
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={handleLaunchInstantDemo}
              disabled={isLaunchingDemo}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-200"
            >
              {isLaunchingDemo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Live Demo
            </button>
            <a
              href="#book-demo"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Book a demo
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      {/* ── HERO SECTION ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 dark:from-slate-950 dark:via-slate-900/50 dark:to-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center mb-12">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100/90 dark:bg-emerald-950/70 border border-emerald-300/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-bold tracking-wider uppercase mb-6 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              FIELD SERVICE SOFTWARE FOR AUSTRALIA
            </div>

            {/* H1 */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 dark:text-white leading-[1.15] mb-6">
              Less admin. More jobs.{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 bg-clip-text text-transparent">
                One connected business.
              </span>
            </h1>

            {/* Subhead */}
            <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
              Manage customers, quotes, schedules and invoices — in the office or out on the job. Built for Australian tradies who want to get off the tools at night.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
              <a
                href="#book-demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 text-base font-semibold px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Book a free demo
                <ArrowRight className="w-4 h-4" />
              </a>
              <button
                onClick={handleLaunchInstantDemo}
                disabled={isLaunchingDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-semibold px-7 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-sm transition-all"
              >
                {isLaunchingDemo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    Connecting Demo Tenant...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                    Explore the platform
                  </>
                )}
              </button>
            </div>

            {/* Value Badges */}
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Office + field, connected
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Built around your workday
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                100% ATO & GST compliant
              </div>
            </div>
          </div>

          {/* ── HERO VISUAL CONTAINER (MOCKUPS) ────────────────────────── */}
          <div className="relative mx-auto max-w-5xl rounded-2xl bg-gradient-to-b from-slate-100/80 to-slate-200/50 dark:from-slate-900/80 dark:to-slate-800/50 p-3 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-2xl">
            {/* Dispatch Board Mockup Header */}
            <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="bg-slate-100 dark:bg-slate-800/60 px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-rose-400" />
                  <span className="w-3 h-3 rounded-full bg-amber-400" />
                  <span className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Fieseros Dispatch Board — Melbourne Metro (VIC)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400">
                    Live Syncing
                  </span>
                </div>
              </div>

              {/* Grid content inside board */}
              <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left: Schedule & Map */}
                <div className="lg:col-span-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        Today’s Schedule — Wednesday, Melbourne
                      </h4>
                      <p className="text-xs text-slate-500">3 technicians active • 7 jobs scheduled</p>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-200 dark:border-emerald-800">
                      On Time (98%)
                    </span>
                  </div>

                  {/* Technicians Schedule Blocks */}
                  <div className="space-y-2.5">
                    {/* Tech 1 */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-xs">
                          DM
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Dave Miller</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                              Plumber Lead
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-emerald-600" />
                            14 Park St, Brighton VIC 3186
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                          09:00 - 11:30 AM
                        </span>
                        <span className="text-[11px] text-emerald-600 font-medium">Emergency Hot Water Unit</span>
                      </div>
                    </div>

                    {/* Tech 2 */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs">
                          LS
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Liam Smith</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                              Apprentice
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            82 Church St, Richmond VIC 3121
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                          12:30 - 14:00 PM
                        </span>
                        <span className="text-[11px] text-blue-600 font-medium">Rough-in Rough Plumbing</span>
                      </div>
                    </div>

                    {/* Tech 3 */}
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-purple-600 text-white font-bold flex items-center justify-center text-xs">
                          SJ
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">Sarah Jenkins</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium">
                              Gas Specialist
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-purple-600" />
                            45 Toorak Rd, South Yarra VIC 3141
                          </p>
                        </div>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                          14:30 - 16:30 PM
                        </span>
                        <span className="text-[11px] text-purple-600 font-medium">Gas Compliance & Test</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Mobile App Card Mockup */}
                <div className="lg:col-span-4 rounded-xl bg-slate-900 text-white p-4 flex flex-col justify-between shadow-lg relative border border-slate-800">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-[11px] font-bold tracking-wide uppercase text-slate-400 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                        Technician Mobile View
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-semibold">
                        Offline Ready
                      </span>
                    </div>

                    <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                        Current Job (Brighton)
                      </span>
                      <h5 className="text-xs font-bold text-white mt-0.5">Michael Tan</h5>
                      <p className="text-[11px] text-slate-300 mt-0.5">14 Park St, Brighton VIC 3186</p>
                      <div className="mt-2.5 flex items-center gap-2">
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded">
                          A$450.00 Approved
                        </span>
                        <span className="text-[10px] text-slate-400">10% GST included</span>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <span className="text-slate-300">Safety SWMS Checklist</span>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <span className="text-slate-300">Before Photos (3 taken)</span>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                        <span className="text-slate-300">Client Signature</span>
                        <span className="text-[10px] text-amber-400 font-medium">Pending Tap</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Fieseros Field PWA</span>
                    <span className="text-[11px] font-bold text-emerald-400">Tap to Invoice →</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating Notification Badge */}
            <div className="absolute -bottom-4 right-8 sm:right-12 bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-bounce">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>New phone enquiry → Job scheduled ✓</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRADE STRIP ────────────────────────────────────────────── */}
      <section className="py-8 border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-6">
            TRUSTED BY AUSTRALIAN CONTRACTORS ACROSS ALL CORE TRADES
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {trades.map((t, idx) => {
              const Icon = t.icon;
              return (
                <div
                  key={idx}
                  className="flex flex-col items-center text-center p-3 sm:p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 hover:border-emerald-500/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{t.name}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{t.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5-STEP PROCESS SECTION ─────────────────────────────────── */}
      <section id="how-it-works" className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              HOW IT WORKS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-4 mb-4">
              From first enquiry to final payment.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Stop stitching together four different apps. Fieseros gives your office and field crew one single operating system built for Australian workflows.
            </p>
          </div>

          {/* Interactive Steps Grid */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {steps.map((step, idx) => (
              <div
                key={idx}
                onClick={() => setActiveStep(idx)}
                className={`cursor-pointer rounded-2xl p-6 transition-all border ${
                  activeStep === idx
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-xl ring-2 ring-emerald-500/20'
                    : 'bg-white/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-2xl font-black ${activeStep === idx ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-700'}`}>
                    {step.num}
                  </span>
                  {activeStep === idx && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">{step.short}</p>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">{step.desc}</p>
                <span className="inline-block text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/80 px-2 py-1 rounded">
                  ✓ {step.highlight}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: KEEP THE TEAM IN SYNC ───────────────────────── */}
      <section id="features" className="py-20 lg:py-28 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                KEEP THE WHOLE TEAM IN SYNC
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                A clear plan. A crew that’s ready.
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                No more frantic morning calls asking who has the parts or where the job key is. When dispatch updates the board, every tradie’s phone updates in real time.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Smart Suburb Route Clustering</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Schedule jobs by territory (e.g. Bayside, Inner West, Northern Beaches) to minimize time spent stuck in peak-hour traffic.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Live Job Sheet Progression</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Dispatchers see live status updates: &ldquo;En Route&rdquo;, &ldquo;On Site&rdquo;, &ldquo;Parts Ordered&rdquo;, and &ldquo;Completed&rdquo; without calling the technician.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Site Safety & SWMS On Mobile</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Pre-start safety risk assessments and mandatory sign-offs completed in seconds before the toolbox opens.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Dispatch Sync Mockup */}
            <div className="lg:col-span-6 rounded-2xl bg-slate-100 dark:bg-slate-800/50 p-6 border border-slate-200 dark:border-slate-700 shadow-xl">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Active Timeline — Melbourne Bayside</span>
                </div>
                <span className="text-[11px] text-slate-500 font-medium">Auto-Optimized</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-l-4 border-emerald-500 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">09:00 AM • COMPLETED</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">14 Park St, Brighton VIC 3186</h5>
                    <p className="text-[11px] text-slate-500">Dave Miller • Emergency Hot Water (A$450)</p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-l-4 border-blue-500 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">11:45 AM • IN PROGRESS</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">22 Acland St, St Kilda VIC 3182</h5>
                    <p className="text-[11px] text-slate-500">Dave Miller • Blocked Drain Jetting</p>
                  </div>
                  <Clock className="w-5 h-5 text-blue-500 animate-pulse" />
                </div>

                <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border-l-4 border-amber-500 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">02:15 PM • SCHEDULED</span>
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white">105 Swan St, Richmond VIC 3121</h5>
                    <p className="text-[11px] text-slate-500">Dave Miller • Tap & Mixer Replacements</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                    Client Notified via SMS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: INVOICING & ADMIN ───────────────────────────── */}
      <section className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Visual Australian Tax Invoice / Quote */}
            <div className="lg:col-span-6 rounded-2xl bg-white dark:bg-slate-900 p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
              <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
                <div>
                  <span className="text-xs font-black uppercase text-emerald-600 tracking-wider">TAX INVOICE / QUOTE</span>
                  <h4 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">Fieseros Plumbing Services Pty Ltd</h4>
                  <p className="text-xs text-slate-500">ABN: 48 612 904 221 • Brighton, Victoria</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">Quote #AU-2026-084</span>
                  <span className="text-[11px] text-slate-500">Date: 20 Oct 2026</span>
                </div>
              </div>

              {/* Customer Box */}
              <div className="my-5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-500 font-medium">Billed To:</span>
                  <p className="font-bold text-slate-900 dark:text-white mt-0.5">Michael Tan</p>
                  <p className="text-slate-600 dark:text-slate-400">14 Park St, Brighton VIC 3186</p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                  Accepted by Customer ✓
                </span>
              </div>

              {/* Line Items */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="text-left py-2">Description</th>
                    <th className="text-center py-2">Qty</th>
                    <th className="text-right py-2">Amount (AUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      Emergency Hot Water System Replacement
                      <span className="block text-[10px] text-slate-400">Supply & install storage unit</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-500">1</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">A$350.00</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-slate-800 dark:text-slate-200">
                      Licensed Master Plumber Labour
                      <span className="block text-[10px] text-slate-400">2 hours @ A$50/hr</span>
                    </td>
                    <td className="py-2.5 text-center text-slate-500">2</td>
                    <td className="py-2.5 text-right font-semibold text-slate-900 dark:text-white">A$100.00</td>
                  </tr>
                </tbody>
              </table>

              {/* Totals */}
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-xs text-right">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">A$450.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>GST (10%):</span>
                  <span className="font-semibold text-slate-900 dark:text-white">A$45.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span>Total Due:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base">A$495.00</span>
                </div>
              </div>

              <div className="mt-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between text-xs">
                <span className="text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5" />
                  Synced to Xero & MYOB
                </span>
                <span className="text-[11px] text-slate-500">Tap to pay collected</span>
              </div>
            </div>

            {/* Right: Feature Descriptions */}
            <div className="lg:col-span-6 space-y-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                LESS PAPERWORK, MORE PROGRESS
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Finish the job. Keep the admin moving.
              </h2>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                Spend Sunday with your family instead of entering receipts into a spreadsheet. Invoices are automatically generated from signed job sheets and pushed straight to your accountant.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Automated 10% Australian GST</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Never accidentally quote ex-GST and get caught short. Itemise materials, markups, and callout fees with compliant tax calculations.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Seamless Xero, MYOB & QuickBooks Sync</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Customers, invoices, line items, and payment receipts export automatically into your accounting software. Your bookkeeper will love you.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Automated SMS Payment Reminders</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Polite automatic text reminders with PayID and card payment links chase overdue invoices so you never have to make awkward collection calls.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: DARK AI SHOWCASE SECTION ────────────────────── */}
      <section id="ai-section" className="py-24 bg-gradient-to-b from-[#022c22] via-[#064e3b] to-[#022c22] text-white relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/60 px-3.5 py-1 rounded-full border border-emerald-500/30">
              POWERED BY ARTIFICIAL INTELLIGENCE
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mt-5 mb-4 text-white">
              An extra pair of hands.{' '}
              <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Powered by AI.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/80 leading-relaxed">
              Designed specifically for trade contractors who can’t answer the phone while under a sink, up a ladder, or driving a van.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: AI Voice Receptionist */}
            <div className="rounded-2xl p-6 sm:p-8 bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Headphones className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    24/7 Aussie Accent
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">AI Voice Receptionist</h3>
                <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed mb-6">
                  Answers incoming phone calls in an authentic Australian voice. Gathers job specifications, qualifies emergency callouts, quotes standard callout fees, and books jobs directly into your schedule.
                </p>

                {/* Simulated transcript pill */}
                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-xs space-y-1.5 font-mono text-emerald-200/90">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    Audio Call Log (Melbourne)
                  </div>
                  <p>&ldquo;G&rsquo;day! Thanks for calling Fieseros Plumbing. I can get Dave out to your Brighton address tomorrow at 9:00 AM. Does that work for you?&rdquo;</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-900/50 flex items-center justify-between text-xs text-emerald-300">
                <span>Never miss a high-ticket quote</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </div>

            {/* Card 2: AI Forms & Checklists */}
            <div className="rounded-2xl p-6 sm:p-8 bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center border border-teal-500/30">
                    <FileText className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40">
                    Smart Lead Intake
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">AI Forms & Checklists</h3>
                <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed mb-6">
                  Conversational website quote forms that adapt questions in real time. Automatically converts customer descriptions and photos into structured, itemised job sheets.
                </p>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-teal-500/20 text-xs space-y-2 text-slate-300">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-teal-400 font-bold">Customer Photo Analysis</span>
                    <span className="text-[10px] bg-teal-950 px-1.5 py-0.5 rounded text-teal-300">Identified</span>
                  </div>
                  <p className="text-xs text-white">Rheem 135L Gas Storage Unit • Model: 491135</p>
                  <p className="text-[11px] text-emerald-300">Suggested parts auto-added to van job sheet</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-900/50 flex items-center justify-between text-xs text-teal-300">
                <span>Cuts quote prep by 70%</span>
                <CheckCircle className="w-4 h-4 text-teal-400" />
              </div>
            </div>

            {/* Card 3: AI Job Assistance */}
            <div className="rounded-2xl p-6 sm:p-8 bg-slate-900/60 backdrop-blur-md border border-emerald-500/30 hover:border-emerald-400/60 transition-all flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                    <Bot className="w-6 h-6" />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Autonomous CRM
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">AI Assistance & Follow-Up</h3>
                <p className="text-xs sm:text-sm text-emerald-100/70 leading-relaxed mb-6">
                  Drafts client quote follow-ups, generates safety summaries from voice notes, and alerts you when a regular maintenance check or gas certificate is due for renewal.
                </p>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-emerald-500/20 text-xs space-y-1.5 text-slate-300">
                  <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    Automated Chasing
                  </div>
                  <p className="text-xs text-white">&ldquo;Hi Sarah, following up on quote #AU-084 for your hot water system. Would you like us to lock in Thursday?&rdquo;</p>
                  <span className="text-[10px] text-emerald-300 block">Sent 48 hrs after quote view</span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-emerald-900/50 flex items-center justify-between text-xs text-emerald-300">
                <span>Higher win rate on quotes</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 6: INDUSTRY TRADE CARDS ────────────────────────── */}
      <section id="for-your-trade" className="py-20 lg:py-28 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              TRADE-SPECIFIC WORKFLOWS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-4 mb-3">
              Made for the work you do.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300">
              Pre-configured templates, price books, and safety checklists tailored to your exact industry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1: Plumbing & HVAC */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <Image
                  src="/images/industry/plumbing.webp"
                  alt="Plumbing & HVAC"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Emergency & Maintenance</span>
                  <h3 className="text-xl font-bold">Plumbing & HVAC</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Hot water unit installs & gas compliance certificates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Emergency burst pipe dispatch with live technician GPS
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Reece & Tradelink price list imports
                  </li>
                </ul>
                <a
                  href="#book-demo"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 pt-2"
                >
                  Plumbing & HVAC demo <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Card 2: Electrical & Maintenance */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <Image
                  src="/images/industry/electrical.webp"
                  alt="Electrical & Maintenance"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Residential & Commercial</span>
                  <h3 className="text-xl font-bold">Electrical & Maintenance</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Switchboard upgrades & safety testing checklists
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    EV charger installations & commercial lighting fit-outs
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Middy&rsquo;s & Rexel inventory synchronization
                  </li>
                </ul>
                <a
                  href="#book-demo"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 pt-2"
                >
                  Electrical software demo <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Card 3: Cleaning & Landscaping */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 overflow-hidden hover:shadow-xl transition-all group">
              <div className="relative h-48 w-full overflow-hidden bg-slate-200 dark:bg-slate-800">
                <Image
                  src="/images/industry/landscaping.webp"
                  alt="Cleaning & Landscaping"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Recurring Services</span>
                  <h3 className="text-xl font-bold">Cleaning & Landscaping</h3>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Recurring weekly/monthly contract schedule automation
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Multi-crew routing with property gate notes & gate codes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    Before & after site photo proofs for commercial landlords
                  </li>
                </ul>
                <a
                  href="#book-demo"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 pt-2"
                >
                  Cleaning & Landscaping demo <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: FAQ ACCORDION ───────────────────────────────── */}
      <section id="faqs" className="py-20 lg:py-28 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-4">
              A few things you might be wondering.
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-2">
              Straightforward answers about our Australian platform, compliance, and pricing.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-slate-900 dark:text-white text-sm sm:text-base hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-300 shrink-0 ml-4 ${
                      openFaq === idx ? 'rotate-180 text-emerald-600' : ''
                    }`}
                  />
                </button>
                {openFaq === idx && (
                  <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800/80">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: HIGH-CONVERTING DEMO BOOKING FORM ──────────── */}
      <section id="book-demo" className="py-20 lg:py-28 bg-gradient-to-b from-emerald-50/70 via-teal-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-950 border-t border-emerald-200/60 dark:border-slate-800 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-8 sm:p-12 border border-emerald-200 dark:border-emerald-900/60 shadow-2xl relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400" />

            <div className="max-w-2xl mx-auto text-center mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full border border-emerald-300 dark:border-emerald-800">
                FREE DEMO & 14-DAY TRIAL
              </span>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3 mb-2">
                Book your Fieseros demo
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300">
                See how Fieseros saves Aussie tradies 10+ hours of admin every week. Get a personalized walkthrough or instant test access.
              </p>
            </div>

            {isSubmitted ? (
              <div className="p-8 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">You&rsquo;re all set!</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mx-auto">
                  Thanks for booking with Fieseros Australia. Your demo request ref is{' '}
                  <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">{leadRef}</span>.
                  Our Australian team will contact you shortly.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    onClick={handleLaunchInstantDemo}
                    disabled={isLaunchingDemo}
                    className="inline-flex items-center gap-2 text-sm font-bold px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-all"
                  >
                    {isLaunchingDemo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    Launch Instant Demo Sandbox Now
                  </button>
                  <button
                    onClick={() => setIsSubmitted(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    Submit another request
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleFormSubmit} className="space-y-5">
                {errorMessage && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                    <BadgeAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dave Miller"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="dave@millerplumbing.com.au"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Mobile Phone */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      placeholder="0412 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="Miller Plumbing & Gas"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Primary Trade */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Primary Trade
                    </label>
                    <select
                      value={formData.trade}
                      onChange={(e) => setFormData({ ...formData, trade: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Plumbing">Plumbing & Gas</option>
                      <option value="Electrical">Electrical & Sparky</option>
                      <option value="HVAC">HVAC & Air Conditioning</option>
                      <option value="Landscaping">Landscaping & Gardening</option>
                      <option value="Cleaning">Cleaning & Facilities</option>
                      <option value="Roofing">Roofing & Guttering</option>
                      <option value="Handyman">Handyman & Carpentry</option>
                      <option value="Other">Other Trade</option>
                    </select>
                  </div>

                  {/* Team Size */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                      Team Size
                    </label>
                    <select
                      value={formData.teamSize}
                      onChange={(e) => setFormData({ ...formData, teamSize: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Solo (1)">Solo (Just me on the tools)</option>
                      <option value="2-5 crew">2 to 5 crew members</option>
                      <option value="6-15 crew">6 to 15 crew members</option>
                      <option value="16+ crew">16+ crew (Commercial / Enterprise)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full inline-flex items-center justify-center gap-2 text-base font-bold px-6 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Booking your demo...
                      </>
                    ) : (
                      <>
                        Book my demo
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>

                {/* Trust bar under form */}
                <div className="pt-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    No credit card required
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Instant sandbox demo access
                  </span>
                  <span className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Dedicated Australian support
                  </span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-12 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                F
              </div>
              <span className="text-base font-bold text-slate-900 dark:text-white">Fieseros Australia</span>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                AUD (A$)
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              <Link href="/privacy-policy" className="hover:text-emerald-600 transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms-of-service" className="hover:text-emerald-600 transition-colors">
                Terms of Service
              </Link>
              <a href="#book-demo" className="hover:text-emerald-600 transition-colors">
                Book a Demo
              </a>
              <Link href="/contact-us" className="hover:text-emerald-600 transition-colors">
                Contact Support
              </Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <p>© 2026 Fieseros Pty Ltd. All rights reserved. Field service software for Australian trade professionals.</p>
            <p className="text-[11px] text-slate-400">
              Prices displayed in Australian Dollars (AUD). 0% platform commission on payments.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
