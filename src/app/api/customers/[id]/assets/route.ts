import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { withCrmTrace } from '@/lib/crm-perf-trace';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import { getCustomerAssets, RpcFunctionNotFoundError } from '@/lib/supabase-rpc';

// ── C-2B.5: RPC availability cache ─────────────────────────────────────
// When the get_customer_assets RPC function hasn't been applied to the
// database yet, each request would waste ~130-200ms on a failed .rpc() call
// before falling through to the original 3-call path. This cache remembers
// the "not found" state for 5 minutes, so only the FIRST request after
// server startup (or after the 5-minute window expires) pays the overhead.
// Once the SQL is applied, the first successful RPC call sets
// `rpcAvailable = 'available'` and all subsequent requests use the fast
// RPC path (3 calls → 1, ~400ms → ~130-150ms).
let rpcAvailability: 'unknown' | 'available' | 'not_found' = 'unknown';
let rpcAvailabilityCheckedAt = 0;
const RPC_AVAILABILITY_TTL_MS = 5 * 60 * 1000; // 5 minutes

function shouldTryCustomerAssetsRpc(): boolean {
  if (!shouldUseSupabaseDB()) return false;
  if (rpcAvailability === 'available') return true;
  if (rpcAvailability === 'not_found') {
    // Re-check periodically so the RPC is picked up after the SQL is applied.
    return Date.now() - rpcAvailabilityCheckedAt > RPC_AVAILABILITY_TTL_MS;
  }
  return true; // 'unknown' — first request, try it
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute warrantyStatus from warrantyEnd.
 *   - "none"     if no warrantyEnd
 *   - "active"   if warrantyEnd > now
 *   - "expired"  otherwise
 */
function computeWarrantyStatus(warrantyEnd?: string | null): string {
  if (!warrantyEnd) return 'none';
  const end = new Date(warrantyEnd).getTime();
  if (Number.isNaN(end)) return 'none';
  return end > Date.now() ? 'active' : 'expired';
}

/**
 * Resolve the tenantId for a customer. Customer has workspaceId but no
 * tenantId column, so resolve via workspace.tenantId (fallback to user).
 */
async function resolveTenantIdForCustomer(
  customerId: string,
  userTenantId: string | null,
): Promise<string | null> {
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { workspaceId: true },
  });
  if (customer?.workspaceId) {
    const ws = await db.workspace.findUnique({
      where: { id: customer.workspaceId },
      select: { tenantId: true },
    });
    if (ws?.tenantId) return ws.tenantId;
  }
  return userTenantId;
}

// ─── GET /api/customers/[id]/assets ────────────────────────────────────────
// List all assets for a customer.
async function _GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;

    // ── C-2B.5: Try the get_customer_assets RPC first (3 → 1 call) ──────
    // The SQL function (supabase-rpc-customer-assets.sql) consolidates:
    //   1. Customer.findUnique (workspaceId)
    //   2. Workspace.findUnique (tenantId)
    //   3. CustomerAsset.findMany (the assets)
    // into a single PostgREST round-trip. The tenant is resolved via a
    // Customer→Workspace LEFT JOIN with fallback to p_user_tenant_id —
    // exactly matching resolveTenantIdForCustomer() below.
    //
    // AVAILABILITY CACHE: the first failed attempt caches "not_found" for
    // 5 minutes (see shouldTryCustomerAssetsRpc above), so subsequent
    // requests skip the failed RPC call and go straight to the fallback.
    if (shouldTryCustomerAssetsRpc()) {
      try {
        const result = await getCustomerAssets(id, user.tenantId);
        // Success — cache the availability so future requests skip the check.
        rpcAvailability = 'available';
        rpcAvailabilityCheckedAt = Date.now();
        // tenantResolved=false means no tenant could be resolved — return []
        // (matches the original early-return path below).
        return NextResponse.json({ assets: result.assets });
      } catch (err) {
        if (err instanceof RpcFunctionNotFoundError) {
          // Cache "not_found" so the next 5 minutes of requests skip the
          // failed RPC call and go straight to the fallback path.
          rpcAvailability = 'not_found';
          rpcAvailabilityCheckedAt = Date.now();
          console.warn(
            '[customers/[id]/assets] get_customer_assets RPC not found — ' +
              'using 3-call fallback. Apply supabase-rpc-customer-assets.sql to enable the RPC path.',
          );
        } else {
          throw err;
        }
      }
    }

    const tenantId = await resolveTenantIdForCustomer(id, user.tenantId);
    if (!tenantId) {
      return NextResponse.json({ assets: [] });
    }

    const assets = await db.customerAsset.findMany({
      where: { tenantId, customerId: id, status: { not: 'disposed' } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ assets });
  } catch (error) {
    console.error('Error fetching customer assets:', error);
    return NextResponse.json({ error: 'Failed to fetch assets' }, { status: 500 });
  }
}

