'use client';

import { Heart } from 'lucide-react';
import { SectionPlaceholder } from './_section-placeholder';

export function CustomersSettings() {
  return (
    <SectionPlaceholder
      title="Customer Settings"
      description="Customer portal, online booking, maintenance plans, warranty, notifications"
      icon={Heart}
      accent="rose"
      configuredItems={[
        { label: 'Customer Portal', hint: 'Branded portal where customers view jobs, invoices, history' },
        { label: 'Online Booking', hint: 'Self-service booking page with availability rules' },
        { label: 'Maintenance Plans', hint: 'Recurring service contracts with auto-renewal' },
        { label: 'Warranty Tracking', hint: 'Per-job warranty periods and claim workflows' },
        { label: 'Customer Notifications', hint: 'Booking confirmations, reminders, follow-ups' },
        { label: 'Feedback & Reviews', hint: 'Post-job review requests and NPS surveys' },
        { label: 'Customer Tiers', hint: 'Bronze, Silver, Gold loyalty tiers with perks' },
        { label: 'Portal Branding', hint: 'Logo, colors, custom domain for the portal' },
      ]}
    />
  );
}
