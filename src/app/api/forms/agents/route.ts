import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { DEFAULT_FORM_AGENT, FormAgentData } from '@/features/forms/types/agent-types';

// In-memory agent store fallback for rapid standalone performance
const inMemoryAgents = new Map<string, FormAgentData>();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get('id');

    if (agentId) {
      const agent = inMemoryAgents.get(agentId) || {
        ...DEFAULT_FORM_AGENT,
        id: agentId,
      };
      return NextResponse.json({ agent });
    }

    // List all agents
    const list = Array.from(inMemoryAgents.values());
    if (list.length === 0) {
      list.push(DEFAULT_FORM_AGENT);
      inMemoryAgents.set(DEFAULT_FORM_AGENT.id, DEFAULT_FORM_AGENT);
    }

    return NextResponse.json({ agents: list });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch form agents', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => ({}))) as FormAgentData;

    if (!body.name) {
      return NextResponse.json({ error: 'Agent name is required' }, { status: 400 });
    }

    const agentId = body.id || `agent_${Date.now()}`;
    const updatedAgent: FormAgentData = {
      ...DEFAULT_FORM_AGENT,
      ...body,
      id: agentId,
      updatedAt: new Date().toISOString(),
    };

    inMemoryAgents.set(agentId, updatedAgent);

    return NextResponse.json({
      success: true,
      agent: updatedAgent,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save form agent', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
