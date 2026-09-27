/**
 * Event Types Storage & Retrieval Service
 *
 * Persists event types within Tenant featuresJson for instant zero-migration support.
 */

import { db } from '@/lib/db';
import { EventType, DEFAULT_EVENT_TYPES } from '../types/event-types';

export async function getTenantEventTypes(tenantId: string): Promise<EventType[]> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { featuresJson: true },
    });

    if (tenant?.featuresJson) {
      try {
        const parsed = JSON.parse(tenant.featuresJson);
        if (Array.isArray(parsed.schedulingEventTypes) && parsed.schedulingEventTypes.length > 0) {
          return parsed.schedulingEventTypes;
        }
      } catch {}
    }

    // Initialize with defaults if none exist
    const seeded: EventType[] = DEFAULT_EVENT_TYPES.map((evt) => ({
      ...evt,
      tenantId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    await saveTenantEventTypes(tenantId, seeded);
    return seeded;
  } catch (error) {
    console.error('[event-type-service] Failed to fetch event types:', error);
    return DEFAULT_EVENT_TYPES.map((evt) => ({ ...evt, tenantId }));
  }
}

export async function saveTenantEventTypes(
  tenantId: string,
  eventTypes: EventType[]
): Promise<EventType[]> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { featuresJson: true },
    });

    let currentFeatures: Record<string, any> = {};
    if (tenant?.featuresJson) {
      try {
        currentFeatures = JSON.parse(tenant.featuresJson);
      } catch {}
    }

    currentFeatures.schedulingEventTypes = eventTypes;

    await db.tenant.update({
      where: { id: tenantId },
      data: {
        featuresJson: JSON.stringify(currentFeatures),
      },
    });

    return eventTypes;
  } catch (error) {
    console.error('[event-type-service] Failed to save event types:', error);
    throw error;
  }
}

export async function findEventTypeBySlug(
  tenantOrUserSlug: string,
  eventSlug: string
): Promise<{ eventType: EventType | null; tenant: any }> {
  try {
    let tenant = null;

    // 1. Find tenant by slug or id if not preview
    if (tenantOrUserSlug && tenantOrUserSlug !== 'preview') {
      tenant = await db.tenant.findFirst({
        where: {
          OR: [
            { slug: tenantOrUserSlug },
            { id: tenantOrUserSlug },
          ],
        },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          email: true,
          phone: true,
          featuresJson: true,
          googleCalendarSyncEnabled: true,
        },
      });
    }

    // 2. Fallback to default/primary tenant
    if (!tenant) {
      tenant = await db.tenant.findFirst({
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          email: true,
          phone: true,
          featuresJson: true,
          googleCalendarSyncEnabled: true,
        },
      });
    }

    if (!tenant) {
      return { eventType: null, tenant: null };
    }

    const eventTypes = await getTenantEventTypes(tenant.id);
    const matched = eventTypes.find(
      (e) => e.slug.toLowerCase() === eventSlug.toLowerCase() || e.id === eventSlug
    );

    return { eventType: matched || eventTypes[0] || null, tenant };
  } catch (err) {
    console.error('[event-type-service] findEventTypeBySlug error:', err);
    return { eventType: null, tenant: null };
  }
}
