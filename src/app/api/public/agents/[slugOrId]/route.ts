import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

export const dynamic = 'force-dynamic';

function toIsoString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'string') return val;
  try {
    return new Date(val as any).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

function parseConfigJson(raw: unknown): Partial<FormAgentData> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Partial<FormAgentData>;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

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
  style?: FormAgentData['style'];
  settings?: {
    fileUploadEnabled?: boolean;
    allowScreenSharing?: boolean;
    memoryEnabled?: boolean;
  };
  connectedForms: Array<{
    id: string;
    name: string;
    description?: string | null;
  }>;
  channels: {
    chatbot: FormAgentData['channels']['chatbot'];
    standalone?: { enabled: boolean; slug?: string };
    voice?: { enabled: boolean };
  };
  updatedAt: string;
}

/**
 * Sanitize full internal FormAgentData into a secure PublicAgentConfig.
 * Strips private system prompts, guardrails, notification emails, phone numbers, and credentials.
 */
function sanitizePublicAgent(agent: FormAgentData): PublicAgentConfig {
  const effectiveAvatar = agent.avatarUrl || (agent.style as any)?.avatarUrl || DEFAULT_FORM_AGENT.avatarUrl;
  const effectiveBrandColor = agent.brandColor || (agent.style as any)?.letterColor || (agent.style as any)?.primaryColor || DEFAULT_FORM_AGENT.brandColor;
  const mergedStyle = {
    ...DEFAULT_FORM_AGENT.style,
    ...(agent.style || {}),
  };

  return {
    id: agent.id,
    slug: agent.slug,
    name: agent.name || 'AI Assistant',
    roleTitle: agent.roleTitle || 'Customer Concierge',
    avatarUrl: effectiveAvatar,
    statusText: agent.statusText || 'Online',
    brandColor: effectiveBrandColor,
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
    style: mergedStyle,
    settings: {
      fileUploadEnabled: agent.settings?.fileUploadEnabled ?? true,
      allowScreenSharing: agent.settings?.allowScreenSharing ?? false,
      memoryEnabled: agent.settings?.memoryEnabled ?? true,
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
        showButtons: true,
        primaryColor: effectiveBrandColor,
        greetingBubble: `👋 Need help? Chat with ${agent.name || 'our AI Assistant'}!`,
      },
      standalone: agent.channels?.standalone || { enabled: true },
      voice: agent.channels?.voice || { enabled: true },
    } as any,
    updatedAt: toIsoString(agent.updatedAt),
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
      // Check if slugOrId refers to a Form with agentConfig
      const form = await db.form.findFirst({
        where: {
          OR: [{ slug: slugOrId }, { id: slugOrId }],
        },
      });

      if (form) {
        let formAgentConfig: Partial<FormAgentData> = {};
        try {
          const parsed = typeof form.schemaJson === 'string' ? JSON.parse(form.schemaJson) : form.schemaJson;
          if (parsed && typeof parsed === 'object' && parsed.agentConfig) {
            formAgentConfig = parsed.agentConfig;
          }
        } catch {
          // ignore
        }

        const mergedFromForm: FormAgentData = {
          ...DEFAULT_FORM_AGENT,
          name: form.title ? `${form.title} Assistant` : DEFAULT_FORM_AGENT.name,
          ...formAgentConfig,
          id: form.id,
          slug: form.slug,
          tenantId: form.tenantId || undefined,
          connectedForms: [
            {
              id: form.id,
              name: form.title,
              description: form.description || undefined,
            },
          ],
          updatedAt: toIsoString(form.updatedAt),
        };

        const publicConfig = sanitizePublicAgent(mergedFromForm);
        return NextResponse.json(
          { agent: publicConfig },
          {
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          },
        );
      }

      return NextResponse.json(
        { error: 'Agent not found', fallback: sanitizePublicAgent({ ...DEFAULT_FORM_AGENT, id: slugOrId }) },
        { status: 404 },
      );
    }

    const config = parseConfigJson(agent.configJson);
    const effectiveAvatar = config.avatarUrl || (config.style as any)?.avatarUrl || agent.avatarUrl || DEFAULT_FORM_AGENT.avatarUrl;
    const effectiveBrandColor = config.brandColor || (config.style as any)?.letterColor || (config.style as any)?.primaryColor || agent.brandColor || DEFAULT_FORM_AGENT.brandColor;
    const merged: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      ...config,
      id: agent.id,
      tenantId: agent.tenantId || undefined,
      slug: agent.slug,
      name: agent.name || config.name || DEFAULT_FORM_AGENT.name,
      roleTitle: agent.roleTitle || config.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
      avatarUrl: effectiveAvatar,
      statusText: agent.statusText || config.statusText || 'Online',
      brandColor: effectiveBrandColor,
      voiceTone: (agent.voiceTone || config.voiceTone || 'friendly') as FormAgentData['voiceTone'],
      welcomeGreeting: agent.welcomeGreeting || config.welcomeGreeting || DEFAULT_FORM_AGENT.welcomeGreeting,
      greetingSubtitle: agent.greetingSubtitle || config.greetingSubtitle || undefined,
      style: {
        ...DEFAULT_FORM_AGENT.style,
        ...(config.style || (agent as any).style || {}),
      },
      updatedAt: toIsoString(agent.updatedAt),
    };

    const publicConfig = sanitizePublicAgent(merged);

    return NextResponse.json(
      { agent: publicConfig },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
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
