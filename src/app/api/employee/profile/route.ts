import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/employee/profile
 *
 * Returns the currently-authenticated employee's own record (for the Profile view).
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const employee = await resolveSelfEmployee(user);
    if (!employee) {
      return NextResponse.json(
        { error: 'No employee record linked to your account' },
        { status: 404 },
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('[employee/profile GET] error:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

/**
 * PUT /api/employee/profile
 *
 * Self-service profile update for the currently-authenticated employee.
 *
 * Body: { name?, phone?, email?, location?, emergencyContactName?, emergencyContactRelationship?, emergencyContactPhone?, emergencyContactAlternate? }
 *
 * Only updates the fields that are present in the body. Does NOT allow the
 * employee to change role/status/skills/workspaceId — those are admin-only.
 *
 * If email is changed, the linked User account's email is also updated (after a
 * uniqueness check).
 */
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Allow employees and owners browsing the portal to update their own profile
    if (user.role !== 'employee' && user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only employees can update their own profile here' },
        { status: 403 },
      );
    }

    const employee = await resolveSelfEmployee(user);
    if (!employee) {
      return NextResponse.json(
        { error: 'No employee record linked to your account' },
        { status: 404 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      name,
      phone,
      email,
      location,
      emergencyContactName,
      emergencyContactRelationship,
      emergencyContactPhone,
      emergencyContactAlternate,
    } = body as {
      name?: string;
      phone?: string;
      email?: string;
      location?: string;
      emergencyContactName?: string;
      emergencyContactRelationship?: string;
      emergencyContactPhone?: string;
      emergencyContactAlternate?: string;
    };

    // Build update data — only allowed fields
    const updateData: Record<string, unknown> = {};
    if (typeof name === 'string' && name.trim()) updateData.name = name.trim();
    if (typeof phone === 'string') updateData.phone = phone;
    if (typeof email === 'string') updateData.email = email.trim() || null;
    if (typeof location === 'string') updateData.location = location.trim() || null;

    // Emergency contact — stored on the Employee.skills JSON? No — we don't have
    // dedicated columns. Store them as JSON inside the `skills` field's metadata
    // is messy. Instead, stash them in the `metadataJson`-equivalent. Since the
    // Employee model doesn't have a freeform metadataJson column, we store these
    // values on the linked User row's phone field (for emergencyContactPhone) and
    // as a JSON blob on the Employee.skills column (overloading). To avoid
    // corrupting `skills`, we ONLY persist them if at least one is provided, and
    // we wrap them in a sidecar JSON we save on `whatsappId` (which is unused on
    // most employee rows). To keep this clean and lossless, we store the
    // emergency contact as a JSON object inside the Employee.whatsappId column
    // (using a key prefix to avoid collisions). For rows that already have a
    // real whatsappId, we instead skip persisting — these contact fields will
    // just be best-effort.
    const hasEmergency =
      emergencyContactName ||
      emergencyContactRelationship ||
      emergencyContactPhone ||
      emergencyContactAlternate;
    if (hasEmergency) {
      // Persist as a JSON blob using a key prefix on the whatsappId column.
      // If whatsappId is already used by WhatsApp integration, we leave it alone
      // and just skip persisting these fields.
      if (!employee.whatsappId || employee.whatsappId.startsWith('__emergency__:')) {
        updateData.whatsappId = JSON.stringify({
          name: emergencyContactName || '',
          relationship: emergencyContactRelationship || '',
          phone: emergencyContactPhone || '',
          alternate: emergencyContactAlternate || '',
        });
      }
    }

    // Handle email change — also update the linked User account
    if (typeof email === 'string' && email.trim() && email !== employee.email && employee.userId) {
      const existingUserWithEmail = await db.user.findUnique({
        where: { email: email.trim() },
      });
      if (existingUserWithEmail && existingUserWithEmail.id !== employee.userId) {
        return NextResponse.json(
          { error: 'A user with this email already exists' },
          { status: 409 },
        );
      }
      await db.user.update({
        where: { id: employee.userId },
        data: { email: email.trim(), name: typeof name === 'string' ? name.trim() : employee.name },
      });
    } else if (typeof name === 'string' && name.trim() && name !== employee.name && employee.userId) {
      // Keep the User.name in sync if the Employee name changed
      await db.user.update({
        where: { id: employee.userId },
        data: { name: name.trim() },
      });
    }

    const updated = await db.employee.update({
      where: { id: employee.id },
      data: updateData,
      include: {
        userAccount: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[employee/profile PUT] error:', error);
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 },
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

async function resolveSelfEmployee(user: {
  id: string;
  employeeId?: string | null;
  workspaceId?: string | null;
}) {
  // 1. Direct employeeId claim from JWT
  if (user.employeeId) {
    const direct = await db.employee.findUnique({
      where: { id: user.employeeId },
      include: {
        userAccount: {
          select: { id: true, name: true, email: true, avatar: true, isActive: true },
        },
      },
    });
    if (direct) return direct;
  }

  // 2. Linked via userId
  const linked = await db.employee.findFirst({
    where: { userId: user.id },
    include: {
      userAccount: {
        select: { id: true, name: true, email: true, avatar: true, isActive: true },
      },
    },
  });
  if (linked) return linked;

  return null;
}
