'use client';

import * as React from 'react';
import { ModernNavbar } from './modern-navbar';
import { ModernHero } from './modern-hero';
import { ModernPillars } from './modern-pillars';
import { ModernDispatch } from './modern-dispatch';
import { ModernAiEmployee } from './modern-ai-employee';
import { ModernFormStudio } from './modern-form-studio';
import { ModernIndustries } from './modern-industries';
import { ModernHowItWorks } from './modern-how-it-works';
import { ModernMarketplace } from './modern-marketplace';
import { ModernPricing } from './modern-pricing';
import { ModernFaq } from './modern-faq';
import { ModernCtaBanner } from './modern-cta-banner';
import { ModernFooter } from './modern-footer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { HardHat, Loader2, Play } from 'lucide-react';

interface ModernLandingProps {
  onGetStarted?: () => void;
  onSignIn?: () => void;
  onTryDemo?: () => void;
}

export function ModernLanding({
  onGetStarted,
  onSignIn,
  onTryDemo,
}: ModernLandingProps) {
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [demoOpen, setDemoOpen] = React.useState(false);

  // Employee login popup support from query string
  const [empLoginOpen, setEmpLoginOpen] = React.useState(false);
  const [empEmail, setEmpEmail] = React.useState('');
  const [empPassword, setEmpPassword] = React.useState('');
  const [empLoading, setEmpLoading] = React.useState(false);
  const [empError, setEmpError] = React.useState<string | null>(null);

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
    } catch {}
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

  const scrollToPricing = () => {
    const el = document.getElementById('pricing');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900 font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* ── Semantic SEO Foundation Layer (Invisible to visual flow) ── */}
      <div className="sr-only" aria-hidden="true">
        <h2>Fieseros AI Operating System &amp; Field Service Management Platform</h2>
        <p>
          Fieseros is an all-in-one AI operating system and field service management software built for trade and local service businesses. Includes CRM, smart scheduling, live GPS technician dispatch, zero-fee invoicing, 24/7 AI voice phone receptionist, and verified pro marketplace.
        </p>
      </div>

      {/* 1. Header / Navbar */}
      <ModernNavbar
        onGetStarted={onGetStarted}
        onSignIn={onSignIn}
        onOpenSearch={() => setSearchOpen(true)}
      />

      <main className="flex-1">
        {/* 2. Hero Section */}
        <ModernHero
          onGetStarted={onGetStarted}
          onExplore={scrollToPricing}
        />

        {/* 3. 5-Pillar Overview Grid */}
        <ModernPillars />

        {/* 4. Live Dispatch & Scheduling */}
        <ModernDispatch
          onViewDemo={() => {
            if (onTryDemo) onTryDemo();
            else setDemoOpen(true);
          }}
        />

        {/* 5. AI Employee & Voice Receptionist */}
        <ModernAiEmployee
          onLearnMore={() => {
            if (onGetStarted) onGetStarted();
          }}
        />

        {/* 6. Forms, Payments & E-Signatures (GPTForm) */}
        <ModernFormStudio
          onExploreStudio={() => {
            if (onGetStarted) onGetStarted();
          }}
        />

        {/* 7. Popular Industries */}
        <ModernIndustries />

        {/* 8. How It Works (4-Step Process) */}
        <ModernHowItWorks />

        {/* 9. Verified Pro Marketplace */}
        <ModernMarketplace />

        {/* 10. Simple and Transparent Pricing */}
        <ModernPricing
          onSelectPlan={() => {
            if (onGetStarted) onGetStarted();
          }}
        />

        {/* 11. Frequently Asked Questions */}
        <ModernFaq />

        {/* 12. Bottom CTA Banner */}
        <ModernCtaBanner
          onGetStarted={onGetStarted}
          onWatchDemo={() => setDemoOpen(true)}
        />
      </main>

      {/* 13. Clean Footer */}
      <ModernFooter />

      {/* ── Search Dialog ── */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-lg p-4 rounded-2xl bg-white">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-base font-bold">Search Fieseros</DialogTitle>
            <DialogDescription className="text-xs">
              Find software solutions, trade verticals, or help articles.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Search HVAC, plumbing, dispatch, pricing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 rounded-xl"
              autoFocus
            />
            <div className="space-y-1 text-xs">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Quick Suggestions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Plumbing Software', href: '/plumbing-software' },
                  { label: 'HVAC Software', href: '/hvac-software' },
                  { label: 'Live Dispatching', href: '/scheduling-and-dispatch' },
                  { label: 'AI Voice Receptionist', href: '/ai-employee' },
                  { label: 'Free Invoice Generator', href: '/invoice-generator' },
                  { label: 'Pricing Plans', href: '#pricing' },
                ].map((sug) => (
                  <a
                    key={sug.label}
                    href={sug.href}
                    onClick={() => setSearchOpen(false)}
                    className="p-2 rounded-lg bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 transition-colors block"
                  >
                    {sug.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Demo Video Dialog ── */}
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="sm:max-w-2xl p-6 rounded-3xl bg-slate-900 text-white border border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="size-4 text-emerald-400 fill-emerald-400" /> Fieseros Platform Overview
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Watch how Fieseros automates your scheduling, dispatch, invoicing, and AI call reception.
            </DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-2xl bg-slate-950 flex flex-col items-center justify-center p-6 text-center border border-slate-800 space-y-4">
            <div className="size-14 rounded-full bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Play className="size-6 fill-current ml-0.5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">Interactive Demo Walkthrough</p>
              <p className="text-xs text-slate-400 max-w-sm">
                Click below to start free and explore the live interactive dashboard with pre-loaded mock jobs.
              </p>
            </div>
            <Button
              onClick={() => {
                setDemoOpen(false);
                onGetStarted?.();
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs h-10 px-5 rounded-lg"
            >
              Start Free (100 Jobs Included) →
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Employee Login Dialog ── */}
      <Dialog open={empLoginOpen} onOpenChange={setEmpLoginOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl bg-white">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center size-10 rounded-2xl bg-amber-500 text-white shrink-0 shadow-sm">
                <HardHat className="size-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle>Employee Login</DialogTitle>
                <DialogDescription className="mt-1 text-xs">
                  Enter your work email and password to access your field portal.
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
              className="min-h-11 rounded-xl"
              autoCapitalize="none"
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Password"
              value={empPassword}
              onChange={(e) => setEmpPassword(e.target.value)}
              className="min-h-11 rounded-xl"
              autoComplete="current-password"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEmployeeLogin();
              }}
            />
            {empError && <p className="text-xs text-red-600 font-medium">{empError}</p>}
            <Button
              onClick={handleEmployeeLogin}
              disabled={empLoading || !empEmail.trim() || !empPassword}
              className="w-full min-h-11 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm cursor-pointer"
            >
              {empLoading ? <Loader2 className="size-4 animate-spin" /> : 'Sign In'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
