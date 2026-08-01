'use client';

import * as React from 'react';
import { ShieldCheck, ChevronRight, LogIn, BadgeCheck, Store } from 'lucide-react';
import { ClaimBusinessModal } from './claim-business-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * ClaimBusinessBanner
 * --------------------
 * Shown on the provider detail page. Two modes:
 *
 *   1. Unclaimed listing (claimed=false) → shows a visible bordered banner
 *      card "Are you the owner? Claim this business" with a CTA button.
 *      • Authenticated non-owner → clicking opens the ClaimBusinessModal wizard.
 *      • Anonymous visitor → clicking opens a "Sign in to claim" dialog.
 *      • The owner of the business → never sees it (can't claim own).
 *
 *   2. Claimed listing (claimed=true) → shows a small "✓ Verified owner"
 *      notice so visitors know the listing is owner-managed (not seed data).
 *
 * Previously this was a tiny text link that was too easy to miss. Now it's
 * a compact but discoverable bordered card.
 */
interface ClaimBusinessBannerProps {
  tenantId: string;
  tenantName: string;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  tenantCity?: string | null;
  tenantState?: string | null;
  /** Current user's tenantId (to hide the link for the owner). */
  currentTenantId?: string | null;
  /** Whether the current visitor is authenticated. When false, a sign-in
   *  gate dialog is shown before the claim wizard. */
  isAuthenticated?: boolean;
  /** Whether the business is already claimed. When true, renders the
   *  "Verified owner" notice instead of the claim CTA. */
  isClaimed?: boolean;
}

export function ClaimBusinessBanner({
  tenantId,
  tenantName,
  tenantPhone,
  tenantEmail,
  tenantCity,
  tenantState,
  currentTenantId,
  isAuthenticated = false,
  isClaimed = false,
}: ClaimBusinessBannerProps) {
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [signInGateOpen, setSignInGateOpen] = React.useState(false);

  // Hide if the current user is the owner of this business
  if (currentTenantId === tenantId) return null;

  function handleClick() {
    if (isAuthenticated) {
      setClaimOpen(true);
    } else {
      setSignInGateOpen(true);
    }
  }

  // ── Already claimed → show "Verified owner" notice ──
  if (isClaimed) {
    return (
      <div className="mb-3 flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
            Verified owner
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            This listing is managed by the business owner.
          </p>
        </div>
      </div>
    );
  }

  // ── Unclaimed → show claim CTA banner ──
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="mb-3 flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/60"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
          <Store className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
            Are you the owner?
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            Claim this business to manage your profile, respond to reviews, and receive customer leads.
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      </button>

      {/* Full claim wizard — only for authenticated users */}
      {isAuthenticated && (
        <ClaimBusinessModal
          open={claimOpen}
          onOpenChange={setClaimOpen}
          tenantId={tenantId}
          tenantName={tenantName}
          tenantPhone={tenantPhone}
          tenantEmail={tenantEmail}
          tenantCity={tenantCity}
          tenantState={tenantState}
          onSuccess={() => {
            // Reload the page so the booking panel updates to show the owner's new state
            if (typeof window !== 'undefined') window.location.reload();
          }}
        />
      )}

      {/* Sign-in gate — for anonymous visitors */}
      <SignInGateDialog
        open={signInGateOpen}
        onOpenChange={setSignInGateOpen}
        tenantName={tenantName}
      />
    </>
  );
}

/**
 * SignInGateDialog
 * ------------------
 * Small dialog shown to anonymous visitors who click "Claim this business".
 * Explains that they need an account first, and directs them to the auth
 * page. After signing in / registering, they return to this provider page
 * and the claim link will open the full wizard directly.
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
  // Preserve the current URL so the auth flow can redirect back here.
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
            You need a ServiceOS account to claim &ldquo;{tenantName}&rdquo; and verify
            your ownership. It&rsquo;s free and takes less than a minute.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mb-1 inline h-3.5 w-3.5 text-emerald-600" />{' '}
          After signing in, you&rsquo;ll return to this page to complete the claim
          verification (phone OTP, email code, Google Business Profile, or document upload).
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
