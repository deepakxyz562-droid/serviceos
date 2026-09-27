import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getTenantEventTypes, saveTenantEventTypes } from '@/features/scheduling/services/event-type-service';
import { EventType, DEFAULT_BOOKING_FIELDS } from '@/features/scheduling/types/event-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scheduling/event-types
 * Returns all event types for current tenant.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const eventTypes = await getTenantEventTypes(user.tenantId);
    return NextResponse.json({ success: true, eventTypes });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch event types' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/scheduling/event-types
 * Creates a new event type or updates existing ones.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await request.json();
    const currentTypes = await getTenantEventTypes(user.tenantId);

    if (body.eventTypes && Array.isArray(body.eventTypes)) {
      // Bulk update
      const updated = await saveTenantEventTypes(user.tenantId, body.eventTypes);
      return NextResponse.json({ success: true, eventTypes: updated });
    }

    // Single creation
    const newEvent: EventType = {
      id: body.id || `evt_${Date.now()}`,
      tenantId: user.tenantId,
      title: body.title || 'New Meeting',
      slug: (body.slug || body.title || 'meeting').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
      description: body.description || '',
      duration: Number(body.duration) || 30,
      locationType: body.locationType || 'google_meet',
      locationDetails: body.locationDetails || '',
      color: body.color || '#2563EB',
      isActive: body.isActive ?? true,
      requiresPayment: Boolean(body.requiresPayment),
      price: body.price ? Number(body.price) : undefined,
      currency: body.currency || 'USD',
      bookingFields: body.bookingFields || DEFAULT_BOOKING_FIELDS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedList = [newEvent, ...currentTypes.filter((t) => t.id !== newEvent.id)];
    await saveTenantEventTypes(user.tenantId, updatedList);

    return NextResponse.json({ success: true, eventType: newEvent, eventTypes: updatedList });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create event type' },
      { status: 500 }
    );
  }
}
