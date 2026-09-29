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
  Calculator,
  Receipt,
  Globe,
  Star,
  CheckSquare,
  Scale,
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { AiMarketingHeader } from '@/components/ai-marketing/ai-marketing-header';
import { AiMarketingFooter } from '@/components/ai-marketing/ai-marketing-footer';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { HeroDemo } from '@/components/gptform/flow/hero-demo';
import { StudioDemo } from '@/components/gptform/flow/studio-demo';
import { JourneySection } from '@/components/gptform/flow/journey-section';
import { ModeDemo } from '@/components/gptform/flow/mode-demo';
import { AgentExtract } from '@/components/gptform/flow/agent-extract';
import { SmartLogic } from '@/components/gptform/flow/smart-logic';
import { ComparisonTable } from '@/components/gptform/sections/comparison-table';
import { CustomerTrustStrip } from '@/components/gptform/sections/customer-trust-strip';
import { SecurityBadges } from '@/components/gptform/sections/security-badges';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function GptFormClientView() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly');

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

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-700">
      {/* ── Standalone AI & Forms Navigation Header ── */}
      <AiMarketingHeader activePath="/gptform" />

      {/* ── SECTION 1: HERO (hero-grid) ── */}
      <section id="top" className="hero-grid relative pt-10 sm:pt-16 pb-12 sm:pb-20">
        <div className="page-shell grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="max-w-xl animate-fade-in">
            <p className="eyebrow text-emerald-600">
              <span className="size-2 rounded-full bg-emerald-600 animate-pulse" />
              GPTFORM · AI FORM BUILDER &amp; CONVERSATIONAL INTAKE
            </p>
            <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight text-foreground">
              Free AI Form Builder &amp; <span className="text-emerald-600">Smart Intake Engine</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-muted-foreground">
              Build high-converting online forms, live price calculators, and conversational AI booking agents in seconds. Connect 33+ payment gateways with <strong>0% platform fees</strong> and sync leads directly to your CRM.
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
              {['Free forever tier ($0)', '100 submissions / month', 'No credit card required', '0% payment fees', '33+ Gateways'].map(
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
              { icon: Code2, text: 'Embeds in 1 click on WordPress, Webflow, Shopify & HTML' },
              { icon: Calculator, text: 'JotForm-grade live calculations & date math engines' },
              { icon: CreditCard, text: '33+ Payment Gateways with 0% platform transaction fees' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center justify-center gap-3 text-center text-xs sm:text-sm font-semibold text-foreground">
                <Icon className="size-4 text-emerald-600 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: CAPABILITIES TRUST STRIP ── */}
      <CustomerTrustStrip />

      {/* ── SECTION 3: AUTHENTIC SAAS BUILDER STUDIO (StudioDemo) ── */}
      <section id="studio" className="section-pad bg-background">
        <div className="page-shell">
          <div className="section-heading max-w-3xl mb-10">
            <p className="eyebrow text-emerald-600">AUTHENTIC SAAS STUDIO</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Describe it in natural English. GPTForm builds the schema.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground">
              AI generates the structure, conditional logic branches, and calculation formulas in under 10 seconds. You maintain complete visual control over every question, layout column, and validation rule.
            </p>
          </div>

          <StudioDemo />
        </div>
      </section>



      {/* ── SECTION 5: 33+ PAYMENT GATEWAYS SHOWCASE ── */}
      <section className="border-y border-border bg-emerald-500/5 py-16">
        <div className="page-shell text-center max-w-4xl mx-auto space-y-8">
          <div className="space-y-3">
            <Badge className="bg-emerald-600 text-white text-xs px-3 py-1 font-semibold">
              0% Platform Transaction Fees
            </Badge>
            <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Accept Payments Worldwide with 33+ Connected Gateways
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
              Collect upfront deposits, product sales, recurring subscriptions, and customer donations directly inside your forms without paying platform commission.
            </p>
          </div>

          {/* Payment Badges Grid */}
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-4">
            {[
              { name: 'Stripe', sub: 'Cards & Link' },
              { name: 'Square', sub: 'POS & Cards' },
              { name: 'PayPal', sub: 'Pay in 4' },
              { name: 'Apple Pay', sub: '1-Touch' },
              { name: 'Google Pay', sub: 'Instant' },
              { name: 'Razorpay', sub: 'UPI & Cards' },
              { name: 'Authorize.Net', sub: 'Enterprise' },
              { name: 'Braintree', sub: 'Cards & Wallets' },
              { name: 'Afterpay', sub: 'BNPL Installments' },
              { name: 'Klarna', sub: 'Pay in 4 / 30D' },
              { name: 'GoCardless', sub: 'Direct Debit ACH' },
              { name: 'Mollie', sub: 'iDEAL & SEPA' },
              { name: 'PayU', sub: 'Regional LATAM' },
              { name: 'Worldpay', sub: 'UK & Europe' },
              { name: 'Moneris', sub: 'Canada CAD' },
              { name: 'BlueSnap', sub: '100+ Currencies' },
              { name: 'Cash App', sub: 'QR Pay' },
              { name: 'Purchase Order', sub: 'B2B Net Terms' },
            ].map((gw) => (
              <div key={gw.name} className="p-3 rounded-xl border border-border/80 bg-card hover:border-emerald-500/50 transition shadow-2xs text-center space-y-1">
                <p className="font-bold text-xs text-foreground truncate">{gw.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{gw.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: COMPETITOR COMPARISON TABLE (Jotform / Typeform / Tally) ── */}
      <ComparisonTable onGetStarted={() => { window.location.href = '#studio'; }} />

      {/* ── SECTION 7: ONE FORM, FOUR EXPERIENCES (ModeDemo) ── */}
      <section className="section-pad bg-background border-t border-border">
        <div className="page-shell">
          <div className="section-heading max-w-3xl mb-10">
            <p className="eyebrow text-emerald-600">ONE FORM, FOUR EXPERIENCES</p>
            <h2 className="mt-3 font-display text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
              Meet each customer in the format they prefer.
            </h2>
            <p className="mt-3 text-base sm:text-lg text-muted-foreground">
              Switch the customer runtime experience between Classic Grid, Focus Step Cards (Typeform parity), Interactive Chat, and AI Voice Agent without rewriting logic or fragmenting your CRM data.
            </p>
          </div>

          <ModeDemo />
        </div>
      </section>

      {/* ── SECTION 8: AI FORM AGENT & EXTRACTION ENGINE ── */}
      <AgentExtract />

      {/* ── SECTION 9: SMART BUSINESS LOGIC & 12-FIELD PALETTE ── */}
      <SmartLogic />

      {/* ── SECTION 10: COMPLETE CUSTOMER JOURNEY ── */}
      <JourneySection />

      {/* ── SECTION 11: 3 VALUE PILLAR CARDS ── */}
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

      {/* ── SECTION 12: PRICING ── */}
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
                    '20,000+ Templates Library',
                    '33+ Direct Payments (0% fee)',
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

            {/* Starter Tier */}
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
                    'Dynamic Math Calculations & Date Math',
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
                    'Priority Webhook & CRM Sync',
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

      {/* ── SECTION 13: SECURITY & COMPLIANCE BADGES ── */}
      <SecurityBadges />

      {/* ── SECTION 14: EXPANDABLE 10-QUESTION FAQ ── */}
      <section className="section-pad bg-muted/30">
        <div className="page-shell max-w-3xl">
          <div className="section-heading text-center mx-auto mb-10">
            <p className="eyebrow justify-center text-emerald-600">FREQUENTLY ASKED QUESTIONS</p>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Frequently Asked Questions About GPTForm™
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Everything you need to know about AI form building, payments, calculations, and embedding.
            </p>
          </div>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {[
              {
                q: 'How does the AI Form Generator work?',
                a: 'You describe your form in plain English (e.g., "Build an emergency plumbing intake form with an address picker, quote calculation, and Stripe checkout"). GPTForm generates fields, formulas, validation logic, and design themes in under 10 seconds.',
              },
              {
                q: 'How is GPTForm different from Jotform and Typeform?',
                a: 'GPTForm keeps form presentation and AI chat separate: choose Classic Paper or Card Swipe for the form, then optionally deploy a separate AI Agent chatbot that can open connected forms inside the chat. GPTForm also supports 33+ payment gateways with 0% platform transaction fees, JotForm-grade visual formula calculations, and 20,000+ free canonical templates.',
              },
              {
                q: 'Can I calculate complex math formulas and date differences?',
                a: 'Yes. GPTForm includes a visual Formula Pad supporting arithmetic (+, -, *, /), date math differences ((checkout - checkin) * daily_rate), multi-select checkbox summation, conditional booleans, and standard Math functions (round, floor, ceil, max, min).',
              },
              {
                q: 'What is an AI Form Agent?',
                a: 'An AI Form Agent transforms static form questions into a natural, conversational customer dialogue. Visitors can chat or speak, upload damage photos, and schedule appointments while the AI validates input and fills structured CRM fields automatically.',
              },
              {
                q: 'Which payment gateways are supported and what are the fees?',
                a: 'GPTForm connects to 33+ gateways including Stripe, Square, PayPal, Razorpay, Apple Pay, Google Pay, Afterpay, Klarna, GoCardless, and Mollie. Fieseros charges 0% platform transaction fees—you only pay your payment processor standard interchange rate.',
              },
              {
                q: 'How do I embed GPTForm on my website?',
                a: 'GPTForm embeds in 1 click using a single line of JavaScript, responsive iframe, or popover modal. It works seamlessly on WordPress, Webflow, Shopify, Wix, Squarespace, Framer, and custom HTML websites.',
              },
              {
                q: 'How does live calendar booking prevent double-bookings?',
                a: 'GPTForm integrates directly with Google Calendar, Outlook 365, and ServiceOS CRM schedules. It verifies technician availability in real time and offers next best slots with travel buffer calculations.',
              },
              {
                q: 'Can I capture legally binding digital signatures?',
                a: 'Yes. GPTForm includes an HTML5 smooth canvas E-Signature widget with timestamping, IP logging, and integration with Adobe Sign and DocuSign for compliance.',
              },
              {
                q: 'Is GPTForm secure and GDPR/CCPA compliant?',
                a: 'Yes. All submissions are encrypted in transit via TLS 1.3 and at rest with 256-bit AES encryption. GPTForm supports Cloudflare Turnstile bot protection, reCAPTCHA v3, and strict data privacy compliance.',
              },
              {
                q: 'Is there a free plan?',
                a: 'Yes. The Free Forever tier gives you 3 active smart forms, 100 monthly submissions, 33+ payment gateways with 0% fees, and full access to our 20,000+ template library without requiring a credit card.',
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

      {/* ── SECTION 15: HIGH-IMPACT CLOSING CTA ── */}
      <section className="bg-emerald-700 py-16 sm:py-20 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 size-80 rounded-full bg-emerald-500/30 blur-3xl pointer-events-none" />
        <div className="page-shell flex flex-col items-start justify-between gap-8 md:flex-row md:items-center relative z-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-200">
              JOIN 50,000+ BUSINESSES USING GPTFORM
            </p>
            <h2 className="mt-3 max-w-2xl font-display text-3xl sm:text-5xl font-bold tracking-tight">
              Turn your next website visitor into a paying customer.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-emerald-100 max-w-xl">
              Start free today with 100 monthly submissions and 0% payment transaction fees. Zero coding required.
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

      {/* ── Standalone AI & Forms Navigation Footer ── */}
      <AiMarketingFooter />
    </div>
  );
}
