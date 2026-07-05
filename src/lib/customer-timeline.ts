/**
 * Customer Timeline helper library (V1.5)
 * --------------------------------------
 * Writes unified chronological entries to the new `CustomerTimelineEntry`
 * Prisma model (db.customerTimelineEntry). The Customer 360 page surfaces
 * these entries as a single timeline that aggregates leads, calls, emails,
 * WhatsApp messages, jobs, invoices, payments, photos, signatures, reviews,
 * tickets, notes, visits, and asset changes.
 *
 * `addTimelineEntry()` is the canonical write path. The `sync*ToTimeline()`
 * helpers are convenience wrappers that turn an existing entity (Job, Invoice,
 * Lead, …) into a timeline entry on its associated customer.
 *
 * All helpers swallow errors — a logging failure must never break the main
 * operation.
 */

import { db } from '@/lib/db';

export interface AddTimelineEntryParams {
  tenantId: string;
  customerId: string;
  /**
   * lead | call | email | whatsapp | sms | quote | job | invoice | payment |
   * photo | signature | review | ticket | note | visit | asset | status_change
   */
  entryType: string;
  title: string;
  description?: string;
  sourceType?: string; // Lead, Job, Invoice, etc.
  sourceId?: string;
  metadataJson?: string;
  actorId?: string | null;
  actorName?: string | null;
  actorType?: string; // user, employee, system, customer, ai
  eventDate?: Date | string;
  isInternal?: boolean;
}

/**
 * Insert a single CustomerTimelineEntry row. Never throws — failures are
 * logged to the server console only.
 */
export async function addTimelineEntry(
  params: AddTimelineEntryParams,
): Promise<void> {
  try {
    if (!params.tenantId || !params.customerId) return;
    await db.customerTimelineEntry.create({
      data: {
        tenantId: params.tenantId,
        customerId: params.customerId,
        entryType: params.entryType,
        title: params.title,
        description: params.description ?? null,
        sourceType: params.sourceType ?? null,
        sourceId: params.sourceId ?? null,
        metadataJson: params.metadataJson ?? '{}',
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? null,
        actorType: params.actorType ?? 'user',
        eventDate: params.eventDate ? new Date(params.eventDate) : new Date(),
        isInternal: params.isInternal ?? false,
      },
    });
  } catch (err) {
    console.error('[customer-timeline] Failed to write timeline entry:', err);
  }
}

// ─── Sync helpers ──────────────────────────────────────────────────────────
// Each one accepts a "loose" entity object (any record) and writes a single
// timeline entry to its customer. Customer → tenant resolution is done here so
// callers don't have to thread it through.

interface JobLike {
  id?: string | null;
  title?: string | null;
  status?: string | null;
  customerId?: string | null;
  workspaceId?: string | null;
  createdAt?: Date | string | null;
  assigneeName?: string | null;
  [key: string]: unknown;
}

interface InvoiceLike {
  id?: string | null;
  number?: string | null;
  customerId?: string | null;
  tenantId?: string | null;
  status?: string | null;
  total?: number | null;
  currency?: string | null;
  createdAt?: Date | string | null;
  paidAt?: Date | string | null;
  [key: string]: unknown;
}

interface LeadLike {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  source?: string | null;
  status?: string | null;
  customerId?: string | null;
  tenantId?: string | null;
  serviceType?: string | null;
  createdAt?: Date | string | null;
  [key: string]: unknown;
}

/**
 * Resolve tenantId for a customer-backed entity that only has a workspaceId
 * (Customer/Job use workspaceId, while Lead/Invoice use tenantId directly).
 */
async function resolveTenantIdFromWorkspace(
  workspaceId: string | null | undefined,
  fallbackTenantId?: string | null,
): Promise<string | null> {
  if (fallbackTenantId) return fallbackTenantId;
  if (!workspaceId) return null;
  try {
    const ws = await db.workspace.findUnique({
      where: { id: workspaceId },
      select: { tenantId: true },
    });
    return ws?.tenantId ?? null;
  } catch {
    return null;
  }
}

export async function syncJobToTimeline(
  tenantId: string,
  job: JobLike | null | undefined,
): Promise<void> {
  if (!job?.id || !job.customerId) return;
  const resolvedTenantId =
    tenantId || (await resolveTenantIdFromWorkspace(job.workspaceId));
  if (!resolvedTenantId) return;

  const title = `Job created: ${job.title || 'Untitled job'}`;
  const description =
    `Status: ${job.status || 'pending'}` +
    (job.assigneeName ? ` · Assigned to ${job.assigneeName}` : ' · Unassigned');

  await addTimelineEntry({
    tenantId: resolvedTenantId,
    customerId: job.customerId,
    entryType: 'job',
    title,
    description,
    sourceType: 'Job',
    sourceId: job.id,
    metadataJson: JSON.stringify({
      jobId: job.id,
      status: job.status,
      assigneeName: job.assigneeName,
    }),
    actorType: 'system',
    eventDate: job.createdAt ?? new Date(),
  });
}

export async function syncInvoiceToTimeline(
  tenantId: string,
  invoice: InvoiceLike | null | undefined,
): Promise<void> {
  if (!invoice?.id || !invoice.customerId) return;
  const resolvedTenantId = tenantId || invoice.tenantId || null;
  if (!resolvedTenantId) return;

  const isPaid = invoice.status === 'paid';
  const title = isPaid
    ? `Invoice paid: ${invoice.number || invoice.id}`
    : `Invoice created: ${invoice.number || invoice.id}`;
  const description =
    `${invoice.currency || 'USD'} ${(invoice.total ?? 0).toFixed(2)}` +
    ` · Status: ${invoice.status || 'draft'}`;

  await addTimelineEntry({
    tenantId: resolvedTenantId,
    customerId: invoice.customerId,
    entryType: isPaid ? 'payment' : 'invoice',
    title,
    description,
    sourceType: 'Invoice',
    sourceId: invoice.id,
    metadataJson: JSON.stringify({
      invoiceId: invoice.id,
      number: invoice.number,
      total: invoice.total,
      currency: invoice.currency,
      status: invoice.status,
    }),
    actorType: 'system',
    eventDate: invoice.paidAt ?? invoice.createdAt ?? new Date(),
  });
}

export async function syncLeadToTimeline(
  tenantId: string,
  lead: LeadLike | null | undefined,
): Promise<void> {
  if (!lead?.id || !lead.customerId) return;
  const resolvedTenantId = tenantId || lead.tenantId || null;
  if (!resolvedTenantId) return;

  const title = `Lead received: ${lead.name || 'Unknown'}`;
  const description =
    `Source: ${lead.source || 'manual'}` +
    (lead.serviceType ? ` · ${lead.serviceType}` : '') +
    ` · Status: ${lead.status || 'new'}`;

  await addTimelineEntry({
    tenantId: resolvedTenantId,
    customerId: lead.customerId,
    entryType: 'lead',
    title,
    description,
    sourceType: 'Lead',
    sourceId: lead.id,
    metadataJson: JSON.stringify({
      leadId: lead.id,
      source: lead.source,
      serviceType: lead.serviceType,
      status: lead.status,
    }),
    actorType: 'system',
    eventDate: lead.createdAt ?? new Date(),
  });
}
