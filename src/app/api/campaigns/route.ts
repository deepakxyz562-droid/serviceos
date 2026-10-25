import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { resolveBroadcastAudience } from '@/lib/broadcast-audience'
import { requireCrmTenant } from '@/lib/require-crm-tenant'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId || user.role === 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized: Staff or owner authentication required' },
        { status: user ? 403 : 401 }
      );
    }
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: Record<string, unknown> = {}
    // Always scope to the authenticated user's tenant (unless super admin)
    if (user.tenantId && !user.isSuperAdmin) {
      where.tenantId = user.tenantId
    } else if (user.tenantId) {
      // Super admin: optionally filter by tenantId query param
      const queryTenantId = searchParams.get('tenantId')
      if (queryTenantId) where.tenantId = queryTenantId
    }
    if (status) where.status = status
    if (type) {
      const types = type.split(',')
      if (types.length === 1) {
        where.type = type
      } else {
        where.type = { in: types }
      }
    }

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      db.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.campaign.count({ where }),
    ])

    return NextResponse.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json({ error: 'Failed to fetch campaigns' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId || user.role === 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized: Staff or owner authentication required' },
        { status: user ? 403 : 401 }
      );
    }
    const crmGuard = await requireCrmTenant(request);
    if (crmGuard) return crmGuard;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON request body' }, { status: 400 });
    }

    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Campaign name is required' }, { status: 400 });
    }

    // Supported campaign channels
    const validChannels = ['email', 'whatsapp', 'sms', 'multi'];
    const channel = typeof body.channel === 'string' && validChannels.includes(body.channel.toLowerCase())
      ? body.channel.toLowerCase()
      : 'email';

    // Authoritative tenant/workspace assignment strictly from authenticated session
    const tenantId = user.tenantId;
    const workspaceId = user.workspaceId || null;

    // ── Compute live audience count so the list shows a real number, not 0 ──
    let totalRecipients = body.totalRecipients || 0;
    if (!totalRecipients) {
      try {
        const audience = await resolveBroadcastAudience({
          tenantId,
          audienceType: body.audienceType || 'all',
          audienceId: body.audienceId || null,
          audienceFiltersJson: body.audienceFiltersJson || '{}',
          channel,
        });
        totalRecipients = audience.total;
      } catch {
        // Non-fatal — fall back to 0 if audience resolution fails
      }
    }

    const campaign = await db.campaign.create({
      data: {
        name: body.name.trim(),
        description: body.description || null,
        type: typeof body.type === 'string' && body.type ? body.type : 'promotional',
        status: body.scheduledAt ? 'scheduled' : (body.status || 'draft'),
        channel,
        audienceType: body.audienceType || 'all',
        audienceId: body.audienceId || null,
        audienceFiltersJson: body.audienceFiltersJson || '{}',
        templateId: body.templateId || null,
        messageContent: body.messageContent || '',
        mediaUrl: body.mediaUrl || null,
        mediaType: body.mediaType || null,
        ctaText: body.ctaText || null,
        ctaUrl: body.ctaUrl || null,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        timezone: body.timezone || 'UTC',
        totalRecipients,
        followUpSequenceJson: body.followUpSequenceJson || '[]',
        cloneFromId: body.cloneFromId || null,
        createdById: user.id,
        tenantId,
        workspaceId,
      },
    });

    return NextResponse.json({ data: campaign }, { status: 201 });
  } catch (error) {
    console.error('Error creating campaign:', error);
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
