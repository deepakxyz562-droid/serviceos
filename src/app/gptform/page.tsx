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
} from 'lucide-react';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  ProductMegaMenu,
  SolutionsMegaMenu,
  LandingFooter,
} from '@/components/landing/landing-solutions';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { HeroDemo } from '@/components/gptform/flow/hero-demo';
import { StudioDemo } from '@/components/gptform/flow/studio-demo';
import { JourneySection } from '@/components/gptform/flow/journey-section';
import { ModeDemo } from '@/components/gptform/flow/mode-demo';
import { AgentExtract } from '@/components/gptform/flow/agent-extract';
import { SmartLogic } from '@/components/gptform/flow/smart-logic';
import { TemplateGrid } from '@/components/gptform/flow/template-preview-dialog';
import { ConnectedPipeline } from '@/components/gptform/flow/pipeline-section';
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

  const scrollToAnchor = (href: string, e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setMobileOpen(false);
    const target = document.querySelector(href);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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
          priceCurrency: 'GBP',
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

      {/* ── Frosted Navbar matching new clever-form design ── */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full transition-all duration-200 pt-[env(safe-area-inset-top,0px)]',
          scrolled
            ? 'border-b border-border/70 bg-hero/95 backdrop-blur-xl shadow-xs'
            : 'border-b border-border/50 bg-hero/80 backdrop-blur-md'
        )}
      >
        <div className="page-shell flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group shrink-0" aria-label="Fieseros home">
            <BrandMark size={32} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-bold tracking-tight text-foreground flex items-center gap-1.5">
                Fieseros <span className="text-emerald-600 font-extrabold text-xs px-1.5 py-0.5 rounded-md bg-emerald-500/10">GPTForm</span>
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <ProductMegaMenu onAnchorClick={scrollToAnchor} />
            <SolutionsMegaMenu />
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-2 rounded-lg transition-colors"
            >
              <Store className="h-3.5 w-3.5 text-emerald-600" />
              <span>Marketplace</span>
              <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                Pros
              </span>
            </Link>
            <Link
              href="/requests"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted px-3 py-2 rounded-lg transition-colors"
            >
              <ClipboardList className="h-3.5 w-3.5 text-emerald-600" />
              <span>My Requests</span>
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="hidden sm:flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-9 px-4 rounded-lg cursor-pointer shadow-xs"
            >
              <Link href="/request">
                <span>Post Request</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAuthModalOpen(true)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted h-9 px-3 rounded-lg cursor-pointer"
            >
              Sign In
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
                href="/request"
                className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 p-3 text-xs font-bold text-white"
                onClick={() => setMobileOpen(false)}
              >
                Post Request <ArrowRight className="size-3.5" />
              </Link>
              <Link
                href="/marketplace"
                className="flex items-center justify-between rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                <span>Marketplace</span>
                <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">Pros</Badge>
              </Link>
              <Link
                href="/requests"
                className="rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted"
                onClick={() => setMobileOpen(false)}
              >
                My Requests
              </Link>
              <button
                onClick={() => {
                  setMobileOpen(false);
                  setAuthModalOpen(true);
                }}
                className="w-full text-left rounded-lg p-2.5 text-xs font-semibold text-foreground hover:bg-muted cursor-pointer"
              >
                Sign In / Employee Login
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
                <a href="#templates">Explore 12+ Templates</a>
              </Button>
            </div>

            {/* Micro value props */}
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-muted-foreground">
              {['Free forever tier', '100 submissions / month', 'No credit card required', '0% payment fees'].map(
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

      {/* ── SECTION 8: CURATED TEMPLATES CATALOG WITH INTERACTIVE MODAL ── */}
      <section id="templates" className="section-pad bg-background">
        <div className="page-shell">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end mb-10">
            <div className="section-heading mb-0 max-w-2xl">
              <p className="eyebrow text-emerald-600">CURATED TEMPLATE CATALOG</p>
              <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
                Start with a workflow engineered for your trade.
              </h2>
              <p className="mt-3 text-base text-muted-foreground">
                Choose a battle-tested template, preview it across all 4 modes, and customize fields with the AI Copilot.
              </p>
            </div>
          </div>

          <TemplateGrid />
        </div>
      </section>

      {/* ── SECTION 9: CONNECTED 7-STEP WORKFLOW PIPELINE ── */}
      <ConnectedPipeline />

      {/* ── SECTION 10: TRANSPARENT PRICING ── */}
      <section id="pricing" className="section-pad bg-background">
        <div className="page-shell">
          <div className="section-heading text-center mx-auto max-w-2xl mb-12">
            <p className="eyebrow justify-center text-emerald-600">TRANSPARENT PRICING</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Build your first customer journey today.
            </h2>
            <p className="mt-3 text-base text-muted-foreground">
              Start completely free. Scale capacity only as your inbound lead volume grows.
            </p>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              {
                name: 'Free Starter',
                price: '£0',
                period: 'forever',
                popular: false,
                features: [
                  '100 submissions / month',
                  'AI Prompt Studio Builder',
                  'Classic, Card & Chat runtimes',
                  'Website JavaScript embed',
                  '0% Platform transaction fees',
                ],
              },
              {
                name: 'Pro Operator',
                price: '£29',
                period: '/ month',
                popular: true,
                features: [
                  '2,500 submissions / month',
                  'AI Natural Language Agent',
                  'Live Google/Outlook calendar lock',
                  'Dynamic formula calculators',
                  'Custom domain & brand removal',
                  'Instant SMS & Webhook dispatch',
                ],
              },
              {
                name: 'Business Enterprise',
                price: '£89',
                period: '/ month',
                popular: false,
                features: [
                  'Unlimited submissions',
                  'Multi-branch / Multi-clinic routing',
                  'Custom AI system prompt tuning',
                  'Dedicated Webhook & API sync',
                  'Custom SLA & Priority 24/7 support',
                ],
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  'flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 relative',
                  plan.popular
                    ? 'border-emerald-600 bg-emerald-500/5 shadow-xl ring-2 ring-emerald-600'
                    : 'border-border bg-card shadow-xs'
                )}
              >
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-extrabold uppercase text-white shadow-xs">
                    Most Popular
                  </div>
                )}
                <div>
                  <h3 className="font-display text-lg font-bold text-foreground">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground">{plan.period}</span>
                  </div>
                  <div className="my-5 h-px bg-border/60" />
                  <ul className="space-y-2.5 text-xs text-muted-foreground">
                    {plan.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-2">
                        <Check className="size-3.5 text-emerald-600 shrink-0 font-bold" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Button
                  className={cn(
                    'mt-7 w-full text-xs font-bold h-10 cursor-pointer rounded-xl',
                    plan.popular
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-muted hover:bg-muted/80 text-foreground'
                  )}
                >
                  Get Started <ArrowRight className="size-3.5 ml-1.5" />
                </Button>
              </div>
            ))}
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
                q: 'Can I add GPTForm to my existing website without rebuilding?',
                a: 'Yes. GPTForm is built to sit seamlessly inside your current website. Simply copy and paste the 1-line script or iframe snippet into WordPress, Webflow, Shopify, Wix, Squarespace, or custom code.',
              },
              {
                q: 'How does live calendar booking prevent double-bookings?',
                a: 'GPTForm connects directly to your Google Calendar, Outlook 365, or ServiceOS CRM schedule. It computes travel buffers and real-time technician availability so only genuine open slots are offered.',
              },
              {
                q: 'Are answers from the AI chat transferred into the form automatically?',
                a: 'Yes. All details gathered during the conversation (customer symptoms, urgency, preferred doctor/technician, contact details) automatically populate into the form so your customers never repeat themselves.',
              },
              {
                q: 'Can I customize the styling, colors, and branding?',
                a: 'Absolutely. You can customize primary accent colors, font families, dark/light themes, submit button labels, and add custom CSS or upload your logo.',
              },
              {
                q: 'How do 0% transaction fee payments work?',
                a: 'You connect your own Stripe account. Deposits and payments go straight into your merchant account, and Fieseros charges 0% platform commission.',
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
              <a href="#templates">Explore Templates</a>
            </Button>
          </div>
        </div>
      </section>

      {/* ── SECTION 13: PRESERVED FULL SEO LANDING FOOTER ── */}
      <LandingFooter />
    </div>
  );
}
