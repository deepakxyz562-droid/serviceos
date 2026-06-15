import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'

// GET /api/ecommerce/orders - List ecommerce orders with filtering
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
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

    // Build the where clause
    const where: Record<string, unknown> = {
      tenantId: auth.tenantId,
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
    if (search) {
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

    return NextResponse.json({
      orders: result,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
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
