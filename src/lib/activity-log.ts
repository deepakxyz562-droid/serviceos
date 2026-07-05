/**
 * Activity Log helper library (V1.5)
 * --------------------------------
 * Centralized audit-trail logging that writes to the new `ActivityLog` Prisma
 * model (db.activityLog). All major flows (create/update/delete/assign/...)
 * should call one of the convenience wrappers below so every meaningful user
 * action is captured for the audit trail.
 *
 * Every helper swallows errors — logging MUST NEVER break the main operation.
 * Callers don't need their own try/catch (but it doesn't hurt).
 */

import { db } from '@/lib/db';

export interface LogActivityParams {
  tenantId: string;
  actorId?: string | null;
  actorName?: string | null;
  actorType?: string; // user, system, api, workflow, ai
  /** create | update | delete | assign | complete | pay | login | logout | export | status_change */
  action: string;
  /** lead | job | customer | invoice | quote | employee | tenant | user */
  entityType: string;
  entityId?: string | null;
  entityName?: string | null;
  description: string;
  metadataJson?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  /** info | warning | error | critical */
  severity?: string;
}

/**
 * Insert a single ActivityLog row. Never throws — failures are logged to the
 * server console only so the main request continues uninterrupted.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    if (!params.tenantId) {
      // Without a tenant we cannot scope the log row — silently skip.
      return;
    }

    await db.activityLog.create({
      data: {
        tenantId: params.tenantId,
        actorId: params.actorId ?? null,
        actorName: params.actorName ?? null,
        actorType: params.actorType ?? 'user',
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        entityName: params.entityName ?? null,
        description: params.description,
        metadataJson: params.metadataJson ?? '{}',
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        severity: params.severity ?? 'info',
      },
    });
  } catch (err) {
    // Logging must never break the caller — log and move on.
    console.error('[activity-log] Failed to write ActivityLog:', err);
  }
}

// ─── Convenience wrappers ──────────────────────────────────────────────────
// These keep call-sites terse and consistent. Each one accepts a "loose" entity
// object (any record with id + name-ish fields) so callers don't have to
// remember the exact field name.

interface EntityLike {
  id?: string | number | null;
  name?: string | null;
  title?: string | null;
  number?: string | null;
  [key: string]: unknown;
}

function entityName(entity: EntityLike | null | undefined): string | null {
  if (!entity) return null;
  return entity.name ?? entity.title ?? entity.number ?? null;
}

function entityId(entity: EntityLike | null | undefined): string | null {
  if (!entity) return null;
  const id = entity.id;
  return id == null ? null : String(id);
}

export async function logCreate(
  tenantId: string,
  actorId: string | null | undefined,
  actorName: string | null | undefined,
  entityType: string,
  entity: EntityLike | null | undefined,
  description?: string,
  extra?: { metadataJson?: string; severity?: string; actorType?: string },
): Promise<void> {
  await logActivity({
    tenantId,
    actorId,
    actorName,
    actorType: extra?.actorType,
    action: 'create',
    entityType,
    entityId: entityId(entity),
    entityName: entityName(entity),
    description:
      description ||
      `Created ${entityType}${entityName(entity) ? `: ${entityName(entity)}` : ''}`,
    metadataJson: extra?.metadataJson,
    severity: extra?.severity ?? 'info',
  });
}

export async function logUpdate(
  tenantId: string,
  actorId: string | null | undefined,
  actorName: string | null | undefined,
  entityType: string,
  entity: EntityLike | null | undefined,
  changes?: Record<string, unknown> | string,
  description?: string,
  extra?: { severity?: string; actorType?: string },
): Promise<void> {
  let metadataJson: string | undefined;
  if (changes) {
    metadataJson =
      typeof changes === 'string' ? changes : JSON.stringify(changes);
  }
  await logActivity({
    tenantId,
    actorId,
    actorName,
    actorType: extra?.actorType,
    action: 'update',
    entityType,
    entityId: entityId(entity),
    entityName: entityName(entity),
    description:
      description ||
      `Updated ${entityType}${entityName(entity) ? `: ${entityName(entity)}` : ''}`,
    metadataJson,
    severity: extra?.severity ?? 'info',
  });
}

export async function logDelete(
  tenantId: string,
  actorId: string | null | undefined,
  actorName: string | null | undefined,
  entityType: string,
  entityId: string | null | undefined,
  entityName: string | null | undefined,
  extra?: { actorType?: string; metadataJson?: string },
): Promise<void> {
  await logActivity({
    tenantId,
    actorId,
    actorName,
    actorType: extra?.actorType,
    action: 'delete',
    entityType,
    entityId: entityId ?? null,
    entityName: entityName ?? null,
    description: `Deleted ${entityType}${entityName ? `: ${entityName}` : ''}`,
    metadataJson: extra?.metadataJson,
    severity: 'warning',
  });
}

export async function logAssign(
  tenantId: string,
  actorId: string | null | undefined,
  actorName: string | null | undefined,
  entityType: string,
  entityId: string | null | undefined,
  entityName: string | null | undefined,
  assigneeName: string | null | undefined,
  extra?: { actorType?: string },
): Promise<void> {
  await logActivity({
    tenantId,
    actorId,
    actorName,
    actorType: extra?.actorType,
    action: 'assign',
    entityType,
    entityId: entityId ?? null,
    entityName: entityName ?? null,
    description: `Assigned ${entityType}${entityName ? ` "${entityName}"` : ''} to ${assigneeName || 'unassigned'}`,
    metadataJson: JSON.stringify({ assigneeName }),
    severity: 'info',
  });
}

export async function logStatusChange(
  tenantId: string,
  actorId: string | null | undefined,
  actorName: string | null | undefined,
  entityType: string,
  entityId: string | null | undefined,
  entityName: string | null | undefined,
  fromStatus: string | null | undefined,
  toStatus: string | null | undefined,
  extra?: { actorType?: string },
): Promise<void> {
  await logActivity({
    tenantId,
    actorId,
    actorName,
    actorType: extra?.actorType,
    action: 'status_change',
    entityType,
    entityId: entityId ?? null,
    entityName: entityName ?? null,
    description: `${entityType}${entityName ? ` "${entityName}"` : ''} status changed: ${fromStatus || '—'} → ${toStatus || '—'}`,
    metadataJson: JSON.stringify({ fromStatus, toStatus }),
    severity: 'info',
  });
}
