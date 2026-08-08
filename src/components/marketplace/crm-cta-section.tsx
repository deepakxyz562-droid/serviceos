'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  CalendarClock,
  FileText,
  Users,
  Navigation,
  CheckCircle2,
  ShieldCheck,
  LogIn,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ClaimBusinessModal } from './claim-business-modal';
import { useAppStore } from '@/store/app-store';

/**
 * CrmCtaSection
 * ---------------
 * The "For Business Owners" gradient CTA box shown on unclaimed marketplace
 * business detail pages. This is the marketplace → CRM bridge:
 *
 *   "Run your {industry} business with Fieseros"
 *
 * Two CTAs:
 *   1. "Explore {Industry} Software" → links to the industry CRM landing page
 *      (e.g. /plumbing-software). This is a plain <Link> — always works.
 *   2. "Claim this business" → opens the ClaimBusinessModal (if authenticated)
 *      or a SignInGateDialog (if anonymous). Previously this was a dead
 *      <a href="#book"> that just scrolled to the booking panel — now it
 *      properly triggers the claim/verification flow.
 *
 * This component is a client component because it needs to:
 *   - Read auth state from the Zustand store (to decide modal vs sign-in gate)
 *   - Manage modal open/close state
 *
 * Only rendered when `business.claimed === false` (checked by the parent page).
 */

interface CrmCtaSectionProps {
  tenantId: string;
  tenantName: string;
  tenantEmail?: string | null;
  tenantCity?: string | null;
  tenantState?: string | null;
  /** Industry CRM software page URL (e.g. /plumbing-software) */
  softwareUrl: string;
  /** Label for the software page (e.g. "Plumbing Software") */
  softwareLabel: string;
  /** Display name for the industry (e.g. "Plumbing") */
  industryName: string;
}

export function CrmCtaSection({
  tenantId,
  tenantName,
  tenantEmail,
  tenantCity,
  tenantState,
  softwareUrl,
  softwareLabel,
  industryName,
}: CrmCtaSectionProps) {
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [signInGateOpen, setSignInGateOpen] = React.useState(false);

  const auth = useAppStore((s) => s.auth);
  const authHydrated = useAppStore((s) => s.authHydrated);
  const isAuthenticated = !!auth?.isAuthenticated;

  function handleClaimClick() {
    if (isAuthenticated) {
      setClaimOpen(true);
    } else {
      setSignInGateOpen(true);
    }
  }

  return (
    <section
      id="crm-cta"
      aria-labelledby="crm-cta-heading"
      className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 p-6 sm:p-8"
    >
      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 text-xs font-semibold uppercase tracking-wide mb-2">
        <TrendingUp className="h-4 w-4" />
        <span>For Business Owners</span>
      </div>
      <h2 id="crm-cta-heading" className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Run your {industryName.toLowerCase()} business with Fieseros
      </h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
        {tenantName} is listed on the Fieseros Marketplace. If this is your business,
        claim this listing for free — or explore {softwareLabel.toLowerCase()} to manage
        leads, scheduling, dispatch, invoicing, and customer relationships in one platform.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Scheduling &amp; Dispatch</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Invoicing &amp; Payments</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Customer CRM</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Navigation className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Route Optimization</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          href={softwareUrl}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <TrendingUp className="h-4 w-4" />
          Explore {softwareLabel}
        </Link>
        <button
          type="button"
          onClick={handleClaimClick}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-5 py-2.5 text-sm font-semibold text-foreground hover:bg-muted/40 transition-colors"
        >
          <CheckCircle2 className="h-4 w-4" />
          Claim this business
        </button>
      </div>

      {/* Claim modal — only rendered for authenticated users */}
      {isAuthenticated && (
        <ClaimBusinessModal
          open={claimOpen}
          onOpenChange={setClaimOpen}
          tenantId={tenantId}
          tenantName={tenantName}
          tenantEmail={tenantEmail}
          tenantCity={tenantCity}
          tenantState={tenantState}
        />
      )}

      {/* Sign-in gate — for anonymous visitors */}
      <SignInGateDialog
        open={signInGateOpen}
        onOpenChange={setSignInGateOpen}
        tenantName={tenantName}
      />
    </section>
  );
}

/**
 * SignInGateDialog
 * ------------------
 * Small dialog shown to anonymous visitors who click "Claim this business".
 * Explains that they need an account first, and directs them to the auth
 * page. After signing in / registering, they return to this provider page
 * and the claim button will open the full modal directly.
 */
function SignInGateDialog({
  open,
  onOpenChange,
  tenantName,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantName: string;
}) {
  const returnUrl = typeof window !== 'undefined' ? window.location.href : '/';
  const registerHref = `/?auth=register&returnUrl=${encodeURIComponent(returnUrl)}`;
  const loginHref = `/?auth=login&returnUrl=${encodeURIComponent(returnUrl)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5 text-emerald-600" />
            Sign in to claim
          </DialogTitle>
          <DialogDescription>
            You need a Fieseros account to claim &ldquo;{tenantName}&rdquo; and verify
            your ownership. It&rsquo;s free and takes less than a minute.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mb-1 inline h-3.5 w-3.5 text-emerald-600" />{' '}
          After signing in, you&rsquo;ll return to this page to submit your claim
          (business email + Google Business Profile or document upload).
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <a href={registerHref} className="w-full">
            <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
              Create a free account
            </Button>
          </a>
          <a href={loginHref} className="w-full">
            <Button variant="outline" className="w-full">
              I already have an account
            </Button>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
