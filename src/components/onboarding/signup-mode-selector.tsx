'use client';

/**
 * SignupModeSelector
 * ===================
 * The "Step 0" decision screen shown immediately after a fresh registration
 * (before the onboarding wizard). Asks the user how they want to use
 * the platform — three product paths:
 *
 *   1. "Grow with CRM" (crm_trial) — full CRM + 14-day free trial.
 *      Proceeds to the existing 4-step SaaSOnboarding wizard.
 *
 *   2. "List my business" (listing_only) — free marketplace listing only.
 *      Converts the tenant from trial → claimed_free, then proceeds to the
 *      mini 1-step ListingOnboarding wizard.
 *
 *   3. "AI Forms & Chatbot" (standalone) — AI chatbot + smart forms for
 *      websites. Converts the tenant to standalone_starter trial, then
 *      proceeds to the 2-step StandaloneOnboarding wizard.
 *
 * Renders as a full-screen overlay (like the SaaSOnboarding wizard) so the
 * user can't access the app until they've chosen a path.
 */

import { useState } from 'react';
import {
  Sparkles,
  Store,
  Zap,
  Check,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Bot,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { authFetch } from '@/lib/client-auth';
import { useAppStore } from '@/store/app-store';

interface SignupModeSelectorProps {
  tenant: {
    id: string;
    name?: string;
  } | null;
  user: {
    name?: string;
    email?: string;
  } | null;
  /** Called when the user picks "CRM trial". */
  onChooseCrm: () => void;
  /** Called when the user picks "Listing only" (after the API converts). */
  onChooseListing: () => void;
  /** Called when the user picks "AI Forms & Chatbot" standalone path. */
  onChooseStandalone: () => void;
}

export function SignupModeSelector({
  tenant,
  user,
  onChooseCrm,
  onChooseListing,
  onChooseStandalone,
}: SignupModeSelectorProps) {
  const [busy, setBusy] = useState<'crm' | 'listing' | 'standalone' | null>(null);
  const setAuth = useAppStore((s) => s.setAuth);

  async function handleChoose(mode: 'crm_trial' | 'listing_only' | 'standalone') {
    const busyKey = mode === 'crm_trial' ? 'crm' : mode === 'listing_only' ? 'listing' : 'standalone';
    setBusy(busyKey);
    try {
      const res = await authFetch('/api/tenants/me/signup-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Something went wrong. Please try again.');
        setBusy(null);
        return;
      }
      // Update the auth store + localStorage with the new tenant fields
      // (signupMode, listingTier, plan, planStatus, trialEndsAt) so that
      // subsequent wizards and the dashboard read accurate tenant state.
      if (data.tenant) {
        const updatedTenant = { ...tenant, ...data.tenant };
        setAuth({
          isAuthenticated: true,
          user: user as any,
          tenant: updatedTenant as any,
        });
        if (typeof window !== 'undefined') {
          try {
            const stored = localStorage.getItem('fieseros_auth');
            const parsed = stored ? JSON.parse(stored) : {};
            localStorage.setItem('fieseros_auth', JSON.stringify({
              ...parsed,
              tenant: updatedTenant,
            }));
          } catch {
            // localStorage unavailable — not critical
          }
        }
      }
      if (mode === 'crm_trial') {
        toast.success('Great choice! Your 14-day CRM trial starts now.');
        onChooseCrm();
      } else if (mode === 'listing_only') {
        toast.success('Your marketplace listing is ready. Let\'s add a few details.');
        onChooseListing();
      } else {
        toast.success('Let\'s set up your AI Forms & Chatbot!');
        onChooseStandalone();
      }
    } catch {
      toast.error('Network error. Please try again.');
      setBusy(null);
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-5xl my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-600/20">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {firstName}! 👋
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            You're all signed up{tenant?.name ? <> for <strong className="text-foreground">{tenant.name}</strong></> : null}.
            How would you like to get started?
          </p>
        </div>

        {/* Three choice cards */}
        <div className="grid gap-4 sm:grid-cols-3">

          {/* ── Option A: CRM Trial ── */}
          <Card className="relative overflow-hidden border-2 border-emerald-300 dark:border-emerald-800 shadow-md hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
              RECOMMENDED
            </div>
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 mb-4">
                <Zap className="size-6" />
              </div>
              <h2 className="text-lg font-semibold">Grow with CRM</h2>
              <p className="text-xl font-bold mt-1">
                Free for 14 days
                <span className="text-xs font-normal text-muted-foreground block">then from $29/mo</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Full-suite CRM: dispatch, invoicing, AI Receptionist, online bookings, quote inbox, and omnichannel messaging.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {[
                  'CRM + customer pipeline',
                  'AI Receptionist (24/7 call answering)',
                  'Online bookings & quote requests',
                  'Omnichannel inbox (WhatsApp, SMS, Email)',
                  'Invoicing & payments',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => handleChoose('crm_trial')}
                disabled={busy !== null}
              >
                {busy === 'crm' ? (
                  <><Loader2 className="size-4 animate-spin mr-2" />Starting trial…</>
                ) : (
                  <>Start free trial <ArrowRight className="size-4 ml-2" /></>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                No credit card required · Cancel anytime
              </p>
            </CardContent>
          </Card>

          {/* ── Option B: Listing Only ── */}
          <Card className="relative overflow-hidden border-2 border-border shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 mb-4">
                <Store className="size-6" />
              </div>
              <h2 className="text-lg font-semibold">List my business</h2>
              <p className="text-xl font-bold mt-1">
                Free forever
                <span className="text-xs font-normal text-muted-foreground block">no credit card ever</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                A simple marketplace listing so customers can find and call you. No CRM, no online bookings.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {[
                  'Public provider page on the marketplace',
                  '"Call Now" button for customers',
                  'Respond to customer reviews',
                  'Show business hours, photos & FAQs',
                  'Upgrade to CRM anytime',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                className="w-full mt-6"
                onClick={() => handleChoose('listing_only')}
                disabled={busy !== null}
              >
                {busy === 'listing' ? (
                  <><Loader2 className="size-4 animate-spin mr-2" />Setting up listing…</>
                ) : (
                  <>Just list my business</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                No trial · No credit card · Free forever
              </p>
            </CardContent>
          </Card>

          {/* ── Option C: AI Forms & Chatbot (Standalone) ── */}
          <Card className="relative overflow-hidden border-2 border-violet-300 dark:border-violet-800 shadow-sm hover:shadow-md transition-all">
            <CardContent className="p-6">
              <div className="inline-flex items-center justify-center size-12 rounded-xl bg-violet-100 dark:bg-violet-950 text-violet-600 mb-4">
                <Bot className="size-6" />
              </div>
              <h2 className="text-lg font-semibold">AI Forms & Chatbot</h2>
              <p className="text-xl font-bold mt-1">
                Free for 14 days
                <span className="text-xs font-normal text-muted-foreground block">then from $7/mo</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Add an AI chatbot and smart lead-capture forms to your website. No CRM required.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {[
                  'AI Website Employee (24/7 chatbot)',
                  'Smart lead-capture forms',
                  'WhatsApp & email notifications',
                  'Embed on any website or WordPress',
                  'Upgrade to full CRM anytime',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 text-violet-500 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full mt-6 bg-violet-600 hover:bg-violet-700 text-white"
                onClick={() => handleChoose('standalone')}
                disabled={busy !== null}
              >
                {busy === 'standalone' ? (
                  <><Loader2 className="size-4 animate-spin mr-2" />Setting up…</>
                ) : (
                  <>Get started free <ArrowRight className="size-4 ml-2" /></>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                No credit card required · Cancel anytime
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer reassurance */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          You can switch plans or upgrade to the full CRM at any time from your dashboard.
        </div>
      </div>
    </div>
  );
}

export default SignupModeSelector;
