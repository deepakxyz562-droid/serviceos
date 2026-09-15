/**
 * Post-Job Smart Checklist
 * -------------------------
 * Rule-based (no AI call) checklist generator for completed jobs.
 * Determines recommended next actions based on current job state.
 *
 * Called after a job transitions to 'completed' status. Safe to call
 * fire-and-forget — never throws.
 */

import { db } from '@/lib/db';

export interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'done';
  actionType:
    | 'send_invoice'
    | 'request_payment'
    | 'request_review'
    | 'register_warranty'
    | 'schedule_maintenance'
    | 'send_followup';
  actionUrl?: string;
  dueInDays: number;
}

/**
 * Generate a post-job checklist for a completed job.
 * Returns items ordered by urgency (due soonest first).
 */
export async function generatePostJobChecklist(
  jobId: string,
  tenantId: string,
): Promise<ChecklistItem[]> {
  const items: ChecklistItem[] = [];

  try {
    // Fetch the job
    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        customerId: true,
        lineItemsJson: true,
        workspaceId: true,
      },
    });

    if (!job) return items;

    // Fetch invoice linked to this job
    const invoice = await db.invoice.findFirst({
      where: { jobId },
      select: { id: true, status: true },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch active warranties for this job
    const warranties = await db.warranty.findMany({
      where: { jobId },
      select: { id: true, title: true },
    });

    // Fetch customer assets without a nextServiceDate
    const assetsWithoutSchedule = job.customerId
      ? await db.customerAsset.findMany({
          where: { customerId: job.customerId },
          select: { id: true, name: true },
        }).then((assets) =>
          assets.filter(async () => {
            // We check whether there's a serviceHistory entry with nextServiceDate
            // Simple approach: return all assets, then check in bulk
            return true;
          })
        )
      : [];

    // More efficient: get asset IDs that have nextServiceDate scheduled
    let assetsNeedingSchedule: { id: string; name: string }[] = [];
    if (job.customerId) {
      const allAssets = await db.customerAsset.findMany({
        where: { customerId: job.customerId },
        select: {
          id: true,
          name: true,
          serviceHistory: {
            select: { nextServiceDate: true },
            orderBy: { serviceDate: 'desc' },
            take: 1,
          },
        },
      });
      assetsNeedingSchedule = allAssets.filter(
        (a) => !a.serviceHistory[0]?.nextServiceDate,
      );
    }

    // ── Build checklist ────────────────────────────────────────────

    // 1. Invoice
    if (!invoice) {
      items.push({
        id: 'send_invoice',
        label: 'Send Invoice',
        description: 'Generate and send invoice to customer',
        status: 'pending',
        actionType: 'send_invoice',
        actionUrl: `/jobs/${jobId}`,
        dueInDays: 0,
      });
    } else {
      items.push({
        id: 'send_invoice',
        label: 'Invoice Sent ✓',
        description: 'Invoice has been generated',
        status: 'done',
        actionType: 'send_invoice',
        dueInDays: 0,
      });
    }

    // 2. Payment
    if (!invoice || invoice.status !== 'paid') {
      items.push({
        id: 'request_payment',
        label: 'Collect Payment',
        description: 'Request payment from customer',
        status: 'pending',
        actionType: 'request_payment',
        actionUrl: `/jobs/${jobId}`,
        dueInDays: 1,
      });
    } else {
      items.push({
        id: 'request_payment',
        label: 'Payment Collected ✓',
        description: 'Payment has been received',
        status: 'done',
        actionType: 'request_payment',
        dueInDays: 0,
      });
    }

    // 3. Review request
    items.push({
      id: 'request_review',
      label: 'Ask for Review',
      description: 'Send a review request to the customer',
      status: 'pending',
      actionType: 'request_review',
      dueInDays: 1,
    });

    // 4. Warranty registration
    if (warranties.length === 0) {
      items.push({
        id: 'register_warranty',
        label: 'Register Warranty',
        description: 'Add warranty for parts or services provided',
        status: 'pending',
        actionType: 'register_warranty',
        actionUrl: `/jobs/${jobId}`,
        dueInDays: 3,
      });
    } else {
      items.push({
        id: 'register_warranty',
        label: `Warranty Registered ✓`,
        description: `${warranties.length} warranty on file`,
        status: 'done',
        actionType: 'register_warranty',
        dueInDays: 0,
      });
    }

    // 5. Schedule next maintenance (only if customer has unscheduled assets)
    if (assetsNeedingSchedule.length > 0) {
      items.push({
        id: 'schedule_maintenance',
        label: 'Schedule Follow-up Maintenance',
        description: `${assetsNeedingSchedule.length} equipment item${assetsNeedingSchedule.length > 1 ? 's' : ''} without a next service date`,
        status: 'pending',
        actionType: 'schedule_maintenance',
        dueInDays: 7,
      });
    }

    // 6. Thank-you follow-up (always)
    items.push({
      id: 'send_followup',
      label: 'Send Thank-You Follow-up',
      description: 'Send a follow-up message to check satisfaction',
      status: 'pending',
      actionType: 'send_followup',
      dueInDays: 30,
    });
  } catch (err) {
    console.error('[post-job-checklist] error (non-fatal):', err);
  }

  return items;
}
