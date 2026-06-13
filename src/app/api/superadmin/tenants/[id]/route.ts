import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, reason } = body;

    if (!id) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }

    if (status === 'suspended') {
      if (!reason?.trim()) {
        return NextResponse.json({ error: 'Reason is required for suspension' }, { status: 400 });
      }
      const tenant = await db.tenant.update({
        where: { id },
        data: {
          planStatus: 'suspended',
          suspendedAt: new Date(),
          suspensionReason: reason.trim(),
        },
      });
      return NextResponse.json({ tenant });
    }

    if (status === 'active') {
      const tenant = await db.tenant.update({
        where: { id },
        data: {
          planStatus: 'active',
          suspendedAt: null,
          suspensionReason: null,
        },
      });
      return NextResponse.json({ tenant });
    }

    return NextResponse.json({ error: 'Invalid status. Use "suspended" or "active"' }, { status: 400 });
  } catch (error) {
    console.error('[SuperAdmin Tenant Update] Error:', error);
    return NextResponse.json({ error: 'Failed to update tenant' }, { status: 500 });
  }
}
