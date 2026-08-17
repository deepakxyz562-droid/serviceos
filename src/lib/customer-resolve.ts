/**
 * Customer resolution helpers (deterministic, ID-based).
 *
 * Used by:
 *   - `ensureQuoteForDeal` (deal-quote-sync.ts) — Layer 1: resolve customerId
 *     from the Deal → Lead → Customer chain before creating a Quote.
 *   - `POST /api/deals` (deals/route.ts) — Layer 2: best-effort resolve an
 *     existing Customer by normalized phone when `customerId` is missing.
 *   - `scripts/repair-orphan-quotes.ts` — Layer 4: one-time backfill for
 *     orphaned Quotes (customerId IS NULL).
 *
 * DESIGN PRINCIPLES (per user directive):
 *   - Uses ONLY relational IDs (Deal.customerId, Lead.customerId) and the
 *     tenant-scoped `normalizedPhone` compound unique constraint.
 *   - NO fuzzy name matching — names are display fields, not identifiers.
 *   - NO cross-tenant lookups — every query is scoped to the Deal/Lead's
 *     own tenantId so tenant isolation is preserved.
 *   - Never throws — returns `null` when no deterministic match is found.
 *
 * SUPABASE / POSTGREST SAFETY:
 *   Only uses `findUnique` / `findFirst` — no `upsert`, no raw SQL, no
 *   compound-unique upserts. All queries are tenant-scoped.
 */

import { db } from '@/lib/db';
import { normalizePhone } from '@/lib/customer-normalize';

/**
 * Resolve a Customer by normalized phone within a tenant.
 *
 * Uses the `@@unique([tenantId, normalizedPhone])` compound constraint —
 * this is deterministic and tenant-scoped. If the Customer was created
 * without a `normalizedPhone` (e.g. via the legacy lead-convert path
 * before Layer 3 was applied), this returns null and the caller should
 * fall back to relational ID resolution.
 *
 * @returns `{ id, name, phone }` on a deterministic match, or `null`.
 */
export async function resolveCustomerByPhone(
  phone: string | null | undefined,
  tenantId: string | null | undefined,
): Promise<{ id: string; name: string; phone: string } | null> {
  if (!phone || !tenantId) return null;
  const normalized = normalizePhone(phone);
  if (!normalized) return null;

  try {
    const customer = await db.customer.findFirst({
      where: { tenantId, normalizedPhone: normalized },
      select: { id: true, name: true, phone: true },
    });
    return customer || null;
  } catch {
    // Never throw — callers rely on a null return to mean "no match".
    return null;
  }
}

/**
 * Resolve a customerId from the Deal → Lead → Customer chain.
 *
 * Resolution order (first deterministic match wins):
 *   1. `deal.customerId` — already set (best case).
 *   2. `deal.leadId` → `lead.customerId` — the Lead was already converted.
 *   3. `deal.leadId` → `lead.phone` → `Customer.normalizedPhone` (same tenant).
 *   4. `deal.customerPhone` → `Customer.normalizedPhone` (same tenant) —
 *      the Deal itself has a denormalized phone.
 *
 * @param dealId  The Deal to resolve from.
 * @returns `{ customerId, leadId, source }` or `{ customerId: null, ... }`.
 *          `source` describes how the customer was resolved (for logging /
 *          repair-report confidence labels). Never throws.
 */
export async function resolveCustomerIdFromDealChain(
  dealId: string,
): Promise<{
  customerId: string | null;
  leadId: string | null;
  source: 'deal.customerId' | 'lead.customerId' | 'lead.phone→normalizedPhone' | 'deal.phone→normalizedPhone' | null;
}> {
  if (!dealId) {
    return { customerId: null, leadId: null, source: null };
  }

  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        customerId: true,
        leadId: true,
        customerPhone: true,
        tenantId: true,
      },
    });

    if (!deal) {
      return { customerId: null, leadId: null, source: null };
    }

    // 1. Deal.customerId is already set.
    if (deal.customerId) {
      return { customerId: deal.customerId, leadId: deal.leadId, source: 'deal.customerId' };
    }

    // 2. Walk the Lead chain.
    if (deal.leadId) {
      try {
        const lead = await db.lead.findUnique({
          where: { id: deal.leadId },
          select: { id: true, customerId: true, phone: true, tenantId: true },
        });

        if (lead?.customerId) {
          return { customerId: lead.customerId, leadId: deal.leadId, source: 'lead.customerId' };
        }

        // 3. Lead.phone → Customer.normalizedPhone (same tenant).
        if (lead?.phone) {
          const tenantId = lead.tenantId || deal.tenantId;
          const found = await resolveCustomerByPhone(lead.phone, tenantId);
          if (found) {
            return { customerId: found.id, leadId: deal.leadId, source: 'lead.phone→normalizedPhone' };
          }
        }
      } catch {
        // Lead lookup failed — continue to step 4 (Deal's own phone).
      }
    }

    // 4. Deal.customerPhone → Customer.normalizedPhone (same tenant).
    if (deal.customerPhone) {
      const found = await resolveCustomerByPhone(deal.customerPhone, deal.tenantId);
      if (found) {
        return { customerId: found.id, leadId: deal.leadId, source: 'deal.phone→normalizedPhone' };
      }
    }

    return { customerId: null, leadId: deal.leadId, source: null };
  } catch {
    return { customerId: null, leadId: null, source: null };
  }
}
