import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/ecommerce/products - List ecommerce products with filtering
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
    const productType = searchParams.get('productType')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20'), 1), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0)

    // Build the where clause
    const where: Record<string, unknown> = {
      tenantId: auth.tenantId,
    }

    if (status) {
      where.status = status
    }

    if (productType) {
      where.productType = productType
    }

    // Filter by provider through the integration relation
    if (provider) {
      where.integration = {
        provider,
      }
    }

    // Search filter: match against title, description, sku, vendor
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { sku: { contains: search } },
        { vendor: { contains: search } },
        { externalProductId: { contains: search } },
      ]
    }

    const [products, total] = await Promise.all([
      db.ecommerceProduct.findMany({
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.ecommerceProduct.count({ where }),
    ])

    // Parse JSON fields for each product
    const result = products.map((product) => ({
      ...product,
      tags: safeJsonParse(product.tagsJson, []),
      images: safeJsonParse(product.imagesJson, []),
      variants: safeJsonParse(product.variantsJson, []),
      options: safeJsonParse(product.optionsJson, []),
      rawData: safeJsonParse(product.rawDataJson, {}),
    }))

    return NextResponse.json({
      products: result,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    })
  } catch (error) {
    console.error('Error listing ecommerce products:', error)
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
