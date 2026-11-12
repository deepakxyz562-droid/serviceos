import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT } from '@/features/forms/types/agent-types';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const cleanId = decodeURIComponent(id || '').trim();
    if (!cleanId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    const agent = await db.formAgent.findFirst({
      where: {
        OR: [{ id: cleanId }, { slug: cleanId }],
        status: 'active',
      },
    });

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    let cfg: Record<string, any> = {};
    try {
      cfg = JSON.parse(agent.configJson || '{}');
    } catch {
      cfg = {};
    }

    return NextResponse.json(
      {
        agent: {
          ...DEFAULT_FORM_AGENT,
          ...cfg,
          id: agent.id,
          slug: agent.slug,
          name: agent.name || cfg.name || DEFAULT_FORM_AGENT.name,
          roleTitle: agent.roleTitle || cfg.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
          avatarUrl: agent.avatarUrl || cfg.avatarUrl || '',
          statusText: agent.statusText || cfg.statusText || 'Online',
          brandColor: agent.brandColor || cfg.brandColor || '#059669',
          voiceTone: agent.voiceTone || cfg.voiceTone || 'friendly',
          welcomeGreeting:
            agent.welcomeGreeting || cfg.welcomeGreeting || DEFAULT_FORM_AGENT.welcomeGreeting,
          greetingSubtitle: agent.greetingSubtitle || cfg.greetingSubtitle || undefined,
          // Never leak raw LLM/system internal prompts over unauthenticated GET
          knowledge: {
            crawledUrls: [],
            documents: [],
            faqPairs: Array.isArray(cfg?.knowledge?.faqPairs) ? cfg.knowledge.faqPairs.slice(0, 20) : [],
            systemPrompt: '',
            guardrails: [],
          },
        },
      },
      { headers: { 'Cache-Control': 'public, max-age=60' } },
    );
  } catch {
    return NextResponse.json({ error: 'Failed to load public agent' }, { status: 500 });
  }
}
