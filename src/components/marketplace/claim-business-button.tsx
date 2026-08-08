'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight } from 'lucide-react';
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
import { LogIn, ShieldCheck } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

/**
 * ClaimBusinessButton
 * --------------------
 * Reusable "Claim business" CTA used on the marketplace provider card and
 * sidebar. Replaces the broken `<Link href="/claim">` (no such route exists)
 * with the correct behaviour for every visitor type:
 *
 *   1. Anonymous visitor
 *      → Card variant: links to the provider's detail page so the
 *        `ClaimBusinessBanner` there opens the sign-in gate.
 *      → Sidebar variant: links to the auth register flow with a returnUrl
 *        back to the marketplace (the sidebar has no specific tenant).
 *
 *   2. Authenticated non-owner (trial / subscriber CRM user)
 *      → Opens `ClaimBusinessModal` directly against the target tenant.
 *
 *   3. The owner of the business
 *      → Renders nothing (they can't claim their own listing).
 *
 * Auth state is read from the shared Zustand `app-store` (hydrated by
 * `<MarketplaceHeader>` via `/api/auth/me`). While `authHydrated` is false
 * the component renders nothing — the CTA pops in once auth state is known.
 * This mirrors the behaviour of `ClaimBusinessBanner` on the detail page.
 *
 * The "claim owner" check (`currentTenantId === tenantId`) only applies to
 * the card variant; the sidebar has no specific tenant so it always renders.
 */
interface ClaimBusinessButtonProps {
  /** Target tenant ID (required for 'card' variant). */
  tenantId?: string;
  /** Target tenant name (shown in the modal title / sign-in gate copy). */
  tenantName?: string;
  /** Tenant email — pre-fills the claim modal when available. */
  tenantEmail?: string | null;
  /** Tenant city — used as the address placeholder in the modal. */
  tenantCity?: string | null;
  /** Tenant state — used as the address placeholder in the modal. */
  tenantState?: string | null;
  /**
   * Visual variant:
   *   - 'card'    : compact text link with ArrowRight (for the provider card footer)
   *   - 'sidebar' : slightly larger text link with ChevronRight (for the sidebar promo card)
   */
  variant: 'card' | 'sidebar';
  /**
   * Provider detail-page href (card variant only). When the visitor is
   * anonymous, the CTA links here instead of opening the modal.
   */
  profileHref?: string;
}

export function ClaimBusinessButton({
  tenantId,
  tenantName,
  tenantEmail,
  tenantCity,
  tenantState,
  variant,
  profileHref,
}: ClaimBusinessButtonProps) {
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [signInGateOpen, setSignInGateOpen] = React.useState(false);

  // Read auth state from the shared Zustand store. The MarketplaceHeader
  // fires /api/auth/me on mount and populates this store.
  const auth = useAppStore((s) => s.auth);
  const authHydrated = useAppStore((s) => s.authHydrated);

  const isAuthenticated = !!auth?.isAuthenticated;
  const currentTenantId: string | null =
    (auth?.tenant as { id?: string } | null)?.id ?? null;

  // While the auth state is still being fetched, render nothing. The CTA
  // appears once we know for sure whether the visitor is the owner (hidden)
  // or not (shown). Worst case ~50-100ms on first paint.
  if (!authHydrated) return null;

  // Card variant: hide if this is the visitor's own business.
  // Sidebar variant has no specific tenant, so it always renders.
  if (variant === 'card' && tenantId && currentTenantId === tenantId) {
    return null;
  }

  function handleClick(e: React.MouseEvent) {
    // If the card variant has a profileHref and the visitor is anonymous,
    // we want the Link to navigate normally (don't preventDefault).
    if (!isAuthenticated && variant === 'card' && profileHref) {
      return; // Let the <Link> navigate to the detail page.
    }
    e.preventDefault();
    if (isAuthenticated) {
      setClaimOpen(true);
    } else {
      setSignInGateOpen(true);
    }
  }

  // ── Card variant ────────────────────────────────────────────────────────
  if (variant === 'card') {
    // Anonymous + has profileHref → plain Link to the detail page (the
    // ClaimBusinessBanner there handles the sign-in gate + modal).
    if (!isAuthenticated && profileHref) {
      return (
        <Link
          href={profileHref}
          prefetch
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
          aria-label={`Claim ${tenantName ?? 'this business'}`}
        >
          Claim business <ArrowRight className="h-3 w-3" />
        </Link>
      );
    }

    // Authenticated (or anonymous without profileHref) → button that opens
    // the modal / sign-in gate.
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-400 transition-colors"
          aria-label={`Claim ${tenantName ?? 'this business'}`}
        >
          Claim business <ArrowRight className="h-3 w-3" />
        </button>

        {isAuthenticated && tenantId ? (
          <ClaimBusinessModal
            open={claimOpen}
            onOpenChange={setClaimOpen}
            tenantId={tenantId}
            tenantName={tenantName ?? 'this business'}
            tenantEmail={tenantEmail}
            tenantCity={tenantCity}
            tenantState={tenantState}
          />
        ) : null}

        <SignInGateDialog
          open={signInGateOpen}
          onOpenChange={setSignInGateOpen}
          tenantName={tenantName ?? 'this business'}
        />
      </>
    );
  }

  // ── Sidebar variant ─────────────────────────────────────────────────────
  // The sidebar promo card has no specific tenant — it's a generic "own a
  // business?" CTA. Authenticated users go to the marketplace to find their
  // listing; anonymous users go to register.
  if (isAuthenticated) {
    return (
      <Link
        href="/marketplace"
        prefetch
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 transition-colors"
      >
        Claim your business <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    );
  }

  return (
    <>
      <Link
        href="/?auth=register&returnUrl=%2Fmarketplace"
        prefetch={false}
        className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:text-emerald-300 transition-colors"
      >
        Claim your business <ChevronRight className="h-3.5 w-3.5" />
      </Link>
      <SignInGateDialog
        open={signInGateOpen}
        onOpenChange={setSignInGateOpen}
        tenantName={tenantName ?? 'your business'}
      />
    </>
  );
}

/**
 * SignInGateDialog
 * ------------------
 * Small dialog shown to anonymous visitors who click "Claim this business"
 * without a profileHref (sidebar variant). Explains that they need an account
 * first, and directs them to the auth page.
 *
 * For the card variant with a profileHref, this dialog is not used — the
 * visitor is sent to the detail page where `ClaimBusinessBanner` handles the
 * full sign-in gate flow.
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
