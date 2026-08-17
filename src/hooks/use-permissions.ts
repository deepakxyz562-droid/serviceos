'use client';

import { useMemo } from 'react';
import { useCurrentUser, type CurrentUser } from '@/hooks/use-current-user';
import {
  canAccessEmployeeTab,
  canSeeEmployeeHourlyRate,
  hasMinRole,
  hasRole,
  normalizeRole,
  PRIMARY_EMPLOYEE_TABS,
  SECONDARY_EMPLOYEE_TABS,
  type EmployeeDetailTab,
  type RoleBearer,
} from '@/lib/auth/permissions';

/**
 * Client-side permission hook.
 *
 * Wraps `useCurrentUser()` and exposes the centralized RBAC primitives from
 * `@/lib/auth/permissions` so components can gate UI without importing the
 * raw helpers (and without re-reading the user role on every render).
 *
 * Returns a memoized object so consumers can use it in dependency arrays
 * without causing re-renders.
 *
 * The role lookup is FREE — no extra fetch. `useCurrentUser()` already
 * hydrates from `/api/auth/me` on mount (module-level cached, shared across
 * every consumer in the app), so this hook just reads the cached value.
 *
 * Usage:
 *   const perms = usePermissions();
 *   if (!perms.canAccessEmployeeTab('payroll')) return null;
 *
 * Defense-in-depth note: this hook gates UI. The underlying API endpoint
 * MUST also call `hasRole(authUser, EMPLOYEE_DETAIL_TAB_ROLES.tab)` server-side
 * — never rely on UI hiding alone.
 */
export interface UsePermissionsResult {
  /** The current user, or null if not authenticated. */
  user: CurrentUser | null;
  /** True while the user data is still loading from /api/auth/me. */
  loading: boolean;

  /** Normalised lowercase role string (e.g. 'admin'). Null if no session. */
  role: string | null;

  /** True if the user holds (or surpasses via super_admin) any of these roles. */
  hasRole: (allowedRoles: string[]) => boolean;

  /** True if the user's tier >= the given role's tier. Avoid for payroll. */
  hasMinRole: (minRole: string) => boolean;

  /** Per-tab gate for the Employee Detail page. */
  canAccessEmployeeTab: (tab: EmployeeDetailTab) => boolean;

  /** True if user may see Employee.hourlyRate (payroll lane). */
  canSeeEmployeeHourlyRate: () => boolean;

  /** Convenience: which secondary tabs (More ▾) this user can see. */
  visibleSecondaryTabs: EmployeeDetailTab[];

  /** Convenience: which primary tabs this user can see (usually all of them). */
  visiblePrimaryTabs: EmployeeDetailTab[];
}

export function usePermissions(): UsePermissionsResult {
  const { user, loading } = useCurrentUser();

  return useMemo<UsePermissionsResult>(() => {
    const bearer: RoleBearer = user
      ? { role: user.role, isSuperAdmin: user.isSuperAdmin }
      : null;

    const role = user ? normalizeRole(user.role) : null;

    return {
      user,
      loading,
      role,
      hasRole: (allowedRoles: string[]) => hasRole(bearer, allowedRoles),
      hasMinRole: (minRole: string) => hasMinRole(bearer, minRole),
      canAccessEmployeeTab: (tab: EmployeeDetailTab) => canAccessEmployeeTab(bearer, tab),
      canSeeEmployeeHourlyRate: () => canSeeEmployeeHourlyRate(bearer),
      visibleSecondaryTabs: SECONDARY_EMPLOYEE_TABS.filter((t) => canAccessEmployeeTab(bearer, t)),
      visiblePrimaryTabs: PRIMARY_EMPLOYEE_TABS.filter((t) => canAccessEmployeeTab(bearer, t)),
    };
  }, [user, loading]);
}
