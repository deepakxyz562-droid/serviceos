'use client'

import { useEffect, useState, useCallback } from 'react'

/**
 * Client-side shape of the current user.
 *
 * Mirrors the subset of fields returned by `GET /api/auth/me` that UI
 * components need to gate features by role (owner/admin/super_admin) and
 * to address the user's tenant / workspace.
 *
 * NOTE: `tenantId` and `workspaceId` are nullable in practice because the
 * server-side `AuthUser` type (`src/lib/auth.ts`) declares them as
 * `string | null` (e.g. a freshly-created super_admin may have no tenant
 * yet). Components that depend on a tenant should null-check before use.
 */
export interface CurrentUser {
  id: string
  email: string
  name: string
  role: string
  tenantId: string | null
  workspaceId: string | null
  avatar: string | null
  isSuperAdmin: boolean
  employeeId: string | null
  phone: string | null
}

interface UseCurrentUserResult {
  user: CurrentUser | null
  loading: boolean
  error: string | null
  /** Refresh the user data (e.g. after login). */
  refresh: () => Promise<void>
}

// ─── Module-level cache ────────────────────────────────────────────────
// Multiple components mounting simultaneously share ONE fetch so we don't
// hammer `/api/auth/me` once per consumer. Mirrors the pattern already used
// by `use-company-currency.ts` and `use-toast.ts`.
let cachedUser: CurrentUser | null = null
let cachedPromise: Promise<CurrentUser | null> | null = null

export function useCurrentUser(): UseCurrentUserResult {
  const [user, setUser] = useState<CurrentUser | null>(cachedUser)
  const [loading, setLoading] = useState<boolean>(!cachedUser)
  const [error, setError] = useState<string | null>(null)

  const fetchUser = useCallback(async () => {
    // If a fetch is already in-flight, wait for it instead of starting
    // a parallel request.
    if (cachedPromise) {
      try {
        const u = await cachedPromise
        setUser(u)
        setError(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load user')
      } finally {
        setLoading(false)
      }
      return
    }

    setLoading(true)
    cachedPromise = (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' })
        // 401 = no session. Treat as "user is null" — NOT an error. This
        // keeps the landing page (and any pre-login route) from surfacing
        // an error toast just because the visitor isn't signed in.
        if (res.status === 401) {
          cachedUser = null
          return null
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        cachedUser = (data.user as CurrentUser | null) ?? null
        return cachedUser
      } catch (e) {
        // Don't cache errors — allow retry on next mount / refresh().
        throw e
      } finally {
        cachedPromise = null
      }
    })()

    try {
      const u = await cachedPromise
      setUser(u)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load user')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Serve from cache instantly — no loading flash for downstream
    // consumers after the first fetch resolves.
    if (cachedUser) {
      setUser(cachedUser)
      setLoading(false)
      return
    }
    fetchUser()
  }, [fetchUser])

  const refresh = useCallback(async () => {
    // Bust the cache so the next fetch actually hits the network.
    cachedUser = null
    cachedPromise = null
    await fetchUser()
  }, [fetchUser])

  return { user, loading, error, refresh }
}

/**
 * Convenience helper for role gating.
 *
 * Returns `true` if the given role string represents an owner-level
 * principal (owner, admin, super_admin, or the underscore-free variant
 * "superadmin"). Case-insensitive. Returns `false` for any other role
 * (manager, employee, customer) or for null/undefined.
 *
 * Usage:
 *   const { user } = useCurrentUser()
 *   {isOwnerOrAdmin(user?.role) && <OwnerOnlySettings />}
 */
export function isOwnerOrAdmin(role: string | undefined | null): boolean {
  if (!role) return false
  const r = role.toLowerCase()
  return r === 'owner' || r === 'admin' || r === 'super_admin' || r === 'superadmin'
}
