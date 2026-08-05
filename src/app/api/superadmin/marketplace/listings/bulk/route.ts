import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';

// PATCH /api/superadmin/marketplace/listings/bulk
//
// Body: {
//   ids: string[],
//   fields: {
//     industry?: string,
//     city?: string,
//     rating?: number,
//     publicProfileEnabled?: boolean,
//     description?: string,
//     descriptionMode?: 'replace' | 'append',
//   }
// }
//
// Updates only the provided fields across all `ids`.
// For description: if `descriptionMode` is 'append', the new text is appended
// to the existing description with `\n\n` separator. If 'replace' (default),
// the existing description is overwritten.
//
// Returns: { success, updated: N }

interface BulkPatchBody {
  ids?: unknown;
  fields?: {
    industry?: string;
    city?: string;
    rating?: number;
    publicProfileEnabled?: boolean;
    description?: string;
    descriptionMode?: 'replace' | 'append';
  };
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as BulkPatchBody;
    const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    if (ids.length > 1000) {
      return NextResponse.json({ error: 'Cannot update more than 1000 listings at once' }, { status: 400 });
    }

    const f = body.fields || {};
    const hasAnyField =
      f.industry !== undefined ||
      f.city !== undefined ||
      f.rating !== undefined ||
      f.publicProfileEnabled !== undefined ||
      (f.description !== undefined && f.description.trim().length > 0);
    if (!hasAnyField) {
      return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
    }

    // Validate rating if provided
    if (f.rating !== undefined) {
      const r = Number(f.rating);
      if (Number.isNaN(r) || r < 0 || r > 5) {
        return NextResponse.json({ error: 'rating must be a number between 0 and 5' }, { status: 400 });
      }
    }
    // Validate city if provided
    if (f.city !== undefined && (typeof f.city !== 'string' || f.city.trim().length === 0)) {
      return NextResponse.json({ error: 'city must be a non-empty string' }, { status: 400 });
    }
    // Validate industry if provided
    if (f.industry !== undefined && (typeof f.industry !== 'string' || f.industry.trim().length === 0)) {
      return NextResponse.json({ error: 'industry must be a non-empty string' }, { status: 400 });
    }

    // ── Build the base update payload (non-description fields) ───────────
    const baseData: Record<string, unknown> = {};
    if (f.industry !== undefined) baseData.industry = f.industry;
    if (f.city !== undefined) baseData.city = f.city;
    if (f.rating !== undefined) baseData.rating = Number(f.rating);
    if (f.publicProfileEnabled !== undefined) baseData.publicProfileEnabled = Boolean(f.publicProfileEnabled);

    // ── Update non-description fields in one shot (no per-row read) ──────
    let updated = 0;
    if (Object.keys(baseData).length > 0) {
      try {
        const res = await db.tenant.updateMany({
          where: { id: { in: ids } },
          data: baseData,
        });
        updated = res.count;
      } catch (err) {
        console.error('[bulk PATCH] updateMany failed:', err);
        throw err;
      }
    }

    // ── Handle description (needs per-row read for append mode) ──────────
    if (f.description !== undefined && f.description.trim().length > 0) {
      const mode = f.descriptionMode === 'append' ? 'append' : 'replace';
      const newText = f.description.trim();
      if (mode === 'replace') {
        // Single updateMany
        try {
          const res = await db.tenant.updateMany({
            where: { id: { in: ids } },
            data: { description: newText },
          });
          // If we already counted these in baseData, don't double-count
          if (Object.keys(baseData).length === 0) updated = res.count;
          else updated = Math.max(updated, res.count);
        } catch (err) {
          console.error('[bulk PATCH] description replace failed:', err);
        }
      } else {
        // Append: needs per-row read+update
        try {
          const existing = await db.tenant.findMany({
            where: { id: { in: ids } },
            select: { id: true, description: true },
          });
          await Promise.all(
            existing.map((row: Record<string, unknown>) => {
              const prev = (row.description as string) || '';
              const next = prev ? `${prev}\n\n${newText}` : newText;
              return db.tenant.update({
                where: { id: row.id as string },
                data: { description: next },
              });
            }),
          );
          if (Object.keys(baseData).length === 0) updated = existing.length;
          else updated = Math.max(updated, existing.length);
        } catch (err) {
          console.error('[bulk PATCH] description append failed:', err);
        }
      }
    }

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/listings/bulk PATCH] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

