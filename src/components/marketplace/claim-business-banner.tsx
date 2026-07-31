'use client';

import * as React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { ClaimBusinessModal } from './claim-business-modal';

/**
 * ClaimBusinessBanner
 * --------------------
 * A client-side banner shown on the provider detail page when the business is
 * unclaimed. Displays "Are you the owner? Claim this business" and opens the
 * ClaimBusinessModal wizard when clicked.
 *
 * The banner is hidden when:
 *   - The business is already claimed
 *   - The current user is the owner of this business (they can't claim their own)
 */
interface ClaimBusinessBannerProps {
  tenantId: string;
  tenantName: string;
  tenantPhone?: string | null;
  tenantEmail?: string | null;
  tenantCity?: string | null;
  tenantState?: string | null;
  /** Current user's tenantId (to hide the banner for the owner). */
  currentTenantId?: string | null;
}

export function ClaimBusinessBanner({
  tenantId,
  tenantName,
  tenantPhone,
  tenantEmail,
  tenantCity,
  tenantState,
  currentTenantId,
}: ClaimBusinessBannerProps) {
  const [open, setOpen] = React.useState(false);

  // Hide the banner if the current user is the owner of this business
  if (currentTenantId === tenantId) return null;

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:border-emerald-900 dark:from-emerald-950/40 dark:to-teal-950/40">
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Are you the owner of {tenantName}?
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Claim this listing to update your info, respond to reviews, and receive leads — free.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            Claim this business
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ClaimBusinessModal
        open={open}
        onOpenChange={setOpen}
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
    </>
  );
}
