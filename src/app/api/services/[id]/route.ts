import { serviceInputError } from '../../../../../shared/service-input';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { deriveServiceSlug, syncServiceCatalogAndGbp } from '@/lib/gbp/service-sync';
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
    if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({error: 'Invalid service'}, {status: 400});
    const validationError = serviceInputError(body, true);
    if (validationError) return NextResponse.json({error: validationError}, {status: 400});

    const existing = await db.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    const allowedFields = [
      'name', 'description', 'longDescription', 'category', 'basePrice', 'duration',
      'icon', 'isActive', 'isPublic', 'assignedTeamJson', 'addOnsJson',
      'upsellServiceIdsJson', 'imageUrl', 'tagsJson', 'sortOrder',
      'checklistId',
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'basePrice') {
          updateData[field] = parseFloat(String(body[field]));
        } else if (field === 'duration' || field === 'sortOrder') {
          updateData[field] = parseInt(String(body[field]));
        } else if (field === 'isActive' || field === 'isPublic') {
          updateData[field] = Boolean(body[field]);
        } else if (field === 'name' && typeof body[field] === 'string') {
          const cleanName = body[field].trim();
          updateData.name = cleanName;
          const nextSlug = deriveServiceSlug(cleanName);
          if (nextSlug) updateData.slug = nextSlug;
        } else if (field === 'longDescription' && typeof body[field] === 'string') {
          const cleanLong = body[field].trim().slice(0, 500);
          updateData.longDescription = cleanLong || null;
          if (body.description === undefined && cleanLong) {
            updateData.description = cleanLong.slice(0, 220);
          }
        } else {
          updateData[field] = body[field];
        }
      }
    }

    const service = await db.service.update({
      where: { id },
      data: updateData,
    });

    const syncResult = await syncServiceCatalogAndGbp(user.tenantId, {
      syncToGoogle: body.syncToGoogle !== false,
      triggerSource: 'service_update',
    }).catch(() => ({
      servicesCount: 0,
      googleSync: { connected: false, attempted: false, synced: false, warnings: [] },
    }));

    return NextResponse.json({
      ...service,
      service,
      googleSync: syncResult.googleSync,
    });
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
    const syncToGoogleParam = new URL(request.url).searchParams.get('syncToGoogle');
    const body = await request.json().catch(() => ({}));
    const syncToGoogle =
      syncToGoogleParam !== null
        ? syncToGoogleParam !== 'false'
        : body?.syncToGoogle !== false;

    const existing = await db.service.findFirst({
      where: { id, tenantId: user.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await db.service.delete({ where: { id } });

    const syncResult = await syncServiceCatalogAndGbp(user.tenantId, {
      syncToGoogle,
      triggerSource: 'service_delete',
    }).catch(() => ({
      servicesCount: 0,
      googleSync: { connected: false, attempted: false, synced: false, warnings: [] },
    }));

    return NextResponse.json({ success: true, googleSync: syncResult.googleSync });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json(
      { error: 'Failed to delete service' },
      { status: 500 }
    );
  }
}
