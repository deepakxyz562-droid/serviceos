'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { SectionPlaceholder, type PlaceholderInfoRow } from './_section-placeholder';

/**
 * Billing settings placeholder. Pulls the current plan + usage snapshot
 * from /api/subscriptions so the business owner can see their live
 * subscription state at a glance. Full plan management lives in the
 * dedicated Subscription page (sidebar → Finance → Subscription).
 */
export function BillingSettings() {
  const [infoRows, setInfoRows] = useState<PlaceholderInfoRow[]>([
    { label: 'Current Plan', value: 'Loading…', status: 'muted' },
    { label: 'Plan Status', value: '—', status: 'muted' },
    { label: 'Renewal Date', value: '—', status: 'muted' },
    { label: 'AI Credits Remaining', value: '—', status: 'muted' },
  ]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/subscriptions?XTransformPort=3000');
        if (!res.ok) return;
        const data = await res.json();
        // The subscriptions API returns either { subscription } or { plan, planStatus, ... }
        const plan = data?.plan || data?.subscription?.plan || 'Free';
        const status = data?.planStatus || data?.subscription?.status || 'active';
        const renewal = data?.subscription?.currentPeriodEnd || data?.renewsAt;
        const credits = data?.aiCreditsRemaining ?? data?.subscription?.aiCreditsRemaining;
        if (cancelled) return;
        setInfoRows([
          { label: 'Current Plan', value: String(plan), status: 'ok' },
          {
            label: 'Plan Status',
            value: String(status),
            status: status === 'active' ? 'ok' : 'warn',
          },
          {
            label: 'Renewal Date',
            value: renewal ? new Date(renewal).toLocaleDateString() : '—',
            status: 'muted',
          },
          {
            label: 'AI Credits Remaining',
            value: credits != null ? String(credits) : '—',
            status: 'muted',
          },
        ]);
      } catch {
        // keep loading placeholders on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SectionPlaceholder
      title="Billing Settings"
      description="Subscription, usage, invoices, marketplace plan, AI credits, SMS/email usage, storage, payment history, upgrade"
      icon={CreditCard}
      accent="emerald"
      configuredItems={[
        { label: 'Subscription Plan', hint: 'View and change your Fieseros plan tier' },
        { label: 'Usage Dashboard', hint: 'Track seats, jobs, AI credits, SMS, storage used' },
        { label: 'Invoice History', hint: 'Download past invoices and receipts' },
        { label: 'Marketplace Plan', hint: 'Commission rate, featured-listing quota' },
        { label: 'AI Credits', hint: 'Buy credits and view per-feature usage' },
        { label: 'SMS / Email Usage', hint: 'Per-message breakdown and carrier fees' },
        { label: 'Storage Usage', hint: 'Files, images, attachments against your quota' },
        { label: 'Payment Method', hint: 'Update the card on file' },
      ]}
      infoRows={infoRows}
      ctaLabel="Manage in Subscription page →"
      onCta={() => {
        // Subscription has a dedicated page — surface a hint rather than duplicate UI.
        if (typeof window !== 'undefined') {
          window.location.hash = '#subscription';
        }
      }}
    />
  );
}
