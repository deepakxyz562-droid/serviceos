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
  type LucideIcon,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
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
  mpUrl,
  type ProviderListItem,
  type ProviderListResponse,
} from '@/components/marketplace/types';
import { ProviderCard } from '@/components/marketplace/provider-card';
import { solutionsLinks, SolutionsMegaMenu, LandingFooter } from '@/components/landing/landing-solutions';

// ─── Props ──────────────────────────────────────────────────────────────────

interface DualAudienceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

type Audience = 'crm' | 'marketplace';

// ─── Pricing — uses seed plan prices from src/lib/billing-seed.ts ────────────
//   Starter $5/mo (or $5 first-year promo) · Growth $29 · Business $79 · Enterprise Custom

interface PricingPlan {
  name: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  description: string;
  icon: LucideIcon;
  features: string[];
  popular?: boolean;
  cta: string;
  highlight?: boolean;
}

const pricingPlans: PricingPlan[] = [
  {
    name: 'Starter',
    monthlyPrice: 5,
    yearlyPrice: 50,
    description: 'For solo pros & new businesses',
    icon: Zap,
    features: [
      '1 user · 100 jobs/month',
      'CRM, leads, jobs, scheduling',
      'Email + SMS notifications',
      'Invoicing & estimates',
      'Customer portal',
      'Marketplace browse-only',
    ],
    highlight: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Growth',
    monthlyPrice: 29,
    yearlyPrice: 290,
    description: 'For growing teams',
    icon: Building2,
    features: [
      '5 users · unlimited jobs',
      'Everything in Starter',
      'AI Assistant + AI Receptionist (BYOK)',
      'WhatsApp integration',
      'Smart dispatch & routing',
      'Lead pipeline + segments',
      'Marketplace bookings',
    ],
    popular: true,
    cta: 'Start Free Trial',
  },
  {
    name: 'Business',
    monthlyPrice: 79,
    yearlyPrice: 790,
    description: 'For multi-branch operators',
    icon: Shield,
    features: [
      'Unlimited users · jobs',
      'Everything in Growth',
      'AI Dispatcher + Quote Generator',
      'Marketing automation',
      'Inventory + asset management',
      'Multi-branch + custom workflows',
      'Marketplace priority placement',
    ],
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    yearlyPrice: null,
    description: 'For large organizations',
    icon: Globe,
    features: [
      'Everything in Business',
      'White-label branding',
      'SSO + custom integrations',
      'Dedicated account manager',
      'SLA + onboarding training',
      'API access & webhooks',
    ],
    cta: 'Contact Sales',
  },
];

// ─── CRM marketing data ─────────────────────────────────────────────────────

const stats = [
  { value: '2,500+', label: 'Businesses' },
  { value: '500K+', label: 'Jobs Completed' },
  { value: '4.9/5', label: 'Customer Rating' },
  { value: '99.9%', label: 'Uptime' },
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
  { icon: Wallet, label: 'Get started for $5' },
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

// ROI metrics with animated counters
const roiMetrics = [
  { target: 8, suffix: '+ hrs', label: 'Saved per week', description: 'Less admin, more time on the tools' },
  { target: 2, suffix: '×', label: 'Faster payment collection', description: 'Invoices paid in days, not weeks' },
  { target: 35, suffix: '%', label: 'Fewer no-shows', description: 'SMS reminders actually work' },
  { target: 28, suffix: '%', label: 'More repeat business', description: 'Stay top-of-mind automatically' },
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
  },
  {
    icon: MessageSquareText,
    title: 'SMS',
    description: 'Reach customers instantly with SMS reminders, booking confirmations, and payment links. SMS works from day one — no carrier approvals.',
    badge: 'Works instantly',
    features: ['Booking confirmations', 'Day-of reminders', 'Payment links', 'Two-way chat'],
    image: '/images/landing/channel-sms.png',
  },
  {
    icon: MessageCircle,
    title: 'WhatsApp',
    description: 'Bring your own WhatsApp number (BYOK). Chat with customers, share job photos, send quotes and reminders — all from one unified inbox.',
    badge: 'BYO number',
    features: ['Two-way WhatsApp chat', 'Quote & photo sharing', 'Booking reminders', 'Unified inbox with Email + SMS'],
    image: '/images/landing/channel-whatsapp.png',
  },
];

