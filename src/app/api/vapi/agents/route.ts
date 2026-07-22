import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  listAssistants as vapiListAssistants,
  createAssistant as vapiCreateAssistant,
  updateAssistant as vapiUpdateAssistant,
  deleteAssistant as vapiDeleteAssistant,
} from '@/lib/vapi-client';
import { getFunctionCallServerUrl } from '@/lib/vapi-functions';

// ─── Helper: feature-flag gate (ai_receptionist is free for all, but
// superadmin can hide it from subscribers) ─────────────────────────────────
async function isFeatureVisible(tenantId: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { tenantId_featureKey: { tenantId, featureKey: 'ai_receptionist' } },
    select: { enabled: true },
  });
  // Default: visible (free for all). Only hidden if explicitly disabled by superadmin.
  return flag?.enabled ?? true;
}

// GET — list agents (merged with Vapi data)
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isFeatureVisible(auth.tenantId))) {
      return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
    }

    const localAgents = await db.aiAgent.findMany({
      where: { tenantId: auth.tenantId },
      include: { phoneNumbers: true, _count: { select: { calls: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Try to enrich with live Vapi data (best-effort)
    let vapiAssistants: any[] = [];
    try {
      const vapiData = await vapiListAssistants();
      vapiAssistants = Array.isArray(vapiData) ? vapiData : [];
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === 'VAPI_NOT_CONFIGURED') {
        // Return local-only with a "not_configured" hint
      }
      // Other errors: still return local data
    }

    const merged = localAgents.map((agent) => {
      const vapi = vapiAssistants.find((v) => v.id === agent.vapiAssistantId);
      return {
        ...agent,
        config: JSON.parse(agent.configJson || '{}'),
        vapi,
        callsCount: agent._count.calls,
      };
    });

    return NextResponse.json({ agents: merged, vapiConfigured: vapiAssistants.length > 0 || localAgents.some(a => a.vapiAssistantId) });
  } catch (error) {
    console.error('[Vapi Agents GET]', error);
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 });
  }
}

// POST — create a new agent (locally + on Vapi)
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isFeatureVisible(auth.tenantId))) {
      return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
    }
    const body = await request.json();
    const { name, description, config } = body as {
      name: string;
      description?: string;
      config?: Record<string, unknown>;
    };

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    const cfg = config || {};
    // Build Vapi assistant payload
    const vapiPayload: Record<string, unknown> = {
      name,
      transcriber: cfg.transcriber || { provider: 'deepgram', model: 'nova-2', language: 'en-US' },
      model: cfg.model || {
        provider: 'openai',
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content: cfg.systemPrompt || 'You are a professional AI receptionist. Be friendly, concise, and helpful.',
          },
        ],
      },
      voice: cfg.voice || { provider: 'elevenlabs', voiceId: 'Rachel' },
      firstMessage: cfg.firstMessage || cfg.greeting || `Hello! Thanks for calling ${name}. How can I help you today?`,
      endCallMessage: cfg.endCallMessage || 'Thank you for calling. Have a great day!',
      silenceTimeoutSeconds: cfg.silenceTimeoutSeconds ?? 30,
      maxDurationSeconds: cfg.maxDurationSeconds ?? 600,
      // Server URL for function calling → our bridge
      serverUrl: getFunctionCallServerUrl(),
    };

    let vapiAssistantId: string | null = null;
    let vapiError: string | null = null;
    try {
      const created = await vapiCreateAssistant(vapiPayload as any);
      vapiAssistantId = created?.id || null;
    } catch (e) {
      vapiError = (e as Error).message;
      const code = (e as Error & { code?: string }).code;
      if (code === 'VAPI_NOT_CONFIGURED') {
        return NextResponse.json({
          error: 'Vapi API key not configured. Add your key in Settings → AI Voice.',
        }, { status: 400 });
      }
    }

    const agent = await db.aiAgent.create({
      data: {
        tenantId: auth.tenantId,
        vapiAssistantId,
        name,
        description: description || null,
        configJson: JSON.stringify(cfg),
        status: vapiAssistantId ? 'active' : 'draft',
        active: !!vapiAssistantId,
      },
    });

    return NextResponse.json({
      agent: { ...agent, config: cfg },
      vapiError,
    });
  } catch (error) {
    console.error('[Vapi Agents POST]', error);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

// PATCH — update an agent
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json();
    const { id, name, description, config, active } = body as {
      id: string;
      name?: string;
      description?: string;
      config?: Record<string, unknown>;
      active?: boolean;
    };

    const existing = await db.aiAgent.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Update Vapi if assistant exists there
    if (existing.vapiAssistantId) {
      try {
        const vapiUpdate: Record<string, unknown> = {};
        if (name) vapiUpdate.name = name;
        if (config) {
          if (config.systemPrompt) {
            vapiUpdate.model = {
              provider: config.modelProvider || 'openai',
              model: config.modelName || 'gpt-4o-mini',
              temperature: config.temperature ?? 0.4,
              messages: [{ role: 'system', content: config.systemPrompt }],
            };
          }
          if (config.firstMessage) vapiUpdate.firstMessage = config.firstMessage;
          if (config.endCallMessage) vapiUpdate.endCallMessage = config.endCallMessage;
          if (config.voiceId) {
            vapiUpdate.voice = { provider: config.voiceProvider || 'elevenlabs', voiceId: config.voiceId };
          }
        }
        await vapiUpdateAssistant(existing.vapiAssistantId, vapiUpdate as any);
      } catch (e) {
        console.error('[Vapi Agents PATCH] Vapi update failed:', e);
      }
    }

    const updated = await db.aiAgent.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(config && { configJson: JSON.stringify(config) }),
        ...(active !== undefined && { active, status: active ? 'active' : 'paused' }),
      },
    });

    return NextResponse.json({ agent: { ...updated, config: JSON.parse(updated.configJson || '{}') } });
  } catch (error) {
    console.error('[Vapi Agents PATCH]', error);
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 });
  }
}

// DELETE — delete an agent (and on Vapi)
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Agent ID required' }, { status: 400 });
    }

    const existing = await db.aiAgent.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    // Delete on Vapi (best-effort)
    if (existing.vapiAssistantId) {
      try {
        await vapiDeleteAssistant(existing.vapiAssistantId);
      } catch (e) {
        console.error('[Vapi Agents DELETE] Vapi delete failed:', e);
      }
    }

    // Unlink phone numbers before deleting
    await db.aiPhoneNumber.updateMany({
      where: { assistantId: id },
      data: { assistantId: null, vapiAssistantId: null },
    });

    await db.aiAgent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vapi Agents DELETE]', error);
    return NextResponse.json({ error: 'Failed to delete agent' }, { status: 500 });
  }
}
