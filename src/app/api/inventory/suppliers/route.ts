import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { CI } from '@/lib/db-utils';
import { getAuthUser } from '@/lib/auth';
import { withRequestId } from '@/lib/logger';

/**
 * Suppliers API
 * --------------
 * GET  /api/inventory/suppliers  — list suppliers (filter by active, search)
 * POST /api/inventory/suppliers  — create a supplier
 *
 * Tenant scoping enforced via authUser.tenantId (super_admin sees all).
 */

function tenantScope(authUser: NonNullable<Awaited<ReturnType<typeof getAuthUser>>>) {
  const where: Record<string, unknown> = {};
  if (authUser.tenantId && !authUser.isSuperAdmin) {
    where.tenantId = authUser.tenantId;
  }
  return where;
}

/**
 * GET /api/inventory/suppliers
 * Query params: active (1/0/true/false), search (name/email/phone), limit
 */
export async function GET(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const search = searchParams.get('search')?.trim();
    const limitRaw = Number(searchParams.get('limit') || '100');
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 500) : 100;

    const where: Record<string, unknown> = tenantScope(authUser);

    if (active !== null && active !== undefined && active !== '') {
      where.isActive = active === '1' || active === 'true';
    }

    if (search) {
      where.OR = [
        { name: { contains: search, ...CI } },
        { email: { contains: search, ...CI } },
        { phone: { contains: search, ...CI } },
        { contactName: { contains: search, ...CI } },
      ];
    }

    const suppliers = await db.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        _count: { select: { items: true } },
      },
    });

    log.info({ userId: authUser.id, count: suppliers.length }, 'Suppliers listed');

    return NextResponse.json({ suppliers, count: suppliers.length });
  } catch (error) {
    log.error({ err: error }, 'Failed to list suppliers');
    const message = error instanceof Error ? error.message : 'Failed to fetch suppliers';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/inventory/suppliers
 * Body: name (required), contactName, email, phone, address, website,
 *       paymentTerms, currency, metadata
 */
export async function POST(request: NextRequest) {
  const log = withRequestId(request);
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'Tenant not found for user' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { name, contactName, email, phone, address, website, paymentTerms, currency, metadata } =
      body as Record<string, unknown>;

    if (typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const supplier = await db.supplier.create({
      data: {
        tenantId: authUser.tenantId,
        name: name.trim().slice(0, 200),
        contactName:
          typeof contactName === 'string' && contactName.trim()
            ? contactName.trim().slice(0, 150)
            : null,
        email: typeof email === 'string' && email.trim() ? email.trim().slice(0, 200) : null,
        phone: typeof phone === 'string' && phone.trim() ? phone.trim().slice(0, 50) : null,
        address: typeof address === 'string' && address.trim() ? address.trim() : null,
        website: typeof website === 'string' && website.trim() ? website.trim().slice(0, 200) : null,
        paymentTerms:
          typeof paymentTerms === 'string' && paymentTerms.trim()
            ? paymentTerms.trim().slice(0, 100)
            : null,
        currency: typeof currency === 'string' && currency.trim() ? currency.trim().slice(0, 8) : 'USD',
        isActive: true,
        metadataJson: JSON.stringify(metadata && typeof metadata === 'object' ? metadata : {}),
      },
    });

    log.info({ userId: authUser.id, supplierId: supplier.id }, 'Supplier created');

    return NextResponse.json({ supplier }, { status: 201 });
  } catch (error) {
    log.error({ err: error }, 'Failed to create supplier');
    const message = error instanceof Error ? error.message : 'Failed to create supplier';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
