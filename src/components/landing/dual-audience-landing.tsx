'use client';

import * as React from 'react';
import {
  Wrench,
  Sparkles,
  ArrowRight,
  Zap,
  Bot,
  PhoneCall,
  CalendarCheck,
  UserCheck,
  Calendar,
  Wallet,
  Mail,
  Check,
  Shield,
  Building2,
  Briefcase,
  Headphones,
  HardHat,
  Globe,
  Search,
  MapPin,
  ShieldCheck,
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
  Home,
  Paintbrush,
  Truck,
  Plug,
  Smartphone,
  Layers,
  FileSpreadsheet,
  CheckCircle2,
  Cpu,
  Coins,
  Lock,
  Sliders,
  Eye,
  Send,
  Navigation,
  Percent,
  Calculator,
  Users,
  GitBranch,
  Star,
  ChevronDown,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { CrmPricing } from './crm-pricing';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DualAudienceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

// ─── Trade Verticals Data ───────────────────────────────────────────────────
const TRADE_VERTICALS = [
  {
    id: 'plumbing',
    name: 'Plumbing',
    icon: Wrench,
    headline: 'Emergency Dispatch & Leak Diagnostics',
    description: 'Dispatch on-call plumbers with live GPS navigation, collect before-and-after pipe photos, and accept instant card payments on-site.',
    features: ['Emergency Call Routing', 'Photo Evidence Markup', 'Mobile Invoicing', 'Inventory Sync'],
    sampleJob: 'Burst Pipe Emergency Repair — £280.00 (Paid via Stripe)',
  },
  {
    id: 'hvac',
    name: 'HVAC',
    icon: Thermometer,
    headline: 'Seasonal Maintenance & AC Diagnostics',
    description: 'Track warranty expirations, automate seasonal tune-up reminders, and quote multi-tier heat pump installations in minutes.',
    features: ['Warranty Tracking', 'Seasonal Service Reminders', 'Multi-Option Quotes', 'Refrigerant Logs'],
    sampleJob: 'Commercial AC Diagnostic & Coil Replacement — £840.00',
  },
  {
    id: 'electrical',
    name: 'Electrical',
    icon: Plug,
    headline: 'Panel Upgrades & EV Charger Installs',
    description: 'Generate compliance certificates, create formula-based rewiring estimates, and manage technician certifications in one place.',
    features: ['Compliance Checklists', 'Wire & Conduit Estimator', 'Digital Sign-Offs', 'Safety Inspections'],
    sampleJob: '7.4kW Smart EV Charger Installation — £650.00',
  },
  {
    id: 'cleaning',
    name: 'Cleaning',
    icon: Home,
    headline: 'Recurring Maid Service & Deep Cleans',
    description: 'Automate weekly and bi-weekly recurring appointments, allocate cleaning crews by territory, and send SMS arrival alerts.',
    features: ['Recurring Auto-Billing', 'Square Footage Calculator', 'Crew Checklists', 'Customer Portal'],
    sampleJob: 'Bi-Weekly Residential Deep Clean — £160.00 / visit',
  },
  {
    id: 'roofing',
    name: 'Roofing',
    icon: HardHat,
    headline: 'Roof Replacement Quotes & Insurance Claims',
    description: 'Calculate pitch and square footage formulas live, capture aerial drone photos, and collect 20% project deposits online.',
    features: ['Pitch & Sq Ft Formulas', 'Drone Photo Uploads', 'Deposit Checkout', 'Contract E-Sign'],
    sampleJob: 'Architectural Shingle Roof Replacement — £6,850.00 (Deposit Paid)',
  },
  {
    id: 'landscaping',
    name: 'Landscaping',
    icon: Trees,
    headline: 'Lawn Maintenance & Hardscape Projects',
    description: 'Route lawn care crews efficiently, estimate material cubic yards on-site, and manage seasonal contracts.',
    features: ['Route Optimization', 'Material Yardage Calculator', 'Seasonal Agreements', 'Weather Rescheduling'],
    sampleJob: 'Commercial Property Grounds Maintenance — £450.00 / mo',
  },
  {
    id: 'handyman',
    name: 'Handyman',
    icon: Briefcase,
    headline: 'Multi-Trade Repairs & Assembly',
    description: 'Track billable hours and hardware expenses, take customer deposits, and send automated receipt summaries.',
    features: ['Time & Material Tracking', 'Online Booking Widget', 'Before/After Photos', 'Quick Invoices'],
    sampleJob: 'Drywall Repair & Door Installation — £320.00',
  },
  {
    id: 'painting',
    name: 'Painting',
    icon: Paintbrush,
    headline: 'Interior & Exterior Surface Estimating',
    description: 'Quote paint coats by square meter, provide color swatch sign-offs, and track multi-day crew progress.',
    features: ['Paint Coverage Calculator', 'Color Choice Approvals', 'Multi-Day Milestones', 'Crew Timesheets'],
    sampleJob: 'Whole-Home Interior Painting — £3,200.00',
  },
];

// ─── 5-Stage Service Business Lifecycle ──────────────────────────────────────
const LIFECYCLE_STAGES = [
  {
    id: 'acquire',
    step: '01',
    label: 'FIND CUSTOMERS',
    title: 'Bring More High-Intent Customers Into Your Business',
    subtitle: 'Stop relying on word-of-mouth alone. Turn your website and local marketplace into 24/7 lead generators.',
    icon: Users,
    tools: [
      { name: 'Fieseros Pro Marketplace', desc: 'Get discovered by local homeowners searching for verified trade specialists in your area.' },
      { name: 'GPTForm™ AI Forms', desc: 'Embed smart quote calculators with instant pricing that turn passive website visitors into booked jobs.' },
      { name: '24/7 AI Website Chat', desc: 'Engage visitors immediately, answer service questions, and capture contact details while you work.' },
      { name: 'Google & Meta Leads Sync', desc: 'Connect ad leads directly into your pipeline with zero manual data entry.' },
    ],
    metric: '3.4x More Website Conversions',
  },
  {
    id: 'win',
    step: '02',
    label: 'WIN MORE JOBS',
    title: 'Turn Every Inquiry into a Confirmed, Signed Booking',
    subtitle: 'Speed wins in field services. Send formula-backed estimates in 60 seconds and let AI answer calls when your hands are full.',
    icon: Calculator,
    tools: [
      { name: '24/7 AI Voice Receptionist', desc: 'Answers inbound calls 24/7, answers FAQs, qualifies job scope, and books appointments on your calendar.' },
      { name: 'Instant Formula Quotes', desc: 'Calculate labor, materials, and profit margins automatically. Send via SMS and Email with 1-tap e-sign.' },
      { name: 'Automated Quote Follow-Ups', desc: 'Auto-send friendly reminder texts when an estimate sits unopened for 48 hours.' },
      { name: 'Live Online Booking Page', desc: 'Let customers pick available time windows directly based on technician schedules.' },
    ],
    metric: '48% Faster Quote Sign-Off',
  },
  {
    id: 'deliver',
    step: '03',
    label: 'RUN OPERATIONS',
    title: 'Dispatch Crews, Track Jobs, and Deliver Flawless Work',
    subtitle: 'From the dispatch calendar to the technician’s mobile phone, keep your entire team synchronized in real time.',
    icon: CalendarCheck,
    tools: [
      { name: 'Drag-and-Drop Dispatch Board', desc: 'View your entire crew schedule on a visual calendar with territory-based color coding.' },
      { name: 'Field Technician Mobile App (PWA)', desc: 'Technicians view daily routes, update job status, upload photos, and collect signatures on any phone.' },
      { name: 'Live GPS & Route Optimization', desc: 'Minimize windshield time between job sites with turn-by-turn route mapping.' },
      { name: 'Inspection & Safety Checklists', desc: 'Ensure consistent quality standards and code compliance on every job site.' },
    ],
    metric: '35% Reduced Drive Time',
  },
  {
    id: 'collect',
    step: '04',
    label: 'GET PAID (0% FEE)',
    title: 'Collect Direct Payments and Invoices with 0% Platform Commission',
    subtitle: 'Fieseros charges zero transaction commission. Keep every penny of your hard-earned revenue.',
    icon: Wallet,
    tools: [
      { name: 'One-Tap Professional Invoicing', desc: 'Convert completed job work orders into itemized digital invoices with a single tap.' },
      { name: 'Direct Stripe & Card Payouts', desc: 'Accept credit/debit cards, Apple Pay, Google Pay, and bank transfers directly into your merchant account.' },
      { name: 'Upfront Deposit Collection', desc: 'Secure 20%–50% project deposits before ordering materials or dispatching crews.' },
      { name: 'Automated Payment Reminders', desc: 'Eliminate awkward phone calls with polite automated SMS/email payment nudges.' },
    ],
    metric: '2x Faster Payment Collection',
  },
  {
    id: 'grow',
    step: '05',
    label: 'GROW AUTOMATICALLY',
    title: 'Turn Completed Jobs into 5-Star Reviews and Repeat Business',
    subtitle: 'Put your business reputation and customer retention on autopilot so happy customers keep booking you.',
    icon: TrendingUp,
    tools: [
      { name: 'Automated 5-Star Google Reviews', desc: 'Trigger a review request SMS the second a job is marked completed.' },
      { name: 'Customer Reactivation Campaigns', desc: 'Broadcast seasonal maintenance offers to past clients via targeted SMS & email.' },
      { name: 'Service Warranty Tracking', desc: 'Notify customers when their annual boiler, roof, or AC warranty inspection is due.' },
      { name: 'Revenue & Gross Margin Analytics', desc: 'See which trades, technicians, and neighborhoods generate your highest profit margins.' },
    ],
    metric: '92% 5-Star Review Rate',
  },
];

// ─── Stack Replacement Comparison Data ──────────────────────────────────────
const STACK_COMPARISON = [
  { tool: 'CRM & Lead Management', traditional: 'HubSpot / Jobber ($79–$149/mo)', fieseros: 'Included Free (100 Jobs)' },
  { tool: 'Invoicing & Payments', traditional: 'QuickBooks / InvoiceSimple ($35–$50/mo)', fieseros: 'Included (0% Platform Fee)' },
  { tool: 'Smart Forms & Calculators', traditional: 'Jotform / Typeform ($39–$59/mo)', fieseros: 'GPTForm™ Included' },
  { tool: '24/7 AI Phone Receptionist', traditional: 'Ruby / Smith.ai ($150–$300/mo)', fieseros: 'Native AI Voice Agent Included' },
  { tool: 'Scheduling & Booking', traditional: 'Calendly ($16/mo)', fieseros: 'Live Team Calendar Included' },
  { tool: 'SMS & Email Follow-Ups', traditional: 'Zapier + Twilio ($50–$100/mo)', fieseros: 'Native Automations Included' },
];

export function DualAudienceLanding({ onGetStarted, onSignIn, onTryDemo }: DualAudienceLandingProps) {
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────────────────
  const [activeLifecycleIndex, setActiveLifecycleIndex] = React.useState(0);
  const [activeTradeIndex, setActiveTradeIndex] = React.useState(0);
  const [activeScheduleItem, setActiveScheduleItem] = React.useState(0);
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Mock interactive jobs for hero dashboard
  const SCHEDULE_JOBS = [
    { id: 0, title: 'AC Diagnostic Inspection', customer: 'David Harrison', time: '10:00 AM', tech: 'John D.', status: 'In Progress', price: '£180.00', trade: 'HVAC' },
    { id: 1, title: 'Emergency Boiler Repair', customer: 'Emma Watson', time: '11:30 AM', tech: 'Mike T.', status: 'En Route', price: '£340.00', trade: 'Plumbing' },
    { id: 2, title: 'EV Charger Installation', customer: 'Robert Chen', time: '02:00 PM', tech: 'Sarah K.', status: 'Scheduled', price: '£650.00', trade: 'Electrical' },
    { id: 3, title: 'Roof Tile Replacement', customer: 'Arthur Pendelton', time: '04:15 PM', tech: 'Liam P.', status: 'Scheduled', price: '£520.00', trade: 'Roofing' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* ═══════════════════════════════════════════════════════════════════
          NAVIGATION (Clean, Modern 2026 SaaS Header)
      ══════════════════════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark size={32} className="shadow-emerald-500/20" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Fieseros <span className="text-emerald-600 font-extrabold text-xs px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800">OS</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-medium -mt-1">
                Service Business Operating System
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-medium">
            {/* Platform Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer">
                  Platform <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2">
                <DropdownMenuItem asChild>
                  <Link href="/customer-crm" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <Users className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">Customer CRM &amp; Leads</span>
                      <span className="text-[10px] text-muted-foreground">Complete customer 360 database</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/scheduling-and-dispatch" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <CalendarCheck className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">Scheduling &amp; Dispatch</span>
                      <span className="text-[10px] text-muted-foreground">Drag-and-drop team calendar &amp; GPS</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/invoicing-and-payments" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <Wallet className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">Quotes &amp; Invoices</span>
                      <span className="text-[10px] text-muted-foreground">Instant math formulas &amp; 0% fee pay</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/technician-app" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <Smartphone className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">Technician Mobile App</span>
                      <span className="text-[10px] text-muted-foreground">Photos, checklists &amp; signatures</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/automations" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <Zap className="size-4 text-emerald-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">Workflow Automations</span>
                      <span className="text-[10px] text-muted-foreground">Automated SMS &amp; review triggers</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Layer Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer">
                  AI Features <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 p-2">
                <DropdownMenuItem asChild>
                  <Link href="/#ai-receptionist" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <Headphones className="size-4 text-teal-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">24/7 AI Voice Receptionist</span>
                      <span className="text-[10px] text-muted-foreground">Answers calls &amp; books calendar slots</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/gptform" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer">
                    <Sparkles className="size-4 text-teal-600 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs block">GPTForm™ AI Form Engine</span>
                      <span className="text-[10px] text-muted-foreground">Conversational &amp; calculation forms</span>
                    </div>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Solutions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition cursor-pointer">
                  Industries <ChevronDown className="size-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-2">
                <DropdownMenuItem asChild><Link href="/hvac-software" className="text-xs p-2">HVAC Software</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/plumbing-software" className="text-xs p-2">Plumbing Software</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/electrical-contractor-software" className="text-xs p-2">Electrical Software</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/cleaning-business-software" className="text-xs p-2">Cleaning Business Software</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/roofing-software" className="text-xs p-2">Roofing Software</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/landscaping-software" className="text-xs p-2">Landscaping Software</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/handyman-software" className="text-xs p-2">Handyman Software</Link></DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link href="/marketplace" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
              Marketplace
            </Link>
            <Link href="/#pricing" className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition">
              Pricing
            </Link>
          </nav>

          {/* Right Action CTAs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSignIn}
              className="text-sm font-semibold text-muted-foreground hover:text-foreground transition hidden sm:block cursor-pointer"
            >
              Sign In
            </button>
            <Button
              type="button"
              onClick={onGetStarted}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm h-10 px-4 sm:px-5 rounded-xl shadow-md cursor-pointer gap-1.5"
            >
              <span>Start Free</span>
              <span className="hidden sm:inline">(100 Jobs Free)</span>
              <ArrowRight className="size-3.5" />
            </Button>
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground"
              aria-label="Toggle navigation menu"
            >
              {mobileNavOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileNavOpen && (
          <div className="md:hidden border-b border-border bg-background p-4 space-y-3 text-sm">
            <Link href="/customer-crm" className="block py-1.5 font-medium" onClick={() => setMobileNavOpen(false)}>CRM &amp; Leads</Link>
            <Link href="/scheduling-and-dispatch" className="block py-1.5 font-medium" onClick={() => setMobileNavOpen(false)}>Scheduling &amp; Dispatch</Link>
            <Link href="/invoicing-and-payments" className="block py-1.5 font-medium" onClick={() => setMobileNavOpen(false)}>Quotes &amp; Invoices</Link>
            <Link href="/gptform" className="block py-1.5 font-medium text-emerald-600" onClick={() => setMobileNavOpen(false)}>GPTForm™ AI Forms</Link>
            <Link href="/marketplace" className="block py-1.5 font-medium" onClick={() => setMobileNavOpen(false)}>Pro Marketplace</Link>
            <Link href="/#pricing" className="block py-1.5 font-medium" onClick={() => setMobileNavOpen(false)}>Pricing</Link>
            <div className="pt-2 border-t flex gap-2">
              <Button onClick={() => { setMobileNavOpen(false); onSignIn?.(); }} variant="outline" className="w-full text-xs">Sign In</Button>
              <Button onClick={() => { setMobileNavOpen(false); onGetStarted?.(); }} className="w-full bg-emerald-600 text-white text-xs">Start Free (100 Jobs)</Button>
            </div>
          </div>
        )}
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 1 — HERO: "RUN YOUR ENTIRE SERVICE BUSINESS IN ONE PLACE"
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b bg-gradient-to-b from-emerald-50/40 via-background to-background dark:from-emerald-950/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          {/* Top Hero Pitch */}
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Eyebrow */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 text-xs font-semibold shadow-xs">
                <Sparkles className="size-3.5 text-emerald-600" />
                <span>FIESEROS SERVICE OS · ALL-IN-ONE BUSINESS PLATFORM</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium">
                🎁 <strong>100 Lifetime Jobs Free</strong>
              </div>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.06]">
              Run your entire service{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent">
                business in one place.
              </span>
            </h1>

            {/* Subtitle (Google AI overview indexed keyword alignment) */}
            <p className="text-base sm:text-xl text-muted-foreground leading-relaxed max-w-3xl mx-auto">
              An all-in-one software platform and local marketplace designed to help trade and field service companies <strong>run operations</strong>, <strong>build websites &amp; smart AI forms</strong>, and <strong>find local customers</strong>.
            </p>

            {/* Action CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
              <Button
                type="button"
                size="lg"
                onClick={onGetStarted}
                className="h-13 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base rounded-2xl gap-2 shadow-xl shadow-emerald-600/20 cursor-pointer w-full sm:w-auto"
              >
                <span>Start Free (100 Jobs Free)</span>
                <ArrowRight className="size-4" />
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="h-13 px-8 text-sm sm:text-base font-semibold rounded-2xl hover:border-emerald-500 hover:text-emerald-700 w-full sm:w-auto"
              >
                <a href="#lifecycle">
                  <Play className="size-4 mr-2 text-emerald-600" />
                  See How It Works
                </a>
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-2">
              {['100 Lifetime Jobs Free', 'No credit card required', '2-minute setup', '0% commission on direct payments'].map((t) => (
                <span key={t} className="flex items-center gap-1.5 font-medium">
                  <Check className="size-3.5 text-emerald-600 font-bold" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* ─── INTERACTIVE HERO PRODUCT CANVAS (Linear / HighLevel Aesthetic) ─── */}
          <div className="max-w-5xl mx-auto rounded-3xl border-2 border-emerald-500/30 bg-slate-950 text-white shadow-2xl overflow-hidden">
            {/* Top Window Bar */}
            <div className="px-5 py-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-red-500/80" />
                <div className="size-3 rounded-full bg-yellow-500/80" />
                <div className="size-3 rounded-full bg-green-500/80" />
                <span className="text-xs font-mono text-slate-400 ml-2 hidden sm:inline">
                  app.fieseros.com / dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
                  ● System Online · 24/7 AI Receptionist Active
                </Badge>
              </div>
            </div>

            {/* Live Metrics Row */}
            <div className="p-6 md:p-8 space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Monthly Revenue', value: '$48,290.00', sub: '+18.4% vs last mo', color: 'text-emerald-400' },
                  { label: 'Jobs Completed', value: '128', sub: '100% on schedule', color: 'text-teal-400' },
                  { label: 'Quote Win Rate', value: '94.2%', sub: 'Avg 42m to sign', color: 'text-cyan-400' },
                  { label: 'Customer Rating', value: '4.9 ★', sub: '312 verified reviews', color: 'text-amber-400' },
                ].map((stat) => (
                  <div key={stat.label} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">{stat.label}</span>
                    <span className={cn('text-2xl sm:text-3xl font-extrabold block', stat.color)}>{stat.value}</span>
                    <span className="text-[10px] text-slate-500 block">{stat.sub}</span>
                  </div>
                ))}
              </div>

              {/* Interactive Schedule Dispatch & Job Card Split */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-2">
                {/* Today's Live Schedule (7 cols) */}
                <div className="md:col-span-7 p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <CalendarCheck className="size-4 text-emerald-400" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Today&apos;s Dispatch Schedule</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">4 active routes</span>
                  </div>

                  <div className="space-y-2">
                    {SCHEDULE_JOBS.map((job, idx) => (
                      <button
                        key={job.id}
                        type="button"
                        onClick={() => setActiveScheduleItem(idx)}
                        className={cn(
                          'w-full p-3 rounded-xl border text-left flex items-center justify-between transition cursor-pointer',
                          activeScheduleItem === idx
                            ? 'bg-emerald-950/60 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-xs'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        )}
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">{job.title}</span>
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-slate-700 text-slate-400">
                              {job.trade}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            {job.customer} · Assigned to: <strong className="text-slate-300">{job.tech}</strong>
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-emerald-300 block">{job.time}</span>
                          <span className="text-[10px] text-slate-400">{job.status}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Selected Job Action Card (5 cols) */}
                <div className="md:col-span-5 p-5 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-slate-900 border border-emerald-500/30 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">
                        Work Order #{SCHEDULE_JOBS[activeScheduleItem].id + 1042}
                      </Badge>
                      <span className="text-xs font-mono font-extrabold text-emerald-400">
                        {SCHEDULE_JOBS[activeScheduleItem].price}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">{SCHEDULE_JOBS[activeScheduleItem].title}</h4>
                      <p className="text-xs text-slate-300">Customer: {SCHEDULE_JOBS[activeScheduleItem].customer}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] space-y-1.5 text-slate-300 font-mono">
                      <div className="flex justify-between">
                        <span>ETA Window:</span>
                        <span className="text-white">{SCHEDULE_JOBS[activeScheduleItem].time}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>GPS Status:</span>
                        <span className="text-emerald-400">Technician Nearby</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Payment Link:</span>
                        <span className="text-teal-300">Direct Pay Ready (0%)</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={onGetStarted}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 shadow-md cursor-pointer"
                  >
                    Open Full Service OS Demo →
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 2 — THE PROBLEM: 10 DISCONNECTED TOOLS VS ONE SYSTEM
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 border-b bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge variant="outline" className="text-xs text-red-600 dark:text-red-400 border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-950/40 font-semibold">
              The Problem in Service Businesses
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Stop Running Your Business Across 10 Disconnected Tools.
            </h2>
            <p className="text-base text-muted-foreground">
              When your leads, calendar, dispatch, invoices, and messaging live in separate apps, jobs get delayed, quotes get forgotten, and revenue slips through the cracks.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto items-stretch">
            {/* The Disconnected Chaos */}
            <Card className="border-red-200 dark:border-red-950 bg-red-50/40 dark:bg-red-950/10 p-6 space-y-4">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-bold text-sm">
                <X className="size-4" />
                <span>The Disconnected Old Way</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span> Leads scattered across email, WhatsApp, voicemails, and paper notebooks.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span> Missed customer calls while working on the roof or under the sink.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span> Taking 2–3 days to send quotes while competitors close the deal.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span> Separate invoicing app charging 5% transaction fees on every client payment.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 font-bold">✕</span> Paying $400+/mo for 6 different software subscriptions that don&apos;t talk to each other.
                </li>
              </ul>
            </Card>

            {/* The Fieseros Way */}
            <Card className="border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 p-6 space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                <Check className="size-4" />
                <span>The Fieseros Service OS Way</span>
              </div>
              <ul className="space-y-3 text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> <strong>One unified platform:</strong> Leads, calendar, jobs, invoices, and payments in one place.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> <strong>24/7 AI Voice Receptionist:</strong> Never miss a customer call; auto-books appointments.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> <strong>Instant formula quotes:</strong> Send professional estimates with 1-tap e-sign in seconds.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> <strong>0% Commission Payments:</strong> Direct Stripe/Apple Pay payouts into your bank account.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> <strong>100 Lifetime Jobs Free:</strong> All features included without costly multi-tool software stacks.
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 3 — THE 5-STAGE LIFECYCLE (The HighLevel Engine for Trades)
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="lifecycle" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold">
            Complete Business Journey
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Acquire. Convert. Deliver. Get Paid. Grow.
          </h2>
          <p className="text-base text-muted-foreground">
            Everything your service business needs at every step of the customer relationship.
          </p>
        </div>

        {/* Step Selector Ribbon */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          {LIFECYCLE_STAGES.map((stg, idx) => {
            const Icon = stg.icon;
            const isActive = activeLifecycleIndex === idx;
            return (
              <button
                key={stg.id}
                type="button"
                onClick={() => setActiveLifecycleIndex(idx)}
                className={cn(
                  'flex items-center gap-2 px-4 py-3 rounded-2xl text-xs sm:text-sm font-bold transition cursor-pointer border whitespace-nowrap',
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-border hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                <span className={cn('size-5 rounded-full text-[10px] flex items-center justify-center font-bold', isActive ? 'bg-white text-emerald-800' : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300')}>
                  {stg.step}
                </span>
                <span>{stg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Lifecycle Stage Canvas */}
        <div className="max-w-5xl mx-auto p-8 rounded-3xl border-2 border-emerald-500/30 bg-slate-900 text-white shadow-xl space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1 max-w-2xl">
              <span className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider">
                STAGE {LIFECYCLE_STAGES[activeLifecycleIndex].step} · {LIFECYCLE_STAGES[activeLifecycleIndex].label}
              </span>
              <h3 className="text-2xl font-bold text-white">
                {LIFECYCLE_STAGES[activeLifecycleIndex].title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                {LIFECYCLE_STAGES[activeLifecycleIndex].subtitle}
              </p>
            </div>
            <Badge className="bg-emerald-500 text-slate-950 font-bold px-3 py-1 text-xs self-start md:self-center shrink-0">
              {LIFECYCLE_STAGES[activeLifecycleIndex].metric}
            </Badge>
          </div>

          {/* Tools Grid for Selected Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {LIFECYCLE_STAGES[activeLifecycleIndex].tools.map((tool) => (
              <div key={tool.name} className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 space-y-1.5 hover:border-emerald-500/50 transition">
                <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  {tool.name}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">{tool.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 4 — CUSTOMER JOURNEY INFOGRAPHIC ("ONE SYSTEM")
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-950 text-white border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-xs">End-to-End Automation</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              One Customer Journey. One System.
            </h2>
            <p className="text-sm text-slate-300">
              From the initial phone inquiry or website quote calculator all the way to 5-star Google review and repeat booking.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 text-center text-xs">
            {[
              { num: '1', title: 'Attract', desc: 'Marketplace & Ads' },
              { num: '2', title: 'Capture', desc: 'GPTForm™ / Chat' },
              { num: '3', title: 'Qualify', desc: '24/7 AI Voice' },
              { num: '4', title: 'Quote', desc: 'Instant Formula' },
              { num: '5', title: 'Dispatch', desc: 'Calendar & GPS' },
              { num: '6', title: 'Deliver', desc: 'Technician App' },
              { num: '7', title: 'Invoice', desc: '0% Direct Pay' },
              { num: '8', title: 'Review', desc: 'Auto Google 5★' },
              { num: '9', title: 'Repeat', desc: 'Reactivation' },
            ].map((step, idx) => (
              <div key={step.title} className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-between gap-2 shadow-xs">
                <span className="size-6 rounded-full bg-emerald-600/30 text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/40">
                  {step.num}
                </span>
                <div>
                  <span className="font-bold text-white block">{step.title}</span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{step.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 5 — THE BUILT-IN AI LAYER
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="ai-receptionist" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-teal-700 dark:text-teal-300 border-teal-300 font-semibold">
            Native AI Infrastructure
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            AI That Works Inside Your Real Workflow.
          </h2>
          <p className="text-sm text-muted-foreground">
            Not a generic chatbot. Purpose-built voice agents, formula calculators, and automated dispatchers designed specifically for trades.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {[
            {
              icon: Headphones,
              title: '24/7 AI Voice Receptionist',
              desc: 'Answers inbound calls day and night, answers pricing and service inquiries, captures customer details, and books live slots on your calendar.',
              badge: 'Voice AI',
            },
            {
              icon: Sparkles,
              title: 'GPTForm™ AI Form Platform',
              desc: 'Turn quote intake into conversational AI experiences or live mathematical formula calculators with direct Stripe deposit checkout.',
              badge: 'Forms & Calculations',
            },
            {
              icon: Navigation,
              title: 'AI Smart Dispatcher',
              desc: 'Automatically matches service requests to the closest available technician based on trade certifications, skills, and traffic conditions.',
              badge: 'Route AI',
            },
            {
              icon: Send,
              title: 'Automated Quote Follow-Up Agent',
              desc: 'Sends personalized SMS re-engagement when an estimate sits unapproved for 48 hours, boosting your quote close rate by up to 35%.',
              badge: 'Revenue Automation',
            },
          ].map((ai) => {
            const Icon = ai.icon;
            return (
              <Card key={ai.title} className="p-6 border-border bg-white dark:bg-slate-900 shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{ai.badge}</Badge>
                  </div>
                  <h3 className="font-bold text-base text-foreground">{ai.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{ai.desc}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 6 — BUILT FOR YOUR SPECIFIC TRADE (Interactive Selector)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/40 border-y">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <Badge className="bg-emerald-600 text-white text-xs">Trade Specialization</Badge>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              Built for How Your Trade Actually Works.
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose your trade to see customized workflow checklists, mathematical rate calculators, and mobile features.
            </p>
          </div>

          {/* Trade Selector Pills */}
          <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
            {TRADE_VERTICALS.map((trade, idx) => {
              const Icon = trade.icon;
              const isActive = activeTradeIndex === idx;
              return (
                <button
                  key={trade.id}
                  type="button"
                  onClick={() => setActiveTradeIndex(idx)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border whitespace-nowrap',
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-border hover:border-emerald-400'
                  )}
                >
                  <Icon className="size-3.5" />
                  <span>{trade.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Trade Detail Card */}
          <Card className="max-w-4xl mx-auto p-8 border-2 border-emerald-500/30 bg-white dark:bg-slate-900 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
              <div className="space-y-1">
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px]">
                  {TRADE_VERTICALS[activeTradeIndex].name} Operations
                </Badge>
                <h3 className="text-xl font-bold text-foreground">
                  {TRADE_VERTICALS[activeTradeIndex].headline}
                </h3>
              </div>
              <Button onClick={onGetStarted} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9 px-5 font-semibold">
                Start for {TRADE_VERTICALS[activeTradeIndex].name} Free →
              </Button>
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {TRADE_VERTICALS[activeTradeIndex].description}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {TRADE_VERTICALS[activeTradeIndex].features.map((f) => (
                <div key={f} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 border text-xs font-semibold text-foreground flex items-center gap-2">
                  <Check className="size-3.5 text-emerald-600 shrink-0" />
                  <span>{f}</span>
                </div>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between">
              <span className="font-semibold">Sample Completed Work Order:</span>
              <span className="font-mono font-bold">{TRADE_VERTICALS[activeTradeIndex].sampleJob}</span>
            </div>
          </Card>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 7 — REPLACE YOUR DISCONNECTED STACK (ROI Comparison)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="text-center space-y-3 max-w-2xl mx-auto">
          <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold">
            Direct ROI Analysis
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">
            Replace $400+/mo in Fragmented Software.
          </h2>
          <p className="text-sm text-muted-foreground">
            Consolidate your entire technology stack into one platform that costs a fraction of the price.
          </p>
        </div>

        <div className="rounded-3xl border border-border overflow-hidden bg-white dark:bg-slate-900 shadow-md">
          <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800/80 p-4 text-xs font-bold text-foreground border-b uppercase tracking-wider">
            <div className="col-span-4">Business Capability</div>
            <div className="col-span-4 text-muted-foreground">Traditional Software Stack</div>
            <div className="col-span-4 text-emerald-600 dark:text-emerald-400">Fieseros Service OS</div>
          </div>
          <div className="divide-y divide-border text-xs sm:text-sm">
            {STACK_COMPARISON.map((row) => (
              <div key={row.tool} className="grid grid-cols-12 p-4 items-center">
                <div className="col-span-4 font-semibold text-foreground">{row.tool}</div>
                <div className="col-span-4 text-muted-foreground">{row.traditional}</div>
                <div className="col-span-4 font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Check className="size-4 text-emerald-600" />
                  <span>{row.fieseros}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 8 — FIESEROS MARKETPLACE (Secondary Growth Channel)
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-slate-900 text-white border-y border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-3xl bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800">
            <div className="space-y-2 max-w-xl">
              <Badge className="bg-emerald-500 text-slate-950 font-bold text-[10px]">Marketplace Growth Channel</Badge>
              <h3 className="text-2xl font-bold text-white">Need More Local Customers?</h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Get listed on the Fieseros Verified Pro Directory. Homeowners browse top-rated local contractors, view verified badges, and submit direct job bookings.
              </p>
            </div>
            <Button
              asChild
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm h-11 px-7 rounded-xl shrink-0 cursor-pointer shadow-lg"
            >
              <Link href="/marketplace">
                Explore Pro Marketplace Directory →
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 9 — PRICING (5-Tier Snap Slider Carousel)
      ══════════════════════════════════════════════════════════════════════ */}
      <CrmPricing onGetStarted={onGetStarted} />

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 10 — FAQ ACCORDION
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-20 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-3">
          <Badge variant="outline" className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-300 font-semibold">
            Common Questions
          </Badge>
          <h2 className="text-3xl font-bold tracking-tight">Everything You Need to Know</h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2">
          {[
            {
              q: 'What is included in the 100 Lifetime Jobs Free plan?',
              a: 'The Free plan gives you full access to customer management, scheduling, quotes, invoices, and online booking for your first 100 jobs with zero time limits and no credit card required.',
            },
            {
              q: 'Can I import my existing contacts and jobs from Jobber or spreadsheets?',
              a: 'Yes. Fieseros provides 1-click CSV import tools for customers, past job histories, and price lists. Our team also provides free white-glove onboarding assistance.',
            },
            {
              q: 'Does Fieseros take a cut of my customer payments?',
              a: 'No. Fieseros charges 0% platform commission on payments. Funds process directly through your connected Stripe merchant account at standard interchange rates.',
            },
            {
              q: 'How does the 24/7 AI Voice Receptionist work?',
              a: 'You get a dedicated local business number or forward your existing phone line. When a customer calls, our AI answers in natural voice, answers questions, captures job details, and schedules visits directly into your Fieseros calendar.',
            },
            {
              q: 'Does Fieseros work on my technicians\' mobile phones?',
              a: 'Yes. Fieseros is a full Progressive Web App (PWA) compatible with all iOS and Android devices. Technicians can view job routes, capture photos, update work orders, and collect payments on-site.',
            },
          ].map((item, idx) => (
            <AccordionItem key={idx} value={`item-${idx}`} className="border rounded-xl px-4 bg-background">
              <AccordionTrigger className="text-sm font-semibold hover:text-emerald-600 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 11 — FINAL CALL TO ACTION BANNER
      ══════════════════════════════════════════════════════════════════════ */}
      <section className="py-24 text-center bg-gradient-to-b from-emerald-50/60 to-background dark:from-emerald-950/20 dark:to-background border-t">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <Badge className="bg-emerald-600 text-white text-xs">Get Started in 2 Minutes</Badge>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground">
            Run your entire service business with Fieseros.
          </h2>
          <p className="text-base text-muted-foreground max-w-xl mx-auto">
            Join thousands of trade and service professionals who stopped juggling 10 disconnected apps and started growing with one AI-powered system.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={onGetStarted}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm h-12 px-8 rounded-2xl cursor-pointer shadow-xl"
            >
              Start Free (100 Jobs Free) →
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-sm h-12 px-8 rounded-2xl hover:border-emerald-500 hover:text-emerald-700">
              <Link href="/gptform">Explore GPTForm™ AI Forms</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════
          SECTION 12 — FOOTER (Full Cornerstone & Legal Links)
      ══════════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-border/80 bg-slate-950 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-slate-800">
            <div className="space-y-2 max-w-md">
              <Link href="/" className="flex items-center gap-2.5">
                <BrandMark size={32} className="shadow-black/20" />
                <span className="text-lg font-bold text-white tracking-tight">
                  Fieseros <span className="text-emerald-400">Service OS</span>
                </span>
              </Link>
              <p className="text-xs text-slate-400 leading-relaxed">
                An all-in-one software platform and local marketplace designed to help field service companies and trade businesses run their operations, build websites, and find customers.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 text-xs font-semibold">
                <ShieldCheck className="size-3.5" /> 100% Direct Payouts (0% Commission)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-xs">
            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Platform</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/customer-crm" className="hover:text-emerald-400 transition">Customer CRM</Link></li>
                <li><Link href="/scheduling-and-dispatch" className="hover:text-emerald-400 transition">Scheduling &amp; Dispatch</Link></li>
                <li><Link href="/invoicing-and-payments" className="hover:text-emerald-400 transition">Quotes &amp; Invoicing</Link></li>
                <li><Link href="/technician-app" className="hover:text-emerald-400 transition">Technician App</Link></li>
                <li><Link href="/automations" className="hover:text-emerald-400 transition">Automations</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">AI &amp; Forms</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/gptform" className="text-emerald-400 font-semibold hover:underline transition">GPTForm™ AI Platform</Link></li>
                <li><Link href="/#ai-receptionist" className="hover:text-emerald-400 transition">24/7 AI Voice Receptionist</Link></li>
                <li><Link href="/templates" className="hover:text-emerald-400 transition">20,000+ Form Templates</Link></li>
                <li><Link href="/templates/quote" className="hover:text-emerald-400 transition">Quote Calculators</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Free Tools</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/invoice-generator" className="hover:text-emerald-400 transition">Invoice Generator</Link></li>
                <li><Link href="/estimate-generator" className="hover:text-emerald-400 transition">Estimate Generator</Link></li>
                <li><Link href="/proposal-generator" className="hover:text-emerald-400 transition">Proposal Generator</Link></li>
                <li><Link href="/job-cost-calculator" className="hover:text-emerald-400 transition">Job Cost Calculator</Link></li>
                <li><Link href="/tools" className="text-emerald-400 hover:underline transition">All Free Tools →</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Industries</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/hvac-software" className="hover:text-emerald-400 transition">HVAC Software</Link></li>
                <li><Link href="/plumbing-software" className="hover:text-emerald-400 transition">Plumbing Software</Link></li>
                <li><Link href="/electrical-contractor-software" className="hover:text-emerald-400 transition">Electrical Software</Link></li>
                <li><Link href="/cleaning-business-software" className="hover:text-emerald-400 transition">Cleaning Business</Link></li>
                <li><Link href="/roofing-software" className="hover:text-emerald-400 transition">Roofing Software</Link></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/marketplace" className="hover:text-emerald-400 transition">Pro Marketplace</Link></li>
                <li><Link href="/#pricing" className="hover:text-emerald-400 transition">Pricing Plans</Link></li>
                <li><Link href="/blog" className="hover:text-emerald-400 transition">Contractor Blog</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-emerald-400 transition">Terms of Service</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-emerald-400 transition">Privacy Policy</Link></li>
                <li><Link href="/contact-us" className="hover:text-emerald-400 transition">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© {new Date().getFullYear()} Fieseros. All-in-one platform &amp; local marketplace for service businesses.</p>
            <span>Powered by Amazon SES &amp; OpenAI/Anthropic/Gemini</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
