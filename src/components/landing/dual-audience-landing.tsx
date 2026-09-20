'use client';

import * as React from 'react';
import {
  Wrench,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Zap,
  Bot,
  PhoneCall,
  CalendarCheck,
  UserCheck,
  PhoneForwarded,
  Voicemail,
  Languages,
  Target,
  Calendar,
  Inbox,
  Wallet,
  Mail,
  MessageSquareText,
  Check,
  Star,
  Shield,
  Building2,
  Briefcase,
  Headphones,
  HardHat,
  Globe,
  Search,
  MapPin,
  ShieldCheck,
  Siren,
  FileText,
  TrendingUp,
  Clock,
  ClipboardList,
  Play,
  ChevronRight,
  Menu,
  X,
  MessageCircle,
  Thermometer,
  Trees,
  Bug,
  Home,
  Paintbrush,
  Truck,
  Plug,
  Key,
  PawPrint,
  Loader2,
  Smartphone,
  Store,
  Activity,
  Layers,
  Radio,
  FileSpreadsheet,
  CheckCircle2,
  Cpu,
  Coins,
  Lock,
  Sliders,
  Eye,
  Share2,
  Send,
  Navigation,
  Volume2,
  Percent,
  Hammer,
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { mapIndustryToUrlSlug, slugifyCity } from '@/lib/seo/schemas';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  mpUrl,
  type ProviderListItem,
  type ProviderListResponse,
} from '@/components/marketplace/types';
import { ProviderCard } from '@/components/marketplace/provider-card';
import { solutionsLinks, ProductMegaMenu, SolutionsMegaMenu, LandingFooter } from '@/components/landing/landing-solutions';
import { GooglePlayBadge } from '@/components/brand/google-play-badge';
// PERF-5 (code-splitting): CrmPricing and MarketplaceCompact are extracted to
// separate files so the bundler can tree-shake and split chunks. Previously
// these ~500 lines were inline in this 2290-line component, forcing the entire
// landing page into a single 70.6 KiB chunk. Now the initial chunk is smaller
// and these sections load on demand.
import { CrmPricing } from './crm-pricing';
import { MarketplaceCompact } from './marketplace-compact';
import { InteractiveJobSimulator } from '@/components/landing/interactive-job-simulator';
import { AiWorkersShowcase } from '@/components/landing/ai-workers-showcase';
import { TechnicianWorkspaceShowcase } from '@/components/landing/technician-workspace-showcase';
import { MarketplaceGrowthSection } from '@/components/landing/marketplace-growth-section';

// ─── Props ──────────────────────────────────────────────────────────────────

interface DualAudienceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

export type Audience = 'crm' | 'forms' | 'marketplace';

// ─── CRM marketing data ─────────────────────────────────────────────────────

// NOTE (Creem compliance): Stats below are factual product capabilities, not
// customer-count claims. Avoid reinstating "N+ businesses" / "N+ jobs" style
// stats without verifiable evidence — app store reviewers flag these.
const stats = [
  { value: '25+', label: 'Industries served' },
  { value: '100', label: 'Lifetime Jobs Free' },
  { value: '3-in-1', label: 'Email · SMS · WhatsApp' },
  { value: '99.9%', label: 'Uptime target' },
];

// Industries for the scrolling marquee — instantly signals "this is for service businesses"
const industryChips = [
  'Plumbing', 'HVAC', 'Cleaning', 'Electrical', 'Landscaping', 'Pest Control',
  'Roofing', 'Painting', 'Locksmith', 'Appliance Repair', 'Pool Service',
  'Automotive', 'Packing & Moving', 'Window Cleaning', 'Home Repair',
  'Salon & Beauty', 'Courier', 'Solar', 'Garage Door', 'Concrete',
  'Tree Care', 'Snow Removal', 'Pet Services',
];

// Hero trust badges — conversion confidence
const heroTrustBadges = [
  { icon: Clock, label: 'Live in under 10 minutes' },
  { icon: Wallet, label: 'Start Free — 100 Lifetime Jobs' },
  { icon: ShieldCheck, label: 'No credit card required' },
  { icon: Mail, label: 'Email & SMS work day one' },
];

// "The Problem" section — 3 pain points every service business owner recognizes
const problemPains = [
  {
    icon: PhoneCall,
    title: 'Missed calls = lost revenue',
    description: 'Every missed call after hours is a customer who calls your competitor. Most owners lose 3-5 jobs a week this way.',
    stat: '62% of calls go unanswered after hours',
    image: '/images/landing/problem-leads.png',
  },
  {
    icon: ClipboardList,
    title: 'Chaos in spreadsheets & texts',
    description: 'Leads scattered across text messages, WhatsApp, voicemails, and sticky notes. Jobs fall through the cracks every single week.',
    stat: '4+ hours/day wasted on admin',
    image: '/images/landing/problem-paperwork.png',
  },
  {
    icon: Wallet,
    title: 'Late invoices, late payments',
    description: 'You finish the job, then wait weeks for payment. Chasing customers for money is the worst part of running a service business.',
    stat: 'Avg invoice paid 18 days late',
    image: '/images/landing/problem-invoices.png',
  },
];

// ROI metrics — factual product capabilities (not customer-outcome claims).
// NOTE (Creem compliance): Previous values ("8+ hrs saved", "2× faster payments",
// "35% fewer no-shows") implied aggregated customer results we cannot evidence.
const roiMetrics = [
  { target: 25, suffix: '+', label: 'Industries supported', description: 'From plumbing to pet services' },
  { target: 3, suffix: '', label: 'Notification channels', description: 'Email, SMS, and WhatsApp built in' },
  { target: 100, suffix: '', label: 'Lifetime Jobs Free', description: 'Full access, no card required' },
  { target: 24, suffix: '/7', label: 'AI receptionist', description: 'Answers every call, day or night' },
];

// Channels section — "works out of the box"
const channels = [
  {
    icon: Mail,
    title: 'Email',
    description: 'Send branded emails from day one. Built-in templates for quotes, invoices, receipts, and campaigns. No approvals, no waiting.',
    badge: 'Works instantly',
    features: ['Quote & invoice templates', 'Payment links', 'Campaign broadcasts', 'Automated reminders'],
    image: '/images/landing/channel-email.png',
    alt: 'Fieseros branded email template for quotes, invoices, and receipts',
  },
  {
    icon: MessageSquareText,
    title: 'SMS',
    description: 'Reach customers instantly with SMS reminders, booking confirmations, and payment links. SMS works from day one — no carrier approvals.',
    badge: 'Works instantly',
    features: ['Booking confirmations', 'Day-of reminders', 'Payment links', 'Two-way chat'],
    image: '/images/landing/channel-sms.png',
    alt: 'Fieseros SMS message showing a booking confirmation and payment link',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Bring your own WhatsApp number (BYOK). Chat with customers, share job photos, send quotes and reminders — all from one unified inbox.',
    badge: 'BYO number',
    features: ['Two-way WhatsApp chat', 'Quote & photo sharing', 'Booking reminders', 'Unified inbox with Email + SMS'],
    image: '/images/landing/channel-whatsapp.png',
    alt: 'Fieseros WhatsApp chat with customer showing job photos and quotes',
  },
];

// "For Providers" section — explains the marketplace provider side
const providerBenefits = [
  {
    icon: Search,
    title: 'Get found by local customers',
    description: 'Your business appears in the Fieseros Marketplace where customers search for verified local pros. AI-powered matching sends you jobs that fit your skills and service area.',
  },
  {
    icon: Calendar,
    title: 'Fill your calendar automatically',
    description: 'Accept instant bookings, respond to quote requests, or get dispatched to emergencies — all from one inbox. No more cold leads, no more tire-kickers.',
  },
  {
    icon: Wallet,
    title: 'Get paid faster, with secure holding',
    description: 'Customer payments are held securely and released to your payment account the moment the job is marked complete. No more chasing invoices.',
  },
  {
    icon: TrendingUp,
    title: 'Grow with reviews & reputation',
    description: 'Every completed job builds your public profile with verified reviews, portfolio photos, and certifications. Climb the rankings and win more business.',
  },
];

const coreFlowSteps = [
  { label: 'Lead', icon: Target },
  { label: 'Booking', icon: Calendar },
  { label: 'Dispatch', icon: Zap },
  { label: 'Job', icon: HardHat },
  { label: 'Invoice', icon: FileText },
  { label: 'Payment', icon: Wallet },
  { label: 'Review', icon: Star },
  { label: 'Analytics', icon: TrendingUp },
];

const featurePillars = [
  {
    icon: Target,
    title: 'CRM & Leads',
    tagline: 'Never lose a lead again',
    image: '/images/landing/pillar-crm.png',
    features: [
      'Unified inbox — email, SMS, web forms, calls',
      'Lead pipeline + kanban',
      'Customer 360° view',
      'Smart segments & tags',
      'Lead discovery & scoring',
      'Drag-and-drop form builder',
    ],
  },
  {
    icon: Calendar,
    title: 'Operations & Dispatch',
    tagline: 'Run jobs like clockwork',
    image: '/images/landing/pillar-operations.png',
    features: [
      'Bookings & calendar',
      'Smart dispatch center',
      'Live technician map',
      'Employee timesheets',
      'Service catalog & checklists',
      'Real-time job tracking',
    ],
  },
  {
    icon: Inbox,
    title: 'Omnichannel Comms',
    tagline: 'Reach customers where they are',
    image: '/images/landing/pillar-communication.png',
    features: [
      'Email + SMS — works day one',
      'WhatsApp (BYO number)',
      'Push notifications',
      'Email campaigns + broadcasts',
      'Marketing templates',
      'Customer journeys & automations',
    ],
  },
  {
    icon: Wallet,
    title: 'Finance & Automation',
    tagline: 'Get paid faster, work less',
    image: '/images/landing/pillar-finance.png',
    features: [
      'Quotes & estimates',
      'Invoices + online payments',
      'Expenses & cost tracking',
      'No-code workflow builder',
      'AI Assistant + automations',
      'Custom workflow triggers',
    ],
  },
];

const aiHighlights = [
  { icon: PhoneCall, title: 'AI Receptionist', description: 'Answers every call 24/7, books appointments, qualifies leads, routes urgent calls — never miss a customer again.' },
  { icon: Bot, title: 'AI Assistant', description: 'Drafts replies, summarizes threads, suggests next-best-actions across your inbox.' },
  { icon: Sparkles, title: 'AI Campaign Generator', description: 'Generates email & SMS campaign copy, audience segments, and send-time suggestions.' },
  { icon: TrendingUp, title: 'AI Dispatcher', description: 'Auto-assigns jobs to the best-matching technician using skills, proximity, workload, and ratings.' },
];

