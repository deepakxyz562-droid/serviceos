/**
 * Centralized role-based access control (RBAC) primitives.
 *
 * Single source of truth for the canonical role vocabulary, hierarchy, and
 * permission checks. Used by BOTH:
 *   - Server-side API routes (via `getAuthUser()` then `hasRole(user, ...)`)
 *   - Client hooks (`usePermissions()` reads the cached user role)
 *
 * Why this exists: prior to this module, role checks were scattered across the
 * codebase using 4 different idioms (`!==` chains, `!includes()`, deny-lists,
 * OR-chains with both `superadmin` and `super_admin` spellings). Some endpoints
 * allowed `owner`/`manager` but NOT `admin` (employees/[id]), others allowed
 * `owner`/`admin`/`manager` (performance/aggregate), and the time-tracking
 * payroll route used a deny-list (`!== 'employee' && !== 'customer'`) that
 * accidentally allowed `dispatcher` and any future role. This module replaces
 * all of those with a single allow-list primitive.
 *
 * `User.role` is a freeform String in the schema (NOT an enum), so adding new
 * roles like `accountant` and `office` does NOT require a DB migration.
 *
 * Roles (canonical vocabulary):
 *   owner       — principal who owns the Tenant model. Highest tier.
 *   admin       — full operational access, including sensitive data.
 *   accountant — NEW: financial access only (payroll, billing). NOT operational.
 *   manager    — operational team management. No payroll/salary access.
 *   dispatcher  — read/write operational data (jobs, schedule, dispatch).
 *   office      — NEW: back-office staff. Operational but no field/dispatch.
 *   employee    — field technician (linked to an Employee row).
 *   viewer      — read-only access to non-sensitive data.
 *   customer    — customer-portal session (NOT an internal role).
 *   super_admin — platform-level admin (cross-tenant). Same tier as owner.
 *
 * "Owner" == the user's "Tenant" role (the principal who owns the Tenant).
 * There is no separate `tenant` role string — that would collide with the
 * Tenant model name.
 */

// ─── Canonical role vocabulary ──────────────────────────────────────────────

export const ROLES = [
  'owner',
  'admin',
  'accountant',
  'manager',
  'dispatcher',
  'office',
  'employee',
  'viewer',
  'customer',
  'super_admin',
] as const;

export type Role = (typeof ROLES)[number];

/**
 * Normalise a role string from the DB / JWT to the canonical lowercase form.
 *
 * Accepts both `superadmin` and `super_admin` (legacy variants) and normalises
 * to `super_admin`. Any other value is lowercased and returned as-is — if it
 * isn't in ROLES, `hasRole` will simply return false (no throw).
 */
export function normalizeRole(role: string | null | undefined): string | null {
  if (!role) return null;
  const r = role.toLowerCase().trim();
  if (r === 'superadmin') return 'super_admin';
  return r;
}

// ─── Role tier (hierarchy) ─────────────────────────────────────────────────
//
// Higher number = broader access. Used by `hasMinRole()` for hierarchical
// checks (e.g. "any role >= manager"). NOT a strict total order — `accountant`
// and `manager` are in different access lanes (a manager cannot see payroll,
// an accountant cannot dispatch jobs), so most checks should use the explicit
// allow-list form `hasRole(user, [...])` rather than `hasMinRole`.

export const ROLE_TIER: Record<string, number> = {
  viewer: 0,
  customer: 0,
  employee: 10,
  office: 20,
  dispatcher: 30,
  manager: 40,
  accountant: 40, // same tier as manager but DIFFERENT lane — use hasRole, not hasMinRole
  admin: 80,
  owner: 90,
  super_admin: 100,
};

// ─── User shape (minimal — works for both AuthUser server-side and CurrentUser client-side) ──

export interface RoleBearer {
  role?: string | null;
  isSuperAdmin?: boolean | null;
}

// ─── Core primitives ───────────────────────────────────────────────────────

/**
 * Returns true if the user's role is in the explicit allow-list.
 *
 * This is the PREFERRED primitive — explicit allow-lists are safer than
 * deny-lists and clearer than hierarchical checks. Always pass every role
 * that should be allowed, even if some are in the same tier.
 *
 * `super_admin` is implicitly allowed for every check (platform-level admin
 * bypasses tenant RBAC), unless explicitly excluded by the caller — which
 * should never happen in practice.
 *
 * Usage:
 *   if (!hasRole(user, ['owner', 'admin', 'accountant'])) {
 *     return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
 *   }
 */
export function hasRole(user: RoleBearer | null | undefined, allowedRoles: string[]): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true; // platform-level admin bypass
  const r = normalizeRole(user.role);
  if (!r) return false;
  // Normalise the allow-list too (in case a caller passes 'SuperAdmin').
  const allowed = new Set(
    allowedRoles
      .map((x) => normalizeRole(x))
      .filter((x): x is string => Boolean(x))
  );
  return allowed.has(r);
}

