'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
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
import { useAppStore } from '@/store/app-store';

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
 *
 * Auth state resolution
 * ----------------------
 * This component no longer takes `currentTenantId` / `isAuthenticated` as
 * props from the server. Instead it reads from the shared Zustand app-store,
 * which is hydrated by `<MarketplaceHeader>` on mount via a single cached
 * `/api/auth/me` fetch (30s TTL — Task ID 8). This lets the page drop the
 * `getAuthUser()` call that previously forced `dynamic = 'force-dynamic'`,
 * so the page can now be statically generated with `revalidate = 60` and
 * served from the data cache.
 *
 * While `authHydrated` is false (initial mount, fetch in-flight), the
 * component renders `null` — the banner pops in once auth state is known.
 * This avoids flashing the "Claim this business" CTA to a logged-in owner.
 */
interface ClaimBusinessBannerProps {
  tenantId: string;
  tenantName: string;
  tenantEmail?: string | null;
  tenantCity?: string | null;
  tenantState?: string | null;
  /** Whether the business is already claimed. When true, renders the
   *  "Verified owner" notice instead of the claim CTA. */
  isClaimed?: boolean;
}

export function ClaimBusinessBanner({
  tenantId,
  tenantName,
  tenantEmail,
  tenantCity,
  tenantState,
  isClaimed = false,
}: ClaimBusinessBannerProps) {
  const [claimOpen, setClaimOpen] = React.useState(false);
  const [signInGateOpen, setSignInGateOpen] = React.useState(false);

  // Read auth state from the shared Zustand store. The MarketplaceHeader
  // fires /api/auth/me on mount and populates this store, so we don't need
  // a separate fetch here (and even if we did, /api/auth/me is cached 30s
  // server-side — Task ID 8).
  const auth = useAppStore((s) => s.auth);
  const authHydrated = useAppStore((s) => s.authHydrated);

  const isAuthenticated = !!auth?.isAuthenticated;
  const currentTenantId: string | null =
    (auth?.tenant as { id?: string } | null)?.id ?? null;

  // ── Auto-open the claim modal when ?claim=true is in the URL ──────────
  // This is used by the registration-time business match flow: when the user
  // clicks "This is my business" on a match, they're redirected to the
  // listing page with ?claim=true. This effect auto-opens the modal so they
  // don't have to find + click the banner manually.
  //
  // CRITICAL: useSearchParams + useEffect MUST be called BEFORE any early
  // returns. React requires ALL hooks to be called in the same order on
  // every render. Previously these hooks were AFTER `if (!authHydrated) return null;`
  // which meant they were never called on the first render (when authHydrated
  // is false) → the auto-open effect never fired.
  const searchParams = useSearchParams();
  React.useEffect(() => {
    // Wait for auth to hydrate before deciding what to open.
    if (!authHydrated) return;
    // Don't auto-open for the owner of the business.
    if (currentTenantId === tenantId) return;
    // Don't auto-open if the business is already claimed.
    if (isClaimed) return;

    const shouldAutoOpen = searchParams?.get('claim') === 'true';
    if (shouldAutoOpen) {
      if (isAuthenticated) {
        setClaimOpen(true);
      } else {
        setSignInGateOpen(true);
      }
    }
    // We intentionally don't strip the ?claim=true param from the URL here
    // (unlike the ?view= param stripping in home-page-client.tsx) because
    // this component is not the right place to manage history. The user
    // can close the modal + the param stays — if they re-open it, the modal
    // won't re-trigger because the effect only runs once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authHydrated]); // only run once when auth hydrates

  // While the auth state is still being fetched (header hasn't resolved
  // /api/auth/me yet), render nothing. The banner will appear once we know
  // for sure whether the visitor is the owner (hidden) or not (shown).
  // Worst case: ~50-100ms on first paint, then the banner pops in. This is
  // far better than forcing the whole page to be dynamic just to know the
  // auth state at render time.
  if (!authHydrated) return null;

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
      <div className="mb-3 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/40">
        <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-100">
            Verified owner
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300 mt-0.5">
            This business manages its profile on Fieseros. Contact them directly for services, availability, and enquiries.
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
            Own this business?
          </p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
            Claim your profile to update info, respond to leads and grow your business.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700">
          Claim business <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </button>

      {/* Full claim wizard — only for authenticated users */}
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
