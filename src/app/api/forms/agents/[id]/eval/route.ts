import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';
import { runEvaluation, DEFAULT_EVAL_DATASET } from '@/lib/agent-evaluation';
import { buildSystemPrompt, DEFAULT_AGENT_DEFINITION } from '@/lib/agent-definition';

function parseConfigJson(raw: unknown): Partial<FormAgentData> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Partial<FormAgentData>;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return {}; }
  }
  return {};
}

/**
 * GET /api/forms/agents/[id]/eval
 * Runs the default evaluation dataset against the agent's current configuration.
 * Returns PASS/FAIL per case + aggregate metrics.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const agent = await db.formAgent.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        ...(user.isSuperAdmin ? {} : user.tenantId ? { tenantId: user.tenantId } : {}),
      },
    });

    if (!agent) return NextResponse.json({ error: 'Agent not found' }, { status: 404 });

    const config = parseConfigJson(agent.configJson);
    const merged: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      ...config,
      id: agent.id,
      tenantId: agent.tenantId || undefined,
      name: agent.name || config.name || DEFAULT_FORM_AGENT.name,
      roleTitle: agent.roleTitle || config.roleTitle || DEFAULT_FORM_AGENT.roleTitle,
    };

    // Build system prompt from agent config
    const businessContext = merged.knowledge?.systemPrompt || '';
    const systemPrompt = buildSystemPrompt(DEFAULT_AGENT_DEFINITION, businessContext);

    // Run evaluation
    const result = await runEvaluation(DEFAULT_EVAL_DATASET, {
      systemPrompt,
      tenantId: merged.tenantId || null,
      agentId: merged.id,
    });

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('[agent-eval] Error:', error);
    return NextResponse.json(
      { error: 'Evaluation failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