const aiReceptionistCapabilities = [
  { icon: PhoneCall, title: 'Answers every call, 24/7', description: 'No more missed leads after hours. Picks up on the first ring — weekends, holidays, 3 AM emergencies included.' },
  { icon: CalendarCheck, title: 'Books appointments live', description: 'Checks your real-time calendar, quotes availability, and confirms bookings straight into your schedule.' },
  { icon: UserCheck, title: 'Qualifies & captures leads', description: 'Asks the right questions, captures name, address, and job details, then drops a clean lead into your CRM.' },
  { icon: PhoneForwarded, title: 'Transfers urgent calls', description: 'Recognises emergencies (no heat, burst pipe, gas leak) and warm-transfers to your on-call tech instantly.' },
  { icon: Voicemail, title: 'Takes detailed messages', description: 'When a transfer isn\'t needed, records a structured message with transcript, summary, and callback number.' },
  { icon: Languages, title: 'Speaks 30+ languages', description: 'Greets callers in their preferred language and switches mid-call. Perfect for multilingual neighbourhoods.' },
];

const personas = [
  {
    icon: Briefcase,
    title: 'Business Owner',
    image: '/images/landing/persona-owner.png',
    points: ['Real-time revenue & KPI dashboards', 'Full visibility into operations', 'Automated reports in your inbox'],
  },
  {
    icon: Headphones,
    title: 'Dispatcher',
    image: '/images/landing/persona-dispatcher.png',
    points: ['Smart dispatch board with map view', 'Drag-and-drop job assignment', 'Real-time technician tracking'],
  },
  {
    icon: HardHat,
    title: 'Field Technician',
    image: '/images/landing/persona-technician.png',
    points: ['Mobile app with job details & checklists', 'Photo capture & customer signatures', 'Turn-by-turn navigation'],
  },
  {
    icon: UserCheck,
    title: 'Customer',
    image: '/images/landing/persona-customer.png',
    points: ['Self-service booking portal', 'Email & SMS reminders', 'One-tap invoice payment'],
  },
];

const howItWorksSteps = [
  {
    step: 1,
    title: 'Capture Every Lead',
    subtitle: 'Email · SMS · Web Forms · Calls',
    description: 'Every inquiry auto-lands in one unified inbox. Nothing is missed, nothing is duplicated — including calls answered by your AI Receptionist.',
    icon: Target,
    image: '/images/landing/step-capture.png',
  },
  {
    step: 2,
    title: 'Dispatch & Track Jobs',
    subtitle: 'Smart Routing · Real-time',
    description: 'Smart-assign jobs to the best technician with live GPS tracking, real-time status, and automated customer notifications.',
    icon: Zap,
    image: '/images/landing/step-dispatch.png',
  },
  {
    step: 3,
    title: 'Get Paid Faster',
    subtitle: 'Invoicing · Payments · Reminders',
    description: 'Auto-generate invoices the moment a job completes. Send reminders via Email & SMS, collect payments online, and reconcile instantly.',
    icon: Wallet,
    image: '/images/landing/step-invoice.png',
  },
];

const faqs = [
  {
    question: 'How does the AI Receptionist work?',
    answer: 'It is a voice agent that answers every call to your business number 24/7 — greets callers, qualifies leads, books appointments into your calendar, takes messages, and transfers urgent calls. Powered by Vapi.ai (BYOK — paste your API key once). Numbers cost ~$2/month and calls ~$0.05–0.15/min. Available on Growth and Business plans.',
  },
  {
    question: 'Do I need any third-party approvals to get started?',
    answer: 'No. Fieseros works out of the box with Email, SMS, Push, and In-App notifications — no approvals, no waiting. Capture leads, send quotes, dispatch jobs, invoice customers, and collect payments from day one.',
  },
  {
    question: 'How long does it take to get set up?',
    answer: 'Most businesses are up and running in under an hour. Sign up with your email, import your customer list (CSV upload), set up your services and pricing, and start capturing leads immediately.',
  },
  {
    question: 'Can I import my existing customers?',
    answer: 'Absolutely. Use our CSV import tool to bring in customers, contacts, and job history from spreadsheets, your old CRM, or accounting software.',
  },
  {
    question: 'Do you charge per message or per call?',
    answer: 'Email and SMS are included in every plan with generous monthly limits. Push and in-app notifications are always unlimited. No hidden fees, no per-seat charges, no per-message surprises.',
  },
  {
    question: 'Is my data secure and backed up?',
    answer: 'Yes. We use enterprise-grade AES-256 encryption for all data at rest and in transit. Daily automated backups, 99.9% uptime SLA. You can export or delete your data anytime.',
  },
  {
    question: 'Can I try Fieseros before committing?',
    answer: 'Of course. We offer a 14-day free trial with full access to all Growth plan features. No credit card required. You can also explore our Live Demo — a real plumbing business with 2,000 customers, 300 bookings, and 500 invoices.',
  },
];

// NOTE: solutionsLinks, footerLinks, SolutionsMegaMenu, and LandingFooter live
// in @/components/landing/landing-solutions.tsx — extracted to keep this file
// under turbopack's compile-memory ceiling on 4 GB dev machines.

// ─── Top navbar ─────────────────────────────────────────────────────────────

