import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/lead-discovery/[id] — Get single discovery by id (tenant-scoped)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    const discovery = await db.leadDiscovery.findUnique({
      where: { id },
      include: {
        search: {
          select: { id: true, query: true, source: true, location: true },
        },
      },
    });

    if (!discovery) {
      return NextResponse.json({ error: 'Discovery not found' }, { status: 404 });
    }

    // Verify tenant isolation
    if (discovery.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ discovery });
  } catch (error) {
    console.error('[LeadDiscovery] Get error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discovery' },
      { status: 500 }
    );
  }
}

// PUT /api/lead-discovery/[id] — Update discovery
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Verify discovery exists and belongs to tenant
    const existing = await db.leadDiscovery.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Discovery not found' }, { status: 404 });
    }

    if (existing.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update data — only include provided fields
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone || null;
    if (body.email !== undefined) updateData.email = body.email || null;
    if (body.website !== undefined) updateData.website = body.website || null;
    if (body.address !== undefined) updateData.address = body.address || null;
    if (body.city !== undefined) updateData.city = body.city || null;
    if (body.state !== undefined) updateData.state = body.state || null;
    if (body.postalCode !== undefined) updateData.postalCode = body.postalCode || null;
    if (body.country !== undefined) updateData.country = body.country;
    if (body.businessType !== undefined) updateData.businessType = body.businessType || null;
    if (body.category !== undefined) updateData.category = body.category || null;
    if (body.rating !== undefined) updateData.rating = body.rating;
    if (body.reviewCount !== undefined) updateData.reviewCount = body.reviewCount;
    if (body.description !== undefined) updateData.description = body.description || null;
    if (body.sourceUrl !== undefined) updateData.sourceUrl = body.sourceUrl || null;
    if (body.sourceDataJson !== undefined) updateData.sourceDataJson = body.sourceDataJson;
    if (body.tagsJson !== undefined) updateData.tagsJson = body.tagsJson;
    if (body.notesJson !== undefined) updateData.notesJson = body.notesJson;
    if (body.campaignId !== undefined) updateData.campaignId = body.campaignId || null;

    // Handle status changes
    if (body.status !== undefined) {
      updateData.status = body.status;

      // Set timestamps based on status transitions
      if (body.status === 'contacted' && !existing.contactedAt) {
        updateData.contactedAt = new Date();
      }
      if (body.status === 'imported' && !existing.importedAt) {
        updateData.importedAt = new Date();
      }
      if (body.status === 'converted' && !existing.convertedAt) {
        updateData.convertedAt = new Date();
      }
    }

    // Handle priority
    if (body.priority !== undefined) {
      updateData.priority = body.priority;
    }

    const discovery = await db.leadDiscovery.update({
      where: { id },
      data: updateData,
      include: {
        search: {
          select: { id: true, query: true, source: true },
        },
      },
    });

    return NextResponse.json({ discovery });
  } catch (error) {
    console.error('[LeadDiscovery] Update error:', error);
    return NextResponse.json(
      { error: 'Failed to update discovery' },
      { status: 500 }
    );
  }
}

// DELETE /api/lead-discovery/[id] — Delete discovery
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser || !authUser.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;

    // Verify discovery exists and belongs to tenant
    const existing = await db.leadDiscovery.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ error: 'Discovery not found' }, { status: 404 });
    }

    if (existing.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.leadDiscovery.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: 'Discovery deleted successfully',
    });
  } catch (error) {
    console.error('[LeadDiscovery] Delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete discovery' },
      { status: 500 }
    );
  }
}
