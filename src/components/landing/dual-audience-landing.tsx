'use client';

import * as React from 'react';
import {
  Wrench,
  Sparkles,
  ArrowRight,
  Store,
  ClipboardList,
  Briefcase,
  Menu,
  X,
  Key,
  Loader2,
  HardHat,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { solutionsLinks, ProductMegaMenu, SolutionsMegaMenu, LandingFooter } from '@/components/landing/landing-solutions';
import { CrmPricing } from './crm-pricing';
import { ThemeToggle } from '@/components/theme/theme-toggle';

// ─── 2026 AI-native sections ───────────────────────────────────────────────
import { AiHeroCommand } from './2026/ai-hero-command';
import { OldWayVsFieseros } from './2026/old-way-vs-fieseros';
import { ConversationalCrmGrid } from './2026/conversational-crm-grid';
import { AskApproveExecute } from './2026/ask-approve-execute';
import { AiTeamShowcase } from './2026/ai-team-showcase';
import { LifecycleStory } from './2026/lifecycle-story';
import { AiAutomationBuilder } from './2026/ai-automation-builder';
import { UnifiedCommunications } from './2026/unified-communications';
import { FieldExperienceSplit } from './2026/field-experience-split';
import { RevenueCommandCenter } from './2026/revenue-command-center';
import { StackReplacementTable } from './2026/stack-replacement-table';
import { IndustryInteractiveSelector } from './2026/industry-interactive-selector';
import { RoleBasedProof } from './2026/role-based-proof';
import { InteractiveFormTour } from '@/components/gptform/interactive-form-tour';

// ─── Props ──────────────────────────────────────────────────────────────────

interface DualAudienceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

export type Audience = 'crm' | 'forms' | 'marketplace';

// ─── FAQ data (used by CrmFaq) ───────────────────────────────────────────────

const faqs = [
  {
    question: 'What is Fieseros?',
    answer: 'Fieseros is an AI-native operating system for service businesses. It combines a CRM, field service management, AI receptionist, form builder, and marketing automation into one platform — controlled through a natural-language command interface.',
  },
  {
    question: 'Is Fieseros a CRM or a field service platform?',
    answer: 'Both. Fieseros unifies CRM (customers, leads, pipeline), field service management (jobs, scheduling, dispatch, mobile PWA), and AI automation in a single system with one customer record — so you never re-enter data between modules.',
  },
  {
    question: 'Can I create jobs using AI?',
    answer: 'Yes. Tell Fieseros in plain English — "Create a boiler repair for Sarah tomorrow at 10am, assign Mike, prepare a £350 quote" — and it creates the customer, builds the job, schedules the work, assigns a qualified technician, and sends the confirmation automatically.',
  },
  {
    question: 'Can Fieseros assign technicians?',
    answer: 'Yes. The AI Dispatcher matches technicians based on skills, certifications (Gas Safe, EPA, NICEIC), GPS proximity, and calendar availability — then locks the slot and notifies the technician via the mobile PWA app.',
  },
  {
    question: 'Can Fieseros create invoices?',
    answer: 'Yes. When a job is marked complete, Fieseros generates an itemized invoice with pre-applied deposit deductions and sends a payment link via SMS/WhatsApp. Payments deposit directly into your merchant account with 0% platform commission.',
  },
  {
    question: 'Does Fieseros include an AI Receptionist?',
    answer: 'Yes. The 24/7 AI Voice Receptionist answers every call, qualifies leads, books appointments into your live calendar, takes detailed messages, and transfers urgent calls (burst pipe, gas leak, no heat) to your on-call technician.',
  },
  {
    question: 'What is GPTForm?',
    answer: 'GPTForm is Fieseros\' AI form engine. Describe the process — "HVAC maintenance inspection with equipment details, serial number, photos, safety checklist, parts used and customer signature" — and it generates a complete digital form with formula calculations, photo uploads, and e-signatures.',
  },
  {
    question: 'Does Fieseros have a mobile app?',
    answer: 'Yes. Fieseros includes a mobile PWA app (iOS and Android) for field technicians with offline job packets, turn-by-turn navigation, digital safety checklists, before/after photo capture, customer e-signatures, and on-site payment collection.',
  },
  {
    question: 'Can I use Fieseros for my industry?',
    answer: 'Fieseros is built for 25+ trades including plumbing, HVAC, electrical, roofing, cleaning, landscaping, handyman, pest control, and painting. Each industry gets tailored prompt understanding, certification matching, and specialized form fields.',
  },
  {
    question: 'How does Fieseros compare with Jobber, Housecall Pro, or HighLevel?',
    answer: 'Fieseros replaces the disconnected stack of CRM + FSM + AI phone + forms + automation + marketing tools with one AI-native platform. Instead of clicking through 7 screens per job, you tell Fieseros what needs to happen and it executes across every module — with 0% platform commission on payments.',
  },
];

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
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md text-foreground dark:border-slate-800 dark:bg-slate-950/90 dark:text-white pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <a href="#top" className="flex items-center gap-2.5 group shrink-0" aria-label="Fieseros home" onClick={(e) => { e.preventDefault(); setMobileOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <BrandMark size={32} className="shadow-emerald-500/20 group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-foreground dark:text-white">Fieseros</span>
        </a>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden md:flex items-center gap-1.5">
          <ProductMegaMenu onAnchorClick={crmAnchorClick} />
          <SolutionsMegaMenu />
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Store className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span>Marketplace</span>
            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-1.5 py-0.2 rounded-full">
              Pros
            </span>
          </Link>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <ClipboardList className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            <span>My Requests</span>
          </Link>
          <a
            href="#pricing"
            className="text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            onClick={(e) => crmAnchorClick('#pricing', e)}
          >
            Pricing
          </a>
        </nav>

        {/* ── Right Actions ── */}
        <div className="hidden sm:flex items-center gap-2">
          <ThemeToggle showDropdown />

          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500 font-semibold shadow-sm text-xs sm:text-sm h-9 px-3.5 rounded-xl cursor-pointer"
          >
            <Link href="/request">
              <span>Post Request</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEmpLoginOpen(true)}
            className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 gap-1.5 h-9 px-2.5 rounded-lg cursor-pointer"
            title="Field technician and staff portal"
          >
            <Key className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden lg:inline">Employee Login</span>
          </Button>
          {onSignIn ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSignIn}
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800/60 h-9 px-3 rounded-lg cursor-pointer"
            >
              Sign In
            </Button>
          ) : null}
          {onGetStarted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onGetStarted}
              className="gap-1.5 border-emerald-600/30 text-emerald-700 dark:border-emerald-500/40 dark:text-emerald-300 hover:bg-emerald-500/10 font-semibold text-xs sm:text-sm h-9 px-3.5 rounded-xl cursor-pointer"
            >
              Start Trial
            </Button>
          ) : null}
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground dark:text-white inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-lg hover:bg-muted dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen ? (
        <div className="md:hidden border-t border-border bg-background text-foreground dark:border-slate-800 dark:bg-slate-950 dark:text-white max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] px-3 py-3 space-y-2">
          <Accordion type="single" collapsible className="w-full space-y-2">
            <AccordionItem value="product" className="border border-border dark:border-slate-800 rounded-xl px-3 bg-card dark:bg-slate-900">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 text-foreground dark:text-white">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Platform &amp; Features</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-1">
                {solutionsLinks.features.slice(0, 5).map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-xs font-medium text-muted-foreground hover:text-foreground p-2 rounded-lg hover:bg-muted dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800"
                    onClick={(e) => {
                      setMobileOpen(false);
                      if (item.href.startsWith('/#')) crmAnchorClick(item.href.replace('/', ''), e);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-border dark:border-slate-800">
                  <a
                    href="#ai-receptionist"
                    className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    onClick={(e) => crmAnchorClick('#ai-receptionist', e)}
                  >
                    <span>24/7 AI Receptionist</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full uppercase">AI Voice</span>
                  </a>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="solutions" className="border border-border dark:border-slate-800 rounded-xl px-3 bg-card dark:bg-slate-900">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 text-foreground dark:text-white">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
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

// ─── FAQ section ─────────────────────────────────────────────────────────────

function CrmFaq() {
  return (
    <section id="faq" className="border-t border-slate-800 bg-slate-950 text-white py-16 sm:py-24">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-12 text-center">
          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 mb-3 font-semibold text-xs px-3 py-1">
            Answers &amp; Knowledge Base
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Frequently Asked <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Questions</span>
          </h2>
          <p className="text-slate-400 text-sm sm:text-base mt-2 max-w-xl mx-auto">
            Everything you need to know about the Fieseros AI Operating System, 0% platform fee policy, and data portability.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl overflow-hidden p-2 sm:p-4">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-b border-slate-800/80 last:border-b-0 px-4 sm:px-6 py-2">
                <AccordionTrigger className="text-white hover:text-emerald-400 hover:no-underline text-left font-bold text-sm sm:text-base py-4 cursor-pointer">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-slate-400 leading-relaxed text-xs sm:text-sm pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

// ─── Sticky bottom CTA ───────────────────────────────────────────────────────

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
    <div className="sticky bottom-0 z-40 border-t border-slate-800 bg-slate-950/95 backdrop-blur-md px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom,0px))] sm:px-6 shadow-2xl text-white">
      <div className="mx-auto max-w-6xl flex items-center gap-2 sm:gap-3">
        <div className="flex-1 min-w-0 hidden sm:block">
          <p className="text-xs text-slate-400 truncate">
            Fieseros AI Operating System &bull; Natural Language CRM &bull; AI Voice Receptionist &bull; 0% Commission Payments
          </p>
        </div>
        <div className="flex items-center gap-2 flex-1 sm:flex-none justify-end">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="gap-1 border-amber-500/40 text-amber-300 hover:bg-amber-950/40 text-xs min-h-9 cursor-pointer"
          >
            <Link href="/request">
              <Store className="h-3.5 w-3.5" /> Post Request
            </Link>
          </Button>
          {onGetStarted ? (
            <Button size="sm" onClick={onGetStarted} className="gap-1 bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold min-h-9 px-4 cursor-pointer shadow-md">
              Start Free Trial <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          aria-label="Dismiss"
          className="ml-1 inline-flex items-center justify-center min-h-9 min-w-9 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
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
        {/* 01. AI Hero Command ⌘K Theatre */}
        <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 border-b border-border bg-gradient-to-b from-slate-50 via-white to-slate-100 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-white dark:border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AiHeroCommand onGetStarted={onGetStarted} />
          </div>
        </section>

        {/* 02. The Old Way vs Fieseros Way */}
        <OldWayVsFieseros />

        {/* 03. One Prompt → Your Entire CRM */}
        <ConversationalCrmGrid />

        {/* 04. Ask. Approve. Execute. — Human-in-the-loop AI execution */}
        <AskApproveExecute onGetStarted={onGetStarted} />

        {/* 05. The Specialized AI Team (6 Autonomous Teammates) */}
        <AiTeamShowcase />

        {/* 06. End-to-End Service Lifecycle Story (Lead to Paid) */}
        <LifecycleStory />

        {/* 07. GPTForm Interactive AI Form Builder Tour */}
        <section id="ai-forms" className="py-20 bg-slate-50 text-slate-900 border-b border-border dark:bg-slate-950 dark:text-white dark:border-slate-800 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="text-center space-y-3 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-400 text-xs font-semibold">
                <Sparkles className="size-3.5 animate-pulse" />
                <span>AI FORM ENGINE &amp; WIDGET STUDIO</span>
              </div>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-foreground dark:text-white">
                Describe the process.{' '}
                <span className="bg-gradient-to-r from-teal-500 to-emerald-600 dark:from-teal-400 dark:to-emerald-400 bg-clip-text text-transparent">
                  Fieseros builds the form.
                </span>
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                Interactive formula calculations, damage photo uploads, offline mobile sign-offs, and 0% fee deposit payments connected straight to your work orders.
              </p>
            </div>
            <InteractiveFormTour />
          </div>
        </section>

        {/* 08. AI Automation Builder — describe workflow → AI builds it */}
        <AiAutomationBuilder onGetStarted={onGetStarted} />

        {/* 09. Unified Communications — SMS/WhatsApp/Email/Chat/Calls inbox */}
        <UnifiedCommunications onGetStarted={onGetStarted} />

        {/* 10. Field Experience: Office Dispatch ↔ Mobile PWA Split Screen */}
        <FieldExperienceSplit />

        {/* 11. Revenue Command Center */}
        <RevenueCommandCenter />

        {/* 12. All-in-One Stack Replacement ROI Table */}
        <StackReplacementTable onGetStarted={onGetStarted} />

        {/* 13. Industry Interactive Selector (25+ Trades) */}
        <IndustryInteractiveSelector onGetStarted={onGetStarted} />

        {/* 14. Role-Based Product Proof (Owner, Dispatcher, Tech, Customer) */}
        <RoleBasedProof />

        {/* 15. Zero-Commission Contractor Marketplace Discovery */}
        <section id="marketplace-3bid" className="py-20 bg-background text-foreground border-b border-border dark:bg-slate-950 dark:text-white dark:border-slate-800 relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-gradient-to-br from-white via-slate-50 to-slate-100 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 blur-[100px] pointer-events-none" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-semibold">
                    <Store className="size-3.5" />
                    <span>BUILT-IN DEMAND &amp; DIRECT BOOKINGS</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-foreground dark:text-white leading-tight">
                    Get discovered on the{' '}
                    <span className="bg-gradient-to-r from-amber-500 to-teal-600 dark:from-amber-400 dark:to-teal-400 bg-clip-text text-transparent">
                      Fieseros Marketplace
                    </span>
                  </h2>
                  <p className="text-muted-foreground dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                    Unlike legacy software that only manages existing clients, Fieseros gives your business a verified public profile on our local trade directory where property owners search, compare quotes, and book services — with <strong>0% platform commission</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3.5 rounded-2xl bg-card border border-border dark:bg-slate-950/80 dark:border-slate-800 space-y-1">
                      <p className="text-xs font-bold text-amber-400">0% Commission</p>
                      <p className="text-[11px] text-slate-400">Keep 100% of every customer booking and payment.</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <p className="text-xs font-bold text-teal-400">Verified Badge</p>
                      <p className="text-[11px] text-slate-400">Showcase insurance, licenses, and verified reviews.</p>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
                      <p className="text-xs font-bold text-emerald-400">Direct CRM Sync</p>
                      <p className="text-[11px] text-slate-400">Incoming requests land directly in your live dispatch board.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <Link
                      href="/marketplace"
                      className="h-11 px-6 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition cursor-pointer"
                    >
                      Explore Verified Pro Directory <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      href="/request"
                      className="h-11 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                    >
                      Post Service Request →
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div className="p-6 rounded-2xl bg-slate-950 border border-amber-500/30 shadow-2xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Live Verified Profile</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">● Active in Directory</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center font-black text-base shrink-0">
                        PS
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">ProSkill Plumbing &amp; HVAC</h4>
                        <p className="text-xs text-slate-400">Phoenix, AZ · Rated 4.9 ★ (128 Reviews)</p>
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Service Coverage:</span>
                        <span className="text-white font-medium">25 km radius</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Direct Bookings:</span>
                        <span className="text-teal-400 font-bold">24/7 AI Receptionist</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Platform Take Rate:</span>
                        <span className="text-emerald-400 font-bold">0% (Keep Everything)</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer">
                        Direct Booking
                      </button>
                      <button type="button" className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 cursor-pointer">
                        Call Verified Pro
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 16. Transparent Pricing Plans */}
        <CrmPricing onGetStarted={onGetStarted} />

        {/* 17. Search & AI Answer Engine Optimized FAQ */}
        <CrmFaq />

        {/* 18. High-Impact Closing CTA */}
        <section className="py-20 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white border-t border-slate-800 text-center relative overflow-hidden">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Sparkles className="size-3.5" />
              <span>START IN UNDER 5 MINUTES</span>
            </div>
            <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-tight">
              Stop managing your software.{' '}
              <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                Tell Fieseros what needs to happen.
              </span>
            </h2>
            <p className="text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              CRM. Jobs. Scheduling. Dispatch. AI Voice. Calculations. Invoicing. Marketing. 0% Commission Payments.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button
                size="lg"
                onClick={onGetStarted}
                className="h-13 px-9 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-base rounded-2xl shadow-xl cursor-pointer transition hover:scale-105"
              >
                Start Free Forever →
              </Button>
              <Link
                href="/gptform"
                className="h-13 px-7 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-sm font-semibold flex items-center gap-2 transition"
              >
                Explore GPTForm Studio →
              </Link>
            </div>
            <p className="text-xs text-slate-500 pt-2">
              No credit card required &bull; Free tier includes first 100 jobs &bull; Cancel anytime
            </p>
          </div>
        </section>
      </main>

      {/* Global Comprehensive Footer */}
      <LandingFooter />

      <StickyCta audience={audience} onPick={handleAudiencePick} onGetStarted={onGetStarted} />
    </div>
  );
}
