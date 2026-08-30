'use client';

import * as React from 'react';
import { EntitySelect, type EntityOption } from '@/components/ui/entity-select';
import { authFetch } from '@/lib/api';

// ── Types ───────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  name: string;
  phone?: string | null;
  role?: string | null;
}

interface EmployeeSelectProps {
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  /** Pre-selected employee to display as a chip (for edit forms) */
  initialEmployee?: { id: string; name: string; phone?: string | null } | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

// ── Search function ─────────────────────────────────────────────────────────

async function searchEmployees(query: string): Promise<EntityOption[]> {
  const res = await authFetch(`/api/employees?search=${encodeURIComponent(query)}&limit=10`);
  if (!res.ok) return [];
  const data = await res.json();
  const employees: Employee[] = Array.isArray(data) ? data : [];
  return employees.map((e) => ({
    id: e.id,
    label: e.name,
    sublabel: e.phone || e.role || undefined,
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

/**
 * Debounced employee selector with server-side search.
 *
 * Replaces the "fetch all 100 employees into a <select>" anti-pattern found
 * in calendar-view, whatsapp-job-dashboard, and recurring-schedule-page.
 *
 * Pattern: 2+ chars → 300ms debounce → GET /api/employees?search=…&limit=10
 *          → 10 results in dropdown → select → chip with clear button
 *
 * USAGE:
 *   <EmployeeSelect
 *     value={employeeId}
 *     onChange={setEmployeeId}
 *     initialEmployee={editing ? { id: job.employeeId, name: job.employeeName } : null}
 *   />
 */
export function EmployeeSelect({
  value,
  onChange,
  initialEmployee,
  placeholder = 'Search employees…',
  disabled,
  className,
}: EmployeeSelectProps) {
  const initialOption: EntityOption | null = React.useMemo(
    () =>
      initialEmployee
        ? {
            id: initialEmployee.id,
            label: initialEmployee.name,
            sublabel: initialEmployee.phone || undefined,
          }
        : null,
    [initialEmployee]
  );

  return (
    <EntitySelect
      value={value}
      onChange={onChange}
      initialOption={initialOption}
      placeholder={placeholder}
      searchFn={searchEmployees}
      disabled={disabled}
      className={className}
      clearLabel="Clear employee"
    />
  );
}

export default EmployeeSelect;
