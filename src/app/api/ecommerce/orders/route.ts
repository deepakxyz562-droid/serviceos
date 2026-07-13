import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { cache } from '@/lib/cache'

// 90s cache — the dashboard only loads 5 recent orders on mount; no need
// to re-query the DB for unchanged data.
const ECOMMERCE_ORDERS_CACHE_TTL = 90_000

// GET /api/ecommerce/orders - List ecommerce orders with filtering
//
// Customer sessions: scoped to orders matching the customer's email OR phone.
// The tenantId filter is skipped — if Customer.workspaceId is null (broken
// Customer→Workspace→Tenant chain), tenantId can't be resolved and the
// orders list would return 401. Customers can only see their own orders
// regardless of which tenant the order belongs to.
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Customers: no tenantId required; we'll filter by their email/phone.
    // Admins/employees: tenantId required.
    if (auth.role !== 'customer' && !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const provider = searchParams.get('provider')
    const search = searchParams.get('search')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // PERFORMANCE: cache high-frequency list queries (no search, no date
    // filter). The dashboard's "recent orders" widget hits this with
    // ?limit=5 on every mount.
    const isCacheable = !search && !dateFrom && !dateTo
    const cacheKey = `ecommerce-orders:${auth.id}:${auth.tenantId || ''}:${auth.role}:${status || ''}:${provider || ''}:${limit}:${offset}`
    if (isCacheable) {
      const cached = cache.get<{ orders: unknown[]; total: number; limit: number; offset: number; hasMore: boolean }>(cacheKey)
      if (cached) {
        return NextResponse.json(cached)
      }
    }

    // Build the where clause
    const where: Record<string, unknown> = {}

    if (auth.role === 'customer') {
      // Customer session: scope to their own orders by email/phone.
      // The customer's email/phone come from the JWT (auth.email / auth.phone).
      // We use OR so an order matching EITHER email OR phone is returned
      // (some stores capture phone but not email, and vice-versa).
      const orClauses: Record<string, unknown>[] = []
      // authUser shape from getAuthUser doesn't include phone for non-customer
      // sessions, but for customer sessions /api/auth/me enriches it. We
      // defensively read both fields.
      const custEmail = (auth as { email?: string | null }).email
      const custPhone = (auth as { phone?: string | null }).phone
      if (custEmail) orClauses.push({ customerEmail: { contains: custEmail } })
      if (custPhone) orClauses.push({ customerPhone: { contains: custPhone } })
      if (orClauses.length > 0) {
        where.OR = orClauses
      } else {
        // No email/phone on the customer — return empty rather than leak
        // other customers' orders.
        return NextResponse.json({ orders: [], total: 0 })
      }
    } else {
      // Admin/employee: tenant-scoped.
      where.tenantId = auth.tenantId
    }

    if (status) {
      where.status = status
    }

    // Filter by provider through the integration relation
    if (provider) {
      where.integration = {
        provider,
      }
    }

    // Search filter: match against orderNumber, customerEmail, customerName, customerPhone
    // (For customer sessions, the search param is typically their own email —
    // combining with the OR clause above would create conflicting OR groups.
    // Prisma doesn't support nested OR easily, so for customers we rely on
    // the email/phone OR clause and ignore the search param. For admins, the
    // search param works as before.)
    if (search && auth.role !== 'customer') {
      where.OR = [
        { orderNumber: { contains: search } },
        { customerEmail: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
        { externalOrderId: { contains: search } },
      ]
    }

    // Date range filter on orderedAt
    if (dateFrom || dateTo) {
      const orderedAtFilter: Record<string, Date> = {}
      if (dateFrom) {
        orderedAtFilter.gte = new Date(dateFrom)
      }
      if (dateTo) {
        orderedAtFilter.lte = new Date(dateTo)
      }
      where.orderedAt = orderedAtFilter
    }

    const [orders, total] = await Promise.all([
      db.ecommerceOrder.findMany({
        where,
        include: {
          integration: {
            select: {
              id: true,
              provider: true,
              name: true,
            },
          },
        },
        orderBy: { orderedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.ecommerceOrder.count({ where }),
    ])

    // Parse JSON fields for each order
    const result = orders.map((order) => ({
      ...order,
      items: safeJsonParse(order.itemsJson, []),
      tags: safeJsonParse(order.tagsJson, []),
      shippingAddress: safeJsonParse(order.shippingAddress, null),
      billingAddress: safeJsonParse(order.billingAddress, null),
      rawData: safeJsonParse(order.rawDataJson, {}),
    }))

    const responsePayload = {
      orders: result,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    }

    if (isCacheable) {
      cache.set(cacheKey, responsePayload, ECOMMERCE_ORDERS_CACHE_TTL)
    }

    return NextResponse.json(responsePayload)
  } catch (error) {
    console.error('Error listing ecommerce orders:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function safeJsonParse(jsonStr: string | null, fallback: unknown = {}) {
  try {
    return JSON.parse(jsonStr || '{}')
  } catch {
    return fallback
  }
}
