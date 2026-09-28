import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/forms/agents
 * List all agents for the authenticated tenant, or fetch a single agent by id/slug.
 *
 * Query params:
 *   id   — fetch a single agent by id
 *   slug — fetch a single agent by slug
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('id');
    const agentSlug = searchParams.get('slug');
    const user = await getAuthUser();

    // Fetch a single agent
    if (agentId || agentSlug) {
      const identifier = agentId || agentSlug!;
      const whereClause: any = {
        OR: [{ id: identifier }, { slug: identifier }],
      };
      if (user?.tenantId) {
        whereClause.AND = [
          {
            OR: [
              { tenantId: user.tenantId },
              { tenantId: null },
            ],
          },
        ];
      }

      const agent = await db.formAgent.findFirst({ where: whereClause });

      if (agent) {
        // Merge DB row with the configJson (which contains the full FormAgentData)
        const config = (agent.configJson as Partial<FormAgentData>) || {};
        const merged: FormAgentData = {
          ...DEFAULT_FORM_AGENT,
          ...config,
          id: agent.id,
          tenantId: agent.tenantId || undefined,
          slug: agent.slug,
          name: agent.name || config.name || DEFAULT_FORM_AGENT.name,
          roleTitle: agent.roleTitle || config.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
          avatarUrl: agent.avatarUrl || config.avatarUrl || DEFAULT_FORM_AGENT.avatarUrl,
          statusText: agent.statusText || config.statusText || 'Online',
          brandColor: agent.brandColor || config.brandColor || DEFAULT_FORM_AGENT.brandColor,
          voiceTone: (agent.voiceTone || config.voiceTone || 'friendly') as FormAgentData['voiceTone'],
          welcomeGreeting: agent.welcomeGreeting || config.welcomeGreeting || DEFAULT_FORM_AGENT.welcomeGreeting,
          greetingSubtitle: agent.greetingSubtitle || config.greetingSubtitle || undefined,
          style: config.style || DEFAULT_FORM_AGENT.style,
          updatedAt: agent.updatedAt.toISOString(),
        };
        return NextResponse.json({ agent: merged });
      }

      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // List all agents for the tenant
    const agents = await db.formAgent.findMany({
      where: user?.tenantId
        ? {
            OR: [
              { tenantId: user.tenantId },
              { tenantId: null },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
    });

    if (agents.length > 0) {
      const merged = agents.map((agent) => {
        const config = (agent.configJson as Partial<FormAgentData>) || {};
        return {
          ...DEFAULT_FORM_AGENT,
          ...config,
          id: agent.id,
          tenantId: agent.tenantId || undefined,
          slug: agent.slug,
          name: agent.name || config.name || DEFAULT_FORM_AGENT.name,
          roleTitle: agent.roleTitle || config.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
          avatarUrl: agent.avatarUrl || config.avatarUrl || DEFAULT_FORM_AGENT.avatarUrl,
          statusText: agent.statusText || config.statusText || 'Online',
          brandColor: agent.brandColor || config.brandColor || DEFAULT_FORM_AGENT.brandColor,
          voiceTone: (agent.voiceTone || config.voiceTone || 'friendly') as FormAgentData['voiceTone'],
          welcomeGreeting: agent.welcomeGreeting || config.welcomeGreeting || DEFAULT_FORM_AGENT.welcomeGreeting,
          greetingSubtitle: agent.greetingSubtitle || config.greetingSubtitle || undefined,
          style: config.style || DEFAULT_FORM_AGENT.style,
          updatedAt: agent.updatedAt.toISOString(),
        } as FormAgentData;
      });
      return NextResponse.json({ agents: merged });
    }

    return NextResponse.json({ agents: [] });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch form agents', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/forms/agents
 * Create or update an agent. If `id` is provided, updates; otherwise creates.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as FormAgentData;
    const user = await getAuthUser();

    if (!body.name) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    const slug = body.slug || `agent-${Date.now()}`;
    const tenantId = user?.tenantId || body.tenantId || null;

    // Extract top-level fields for columns; store the rest as JSON
    const {
      id: _id,
      tenantId: _tenantId,
      slug: _slug,
      name,
      roleTitle,
      avatarUrl,
      statusText,
      brandColor,
      voiceTone,
      welcomeGreeting,
      greetingSubtitle,
      updatedAt: _updatedAt,
      ...restConfig
    } = body;

    const effectiveAvatar = avatarUrl || (body.style as any)?.avatarUrl || body.avatarUrl || '';
    const effectiveBrandColor = brandColor || (body.style as any)?.primaryColor || body.brandColor || '#059669';

    // Check if an agent already exists by ID or by slug
    let existing = null;
    if (body.id) {
      existing = await db.formAgent.findFirst({
        where: {
          OR: [{ id: body.id }, ...(body.slug ? [{ slug: body.slug }] : [])],
        },
      });
    } else if (body.slug) {
      existing = await db.formAgent.findFirst({
        where: {
          slug: body.slug,
        },
      });
    }

    if (existing) {
      const updated = await db.formAgent.update({
        where: { id: existing.id },
        data: {
          tenantId: tenantId || existing.tenantId,
          slug: body.slug || existing.slug,
          name,
          roleTitle: roleTitle || 'AI Assistant',
          avatarUrl: effectiveAvatar,
          statusText: statusText || 'Online',
          brandColor: effectiveBrandColor,
          voiceTone: voiceTone || 'friendly',
          welcomeGreeting: welcomeGreeting || 'Hello! How can I help you today?',
          greetingSubtitle: greetingSubtitle || null,
          configJson: {
            ...body,
            id: existing.id,
            slug: body.slug || existing.slug,
            avatarUrl: effectiveAvatar,
            brandColor: effectiveBrandColor,
          } as unknown as object,
        },
      });

      return NextResponse.json({
        success: true,
        agent: {
          ...body,
          id: updated.id,
          slug: updated.slug,
          avatarUrl: effectiveAvatar,
          brandColor: effectiveBrandColor,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    // Creating new agent: ensure slug is unique
    let resolvedSlug = slug;
    const slugCollision = await db.formAgent.findUnique({ where: { slug: resolvedSlug } });
    if (slugCollision) {
      resolvedSlug = `${resolvedSlug}-${Math.random().toString(36).substring(2, 6)}`;
    }

    const created = await db.formAgent.create({
      data: {
        tenantId,
        slug: resolvedSlug,
        name,
        roleTitle: roleTitle || 'AI Assistant',
        avatarUrl: effectiveAvatar,
        statusText: statusText || 'Online',
        brandColor: effectiveBrandColor,
        voiceTone: voiceTone || 'friendly',
        welcomeGreeting: welcomeGreeting || 'Hello! How can I help you today?',
        greetingSubtitle: greetingSubtitle || null,
        configJson: {
          ...body,
          slug: resolvedSlug,
          avatarUrl: effectiveAvatar,
          brandColor: effectiveBrandColor,
        } as unknown as object,
      },
    });

    return NextResponse.json({
      success: true,
      agent: {
        ...body,
        id: created.id,
        slug: created.slug,
        avatarUrl: effectiveAvatar,
        brandColor: effectiveBrandColor,
        updatedAt: created.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('[forms/agents POST] Error saving agent:', error);
    return NextResponse.json(
      { error: 'Failed to save form agent to database', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/forms/agents
 * Deletes an agent belonging to the authenticated tenant.
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const user = await getAuthUser();

    if (!id) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const whereClause: any = { id };
    if (user?.tenantId) {
      whereClause.tenantId = user.tenantId;
    }

    const result = await db.formAgent.deleteMany({ where: whereClause });
    if (result.count === 0) {
      return NextResponse.json({ error: 'Agent not found or not authorized' }, { status: 404 });
    }

    return NextResponse.json({ success: true, count: result.count });
  } catch (error) {
    console.error('[forms/agents DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
