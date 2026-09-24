import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/agents/[slugOrId]
 *
 * Public endpoint (no auth required) to fetch an AI agent by slug or ID.
 * Used by:
 *   - Standalone agent page: /agent/[agentId]
 *   - Site-wide embed widget: <SiteAgentWidget agentId="..." />
 *   - External iframe embeds
 *
 * The endpoint merges the DB row with the configJson to produce a full
 * FormAgentData object. If the agent is not found, returns 404.
 *
 * CORS headers allow cross-origin requests so the widget can be embedded
 * on any website.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slugOrId: string }> },
) {
  const { slugOrId } = await params;

  if (!slugOrId) {
    return NextResponse.json({ error: 'Agent identifier required' }, { status: 400 });
  }

  try {
    // Try by slug first, then by ID
    let agent = null;
    try {
      agent = await db.formAgent.findUnique({ where: { slug: slugOrId } });
    } catch {
      // slug column might not have a unique constraint — try findFirst
      try {
        agent = await db.formAgent.findFirst({ where: { slug: slugOrId } });
      } catch {
        // DB not available
      }
    }

    if (!agent) {
      try {
        agent = await db.formAgent.findUnique({ where: { id: slugOrId } });
      } catch {
        // DB not available
      }
    }

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found', fallback: { ...DEFAULT_FORM_AGENT, id: slugOrId } },
        { status: 404 },
      );
    }

    // Merge DB row with configJson
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

    return NextResponse.json(
      { agent: merged },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
        },
      },
    );
  } catch (error) {
    console.error('[public/agents] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load agent', fallback: { ...DEFAULT_FORM_AGENT, id: slugOrId } },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
