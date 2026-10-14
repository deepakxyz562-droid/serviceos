import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  crmGuard: vi.fn(),
  findFirst: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({ getAuthUser: mocks.user }));
vi.mock('@/lib/require-crm-tenant', () => ({ requireCrmTenant: mocks.crmGuard }));
vi.mock('@/lib/db', () => ({
  db: {
    customer: { findFirst: mocks.findFirst, findUnique: mocks.findUnique, create: mocks.create },
    workspace: { findUnique: vi.fn().mockResolvedValue({ tenantId: 'tenant-1' }) },
    $transaction: mocks.transaction,
  },
}));

import { POST } from '@/app/api/customers/route';

describe('Optional Email in Customer Creation', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.user.mockResolvedValue({ id: 'user-1', tenantId: 'tenant-1', workspaceId: 'ws-1' });
    mocks.crmGuard.mockResolvedValue(null);
    mocks.findFirst.mockResolvedValue(null);
    mocks.findUnique.mockImplementation(async ({ where }) => ({
      id: where.id || 'cust-123',
      name: 'Rohan Sharma',
      phone: '9876543210',
      email: null,
      additionalContacts: [],
      properties: [],
    }));
    mocks.transaction.mockImplementation(async (cb) => {
      return cb({
        customer: {
          create: mocks.create.mockImplementation(async ({ data }) => ({
            id: 'cust-123',
            ...data,
          })),
        },
        customerProperty: { create: vi.fn() },
        customerContact: { create: vi.fn() },
      });
    });
  });

  it('allows customer creation with phone and name without email', async () => {
    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Sharma',
        phone: '9876543210',
        // email omitted
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledTimes(1);
    const createArg = mocks.create.mock.calls[0][0];
    expect(createArg.data.name).toBe('Rohan Sharma');
    expect(createArg.data.phone).toBe('9876543210');
    expect(createArg.data.email).toBeNull();
  });

  it('rejects invalid email format when email is provided', async () => {
    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Sharma',
        phone: '9876543210',
        email: 'invalid-email-format',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe('Please enter a valid email address');
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('accepts valid email when provided', async () => {
    const req = new NextRequest('http://localhost/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Rohan Sharma',
        phone: '9876543210',
        email: 'rohan@example.com',
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(201);
    const createArg = mocks.create.mock.calls[0][0];
    expect(createArg.data.email).toBe('rohan@example.com');
  });
});
