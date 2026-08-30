import { describe, it, expect } from 'vitest'
import { apiError, resolveTenantId, resolveWorkspaceId } from '@/lib/api-auth'
import type { AuthUser } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Helper to build a mock AuthUser
function mockUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: 'user_1',
    email: 'test@example.com',
    name: 'Test User',
    role: 'admin',
    tenantId: 'tenant_1',
    workspaceId: 'ws_1',
    avatar: null,
    ...overrides,
  }
}

describe('apiError', () => {
  it('returns a NextResponse with the given status and message', () => {
    const res = apiError(400, 'Name is required')
    expect(res).toBeInstanceOf(NextResponse)
    expect(res.status).toBe(400)
  })

  it('includes the code when provided', async () => {
    const res = apiError(401, 'Authentication required', 'UNAUTHENTICATED')
    const body = await res.json()
    expect(body).toEqual({
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
    })
  })

  it('omits code when not provided', async () => {
    const res = apiError(404, 'Not found')
    const body = await res.json()
    expect(body).toEqual({ error: 'Not found' })
    expect(body.code).toBeUndefined()
  })
})

describe('resolveTenantId', () => {
  it('returns the user tenantId for non-super-admins (ignores query param)', () => {
    const user = mockUser({ tenantId: 'tenant_1' })
    expect(resolveTenantId(user, 'tenant_EVIL')).toBe('tenant_1')
  })

  it('returns the query tenantId for super-admins', () => {
    const user = mockUser({ isSuperAdmin: true, tenantId: 'tenant_1' })
    expect(resolveTenantId(user, 'tenant_2')).toBe('tenant_2')
  })

  it('falls back to user tenantId for super-admins when no query param', () => {
    const user = mockUser({ isSuperAdmin: true, tenantId: 'tenant_1' })
    expect(resolveTenantId(user, null)).toBe('tenant_1')
  })

  it('returns null when user has no tenantId and is not super-admin', () => {
    const user = mockUser({ tenantId: null })
    expect(resolveTenantId(user, 'tenant_EVIL')).toBeNull()
  })

  it('handles superadmin role string', () => {
    const user = mockUser({ role: 'superadmin', tenantId: 'tenant_1' })
    expect(resolveTenantId(user, 'tenant_2')).toBe('tenant_2')
  })
})

describe('resolveWorkspaceId', () => {
  it('returns the user workspaceId for non-super-admins (ignores query param)', () => {
    const user = mockUser({ workspaceId: 'ws_1' })
    expect(resolveWorkspaceId(user, 'ws_EVIL')).toBe('ws_1')
  })

  it('returns the query workspaceId for super-admins', () => {
    const user = mockUser({ isSuperAdmin: true, workspaceId: 'ws_1' })
    expect(resolveWorkspaceId(user, 'ws_2')).toBe('ws_2')
  })

  it('returns null when user has no workspaceId and is not super-admin', () => {
    const user = mockUser({ workspaceId: null })
    expect(resolveWorkspaceId(user, 'ws_EVIL')).toBeNull()
  })
})
