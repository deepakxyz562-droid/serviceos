'use client';

import * as React from 'react';
import { ShieldCheck, ChevronRight } from 'lucide-react';
import { ClaimBusinessModal } from './claim-business-modal';

/**
 * ClaimBusinessBanner
 * --------------------
 * A subtle, compact link (not a big banner) shown on the provider detail
 * page ONLY to authenticated non-owner users. Opens the ClaimBusinessModal
 * wizard when clicked.
 *
 * Design rationale: marketplace seed data (OSM imports) all have
 * `claimed=false`. Showing a big colored "Claim this business!" banner on
 * every listing looks spammy and unprofessional. Instead, we render a small
 * text link that's discoverable but unobtrusive.
 *
 * The component is hidden when:
 *   - The business is already claimed (page-level guard)
 *   - The current user is the owner (can't claim your own)
 *   - The visitor is anonymous (page-level guard — they'd need to register
 *     first anyway)
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

  // Hide if the current user is the owner of this business
  if (currentTenantId === tenantId) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400 dark:hover:text-emerald-300"
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Are you the owner? Claim this business
        <ChevronRight className="h-3 w-3" />
      </button>

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
