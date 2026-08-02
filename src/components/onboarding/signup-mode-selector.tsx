'use client';

/**
 * SignupModeSelector
 * ===================
 * The "Step 0" decision screen shown immediately after a fresh registration
 * (before the onboarding wizard). Asks the user how they want to use
 * Fieseros:
 *
 *   1. "Grow with CRM" (crm_trial) — full CRM + 14-day free trial.
 *      Proceeds to the existing 4-step SaaSOnboarding wizard.
 *
 *   2. "List my business" (listing_only) — free marketplace listing only.
 *      Converts the tenant from trial → claimed_free, then proceeds to the
 *      mini 1-step ListingOnboarding wizard.
 *
 * Renders as a full-screen overlay (like the SaaSOnboarding wizard) so the
 * user can't access the app until they've chosen a path.
 */

import { useState } from 'react';
import {
  Sparkles,
  Store,
  Zap,
  MapPin,
  Check,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
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
}

export function SignupModeSelector({
  tenant,
  user,
  onChooseCrm,
  onChooseListing,
}: SignupModeSelectorProps) {
  const [busy, setBusy] = useState<'crm' | 'listing' | null>(null);
  const setAuth = useAppStore((s) => s.setAuth);

  async function handleChoose(mode: 'crm_trial' | 'listing_only') {
    setBusy(mode === 'crm_trial' ? 'crm' : 'listing');
    try {
      const res = await authFetch('/api/tenants/me/signup-mode?XTransformPort=3000', {
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
      // (signupMode, listingTier, plan, planStatus, trialEndsAt) so the
      // ProviderMarketplaceDashboard can detect the listing-only tier and
      // render the simplified dashboard.
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
            // localStorage unavailable
          }
        }
      }
      if (mode === 'crm_trial') {
        toast.success('Great choice! Your 14-day CRM trial starts now.');
        onChooseCrm();
      } else {
        toast.success('Your marketplace listing is ready. Let’s add a few details.');
        onChooseListing();
      }
    } catch {
      toast.error('Network error. Please try again.');
      setBusy(null);
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 overflow-y-auto">
      <div className="w-full max-w-3xl my-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-emerald-600 text-white mb-4 shadow-lg shadow-emerald-600/20">
            <Sparkles className="size-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Welcome, {firstName}! 👋
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-lg mx-auto">
            You’re all signed up{tenant?.name ? <> for <strong className="text-foreground">{tenant.name}</strong></> : null}.
            How would you like to get started?
          </p>
        </div>

        {/* Two choice cards */}
        <div className="grid gap-4 sm:grid-cols-2">
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
              <p className="text-2xl font-bold mt-1">
                Free for 14 days
                <span className="text-sm font-normal text-muted-foreground"> · then from ₹999/mo</span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Full Fieseros CRM: dispatch, invoicing, AI Receptionist, online bookings, quote inbox, and emergency dispatch.
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
                  <><Loader2 className="size-4 animate-spin mr-2" /> Starting trial…</>
                ) : (
                  <>Start free trial <ArrowRight className="size-4 ml-2" /></>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                No credit card required for trial · Cancel anytime
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
              <p className="text-2xl font-bold mt-1">
                Free forever
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                A simple marketplace listing so customers can find and call you. No CRM, no online bookings.
              </p>
              <ul className="mt-4 space-y-1.5 text-sm">
                {[
                  'Public provider page on the marketplace',
                  '“Call Now” button for customers',
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
                  <><Loader2 className="size-4 animate-spin mr-2" /> Setting up listing…</>
                ) : (
                  <>Just list my business</>
                )}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                No trial · No credit card · Free forever
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Footer reassurance */}
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-emerald-600" />
          You can upgrade from a free listing to the full CRM at any time from your dashboard.
        </div>
      </div>
    </div>
  );
}

export default SignupModeSelector;
