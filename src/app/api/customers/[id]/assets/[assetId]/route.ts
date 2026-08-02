import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ─── Helpers ────────────────────────────────────────────────────────────────

function computeWarrantyStatus(warrantyEnd?: string | Date | null): string {
  if (!warrantyEnd) return 'none';
  const end = new Date(warrantyEnd as string).getTime();
  if (Number.isNaN(end)) return 'none';
  return end > Date.now() ? 'active' : 'expired';
}

// ─── GET /api/customers/[id]/assets/[assetId] ──────────────────────────────
// Get a single asset with its service history.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { assetId } = await params;

    const asset = await db.customerAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const serviceHistory = await db.assetServiceHistory.findMany({
      where: { assetId },
      orderBy: { serviceDate: 'desc' },
    });

    return NextResponse.json({ asset, serviceHistory });
  } catch (error) {
    console.error('Error fetching asset:', error);
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 });
  }
}

// ─── PATCH /api/customers/[id]/assets/[assetId] ────────────────────────────
// Update asset fields. Re-computes warrantyStatus if warrantyEnd changes.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { assetId } = await params;
    const body = await request.json();

    const existing = await db.customerAsset.findUnique({ where: { id: assetId } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (typeof body.name === 'string') updateData.name = body.name.slice(0, 200);
    if (typeof body.assetType === 'string') updateData.assetType = body.assetType.slice(0, 50);
    if (body.brand !== undefined) updateData.brand = body.brand ? String(body.brand).slice(0, 100) : null;
    if (body.model !== undefined) updateData.model = body.model ? String(body.model).slice(0, 100) : null;
    if (body.serialNumber !== undefined) updateData.serialNumber = body.serialNumber ? String(body.serialNumber).slice(0, 200) : null;
    if (body.installationDate !== undefined) {
      updateData.installationDate = body.installationDate ? new Date(body.installationDate) : null;
    }
    if (body.warrantyStart !== undefined) {
      updateData.warrantyStart = body.warrantyStart ? new Date(body.warrantyStart) : null;
    }
    if (body.warrantyEnd !== undefined) {
      updateData.warrantyEnd = body.warrantyEnd ? new Date(body.warrantyEnd) : null;
      updateData.warrantyStatus = computeWarrantyStatus(body.warrantyEnd);
    }
    if (body.location !== undefined) updateData.location = body.location ? String(body.location).slice(0, 200) : null;
    if (body.notes !== undefined) updateData.notes = body.notes ? String(body.notes) : null;
    if (body.photosJson !== undefined) {
      updateData.photosJson = typeof body.photosJson === 'string' ? body.photosJson : JSON.stringify(body.photosJson ?? []);
    }
    if (body.documentsJson !== undefined) {
      updateData.documentsJson = typeof body.documentsJson === 'string' ? body.documentsJson : JSON.stringify(body.documentsJson ?? []);
    }
    if (typeof body.status === 'string' && ['active', 'inactive', 'disposed'].includes(body.status)) {
      updateData.status = body.status;
    }

    const asset = await db.customerAsset.update({
      where: { id: assetId },
      data: updateData,
    });

    return NextResponse.json({ asset });
  } catch (error) {
    console.error('Error updating asset:', error);
    return NextResponse.json({ error: 'Failed to update asset' }, { status: 500 });
  }
}

// ─── DELETE /api/customers/[id]/assets/[assetId] ───────────────────────────
// Soft-delete: set status='disposed' rather than hard-deleting.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { assetId } = await params;

    const existing = await db.customerAsset.findUnique({ where: { id: assetId } });
    if (!existing) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const asset = await db.customerAsset.update({
      where: { id: assetId },
      data: { status: 'disposed' },
    });

    return NextResponse.json({ asset, deleted: true });
  } catch (error) {
    console.error('Error deleting asset:', error);
    return NextResponse.json({ error: 'Failed to delete asset' }, { status: 500 });
  }
}
