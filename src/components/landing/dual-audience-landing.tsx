'use client';

import * as React from 'react';
import {
  Wrench,
  Store,
  ClipboardList,
  Briefcase,
  Menu,
  X,
  Key,
  Loader2,
  HardHat,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from '@/components/brand/brand-mark';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { ThemeToggle } from '@/components/theme/theme-toggle';

// ─── Flow 2026 Modular Sections ───────────────────────────────────────────
import { FlowHero } from './flow/flow-hero';
import { FlowProblem } from './flow/flow-problem';
import { FlowVoiceReceptionist } from './flow/flow-voice-receptionist';
import { FlowFieldSync } from './flow/flow-field-sync';
import { FlowCommandCenter } from './flow/flow-command-center';
import { FlowStackMatrix } from './flow/flow-stack-matrix';
import { FlowPricing } from './flow/flow-pricing';
import { FlowGptForm } from './flow/flow-gptform';
import { FlowProof } from './flow/flow-proof';
import { FlowFaq } from './flow/flow-faq';
import { FlowFooterCta } from './flow/flow-footer-cta';

// ─── Props ──────────────────────────────────────────────────────────────────

interface DualAudienceLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

export type Audience = 'crm' | 'forms' | 'marketplace';

// ─── Top navbar ─────────────────────────────────────────────────────────────

function Navbar({
  onGetStarted,
  onSignIn,
}: {
  onGetStarted?: () => void;
  onSignIn?: () => void;
}) {
  const [scrolled, setScrolled] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [empLoginOpen, setEmpLoginOpen] = React.useState(false);
  const [empEmail, setEmpEmail] = React.useState('');
  const [empPassword, setEmpPassword] = React.useState('');
  const [empLoading, setEmpLoading] = React.useState(false);
  const [empError, setEmpError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
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

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300 pt-[env(safe-area-inset-top,0px)]',
        scrolled
          ? 'border-b border-border/70 bg-background/85 backdrop-blur-xl shadow-xs'
          : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 group shrink-0"
          aria-label="Fieseros home"
          onClick={(e) => {
            e.preventDefault();
            setMobileOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        >
          <BrandMark size={32} className="shadow-teal-500/20 group-hover:scale-105 transition-transform" />
          <span className="text-xl font-bold tracking-tight text-navy">Fieseros</span>
        </a>

        {/* ── Desktop Navigation ── */}
        <nav className="hidden md:flex items-center gap-1.5">
          <ProductMegaMenu onAnchorClick={scrollToAnchor} />
          <SolutionsMegaMenu />
          <Link
            href="/marketplace"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy hover:bg-surface px-3 py-2 rounded-full transition-colors"
          >
            <Store className="h-4 w-4 text-primary" />
            <span>Marketplace</span>
            <span className="text-[10px] font-bold bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
              Pros
            </span>
          </Link>
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-navy hover:bg-surface px-3 py-2 rounded-full transition-colors"
          >
            <ClipboardList className="h-4 w-4 text-primary" />
            <span>My Requests</span>
          </Link>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground hover:text-navy hover:bg-surface px-3 py-2 rounded-full transition-colors cursor-pointer"
            onClick={(e) => scrollToAnchor('#pricing', e)}
          >
            Pricing
          </a>
        </nav>

        {/* ── Right Actions ── */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Button
            asChild
            size="sm"
            className="gap-1.5 bg-primary text-primary-foreground hover:bg-brand-deep font-semibold shadow-sm text-xs sm:text-sm h-9 px-4 rounded-full cursor-pointer"
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
            className="text-xs text-muted-foreground hover:text-navy hover:bg-surface gap-1.5 h-9 px-3 rounded-full cursor-pointer"
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
              className="text-xs sm:text-sm font-medium text-muted-foreground hover:text-navy hover:bg-surface h-9 px-3 rounded-full cursor-pointer"
            >
              Sign In
            </Button>
          ) : null}
          {onGetStarted ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onGetStarted}
              className="gap-1.5 border-primary/30 text-primary hover:bg-accent font-semibold text-xs sm:text-sm h-9 px-4 rounded-full cursor-pointer"
            >
              Start Trial
            </Button>
          ) : null}

          {/* Theme Toggle at the right end of the page header */}
          <div className="h-5 w-px bg-border mx-1" />
          <ThemeToggle showDropdown />
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-navy inline-flex items-center justify-center min-h-[44px] min-w-[44px] -mr-2 rounded-lg hover:bg-surface transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileOpen ? (
        <div className="md:hidden border-t border-border bg-background text-foreground max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] px-4 py-4 space-y-3">
          <Accordion type="single" collapsible className="w-full space-y-2">
            <AccordionItem value="product" className="border border-border/80 rounded-2xl px-3 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 text-navy">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-primary" />
                  <span>Platform &amp; Features</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3 space-y-1">
                {solutionsLinks.features.slice(0, 5).map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block text-xs font-medium text-muted-foreground hover:text-navy p-2 rounded-lg hover:bg-surface"
                    onClick={(e) => {
                      setMobileOpen(false);
                      if (item.href.startsWith('/#')) scrollToAnchor(item.href.replace('/', ''), e);
                    }}
                  >
                    {item.label}
                  </a>
                ))}
                <div className="pt-2 border-t border-border/60">
                  <a
                    href="#receptionist"
                    className="flex items-center justify-between text-xs font-semibold text-primary p-2 rounded-lg hover:bg-accent"
                    onClick={(e) => scrollToAnchor('#receptionist', e)}
                  >
                    <span>24/7 AI Receptionist</span>
                    <span className="text-[10px] bg-accent text-accent-foreground border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                      AI Voice
                    </span>
                  </a>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="solutions" className="border border-border/80 rounded-2xl px-3 bg-card">
              <AccordionTrigger className="text-sm font-semibold hover:no-underline py-3 text-navy">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-primary" />
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
                        className="text-xs text-muted-foreground hover:text-navy p-1.5 rounded hover:bg-surface truncate block"
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
                        className="block text-xs text-muted-foreground hover:text-navy p-1.5 rounded hover:bg-surface"
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
                        className="block text-xs text-muted-foreground hover:text-navy p-1.5 rounded hover:bg-surface"
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
          <div className="rounded-2xl border border-border/80 bg-card p-2 space-y-1">
            <Link
              href="/marketplace"
              className="flex items-center justify-between p-2.5 text-xs font-semibold text-navy hover:bg-surface rounded-xl transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                <span>Verified Pro Marketplace</span>
              </div>
              <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-semibold">
                Browse
              </span>
            </Link>
            <a
              href="#pricing"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-navy hover:bg-surface rounded-xl transition-colors"
              onClick={(e) => scrollToAnchor('#pricing', e)}
            >
              <span>Pricing Plans</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
            <Link
              href="/invoice-generator"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-navy hover:bg-surface rounded-xl transition-colors"
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
                className="w-full min-h-11 bg-primary text-primary-foreground font-semibold text-sm rounded-full hover:bg-brand-deep"
                onClick={() => {
                  setMobileOpen(false);
                  onGetStarted();
                }}
              >
                Get Started Free <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : null}
            {onSignIn ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full min-h-11 rounded-full border-border"
                onClick={() => {
                  setMobileOpen(false);
                  onSignIn();
                }}
              >
                Sign In
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="w-full min-h-10 text-muted-foreground hover:text-navy text-xs gap-1.5 rounded-full"
              onClick={() => {
                setEmpLoginOpen(true);
                setMobileOpen(false);
              }}
            >
              <Key className="h-3.5 w-3.5" />
              Employee / Field Staff Login
            </Button>
          </div>
        </div>
      ) : null}

      {/* Employee login dialog */}
      <Dialog open={empLoginOpen} onOpenChange={setEmpLoginOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-2xl bg-amber-500 text-white shrink-0 shadow-sm">
                <HardHat className="size-5" />
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
              className="min-h-12 rounded-xl"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={empPassword}
              onChange={(e) => setEmpPassword(e.target.value)}
              className="min-h-12 rounded-xl"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEmployeeLogin();
              }}
            />
            {empError && <p className="text-sm text-red-600">{empError}</p>}
            <Button
              onClick={handleEmployeeLogin}
              disabled={empLoading || !empEmail.trim() || !empPassword}
              className="w-full min-h-12 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {empLoading ? <Loader2 className="size-4 animate-spin" /> : 'Sign In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}

