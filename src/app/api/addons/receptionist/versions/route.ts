import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import {
  createAgentVersion,
  listVersions,
  getCurrentVersion,
} from '@/lib/ai-receptionist-service';

/**
 * GET /api/addons/receptionist/versions
 * ─────────────────────────────────────────────────────────────────────────
 * List all agent versions for the tenant's AI Receptionist.
 *
 * Query: ?current=true → returns only the current active version.
 *
 * Auth: any authenticated tenant user (read-only).
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get the receptionist
    const { getReceptionistForTenant } = await import('@/lib/ai-receptionist-service');
    const receptionist = await getReceptionistForTenant(user.tenantId);
    if (!receptionist) {
      return NextResponse.json({ error: 'AI Receptionist not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const currentOnly = searchParams.get('current') === 'true';

    if (currentOnly) {
      const current = await getCurrentVersion(user.tenantId, receptionist.id);
      return NextResponse.json({ version: current });
    }

    const versions = await listVersions(user.tenantId, receptionist.id);
    return NextResponse.json({ versions });
  } catch (error) {
    console.error('[GET /api/addons/receptionist/versions] error:', error);
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

/**
 * POST /api/addons/receptionist/versions
 * ─────────────────────────────────────────────────────────────────────────
 * Create a new agent version (DRAFT).
 *
 * Body: { systemPrompt?, voice?, model?, personality?, ..., copyFromVersionId? }
 *
 * If `copyFromVersionId` is provided, copies config from that version
 * (used for "edit current version" flow — the new version starts as a copy
 * of the existing version, then the tenant modifies it).
 *
 * Auth: owner only. The version is created in DRAFT status — it becomes
 * PUBLISHED only after successful deployment (Phase 5).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json({ error: 'Only owners can create agent versions' }, { status: 403 });
    }

    // Get the receptionist
    const { getReceptionistForTenant } = await import('@/lib/ai-receptionist-service');
    const receptionist = await getReceptionistForTenant(user.tenantId);
    if (!receptionist) {
      return NextResponse.json({ error: 'AI Receptionist not found' }, { status: 404 });
    }

    const body = await request.json();
    const version = await createAgentVersion({
      tenantId: user.tenantId,
      receptionistId: receptionist.id,
      systemPrompt: body.systemPrompt,
      voice: body.voice,
      voiceProvider: body.voiceProvider,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      greeting: body.greeting,
      personality: body.personality,
      responseStyle: body.responseStyle,
      maxDurationSeconds: body.maxDurationSeconds,
      silenceTimeoutSeconds: body.silenceTimeoutSeconds,
      knowledgeConfigSnapshot: body.knowledgeConfigSnapshot,
      createdBy: user.id,
      copyFromVersionId: body.copyFromVersionId,
    });

    return NextResponse.json({ version }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/addons/receptionist/versions] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create version' },
      { status: 500 },
    );
  }
}
