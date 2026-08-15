import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'

// GET /api/tax-rules — list TaxRules scoped to the authenticated user's tenant.
//
// ISSUE-3: The redesigned "New Customer" form needs to know whether a
// TaxRule exists for the country the user selected in the Property
// address section. When no TaxRule matches, the form shows an amber
// "No tax rate created for {country}" alert.
//
// Query params:
//   country  — ISO alpha-2 code, e.g. "DE", "US". When provided, the
//              response is filtered to active TaxRules whose `country`
//              matches (or whose `country` is null = global default).
//   active   — "true" (default) restricts to active rules only.
//
// Returns: { taxRules: [{ id, name, rate, type, country, isDefault }] }
//
// No requireCrmTenant guard here — TaxRule lookups are also used by
// listing-only tenants during marketplace onboarding, and the response
// contains no sensitive data (just rates/names).
async function _GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const country = searchParams.get('country')?.trim().toUpperCase() || null
    const activeOnly = searchParams.get('active') !== 'false'

    const where: Record<string, unknown> = {}
    if (user.tenantId) {
      where.tenantId = user.tenantId
    }
    if (activeOnly) {
      where.isActive = true
    }
    if (country) {
      // Match rules for the selected country OR global rules (country = null).
      // Both are valid candidates for "is there a tax rate for this country".
      where.OR = [{ country }, { country: null }]
    }

    const taxRules = await db.taxRule.findMany({
      where,
      select: {
        id: true,
        name: true,
        rate: true,
        type: true,
        country: true,
        isDefault: true,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      take: 100,
    })

    return NextResponse.json({ taxRules })
  } catch (error) {
    console.error('Error fetching tax rules:', error)
    return NextResponse.json({ error: 'Failed to fetch tax rules' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return _GET(request)
}
