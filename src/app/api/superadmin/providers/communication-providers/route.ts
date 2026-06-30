import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { toISOString } from '@/lib/utils';

const ALLOWED_TYPES = new Set(['whatsapp', 'sms']);

// Mask sensitive config values for display
function maskConfig(configJson: string): Record<string, string> {
  let config: Record<string, string> = {};
  try { config = JSON.parse(configJson); } catch { /* empty */ }
  const masked: Record<string, string> = {};
  for (const [key, value] of Object.entries(config)) {
    if (key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password') || key.toLowerCase().includes('token')) {
      masked[key] = value ? '••••••••' : '';
    } else {
      masked[key] = value;
    }
  }
  return masked;
}

/**
 * GET /api/superadmin/providers/communication-providers
 * List all CommunicationProviders for super admin.
 * Query params:
 *   - type: 'whatsapp' | 'sms'
 *   - status: 'active' | 'inactive' | 'error'
 *   - provider: filter by provider name
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const provider = searchParams.get('provider');

    const where: Record<string, unknown> = {};
    if (type && ALLOWED_TYPES.has(type)) where.type = type;
    if (status) where.status = status;
    if (provider) where.provider = provider;

    const providers = await db.communicationProvider.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: {
        credential: { select: { id: true, name: true, type: true } },
      },
    });

    const masked = providers.map((p) => ({
      id: p.id,
      name: p.name,
      type: p.type,
      provider: p.provider,
      status: p.status,
      isDefault: p.isDefault,
      sendingEnabled: p.sendingEnabled,
      dailyLimit: p.dailyLimit,
      monthlyLimit: p.monthlyLimit,
      sentToday: p.sentToday,
      sentThisMonth: p.sentThisMonth,
      totalSent: p.totalSent,
      totalDelivered: p.totalDelivered,
      totalFailed: p.totalFailed,
      lastUsedAt: toISOString(p.lastUsedAt as Date | string | null),
      lastError: p.lastError,
      config: maskConfig(p.configJson),
      configJson: undefined,
      credentialId: p.credentialId,
      credential: p.credential ? { id: (p.credential as { id: string }).id, name: (p.credential as { name: string }).name, type: (p.credential as { type: string }).type } : null,
      tenantId: p.tenantId,
      workspaceId: p.workspaceId,
      createdAt: toISOString(p.createdAt as Date | string),
    }));

    return NextResponse.json({ data: masked });
  } catch (error) {
    console.error('[SuperAdmin] Error fetching communication providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

/**
 * POST /api/superadmin/providers/communication-providers
 * Create a new CommunicationProvider (e.g., Meta Cloud API for WhatsApp).
 * Body: { name, type, provider, config, isDefault?, sendingEnabled?,
 *         dailyLimit?, monthlyLimit?, tenantId? }
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, type, provider, config, isDefault, sendingEnabled, dailyLimit, monthlyLimit, tenantId, status: reqStatus } = body;

    if (!name || !type || !provider) {
      return NextResponse.json({ error: 'name, type, and provider are required' }, { status: 400 });
    }

    if (type === 'email') {
      return NextResponse.json(
        { error: 'Email providers are managed under /api/superadmin/providers/email-providers.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(type)) {
      return NextResponse.json(
        { error: `Unsupported provider type "${type}". Allowed: whatsapp, sms.` },
        { status: 400 }
      );
    }

    const effectiveConfig: Record<string, string> = config ? { ...config } : {};
    const configJson = JSON.stringify(effectiveConfig);
    const finalTenantId = typeof tenantId === 'string' && tenantId.trim() ? tenantId.trim() : null;

    const result = await db.communicationProvider.create({
      data: {
        name,
        type,
        provider,
        configJson,
        credentialId: null,
        isDefault: isDefault || false,
        sendingEnabled: sendingEnabled !== undefined ? sendingEnabled : true,
        dailyLimit: dailyLimit || 1000,
        monthlyLimit: monthlyLimit || 30000,
        status: (typeof reqStatus === 'string' && ['active', 'inactive'].includes(reqStatus)) ? reqStatus : 'active',
        tenantId: finalTenantId,
        workspaceId: null,
      },
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('[SuperAdmin] Error creating communication provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
