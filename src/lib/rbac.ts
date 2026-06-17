/**
 * Role-Based Access Control (RBAC) helpers
 *
 * Roles: owner, admin, manager, dispatcher, sales, employee, customer
 * Actions: create, read, update, delete, assign, approve
 * Resources: dashboard, customers, employees, jobs, bookings, invoices, payments,
 *            conversations, campaigns, workflows, reports, settings, audit_logs, role_permissions
 *
 * Permission source of truth: RolePermission table (per-tenant overrides possible).
 * Falls back to DEFAULT_PERMISSIONS below when no DB row exists.
 */

import { db } from '@/lib/db';
import type { AuthUser } from '@/lib/auth';

export type Role = 'owner' | 'admin' | 'manager' | 'dispatcher' | 'sales' | 'employee' | 'customer';
export type Action = 'create' | 'read' | 'update' | 'delete' | 'assign' | 'approve';
export type Resource =
  | 'dashboard' | 'customers' | 'employees' | 'jobs' | 'bookings'
  | 'invoices' | 'payments' | 'conversations' | 'campaigns' | 'workflows'
  | 'reports' | 'settings' | 'audit_logs' | 'role_permissions';

// ── Default permission matrix (used when no RolePermission row exists) ──────
// R = read, C = create, U = update, D = delete, A = assign, P = approve
export const DEFAULT_PERMISSIONS: Record<Role, Partial<Record<Resource, Action[]>>> = {
  owner: {
    dashboard: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    employees: ['create', 'read', 'update', 'delete'],
    jobs: ['create', 'read', 'update', 'delete', 'assign'],
    bookings: ['create', 'read', 'update', 'delete', 'assign'],
    invoices: ['create', 'read', 'update', 'delete'],
    payments: ['create', 'read', 'update', 'delete'],
    conversations: ['create', 'read', 'update', 'delete', 'assign'],
    campaigns: ['create', 'read', 'update', 'delete'],
    workflows: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read', 'update', 'delete'],
    settings: ['create', 'read', 'update', 'delete'],
    audit_logs: ['read'],
    role_permissions: ['create', 'read', 'update', 'delete'],
  },
  admin: {
    dashboard: ['create', 'read', 'update', 'delete'],
    customers: ['create', 'read', 'update', 'delete'],
    employees: ['create', 'read', 'update'],
    jobs: ['create', 'read', 'update', 'delete', 'assign'],
    bookings: ['create', 'read', 'update', 'delete', 'assign'],
    invoices: ['create', 'read', 'update', 'delete'],
    payments: ['create', 'read', 'update', 'delete'],
    conversations: ['create', 'read', 'update', 'delete', 'assign'],
    campaigns: ['create', 'read', 'update', 'delete'],
    workflows: ['create', 'read', 'update', 'delete'],
    reports: ['create', 'read'],
    settings: ['create', 'read', 'update'],
    audit_logs: ['read'],
    role_permissions: ['read'],
  },
  manager: {
    dashboard: ['create', 'read'],
    customers: ['create', 'read', 'update'],
    employees: ['read'],
    jobs: ['create', 'read', 'update', 'assign'],
    bookings: ['create', 'read', 'update'],
    invoices: ['read'],
    conversations: ['create', 'read', 'update', 'assign'],
    campaigns: ['create', 'read', 'update'],
    workflows: ['read'],
    reports: ['read'],
    settings: ['read'],
  },
  dispatcher: {
    dashboard: ['create', 'read'],
    customers: ['read'],
    employees: ['read'],
    jobs: ['create', 'read', 'update', 'delete', 'assign'],
    bookings: ['create', 'read', 'update', 'delete', 'assign'],
    invoices: ['read'],
    conversations: ['create', 'read', 'update', 'assign'],
    reports: ['read'],
  },
  sales: {
    dashboard: ['create', 'read'],
    customers: ['create', 'read', 'update'],
    jobs: ['read'],
    bookings: ['create', 'read', 'update'],
    invoices: ['read'],
    conversations: ['read'],
    campaigns: ['create', 'read', 'update', 'delete'],
    reports: ['read'],
  },
  employee: {
    dashboard: ['read'],
    customers: [],
    employees: [],
    jobs: ['read'],
    bookings: ['read'],
    invoices: [],
    conversations: ['read'],
  },
  customer: {
    dashboard: ['read'],
    customers: ['read'],
    jobs: ['read'],
    bookings: ['create', 'read'],
    invoices: ['read'],
    payments: ['read'],
    conversations: ['read'],
  },
};

