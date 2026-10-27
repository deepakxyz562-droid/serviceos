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
import { cn } from '@/lib/utils';

import { ReferenceHome } from './reference-home';

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
      <div className="grid h-18 w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 sm:px-6 xl:grid-cols-[1fr_auto_1fr] lg:px-8">
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
        <nav aria-label="Main navigation" className="hidden xl:flex items-center justify-center gap-1">
          <SolutionsMegaMenu />
          <a href="#industries" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-emerald-700">Industries</a>
          <a href="#ai-features" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-emerald-700">AI Features</a>
          <a href="#pricing" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-emerald-700">Pricing</a>
          <ProductMegaMenu onAnchorClick={scrollToAnchor} />
        </nav>

        {/* ── Right Actions ── */}
        <div className="hidden sm:flex items-center justify-self-end gap-2.5">
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
              className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 font-semibold text-xs sm:text-sm h-9 px-4 rounded-lg cursor-pointer"
            >
              Start Free — 100 Jobs
            </Button>
          ) : null}

          {/* Theme Toggle at the right end of the page header */}
          <div className="h-5 w-px bg-border mx-1" />
          <ThemeToggle showDropdown />
        </div>

        <div className="col-start-3 flex items-center justify-self-end gap-1 xl:hidden">
          <div className="sm:hidden"><ThemeToggle /></div>
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
        <div className="xl:hidden border-t border-border bg-background text-foreground max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] px-4 py-4 space-y-3">
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
                <div className="pt-2 border-t border-border/60 space-y-1">
                  <Link
                    href="/ai-employee"
                    className="flex items-center justify-between text-xs font-semibold text-primary p-2 rounded-lg hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>24/7 AI Receptionist</span>
                    <span className="text-[10px] bg-accent text-accent-foreground border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                      AI Voice
                    </span>
                  </Link>
                  <Link
                    href="/chatbot"
                    className="flex items-center justify-between text-xs font-semibold text-primary p-2 rounded-lg hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>AI Chatbot Builder</span>
                    <span className="text-[10px] bg-accent text-accent-foreground border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                      Chatbot
                    </span>
                  </Link>
                  <Link
                    href="/gptform"
                    className="flex items-center justify-between text-xs font-semibold text-primary p-2 rounded-lg hover:bg-accent"
                    onClick={() => setMobileOpen(false)}
                  >
                    <span>GPTForm™ Smart Forms</span>
                    <span className="text-[10px] bg-accent text-accent-foreground border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                      Forms
                    </span>
                  </Link>
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
            <Link
              href="/requests"
              className="flex items-center justify-between p-2.5 text-xs font-medium text-navy hover:bg-surface rounded-xl transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <span>My Requests</span>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
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

export function DualAudienceLanding({ onGetStarted, onSignIn, onTryDemo }: DualAudienceLandingProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar onGetStarted={onGetStarted} onSignIn={onSignIn} />
      <ReferenceHome onGetStarted={onGetStarted} onTryDemo={onTryDemo} />
      <LandingFooter />
    </div>
  );
}
