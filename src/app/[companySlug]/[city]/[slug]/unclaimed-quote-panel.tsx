'use client';

import * as React from 'react';
import { FileText, Phone } from 'lucide-react';
import { QuoteRequestDialog } from '@/components/marketplace/quote-request-dialog';

interface UnclaimedQuotePanelProps {
  /** The unclaimed provider's tenant ID (for direct routing in the API) */
  providerTenantId: string;
  providerName: string;
  providerPhone?: string | null;
  providerIndustry?: string | null;
  providerCity?: string | null;
}

/**
 * Renders a "Request a Quote" CTA for unclaimed provider profiles.
 *
 * Email-gating logic:
 *   - This component is only rendered by the server when the provider has
 *     an email address (the server checks `business.email` before rendering).
 *   - If the provider has no email, the server renders the minimal "Call to
 *     Book" card instead — this component is never mounted in that case.
 *
 * The button opens the QuoteRequestDialog in DIRECT mode:
 *   - The dialog title says "Request a Quote from {providerName}"
 *   - On submit, the API creates a JobRequest tied to this provider and
 *     sends them a notification email (instead of broadcasting to nearby
 *     verified providers).
 */
export function UnclaimedQuotePanel({
  providerTenantId,
  providerName,
  providerPhone,
  providerIndustry,
  providerCity,
}: UnclaimedQuotePanelProps) {
  const [quoteOpen, setQuoteOpen] = React.useState(false);

  return (
    <>
      <div className="bg-gradient-to-br from-amber-600 to-orange-600 p-5 text-white">
        <div className="mb-1 flex items-center gap-2">
          <FileText className="h-4 w-4" />
          <h3 className="text-lg font-bold">Request a Quote</h3>
        </div>
        <p className="text-sm text-amber-50">
          Send {providerName} your project details and they&apos;ll get back to
          you with a quote — usually within 24 hours.
        </p>
      </div>
      <div className="p-5 space-y-3">
        <button
          type="button"
          onClick={() => setQuoteOpen(true)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-amber-700"
        >
          <FileText className="h-5 w-5" />
          Request a Quote
        </button>
        {providerPhone && (
          <a
            href={`tel:${providerPhone.replace(/[^+\d]/g, '')}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-input bg-background px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            <Phone className="h-4 w-4" />
            Call {providerPhone}
          </a>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Your request will be emailed directly to {providerName}.
        </p>
      </div>

      <QuoteRequestDialog
        open={quoteOpen}
        onOpenChange={setQuoteOpen}
        defaultTitle={`Quote request for ${providerName}`}
        defaultIndustry={providerIndustry}
        defaultCity={providerCity}
        targetTenantId={providerTenantId}
        targetProviderName={providerName}
        // Phase 4B v2: structured marketplace attribution
        provider={{
          id: providerTenantId,
          name: providerName,
          industry: providerIndustry,
          city: providerCity,
        }}
        cardPath="unclaimed_panel"
      />
    </>
  );
}