// ─── Main Landing Component ──────────────────────────────────────────────────

export function DualAudienceLanding({
  onGetStarted,
  onSignIn,
}: DualAudienceLandingProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-primary/20 selection:text-navy">
      {/* ── Google AI & Structured Schema SEO Foundation ── */}
      <div className="sr-only" aria-hidden="true">
        <h2>Fieseros AI Operating System &amp; Field CRM</h2>
        <p>
          Fieseros is an all-in-one, AI-powered operating system and CRM built specifically for field service, trade, and local service businesses like HVAC, plumbing, electrical, cleaning, and landscaping.
        </p>
        <h3>Core Features</h3>
        <ul>
          <li><strong>Operations &amp; CRM:</strong> Combines customer relationship management, lead tracking, mobile-friendly scheduling, and technician dispatching.</li>
          <li><strong>Billing &amp; Payments:</strong> Features automated invoicing, on-site secure digital payment links via SMS/email, recurring subscription/maintenance billing, with 0% platform transaction fees.</li>
          <li><strong>Websites &amp; Growth:</strong> Offers custom, mobile-first, SEO-ready website development, verified pro marketplace profile, and 24/7 AI voice phone receptionist.</li>
          <li><strong>Autonomous AI Automation:</strong> Natural language command interface (⌘K) to book appointments, dispatch techs, calculate quotes, and follow up instantly.</li>
        </ul>
      </div>

      {/* ── Top Header Navigation ── */}
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />

      <main className="flex-1">
        {/* 01. The 3-Column Interactive AI Command Hero */}
        <FlowHero onGetStarted={onGetStarted} />

        {/* 02. The Pain Points / Contractor Problem Stat Cards */}
        <FlowProblem />

        {/* 03. 24/7 AI Voice Receptionist + Waveform Visualizer */}
        <FlowVoiceReceptionist />

        {/* 04. Office Dispatch Board ↔ Mobile PWA Split Sync */}
        <FlowFieldSync />

        {/* 05. Ask Fieseros AI Command Center (6 Specialized Agents) */}
        <FlowCommandCenter />

        {/* 06. 17-Tool Replacement Stack Matrix ($2,347/mo vs $29/mo) */}
        <FlowStackMatrix />

        {/* 07. Transparent Pricing (5 Tiers + Monthly/Annual Toggle) */}
        <FlowPricing onGetStarted={onGetStarted} />

        {/* 08. GPTForm™ Conversational Form Engine & AI Chatbot */}
        <FlowGptForm />

        {/* 09. Contractor Proof & Field Reliability Badges */}
        <FlowProof />

        {/* 10. Verified Pro Marketplace Discovery Section */}
        <section id="marketplace-3bid" className="py-24 bg-surface border-y border-border relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl border border-border bg-background p-8 sm:p-12 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 blur-[100px] pointer-events-none" />
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                <div className="lg:col-span-7 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold uppercase tracking-[0.14em]">
                    <Store className="size-3.5" />
                    <span>BUILT-IN DEMAND &amp; DIRECT BOOKINGS</span>
                  </div>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-navy leading-tight">
                    Get discovered on the{' '}
                    <span className="text-gradient-brand">
                      Fieseros Marketplace
                    </span>
                  </h2>
                  <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
                    Unlike legacy software that only manages existing clients, Fieseros gives your business a verified public profile on our local trade directory where property owners search, compare quotes, and book services — with <strong>0% platform commission</strong>.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-1 shadow-xs">
                      <p className="text-xs font-bold text-primary">0% Commission</p>
                      <p className="text-[11px] text-muted-foreground">Keep 100% of every customer booking and payment.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-1 shadow-xs">
                      <p className="text-xs font-bold text-primary">Verified Badge</p>
                      <p className="text-[11px] text-muted-foreground">Showcase insurance, licenses, and verified reviews.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-surface border border-border space-y-1 shadow-xs">
                      <p className="text-xs font-bold text-primary">Direct CRM Sync</p>
                      <p className="text-[11px] text-muted-foreground">Incoming requests land directly in your live dispatch board.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-3">
                    <Link
                      href="/marketplace"
                      className="h-11 px-6 rounded-full bg-primary hover:bg-brand-deep text-primary-foreground font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md transition cursor-pointer"
                    >
                      Explore Verified Pro Directory <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      href="/request"
                      className="h-11 px-6 rounded-full bg-surface hover:bg-accent text-navy border border-border text-xs sm:text-sm font-semibold flex items-center gap-2 transition cursor-pointer"
                    >
                      Post Service Request →
                    </Link>
                  </div>
                </div>
                <div className="lg:col-span-5">
                  <div className="p-6 rounded-3xl bg-surface text-foreground border border-border shadow-xl space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                      <span className="text-xs font-bold text-navy uppercase tracking-wider">Live Verified Profile</span>
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent text-accent-foreground font-bold border border-primary/20">
                        ● Active in Directory
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                        PS
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-navy">ProSkill Plumbing &amp; HVAC</h4>
                        <p className="text-xs text-muted-foreground">Phoenix, AZ · Rated 4.9 ★ (128 Reviews)</p>
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-background border border-border text-xs space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Coverage:</span>
                        <span className="text-navy font-medium">25 km radius</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Direct Bookings:</span>
                        <span className="text-primary font-bold">24/7 AI Receptionist</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Platform Take Rate:</span>
                        <span className="text-primary font-bold">0% (Keep Everything)</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={onGetStarted}
                        className="flex-1 py-2.5 rounded-full bg-primary hover:bg-brand-deep text-primary-foreground font-bold text-xs shadow-md cursor-pointer transition"
                      >
                        Direct Booking
                      </button>
                      <Link
                        href="/marketplace"
                        className="flex-1 py-2.5 rounded-full bg-background hover:bg-surface text-navy text-center font-semibold text-xs border border-border cursor-pointer transition"
                      >
                        Call Verified Pro
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 11. Contractor Knowledge Base & Search Engine FAQ */}
        <FlowFaq />

        {/* 12. High-Impact Closing Trial CTA + Floating Sticky Bar */}
        <FlowFooterCta onGetStarted={onGetStarted} />
      </main>

      {/* ── Global Comprehensive SEO Footer with 25+ Trades ── */}
      <LandingFooter />
    </div>
  );
}
