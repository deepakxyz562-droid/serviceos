import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

// ─── GET /api/customers/[id]/assets/[assetId]/service-history ──────────────
// List service history for an asset.
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

    const history = await db.assetServiceHistory.findMany({
      where: { assetId },
      orderBy: { serviceDate: 'desc' },
    });

    return NextResponse.json({ serviceHistory: history });
  } catch (error) {
    console.error('Error fetching asset service history:', error);
    return NextResponse.json({ error: 'Failed to fetch service history' }, { status: 500 });
  }
}

// ─── POST /api/customers/[id]/assets/[assetId]/service-history ─────────────
// Add a service history entry. Also creates a CustomerTimelineEntry.
// Body: { jobId?, serviceDate, serviceType?, performedBy?, performedByName?,
//         notes?, cost?, partsReplaced?, nextServiceDate? }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assetId: string }> },
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const { id: customerId, assetId } = await params;
    const body = await request.json();

    const asset = await db.customerAsset.findUnique({ where: { id: assetId } });
    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    const entry = await db.assetServiceHistory.create({
      data: {
        tenantId: asset.tenantId,
        assetId,
        jobId: body.jobId || null,
        serviceDate: body.serviceDate ? new Date(body.serviceDate) : new Date(),
        serviceType: body.serviceType ? String(body.serviceType).slice(0, 50) : null,
        performedBy: body.performedBy ? String(body.performedBy) : null,
        performedByName: body.performedByName ? String(body.performedByName) : null,
        notes: body.notes ? String(body.notes) : null,
        cost:
          typeof body.cost === 'number'
            ? body.cost
            : body.cost
              ? Number(body.cost) || 0
              : 0,
        partsReplaced: body.partsReplaced ? String(body.partsReplaced) : null,
        nextServiceDate: body.nextServiceDate ? new Date(body.nextServiceDate) : null,
      },
    });

    // Timeline entry
    try {
      await db.customerTimelineEntry.create({
        data: {
          tenantId: asset.tenantId,
          customerId,
          entryType: 'asset',
          title: `Service: ${asset.name}`,
          description:
            `${body.serviceType || 'Service'} performed` +
            (body.cost ? ` · ${body.cost}` : '') +
            (body.notes ? ` · ${body.notes}` : ''),
          sourceType: 'AssetServiceHistory',
          sourceId: entry.id,
          metadataJson: JSON.stringify({
            assetId,
            assetName: asset.name,
            serviceHistoryId: entry.id,
            serviceType: body.serviceType || null,
            cost: entry.cost,
            jobId: body.jobId || null,
          }),
          actorId: user.id,
          actorName: user.name || null,
          actorType: 'user',
          eventDate: entry.serviceDate,
        },
      });
    } catch (e) {
      console.error('Error creating service-history timeline entry:', e);
    }

    return NextResponse.json({ serviceHistory: entry }, { status: 201 });
  } catch (error) {
    console.error('Error creating asset service history:', error);
    return NextResponse.json({ error: 'Failed to create service history' }, { status: 500 });
  }
}