// ─── POST /api/customers/[id]/assets ───────────────────────────────────────
// Create a new asset. Auto-computes warrantyStatus from warrantyEnd and
// creates a CustomerTimelineEntry.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id } = await params;
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 });
    }
    if (!body.assetType || typeof body.assetType !== 'string') {
      return NextResponse.json({ error: 'Asset type is required' }, { status: 400 });
    }

    const tenantId = await resolveTenantIdForCustomer(id, user.tenantId);
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant not resolved for customer' }, { status: 400 });
    }

    const warrantyEnd = body.warrantyEnd ? new Date(body.warrantyEnd) : null;
    const warrantyStatus = computeWarrantyStatus(body.warrantyEnd);

    const asset = await db.customerAsset.create({
      data: {
        tenantId,
        customerId: id,
        name: body.name.toString().slice(0, 200),
        assetType: body.assetType.toString().slice(0, 50),
        brand: body.brand ? body.brand.toString().slice(0, 100) : null,
        model: body.model ? body.model.toString().slice(0, 100) : null,
        serialNumber: body.serialNumber ? body.serialNumber.toString().slice(0, 200) : null,
        installationDate: body.installationDate ? new Date(body.installationDate) : null,
        warrantyStart: body.warrantyStart ? new Date(body.warrantyStart) : null,
        warrantyEnd,
        warrantyStatus,
        location: body.location ? body.location.toString().slice(0, 200) : null,
        notes: body.notes ? body.notes.toString() : null,
        photosJson:
          typeof body.photosJson === 'string'
            ? body.photosJson
            : JSON.stringify(body.photosJson ?? []),
        documentsJson:
          typeof body.documentsJson === 'string'
            ? body.documentsJson
            : JSON.stringify(body.documentsJson ?? []),
        status: 'active',
      },
    });

    // Timeline entry
    try {
      await db.customerTimelineEntry.create({
        data: {
          tenantId,
          customerId: id,
          entryType: 'asset',
          title: `Asset added: ${asset.name}`,
          description: `${asset.assetType}${asset.brand ? ' · ' + asset.brand : ''}${asset.model ? ' · ' + asset.model : ''}`,
          sourceType: 'CustomerAsset',
          sourceId: asset.id,
          metadataJson: JSON.stringify({
            assetId: asset.id,
            assetType: asset.assetType,
            brand: asset.brand,
            model: asset.model,
            serialNumber: asset.serialNumber,
          }),
          actorId: user.id,
          actorName: user.name || null,
          actorType: 'user',
          eventDate: new Date(),
        },
      });
    } catch (e) {
      console.error('Error creating asset timeline entry:', e);
    }

    return NextResponse.json({ asset }, { status: 201 });
  } catch (error) {
    console.error('Error creating customer asset:', error);
    return NextResponse.json({ error: 'Failed to create asset' }, { status: 500 });
  }
}

// C-1 perf trace — wraps GET with observational instrumentation (no-op when CRM_PERF_TRACE != 'true')
export const GET = withCrmTrace('GET /api/customers/[id]/assets', _GET);
