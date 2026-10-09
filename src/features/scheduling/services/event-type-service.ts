/**
 * Event Types Storage & Retrieval Service
 *
 * Persists event types within Tenant settingsJson for instant zero-migration support.
 */

import { db } from '@/lib/db';
import { EventType, DEFAULT_EVENT_TYPES } from '../types/event-types';

export async function getTenantEventTypes(tenantId: string): Promise<EventType[]> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true },
    });

    if (tenant?.settingsJson) {
      try {
        const parsed = JSON.parse(tenant.settingsJson);
        if (Array.isArray(parsed.schedulingEventTypes)) {
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
    throw error;
  }
}

export async function saveTenantEventTypes(
  tenantId: string,
  eventTypes: EventType[]
): Promise<EventType[]> {
  try {
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { settingsJson: true },
    });

    if (!tenant) throw new Error('Workspace not found');
    let currentFeatures: Record<string, any> = {};
    if (tenant?.settingsJson) {
      try {
        currentFeatures = JSON.parse(tenant.settingsJson);
      } catch {}
    }

    currentFeatures.schedulingEventTypes = eventTypes;

    const updated = await db.tenant.updateMany({
      where: { id: tenantId, settingsJson: tenant?.settingsJson },
      data: {
        settingsJson: JSON.stringify(currentFeatures),
      },
    });

    if (!updated.count) throw new Error("Scheduling settings changed. Refresh and retry.");
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
    let tenant: { id: string; name: string; slug: string; logo: string | null; email: string | null; phone: string | null; settingsJson: string; googleCalendarSyncEnabled: boolean } | null = null;

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
          settingsJson: true,
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

    return { eventType: matched?.isActive ? matched : null, tenant };
  } catch (err) {
    console.error('[event-type-service] findEventTypeBySlug error:', err);
    return { eventType: null, tenant: null };
  }
}
