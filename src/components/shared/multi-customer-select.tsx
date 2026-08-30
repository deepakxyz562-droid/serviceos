'use client';

import * as React from 'react';
import { MultiEntitySelect, type EntityOption } from '@/components/ui/multi-entity-select';
import { authFetch } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}

interface MultiCustomerSelectProps {
  value: string[];
  onChange: (ids: string[]) => void;
  /** Pre-selected customers to display as chips (for edit forms) */
  initialCustomers?: Array<{ id: string; name: string; phone?: string | null; email?: string | null }>;
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
    sublabel: c.email || c.phone || undefined,
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Multi-select customer picker with debounced server-side search.
 *
 * Replaces the "fetch all 500 customers into a checkbox list" anti-pattern
 * in broadcast-view (1000 checkbox rows across create + edit forms).
 *
 * Pattern: 2+ chars → 300ms debounce → GET /api/customers?search=…&limit=10
 *          → 10 results in dropdown → select → chips with remove buttons
 *
 * USAGE:
 *   <MultiCustomerSelect
 *     value={createForm.customerIds}
 *     onChange={(ids) => setCreateForm({ ...createForm, customerIds: ids })}
 *     initialCustomers={editing ? existingCustomers : []}
 *   />
 */
export function MultiCustomerSelect({
  value,
  onChange,
  initialCustomers = [],
  placeholder = 'Search customers…',
  disabled,
  className,
}: MultiCustomerSelectProps) {
  const initialOptions: EntityOption[] = React.useMemo(
    () =>
      initialCustomers.map((c) => ({
        id: c.id,
        label: c.name,
        sublabel: c.email || c.phone || undefined,
      })),
    [initialCustomers]
  );

  return (
    <MultiEntitySelect
      value={value}
      onChange={onChange}
      initialOptions={initialOptions}
      placeholder={placeholder}
      searchFn={searchCustomers}
      disabled={disabled}
      className={className}
    />
  );
}

export default MultiCustomerSelect;