/**
 * In-process cache of overridden permissions per tenant (5min TTL).
 * Avoids a DB hit on every can() call in hot paths.
 */
const overrideCache = new Map<string, { ts: number; data: Map<string, Set<Action>> }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getOverrides(role: string, tenantId: string | null): Promise<Map<string, Set<Action>>> {
  const key = `${role}:${tenantId || 'global'}`;
  const cached = overrideCache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data;

  const rows = await db.rolePermission.findMany({
    where: { role, OR: [{ tenantId: null }, ...(tenantId ? [{ tenantId }] : [])] },
  });
  const map = new Map<string, Set<Action>>();
  for (const row of rows) {
    try {
      const actions = JSON.parse(row.actionsJson || '[]') as Action[];
      map.set(row.resource, new Set(actions));
    } catch {
      // ignore malformed rows
    }
  }
  overrideCache.set(key, { ts: Date.now(), data: map });
  return map;
}

/**
 * Check whether a user may perform an action on a resource.
 * Falls back to DEFAULT_PERMISSIONS when no DB override exists.
 */
export async function can(
  user: { role: string; tenantId: string | null } | null | undefined,
  action: Action,
  resource: Resource
): Promise<boolean> {
  if (!user) return false;
  const role = user.role as Role;
  if (role === 'owner') return true; // owner is omnipotent

  const overrides = await getOverrides(role, user.tenantId);
  const overrideActions = overrides.get(resource);
  if (overrideActions) return overrideActions.has(action);

  const defaults = DEFAULT_PERMISSIONS[role]?.[resource];
  return !!defaults && defaults.includes(action);
}

/** Synchronous variant using only defaults (no DB overrides). */
export function canSync(
  user: { role: string } | null | undefined,
  action: Action,
  resource: Resource
): boolean {
  if (!user) return false;
  const role = user.role as Role;
  if (role === 'owner') return true;
  const defaults = DEFAULT_PERMISSIONS[role]?.[resource];
  return !!defaults && defaults.includes(action);
}

/**
 * Require a permission or throw 403 (for use in API routes).
 * Returns the authenticated user for convenience.
 */
export async function requirePermission(
  user: AuthUser | null,
  action: Action,
  resource: Resource
): Promise<AuthUser> {
  if (!user) {
    const err = new Error('Authentication required') as Error & { status?: number };
    err.status = 401;
    throw err;
  }
  const allowed = await can(user, action, resource);
  if (!allowed) {
    const err = new Error(`You do not have permission to ${action} ${resource}`) as Error & { status?: number };
    err.status = 403;
    throw err;
  }
  return user;
}

/** Seed default RolePermission rows (idempotent). Run from setup scripts. */
export async function seedDefaultPermissions(tenantId?: string): Promise<void> {
  const roles: Role[] = ['owner', 'admin', 'manager', 'dispatcher', 'sales', 'employee', 'customer'];
  for (const role of roles) {
    const resources = DEFAULT_PERMISSIONS[role];
    for (const [resource, actions] of Object.entries(resources)) {
      const actionsJson = JSON.stringify(actions);
      try {
        await db.rolePermission.upsert({
          where: {
            role_resource_tenantId: {
              role,
              resource,
              tenantId: tenantId || null as any,
            },
          },
          update: {},
          create: { role, resource, actionsJson, tenantId: tenantId || null },
        });
      } catch {
        // upsert key may not match if tenantId null — fall back to create-only
        const existing = await db.rolePermission.findFirst({
          where: { role, resource, tenantId: tenantId || null },
        });
        if (!existing) {
          await db.rolePermission.create({
            data: { role, resource, actionsJson, tenantId: tenantId || null },
          });
        }
      }
    }
  }
}
