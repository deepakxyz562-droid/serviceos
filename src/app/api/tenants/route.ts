import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/tenants — List tenants (for super admin)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const plan = searchParams.get('plan')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {}

    if (plan) where.plan = plan
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { slug: { contains: search } },
        { industry: { contains: search } },
        { country: { contains: search } },
      ]
    }

    const [tenants, total] = await Promise.all([
      db.tenant.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { users: true, employees: true, customers: true, jobs: true },
          },
        },
      }),
      db.tenant.count({ where }),
    ])

    return NextResponse.json({
      data: tenants,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Failed to list tenants:', error)
    return NextResponse.json(
      { error: 'Failed to list tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants — Create a new tenant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      slug,
      plan,
      industry,
      country,
      timezone,
      currency,
      domain,
      logoUrl,
      primaryColor,
      accentColor,
      billingEmail,
    } = body

    if (!name) {
      return NextResponse.json(
        { error: 'name is required' },
        { status: 400 }
      )
    }

    // Auto-generate slug from name if not provided
    const generatedSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')

    // Check if slug already exists
    const existing = await db.tenant.findUnique({
      where: { slug: generatedSlug },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Tenant with slug "${generatedSlug}" already exists` },
        { status: 409 }
      )
    }

    const tenant = await db.tenant.create({
      data: {
        name,
        slug: generatedSlug,
        plan: plan || 'starter',
        industry: industry ?? null,
        country: country ?? null,
        timezone: timezone ?? 'Asia/Kolkata',
        currency: currency ?? 'INR',
        domain: domain ?? null,
        logoUrl: logoUrl ?? null,
        primaryColor: primaryColor ?? '#10b981',
        accentColor: accentColor ?? null,
        billingEmail: billingEmail ?? null,
      },
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('Failed to create tenant:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
