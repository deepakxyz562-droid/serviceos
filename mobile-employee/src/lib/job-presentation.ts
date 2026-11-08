import type { Job, JobLineItem } from '@/types';

export function parseJobArray<T>(value: unknown): T[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === 'object') : [];
  } catch { return []; }
}

export function normalizeJob(job: Job): Job {
  return {
    ...job,
    customer: job.customer ?? {
      id: job.customerId ?? '', name: job.customerName || 'Customer',
      phone: job.customerPhone, email: job.customerEmail,
    },
    lineItems: Array.isArray(job.lineItems) ? job.lineItems : parseJobArray<JobLineItem>(job.lineItemsJson),
  };
}

export function hasLinkedChecklist(value: string | null | undefined): boolean {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) && parsed.some((id) => typeof id === 'string' && id.length > 0);
  } catch { return false; }
}

export function lineItemTotal(item: JobLineItem): number {
  const quantity = Number(item.quantity ?? 1);
  const rate = Number(item.rate ?? item.unitPrice);
  return Number.isFinite(rate) ? quantity * rate : Number(item.amount ?? item.total ?? 0);
}
