import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  configFind: vi.fn(),
  configCreate: vi.fn(),
  configUpdate: vi.fn(),
  userFind: vi.fn(),
  userFindFirst: vi.fn(),
  ordersFind: vi.fn(),
  invoicesFind: vi.fn(),
}));

vi.mock('@/lib/commerce/access', () => ({
  resolveStaffSessionFromRequest: mocks.session,
  ownerBusiness: vi.fn().mockImplementation(async () => {
    const s = await mocks.session();
    return s.business;
  }),
}));

vi.mock('@/lib/db', () => ({
  db: {
    gptformCommerceConfig: {
      findFirst: mocks.configFind,
      create: mocks.configCreate,
      update: mocks.configUpdate,
    },
    user: {
      findUnique: mocks.userFind,
      findFirst: mocks.userFindFirst,
    },
    gptformCommerceOrder: {
      findMany: mocks.ordersFind,
    },
    aiInvoice: {
      findMany: mocks.invoicesFind,
    },
  },
}));

import { GET as getStaff, POST as addStaff, PATCH as updateStaff, DELETE as deleteStaff } from '@/app/api/commerce/staff/route';
import { GET as getReports } from '@/app/api/commerce/reports/route';
import { getDefaultPermissionsForRole } from '@/lib/commerce/staff-helper';

describe('BOS Multi-User Staff & Reporting Suite', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    mocks.session.mockResolvedValue({
      business: { id: 'biz-123', name: 'Ravi Store', ownerId: 'user-owner' },
      role: 'owner',
      permissions: getDefaultPermissionsForRole('owner'),
      isOwner: true,
    });

    mocks.userFind.mockResolvedValue({
      id: 'user-owner',
      name: 'Ravi Kumar',
      email: 'ravi@store.in',
      phone: '+919876543210',
    });

    mocks.configFind.mockResolvedValue({
      id: 'cfg-1',
      businessId: 'biz-123',
      fieldsJson: JSON.stringify({
        staffMembers: [
          {
            id: 'staff-1',
            name: 'Sunil Admin',
            phone: '+919811122334',
            role: 'admin',
            isActive: true,
            permissions: getDefaultPermissionsForRole('admin'),
          },
        ],
      }),
    });

    mocks.ordersFind.mockResolvedValue([]);
    mocks.invoicesFind.mockResolvedValue([]);
  });

  describe('Staff API (/api/commerce/staff)', () => {
    it('lists staff members and automatically includes the primary owner', async () => {
      const req = new NextRequest('http://localhost/api/commerce/staff');
      const res = await getStaff(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.staff).toHaveLength(2);
      expect(data.staff[0].role).toBe('owner');
      expect(data.staff[1].role).toBe('admin');
      expect(data.availableRoles.some((r: any) => r.id === 'admin')).toBe(true);
      expect(data.availableRoles.some((r: any) => r.id === 'cashier')).toBe(true);
    });

    it('allows an owner or admin to add a new cashier staff member', async () => {
      mocks.configUpdate.mockResolvedValue({});
      mocks.userFindFirst.mockResolvedValue(null);

      const req = new NextRequest('http://localhost/api/commerce/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Rohit Cashier',
          phone: '+919833344556',
          role: 'cashier',
        }),
      });

      const res = await addStaff(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.staffMember.name).toBe('Rohit Cashier');
      expect(data.staffMember.role).toBe('cashier');
      expect(data.staffMember.permissions.canPosBilling).toBe(true);
      expect(data.staffMember.permissions.canCreateInvoices).toBe(false);
    });

    it('rejects adding staff if role lacks staff management permissions', async () => {
      mocks.session.mockResolvedValue({
        business: { id: 'biz-123' },
        role: 'cashier',
        permissions: getDefaultPermissionsForRole('cashier'),
        isOwner: false,
      });

      const req = new NextRequest('http://localhost/api/commerce/staff', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Hacker',
          phone: '+919999988888',
          role: 'admin',
        }),
      });

      const res = await addStaff(req);
      expect(res.status).toBe(403);
    });

    it('prevents deleting the primary business owner', async () => {
      const req = new NextRequest('http://localhost/api/commerce/staff?id=owner-user-owner', {
        method: 'DELETE',
      });

      const res = await deleteStaff(req);
      expect(res.status).toBe(400);
    });

    it('updates a staff member role and permissions', async () => {
      mocks.configUpdate.mockResolvedValue({});

      const req = new NextRequest('http://localhost/api/commerce/staff', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'staff-1',
          name: 'Sunil Store Manager',
          role: 'admin',
          isActive: false,
        }),
      });

      const res = await updateStaff(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.staffMember.name).toBe('Sunil Store Manager');
      expect(data.staffMember.isActive).toBe(false);
    });
  });

  describe('Reporting Suite API (/api/commerce/reports)', () => {
    it('aggregates period sales, GST tax slabs, P&L and payment modes', async () => {
      mocks.ordersFind.mockResolvedValue([
        {
          id: 'ORD-101',
          total: 1050,
          paymentStatus: 'PAID',
          status: 'DELIVERED',
          paymentMethod: 'cash',
          itemsJson: JSON.stringify([
            { name: 'Sunflower Oil 1L', price: 1000, qty: 1, gstRate: 5 },
          ]),
        },
        {
          id: 'ORD-102',
          total: 2180,
          paymentStatus: 'PAID',
          status: 'DELIVERED',
          paymentMethod: 'upi',
          itemsJson: JSON.stringify([
            { name: 'Electronics Gadget', price: 2000, qty: 1, gstRate: 18 },
          ]),
        },
      ]);

      const req = new NextRequest('http://localhost/api/commerce/reports?period=today');
      const res = await getReports(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.summary.totalRevenue).toBe(3230);
      expect(data.summary.totalOrders).toBe(2);
      expect(data.salesByMethod.some((m: any) => m.method === 'Cash' && m.amount === 1050)).toBe(true);
      expect(data.salesByMethod.some((m: any) => m.method === 'UPI' && m.amount === 2180)).toBe(true);
      expect(data.topProducts).toHaveLength(2);
      expect(data.daybookSummary.closingBalance).toBeGreaterThan(0);
      expect(data.pnl.grossProfit).toBeGreaterThan(0);
    });

    it('blocks users without canViewReports permission', async () => {
      mocks.session.mockResolvedValue({
        business: { id: 'biz-123' },
        role: 'cashier',
        permissions: getDefaultPermissionsForRole('cashier'),
        isOwner: false,
      });

      const req = new NextRequest('http://localhost/api/commerce/reports?period=today');
      const res = await getReports(req);
      expect(res.status).toBe(403);
    });
  });
});
