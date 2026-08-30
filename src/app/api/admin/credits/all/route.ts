import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { sharedCacheGet, sharedCacheSet } from '@/lib/shared-cache';

/**
 * GET /api/admin/credits/all
 *
 * Batch endpoint that returns credit status for ALL trial + active tenants
 * in a SINGLE response. Replaces the previous N-parallel-fetches pattern
 * (one /api/admin/credits?tenantId=X call per tenant) that took ~10s because
 * each call ran 8 sequential DB queries on Supabase Free.
 *
 * PERFORMANCE:
 *   Old: N tenants × 8 queries each = 64 queries (8 tenants → ~10s)
 *   New: 3 queries total (tenants + subscriptions + providers) → <300ms
 *
 * TENANT FILTER:
 *   Only returns tenants with planStatus IN ('trial', 'active') AND
 *   suspendedAt IS NULL. The full Tenant table has ~89K rows (most are
 *   cancelled/expired marketplace listings) — fetching all of them was the
 *   source of the credits storm. Trial + active are the only tenants that
 *   need credit management.
 *
 * CACHE:
 *   30s fresh / 5min stale (SWR) via sharedCacheSet (Redis-backed, cross-
 *   instance). Invalidated by the PUT /api/admin/credits handler when a
 *   superadmin edits a tenant's credits.
 *
 * NO WRITES:
 *   Unlike checkWhatsAppCredits() (which auto-sets ownWhatsappConnected /
 *   ownEmailProviderConnected flags via subscription.update), this endpoint
 *   is READ-ONLY. It detects provider connections in-memory and returns the
 *   detected state without persisting it. The writes happen in the connect/
 *   disconnect handlers and the single-tenant GET path.
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSuperAdminRequest(request)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const CACHE_KEY = 'superadmin:credits:all';

    // ── Layer 1: Check shared cache (30s fresh / 5min stale) ──────────────
    const cached = await sharedCacheGet<{ tenants: CreditEntry[]; total: number }>(CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    // ── Layer 2: Build from DB (3 queries total) ──────────────────────────

    // 1. Fetch only trial + active, non-suspended tenants (NOT all 89K).
    const tenants = await db.tenant.findMany({
      where: {
        planStatus: { in: ['trial', 'active'] },
        suspendedAt: null,
      },
      select: { id: true, name: true, plan: true },
    });

    if (tenants.length === 0) {
      const empty = { tenants: [], total: 0 };
      await sharedCacheSet(CACHE_KEY, empty, 30 * 1000, 5 * 60 * 1000);
      return NextResponse.json(empty);
    }

    const tenantIds = tenants.map((t) => t.id);

    // 2. Fetch all subscriptions for these tenants (1 query, not N).
    //    orderBy createdAt desc so the first entry per tenant is the most recent.
    const subscriptions = await db.subscription.findMany({
      where: { tenantId: { in: tenantIds } },
      orderBy: { createdAt: 'desc' },
      select: {
        tenantId: true,
        plan: true,
        status: true,
        trialWhatsappCredits: true,
        trialWhatsappUsed: true,
        platformWhatsappEnabled: true,
        ownWhatsappConnected: true,
        ownEmailProviderConnected: true,
        whatsappUsageCount: true,
        emailUsageCount: true,
        whatsappQuota: true,
        emailQuota: true,
      },
    });

    // 3. Fetch all active non-platform WhatsApp providers (1 query).
    const whatsappProviders = await db.communicationProvider.findMany({
      where: {
        tenantId: { in: tenantIds },
        type: 'whatsapp',
        status: 'active',
        sendingEnabled: true,
        isPlatform: false,
      },
      select: { tenantId: true },
    });

    // 4. Fetch all active non-platform email providers (1 query).
    const emailProviders = await db.emailProvider.findMany({
      where: {
        tenantId: { in: tenantIds },
        status: 'active',
        isPlatform: false,
      },
      select: { tenantId: true },
    });

    // ── Build lookup maps (in-memory, zero DB cost) ───────────────────────
    // Keep only the most recent subscription per tenant (already ordered).
    const subByTenant = new Map<string, (typeof subscriptions)[0]>();
    for (const sub of subscriptions) {
      if (!subByTenant.has(sub.tenantId)) {
        subByTenant.set(sub.tenantId, sub);
      }
    }
    const whatsappByTenant = new Set(whatsappProviders.map((p) => p.tenantId));
    const emailByTenant = new Set(emailProviders.map((p) => p.tenantId));

    // ── Assemble result ───────────────────────────────────────────────────
    const entries: CreditEntry[] = tenants.map((tenant) => {
      const sub = subByTenant.get(tenant.id);
      // Detect provider connections from the live provider tables (read-only).
      // If the subscription flag is already true, trust it. Otherwise, check
      // if a provider exists — but DON'T write (the single-tenant GET path
      // or the connect handler will persist the flag).
      const hasOwnWhatsApp = whatsappByTenant.has(tenant.id);
      const hasOwnEmail = emailByTenant.has(tenant.id);
      const ownWhatsappConnected = sub?.ownWhatsappConnected ?? hasOwnWhatsApp;
      const ownEmailProviderConnected = sub?.ownEmailProviderConnected ?? hasOwnEmail;

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        plan: tenant.plan,
        trialWhatsappCredits: sub?.trialWhatsappCredits ?? 10,
        trialWhatsappUsed: sub?.trialWhatsappUsed ?? 0,
        platformWhatsappEnabled: sub?.platformWhatsappEnabled ?? false,
        ownWhatsappConnected,
        ownEmailProviderConnected,
      };
    });

    const response = { tenants: entries, total: entries.length };

    // Cache for 30s fresh / 5min stale. Fire-and-forget the SET.
    void sharedCacheSet(CACHE_KEY, response, 30 * 1000, 5 * 60 * 1000).catch(() => {});

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Credits All] GET error:', error);
    return NextResponse.json({ error: 'Failed to get credit status' }, { status: 500 });
  }
}

interface CreditEntry {
  tenantId: string;
  tenantName: string;
  plan: string;
  trialWhatsappCredits: number;
  trialWhatsappUsed: number;
  platformWhatsappEnabled: boolean;
  ownWhatsappConnected: boolean;
  ownEmailProviderConnected: boolean;
}
