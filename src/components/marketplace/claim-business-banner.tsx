'use client';

import * as React from 'react';
import { ShieldCheck, ChevronRight, LogIn } from 'lucide-react';
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
 * A subtle, compact link (not a big banner) shown on the provider detail
 * page to ANY visitor when the business is unclaimed — authenticated
 * non-owner users AND anonymous visitors.
 *
 *   • Authenticated non-owner → clicking opens the ClaimBusinessModal wizard
 *     directly (phone / email / Google / document verification).
 *   • Anonymous visitor → clicking opens a small "Sign in to claim" dialog
 *     that directs them to register/login first, then return to claim.
 *   • The owner of the business → never sees the link (can't claim own).
 *
 * Design rationale: marketplace seed data (OSM imports) all have
 * `claimed=false`. Showing a big colored "Claim this business!" banner on
 * every listing looks spammy and unprofessional. Instead, we render a small
 * text link that's discoverable but unobtrusive.
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

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Are you the owner? Claim this business
        <ChevronRight className="h-3 w-3" />
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