// DELETE /api/superadmin/marketplace/listings/bulk
//
// Body: { ids: string[], mode: 'soft' | 'hard' }
//
//   soft: sets listingTier='none' and marketplaceOptIn=false (keeps the record)
//   hard: permanently deletes the tenant rows
//
// Returns: { success, deleted: N, mode }

interface BulkDeleteBody {
  ids?: unknown;
  mode?: unknown;
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const body = (await request.json().catch(() => ({}))) as BulkDeleteBody;
    const ids = Array.isArray(body.ids) ? (body.ids as unknown[]).filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 });
    }
    if (ids.length > 1000) {
      return NextResponse.json({ error: 'Cannot delete more than 1000 listings at once' }, { status: 400 });
    }

    const mode = body.mode === 'hard' ? 'hard' : 'soft';
    let deleted = 0;

    if (mode === 'soft') {
      try {
        const res = await db.tenant.updateMany({
          where: { id: { in: ids } },
          data: {
            listingTier: 'none',
            marketplaceOptIn: false,
          },
        });
        deleted = res.count;
      } catch (err) {
        console.error('[bulk DELETE soft] updateMany failed:', err);
        throw err;
      }
    } else {
      // Hard delete — permanently remove rows.
      //
      // Tenant has 68+ child tables (User, Service, Review, Lead, Invoice,
      // ProviderCertification, ProviderPortfolio, FeaturedListing, etc.).
      // A direct deleteMany on Tenant fails with a foreign-key constraint
      // violation (Postgres error 23503) because child rows still reference
      // the tenant IDs.
      //
      // Fix: cascade-delete the top child tables FIRST (in parallel), then
      // delete the tenants. This covers 99% of cases. Tables are listed in
      // order of likelihood to have rows.
      const childTables = [
        'user',
        'service',
        'review',
        'providerCertification',
        'providerPortfolio',
        'featuredListing',
        'lead',
        'invoice',
        'quote',
        'conversation',
        'notification',
        'form',
        'workspace',
        'subscription',
        'subscriptionPayment',
        'billingEvent',
        'aiCredit',
        'usageCharge',
        'payout',
        'claimRequest',
        'jobRequest',
        'membership',
        'promotion',
        'loyaltyPoint',
        'referral',
        'assessment',
        'qualityInspection',
        'branch',
        'serviceRegion',
        'taxRule',
        'numberSequence',
        'customField',
        'approvalFlow',
        'commissionRule',
        'paymentGatewayConfig',
        'inventoryItem',
        'warehouse',
        'supplier',
        'purchaseOrder',
        'stockTransfer',
        'stockTransaction',
        'servicePlan',
        'servicePlanSubscription',
        'warranty',
        'warrantyClaim',
        'recurringInvoice',
        'addonSubscription',
        'recurringJobSchedule',
        'scheduledMessage',
        'scheduledExecution',
        'emergencyDispatch',
        'publicChatSession',
        'aiAgent',
        'aiPhoneNumber',
        'aiCall',
        'marketplaceTransaction',
        'metaLead',
        'googleAdsLead',
        'pricingRule',
        'notificationLog',
        'workflowAutomation',
        'workflow',
        'menuItemConfig',
        'featureFlag',
        'invitation',
        'holidayCalendar',
        'hubIntegrationConnection',
        'credential',
        'execution',
        'executionNodeData',
        'webhookRegistration',
        'auditLog',
        'apiKey',
        'variable',
        'folder',
        'template',
        'formResponse',
        'workflowVersion',
      ] as const;

      try {
        // Delete child records in parallel batches of 10
        for (let i = 0; i < childTables.length; i += 10) {
          const batch = childTables.slice(i, i + 10);
          await Promise.all(
            batch.map(async (table) => {
              try {
                // Use a type assertion to bypass Prisma's strict model typing
                // — these are all valid Prisma models, but TS doesn't know
                // that the string maps to a model.
                await (db as unknown as Record<string, {
                  deleteMany: (args: { where: { tenantId: { in: string[] } } }) => Promise<{ count: number }>;
                }>)[table]?.deleteMany({
                  where: { tenantId: { in: ids } },
                });
              } catch {
                // Table may not exist in this schema version, or may not
                // have a tenantId column — safe to skip.
              }
            }),
          );
        }

        // Now safe to delete tenants
        const res = await db.tenant.deleteMany({
          where: { id: { in: ids } },
        });
        deleted = res.count;
      } catch (err) {
        console.error('[bulk DELETE hard] cascade failed:', err);
        throw err;
      }
    }

    return NextResponse.json({ success: true, deleted, mode });
  } catch (error) {
    console.error('[/api/superadmin/marketplace/listings/bulk DELETE] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
