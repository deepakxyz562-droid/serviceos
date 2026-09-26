import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export const dynamic = 'force-dynamic';

export interface PublicAgentConfig {
  id: string;
  slug: string;
  name: string;
  roleTitle: string;
  avatarUrl: string;
  statusText: string;
  brandColor: string;
  voiceTone: string;
  welcomeGreeting: string;
  greetingSubtitle?: string;
  quickActions: FormAgentData['quickActions'];
  navigation: FormAgentData['navigation'];
  connectedForms: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  channels: {
    chatbot: FormAgentData['channels']['chatbot'];
  };
  updatedAt: string;
}

/**
 * Sanitize full internal FormAgentData into a secure PublicAgentConfig.
 * Strips private system prompts, guardrails, notification emails, phone numbers, and credentials.
 */
function sanitizePublicAgent(agent: FormAgentData): PublicAgentConfig {
  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name || 'AI Assistant',
    roleTitle: agent.roleTitle || 'Customer Concierge',
    avatarUrl: agent.avatarUrl || '',
    statusText: agent.statusText || 'Online',
    brandColor: agent.brandColor || '#059669',
    voiceTone: agent.voiceTone || 'friendly',
    welcomeGreeting: agent.welcomeGreeting || 'Hello! How can I assist you today?',
    greetingSubtitle: agent.greetingSubtitle,
    quickActions: Array.isArray(agent.quickActions) ? agent.quickActions : [],
    navigation: agent.navigation || {
      chatEnabled: true,
      voiceEnabled: false,
      formsEnabled: true,
      historyEnabled: false,
      presentationEnabled: false,
      whatsappEnabled: false,
    },
    connectedForms: Array.isArray(agent.connectedForms)
      ? agent.connectedForms.map((f) => ({
          id: f.id,
          name: f.name || 'Form',
          description: f.description,
        }))
      : [],
    channels: {
      chatbot: agent.channels?.chatbot || {
        enabled: true,
        layoutMode: 'floating',
        position: 'right',
        layoutButtonToggle: true,
        sidebarBehavior: 'overlay',
        welcomeStyle: 'avatar',
        greetingToggle: true,
        placeholderMessage: 'Ask anything or complete a form...',
        aiGeneratedGreeting: true,
        popupDelaySeconds: 3,
        autoOpenOnPageLoad: false,
      },
    },
    updatedAt: agent.updatedAt || new Date().toISOString(),
  };
}

/**
 * GET /api/public/agents/[slugOrId]
 *
 * Public endpoint (no auth required) to fetch an AI agent by slug or ID.
 * Returns strictly sanitized PublicAgentConfig with CORS headers.
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
    let agent = await db.formAgent.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
      },
    });

    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found', fallback: sanitizePublicAgent({ ...DEFAULT_FORM_AGENT, id: slugOrId }) },
        { status: 404 },
      );
    }

    const config = (agent.configJson as Partial<FormAgentData>) || {};
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

    const publicConfig = sanitizePublicAgent(merged);

    return NextResponse.json(
      { agent: publicConfig },
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
      { error: 'Failed to load agent', fallback: sanitizePublicAgent({ ...DEFAULT_FORM_AGENT, id: slugOrId }) },
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
