'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Bot,
  CalendarCheck,
  Check,
  ChevronDown,
  CircleDollarSign,
  Code2,
  FileCheck2,
  FormInput,
  Layers,
  MessageCircle,
  MousePointer2,
  Paperclip,
  Play,
  Send,
  ShieldCheck,
  Sparkle,
  Wand2,
  X,
  Zap,
  ArrowRight,
  Store,
  ClipboardList,
  Menu,
  Lock,
  Loader2,
  CreditCard,
  DollarSign,
  Smartphone,
  CheckCircle2,
  HelpCircle,
  FileInput,
  Home,
  Briefcase,
  Wrench,
  Calculator,
  Receipt,
  Globe,
  Star,
  CheckSquare,
  Scale,
  Users,
  Calendar,
  Share2,
  Download,
  AlertTriangle,
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { BusinessPageDemo } from '@/components/gptform/flow/business-page-demo';
import { CustomerTrustStrip } from '@/components/gptform/sections/customer-trust-strip';
import { SecurityBadges } from '@/components/gptform/sections/security-badges';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function GptFormClientView() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');
  const [promptInput, setPromptInput] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const getTierPrice = (base: number) => {
    if (billingPeriod === 'yearly') {
      return (base * (10 / 12)).toFixed(2).replace(/\.00$/, '');
    }
    return base.toString();
  };

  const handleCreateWithPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    const query = promptInput.trim();
    if (query) {
      router.push(`/register?prompt=${encodeURIComponent(query)}`);
    } else {
      router.push('/register');
    }
  };

  const samplePrompts = [
    'Consultant page with 1:1 strategy calls & Series-A pitch review',
    'Freelance UI/UX designer with portfolio audits & Figma design kit',
    'Executive career coach with 45-min Zoom sessions & salary negotiation guide',
    'Tech agency with scoping inquiry form, architecture audits & retainer booking',
  ];

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-700">
      {/* ── Frosted Header ── */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-200 pt-[env(safe-area-inset-top,0px)]',
          scrolled
            ? 'border-b border-border/70 bg-hero/95 backdrop-blur-xl shadow-xs'
            : 'border-b border-border/50 bg-hero/85 backdrop-blur-md'
        )}
      >
        <div className="page-shell flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Fieseros AI home">
              <BrandMark size={32} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 leading-none">
                  Fieseros <span className="text-emerald-600 font-extrabold">AI</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  AI Business Pages &amp; Service OS
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
              {/* Products Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer text-xs font-semibold">
                    Products <ChevronDown className="size-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-84 p-2 shadow-xl border border-border bg-card">
                  <DropdownMenuItem asChild>
                    <Link href="/gptform" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <FileInput className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">GPTForm™ AI Business Page</p>
                        <p className="text-[11px] text-muted-foreground">One link to talk to customers, book calls, sell services &amp; get paid</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/chatbot" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                        <Sparkles className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">AI Chatbot Builder</p>
                        <p className="text-[11px] text-muted-foreground">11-channel AI chatbot with instant knowledge crawling &amp; booking</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/ai-employee" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-600">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">24/7 AI Voice Receptionist</p>
                        <p className="text-[11px] text-muted-foreground">Answers inbound calls, quotes prices &amp; books appointments 24/7</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/ai-agent" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                        <Layers className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">24/7 AI Employee &amp; Agent</p>
                        <p className="text-[11px] text-muted-foreground">Autonomous CRM dispatch, instant quoting &amp; automated workflows</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/templates" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                        <Store className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">20,000+ Form &amp; Page Templates</p>
                        <p className="text-[11px] text-muted-foreground">Pre-built intake forms, booking calendars, and service storefronts</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Templates Link */}
              <Link
                href="/templates"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition text-xs font-semibold"
              >
                <span>Templates</span>
                <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                  20K+
                </span>
              </Link>

              {/* Chatbot Builder Link */}
              <Link
                href="/chatbot"
                className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition text-xs font-semibold"
              >
                Chatbot
              </Link>

              {/* Voice Receptionist Link */}
              <Link
                href="/ai-employee"
                className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition text-xs font-semibold"
              >
                Voice AI
              </Link>

              {/* Pricing Link */}
              <a
                href="#pricing"
                className="px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition text-xs font-semibold"
              >
                Pricing
              </a>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="hidden sm:flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3.5 rounded-lg transition"
            >
              Sign In
            </Link>

            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-xs"
            >
              <Link href="/register">
                <span>Create Your Page Free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <ThemeToggle showDropdown />
          </div>

          {/* Mobile Menu Trigger */}
          <div className="flex sm:hidden items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => setMobileOpen((val) => !val)}
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Sheet */}
        {mobileOpen && (
          <div className="border-t border-border bg-card p-4 sm:hidden animate-fade-in shadow-xl">
            <nav className="grid gap-2">
              <Link
                href="/register"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 p-3 text-xs font-bold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Create Your Page Free <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/gptform"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                ✨ GPTForm™ AI Business Page
              </Link>
              <Link
                href="/chatbot"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                🤖 AI Chatbot Builder
              </Link>
              <Link
                href="/ai-employee"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                📞 24/7 AI Voice Receptionist
              </Link>
              <Link
                href="/ai-agent"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                🧠 24/7 AI Employee &amp; Agent
              </Link>
              <Link
                href="/templates"
                className="flex items-center justify-between rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                <span>Templates Library</span>
                <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">20K+</Badge>
              </Link>
              <a
                href="#pricing"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Pricing Plans
              </a>
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="w-full text-left rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted block"
              >
                Sign In
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* ── SECTION 1: HERO — "One Link. Your Entire Business." ── */}
      <section id="top" className="relative pt-10 sm:pt-16 pb-12 sm:pb-20 border-b border-border/60 bg-gradient-to-b from-emerald-500/5 via-teal-500/5 to-background">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
          <div className="max-w-xl animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider mb-4">
              <Sparkles className="size-3.5 animate-pulse text-emerald-600" />
              ONE LINK. YOUR ENTIRE BUSINESS. · GPTFORM
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-foreground">
              Your Business.{' '}
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                One AI-Powered Page.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
              One link to talk to customers, capture leads, book appointments, sell services, and get paid. Without stitching together Linktree, Typeform, Calendly, and Stripe.
            </p>

            {/* Interactive Prompt Generator Box */}
            <form onSubmit={handleCreateWithPrompt} className="mt-7">
              <div className="flex flex-col sm:flex-row items-center gap-2 p-2 bg-background rounded-2xl border-2 border-emerald-500/30 shadow-xl shadow-emerald-500/10 hover:border-emerald-500/60 transition-all">
                <div className="flex items-center gap-2.5 px-3 w-full">
                  <Wand2 className="size-5 text-emerald-600 shrink-0" />
                  <Input
                    type="text"
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Describe your business: e.g. B2B advisor with 1:1 calls &amp; strategy audits..."
                    className="border-none shadow-none focus-visible:ring-0 text-xs sm:text-sm px-0 h-10 placeholder:text-muted-foreground/70"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shrink-0 cursor-pointer shadow-md shadow-emerald-600/30"
                >
                  Generate Page Free <ArrowRight className="size-4 ml-1.5" />
                </Button>
              </div>

              {/* Sample Prompt Chips */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="font-semibold text-foreground/80">Try:</span>
                {samplePrompts.slice(0, 2).map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPromptInput(p)}
                    className="hover:text-emerald-600 cursor-pointer underline underline-offset-2 transition truncate max-w-[280px]"
                  >
                    &ldquo;{p}&rdquo;
                  </button>
                ))}
              </div>
            </form>

            {/* Micro value props */}
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
              {[
                'Free Forever Tier ($0)',
                '0% Platform Transaction Fees',
                'No Credit Card Required',
                'Live in 30 Seconds',
                'Stripe & UPI Payments',
              ].map((item) => (
                <span key={item} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-600 font-bold" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          {/* Interactive Live Business Page Preview Simulator */}
          <div className="w-full">
            <BusinessPageDemo />
          </div>
        </div>

        {/* Outcome Trust Strip */}
        <div className="mt-14 border-y border-border bg-muted/40 py-4">
          <div className="page-shell grid gap-4 sm:grid-cols-3">
            {[
              { icon: Globe, text: 'Custom fieseros.com/p/yourname profile with verified badges' },
              { icon: Bot, text: '24/7 AI Conversational Assistant answers queries & qualifies leads' },
              { icon: CreditCard, text: 'Direct 1:1 call bookings, priority Q&A & digital downloads with 0% fee' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-3 text-center text-xs sm:text-sm font-semibold text-foreground">
                <Icon className="size-4 text-emerald-600 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: THE PROBLEM — "Stop Sending Customers to 5 Disconnected Tools" ── */}
      <section className="py-16 sm:py-24 border-b border-border/60 bg-surface">
        <div className="page-shell">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              The Broken Multi-Tool Nightmare
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Why Are You Sending Customers Through a 5-Click Maze?
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              When a potential client clicks your bio link today, they are forced to bounce across multiple disconnected SaaS subscriptions. Over 60% of interested buyers abandon before booking.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-2">
            {/* The Old Broken Stack */}
            <div className="p-6 sm:p-8 rounded-2xl border-2 border-red-500/20 bg-red-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle className="size-4" /> Traditional Broken Stack
                </span>
                <Badge variant="outline" className="text-red-600 border-red-500/30 text-xs font-bold">
                  $110+/month
                </Badge>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { tool: 'Linktree ($10/mo)', action: 'Customer clicks bio link, sees a wall of plain buttons.' },
                  { tool: 'External Website', action: 'Customer searches for portfolio, gets lost in navigation.' },
                  { tool: 'Typeform ($35/mo)', action: 'Customer fills a long static questionnaire.' },
                  { tool: 'Calendly ($16/mo)', action: 'Forced to open another tab to check calendar availability.' },
                  { tool: 'Stripe Checkout', action: 'Redirected to a generic checkout screen.' },
                  { tool: 'Separate CRM ($50/mo)', action: 'Data gets trapped in silos with no automated AI follow-up.' },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-background/80 border border-red-500/20 text-xs">
                    <span className="grid size-5 rounded-full bg-red-500/10 text-red-600 font-bold shrink-0 place-items-center text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-bold text-foreground">{item.tool}:</span>{' '}
                      <span className="text-muted-foreground">{item.action}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center text-xs font-bold text-red-600">
                Result: High drop-off, frustrated clients, and $1,300+ in annual software waste.
              </div>
            </div>

            {/* The GPTForm Unified Model */}
            <div className="p-6 sm:p-8 rounded-2xl border-2 border-emerald-500/30 bg-emerald-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="size-4" /> GPTForm One Unified Page
                </span>
                <Badge className="bg-emerald-600 text-white text-xs font-bold">
                  Free or $10/mo • 0% Fees
                </Badge>
              </div>

              <div className="space-y-3 pt-2">
                {[
                  {
                    step: 'One Verified Link (fieseros.com/p/you)',
                    desc: 'Your bio, social proof, verified ratings, and branding in one sleek interface.',
                  },
                  {
                    step: '24/7 AI Knowledge Assistant',
                    desc: 'Answers client questions instantly grounded in your past work and guidelines.',
                  },
                  {
                    step: '1:1 Consultations & Calendar Booking',
                    desc: 'Clients choose a slot and book directly without leaving your page.',
                  },
                  {
                    step: 'Digital Downloads & Priority Q&A',
                    desc: 'Sell playbooks, code templates, or fast-track video reviews in seconds.',
                  },
                  {
                    step: 'Dynamic Intake & Quote Forms',
                    desc: 'Collect custom project scopes, files, and binding e-signatures seamlessly.',
                  },
                  {
                    step: 'Built-in CRM & Instant Payouts',
                    desc: 'Every client and payment lands directly in your unified dashboard with 0% platform fee.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-2.5 rounded-xl bg-background border border-emerald-500/30 text-xs shadow-xs">
                    <span className="grid size-5 rounded-full bg-emerald-600 text-white font-bold shrink-0 place-items-center text-[10px]">
                      <Check className="size-3" />
                    </span>
                    <div>
                      <span className="font-bold text-foreground">{item.step}:</span>{' '}
                      <span className="text-muted-foreground">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-center text-xs font-bold text-emerald-600">
                Result: Instant conversions, zero friction, and one clean link for your entire business.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 3: THE OUTCOME GRID — "What Can Customers Do on Your Page?" ── */}
      <section className="py-16 sm:py-24 border-b border-border/60">
        <div className="page-shell">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              One Page • Endless Outcomes
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              What Can Customers Do on Your Page?
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Every customer arrives with a different need. GPTForm dynamically serves them all from a single URL.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: MessageCircle,
                badge: 'TALK',
                title: '24/7 AI Conversations',
                description:
                  'Visitors can ask questions about your pricing, past case studies, process, or availability. Your AI responds with accurate answers grounded in your profile.',
              },
              {
                icon: FileInput,
                badge: 'TELL',
                title: 'Smart Intake & Scope Forms',
                description:
                  'Need custom project details? Multi-step dynamic forms collect briefs, budget ranges, and project files with JotForm-grade calculations.',
              },
              {
                icon: Calendar,
                badge: 'BOOK',
                title: 'Live 1:1 Calendar Scheduling',
                description:
                  'Bidirectional sync with Google Calendar and Outlook. Display real-time availability for 15-min discovery calls or paid strategy sessions.',
              },
              {
                icon: CreditCard,
                badge: 'PAY',
                title: '0% Platform Fee Checkout',
                description:
                  'Accept global payments through Stripe, Creem MoR, Apple Pay, Google Pay, and UPI. Keep 100% of your earnings with zero platform cut.',
              },
              {
                icon: Download,
                badge: 'BUY',
                title: 'Digital Products & Guides',
                description:
                  'Sell downloadable Notion templates, design kits, PDF playbooks, or code starter packs with automated, secure instant download delivery.',
              },
              {
                icon: Users,
                badge: 'CONVERT',
                title: 'Unified CRM & Lead Capture',
                description:
                  'Every chat interaction, form submission, and booked call automatically registers in your built-in CRM with status tracking and follow-up automations.',
              },
            ].map((card, idx) => {
              const Icon = card.icon;
              return (
                <div
                  key={idx}
                  className="p-6 rounded-2xl border border-border bg-card hover:border-emerald-500/40 hover:shadow-lg transition-all space-y-3 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <Icon className="size-5" />
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold tracking-wider text-emerald-600 border-emerald-500/30">
                      {card.badge}
                    </Badge>
                  </div>
                  <h3 className="text-lg font-bold text-foreground">{card.title}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    {card.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: THE CUSTOMER JOURNEY — "From Hello to Paid" ── */}
      <section className="py-16 sm:py-24 border-b border-border/60 bg-muted/20">
        <div className="page-shell">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              Frictionless Conversion Funnel
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              From &ldquo;Hello&rdquo; to Paid in Under 2 Minutes
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Watch how effortlessly a cold social media follower turns into a high-ticket paying client.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: '01',
                title: 'Visitor Clicks Your Link',
                desc: 'Arrives from your Instagram bio, LinkedIn profile, Twitter header, or WhatsApp status directly to fieseros.com/p/yourname.',
              },
              {
                step: '02',
                title: 'AI Clarifies & Qualifies',
                desc: 'Client asks questions about your process or rates. The AI provides instant verified answers and guides them to the best service.',
              },
              {
                step: '03',
                title: 'Instant Booking & Payment',
                desc: 'Client selects a live calendar slot and pays securely via card, Apple Pay, or UPI. 0% platform fee deducted.',
              },
              {
                step: '04',
                title: 'Auto-Sync to Calendar & CRM',
                desc: 'Google Meet link generated, calendar invites sent, invoice emailed, and client profile created in your CRM dashboard.',
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="relative p-6 rounded-2xl border border-border bg-background shadow-xs hover:border-emerald-500/40 transition-all space-y-3"
              >
                <div className="text-3xl font-extrabold text-emerald-600/30">
                  {step.step}
                </div>
                <h4 className="text-base font-bold text-foreground">{step.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: AUDIENCE CARDS — "Built for Professionals Who Sell Expertise" ── */}
      <section className="py-16 sm:py-24 border-b border-border/60">
        <div className="page-shell">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              Versatile &amp; Tailored
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Who Is GPTForm Built For?
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Whether you are an independent creator or a high-end advisory firm, GPTForm gives you the ultimate digital front door.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                persona: 'Freelancers & Developers',
                icon: Code2,
                items: ['Project scoping intake forms', 'UI/UX & code audits', 'Digital boilerplate sales', 'Client retainer bookings'],
              },
              {
                persona: 'Consultants & Advisors',
                icon: Briefcase,
                items: ['1:1 Strategy consultations', 'Priority 24-hr Q&A reviews', 'Financial & GTM models', 'Advisory retainer inquiries'],
              },
              {
                persona: 'Coaches & Educators',
                icon: Star,
                items: ['Free discovery calls', '60-min coaching packages', 'Course & workbook downloads', 'Automated student reminders'],
              },
              {
                persona: 'Agencies & Studios',
                icon: Layers,
                items: ['Client onboarding questionnaires', 'Scope of work approval forms', 'Deposit & invoice collection', 'Multi-staff booking calendars'],
              },
              {
                persona: 'Creators & Content Experts',
                icon: Store,
                items: ['Topmate-style bio storefront', 'Ask me anything video responses', 'Digital asset downloads', 'Sponsorship intake inquiries'],
              },
              {
                persona: 'Home & Field Pros',
                icon: Wrench,
                items: ['Emergency service bookings', 'Instant quote price calculators', 'Damage photo uploads', 'Direct CRM dispatch sync'],
              },
            ].map((aud, idx) => {
              const Icon = aud.icon;
              return (
                <div key={idx} className="p-6 rounded-2xl border border-border bg-card space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="font-bold text-base text-foreground">{aud.persona}</h3>
                  </div>
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {aud.items.map((it, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="size-3.5 text-emerald-600 shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: COMPARISON TABLE — "GPTForm vs. The Alternative Tools" ── */}
      <section className="py-16 sm:py-24 border-b border-border/60 bg-surface">
        <div className="page-shell">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              Complete Feature Comparison
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Why Pay for 5 Subscriptions When 1 Does It All?
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Compare GPTForm against Linktree, Calendly, Typeform, and Topmate.
            </p>
          </div>

          <div className="mt-12 overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="p-4 font-bold text-foreground">Feature</th>
                  <th className="p-4 font-bold text-emerald-600 bg-emerald-500/10">GPTForm™</th>
                  <th className="p-4 font-medium text-muted-foreground">Linktree</th>
                  <th className="p-4 font-medium text-muted-foreground">Calendly</th>
                  <th className="p-4 font-medium text-muted-foreground">Typeform</th>
                  <th className="p-4 font-medium text-muted-foreground">Topmate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { name: '24/7 AI Conversational Assistant', gpt: true, link: false, cal: false, type: false, top: false },
                  { name: 'Custom Public Profile (fieseros.com/p/you)', gpt: true, link: true, cal: false, type: false, top: true },
                  { name: '1:1 & Group Calendar Scheduling', gpt: true, link: false, cal: true, type: false, top: true },
                  { name: 'Multi-Step Smart Intake Forms', gpt: true, link: false, cal: false, type: true, top: false },
                  { name: 'Digital Product Downloads', gpt: true, link: false, cal: false, type: false, top: true },
                  { name: 'Platform Transaction Fee', gpt: '0%', link: '0% - 10%', cal: '0%', type: 'N/A', top: '7% - 10%' },
                  { name: 'JotForm-Grade Formula Calculations', gpt: true, link: false, cal: false, type: false, top: false },
                  { name: 'Built-in CRM & Pipeline Sync', gpt: true, link: false, cal: false, type: false, top: false },
                  { name: '20,000+ Pre-built Templates', gpt: true, link: false, cal: false, type: 'Limited', top: false },
                  { name: 'Typical Monthly Cost', gpt: '$0 - $19', link: '$10', cal: '$16', type: '$35', top: '10% Cut' },
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-muted/30 transition-colors">
                    <td className="p-4 font-medium text-foreground">{row.name}</td>
                    <td className="p-4 font-bold text-emerald-600 bg-emerald-500/5">
                      {typeof row.gpt === 'boolean' ? (
                        row.gpt ? <Check className="size-4 text-emerald-600" /> : <X className="size-4 text-muted-foreground" />
                      ) : (
                        row.gpt
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {typeof row.link === 'boolean' ? (
                        row.link ? <Check className="size-4 text-foreground" /> : <X className="size-4 text-muted-foreground/40" />
                      ) : (
                        row.link
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {typeof row.cal === 'boolean' ? (
                        row.cal ? <Check className="size-4 text-foreground" /> : <X className="size-4 text-muted-foreground/40" />
                      ) : (
                        row.cal
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {typeof row.type === 'boolean' ? (
                        row.type ? <Check className="size-4 text-foreground" /> : <X className="size-4 text-muted-foreground/40" />
                      ) : (
                        row.type
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {typeof row.top === 'boolean' ? (
                        row.top ? <Check className="size-4 text-foreground" /> : <X className="size-4 text-muted-foreground/40" />
                      ) : (
                        row.top
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── SECTION 7: 20,000+ TEMPLATES BANNER ── */}
      <section className="py-16 sm:py-20 border-b border-border/60 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white">
        <div className="page-shell flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-2xl space-y-3">
            <Badge className="bg-white/20 text-white border-none text-xs font-bold uppercase tracking-wider">
              20,000+ Ready-To-Use Templates
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Start with a Proven Template. Customize in Seconds.
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Explore thousands of pre-configured client intake forms, consultation schedulers, service menus, and price calculators across 80+ industries.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button
              asChild
              size="lg"
              className="bg-white text-emerald-900 hover:bg-white/90 font-bold text-sm h-12 px-6 rounded-xl shadow-lg cursor-pointer"
            >
              <Link href="/templates">
                Browse Template Library <ArrowRight className="size-4 ml-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTION 8: PRICING PLANS ── */}
      <section id="pricing" className="py-16 sm:py-24 border-b border-border/60">
        <div className="page-shell">
          <div className="text-center max-w-3xl mx-auto">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              Simple &amp; Transparent
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Always 0% Platform Transaction Fees
            </h2>
            <p className="mt-4 text-muted-foreground text-sm sm:text-base leading-relaxed">
              Keep 100% of the money you earn. No revenue cuts, no surprise charges.
            </p>

            {/* Billing Toggle */}
            <div className="mt-8 inline-flex items-center gap-3 p-1 rounded-full bg-muted border border-border">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold rounded-full transition cursor-pointer',
                  billingPeriod === 'monthly' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                )}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={cn(
                  'px-4 py-1.5 text-xs font-semibold rounded-full transition flex items-center gap-1.5 cursor-pointer',
                  billingPeriod === 'yearly' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                )}
              >
                <span>Yearly</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-1.5 py-0.2 rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
            {/* Free Tier */}
            <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Free Forever</h3>
                  <p className="text-xs text-muted-foreground mt-1">For freelancers &amp; creators getting started</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-border">
                  {[
                    '1 Public AI Business Page',
                    '3 Active Smart Forms',
                    '100 Submissions / month',
                    '1:1 Calendar Scheduling',
                    '0% Platform Transaction Fees',
                    'Stripe & UPI Payments',
                    '20,000+ Free Templates',
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full h-11 text-xs font-semibold rounded-xl cursor-pointer">
                <Link href="/register">Start Free — No Card Needed</Link>
              </Button>
            </div>

            {/* Pro Tier (Popular) */}
            <div className="relative p-6 sm:p-8 rounded-2xl border-2 border-emerald-500 bg-card shadow-xl space-y-6 flex flex-col justify-between">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                MOST POPULAR
              </span>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Starter Pro</h3>
                  <p className="text-xs text-muted-foreground mt-1">For independent consultants &amp; professionals</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">${getTierPrice(10)}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-border">
                  {[
                    'Custom Domain (yourname.com)',
                    'Unlimited Digital Products & Services',
                    '10 Active Forms & 1,000 Submissions/mo',
                    'JotForm-Grade Formula Pad Calculations',
                    'Digital E-Signatures Canvas',
                    '0% Platform Transaction Fees',
                    'Google Calendar & Outlook Bidirectional Sync',
                    'Direct CRM Integration',
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 font-bold shrink-0" />
                      <span className="text-foreground/90 font-medium">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild className="w-full h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer">
                <Link href="/register">Get Started with Pro</Link>
              </Button>
            </div>

            {/* Business Tier */}
            <div className="p-6 sm:p-8 rounded-2xl border border-border bg-card space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">Agency &amp; Business</h3>
                  <p className="text-xs text-muted-foreground mt-1">For growing agencies, coaches &amp; multi-staff firms</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-foreground">${getTierPrice(19)}</span>
                  <span className="text-xs text-muted-foreground">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-muted-foreground pt-4 border-t border-border">
                  {[
                    'Unlimited Pages & Unlimited Forms',
                    '10,000 Submissions / month',
                    '24/7 AI Conversational Knowledge Agent',
                    'Team Members & Multi-Host Booking',
                    'Remove Fieseros Branding (White-label)',
                    'Webhook & Zapier/Make Automations',
                    'Priority 24/7 SLA Support',
                  ].map((feat, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button asChild variant="outline" className="w-full h-11 text-xs font-semibold rounded-xl cursor-pointer">
                <Link href="/register">Start Business Free</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FAQ ACCORDION ── */}
      <section className="py-16 sm:py-24 border-b border-border/60 bg-muted/20">
        <div className="page-shell max-w-4xl">
          <div className="text-center">
            <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-bold uppercase tracking-wider mb-3">
              Frequently Asked Questions
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Everything You Need to Know
            </h2>
          </div>

          <div className="mt-12">
            <Accordion type="single" collapsible className="w-full space-y-3">
              {[
                {
                  q: 'What is GPTForm and how does the AI Business Page work?',
                  a: 'GPTForm is your all-in-one AI-powered business page. Instead of sending visitors to multiple disconnected tools (Linktree, Typeform, Calendly, and Stripe), GPTForm gives you a single link (fieseros.com/p/yourname) where visitors can chat with your 24/7 AI assistant, fill project intake forms, book 1:1 consultations, buy digital products, and pay securely.',
                },
                {
                  q: 'Can I replace Linktree, Calendly, and Typeform with GPTForm?',
                  a: 'Yes! GPTForm replaces your entire disconnected tool stack. You get an AI-powered link-in-bio, automated calendar scheduling, multi-step intake forms, digital product checkouts, and CRM lead capture all in one unified platform—saving you over $130 per month.',
                },
                {
                  q: 'How does the 24/7 AI Assistant work on my page?',
                  a: 'Your personal AI assistant is trained on your bio, portfolio, pricing, services, and FAQs. When potential clients visit your page, the AI answers their questions, clarifies requirements, recommends the right service, and guides them straight into booking or submitting a proposal.',
                },
                {
                  q: 'What are the platform transaction fees?',
                  a: 'GPTForm charges 0% platform transaction fees. Whether you sell a $99 strategy session, a $49 digital guide, or accept a deposit on a $5,000 project, you keep 100% of your earnings minus your processor standard interchange fee (Stripe or Creem MoR).',
                },
                {
                  q: 'Which payment methods and currencies are supported?',
                  a: 'We support 33+ global payment gateways including Stripe, Creem MoR, Apple Pay, Google Pay, credit/debit cards, and UPI (India). Currencies automatically adapt based on visitor location (e.g. USD, EUR, GBP, INR, CAD, AUD).',
                },
                {
                  q: 'Can I still build standalone embeddable forms?',
                  a: 'Absolutely! You can build standalone forms, price quote calculators, customer surveys, and payment forms and embed them in 1 click into WordPress, Webflow, Shopify, Framer, Squarespace, or HTML.',
                },
                {
                  q: 'How does the 1:1 scheduling sync with my calendar?',
                  a: 'GPTForm synchronizes bidirectionally with Google Calendar and Outlook 365. It respects your existing busy times, sets custom buffer zones between meetings, and automatically generates Google Meet or Zoom video links upon booking.',
                },
                {
                  q: 'Is there a free forever plan?',
                  a: 'Yes! Our Free Forever tier gives you 1 AI-powered business page, 3 smart forms, 100 submissions per month, calendar booking, 0% platform fees, and access to 20,000+ templates with no credit card required.',
                },
              ].map((item, idx) => (
                <AccordionItem
                  key={idx}
                  value={`faq-${idx}`}
                  className="rounded-xl border border-border bg-card px-4 shadow-xs"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base font-bold text-foreground py-4 hover:no-underline">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ── SECTION 10: BOTTOM CALL TO ACTION ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-background to-emerald-500/10 border-b border-border/60">
        <div className="page-shell text-center max-w-3xl mx-auto space-y-6">
          <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Claim Your AI Business Page Today
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Stop losing clients in fragmented links. Build your unified page in 30 seconds and start accepting bookings and payments.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 cursor-pointer"
            >
              <Link href="/register">
                Create Your Free Page <ArrowRight className="size-4 ml-2" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-6 font-semibold text-sm rounded-xl cursor-pointer"
            >
              <Link href="/templates">Explore 20,000+ Templates</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground font-medium pt-2">
            Free forever tier • No credit card required • 0% platform transaction fees
          </p>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border bg-card py-12 text-xs text-muted-foreground">
        <div className="page-shell grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
              <BrandMark size={24} />
              <span>Fieseros AI Studio</span>
            </div>
            <p className="mt-3 leading-relaxed">
              The all-in-one AI business page, smart forms, voice reception, and autonomous service OS.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">AI Products</h4>
            <ul className="space-y-2">
              <li><Link href="/gptform" className="hover:text-foreground">GPTForm™ AI Business Page</Link></li>
              <li><Link href="/chatbot" className="hover:text-foreground">AI Chatbot Builder</Link></li>
              <li><Link href="/ai-employee" className="hover:text-foreground">24/7 AI Voice Receptionist</Link></li>
              <li><Link href="/ai-agent" className="hover:text-foreground">24/7 AI Employee &amp; Agent</Link></li>
              <li><Link href="/templates" className="hover:text-foreground">20,000+ Form Templates</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">Solutions</h4>
            <ul className="space-y-2">
              <li><Link href="/field-service-software" className="hover:text-foreground">Field Service Software</Link></li>
              <li><Link href="/cleaning-business-software" className="hover:text-foreground">Cleaning Services</Link></li>
              <li><Link href="/plumbing-software" className="hover:text-foreground">Plumbing &amp; HVAC</Link></li>
              <li><Link href="/marketplace" className="hover:text-foreground">Pro Marketplace</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground text-xs uppercase tracking-wider mb-3">Legal &amp; Trust</h4>
            <ul className="space-y-2">
              <li><Link href="/privacy-policy" className="hover:text-foreground">Privacy Policy</Link></li>
              <li><Link href="/terms-of-service" className="hover:text-foreground">Terms of Service</Link></li>
              <li><Link href="/cookie-policy" className="hover:text-foreground">Cookie Policy</Link></li>
              <li><span className="text-emerald-600 font-semibold">0% Platform Fee Guarantee</span></li>
            </ul>
          </div>
        </div>

        <div className="page-shell mt-8 pt-6 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px]">
          <span>© {new Date().getFullYear()} Fieseros AI Inc. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <span>TLS 1.3 Encryption</span>
            <span>GDPR &amp; CCPA Compliant</span>
            <span>Cloudflare Turnstile Verified</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