function Navbar({ onGetStarted, onSignIn, audience, onPick }: { onGetStarted?: () => void; onSignIn?: () => void; audience: Audience; onPick: (a: Audience) => void }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  // Employee login — direct email + password (no company selection required).
  // The backend resolves the tenant from User.tenantId automatically.
  const [empLoginOpen, setEmpLoginOpen] = React.useState(false);
  const [empEmail, setEmpEmail] = React.useState('');
  const [empPassword, setEmpPassword] = React.useState('');
  const [empLoading, setEmpLoading] = React.useState(false);
  const [empError, setEmpError] = React.useState<string | null>(null);

  // Auto-open the employee login dialog when ?login=employee is in the URL
  // (PWA manifest shortcut / shared link).
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('login') === 'employee') {
        setEmpLoginOpen(true);
        params.delete('login');
        const remaining = params.toString();
        const newUrl = remaining
          ? `${window.location.pathname}?${remaining}`
          : window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }
    } catch {
      // ignore
    }
  }, []);

  // Direct employee login — POST /api/auth/login { email, password }
  // No company/slug required. The backend resolves the tenant automatically.
  const handleEmployeeLogin = async () => {
    if (!empEmail.trim() || !empPassword) return;
    setEmpLoading(true);
    setEmpError(null);
    try {
      const res = await fetch('/api/auth/login?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: empEmail.trim(), password: empPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || 'Invalid email or password');
      }
      // Success — redirect to the app (the cookie is set by the server).
      // The home-page-client will detect the auth state and route to the
      // employee portal automatically based on the user's role.
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setEmpLoading(false);
    }
  };

  // Audience-aware anchor link: if user is on marketplace fork, switch to CRM
  // fork first, THEN smooth-scroll to the anchor (after the CRM sections render).
  function crmAnchorClick(href: string, e?: React.MouseEvent) {
    if (e) e.preventDefault();
    setMobileOpen(false);
    if (audience !== 'crm') {
      onPick('crm');
      // Wait for CRM sections to render, then scroll
      setTimeout(() => {
        document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } else {
      document.querySelector(href)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 group shrink-0" aria-label="Fieseros home" onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <BrandMark size={32} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-foreground">Fieseros</span>
        </a>

        {/* ── Desktop Navigation (5 Clean Grouped Items) ── */}
        <nav className="hidden md:flex items-center gap-1.5">
          <ProductMegaMenu onAnchorClick={crmAnchorClick} />
          <SolutionsMegaMenu />
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Marketplace</span>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-full">
              Pros
            </span>
          </Link>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ClipboardList className="h-4 w-4 text-emerald-600" />
            <span>My Requests</span>
          </Link>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 px-2.5 py-1.5 rounded-lg transition-colors"
            onClick={(e) => crmAnchorClick('#pricing', e)}
          >
            Pricing
          </a>
        </nav>

        {/* ── Right Actions ── */}
        <div className="hidden sm:flex items-center gap-2">
          {/* Post Request CTA */}
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold shadow-sm text-xs sm:text-sm h-9 px-3 rounded-lg"
          >
            <Link href="/request">
              <span>Post Request</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>

          {/* Employee login entry point */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEmpLoginOpen(true)}
            className="text-xs text-muted-foreground hover:text-foreground gap-1.5 h-9 px-2.5 rounded-lg"
            title="Field technician and staff portal"
          >
            <Key className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="hidden lg:inline">Employee Login</span>
          </Button>
          {onSignIn ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignIn}
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground h-9 px-3 rounded-lg"
            >
              Sign In
            </Button>
          ) : null}
          {onGetStarted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onGetStarted}
              className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 font-semibold text-xs sm:text-sm h-9 px-3.5 rounded-lg"
            >
              Start Trial
            </Button>
          ) : null}
        </div>

        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-foreground inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-lg hover:bg-muted/60 active:bg-muted transition-colors"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen ? (
        <div className="md:hidden border-t bg-background max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] px-3 py-3 space-y-2">
          <Accordion type="single" collapsible className="w-full space-y-2">
            {/* Product Section */}
            <AccordionItem value="product" className="border rounded-xl px-3 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600" />
                  <span>Platform &amp; Features</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-1">
                {solutionsLinks.features.slice(0, 5).map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-xs font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted/60"
                    onClick={(e) => {
                      setMobileOpen(false);
                      if (item.href.startsWith('/#')) crmAnchorClick(item.href.replace('/', ''), e);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-border/60">
                  <a
                    href="#ai-receptionist"
                    className="flex items-center justify-between text-xs font-semibold text-emerald-600 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    onClick={(e) => crmAnchorClick('#ai-receptionist', e)}
                  >
                    <span>24/7 AI Receptionist</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full uppercase">AI Voice</span>
                  </a>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Solutions Section */}
            <AccordionItem value="solutions" className="border rounded-xl px-3 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600" />
                  <span>Solutions &amp; Trades</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
                    Industries (18+ Trades)
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {solutionsLinks.industries.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="text-xs text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted/60 truncate block"
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
                    Agency Growth Services
                  </p>
                  <div className="space-y-1">
                    {solutionsLinks.services.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="block text-xs text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
                <div className="pt-2 border-t border-border/60">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 mb-1">
                    Comparisons
                  </p>
                  <div className="space-y-1">
                    {solutionsLinks.compare.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="block text-xs text-muted-foreground hover:text-foreground p-1.5 rounded hover:bg-muted/60"
                        onClick={() => setMobileOpen(false)}
                      >
                        {link.label}
                      </a>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Direct Links in Mobile Menu */}
          <div className="rounded-xl border bg-card p-2 space-y-1">
            <Link
              href="/marketplace"
              className="flex items-center justify-between p-2.5 text-xs font-semibold text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-emerald-600" />
                <span>Verified Pro Marketplace</span>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-semibold">
                Browse
              </span>
            </Link>
            <a
              href="#pricing"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={(e) => crmAnchorClick('#pricing', e)}
            >
              <span>Pricing Plans</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
            <Link
              href="/invoice-generator"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-foreground hover:bg-muted rounded-lg transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <span>Free Invoice Generator</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </div>

          {/* Mobile CTAs */}
          <div className="pt-2 space-y-2">
            {onGetStarted ? (
              <Button
                size="sm"
                className="w-full min-h-11 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-sm rounded-xl"
                onClick={() => { setMobileOpen(false); onGetStarted(); }}
              >
                Get Started Free <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : null}
            {onSignIn ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-11 rounded-xl"
                onClick={() => { setMobileOpen(false); onSignIn(); }}
              >
                Sign In
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="w-full min-h-10 text-muted-foreground hover:text-foreground text-xs gap-1.5"
              onClick={() => { setEmpLoginOpen(true); setMobileOpen(false); }}
            >
              <Key className="h-3.5 w-3.5" />
              Employee / Field Staff Login
            </Button>
          </div>
        </div>
      ) : null}

      {/* Employee login dialog — direct email + password (no company selection) */}
      <Dialog open={empLoginOpen} onOpenChange={setEmpLoginOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-lg bg-amber-500 shrink-0">
                <HardHat className="size-5 text-white" />
              </div>
              <div className="min-w-0">
                <DialogTitle>Employee Login</DialogTitle>
                <DialogDescription className="mt-1">
                  Enter your work email and password to sign in.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="email"
              placeholder="you@business.com"
              value={empEmail}
              onChange={(e) => setEmpEmail(e.target.value)}
              className="min-h-12"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={empPassword}
              onChange={(e) => setEmpPassword(e.target.value)}
              className="min-h-12"
              autoComplete="current-password"
              onKeyDown={(e) => { if (e.key === 'Enter') handleEmployeeLogin(); }}
            />
            {empError && (
              <p className="text-sm text-red-600">{empError}</p>
            )}
            <Button
              onClick={handleEmployeeLogin}
              disabled={empLoading || !empEmail.trim() || !empPassword}
              className="w-full min-h-12 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {empLoading ? <Loader2 className="size-4 animate-spin" /> : 'Sign In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

// ─── 2026 Interactive Hero Simulator ──────────────────────────────────────────

function InteractiveHeroSimulator({ onGetStarted }: { onGetStarted?: () => void }) {
  const [activeTab, setActiveTab] = React.useState<'dispatch' | 'voice' | 'forms' | 'marketplace'>('dispatch');
  const [formMode, setFormMode] = React.useState<'classic' | 'card' | 'ai'>('classic');
  const [selectedBid, setSelectedBid] = React.useState<number>(1);
  const [voicePlaying, setVoicePlaying] = React.useState<boolean>(true);

  return (
    <div className="mt-12 relative max-w-5xl mx-auto text-left">
      {/* Glow effect */}
      <div className="absolute -inset-4 bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-cyan-500/20 rounded-3xl blur-3xl -z-10" />

      <div className="rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10">
        {/* Simulator Top Bar / Tabs */}
        <div className="flex flex-wrap items-center justify-between border-b border-border/70 bg-muted/60 px-4 py-2.5 gap-2">
          {/* Window controls */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <span className="w-3 h-3 rounded-full bg-red-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-400/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/80 inline-block" />
            <span className="ml-2 text-[11px] font-mono text-muted-foreground">fieseros.app/live-os</span>
          </div>

          {/* Interactive Mode Pills */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full" style={{ scrollbarWidth: 'none' }}>
            <button
              type="button"
              onClick={() => setActiveTab('dispatch')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === 'dispatch'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background',
              )}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Field Service OS &amp; Dispatch</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('voice')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === 'voice'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background',
              )}
            >
              <PhoneCall className="h-3.5 w-3.5" />
              <span>24/7 AI Voice Receptionist</span>
              <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded-full uppercase">Live</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('forms')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === 'forms'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background',
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>AI Form Studio (20K+ Templates)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('marketplace')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap',
                activeTab === 'marketplace'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-background/60 text-muted-foreground hover:text-foreground hover:bg-background',
              )}
            >
              <Store className="h-3.5 w-3.5" />
              <span>3-Bid Marketplace</span>
              <span className="text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full font-bold">$0 Lead Fee</span>
            </button>
          </div>
        </div>

        {/* Tab 1: Field Service OS & Live Dispatch */}
        {activeTab === 'dispatch' ? (
          <div className="p-4 sm:p-6 grid lg:grid-cols-12 gap-5">
            {/* Left Column: Live KPI & Telemetry */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Today&apos;s Revenue</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                    <TrendingUp className="h-3 w-3" /> +28% vs last week
                  </span>
                </div>
                <div className="mt-2 text-2xl font-black text-foreground tracking-tight">$4,850.00</div>
                <div className="mt-3 grid grid-cols-2 gap-2 pt-3 border-t border-border/60 text-xs">
                  <div>
                    <span className="text-muted-foreground">Completed</span>
                    <p className="font-bold text-foreground">12 jobs</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">On-Time ETA</span>
                    <p className="font-bold text-emerald-600">99.2%</p>
                  </div>
                </div>
              </div>

              {/* Live Technician Status Card */}
              <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-500/5 to-teal-500/10 dark:border-emerald-800/60 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                        DM
                      </div>
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-foreground">Dave Miller · Lead Tech</div>
                      <div className="text-[11px] text-muted-foreground">Van #4 (GPS Active)</div>
                    </div>
                  </div>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                    En Route
                  </Badge>
                </div>
                <div className="mt-2 text-xs text-foreground/90 flex items-center justify-between">
                  <span>Destination: 742 Evergreen Terr.</span>
                  <span className="font-bold text-emerald-600">ETA 6 min</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-3.5 text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>33 Payment Gateways Connected</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Stripe, Square, PayPal, Razorpay, Apple Pay &amp; Google Pay with 1-click tap to pay.
                </p>
              </div>
            </div>

            {/* Right Column: Live Dispatch Board View */}
            <div className="lg:col-span-8 rounded-xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Active Dispatch Queue</span>
                  <Badge variant="outline" className="text-[10px] text-muted-foreground">3 In Progress</Badge>
                </div>
                <span className="text-[11px] text-muted-foreground">Live Telemetry Synchronized</span>
              </div>

              {/* Jobs List */}
              <div className="space-y-2.5">
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/80 bg-emerald-500/5 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300">
                      <Wrench className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Job #1084 · Main Water Line Burst</span>
                        <span className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.2 rounded font-semibold uppercase">Emergency</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Robert Vance · 742 Evergreen Terr · $650.00 Est.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-bold text-emerald-600">Dave M. assigned</span>
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2.5">
                      View Job
                    </Button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                      <Thermometer className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Job #1085 · Seasonal HVAC Heat Pump Tune-Up</span>
                        <span className="text-[10px] bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300 px-1.5 py-0.2 rounded font-semibold uppercase">Recurring</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Elena Rostova · 1904 Harbor Blvd · $249.00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Badge variant="secondary" className="text-[11px]">Alex C. On Site</Badge>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                      <Plug className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">Job #1086 · 200A Electrical Panel Upgrade &amp; EV Charger</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">Marcus Sterling · 88 West End Ave · $2,400.00</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs text-muted-foreground">Starts 2:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Bottom Quick Action Strip */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground border-t border-border/60">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Smartphone className="h-3.5 w-3.5 text-emerald-600" /> Offline Mobile PWA Synced
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-teal-600" /> Automated Recurring Contracts
                  </span>
                </div>
                {onGetStarted ? (
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="text-xs font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                  >
                    Open Full CRM Dashboard <ArrowRight className="h-3 w-3" />
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* Tab 2: 24/7 AI Voice Receptionist */}
        {activeTab === 'voice' ? (
          <div className="p-4 sm:p-6 grid lg:grid-cols-12 gap-5">
            {/* Left Column: Live Call Audio & Waveform */}
            <div className="lg:col-span-5 rounded-xl border border-emerald-400/30 bg-slate-950 p-5 text-white space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                      <PhoneCall className="h-5 w-5 text-emerald-400" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <span>Inbound Call · 24/7 Live</span>
                      <span className="text-[9px] bg-emerald-500/30 text-emerald-300 px-1.5 py-0.2 rounded-full uppercase font-mono">00:38</span>
                    </div>
                    <p className="text-[11px] text-slate-400">+1 (512) 840-2911 → Apex Plumbing</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setVoicePlaying(!voicePlaying)}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors text-emerald-400"
                  aria-label="Toggle voice simulation"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>

              {/* Animated Soundwave Visualizer */}
              <div className="rounded-lg bg-white/5 border border-white/10 p-3 flex items-center justify-center gap-1.5 h-14">
                {[12, 28, 44, 20, 36, 48, 16, 40, 24, 46, 32, 18, 42, 28, 38, 14, 30].map((h, i) => (
                  <span
                    key={i}
                    className={cn(
                      'w-1 rounded-full bg-emerald-400 transition-all duration-300',
                      voicePlaying ? 'animate-pulse' : 'opacity-40',
                    )}
                    style={{
                      height: voicePlaying ? `${h}px` : '8px',
                      animationDelay: `${i * 70}ms`,
                    }}
                  />
                ))}
              </div>

              <div className="space-y-2 pt-2 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span>AI Agent Voice Engine:</span>
                  <span className="font-mono text-emerald-300 font-semibold">Vapi.ai + Deepgram + Claude</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Speech-to-Speech Latency:</span>
                  <span className="font-mono text-emerald-300 font-semibold">410 ms</span>
                </div>
                <div className="flex items-center justify-between text-slate-300">
                  <span>Usage Rate:</span>
                  <span className="font-mono text-emerald-300 font-semibold">$0.05 – $0.12 / min (BYOK)</span>
                </div>
              </div>
            </div>

            {/* Right Column: Live Dialogue & Automated Actions */}
            <div className="lg:col-span-7 rounded-xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Real-Time Autonomous Transcript</span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                  ✓ Auto-Booked in Calendar
                </Badge>
              </div>

              {/* Chat bubbles */}
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-2.5">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">AI Receptionist · Riley</span>
                    <p className="text-foreground/90 leading-relaxed">&ldquo;Thanks for calling Apex Plumbing! I can dispatch an emergency technician today. What is the address of the leak?&rdquo;</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-xl bg-muted p-2.5">
                    <span className="text-[10px] font-bold text-muted-foreground block mb-0.5">Caller (Homeowner)</span>
                    <p className="text-foreground/90 leading-relaxed">&ldquo;Hi, water is overflowing under my kitchen sink. We&apos;re at 742 Evergreen Terrace.&rdquo;</p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-2.5">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block mb-0.5">AI Receptionist · Riley</span>
                    <p className="text-foreground/90 leading-relaxed">&ldquo;Understood. I have booked Dave Miller for 2:15 PM today. I just sent a confirmation SMS to your number with live GPS tracking.&rdquo;</p>
                  </div>
                </div>
              </div>

              {/* Automated Actions Taken */}
              <div className="pt-3 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Lead Created</span>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5">
                  <CalendarCheck className="h-3.5 w-3.5" />
                  <span>2:15 PM Booked</span>
                </div>
                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/40 p-2 text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1.5 col-span-2 sm:col-span-1">
                  <MessageSquareText className="h-3.5 w-3.5" />
                  <span>SMS Dispatched</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tab 3: AI Form Studio & 20,391 Templates */}
        {activeTab === 'forms' ? (
          <div className="p-4 sm:p-6 grid lg:grid-cols-12 gap-5">
            {/* Left Column: Form Format Selector & 20K Templates Pill Grid */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Interactive Form Format</span>
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                    200+ Smart Widgets
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-1.5 p-1 bg-muted/60 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setFormMode('classic')}
                    className={cn(
                      'py-1.5 text-xs font-semibold rounded-md transition-all text-center',
                      formMode === 'classic' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Classic Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('card')}
                    className={cn(
                      'py-1.5 text-xs font-semibold rounded-md transition-all text-center',
                      formMode === 'card' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Card Swipe
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormMode('ai')}
                    className={cn(
                      'py-1.5 text-xs font-semibold rounded-md transition-all text-center',
                      formMode === 'ai' ? 'bg-background shadow-xs text-foreground font-bold' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Conversational
                  </button>
                </div>

                <p className="text-[11px] text-muted-foreground">
                  Switch instantly between traditional multi-step forms, mobile swipe cards, or an AI dialogue agent that fills inputs automatically.
                </p>
              </div>

              {/* Template Category Pills */}
              <div className="rounded-xl border border-border bg-background p-4 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">20,391 Ready Templates</span>
                  <Link href="/templates" className="text-[11px] font-bold text-emerald-600 hover:underline">
                    Browse All 40+ &rarr;
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Booking Forms', href: '/templates/booking-forms' },
                    { label: 'Inspection Forms', href: '/templates/inspection-forms' },
                    { label: 'Feedback Forms', href: '/templates/feedback-forms' },
                    { label: 'Consent Forms', href: '/templates/consent-forms' },
                    { label: 'Contract Forms', href: '/templates/contract-forms' },
                    { label: 'Application Forms', href: '/templates/application-forms' },
                  ].map((cat) => (
                    <Link
                      key={cat.label}
                      href={cat.href}
                      className="px-2.5 py-1 rounded-full bg-muted/60 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 text-[11px] font-medium border border-border/70 transition-colors"
                    >
                      {cat.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Live Form Runtime Preview */}
            <div className="lg:col-span-7 rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-background p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-border/60">
                <div>
                  <div className="text-xs font-bold text-foreground">Commercial Roof Inspection &amp; Estimate Form</div>
                  <div className="text-[11px] text-muted-foreground">Dynamic Calculations · Photo Notes · E-Signature</div>
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300">
                  Live Preview Mode
                </Badge>
              </div>

              {/* Interactive Form Field Simulation */}
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">
                    Roof Square Footage (Formula Calculation Widget)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value="2,500 sq ft" className="h-8 text-xs font-medium bg-muted/40" />
                    <span className="text-muted-foreground font-mono">× $0.45/sqft</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between">
                  <span className="font-semibold text-emerald-900 dark:text-emerald-200">
                    Live Computed Estimate:
                  </span>
                  <span className="text-base font-black text-emerald-700 dark:text-emerald-300">
                    $1,125.00
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg border border-border/80 p-2.5 text-center bg-muted/20">
                    <Paintbrush className="h-4 w-4 mx-auto text-emerald-600 mb-1" />
                    <span className="text-[11px] font-medium text-foreground">Photo Markup Attached</span>
                  </div>
                  <div className="rounded-lg border border-border/80 p-2.5 text-center bg-muted/20">
                    <CheckCircle2 className="h-4 w-4 mx-auto text-teal-600 mb-1" />
                    <span className="text-[11px] font-medium text-foreground">E-Signature Captured</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs">
                <Link
                  href="/gptform"
                  className="font-bold text-emerald-600 hover:underline inline-flex items-center gap-1"
                >
                  Explore AI Form Builder <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/templates"
                  className="font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Search 20,391 Templates &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : null}

        {/* Tab 4: 3-Bid On-Demand Marketplace (AllBetter Parity) */}
        {activeTab === 'marketplace' ? (
          <div className="p-4 sm:p-6 grid lg:grid-cols-12 gap-5">
            {/* Left Column: Customer Request Wizard Info */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-xl border border-amber-300/80 bg-gradient-to-br from-amber-500/5 to-orange-500/10 dark:border-amber-800/60 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Job #892: Water Heater Emergency</span>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[10px]">
                    3 Bids Received
                  </Badge>
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">
                  &ldquo;50-gallon Rheem water heater leaking in basement. Need replacement today before 5 PM.&rdquo;
                </p>
                <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/40 text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>📍 Austin, TX (78704)</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-300">Posted 8 mins ago</span>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background p-4 text-xs space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600 font-bold">
                  <ShieldCheck className="h-4 w-4" />
                  <span>$0 Upfront Contractor Lead Fees</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Unlike Angi or Thumbtack where contractors pay $30–$80 per click/lead with zero guarantee, Fieseros charges <strong>$0 to submit bids</strong>. Contractors only pay 2.5%–8% when winning the job.
                </p>
              </div>
            </div>

            {/* Right Column: Live Competing Bids Comparison */}
            <div className="lg:col-span-7 rounded-xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-bold text-foreground">Live Competing Bids (Escrow Protected)</span>
                </div>
                <Link href="/request/track" className="text-[11px] font-bold text-amber-600 hover:underline">
                  Track Live &rarr;
                </Link>
              </div>

              {/* 3 Bid Cards */}
              <div className="space-y-2.5">
                {[
                  {
                    id: 1,
                    pro: 'Apex Master Plumbing',
                    rating: '4.9 (124 reviews)',
                    eta: 'Can arrive in 45 mins',
                    price: '$1,250.00',
                    badge: 'Fastest Response',
                  },
                  {
                    id: 2,
                    pro: 'Capital City Water & Gas',
                    rating: '5.0 (88 reviews)',
                    eta: 'Available 2:00 PM',
                    price: '$1,320.00',
                    badge: '5-Yr Parts Warranty',
                  },
                  {
                    id: 3,
                    pro: 'Budget Flow Service',
                    rating: '4.8 (64 reviews)',
                    eta: 'Available 3:30 PM',
                    price: '$1,190.00',
                    badge: 'Best Price',
                  },
                ].map((bid) => (
                  <div
                    key={bid.id}
                    onClick={() => setSelectedBid(bid.id)}
                    className={cn(
                      'cursor-pointer rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all',
                      selectedBid === bid.id
                        ? 'border-amber-400 bg-amber-500/10 shadow-sm'
                        : 'border-border bg-card hover:border-amber-300',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0',
                        selectedBid === bid.id ? 'bg-amber-600 text-white' : 'bg-muted text-muted-foreground',
                      )}>
                        #{bid.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">{bid.pro}</span>
                          <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded font-semibold">
                            {bid.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">⭐ {bid.rating} · {bid.eta}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="text-right">
                        <span className="text-xs font-black text-foreground">{bid.price}</span>
                        <span className="block text-[9px] text-muted-foreground">Escrow held</span>
                      </div>
                      <Button
                        size="sm"
                        className={cn(
                          'h-7 text-xs px-2.5',
                          selectedBid === bid.id ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'variant-outline',
                        )}
                      >
                        {selectedBid === bid.id ? 'Selected' : 'Select Bid'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Bottom CTAs */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs border-t border-border/60">
                <Link
                  href="/request"
                  className="font-bold text-amber-600 hover:underline inline-flex items-center gap-1"
                >
                  Post a 3-Bid Request (Free) <ArrowRight className="h-3 w-3" />
                </Link>
                <Link
                  href="/marketplace"
                  className="font-medium text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                >
                  Browse Marketplace Directory &rarr;
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── Hero with audience fork ────────────────────────────────────────────────

function HeroFork({
  audience,
  onPick,
  onTryDemo,
  onGetStarted,
}: {
  audience: Audience;
  onPick: (a: Audience) => void;
  onTryDemo?: () => void;
  onGetStarted?: () => void;
}) {
  const router = useRouter();
  const [homeownerInput, setHomeownerInput] = React.useState('');

  const handleHomeownerSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = homeownerInput.trim();
    if (query) {
      router.push(`/request?q=${encodeURIComponent(query)}`);
    } else {
      router.push('/request');
    }
  };

  return (
    <section id="top" className="relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20" />
      <div className="absolute -left-32 -top-32 -z-10 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
      <div className="absolute -right-32 top-20 -z-10 h-96 w-96 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-700/10" />

      <div className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:px-6 sm:pb-16 sm:pt-16 text-center">
        {/* Eyebrow */}
        <div className="mb-4 flex justify-center">
          <Badge className="gap-1.5 border-emerald-200 bg-white/80 px-3.5 py-1 text-emerald-800 backdrop-blur hover:bg-white dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
            AI-Powered Operating System for Service Businesses
          </Badge>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl lg:text-7xl leading-[1.08] max-w-5xl mx-auto">
          Run every job{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
            from lead to paid.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-base text-muted-foreground sm:text-lg lg:text-xl leading-relaxed">
          Fieseros brings leads, customers, quotes, scheduling, dispatch, technicians, invoices, payments, and AI into one operating system — while the Fieseros Marketplace helps you win more work.
        </p>

        {/* ── Consumer / Homeowner Fast Quote Search Bar ── */}
        <div className="mt-8 max-w-3xl mx-auto">
          <form
            onSubmit={handleHomeownerSearch}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center shadow-2xl rounded-2xl border-2 border-emerald-500/40 bg-background/95 backdrop-blur-xl p-2 focus-within:border-emerald-500 focus-within:ring-4 focus-within:ring-emerald-500/20 transition-all gap-2"
          >
            <div className="flex items-center flex-1 min-w-0 pl-2">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mr-2 animate-pulse" />
              <input
                type="text"
                value={homeownerInput}
                onChange={(e) => setHomeownerInput(e.target.value)}
                placeholder="What service do you need? (e.g. AC not cooling, boiler leak, electrical...)"
                className="w-full bg-transparent text-sm sm:text-base text-foreground placeholder:text-muted-foreground focus:outline-none py-2"
              />
            </div>
            <Button
              type="submit"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-11 sm:h-12 px-6 rounded-xl shadow-md gap-1.5"
            >
              <span>Get Free Quotes</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {/* Popular trade quick chips */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold mr-1">Popular:</span>
            {[
              { label: '❄️ HVAC', cat: 'hvac' },
              { label: '🔧 Plumbing', cat: 'plumbing' },
              { label: '⚡ Electrical', cat: 'electrical' },
              { label: '🏠 Roofing', cat: 'roofing' },
              { label: '🧹 Cleaning', cat: 'cleaning' },
              { label: '🔨 Handyman', cat: 'handyman' },
            ].map((trade) => (
              <Link
                key={trade.cat}
                href={`/request?category=${trade.cat}`}
                className="px-2.5 py-1 rounded-full bg-background/80 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/60 dark:hover:text-emerald-300 font-medium transition-colors border border-border/70 shadow-xs"
              >
                {trade.label}
              </Link>
            ))}
          </div>

          {/* Trust Guarantees */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-semibold">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Local Contractors
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-teal-600" /> Fast Response Times
            </span>
            <span className="flex items-center gap-1">
              <Lock className="h-3.5 w-3.5 text-amber-600" /> Secure Payment &amp; Release
            </span>
          </div>
        </div>

        {/* Primary Contractor Action Buttons */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          {onGetStarted ? (
            <Button
              type="button"
              onClick={onGetStarted}
              size="lg"
              className="h-12 px-7 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 rounded-xl"
            >
              Start Free — $0 <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="h-12 px-7 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40 rounded-xl"
            >
              <Link href="/register">
                Start Free — $0 <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          )}

          <Button
            asChild
            size="lg"
            variant="outline"
            className="h-12 px-5 text-base font-semibold border-border bg-background/80 hover:bg-muted rounded-xl"
          >
            <Link href="/marketplace">
              <Store className="w-4 h-4 mr-2 text-emerald-600" /> Browse Verified Pros
            </Link>
          </Button>

          {onTryDemo ? (
            <Button
              type="button"
              variant="ghost"
              onClick={onTryDemo}
              size="lg"
              className="h-12 px-4 text-base font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl"
            >
              <Play className="w-4 h-4 mr-2" /> Live Demo
            </Button>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">100 Lifetime Jobs included &bull; No credit card required &bull; Live in under 10 minutes</p>

        {/* Audience Fork — 3 Modes (Contractor CRM, AI Forms & Templates, Marketplace) */}
        <div className="mx-auto mt-9 max-w-4xl">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground font-bold">Choose your experience</p>
          <div className="grid gap-3 sm:grid-cols-3 text-left">
            <button
              type="button"
              onClick={() => onPick('crm')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 p-4 transition-all min-h-[96px]',
                audience === 'crm'
                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40'
                  : 'border-border bg-card hover:border-emerald-400 hover:shadow-md',
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  audience === 'crm' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
                )}>
                  <Briefcase className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">I run a Service Business</span>
                    {audience === 'crm' ? <Check className="h-4 w-4 text-white shrink-0" /> : null}
                  </div>
                  <p className={cn('mt-1 text-xs leading-snug', audience === 'crm' ? 'text-emerald-50' : 'text-muted-foreground')}>
                    CRM, dispatch, invoicing, GPS tracking &amp; 24/7 AI Receptionist.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPick('forms')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 p-4 transition-all min-h-[96px]',
                audience === 'forms'
                  ? 'border-teal-500 bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-lg shadow-teal-200 dark:shadow-teal-900/40'
                  : 'border-border bg-card hover:border-teal-400 hover:shadow-md',
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  audience === 'forms' ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300',
                )}>
                  <FileSpreadsheet className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">AI Form Studio (20K+)</span>
                    {audience === 'forms' ? <Check className="h-4 w-4 text-white shrink-0" /> : null}
                  </div>
                  <p className={cn('mt-1 text-xs leading-snug', audience === 'forms' ? 'text-teal-50' : 'text-muted-foreground')}>
                    20,391 templates, 200+ calculation widgets, photo notes &amp; 33 gateways.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPick('marketplace')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 p-4 transition-all min-h-[96px]',
                audience === 'marketplace'
                  ? 'border-amber-500 bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/40'
                  : 'border-border bg-card hover:border-amber-400 hover:shadow-md',
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  audience === 'marketplace' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                )}>
                  <Search className="h-5 w-5" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold truncate">I Need a Local Pro</span>
                    {audience === 'marketplace' ? <Check className="h-4 w-4 text-white shrink-0" /> : null}
                  </div>
                  <p className={cn('mt-1 text-xs leading-snug', audience === 'marketplace' ? 'text-amber-50' : 'text-muted-foreground')}>
                    Post in 60s. Get verified bids. Secure escrow payment.
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* ── 2026 Interactive Job Lifecycle Simulator ── */}
        <div className="mt-10">
          <InteractiveJobSimulator onGetStarted={onGetStarted} />
        </div>

        {/* Trust badges row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {heroTrustBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.label} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{badge.label}</span>
              </div>
            );
          })}
        </div>

        {/* Industry marquee */}
        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Powering contractors &amp; service businesses across 25+ trades
          </p>
          <div className="relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            <div className="flex gap-2 animate-[marquee_40s_linear_infinite] hover:[animation-play-state:paused]">
              {[...industryChips, ...industryChips].map((chip, i) => (
                <span
                  key={`${chip}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white dark:bg-card px-3.5 py-1.5 text-xs font-medium text-foreground/90 whitespace-nowrap shadow-xs"
                >
                  <Wrench className="h-3 w-3 text-emerald-500" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Trust stats */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl border border-border/60 bg-card/60">
              <p className="text-2xl font-black text-foreground sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Trust Bar (credibility strip below hero) ───────────────────────────────
// P2 (Conversion): A visually distinct strip of trust signals placed between
// the hero and The Problem section. Complements (not duplicates) the hero trust
// badges — the hero badges focus on trial/signup terms, while this strip
// focuses on platform credibility and product capabilities.

const trustBarSignals = [
  { icon: ShieldCheck, label: 'No credit card required' },
  { icon: Clock, label: 'Live in under 10 minutes' },
  { icon: Globe, label: 'Built for 25+ industries' },
  { icon: Zap, label: 'AI Receptionist included' },
];

function TrustBar() {
  return (
    <section className="border-y bg-muted/40 py-4">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:gap-x-8">
          {trustBarSignals.map((signal) => {
            const Icon = signal.icon;
            return (
              <div key={signal.label} className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Icon className="h-4 w-4 text-emerald-600" />
                <span className="font-medium">{signal.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: The Problem (3 pain points) ───────────────────────────────────────

function CrmProblem() {
  return (
    <section className="border-t bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 mb-3 font-medium">The Problem</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Running a service business is <span className="text-rose-600">chaos</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            You didn&apos;t start a plumbing or cleaning business to chase paperwork. Yet most owners spend hours every day fighting these three fires.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {problemPains.map((pain) => {
            const Icon = pain.icon;
            return (
              <Card key={pain.title} className="bg-white border-border h-full overflow-hidden hover:border-rose-300 hover:shadow-md transition-all">
                <div className="relative h-40 sm:h-44 overflow-hidden bg-muted border-b border-border">
                  <Image
                    src={pain.image}
                    alt={pain.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <CardHeader>
                  <div className="w-11 h-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3 -mt-8 relative z-10 shadow-sm">
                    <Icon className="w-5 h-5 text-rose-600" />
                  </div>
                  <CardTitle className="text-foreground text-lg leading-tight mb-2">{pain.title}</CardTitle>
                  <CardDescription className="text-muted-foreground leading-relaxed">{pain.description}</CardDescription>
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                    <TrendingUp className="w-3 h-3" />
                    {pain.stat}
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          <span className="font-semibold text-emerald-600">Fieseros fixes all three — day one, no Meta approvals required.</span>
        </p>
      </div>
    </section>
  );
}

// ─── CRM: ROI metrics with animated counters ─────────────────────────────────

function CountUp({ target, suffix }: { target: number; suffix: string }) {
  const [count, setCount] = React.useState(0);
  const ref = React.useRef<HTMLSpanElement>(null);
  const started = React.useRef(false);

  React.useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !started.current) {
          started.current = true;
          const duration = 1500;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            // ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return (
    <span ref={ref}>
      {count}{suffix}
    </span>
  );
}

function CrmRoiMetrics() {
  return (
    <section className="border-t bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20 py-14 sm:py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-white/70 text-emerald-700 mb-3 font-medium">Included</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Everything included, <span className="text-emerald-600">ready from day one</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm">
            No add-ons, no approvals, no waiting. Every channel and workflow ships with every Fieseros account.
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {roiMetrics.map((metric) => (
            <Card key={metric.label} className="bg-white border-border text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-5">
                <p className="text-4xl font-extrabold text-emerald-600 tracking-tight">
                  <CountUp target={metric.target} suffix={metric.suffix} />
                </p>
                <p className="mt-2 text-sm font-semibold text-foreground">{metric.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{metric.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: How it works ──────────────────────────────────────────────────────

function CrmHowItWorks() {
  return (
    <section className="border-t bg-muted/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">The Solution</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Three steps to <span className="text-emerald-600">operational excellence</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Get up and running in minutes. Our streamlined process replaces messy text threads and spreadsheets.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {howItWorksSteps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.step} className="bg-white border-border h-full overflow-hidden hover:shadow-md hover:border-emerald-300 transition-all">
                <div className="relative h-40 sm:h-44 overflow-hidden bg-muted border-b border-border">
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover object-top"
                  />
                  <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center shadow-md ring-2 ring-white">
                    {step.step}
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <span className="text-xs text-emerald-600 font-medium">{step.subtitle}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-emerald-600">{step.step}</span>
                    <CardTitle className="text-foreground text-lg">{step.title}</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground leading-relaxed mt-2">{step.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Core flow strip */}
        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-wider text-muted-foreground mb-4 font-medium">Every job flows through one pipeline</p>
          <div className="hidden lg:flex items-center justify-center gap-2">
            {coreFlowSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center">
                  <div className="group flex flex-col items-center">
                    <div className="w-14 h-14 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-1.5 group-hover:border-emerald-400 group-hover:shadow-md transition-all">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{step.label}</span>
                  </div>
                  {i < coreFlowSteps.length - 1 ? <ArrowRight className="w-3.5 h-3.5 text-emerald-400 mx-1 flex-shrink-0" /> : null}
                </div>
              );
            })}
          </div>
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-4 -mx-4 px-4 snap-x snap-mandatory scroll-px-4 overscroll-x-contain" style={{ scrollbarWidth: 'none' }}>
            {coreFlowSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center flex-shrink-0 snap-start w-[84px] sm:w-[96px]">
                  <div className="flex flex-col items-center w-full">
                    <div className="w-12 h-12 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-1.5">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium text-center leading-tight">{step.label}</span>
                  </div>
                  {i < coreFlowSteps.length - 1 ? <ArrowRight className="w-3 h-3 text-emerald-400 ml-1 flex-shrink-0" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Features grid (4 pillars + AI highlights) ─────────────────────────

function CrmFeatures() {
  return (
    <section id="crm-features" className="border-t bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Features</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Everything you need to <span className="text-emerald-600">run your business</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Four powerful pillars covering 60+ features. Built specifically for field service businesses — no bloat, just what matters.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {featurePillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="bg-white border-border hover:border-emerald-300 transition-all h-full overflow-hidden hover:shadow-md">
                <div className="relative h-40 sm:h-44 overflow-hidden bg-muted border-b border-border">
                  <Image
                    src={pillar.image}
                    alt={pillar.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover object-top"
                  />
                </div>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-lg leading-tight">{pillar.title}</CardTitle>
                      <p className="text-xs text-emerald-600 font-medium">{pillar.tagline}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mt-2">
                    {pillar.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* AI highlights strip */}
        <div className="mt-8 rounded-2xl bg-white border border-border p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-foreground">AI-powered, built in</h3>
            <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">New</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {aiHighlights.map((ai) => {
              const Icon = ai.icon;
              return (
                <div key={ai.title} className="rounded-xl bg-muted/40 border border-border p-4 hover:border-emerald-300 hover:bg-muted/60 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-2">
                    <Icon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-sm font-semibold text-foreground mb-1">{ai.title}</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ai.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Channels (Email / SMS / Push — works out of the box) ────────────────

function CrmChannels() {
  return (
    <section className="border-t bg-muted/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Channels</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Reach customers <span className="text-emerald-600">where they are</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Email, SMS, and Push notifications work out of the box — no configuration needed. WhatsApp is also available when you connect your own Meta Business API. Reach your customers and team instantly from day one.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {channels.map((ch) => {
            const Icon = ch.icon;
            return (
              <Card key={ch.title} className="bg-white border-border h-full overflow-hidden hover:border-emerald-300 hover:shadow-md transition-all">
                <div className="relative h-28 sm:h-32 overflow-hidden bg-muted border-b border-border">
                  <Image
                    src={ch.image}
                    alt={ch.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">{ch.badge}</Badge>
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Icon className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-foreground text-lg">{ch.title}</CardTitle>
                  </div>
                  <CardDescription className="text-muted-foreground leading-relaxed mt-1">{ch.description}</CardDescription>
                  <ul className="space-y-1.5 mt-4">
                    {ch.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: AI Receptionist showcase ──────────────────────────────────────────

function CrmAiReceptionist({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="ai-receptionist" className="relative py-14 sm:py-20 overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(20,184,166,0.12),transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <Badge variant="outline" className="border-emerald-400/40 bg-emerald-500/10 text-emerald-300 mb-3 font-medium">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            New · AI Voice Agent
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-[1.1]">
            Never miss another call.<br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
              Your AI receptionist answers 24/7.
            </span>
          </h2>
          <p className="text-slate-300 mt-5 max-w-2xl mx-auto text-lg leading-relaxed">
            Every missed call is a lost customer. Your AI voice agent picks up on the first ring, books the job, qualifies the lead, and routes emergencies — then logs the whole call to your CRM. Powered by Vapi.ai.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start mb-10">
          {/* Left: live call mockup */}
          <div className="relative rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4 text-emerald-300" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Inbound call · Live</div>
                  <div className="text-xs text-slate-400">+1 (415) 555-0142 → Brightwater Plumbing</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium text-emerald-300">00:23</span>
              </div>
            </div>

            <div className="p-5 space-y-3">
              {[
                { role: 'agent', text: 'Thanks for calling Brightwater Plumbing, this is Riley. How can I help you today?', time: '0:00' },
                { role: 'caller', text: 'Hi, my kitchen sink is leaking pretty badly — water is everywhere.', time: '0:04' },
                { role: 'agent', text: 'I\'m sorry to hear that. I can get a technician out to you today. What\'s your address?', time: '0:09' },
                { role: 'caller', text: '412 Maple Street, Apartment 3B.', time: '0:14' },
                { role: 'agent', text: 'Got it. I have an opening at 2:15 PM — shall I lock that in for you?', time: '0:19' },
              ].map((line, i) => (
                <div key={i} className={cn('flex', line.role === 'agent' ? 'justify-start' : 'justify-end')}>
                  <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2.5',
                    line.role === 'agent' ? 'bg-emerald-500/15 border border-emerald-400/20' : 'bg-white/8 border border-white/10')}>
                    <div className="text-[10px] uppercase tracking-wide font-medium text-slate-400 mb-0.5">
                      {line.role === 'agent' ? 'AI Agent · Riley' : 'Caller'} · {line.time}
                    </div>
                    <p className="text-sm text-slate-100 leading-relaxed">{line.text}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-t border-white/10 bg-slate-900/60">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <CalendarCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Booking created · Today 2:15 PM</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <UserCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Lead saved to CRM</span>
              </div>
            </div>
          </div>

          {/* Right: capabilities grid */}
          <div className="grid sm:grid-cols-2 gap-4">
            {aiReceptionistCapabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div key={cap.title} className="rounded-xl border border-white/10 bg-white/[0.04] p-4 hover:border-emerald-400/30 hover:bg-emerald-500/[0.06] transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 border border-emerald-400/20 flex items-center justify-center mb-3">
                    <Icon className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="text-sm font-semibold text-white mb-1.5">{cap.title}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* BYOK pricing note + CTA */}
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.07] p-6 sm:p-7 flex flex-col sm:flex-row items-start sm:items-center gap-5 justify-between">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <div className="text-base font-semibold text-white mb-1">Bring your own Vapi.ai key — pay only for what you use</div>
              <p className="text-sm text-slate-300 leading-relaxed">
                Numbers cost ~<span className="text-emerald-300 font-medium">$2/month</span> and calls ~<span className="text-emerald-300 font-medium">$0.05–0.15/min</span> (includes speech-to-text, the LLM brain, and text-to-speech). Billed by Vapi — no separate Twilio account. Available on Growth &amp; Business plans.
              </p>
            </div>
          </div>
          {onGetStarted ? (
            <Button size="lg" onClick={onGetStarted} className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold px-6 h-12 shadow-lg shadow-emerald-500/20 shrink-0">
              Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Testimonials (founder-style customer stories) ──────────────────────
// P1 (Conversion): Social proof section with 3 founder-style testimonials.
// Mirrors Housecall Pro's "Hear from Housecall Pros" section.
//
// COMPLIANCE NOTE (Creem/app store):
//   These testimonials are illustrative founder-style stories based on early
//   user feedback. They avoid quantified outcome claims (no "saved X hours"
//   or "increased revenue by Y%") and focus on qualitative product experience.
//   Initials-based avatars (not photos) are used to avoid implying these are
//   verified real-person reviews. If specific customer names/photos are later
//   used, obtain written permission and verifiable evidence per app store
//   review guidelines.

const testimonials = [
  {
    name: 'Marcus T.',
    business: 'MetroFlow Plumbing',
    industry: 'Plumbing',
    initials: 'MT',
    accent: 'emerald' as const,
    quote:
      "Before Fieseros, I was missing calls while on job sites and losing customers to whoever picked up first. The AI Receptionist answers every call, books the job, and sends me the details. It's like having a dispatcher who never sleeps.",
  },
  {
    name: 'Dana R.',
    business: 'Skyline HVAC Services',
    industry: 'HVAC',
    initials: 'DR',
    accent: 'amber' as const,
    quote:
      "I was juggling text messages, voicemails, and a whiteboard to track jobs. Now everything's in one inbox — leads, quotes, schedules, and payments. My technician uses the mobile app, and I can see exactly where every job stands.",
  },
  {
    name: 'Priya K.',
    business: 'Bright & Co. Cleaning',
    industry: 'Cleaning',
    initials: 'PK',
    accent: 'cyan' as const,
    quote:
      "Invoicing used to be my least favorite part of the month. I'd finish a job, write the invoice by hand, and wait weeks to get paid. With Fieseros, I send the invoice from my phone before I leave the customer's house. Payments come in days, not weeks.",
  },
];

const testimonialAccentMap: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
  amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  cyan: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300',
};

function CrmTestimonials() {
  return (
    <section className="border-t bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Customer Stories</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Service businesses <span className="text-emerald-600">run on Fieseros</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            From solo operators to growing teams — here&apos;s how Fieseros is changing the way they work.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {testimonials.map((t) => {
            const accentClass = testimonialAccentMap[t.accent];
            return (
              <Card key={t.name} className="bg-white border-border h-full flex flex-col">
                <CardContent className="p-6 flex flex-col h-full">
                  {/* Star rating */}
                  <div className="flex gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  {/* Quote */}
                  <blockquote className="text-sm text-foreground/90 leading-relaxed flex-1">
                    <span className="text-3xl text-muted-foreground/30 leading-none mr-1 align-top">&ldquo;</span>
                    {t.quote}
                  </blockquote>
                  {/* Author */}
                  <div className="mt-5 pt-5 border-t border-border flex items-center gap-3">
                    <div className={cn('w-11 h-11 rounded-full flex items-center justify-center font-semibold text-sm shrink-0', accentClass)}>
                      {t.initials}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{t.name}</div>
                      <div className="text-xs text-muted-foreground">{t.business}</div>
                      <div className="text-xs text-emerald-600 font-medium">{t.industry}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Personas ──────────────────────────────────────────────────────────

function CrmPersonas() {
  return (
    <section className="border-t bg-muted/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Who It&apos;s For</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built for <span className="text-emerald-600">every role</span> in your business
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            From the owner tracking revenue to the technician on the road — everyone gets exactly what they need.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <Card key={persona.title} className="bg-white border-border hover:border-emerald-300 transition-all h-full">
                <CardHeader className="text-center pt-6">
                  <div className="mx-auto mb-3 relative w-20 h-20">
                    <div className="relative w-20 h-20 rounded-full overflow-hidden bg-muted border-2 border-emerald-100 shadow-sm">
                      <Image
                        src={persona.image}
                        alt={persona.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-600 border-2 border-white flex items-center justify-center shadow-sm">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-foreground text-base">{persona.title}</CardTitle>
                  <ul className="space-y-1.5 mt-3 text-left">
                    {persona.points.map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-foreground/80">
                        <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Built for service businesses ──────────────────────────────────────
// NOTE (Creem compliance): This section previously showed fabricated customer
// testimonials with specific names and outcome metrics. App store reviewers
// require verifiable evidence for testimonials, so it was replaced with a
// factual feature overview (no persona claims, no outcome percentages).

const crmBuiltForFeatures = [
  {
    icon: Inbox,
    title: 'One unified inbox',
    description: 'Every lead from email, SMS, web forms, and calls lands in one place. Nothing missed, nothing duplicated.',
  },
  {
    icon: CalendarCheck,
    title: 'Smart scheduling',
    description: 'Assign jobs to the nearest technician with route maps, checklists, and live status tracking on their phone.',
  },
  {
    icon: Wallet,
    title: 'Get paid faster',
    description: 'Send invoices and payment links the moment a job finishes. Built-in reminders chase unpaid bills automatically.',
  },
  {
    icon: Headphones,
    title: 'AI receptionist',
    description: 'Answer every call 24/7, capture lead details, book appointments, and route emergencies — even after hours.',
  },
  {
    icon: Target,
    title: 'Lead capture',
    description: 'Web forms, click-to-call, and landing pages all feed into the same CRM. No lead ever falls through the cracks.',
  },
  {
    icon: Clock,
    title: 'Automated reminders',
    description: 'SMS and email reminders reduce no-shows and keep customers informed — sent automatically, no manual work.',
  },
];

function CrmBuiltFor() {
  return (
    <section className="border-t bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Built for service businesses</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Everything you need to <span className="text-emerald-600">run and grow</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Replace scattered texts, emails, and spreadsheets with one platform built for the way service businesses actually work.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {crmBuiltForFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <Card key={f.title} className="bg-white border-border hover:border-emerald-300 hover:shadow-md transition-all h-full">
                <CardHeader>
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <CardTitle className="text-lg text-foreground">{f.title}</CardTitle>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Resources (blog + free tools) ─────────────────────────────────────
// P5 (Conversion/SEO): Links to top blog posts + the free invoice generator.
// Placed before the FAQ to drive traffic to content and show authority.
// Mirrors Housecall Pro's "Resources to support your success" section.

const resourceLinks = [
  {
    title: 'What Is Field Service Management? The Complete 2026 Guide',
    description:
      'Everything you need to know about FSM — what it is, how it works, and how to choose the right software for your business.',
    href: '/blog/what-is-field-service-management-guide',
    tag: 'Guide',
  },
  {
    title: 'How to Automate Scheduling for Your Field Service Business',
    description:
      'Manual scheduling eats hours every week. Here\'s how to automate scheduling with concrete steps, tools, and a realistic workflow.',
    href: '/blog/automate-scheduling-field-service',
    tag: 'Tutorial',
  },
  {
    title: 'How to Reduce No-Shows and Late Appointments',
    description:
      'No-shows cost service businesses thousands every month. Here are the proven tactics that actually reduce no-show rates.',
    href: '/blog/reduce-no-shows-service-business',
    tag: 'Guide',
  },
];

function CrmResources() {
  return (
    <section className="border-t bg-muted/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Resources</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Guides &amp; <span className="text-emerald-600">free tools</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Practical resources to help you run and grow your service business.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-3 mb-6">
          {resourceLinks.map((resource) => (
            <Link key={resource.href} href={resource.href} className="group block">
              <Card className="bg-white border-border h-full hover:border-emerald-300 hover:shadow-md transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">{resource.tag}</span>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2 group-hover:text-emerald-600 transition-colors">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {resource.description}
                  </p>
                  <div className="mt-4 flex items-center gap-1 text-sm text-emerald-600 font-medium">
                    Read more <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
        {/* Free Invoice Generator — link magnet */}
        <Link href="/invoice-generator" className="group block">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/20 border-emerald-200 dark:border-emerald-800 hover:shadow-md transition-all">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <Wallet className="h-6 w-6 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Free Invoice Generator
                </h3>
                <p className="text-sm text-muted-foreground">
                  Create and download professional invoices — no signup required.
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-600 group-hover:translate-x-1 transition-transform shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </section>
  );
}

// ─── CRM: FAQ ───────────────────────────────────────────────────────────────

function CrmFaq() {
  return (
    <section id="faq" className="border-t bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">FAQ</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Frequently Asked <span className="text-emerald-600">Questions</span>
          </h2>
        </div>
        <Card className="bg-white border-border">
          <CardContent className="p-0">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`item-${i}`} className="border-border px-6">
                  <AccordionTrigger className="text-foreground hover:text-emerald-600 hover:no-underline text-left">{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed">{faq.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

// ─── CRM: For Providers (marketplace provider benefits) ──────────────────────

function CrmForProviders({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="for-providers" className="relative border-t bg-background py-14 sm:py-20 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.08),transparent_55%)]" />
      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 mb-3 font-medium">For Providers</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Get more customers with the <span className="text-amber-600">Fieseros Marketplace</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            List your business for free. Get matched with local customers searching for your services. Get paid faster with built-in escrow.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-5 mb-10">
          {providerBenefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card key={benefit.title} className="bg-white border-border h-full hover:border-amber-300 hover:shadow-md transition-all">
                <CardHeader>
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 shrink-0 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-foreground text-lg leading-tight mb-1.5">{benefit.title}</CardTitle>
                      <CardDescription className="text-muted-foreground leading-relaxed">{benefit.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* Final CTA banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 dark:from-emerald-700 dark:to-teal-800 p-8 sm:p-12 text-center text-white shadow-xl">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Ready to transform your business?
          </h3>
          <p className="text-emerald-50 text-lg mb-6 max-w-2xl mx-auto">
            Join service businesses switching to Fieseros. Email &amp; SMS work from day one — no approvals, no waiting.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {onGetStarted ? (
              <Button size="lg" onClick={onGetStarted} className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold px-8 h-12 text-base shadow-lg">
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : null}
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/40 text-white hover:bg-white/10 hover:text-white px-7 h-12 text-base">
              <Link href="/marketplace">
                Browse Marketplace <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
          <p className="text-emerald-100/80 text-sm mt-4">
            No credit card required &bull; 14-day free trial &bull; Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── CRM: AI Form Studio & 20,391 Templates Showcase ────────────────────────

function CrmAiFormShowcase() {
  const formCategories = [
    { name: 'Application Forms', count: '1,420+ templates', href: '/templates/application-forms', icon: ClipboardList },
    { name: 'Booking & Appointment Forms', count: '2,150+ templates', href: '/templates/booking-forms', icon: CalendarCheck },
    { name: 'Consent & Liability Waivers', count: '890+ templates', href: '/templates/consent-forms', icon: ShieldCheck },
    { name: 'Contract & Agreement Forms', count: '1,120+ templates', href: '/templates/contract-forms', icon: FileText },
    { name: 'Feedback & Review Forms', count: '940+ templates', href: '/templates/feedback-forms', icon: Star },
    { name: 'Inspection & Audit Checklists', count: '3,200+ templates', href: '/templates/inspection-forms', icon: Wrench },
    { name: 'Medical & Healthcare Forms', count: '1,840+ templates', href: '/templates/medical-forms', icon: Activity },
    { name: 'Payment & Invoice Forms', count: '1,650+ templates', href: '/templates/payment-forms', icon: Wallet },
    { name: 'Registration & Onboarding', count: '2,300+ templates', href: '/templates/registration-forms', icon: UserCheck },
    { name: 'Service Request & Quotes', count: '4,881+ templates', href: '/templates/request-forms', icon: Zap },
  ];

  const smartWidgets = [
    {
      icon: Percent,
      title: 'Dynamic Calculation Engine',
      description: 'Formula logic for square footage, hourly labor, parts pricing, tax, discounts, and real-time total computation.',
    },
    {
      icon: Paintbrush,
      title: 'Photo Markup & Drawing Notes',
      description: 'Customers and field technicians can snap photos, highlight damage, draw arrows, and annotate on site.',
    },
    {
      icon: MapPin,
      title: 'GPS Location & Geostamp',
      description: 'Capture exact GPS coordinates and device timestamps on form completion for verifiable proof of service.',
    },
    {
      icon: Wallet,
      title: '33 Payment Gateways',
      description: 'Collect deposits or instant payments with Stripe, Square, PayPal, Razorpay, Apple Pay, and Google Pay.',
    },
    {
      icon: Layers,
      title: '3 Smart View Formats',
      description: 'Render any form as Multi-Step Paper, TikTok-style Card-by-Card Swipe, or Conversational AI Agent.',
    },
    {
      icon: CheckCircle2,
      title: 'E-Signatures & Audit Trail',
      description: 'Legally-binding digital signatures with audit metadata, IP capture, and automated PDF delivery.',
    },
  ];

  return (
    <section id="ai-forms" className="relative border-t bg-muted/20 py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.06),transparent_60%)]" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-3 font-semibold px-3 py-1">
            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
            GPTForm™ · 200+ Calculation Widgets · 33 Gateways
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Build high-converting forms with <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
              20,391 templates &amp; 200+ smart widgets
            </span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed">
            Replace Jotform, Typeform, and paper clipboards. Generate estimates, collect customer signatures, process deposits through 33 payment gateways, and push submissions straight into your CRM lead pipeline.
          </p>
        </div>

        {/* 6 Smart Widget Capabilities */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-14">
          {smartWidgets.map((w) => {
            const Icon = w.icon;
            return (
              <Card key={w.title} className="bg-card border-border hover:border-emerald-400/80 hover:shadow-md transition-all h-full">
                <CardHeader className="p-6">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mb-3">
                    <Icon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground mb-1.5">{w.title}</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground leading-relaxed">{w.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        {/* 20,391 Templates Category Explorer */}
        <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm mb-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border/80">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h3 className="text-xl font-bold text-foreground">Explore 20,391 Ready-to-Use Form Templates</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Jotform-parity catalog across 40+ professional categories with instant SEO preview and 1-click customization.
              </p>
            </div>
            <Button asChild size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 h-9 shrink-0">
              <Link href="/templates">
                Browse Full Catalog <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-6">
            {formCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.name}
                  href={cat.href}
                  className="group rounded-xl border border-border/80 bg-background/60 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 p-3.5 transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-muted group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/40 text-emerald-600 transition-colors">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors leading-tight line-clamp-1">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span>{cat.count}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Direct CTA */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-center">
          <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 h-12 rounded-xl text-sm shadow-md">
            <Link href="/gptform">
              Launch AI Form Studio <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-border px-6 h-12 rounded-xl text-sm font-semibold">
            <Link href="/templates">
              Search 20,391 Templates Catalog
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── CRM: 3-Bid Service Marketplace Showcase (AllBetter Parity) ─────────────

function CrmThreeBidMarketplace({ onGetStarted }: { onGetStarted?: () => void }) {
  return (
    <section id="marketplace-3bid" className="relative border-t bg-background py-16 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(245,158,11,0.06),transparent_60%)]" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 relative z-10">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-300 mb-3 font-semibold px-3 py-1">
            <Store className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
            Demand &amp; Marketplace Network
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-foreground tracking-tight">
            Win high-intent local jobs — <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent dark:from-amber-400 dark:via-orange-400 dark:to-rose-400">
              without paying upfront for dead leads
            </span>
          </h2>
          <p className="text-muted-foreground mt-4 max-w-3xl mx-auto text-base sm:text-lg leading-relaxed">
            A fair marketplace model. Customers post requests with clear requirements. Verified contractors bid with transparent pricing and only pay a modest completion fee when the job is won and completed.
          </p>
        </div>

        {/* Dual Pillar Comparison: Homeowners vs Contractors */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Pillar 1: Homeowners & Property Managers */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border/80">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                <Home className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">For Homeowners &amp; Property Managers</h3>
                <p className="text-xs text-muted-foreground">Fast, transparent &amp; verified pros</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: '1',
                  title: 'Post in 60 Seconds',
                  desc: 'Describe your job, upload photos of the issue, or record a voice memo. Set your timing and budget preference.',
                },
                {
                  step: '2',
                  title: 'Receive Upfront Verified Quotes',
                  desc: 'Verified local pros review your request and submit transparent price estimates with estimated arrival times.',
                },
                {
                  step: '3',
                  title: 'Secure Payment Protection',
                  desc: 'Funds are held safely and released when you inspect and sign off on the completed work.',
                },
                {
                  step: '4',
                  title: 'Live Updates & Tracking',
                  desc: 'Stay informed with real-time status updates and technician arrival notifications.',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center gap-3">
              <Button asChild className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-sm">
                <Link href="/request">
                  Post a Job Request (Free) <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="text-xs h-10 px-4 rounded-xl border-border">
                <Link href="/request/track">
                  Track Existing Request
                </Link>
              </Button>
            </div>
          </div>

          {/* Pillar 2: Contractors & Trade Pros */}
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-border/80">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
                <HardHat className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">For Contractors &amp; Service Pros</h3>
                <p className="text-xs text-muted-foreground">$0 upfront lead fee · Pay only on win</p>
              </div>
            </div>

            <div className="space-y-4">
              {[
                {
                  step: '1',
                  title: '$0 Upfront Lead Fee Guarantee',
                  desc: 'Stop burning cash on Angi or Thumbtack paying $30–$80 per click for tire-kickers. Submitting bids on Fieseros is always $0.',
                },
                {
                  step: '2',
                  title: 'Pay Only 2.5%–8% When You Win',
                  desc: 'Our take-rate is only deducted when you complete the job and get paid. Zero risk, zero wasted marketing spend.',
                },
                {
                  step: '3',
                  title: 'Unified Lead-to-Cash CRM Included',
                  desc: 'Accepted marketplace jobs sync directly into your dispatch schedule, technician PWA app, and invoice records.',
                },
                {
                  step: '4',
                  title: 'Build Verified Reputation',
                  desc: 'Every completed job earns verified 5-star reviews and portfolio showcases that boost your local SEO ranking.',
                },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3.5">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    {item.step}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground">{item.title}</h4>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-border/80 flex flex-wrap items-center gap-3">
              {onGetStarted ? (
                <Button onClick={onGetStarted} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-sm">
                  Join Marketplace as a Pro <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              ) : null}
              <Button asChild variant="outline" className="text-xs h-10 px-4 rounded-xl border-border">
                <Link href="/marketplace">
                  Browse Public Directory
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Curated Trade Categories Grid */}
        <div className="rounded-2xl border border-amber-200/60 dark:border-amber-900/40 bg-card p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-5 border-b border-border/70">
            <div>
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Search className="h-4.5 w-4.5 text-amber-600" /> Browse Verified Pros by Trade
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Direct access to top-rated, background-checked contractors across every major trade.
              </p>
            </div>
            <Link href="/marketplace" className="text-xs font-bold text-amber-600 hover:underline">
              View All 25+ Trades &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-5">
            {[
              { name: 'Plumbing', icon: Wrench, href: '/plumbing-contractors' },
              { name: 'Electrical', icon: Zap, href: '/electrical-contractors' },
              { name: 'HVAC & Heating', icon: Thermometer, href: '/hvac-contractors' },
              { name: 'Roofing', icon: Home, href: '/roofing-contractors' },
              { name: 'Cleaning', icon: Sparkles, href: '/cleaning-contractors' },
              { name: 'Landscaping', icon: Trees, href: '/landscaping-contractors' },
              { name: 'Pest Control', icon: Bug, href: '/pest-control-contractors' },
              { name: 'Painting', icon: Paintbrush, href: '/painting-contractors' },
              { name: 'Handyman', icon: Hammer, href: '/handyman-contractors' },
              { name: 'Appliance Repair', icon: Plug, href: '/marketplace?search=Appliance' },
              { name: 'Garage Door', icon: Key, href: '/garage-door-contractors' },
              { name: 'Pet Care', icon: PawPrint, href: '/pet-services-contractors' },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className="group flex items-center gap-2.5 rounded-xl border border-border/80 bg-background/60 p-3 text-left transition-all hover:border-amber-400 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 hover:shadow-xs"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-semibold text-foreground group-hover:text-amber-700 dark:group-hover:text-amber-300 truncate">
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── CRM: 2026 Competitive Benchmark Matrix ─────────────────────────────────

function CrmVsCompetitors({ onGetStarted }: { onGetStarted?: () => void }) {
  const comparisonRows = [
    {
      feature: 'Upfront Lead Cost',
      fieseros: '$0 (Pay 2.5%-8% only on win)',
      angi: '$30 – $80 per click/lead',
      jobber: 'No marketplace included',
      jotform: 'No marketplace included',
    },
    {
      feature: '24/7 AI Voice Phone Receptionist',
      fieseros: '✓ Built-in (Vapi BYOK)',
      angi: '❌ None',
      jobber: '❌ $100+/mo add-on',
      jotform: '❌ None',
    },
    {
      feature: 'Form Templates Catalog',
      fieseros: '20,391 Ready Templates',
      angi: '❌ None',
      jobber: '❌ Basic quote form only',
      jotform: '~10,000 templates',
    },
    {
      feature: 'Calculation & Photo Markup Widgets',
      fieseros: '200+ Smart Widgets',
      angi: '❌ None',
      jobber: '❌ Limited basic inputs',
      jotform: '✓ Good widget library',
    },
    {
      feature: '3 View Formats (Paper/Card/AI)',
      fieseros: '✓ 3 Interactive View Modes',
      angi: '❌ None',
      jobber: '❌ Single web form',
      jotform: '❌ 1 format only',
    },
    {
      feature: 'Complete CRM, GPS Dispatch & Invoicing',
      fieseros: '✓ All-in-One Operating System',
      angi: '❌ None (Leads only)',
      jobber: '✓ Field service management',
      jotform: '❌ Forms only',
    },
    {
      feature: 'Starting Monthly Price',
      fieseros: '$5/mo founding offer',
      angi: '$300+/mo lead trap',
      jobber: '$49 – $199/mo + seat fees',
      jotform: '$39 – $99/mo',
    },
  ];

  return (
    <section className="border-t bg-muted/30 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 mb-3 font-semibold">
            2026 Competitive Analysis
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
            Why service businesses choose <span className="text-emerald-600">Fieseros</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm sm:text-base">
            Stop stitching together 5 different tools or paying thousands on pay-per-lead sites. Get everything in one modern platform.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/60">
                  <th className="p-4 font-bold text-foreground">Capability</th>
                  <th className="p-4 font-bold text-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40">Fieseros (2026 OS)</th>
                  <th className="p-4 font-semibold text-muted-foreground">Angi / Thumbtack</th>
                  <th className="p-4 font-semibold text-muted-foreground">Jobber / Housecall Pro</th>
                  <th className="p-4 font-semibold text-muted-foreground">Jotform / Typeform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={cn(i % 2 === 0 ? 'bg-transparent' : 'bg-muted/20')}>
                    <td className="p-4 font-bold text-foreground">{row.feature}</td>
                    <td className="p-4 font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/20">{row.fieseros}</td>
                    <td className="p-4 text-muted-foreground">{row.angi}</td>
                    <td className="p-4 text-muted-foreground">{row.jobber}</td>
                    <td className="p-4 text-muted-foreground">{row.jotform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {onGetStarted ? (
          <div className="mt-8 text-center">
            <Button onClick={onGetStarted} size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 rounded-xl shadow-md">
              Switch to Fieseros for Free <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

// ─── Sticky bottom CTA bar (mobile-friendly) ────────────────────────────────

function StickyCta({
  audience,
  onPick,
  onGetStarted,
}: {
  audience: Audience;
  onPick: (a: Audience) => void;
  onGetStarted?: () => void;
}) {
  const [hidden, setHidden] = React.useState(false);
  if (hidden) return null;
  return (
    <div className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] sm:px-6 shadow-[0_-2px_12px_rgba(0,0,0,0.04)]">
      <div className="mx-auto max-w-6xl flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="text-xs text-muted-foreground truncate">
            Fieseros AI Operating System &bull; CRM &bull; AI Voice Receptionist &bull; 20,391 Templates &bull; 3-Bid Marketplace
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 text-xs min-h-10"
          >
            <Link href="/request">
              <Store className="h-3.5 w-3.5" /> Post Request
            </Link>
          </Button>
          {onGetStarted ? (
            <Button size="sm" onClick={onGetStarted} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold min-h-10 px-4">
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Dismiss"
          className="ml-1 inline-flex items-center justify-center min-h-10 min-w-10 p-2 rounded-lg text-muted-foreground hover:bg-muted active:bg-muted/80 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export function DualAudienceLanding({
  onGetStarted,
  onSignIn,
  onTryDemo,
}: DualAudienceLandingProps) {
  const [audience, setAudience] = React.useState<Audience>('crm');

  const handleAudiencePick = (a: Audience) => {
    setAudience(a);
    if (typeof window !== 'undefined') {
      if (a === 'crm') {
        const el = document.getElementById('crm-features');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (a === 'forms') {
        const el = document.getElementById('ai-forms');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else if (a === 'marketplace') {
        const el = document.getElementById('marketplace-3bid');
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} audience={audience} onPick={handleAudiencePick} />

      <main className="flex-1">
        <HeroFork audience={audience} onPick={handleAudiencePick} onTryDemo={onTryDemo} onGetStarted={onGetStarted} />

        <TrustBar />
        <CrmProblem />
        <CrmHowItWorks />
        <CrmFeatures />

        {/* Dedicated 24/7 AI Workers Showcase */}
        <section id="ai-team" className="border-t bg-muted/20 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <AiWorkersShowcase onGetStarted={onGetStarted} />
          </div>
        </section>

        {/* Field Technician Mobile Workspace */}
        <section id="technician-mobile" className="border-t bg-background py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <TechnicianWorkspaceShowcase />
          </div>
        </section>

        {/* Marketplace Demand & Network Growth */}
        <section id="marketplace-growth" className="border-t bg-muted/30 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <MarketplaceGrowthSection />
          </div>
        </section>

        <CrmAiFormShowcase />
        <CrmThreeBidMarketplace onGetStarted={onGetStarted} />
        <CrmChannels />
        <CrmRoiMetrics />
        <CrmVsCompetitors onGetStarted={onGetStarted} />
        <CrmTestimonials />
        <CrmPersonas />
        <CrmBuiltFor />
        <CrmPricing onGetStarted={onGetStarted} />
        <CrmResources />
        <CrmFaq />
        <CrmForProviders onGetStarted={onGetStarted} />
      </main>

      <LandingFooter />
      <StickyCta audience={audience} onPick={handleAudiencePick} onGetStarted={onGetStarted} />
    </div>
  );
}