// "For Providers" section — explains the marketplace provider side
const providerBenefits = [
  {
    icon: Search,
    title: 'Get found by local customers',
    description: 'Your business appears in the ServiceOS Marketplace where customers search for verified local pros. AI-powered matching sends you jobs that fit your skills and service area.',
  },
  {
    icon: Calendar,
    title: 'Fill your calendar automatically',
    description: 'Accept instant bookings, respond to quote requests, or get dispatched to emergencies — all from one inbox. No more cold leads, no more tire-kickers.',
  },
  {
    icon: Wallet,
    title: 'Get paid faster, with escrow',
    description: 'Customer payments are held in escrow and released to your Stripe Connect account the moment the job is marked complete. No more chasing invoices.',
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
      'Route optimization',
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
      'n8n workflow builder',
      'AI Assistant + automations',
      'Custom workflow triggers',
    ],
  },
];

const aiHighlights = [
  { icon: PhoneCall, title: 'AI Receptionist', description: 'Answers every call 24/7, books appointments, qualifies leads, routes urgent calls — never miss a customer again.' },
  { icon: Bot, title: 'AI Assistant', description: 'Drafts replies, summarizes threads, suggests next-best-actions across your inbox.' },
  { icon: Sparkles, title: 'AI Campaign Generator', description: 'Generates email & SMS campaign copy, audience segments, and send-time suggestions.' },
  { icon: TrendingUp, title: 'AI Dispatcher', description: 'Auto-assigns jobs to the nearest available tech with route optimization.' },
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

const testimonials = [
  {
    name: 'Rajesh Kumar',
    business: 'Kumar Plumbing Co.',
    industry: 'Plumbing · Chennai',
    quote: 'Before ServiceOS, I was losing leads in scattered text messages every week. Now every inquiry lands in one inbox and I get paid the same day the job finishes.',
    metric: '+42% revenue in 3 months',
    avatar: '/images/landing/testimonial-1.png',
  },
  {
    name: 'Sarah Mitchell',
    business: 'Sparkle Clean Services',
    industry: 'Cleaning · Manchester',
    quote: 'Every lead from my website and SMS lands in one inbox now — no more missed inquiries. My customers love getting SMS reminders before appointments.',
    metric: '−35% no-show rate',
    avatar: '/images/landing/testimonial-2.png',
  },
  {
    name: 'Daniel Okafor',
    business: 'Okafor HVAC Solutions',
    industry: 'HVAC · Lagos',
    quote: 'Dispatching used to be a whiteboard and phone calls. Now my techs get jobs on their phones with route maps. Invoices go out automatically and payments hit my account in days.',
    metric: '2× faster payments',
    avatar: '/images/landing/testimonial-3.png',
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
    description: 'Assign jobs to the nearest tech with route optimization, live status tracking, and automated customer notifications.',
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
    answer: 'No. ServiceOS works out of the box with Email, SMS, Push, and In-App notifications — no approvals, no waiting. Capture leads, send quotes, dispatch jobs, invoice customers, and collect payments from day one.',
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
    question: 'Can I try ServiceOS before committing?',
    answer: 'Of course. We offer a 14-day free trial with full access to all Growth plan features. No credit card required. You can also explore our Live Demo — a real plumbing business with 2,000 customers, 300 bookings, and 500 invoices.',
  },
];

// NOTE: solutionsLinks, footerLinks, SolutionsMegaMenu, and LandingFooter live
// in @/components/landing/landing-solutions.tsx — extracted to keep this file
// under turbopack's compile-memory ceiling on 4 GB dev machines.

// ─── Top navbar ─────────────────────────────────────────────────────────────

function Navbar({ onGetStarted, onSignIn, audience, onPick }: { onGetStarted?: () => void; onSignIn?: () => void; audience: Audience; onPick: (a: Audience) => void }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

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
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70 pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2" aria-label="ServiceOS home" onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Wrench className="h-4 w-4" />
          </span>
          <span className="text-lg font-bold text-foreground">ServiceOS</span>
        </a>

        <nav className="hidden md:flex items-center gap-6">
          <SolutionsMegaMenu />
          <a href="#crm-features" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium" onClick={(e) => crmAnchorClick('#crm-features', e)}>Features</a>
          <a href="#ai-receptionist" className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 transition-colors font-medium" onClick={(e) => crmAnchorClick('#ai-receptionist', e)}>
            AI Receptionist
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-semibold uppercase tracking-wide">New</span>
          </a>
          <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium" onClick={(e) => crmAnchorClick('#pricing', e)}>Pricing</a>
          <a href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">Marketplace</a>
          <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium" onClick={(e) => crmAnchorClick('#faq', e)}>FAQ</a>
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {onSignIn ? (
            <Button variant="ghost" size="sm" onClick={onSignIn} className="text-muted-foreground hover:text-foreground">Sign In</Button>
          ) : null}
          {onGetStarted ? (
            <Button size="sm" onClick={onGetStarted} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold">
              Get Started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden text-foreground p-2" aria-label="Toggle menu">
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen ? (
        <div className="md:hidden border-t bg-background max-h-[calc(100dvh-3.5rem)] overflow-y-auto">
          <div className="px-4 py-3 space-y-1">
            {/* Solutions — collapsible accordion with all marketing pages */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="solutions" className="border-0">
                <AccordionTrigger className="text-sm text-muted-foreground hover:text-foreground py-2 hover:no-underline">
                  Solutions
                </AccordionTrigger>
                <AccordionContent className="pb-2 space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-1 mb-1">Industries</p>
                    <div className="space-y-0.5">
                      {solutionsLinks.industries.map((link) => (
                        <a key={link.href} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground py-1 px-1 rounded hover:bg-muted/60" onClick={() => setMobileOpen(false)}>{link.label}</a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-1 mb-1">Features</p>
                    <div className="space-y-0.5">
                      {solutionsLinks.features.map((link) => (
                        <a key={link.href} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground py-1 px-1 rounded hover:bg-muted/60" onClick={() => setMobileOpen(false)}>{link.label}</a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-1 mb-1">Compare</p>
                    <div className="space-y-0.5">
                      {solutionsLinks.compare.map((link) => (
                        <a key={link.href} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground py-1 px-1 rounded hover:bg-muted/60" onClick={() => setMobileOpen(false)}>{link.label}</a>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70 px-1 mb-1">Free Tools</p>
                    <div className="space-y-0.5">
                      {solutionsLinks.freeTools.map((link) => (
                        <a key={link.href} href={link.href} className="block text-sm text-muted-foreground hover:text-foreground py-1 px-1 rounded hover:bg-muted/60" onClick={() => setMobileOpen(false)}>{link.label}</a>
                      ))}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <a href="#crm-features" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={(e) => crmAnchorClick('#crm-features', e)}>Features</a>
            <a href="#ai-receptionist" className="block text-sm text-emerald-600 py-1.5" onClick={(e) => crmAnchorClick('#ai-receptionist', e)}>AI Receptionist</a>
            <a href="#pricing" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={(e) => crmAnchorClick('#pricing', e)}>Pricing</a>
            <a href="/marketplace" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={() => setMobileOpen(false)}>Marketplace</a>
            <a href="#faq" className="block text-sm text-muted-foreground hover:text-foreground py-1.5" onClick={(e) => crmAnchorClick('#faq', e)}>FAQ</a>
            <Separator className="my-2" />
            {onSignIn ? <Button variant="outline" size="sm" className="w-full" onClick={onSignIn}>Sign In</Button> : null}
            {onGetStarted ? <Button size="sm" className="w-full bg-emerald-600 text-white hover:bg-emerald-700" onClick={onGetStarted}>Get Started</Button> : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

// ─── Hero with audience fork ────────────────────────────────────────────────

function HeroFork({
  audience,
  onPick,
  onTryDemo,
}: {
  audience: Audience;
  onPick: (a: Audience) => void;
  onTryDemo?: () => void;
}) {
  return (
    <section id="top" className="relative overflow-hidden">
      {/* Gradient backdrop */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-emerald-50 via-teal-50/40 to-cyan-50 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-cyan-950/20" />
      <div className="absolute -left-32 -top-32 -z-10 h-96 w-96 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-700/20" />
      <div className="absolute -right-32 top-20 -z-10 h-96 w-96 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-700/10" />

      <div className="mx-auto max-w-5xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20 text-center">
        {/* Eyebrow */}
        <div className="mb-4 flex justify-center">
          <Badge className="gap-1.5 border-emerald-200 bg-white/70 px-3 py-1 text-emerald-700 backdrop-blur hover:bg-white/70 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
            The AI Operating System for Local Services
          </Badge>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          ServiceOS —{' '}
          <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400">
            The AI Operating System
          </span>{' '}
          for Local Services
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Run your business. Get more customers. Automate everything.
        </p>

        {/* Fork — two big CTAs */}
        <div className="mx-auto mt-10 max-w-3xl">
          <p className="mb-3 text-xs uppercase tracking-widest text-muted-foreground font-semibold">Who are you?</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onPick('crm')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all',
                audience === 'crm'
                  ? 'border-emerald-500 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40'
                  : 'border-border bg-card hover:border-emerald-400 hover:shadow-md',
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  audience === 'crm' ? 'bg-white/20' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
                )}>
                  <Briefcase className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">I run a service business</span>
                    {audience === 'crm' ? <Check className="h-4 w-4 text-white" /> : null}
                  </div>
                  <p className={cn('mt-0.5 text-xs', audience === 'crm' ? 'text-emerald-50' : 'text-muted-foreground')}>
                    CRM, dispatch, invoicing, AI Receptionist. Get more customers with the marketplace.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onPick('marketplace')}
              className={cn(
                'group relative overflow-hidden rounded-2xl border-2 p-5 text-left transition-all',
                audience === 'marketplace'
                  ? 'border-amber-500 bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-lg shadow-amber-200 dark:shadow-amber-900/40'
                  : 'border-border bg-card hover:border-amber-400 hover:shadow-md',
              )}
            >
              <div className="flex items-start gap-3">
                <span className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                  audience === 'marketplace' ? 'bg-white/20' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
                )}>
                  <Search className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold">I need a service</span>
                    {audience === 'marketplace' ? <Check className="h-4 w-4 text-white" /> : null}
                  </div>
                  <p className={cn('mt-0.5 text-xs', audience === 'marketplace' ? 'text-amber-50' : 'text-muted-foreground')}>
                    Describe your problem. AI routes you to verified local pros. Book instantly or compare quotes.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
            {onTryDemo ? (
              <button
                type="button"
                onClick={onTryDemo}
                className="inline-flex items-center gap-1.5 text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 font-medium"
              >
                <Play className="h-3.5 w-3.5" /> Try the live demo
              </button>
            ) : null}
            <span className="text-muted-foreground">·</span>
            <a href="/marketplace" className="inline-flex items-center gap-1.5 text-amber-700 hover:text-amber-800 dark:text-amber-300 font-medium">
              Browse the marketplace <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Trust badges row */}
        <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          {heroTrustBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div key={badge.label} className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-emerald-600" />
                <span className="font-medium">{badge.label}</span>
              </div>
            );
          })}
        </div>

        {/* Industry marquee — instantly signals "this is for service businesses" */}
        <div className="mt-10">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-3">
            Trusted by service businesses across 23+ industries
          </p>
          <div className="relative overflow-hidden">
            {/* Gradient fade edges */}
            <div className="absolute left-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-r from-background to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 z-10 w-12 bg-gradient-to-l from-background to-transparent pointer-events-none" />
            <div className="flex gap-2 animate-[marquee_40s_linear_infinite] hover:[animation-play-state:paused]">
              {[...industryChips, ...industryChips].map((chip, i) => (
                <span
                  key={`${chip}-${i}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white dark:bg-card px-3 py-1.5 text-xs font-medium text-foreground/80 whitespace-nowrap shadow-sm"
                >
                  <Wrench className="h-3 w-3 text-emerald-500" />
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Trust stats */}
        <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-bold text-foreground sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Dashboard preview — only when CRM fork is active */}
        {audience === 'crm' ? (
          <div className="mt-14 relative max-w-4xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-emerald-200/40 via-teal-200/30 to-emerald-200/40 rounded-3xl blur-3xl -z-10 dark:from-emerald-700/20 dark:via-teal-700/15 dark:to-emerald-700/20" />
            <div className="relative rounded-2xl border border-border bg-white shadow-2xl shadow-slate-300/40 overflow-hidden dark:bg-card">
              <div className="aspect-[1344/768] relative">
                <Image
                  src="/images/landing/hero-dashboard.png"
                  alt="ServiceOS CRM dashboard showing unified inbox, jobs, and dispatch"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 80vw"
                  className="object-cover object-top"
                />
              </div>
            </div>

            {/* Floating worker badge — small "tech en route" card */}
            <div className="absolute -bottom-5 -left-3 sm:-left-6 hidden sm:block">
              <div className="rounded-xl border border-border bg-white shadow-lg p-3 w-44 dark:bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 border border-emerald-200 overflow-hidden relative shrink-0">
                    <Image
                      src="/images/landing/hero-worker.png"
                      alt="Field technician en route to customer"
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground leading-tight">Tech en route</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">ETA 12 min</div>
                  </div>
                </div>
                <div className="h-1 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: '65%' }} />
                </div>
              </div>
            </div>
          </div>
        ) : null}
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
          <span className="font-semibold text-emerald-600">ServiceOS fixes all three — day one, no Meta approvals required.</span>
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
          <Badge variant="outline" className="border-emerald-200 bg-white/70 text-emerald-700 mb-3 font-medium">Real Results</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Real results, <span className="text-emerald-600">measurable impact</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto text-sm">
            Aggregated averages from ServiceOS customers in their first 90 days. Individual results vary by industry and adoption.
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
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 px-1 snap-x" style={{ scrollbarWidth: 'none' }}>
            {coreFlowSteps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div key={step.label} className="flex items-center flex-shrink-0 snap-start">
                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-xl bg-white border border-border shadow-sm flex items-center justify-center mb-1.5">
                      <Icon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-xs text-muted-foreground font-medium">{step.label}</span>
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
            Email, SMS, and WhatsApp work out of the box — no Meta approvals, no waiting. Reach your customers and team instantly from day one.
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
                    alt={`${ch.title} channel preview`}
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

// ─── CRM: Testimonials ──────────────────────────────────────────────────────

function CrmTestimonials() {
  return (
    <section className="border-t bg-background py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Testimonials</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Loved by <span className="text-emerald-600">service businesses</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Real stories from owners who replaced chaos with clarity.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t) => (
            <Card key={t.name} className="bg-white border-border hover:border-emerald-300 hover:shadow-lg transition-all h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold w-fit mb-2">{t.metric}</Badge>
                <p className="text-sm text-foreground/80 leading-relaxed italic">&ldquo;{t.quote}&rdquo;</p>
              </CardHeader>
              <CardContent className="mt-auto pt-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-full overflow-hidden border border-border bg-muted flex-shrink-0">
                    <Image
                      src={t.avatar}
                      alt={t.name}
                      fill
                      sizes="48px"
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-foreground">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.business}</div>
                    <div className="text-xs text-emerald-600 font-medium">{t.industry}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CRM: Pricing ───────────────────────────────────────────────────────────

function CrmPricing({ onGetStarted }: { onGetStarted?: () => void }) {
  const [yearly, setYearly] = React.useState(false);
  return (
    <section id="pricing" className="border-t bg-muted/30 py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 mb-3 font-medium">Pricing</Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Simple, <span className="text-emerald-600">Transparent Pricing</span>
          </h2>
          <p className="text-muted-foreground mt-3">Start free for 14 days. No credit card required. Email & SMS included on every plan.</p>

          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={cn('text-sm font-medium', !yearly ? 'text-foreground' : 'text-muted-foreground')}>Monthly</span>
            <button
              type="button"
              onClick={() => setYearly(!yearly)}
              className="relative w-14 h-7 rounded-full bg-muted border border-border transition-colors"
              aria-label="Toggle yearly pricing"
            >
              <span className={cn('absolute top-0.5 h-6 w-6 rounded-full bg-emerald-600 shadow-sm transition-transform',
                yearly ? 'translate-x-7' : 'translate-x-0.5')} />
            </button>
            <span className={cn('text-sm font-medium flex items-center gap-1', yearly ? 'text-foreground' : 'text-muted-foreground')}>
              Yearly
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Save 17%</Badge>
            </span>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {pricingPlans.map((plan) => {
            const Icon = plan.icon;
            return (
              <Card
                key={plan.name}
                className={cn(
                  'relative bg-white border h-full flex flex-col transition-all',
                  plan.popular
                    ? 'border-emerald-500 shadow-lg shadow-emerald-100 ring-1 ring-emerald-500/20'
                    : 'border-border hover:border-emerald-300 hover:shadow-md',
                )}
              >
                {plan.popular ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white font-semibold border-0 px-3 shadow-md">Popular</Badge>
                  </div>
                ) : null}
                {plan.highlight ? (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-500 text-white font-semibold border-0 px-3 shadow-md whitespace-nowrap">$5 starter</Badge>
                  </div>
                ) : null}
                <CardHeader className="pb-2">
                  <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3',
                    plan.popular ? 'bg-emerald-50 border border-emerald-100' : 'bg-muted border border-border')}>
                    <Icon className={cn('w-5 h-5', plan.popular ? 'text-emerald-600' : 'text-muted-foreground')} />
                  </div>
                  <CardTitle className="text-foreground text-lg">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="mb-5">
                    {plan.monthlyPrice !== null ? (
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold text-foreground">
                          ${yearly ? Math.round(plan.yearlyPrice! / 12) : plan.monthlyPrice}
                        </span>
                        <span className="text-muted-foreground text-sm">/mo</span>
                      </div>
                    ) : (
                      <div className="text-4xl font-bold text-foreground">Custom</div>
                    )}
                    {plan.monthlyPrice !== null && yearly ? (
                      <p className="text-xs text-muted-foreground mt-1">${plan.yearlyPrice}/year billed annually</p>
                    ) : null}
                  </div>
                  <ul className="space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    onClick={onGetStarted}
                    className={cn('w-full',
                      plan.popular
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm'
                        : 'bg-white hover:bg-muted text-foreground border border-border')}
                  >
                    {plan.cta} <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <strong className="text-foreground">All plans include</strong> Email, SMS, Push & In-App notifications, lead capture, invoicing, and the Live Demo.
        </p>
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
            Get more customers with the <span className="text-amber-600">ServiceOS Marketplace</span>
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
            Join 2,500+ service businesses already running on ServiceOS. Email &amp; SMS work from day one — no approvals, no waiting.
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

// ─── Marketplace: AI search + featured providers ────────────────────────────

function MarketplaceCompact({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted?: () => void;
  onSignIn?: () => void;
}) {
  const [featured, setFeatured] = React.useState<ProviderListItem[]>([]);
  const [featuredLoading, setFeaturedLoading] = React.useState(true);

  // Featured providers
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setFeaturedLoading(true);
      try {
        const res = await fetch(mpUrl('/api/marketplace/providers', { limit: 12 }));
        const data = (await res.json()) as ProviderListResponse;
        if (cancelled) return;
        const sorted = [...data.items].sort((a, b) => {
          if (!!a.featured !== !!b.featured) return a.featured ? -1 : 1;
          return (b.rating ?? 0) - (a.rating ?? 0);
        });
        setFeatured(sorted.slice(0, 8));
      } catch {
        if (!cancelled) setFeatured([]);
      } finally {
        if (!cancelled) setFeaturedLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function handleProviderClick(p: ProviderListItem) {
    const slug = p.slug || p.publicSlug;
    if (slug && typeof window !== 'undefined') {
      // Navigate to the canonical /{industry}/{city}/{slug} public hub URL
      // (the old /marketplace/[slug] route now 301-redirects there).
      window.location.href = `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`;
    }
  }

  return (
    <section className="border-t bg-background py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {/* Section header — clean marketplace intro.
            (The AI "describe your problem" feature was removed: it analyzed
            the request but hit a dead-end with 0 nearby providers when no
            location was given. Users now go straight to browsing / requesting
            quotes — clearer, faster, no false promise.) */}
        <div className="mb-8 text-center">
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 mb-3 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" />
            ServiceOS Marketplace
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Find trusted <span className="text-amber-600">local pros</span>
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">
            Browse verified businesses, compare quotes, and book instantly — or request a quote and let pros come to you.
          </p>
          <div className="mt-5">
            <Button asChild size="lg" className="gap-2 bg-amber-600 px-6 text-base text-white hover:bg-amber-700">
              <Link href="/marketplace">
                Browse all providers <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Featured providers */}
        <div className="mt-12">
          <div className="mb-5 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-foreground sm:text-3xl">Featured Providers</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Top-rated, verified businesses ready to take your booking right now.
              </p>
            </div>
            <a
              href="/marketplace"
              className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-800 dark:text-amber-300"
            >
              Browse all <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {featuredLoading ? (
            <div className="flex gap-4 overflow-hidden">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-72 w-72 shrink-0 rounded-xl" />
              ))}
            </div>
          ) : featured.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="text-sm text-muted-foreground">No marketplace-eligible providers yet.</p>
                {onGetStarted ? (
                  <Button className="mt-2 gap-2 bg-amber-600 text-white hover:bg-amber-700" onClick={onGetStarted}>
                    List your business <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ) : (
            <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
              {featured.map((p) => {
                const slug = p.slug || p.publicSlug;
                // Canonical /{industry}/{city}/{slug} URL — links directly to
                // the unified public business hub.
                const canonicalHref = slug
                  ? `/${mapIndustryToUrlSlug(p.industry)}/${slugifyCity(p.city)}/${slug}`
                  : undefined;
                return (
                  <div key={p.id} className="w-72 shrink-0">
                    <ProviderCard
                      provider={p}
                      featured={!!p.featured}
                      onViewProfile={handleProviderClick}
                      compact
                      className="h-full"
                      href={canonicalHref}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Three ways to get service */}
        <div className="mt-12">
          <div className="mb-5 text-center">
            <h3 className="text-2xl font-bold text-foreground sm:text-3xl">Three Ways to Get Service</h3>
            <p className="mt-1 text-sm text-muted-foreground">Pick the flow that matches your urgency and project size.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <FlowCard
              icon={Zap}
              tone="from-emerald-500 to-teal-600"
              title="Instant Booking"
              tagline="Pick a slot, done."
              description="Browse verified providers, choose a service + time, and confirm in seconds. Ideal for cleaning, lawn care, pest control — any routine job."
              steps={['Pick a provider', 'Choose service + time', 'Get confirmed instantly']}
            />
            <FlowCard
              icon={FileText}
              tone="from-amber-500 to-orange-600"
              title="Request Quotes"
              tagline="Compare, then decide."
              description="Describe your project and we'll broadcast it to multiple nearby providers. Compare quotes, reviews, and timelines — then accept the one you like."
              steps={['Describe your project', 'Receive N quotes', 'Pick the best fit']}
            />
            <FlowCard
              icon={Siren}
              tone="from-rose-500 to-red-600"
              title="Emergency Dispatch"
              tagline="Help, fast."
              description="Burst pipe, no power, locked out, gas leak — describe the emergency and we'll dispatch the nearest verified technician, usually en route in under 35 minutes."
              steps={['Describe the emergency', 'We broadcast instantly', 'Tech en route < 35 min']}
            />
          </div>
        </div>

        {/* CTA banner */}
        <div className="mt-12">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 p-7 text-white shadow-xl sm:p-9">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl" />
            <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="max-w-xl">
                <Badge className="mb-3 bg-white/20 text-white hover:bg-white/20">
                  <ShieldCheck className="mr-1 h-3.5 w-3.5" /> For service businesses
                </Badge>
                <h3 className="text-2xl font-bold sm:text-3xl">Run your business on ServiceOS.</h3>
                <p className="mt-2 text-sm text-amber-50">
                  Get discovered by thousands of customers in your area. Manage bookings, dispatch, invoicing, and AI automation — all in one platform.
                </p>
              </div>
              {onGetStarted ? (
                <Button
                  size="lg"
                  className="shrink-0 gap-2 bg-white text-amber-700 hover:bg-amber-50"
                  onClick={onGetStarted}
                >
                  List your business <ArrowRight className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowCard({
  icon: Icon,
  tone,
  title,
  tagline,
  description,
  steps,
}: {
  icon: typeof Zap;
  tone: string;
  title: string;
  tagline: string;
  description: string;
  steps: string[];
}) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className={cn('flex items-center gap-3 bg-gradient-to-r p-4 text-white', tone)}>
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-base font-bold">{title}</p>
          <p className="text-xs text-white/80">{tagline}</p>
        </div>
      </div>
      <CardContent className="flex flex-1 flex-col gap-3 pt-4">
        <p className="text-sm text-muted-foreground">{description}</p>
        <div className="mt-auto space-y-1.5 pt-2">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                {i + 1}
              </span>
              <span className="text-foreground">{s}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
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
    <div className="sticky bottom-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] sm:px-6">
      <div className="mx-auto max-w-6xl flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground truncate">
            {audience === 'crm'
              ? 'ServiceOS CRM — run your business from lead to invoice'
              : 'ServiceOS Marketplace — find verified local pros'}
          </p>
        </div>
        {audience === 'crm' ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPick('marketplace')}
              className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 hidden sm:inline-flex"
            >
              <Search className="h-3.5 w-3.5" /> I need a service
            </Button>
            {onGetStarted ? (
              <Button size="sm" onClick={onGetStarted} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700">
                Start free <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPick('crm')}
              className="gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50 hidden sm:inline-flex"
            >
              <Briefcase className="h-3.5 w-3.5" /> I run a business
            </Button>
            <a
              href="/marketplace"
              className="inline-flex items-center gap-1 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            >
              Browse all <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </>
        )}
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Dismiss"
          className="ml-1 p-1 rounded text-muted-foreground hover:bg-muted"
        >
          <X className="h-3.5 w-3.5" />
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

  // Smooth-scroll to top when audience switches
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Don't scroll on first mount
    return;
  }, [audience]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} audience={audience} onPick={setAudience} />

      <main className="flex-1">
        <HeroFork audience={audience} onPick={setAudience} onTryDemo={onTryDemo} />

        {audience === 'crm' ? (
          <>
            <CrmProblem />
            <CrmHowItWorks />
            <CrmFeatures />
            <CrmChannels />
            <CrmAiReceptionist onGetStarted={onGetStarted} />
            <CrmRoiMetrics />
            <CrmPersonas />
            <CrmTestimonials />
            <CrmPricing onGetStarted={onGetStarted} />
            <CrmFaq />
            <CrmForProviders onGetStarted={onGetStarted} />
          </>
        ) : (
          <MarketplaceCompact onGetStarted={onGetStarted} onSignIn={onSignIn} />
        )}
      </main>

      <LandingFooter />
      <StickyCta audience={audience} onPick={setAudience} onGetStarted={onGetStarted} />
    </div>
  );
}