/**
 * Returns true if the user's role is at-or-above the given tier.
 *
 * AVOID using this for payroll/sensitive checks — `accountant` and `manager`
 * share tier 40 but have completely different access lanes. Use `hasRole()`
 * with an explicit list instead.
 *
 * Useful for "any operational role or above" checks where the lane distinction
 * doesn't matter.
 */
export function hasMinRole(user: RoleBearer | null | undefined, minRole: string): boolean {
  if (!user) return false;
  if (user.isSuperAdmin) return true;
  const r = normalizeRole(user.role);
  if (!r) return false;
  const minTier = ROLE_TIER[normalizeRole(minRole) ?? ''] ?? -1;
  const userTier = ROLE_TIER[r] ?? -1;
  return userTier >= minTier && userTier >= 0;
}

// ─── Employee Detail tab permission map ────────────────────────────────────
//
// Per the user's confirmed spec:
//   Reviews   → owner, admin, manager
//   Documents → owner, admin, manager
//   Payroll   → owner, admin, accountant   (note: NOT manager — sensitive financials)
//
// Primary tabs (Overview, Jobs, Calendar, Time, Performance, Equipment,
// Location, Activity) are visible to every authenticated tenant member —
// they are operational data, not sensitive.

export type EmployeeDetailTab =
  | 'overview'
  | 'jobs'
  | 'calendar'
  | 'time'
  | 'performance'
  | 'equipment'
  | 'location'
  | 'activity'
  | 'reviews'
  | 'documents'
  | 'payroll';

export const EMPLOYEE_DETAIL_TAB_ROLES: Record<EmployeeDetailTab, string[]> = {
  overview: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  jobs: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  calendar: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  time: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  performance: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  equipment: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  location: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  activity: ['owner', 'admin', 'accountant', 'manager', 'dispatcher', 'office', 'employee', 'viewer'],
  reviews: ['owner', 'admin', 'manager'],
  documents: ['owner', 'admin', 'manager'],
  payroll: ['owner', 'admin', 'accountant'],
};

/**
 * Returns true if the user can access the given Employee Detail tab.
 *
 * Use this BOTH:
 *   - Client-side (to hide the tab trigger AND its content — defense in depth)
 *   - Server-side (to gate the data-fetching endpoint that backs the tab)
 *
 * Hiding the tab in React is NOT sufficient — the underlying API must also
 * call this (or `hasRole(user, EMPLOYEE_DETAIL_TAB_ROLES.tab)`) and return
 * 403 if the user lacks the role. This is the user's hard requirement.
 */
export function canAccessEmployeeTab(
  user: RoleBearer | null | undefined,
  tab: EmployeeDetailTab
): boolean {
  return hasRole(user, EMPLOYEE_DETAIL_TAB_ROLES[tab]);
}

/**
 * Returns true if the user is allowed to see the `hourlyRate` field on
 * Employee records (used for job costing / profitability).
 *
 * This is the ONLY sensitive payroll-adjacent field on the Employee model
 * today. Stripped from `/api/employees/[id]` GET responses for callers below
 * this tier.
 */
export function canSeeEmployeeHourlyRate(user: RoleBearer | null | undefined): boolean {
  // Same lane as the Payroll tab.
  return hasRole(user, EMPLOYEE_DETAIL_TAB_ROLES.payroll);
}

/**
 * Returns true if the user is allowed to see the `verificationPin` field on
 * Job records. The PIN is sent to the customer and entered by the technician
 * at arrival — it must NEVER be visible to the technician themselves, to
 * viewers, or to public/unauthenticated callers.
 *
 * Allowed: owner, admin, manager, dispatcher, office (+ super_admin bypass).
 * Denied: employee (technician), viewer, customer, null.
 */
export function canSeeJobVerificationPin(user: RoleBearer | null | undefined): boolean {
  return hasRole(user, ['owner', 'admin', 'manager', 'dispatcher', 'office']);
}

/**
 * Convenience: list of all secondary Employee Detail tabs (those that live
 * behind the "More ▾" dropdown).
 */
export const SECONDARY_EMPLOYEE_TABS: EmployeeDetailTab[] = ['reviews', 'documents', 'payroll'];

/**
 * Convenience: list of all primary Employee Detail tabs (those shown in the
 * main horizontal tab strip).
 */
export const PRIMARY_EMPLOYEE_TABS: EmployeeDetailTab[] = [
  'overview',
  'jobs',
  'calendar',
  'time',
  'performance',
  'equipment',
  'location',
  'activity',
];
