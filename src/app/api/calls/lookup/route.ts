import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/calls/lookup?phone=...
 * SalesTrail-style Caller ID Lookup:
 * Matches an incoming or dialed phone number against existing CRM Leads and Customers.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawPhone = searchParams.get('phone') || '';
    const cleanDigits = rawPhone.replace(/\D/g, '');

    if (cleanDigits.length < 4) {
      return NextResponse.json({ matched: false, caller: null });
    }

    // Use last 10 digits for matching to handle country code variations (+1, +91, etc.)
    const lookupSuffix = cleanDigits.slice(-10);

    // 1. Search existing CRM leads
    const matchedLead = await db.lead.findFirst({
      where: {
        tenantId: auth.tenantId,
        phone: { contains: lookupSuffix },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        value: true,
        serviceType: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (matchedLead) {
      return NextResponse.json({
        matched: true,
        type: 'lead',
        caller: {
          id: matchedLead.id,
          name: matchedLead.name,
          phone: matchedLead.phone,
          status: matchedLead.status,
          value: matchedLead.value,
          serviceType: matchedLead.serviceType,
          description: matchedLead.description,
          isCustomer: false,
        },
      });
    }

    // 2. Search existing Customers / Contacts
    const matchedCustomer = await db.customer.findFirst({
      where: {
        tenantId: auth.tenantId,
        phone: { contains: lookupSuffix },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        companyName: true,
        email: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (matchedCustomer) {
      return NextResponse.json({
        matched: true,
        type: 'customer',
        caller: {
          id: matchedCustomer.id,
          name: matchedCustomer.name || matchedCustomer.companyName || 'Existing Customer',
          phone: matchedCustomer.phone,
          companyName: matchedCustomer.companyName,
          email: matchedCustomer.email,
          isCustomer: true,
        },
      });
    }

    return NextResponse.json({
      matched: false,
      caller: null,
    });
  } catch (error) {
    console.error('[Calls Lookup GET]', error);
    return NextResponse.json({ error: 'Failed to lookup caller' }, { status: 500 });
  }
}
