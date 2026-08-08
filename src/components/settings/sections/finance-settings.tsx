'use client';

import { DollarSign } from 'lucide-react';
import { SectionPlaceholder } from './_section-placeholder';

export function FinanceSettings() {
  return (
    <SectionPlaceholder
      title="Finance Settings"
      description="Invoices, quotes, taxes, currencies, payment methods, payment gateways, late fees, terms"
      icon={DollarSign}
      accent="emerald"
      configuredItems={[
        { label: 'Invoice Templates', hint: 'Customize invoice layout, logo, colors, fields' },
        { label: 'Quote Templates', hint: 'Standardize the quotes you send to customers' },
        { label: 'Tax Configuration', hint: 'GST, VAT, sales tax with multi-rate support' },
        { label: 'Currency Settings', hint: 'Base currency + foreign currency conversions' },
        { label: 'Payment Methods', hint: 'Cash, card, bank transfer, UPI, wallet' },
        { label: 'Payment Gateways', hint: 'Stripe, PayPal, Square connections' },
        { label: 'Late Fee Rules', hint: 'Automatic late fees on overdue invoices' },
        { label: 'Payment Terms', hint: 'Net 7, Net 15, Net 30, Due on Receipt' },
      ]}
    />
  );
}
