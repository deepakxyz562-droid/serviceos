'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { HeroDemo } from '@/components/gptform/flow/hero-demo';
import { StudioDemo } from '@/components/gptform/flow/studio-demo';
import { JourneySection } from '@/components/gptform/flow/journey-section';
import { ModeDemo } from '@/components/gptform/flow/mode-demo';
import { AgentExtract } from '@/components/gptform/flow/agent-extract';
import { SmartLogic } from '@/components/gptform/flow/smart-logic';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function GptFormPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empLoading, setEmpLoading] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
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
      toast.success('Signed in successfully');
      setAuthModalOpen(false);
      window.location.href = '/';
    } catch (err) {
      setEmpError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setEmpLoading(false);
    }
  };

  const getTierPrice = (base: number) => {
    if (billingPeriod === 'yearly') {
      return (base * (10 / 12)).toFixed(2).replace(/\.00$/, '');
    }
    return base.toString();
  };

  // Structured Data Schema for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: 'GPTForm™ AI Form & Conversation Builder',
        operatingSystem: 'All',
        applicationCategory: 'BusinessApplication',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        description:
          'AI-powered form builder and conversational intake engine that converts website visitors into booked appointments and structured CRM leads.',
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: 'Can I add GPTForm to my existing website?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. GPTForm embeds with a single line of JavaScript or iframe on WordPress, Webflow, Shopify, Wix, Squarespace, or any custom website.',
            },
          },
          {
            '@type': 'Question',
            name: 'What happens when a requested appointment time is unavailable?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'The AI assistant automatically queries your calendar and offers next best alternative slots without human intervention.',
            },
          },
          {
            '@type': 'Question',
            name: 'Are conversation answers transferred into the form automatically?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes. Every detail gathered during natural conversation automatically pre-fills the connected form fields so customers never repeat themselves.',
            },
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-700">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* ── Frosted Header (Older navigation content + new modern styling) ── */}
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
                  Smart Forms &amp; Service OS
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
                <DropdownMenuContent align="start" className="w-80 p-2 shadow-xl border border-border bg-card">
                  <DropdownMenuItem asChild>
                    <Link href="/gptform" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <FileInput className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">GPTForm™ Smart Forms</p>
                        <p className="text-[11px] text-muted-foreground">AI form builder, live quote calculators &amp; 0% fee payments</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/#ai-receptionist" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                        <Bot className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">24/7 AI Voice Receptionist</p>
                        <p className="text-[11px] text-muted-foreground">Answers phone calls, quotes prices &amp; books appointments</p>
                      </div>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/#crm-features" className="flex items-start gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-muted">
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                        <Layers className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-xs text-foreground">Field Service OS</p>
                        <p className="text-[11px] text-muted-foreground">Dispatch, technician mobile app, invoicing &amp; CRM</p>
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

              {/* Solutions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition cursor-pointer text-xs font-semibold">
                    Solutions <ChevronDown className="size-3.5 opacity-60" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-72 p-2 shadow-xl border border-border bg-card">
                  <DropdownMenuItem asChild>
                    <Link href="/field-service-software" className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium hover:bg-muted">
                      <Wrench className="size-4 text-emerald-600" />
                      <span>Contractors &amp; Field Service</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/cleaning-business-software" className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium hover:bg-muted">
                      <Home className="size-4 text-teal-600" />
                      <span>Home &amp; Cleaning Services</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/plumbing-software" className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium hover:bg-muted">
                      <Zap className="size-4 text-amber-600" />
                      <span>Plumbing &amp; HVAC Services</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/marketplace" className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-medium hover:bg-muted">
                      <Briefcase className="size-4 text-purple-600" />
                      <span>Verified Pro Marketplace</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

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
            <button
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3.5 rounded-lg transition cursor-pointer"
            >
              Sign In
            </button>

            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-xs"
            >
              <a href="#studio">
                <span>Build Form Free</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </a>
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
              <a
                href="#studio"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 p-3 text-xs font-bold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Build Form Free <ArrowRight className="size-3.5" />
              </a>
              <Link
                href="/templates"
                className="flex items-center justify-between rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                <span>Templates Library</span>
                <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">20K+</Badge>
              </Link>
              <Link
                href="/field-service-software"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Field Service Software
              </Link>
              <Link
                href="/marketplace"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Pro Marketplace
              </Link>
              <a
                href="#pricing"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                Pricing Plans
              </a>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full text-left rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Sign In
              </button>
            </nav>
          </div>
        )}
      </header>

      {/* ── Auth Dialog ── */}
      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-sm p-6 border border-border bg-card">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg font-bold">Sign In to Fieseros</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter your credentials to access your forms and CRM dashboard.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSignIn} className="space-y-3.5 mt-2">
            {empError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2.5 text-xs text-destructive">
                {empError}
              </div>
            )}
            <div>
              <label className="text-xs font-semibold block mb-1">Work Email</label>
              <input
                type="email"
                required
                value={empEmail}
                onChange={(e) => setEmpEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Password</label>
              <input
                type="password"
                required
                value={empPassword}
                onChange={(e) => setEmpPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-9 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <Button
              type="submit"
              disabled={empLoading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 cursor-pointer"
            >
              {empLoading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Lock className="size-3.5 mr-1.5" />}
              {empLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── SECTION 1: HERO (hero-grid) ── */}
      <section id="top" className="hero-grid relative pt-10 sm:pt-16 pb-12 sm:pb-20">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl animate-fade-in">
            <p className="eyebrow text-emerald-600">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              GPTFORM · AI FORM &amp; CONVERSATION BUILDER
            </p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
              Turn website conversations into <span className="text-emerald-600">booked appointments.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
              Add an intelligent AI assistant to any website. It answers visitor questions, checks live availability, quotes calculated prices, and automatically pre-fills the connected booking form.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                asChild
                size="lg"
                className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm cursor-pointer shadow-md rounded-xl"
              >
                <a href="#studio">
                  Build a Form with AI <ArrowRight className="size-4 ml-1.5" />
                </a>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-6 font-semibold text-sm rounded-xl cursor-pointer"
              >
                <Link href="/templates">Explore 20K+ Templates</Link>
              </Button>
            </div>

            {/* Micro value props */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
              {['Free forever tier ($0)', '100 submissions / month', 'No credit card required', '0% payment fees'].map(
                (item) => (
                  <span key={item} className="flex items-center gap-1.5">
                    <Check className="size-3.5 text-emerald-600 font-bold" />
                    {item}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Hero Live Walkthrough Interactive Stepper */}
          <HeroDemo />
        </div>

        {/* 3-Pillar Trust Banner */}
        <div className="mt-14 border-y border-border bg-muted/40 py-4">
          <div className="page-shell grid gap-4 sm:grid-cols-3">
            {[
              { icon: Code2, text: 'Embeds in 1 click on any website (WordPress, Webflow, HTML)' },
              { icon: MessageCircle, text: 'One synchronized data model across chat & forms' },
              { icon: ShieldCheck, text: 'Complete visual control over questions, pricing & logic' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-3 text-center text-xs sm:text-sm font-semibold text-foreground">
                <Icon className="size-4 text-emerald-600 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: AUTHENTIC SAAS BUILDER STUDIO (StudioDemo) ── */}
      <section id="studio" className="section-pad bg-background">
        <div className="page-shell">
          <div className="section-heading max-w-3xl mb-10">
            <p className="eyebrow text-emerald-600">AUTHENTIC SAAS STUDIO</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Describe it in English. GPTForm builds the schema.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground">
              AI generates the initial structure, logic branches, and calculation formulas. You maintain complete visual control over every section, validation rule, and customer experience.
            </p>
          </div>

          <StudioDemo />
        </div>
      </section>

      {/* ── SECTION 3: DARK COMPLETE CUSTOMER JOURNEY (JourneySection) ── */}
      <JourneySection />

      {/* ── SECTION 4: ONE FORM, FOUR EXPERIENCES (ModeDemo) ── */}
      <section className="section-pad bg-background">
        <div className="page-shell">
          <div className="section-heading max-w-3xl mb-10">
            <p className="eyebrow text-emerald-600">ONE FORM, FOUR EXPERIENCES</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Meet each customer in the format they prefer.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground">
              Switch the customer runtime experience between Classic Grid, Step Cards, Interactive Chat, and AI Natural Language without rewriting logic or fragmenting your CRM data.
            </p>
          </div>

          <ModeDemo />
        </div>
      </section>

      {/* ── SECTION 5: AI FORM AGENT & EXTRACTION ENGINE ── */}
      <AgentExtract />

      {/* ── SECTION 6: SMART BUSINESS LOGIC & 12-FIELD PALETTE ── */}
      <SmartLogic />

      {/* ── SECTION 7: 3 VALUE PILLAR CARDS ── */}
      <section className="border-y border-border bg-emerald-500/5 py-16">
        <div className="page-shell grid gap-8 md:grid-cols-3">
          {[
            {
              icon: MousePointer2,
              title: 'Capture higher quality enquiries',
              desc: 'Guided progressive questions collect complete addresses, photo evidence, and symptom details before dispatch.',
            },
            {
              icon: CalendarCheck,
              title: 'Book appointments while intent is high',
              desc: 'Move from initial curiosity to a confirmed calendar slot and deposit in under 2 minutes.',
            },
            {
              icon: Zap,
              title: 'Eliminate repetitive manual data entry',
              desc: 'Directly sync structured customer profiles, line-item quotes, and dispatch packets to your field CRM.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-emerald-500/20 bg-card p-6 shadow-xs">
              <span className="grid size-11 place-items-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── SECTION 8: PRICING (Restored exact older content & structure) ── */}
      <section id="pricing" className="section-pad bg-background">
        <div className="page-shell">
          <div className="section-heading text-center mx-auto max-w-2xl mb-10">
            <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-semibold">Simple Transparent Pricing</Badge>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Start Free. Upgrade As You Scale.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Get 3 forms and 100 free submissions every month at $0 — forever.
            </p>

            {/* Monthly / Yearly Billing Toggle */}
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="inline-flex items-center p-1 rounded-full bg-muted border border-border">
                <button
                  type="button"
                  onClick={() => setBillingPeriod('monthly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer',
                    billingPeriod === 'monthly'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBillingPeriod('yearly')}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5',
                    billingPeriod === 'yearly'
                      ? 'bg-background text-foreground shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Yearly
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 px-1.5 py-0.5 rounded-full font-bold">
                    Save ~17%
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Free</h3>
                <p className="text-xs text-muted-foreground mt-0.5">3 Forms · 100 submissions/month</p>
                <div className="pt-3 pb-1">
                  <span className="font-display text-4xl font-extrabold text-foreground">$0</span>
                  <span className="text-xs text-muted-foreground"> / forever</span>
                </div>
                <div className="my-5 h-px bg-border/60" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  {[
                    '3 Active Smart Forms',
                    '100 Submissions / month',
                    '180+ Templates Library',
                    'Direct Payments (0% fee)',
                    'Universal 1-line Embed',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0 font-bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-7 w-full text-xs font-semibold h-10 cursor-pointer rounded-xl hover:border-emerald-600 hover:text-emerald-600"
              >
                <Link href="/register?plan=free">Start Free Now</Link>
              </Button>
            </div>

            {/* Starter Tier — Recommended Dark Card */}
            <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-500 bg-slate-900 text-white p-6 shadow-xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap shadow-sm">
                RECOMMENDED
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-white">Starter</h3>
                <p className="text-xs text-slate-400 mt-0.5">For active businesses &amp; growing sites</p>
                <div className="pt-3 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-emerald-300">${getTierPrice(10)}</span>
                  <span className="text-xs text-slate-400"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
                </div>
                <div className="my-5 h-px bg-slate-800" />
                <ul className="space-y-2.5 text-xs text-slate-200">
                  {[
                    '10 Active Smart Forms',
                    '1,000 Submissions / month',
                    'AI Form Synthesis & Logic',
                    'Dynamic Math Calculations',
                    'Digital E-Signatures & Booking',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-400 shrink-0 font-bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                className="mt-7 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 cursor-pointer rounded-xl shadow-md"
              >
                <Link href={`/register?plan=starter&interval=${billingPeriod}`}>
                  Get Started (${getTierPrice(10)}/mo) →
                </Link>
              </Button>
            </div>

            {/* Business Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6 shadow-xs">
              <div>
                <h3 className="font-display text-lg font-bold text-foreground">Business</h3>
                <p className="text-xs text-muted-foreground mt-0.5">For multi-team organizations &amp; agencies</p>
                <div className="pt-3 pb-1 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold text-foreground">${getTierPrice(19)}</span>
                  <span className="text-xs text-muted-foreground"> / {billingPeriod === 'yearly' ? 'mo, billed yearly' : 'month'}</span>
                </div>
                <div className="my-5 h-px bg-border/60" />
                <ul className="space-y-2.5 text-xs text-muted-foreground">
                  {[
                    'Unlimited Smart Forms',
                    '10,000 Submissions / month',
                    'Conversational AI Form Agents',
                    'White-labeling & Custom CSS',
                    'Priority Webhook Sync',
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="size-3.5 text-emerald-600 shrink-0 font-bold" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                asChild
                variant="outline"
                className="mt-7 w-full text-xs font-semibold h-10 cursor-pointer rounded-xl hover:border-emerald-600 hover:text-emerald-600"
              >
                <Link href={`/register?plan=business&interval=${billingPeriod}`}>
                  Get Business (${getTierPrice(19)}/mo)
                </Link>
              </Button>
            </div>
          </div>

          {/* CRM Subscriber Perk Banner */}
          <div className="mt-10 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 border border-emerald-500/20 max-w-2xl mx-auto flex items-start gap-3.5 shadow-xs">
            <Sparkles className="size-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-foreground">
              <p className="font-bold mb-0.5">Active Fieseros CRM Subscriber?</p>
              <p className="text-muted-foreground">
                GPTForm™ Unlimited (Business tier features) is included in your CRM subscription at no extra charge.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 11: EXPANDABLE FAQ ── */}
      <section className="section-pad bg-muted/30">
        <div className="page-shell max-w-3xl">
          <div className="section-heading text-center mx-auto mb-10">
            <p className="eyebrow justify-center text-emerald-600">FREQUENTLY ASKED QUESTIONS</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Everything you need to know before you build.
            </h2>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {[
              {
                q: 'How does the AI Form Generator work?',
                a: 'You describe what your form should do in natural language. GPTForm extracts fields, math calculation formulas, validation logic, and styling rules in under 10 seconds. You can edit, customize, or publish immediately.',
              },
              {
                q: 'What is an AI Form Agent?',
                a: 'An AI Form Agent transforms your form into a natural, interactive conversation. Visitors can chat, describe requirements, upload photos, and select dates while the bot validates the input and compiles structured form submissions.',
              },
              {
                q: 'Can customers make payments directly through the form?',
                a: 'Yes. Connect your Stripe account to collect deposits, full invoice payments, or recurring subscriptions directly. Fieseros charges 0% platform transaction fees.',
              },
              {
                q: 'Can I add GPTForm to my existing website without rebuilding?',
                a: 'Yes. Simply copy and paste the 1-line script or iframe snippet into WordPress, Webflow, Shopify, Wix, Squarespace, or custom HTML.',
              },
              {
                q: 'How does live calendar booking prevent double-bookings?',
                a: 'GPTForm connects directly to your Google Calendar, Outlook 365, or ServiceOS CRM schedule. It computes travel buffers and real-time technician availability so only genuine open slots are offered.',
              },
            ].map((item, idx) => (
              <AccordionItem
                key={idx}
                value={`faq-${idx}`}
                className="rounded-xl border border-border bg-card px-4 shadow-2xs"
              >
                <AccordionTrigger className="text-xs sm:text-sm font-semibold hover:no-underline py-4 text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs sm:text-sm text-muted-foreground pb-4 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── SECTION 12: HIGH-IMPACT CLOSING CTA ── */}
      <section className="bg-emerald-700 py-16 sm:py-20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 size-80 rounded-full bg-emerald-500/30 blur-3xl pointer-events-none" />
        <div className="page-shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center relative z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              YOUR NEXT HIGH-VALUE CUSTOMER IS ON YOUR SITE
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Turn your next website conversation into a booked job.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-emerald-100 max-w-xl">
              Start free today with 100 monthly submissions. Zero coding required.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-sm h-12 px-6 rounded-xl cursor-pointer shadow-lg"
            >
              <a href="#studio">
                Build a Form with AI <ArrowRight className="size-4 ml-1.5" />
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white font-semibold text-sm h-12 px-6 rounded-xl cursor-pointer"
            >
              <Link href="/templates">Explore Templates</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTION 13: 5-COLUMN CORNERSTONE FOOTER (Restored exact older content) ── */}
      <footer className="border-t border-border bg-slate-950 text-slate-300 py-16 px-4 sm:px-6 lg:px-8">
        <div className="page-shell space-y-12">
          {/* Top Brand & SEO Definition Row */}
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

          {/* 5-Column Cornerstone Navigation Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 text-xs">
            {/* Col 1: Platform */}
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

            {/* Col 2: AI & Forms */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">AI &amp; Forms</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/gptform" className="text-emerald-400 font-semibold hover:underline transition">GPTForm™ AI Platform</Link></li>
                <li><Link href="/#ai-receptionist" className="hover:text-emerald-400 transition">24/7 AI Voice Receptionist</Link></li>
                <li><Link href="/templates" className="hover:text-emerald-400 transition">20,000+ Form Templates</Link></li>
                <li><Link href="/templates/quote" className="hover:text-emerald-400 transition">Quote Calculators</Link></li>
              </ul>
            </div>

            {/* Col 3: Free Tools */}
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

            {/* Col 4: Industries */}
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

            {/* Col 5: Company */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white uppercase tracking-wider text-[11px]">Company</h4>
              <ul className="space-y-2 text-slate-400">
                <li><Link href="/marketplace" className="hover:text-emerald-400 transition">Pro Marketplace</Link></li>
                <li><a href="#pricing" className="hover:text-emerald-400 transition">Pricing Plans</a></li>
                <li><Link href="/blog" className="hover:text-emerald-400 transition">Contractor Blog</Link></li>
                <li><Link href="/terms-of-service" className="hover:text-emerald-400 transition">Terms of Service</Link></li>
                <li><Link href="/privacy-policy" className="hover:text-emerald-400 transition">Privacy Policy</Link></li>
                <li><Link href="/contact-us" className="hover:text-emerald-400 transition">Contact Us</Link></li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright, Tagline & Infrastructure */}
          <div className="pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
              <p className="text-slate-400 font-medium">AI-powered forms and customer conversations by Fieseros.</p>
              <span className="hidden sm:inline text-slate-700">•</span>
              <p>© {new Date().getFullYear()} Fieseros. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-4 text-slate-400 font-medium">
              <a href="#top" className="hover:text-emerald-400 transition">Back to top ↑</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
