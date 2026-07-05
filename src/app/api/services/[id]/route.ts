import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/services/[id] — Get single service
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const service = await db.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error fetching service:', error);
    return NextResponse.json(
      { error: 'Failed to fetch service' },
      { status: 500 }
    );
  }
}

// PUT /api/services/[id] — Update service
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'category', 'basePrice', 'duration',
      'icon', 'isActive', 'assignedTeamJson', 'addOnsJson',
      'upsellServiceIdsJson', 'imageUrl', 'tagsJson', 'sortOrder',
      'checklistId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'basePrice') {
          updateData[field] = parseFloat(String(body[field]));
        } else if (field === 'duration' || field === 'sortOrder') {
          updateData[field] = parseInt(String(body[field]));
        } else if (field === 'isActive') {
          updateData[field] = Boolean(body[field]);
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const service = await db.service.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(service);
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json(
      { error: 'Failed to update service' },
      { status: 500 }
    );
  }
}

// DELETE /api/services/[id] — Delete service
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await db.service.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
