'use client';

import * as React from 'react';
import { InstantBookingDialog } from '@/components/marketplace/instant-booking-dialog';
import type { ProviderService } from '@/components/marketplace/types';

interface ServiceBookButtonProps {
  /** The specific service to pre-select in the booking dialog. */
  service: ProviderService;
  /** Full service list — the dialog needs all services so the user can change selection. */
  services: ProviderService[];
  providerTenantId: string;
  providerName: string;
  currency?: string | null;
}

/**
 * Per-service "Book this service" button for marketplace providers.
 *
 * Renders a button that opens the `InstantBookingDialog` with the clicked
 * service pre-selected (via `defaultServiceId`). This replaces the old dead
 * `<a href="#book">` anchor that pointed to a non-existent target — clicking
 * it did nothing because no element on the page had `id="book"`.
 *
 * For non-marketplace providers the parent `ServiceCard` still renders a plain
 * `<a href="#book">` anchor that scrolls to the `PublicBookingForm` (whose
 * wrapper carries `id="book"`).
 */
export function ServiceBookButton({
  service,
  services,
  providerTenantId,
  providerName,
  currency,
}: ServiceBookButtonProps) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 block w-full text-center rounded-md bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition-colors"
      >
        Book this service
      </button>
      <InstantBookingDialog
        open={open}
        onOpenChange={setOpen}
        providerTenantId={providerTenantId}
        providerName={providerName}
        currency={currency}
        services={services}
        defaultServiceId={service.id}
      />
    </>
  );
}
