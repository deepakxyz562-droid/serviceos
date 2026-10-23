import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { resolveStaffSessionFromRequest } from '@/lib/commerce/access';
import {
  type BosStaffMember,
  type BosStaffRole,
  type BosStaffPermissions,
  getDefaultPermissionsForRole,
} from '@/lib/commerce/staff-helper';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    const { business, role, permissions, isOwner } = session;

    // Staff view permission check: Owner, Admin, or staff with canManageStaff
    if (!isOwner && role !== 'admin' && !permissions.canManageStaff) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to manage staff' },
        { status: 403 }
      );
    }

    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });

    let staffMembers: BosStaffMember[] = [];
    if (config?.fieldsJson) {
      try {
        const raw = JSON.parse(config.fieldsJson);
        staffMembers = Array.isArray(raw.staffMembers) ? raw.staffMembers : [];
      } catch {
        staffMembers = [];
      }
    }

    // Include the owner as the primary member if not in list
    const ownerUser = await db.user.findUnique({
      where: { id: business.ownerId },
      select: { id: true, name: true, email: true, phone: true },
    });

    const hasOwnerInList = staffMembers.some((s) => s.role === 'owner');
    if (!hasOwnerInList && ownerUser) {
      staffMembers.unshift({
        id: `owner-${ownerUser.id}`,
        name: ownerUser.name || business.ownerName || 'Business Owner',
        phone: ownerUser.phone || business.phone || '',
        email: ownerUser.email,
        role: 'owner',
        permissions: getDefaultPermissionsForRole('owner'),
        isActive: true,
        createdAt: business.createdAt ? new Date(business.createdAt).toISOString() : new Date().toISOString(),
        userId: ownerUser.id,
      });
    }

    return NextResponse.json({
      staff: staffMembers,
      currentUserRole: role,
      isOwner,
      availableRoles: [
        {
          id: 'admin',
          label: 'Admin / Store Manager',
          description: 'Full store management, inventory, reports, and staff management',
        },
        {
          id: 'biller',
          label: 'Biller / Invoicing Operator',
          description: 'Creates invoices, quotes, customer khata, and manages customers',
        },
        {
          id: 'cashier',
          label: 'Cashier / POS Operator',
          description: 'POS counter billing, barcode scanning, thermal printing, and payment collection',
        },
        {
          id: 'stock_manager',
          label: 'Stock / Inventory Manager',
          description: 'Adds/edits products, updates inventory quantities, supplier purchases',
        },
        {
          id: 'accountant',
          label: 'Accountant / CA',
          description: 'View-only access to Invoices, GSTR-1 & 3B tax reports, Daybook, and Khata dues',
        },
      ],
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (e.message === 'BUSINESS_NOT_FOUND') {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }
    return NextResponse.json({ error: e.message || 'Failed to fetch staff' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    const { business, role, permissions, isOwner } = session;

    if (!isOwner && role !== 'admin' && !permissions.canManageStaff) {
      return NextResponse.json(
        { error: 'Forbidden: Only Business Owner or Admin can add staff' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, phone, email, role: requestedRole, permissions: customPerms } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Staff name is required' }, { status: 400 });
    }
    if (!phone || !phone.trim()) {
      return NextResponse.json({ error: 'Staff phone number is required' }, { status: 400 });
    }

    const staffRole: BosStaffRole = requestedRole && ['admin', 'biller', 'cashier', 'stock_manager', 'accountant'].includes(requestedRole)
      ? requestedRole
      : 'biller';

    const defaultPerms = getDefaultPermissionsForRole(staffRole);
    const finalPermissions: BosStaffPermissions = {
      ...defaultPerms,
      ...(customPerms || {}),
    };

    let config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify([]),
          fieldsJson: JSON.stringify({ staffMembers: [] }),
          currency: business.currency || 'INR',
          currencySymbol: business.currencySymbol || '₹',
        },
      });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(config.fieldsJson || '{}');
      if (Array.isArray(parsed)) parsed = { fields: parsed };
    } catch {
      parsed = {};
    }

    const currentStaff: BosStaffMember[] = Array.isArray(parsed.staffMembers) ? parsed.staffMembers : [];

    // Check if phone or email already exists in staff
    const phoneClean = phone.replace(/[^0-9]/g, '');
    const existing = currentStaff.find(
      (s) =>
        s.phone.replace(/[^0-9]/g, '').endsWith(phoneClean.slice(-10)) ||
        (email && s.email && s.email.trim().toLowerCase() === email.trim().toLowerCase())
    );

    if (existing) {
      return NextResponse.json(
        { error: `Staff member with phone ${phone} or email ${email || ''} already exists` },
        { status: 409 }
      );
    }

    // Try to link with existing User account if one exists
    let linkedUserId: string | undefined = undefined;
    const existingUser = await db.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email: email.trim().toLowerCase() }] : []),
          { phone: { contains: phoneClean.slice(-10) } },
        ],
      },
      select: { id: true },
    });
    if (existingUser) {
      linkedUserId = existingUser.id;
    }

    const newMember: BosStaffMember = {
      id: `staff_${randomUUID()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email ? email.trim().toLowerCase() : undefined,
      role: staffRole,
      permissions: finalPermissions,
      isActive: true,
      createdAt: new Date().toISOString(),
      userId: linkedUserId,
    };

    currentStaff.push(newMember);
    parsed.staffMembers = currentStaff;

    await db.gptformCommerceConfig.update({
      where: { id: config.id },
      data: {
        fieldsJson: JSON.stringify(parsed),
      },
    });

    return NextResponse.json({
      success: true,
      staffMember: newMember,
      message: `${name.trim()} added as ${staffRole}`,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to add staff member' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    const { business, role, permissions, isOwner } = session;

    if (!isOwner && role !== 'admin' && !permissions.canManageStaff) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to update staff' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, name, phone, email, role: updatedRole, permissions: updatedPerms, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    // Cannot edit owner role via staff API
    if (id.startsWith('owner-')) {
      return NextResponse.json({ error: 'Cannot modify primary business owner role' }, { status: 400 });
    }

    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return NextResponse.json({ error: 'Commerce config not found' }, { status: 404 });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(config.fieldsJson || '{}');
      if (Array.isArray(parsed)) parsed = { fields: parsed };
    } catch {
      parsed = {};
    }

    const staffList: BosStaffMember[] = Array.isArray(parsed.staffMembers) ? parsed.staffMembers : [];
    const idx = staffList.findIndex((s) => s.id === id);

    if (idx === -1) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const member = staffList[idx];

    // If role changed, compute new default perms or apply updated perms
    const newRole = updatedRole || member.role;
    const defaultPerms = getDefaultPermissionsForRole(newRole);
    const newPerms = updatedPerms ? { ...defaultPerms, ...updatedPerms } : (updatedRole ? defaultPerms : member.permissions);

    staffList[idx] = {
      ...member,
      name: name !== undefined ? name.trim() : member.name,
      phone: phone !== undefined ? phone.trim() : member.phone,
      email: email !== undefined ? (email ? email.trim().toLowerCase() : undefined) : member.email,
      role: newRole,
      permissions: newPerms,
      isActive: isActive !== undefined ? Boolean(isActive) : member.isActive,
    };

    parsed.staffMembers = staffList;

    await db.gptformCommerceConfig.update({
      where: { id: config.id },
      data: {
        fieldsJson: JSON.stringify(parsed),
      },
    });

    return NextResponse.json({
      success: true,
      staffMember: staffList[idx],
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to update staff member' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await resolveStaffSessionFromRequest(req);
    const { business, role, permissions, isOwner } = session;

    if (!isOwner && role !== 'admin' && !permissions.canManageStaff) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions to remove staff' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 });
    }

    if (id.startsWith('owner-')) {
      return NextResponse.json({ error: 'Cannot delete primary business owner' }, { status: 400 });
    }

    const config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!config) {
      return NextResponse.json({ error: 'Commerce config not found' }, { status: 404 });
    }

    let parsed: any = {};
    try {
      parsed = JSON.parse(config.fieldsJson || '{}');
      if (Array.isArray(parsed)) parsed = { fields: parsed };
    } catch {
      parsed = {};
    }

    const staffList: BosStaffMember[] = Array.isArray(parsed.staffMembers) ? parsed.staffMembers : [];
    const filtered = staffList.filter((s) => s.id !== id);

    parsed.staffMembers = filtered;

    await db.gptformCommerceConfig.update({
      where: { id: config.id },
      data: {
        fieldsJson: JSON.stringify(parsed),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Staff member removed successfully',
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: e.message || 'Failed to remove staff member' }, { status: 500 });
  }
}
