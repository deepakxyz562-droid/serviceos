import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';

const ALLOWED_TYPES = new Set(['whatsapp', 'sms']);

function isSecretKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('key') || k.includes('secret') || k.includes('password') || k.includes('token');
}

/**
 * PUT /api/superadmin/providers/communication-providers/[id]
 * Update a CommunicationProvider.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.communicationProvider.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    // Reject type change to email
    if (body.type !== undefined && body.type !== existing.type) {
      if (body.type === 'email') {
        return NextResponse.json(
          { error: 'Email providers are managed under /api/superadmin/providers/email-providers.' },
          { status: 400 }
        );
      }
      if (!ALLOWED_TYPES.has(body.type)) {
        return NextResponse.json(
          { error: `Unsupported provider type "${body.type}". Allowed: whatsapp, sms.` },
          { status: 400 }
        );
      }
    }

    const updateData: Record<string, unknown> = {};

    // Handle config updates - merge with existing, preserving secrets masked with '••••••••'
    if (body.config) {
      let existingConfig: Record<string, string> = {};
      try { existingConfig = JSON.parse(existing.configJson); } catch { /* empty */ }
      const mergedConfig: Record<string, string> = { ...existingConfig };

      for (const [key, value] of Object.entries(body.config as Record<string, string>)) {
        if (isSecretKey(key)) {
          // Only update if a real (non-mask, non-empty) value was provided
          if (typeof value === 'string' && value.trim() !== '' && value !== '••••••••') {
            mergedConfig[key] = value;
          }
          // else: keep existing value
        } else {
          if (value === undefined || value === null) {
            delete mergedConfig[key];
          } else {
            mergedConfig[key] = value;
          }
        }
      }
      updateData.configJson = JSON.stringify(mergedConfig);
    }

    if (body.status !== undefined) updateData.status = body.status;
    if (body.sendingEnabled !== undefined) updateData.sendingEnabled = body.sendingEnabled;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.isDefault !== undefined) updateData.isDefault = body.isDefault;
    if (body.dailyLimit !== undefined) updateData.dailyLimit = body.dailyLimit;
    if (body.monthlyLimit !== undefined) updateData.monthlyLimit = body.monthlyLimit;
    if (body.provider !== undefined) updateData.provider = body.provider;
    if (body.type !== undefined) updateData.type = body.type;

    const result = await db.communicationProvider.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('[SuperAdmin] Error updating communication provider:', error);
    return NextResponse.json({ error: 'Failed to update provider' }, { status: 500 });
  }
}

/**
 * DELETE /api/superadmin/providers/communication-providers/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.communicationProvider.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 });
    }

    await db.communicationProvider.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SuperAdmin] Error deleting communication provider:', error);
    return NextResponse.json({ error: 'Failed to delete provider' }, { status: 500 });
  }
}
