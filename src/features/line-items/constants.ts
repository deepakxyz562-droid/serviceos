/**
 * Service type constants — shared between leads, jobs, and other views.
 *
 * Extracted from leads-view.tsx (Phase 1).
 */

export const SERVICE_TYPES = [
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'cleaning', label: 'Cleaning' },
  { value: 'moving', label: 'Packers & Movers' },
  { value: 'salon', label: 'Salon' },
  { value: 'pest_control', label: 'Pest Control' },
  { value: 'electrical', label: 'Electricians' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'courier', label: 'Courier' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'car_wash', label: 'Car Wash' },
  { value: 'repair', label: 'Home Repair' },
] as const;

export function getServiceTypeLabel(value: string | null | undefined): string {
  if (!value) return '—';
  const found = SERVICE_TYPES.find((s) => s.value === value);
  return found ? found.label : value;
}
