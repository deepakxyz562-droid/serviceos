import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getTenantEventTypes, saveTenantEventTypes } from '@/features/scheduling/services/event-type-service';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const eventTypes = await getTenantEventTypes(user.tenantId);

    const index = eventTypes.findIndex((e) => e.id === id);
    if (index === -1) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    const updatedEvent = {
      ...eventTypes[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    eventTypes[index] = updatedEvent;
    await saveTenantEventTypes(user.tenantId, eventTypes);

    return NextResponse.json({ success: true, eventType: updatedEvent });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update event type' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { id } = await params;
    const eventTypes = await getTenantEventTypes(user.tenantId);
    const filtered = eventTypes.filter((e) => e.id !== id);

    await saveTenantEventTypes(user.tenantId, filtered);
    return NextResponse.json({ success: true, eventTypes: filtered });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete event type' },
      { status: 500 }
    );
  }
}
