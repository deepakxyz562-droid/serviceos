/**
 * Deal-Quote Sync Layer (non-invasive)
 * =====================================
 *
 * PROBLEM
 * -------
 * When a Deal moves to the `quote_draft` stage, the user expects a draft
 * Quote to already exist so they can jump straight into the Quotes view
 * and start editing line items. Previously, the Sales Pipeline view's
 * "Create Quote" button only navigated to the Quotes view — it did NOT
 * actually create a Quote, and the Quote.dealId field was never
 * populated on creation.
 *
 * This module closes that gap by providing a single idempotent helper,
 * `ensureQuoteForDeal(dealId)`, that:
 *
 *   1. Returns the existing Quote if one is already linked to the Deal
 *      (any status — we don't duplicate).
 *   2. Otherwise, creates a new draft Quote with the Deal's value,
 *      currency, customer, and lead pre-filled, and `dealId` set.
 *
 * The helper is **fire-and-forget safe**: it NEVER throws. All errors
 * are logged with the `[deal-quote-sync]` prefix and swallowed so the
 * caller's primary operation (updating the Deal stage) always succeeds.
 *
 * USAGE
 * -----
 *   - `PUT /api/deals/[id]` calls this when `stage` transitions to
 *     `quote_draft` (after the Deal update + Lead.status sync).
 *   - The reverse link (Quote → Deal → won) already works via
 *     `autoCloseDealAsWonByQuote` in `deal-auto-close.ts`.
 *
 * SUPABASE / POSTGREST SAFETY
 * ---------------------------
 * Production runs on Supabase + Vercel. All Prisma queries here use ONLY:
 *   - `findFirst`   (idempotency check)
 *   - `findUnique`  (Deal lookup)
 *   - `create`      (Quote creation)
 *
 * NO `upsert` with compound unique keys (Supabase PostgREST does not
 * support arbitrary compound unique constraints). NO `$queryRaw` /
 * `$executeRaw`. NO SQLite-only functions. NO multi-write `$transaction`
 * with cross-write dependencies.
 */

import { db } from '@/lib/db';

export type EnsureQuoteResult = {
  quoteId: string | null;
  created: boolean;
};

/**
 * Idempotently ensure a draft Quote exists for the given Deal.
 *
 * - If a Quote already exists with this dealId (any status), return it
 *   (no dup).
 * - Otherwise, create a new draft Quote linked to the Deal (and its
 *   Lead/Customer).
 *
 * NEVER throws — all errors are logged with the `[deal-quote-sync]`
 * prefix and swallowed. Returns `{ quoteId: null, created: false }` on
 * failure so callers can treat the result uniformly.
 *
 * Used by:
 *   - `PUT /api/deals/[id]` when stage → quote_draft
 *   - The lazy safety net in `GET /api/deals` (optional)
 */
export async function ensureQuoteForDeal(
  dealId: string,
): Promise<EnsureQuoteResult> {
  try {
    if (!dealId) return { quoteId: null, created: false };

    // 1. Check if a Quote already exists for this Deal (any status — we
    //    don't duplicate even if the existing one is rejected/expired).
    const existing = await db.quote.findFirst({
      where: { dealId },
      select: { id: true, status: true },
    });
    if (existing) {
      return { quoteId: existing.id, created: false };
    }

    // 2. Fetch the Deal to source Quote fields.
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        value: true,
        currency: true,
        customerId: true,
        customerName: true,
        customerPhone: true,
        leadId: true,
        tenantId: true,
        workspaceId: true,
      },
    });
    if (!deal) {
      console.warn('[deal-quote-sync] Deal not found:', dealId);
      return { quoteId: null, created: false };
    }

    // 3. Create a draft Quote linked to the Deal.
    //    The Quote's totals are seeded from the Deal's value so the
    //    draft is immediately usable; the user can edit line items /
    //    tax / discount from the Quotes view.
    const quote = await db.quote.create({
      data: {
        title: deal.title ? `Quote — ${deal.title}` : 'Draft Quote',
        description: null,
        itemsJson: '[]',
        addOnsJson: '[]',
        subtotal: deal.value || 0,
        tax: 0,
        taxRate: 0,
        discount: 0,
        discountType: 'fixed',
        total: deal.value || 0,
        currency: deal.currency || 'USD',
        exchangeRate: 1,
        baseCurrency: deal.currency || 'USD',
        baseAmount: deal.value || 0,
        status: 'draft',
        customerId: deal.customerId || null,
        leadId: deal.leadId || null,
        dealId: deal.id, // ← the link
        tenantId: deal.tenantId || null,
        whatsappSent: false,
      },
    });

    console.log(
      '[deal-quote-sync] Created draft Quote',
      quote.id,
      'for Deal',
      dealId,
    );
    return { quoteId: quote.id, created: true };
  } catch (err) {
    console.error(
      '[deal-quote-sync] ensureQuoteForDeal failed for',
      dealId,
      err,
    );
    return { quoteId: null, created: false };
  }
}
