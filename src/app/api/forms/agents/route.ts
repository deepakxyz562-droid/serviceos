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
      try {
        const agent = agentId
          ? await db.formAgent.findUnique({ where: { id: agentId } })
          : await db.formAgent.findUnique({ where: { slug: agentSlug! } });

        if (agent) {
          // Merge DB row with the configJson (which contains the full FormAgentData)
          const config = agent.configJson as Partial<FormAgentData>;
          const merged: FormAgentData = {
            ...DEFAULT_FORM_AGENT,
            ...config,
            id: agent.id,
            tenantId: agent.tenantId || undefined,
            slug: agent.slug,
            name: agent.name,
            roleTitle: agent.roleTitle,
            avatarUrl: agent.avatarUrl,
            statusText: agent.statusText,
            brandColor: agent.brandColor,
            voiceTone: agent.voiceTone as FormAgentData['voiceTone'],
            welcomeGreeting: agent.welcomeGreeting,
            greetingSubtitle: agent.greetingSubtitle || undefined,
            updatedAt: agent.updatedAt.toISOString(),
          };
          return NextResponse.json({ agent: merged });
        }
      } catch {
        // DB not available — fall through to default
      }

      // Fallback to default agent
      const fallback = { ...DEFAULT_FORM_AGENT, id: agentId || agentSlug || 'default' };
      return NextResponse.json({ agent: fallback });
    }

    // List all agents for the tenant
    try {
      const agents = await db.formAgent.findMany({
        where: user?.tenantId ? { tenantId: user.tenantId } : {},
        orderBy: { createdAt: 'desc' },
      });

      if (agents.length > 0) {
        const merged = agents.map((agent) => {
          const config = agent.configJson as Partial<FormAgentData>;
          return {
            ...DEFAULT_FORM_AGENT,
            ...config,
            id: agent.id,
            tenantId: agent.tenantId || undefined,
            slug: agent.slug,
            name: agent.name,
            roleTitle: agent.roleTitle,
            avatarUrl: agent.avatarUrl,
            statusText: agent.statusText,
            brandColor: agent.brandColor,
            voiceTone: agent.voiceTone as FormAgentData['voiceTone'],
            welcomeGreeting: agent.welcomeGreeting,
            greetingSubtitle: agent.greetingSubtitle || undefined,
            updatedAt: agent.updatedAt.toISOString(),
          } as FormAgentData;
        });
        return NextResponse.json({ agents: merged });
      }
    } catch {
      // DB not available — fall through to default
    }

    // No agents in DB (or DB unavailable) — return the default
    return NextResponse.json({ agents: [DEFAULT_FORM_AGENT] });
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

    try {
      // If body.id exists, try to update
      if (body.id && !body.id.startsWith('agent_') && !body.id.startsWith('default')) {
        const existing = await db.formAgent.findUnique({ where: { id: body.id } });
        if (existing) {
          const updated = await db.formAgent.update({
            where: { id: body.id },
            data: {
              tenantId,
              slug,
              name,
              roleTitle: roleTitle || 'AI Assistant',
              avatarUrl: avatarUrl || '',
              statusText: statusText || 'Online',
              brandColor: brandColor || '#059669',
              voiceTone: voiceTone || 'friendly',
              welcomeGreeting: welcomeGreeting || 'Hello! How can I help you today?',
              greetingSubtitle: greetingSubtitle || null,
              configJson: body as unknown as object,
            },
          });

          return NextResponse.json({
            success: true,
            agent: {
              ...body,
              id: updated.id,
              slug: updated.slug,
              updatedAt: updated.updatedAt.toISOString(),
            },
          });
        }
      }

      // Create new agent
      const created = await db.formAgent.create({
        data: {
          tenantId,
          slug,
          name,
          roleTitle: roleTitle || 'AI Assistant',
          avatarUrl: avatarUrl || '',
          statusText: statusText || 'Online',
          brandColor: brandColor || '#059669',
          voiceTone: voiceTone || 'friendly',
          welcomeGreeting: welcomeGreeting || 'Hello! How can I help you today?',
          greetingSubtitle: greetingSubtitle || null,
          configJson: body as unknown as object,
        },
      });

      return NextResponse.json({
        success: true,
        agent: {
          ...body,
          id: created.id,
          slug: created.slug,
          updatedAt: created.updatedAt.toISOString(),
        },
      });
    } catch (dbError) {
      // DB not available — return success with in-memory ID (graceful degradation)
      console.warn('[forms/agents POST] DB unavailable, returning non-persisted agent:', dbError);
      const agentId = body.id || `agent_${Date.now()}`;
      return NextResponse.json({
        success: true,
        agent: {
          ...DEFAULT_FORM_AGENT,
          ...body,
          id: agentId,
          slug,
          updatedAt: new Date().toISOString(),
        },
        warning: 'Agent saved in-memory only — database not available.',
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save form agent', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 },
    );
  }
}
