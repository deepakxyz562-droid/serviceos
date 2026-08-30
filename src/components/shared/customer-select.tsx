'use client';

import * as React from 'react';
import { EntitySelect, type EntityOption } from '@/components/ui/entity-select';
import { authFetch } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface CustomerSelectProps {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  /** Pre-selected customer to display as a chip (for edit forms) */
  initialCustomer?: { id: string; name: string; phone?: string | null } | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ── Search function ─────────────────────────────────────────────────────────

async function searchCustomers(query: string): Promise<EntityOption[]> {
  const res = await authFetch(`/api/customers?search=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  const customers: Customer[] = data.customers ?? (Array.isArray(data) ? data : []);
  return customers.map((c) => ({
    id: c.id,
    label: c.name,
    sublabel: c.phone || c.email || undefined,
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Debounced customer selector with server-side search.
 *
 * Replaces the "fetch all 500 customers into a <select>" anti-pattern found
 * in 6 CRM forms (broadcast, quotes, leads, recurring-schedule, calendar,
 * whatsapp-job-dashboard). Each of those forms fetched limit=200–1000 and
 * mounted 50–1000 DOM nodes. This component fetches max 10 results on demand.
 *
 * Pattern: 2+ chars → 300ms debounce → GET /api/customers?search=…&limit=10
 *          → 10 results in dropdown → select → chip with clear button
 *
 * USAGE:
 *   <CustomerSelect
 *     value={customerId}
 *     onChange={setCustomerId}
 *     initialCustomer={editing ? { id: job.customerId, name: job.customerName } : null}
 *   />
 */
export function CustomerSelect({
  value,
  onChange,
  initialCustomer,
  placeholder = 'Search customers…',
  disabled,
  className,
}: CustomerSelectProps) {
  const initialOption: EntityOption | null = React.useMemo(
    () =>
      initialCustomer
        ? {
            id: initialCustomer.id,
            label: initialCustomer.name,
            sublabel: initialCustomer.phone || undefined,
          }
        : null,
    [initialCustomer]
  );

  return (
    <EntitySelect
      value={value}
      onChange={onChange}
      initialOption={initialOption}
      placeholder={placeholder}
      searchFn={searchCustomers}
      disabled={disabled}
      className={className}
      clearLabel="Clear customer"
    />
  );
}

export default CustomerSelect;
