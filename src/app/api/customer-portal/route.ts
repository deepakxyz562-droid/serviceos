import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'
import { toISOString } from '@/lib/utils'

// POST /api/customer-portal - Generate customer portal session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, phone, expiresInHours, tenantId } = body

    if (!customerId && !phone) {
      return NextResponse.json(
        { error: 'customerId or phone is required' },
        { status: 400 }
      )
    }

    // Find or verify the customer
    let customer: { id: string; name: string; phone: string; email?: string | null } | null = null
    if (customerId) {
      customer = await db.customer.findUnique({ where: { id: customerId } })
    } else if (phone) {
      customer = await db.customer.findFirst({ where: { phone } })
    }

    if (!customer) {
      return NextResponse.json(
        { error: 'Customer not found' },
        { status: 404 }
      )
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(
      Date.now() + (expiresInHours || 24) * 60 * 60 * 1000
    )

    // Create the portal session
    const session = await db.customerPortalSession.create({
      data: {
        token,
        customerId: customer.id,
        customerPhone: customer.phone,
        expiresAt,
        tenantId: tenantId || null,
      },
    })

    // Build the portal URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const portalUrl = baseUrl
      ? `${baseUrl}/portal/${token}`
      : `/portal/${token}`

    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        token,
        customerId: customer.id,
        customerName: customer.name,
        expiresAt: expiresAt.toISOString(),
        portalUrl,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error generating portal session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/customer-portal - Validate portal session or list sessions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const list = searchParams.get('list')
    const tenantId = searchParams.get('tenantId')

    // List mode: return all portal sessions (optionally filtered by tenantId)
    if (list === 'true') {
      const where: Record<string, unknown> = {}
      if (tenantId) {
        where.tenantId = tenantId
      }

      const sessions = await db.customerPortalSession.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      })

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || ''

      return NextResponse.json(
        sessions.map(session => ({
          id: session.id,
          token: session.token,
          customerId: session.customerId,
          customerName: session.customer.name,
          customerPhone: session.customerPhone,
          expiresAt: toISOString(session.expiresAt as Date | string),
          lastAccessedAt: toISOString(session.lastAccessedAt as Date | string),
          portalUrl: baseUrl
            ? `${baseUrl}/portal/${session.token}`
            : `/portal/${session.token}`,
        }))
      )
    }

    // Validate mode: validate a specific token
    if (!token) {
      return NextResponse.json(
        { error: 'token query parameter is required (or use list=true)' },
        { status: 400 }
      )
    }

    const session = await db.customerPortalSession.findUnique({
      where: { token },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
      },
    })

    if (!session) {
      return NextResponse.json(
        { error: 'Invalid session token' },
        { status: 404 }
      )
    }

    // Check if session has expired
    if (session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Session has expired', expiredAt: toISOString(session.expiresAt as Date | string) },
        { status: 410 }
      )
    }

    // Update last accessed
    await db.customerPortalSession.update({
      where: { id: session.id },
      data: { lastAccessedAt: new Date() },
    })

    return NextResponse.json({
      valid: true,
      session: {
        id: session.id,
        customerId: session.customerId,
        customer: session.customer,
        expiresAt: toISOString(session.expiresAt as Date | string),
      },
    })
  } catch (error) {
    console.error('Error validating portal session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
