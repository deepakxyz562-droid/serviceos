import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getReceptionistForTenant,
  getCurrentVersion,
  createAgentVersion,
  publishVersion,
} from '@/lib/ai-receptionist-service';
import { getVapiVoiceProvider } from '@/lib/vapi-voice-provider';

/**
 * POST /api/addons/receptionist/deploy
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 9.8: Deploy the current agent version to Vapi.
 *
 * This is the CRITICAL step that was missing. The onboarding wizard creates
 * a DRAFT agent version (Step 2), but nothing actually deploys it to Vapi.
 * Without deployment, the Vapi assistant doesn't exist — so the tools array
 * (Phase 9.8 fix) never reaches Vapi, and the AI can't answer calls.
 *
 * Flow:
 *   1. Get the receptionist + current version
 *   2. If no version exists, error (Step 2 must be done first)
 *   3. Check if an ACTIVE deployment already exists:
 *      a. YES → updateAssistant on Vapi (PATCH — refreshes tools, prompt, etc.)
 *      b. NO  → createAssistant on Vapi (POST — creates the assistant)
 *   4. Create/update the AiProviderDeployment record
 *   5. publishVersion (marks version PUBLISHED + sets currentVersionId)
 *   6. If a phone number exists, assign the assistant to the Vapi phone number
 *   7. Return the deployment result
 *
 * Auth: owner only.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can deploy the AI Receptionist' },
        { status: 403 },
      );
    }

    const tenantId = user.tenantId;
    const body = await request.json().catch(() => ({}));
    const { versionId: explicitVersionId } = body as { versionId?: string };

    // ── 1. Get the receptionist + version ──
    const receptionist = await getReceptionistForTenant(tenantId);
    if (!receptionist) {
      return NextResponse.json(
        { error: 'No AI Receptionist configured. Complete Step 2 first.' },
        { status: 400 },
      );
    }

    // Resolve the version to deploy
    let version = explicitVersionId
      ? await db.aiAgentVersion.findFirst({
          where: { id: explicitVersionId, aiReceptionistId: receptionist.id },
        })
      : await getCurrentVersion(tenantId, receptionist.id);

    // If no current version, try to get the latest DRAFT
    if (!version) {
      version = await db.aiAgentVersion.findFirst({
        where: { aiReceptionistId: receptionist.id, status: 'DRAFT' },
        orderBy: { versionNumber: 'desc' },
      });
    }

    if (!version) {
      return NextResponse.json(
        { error: 'No agent version found. Configure your receptionist first (Step 2).' },
        { status: 400 },
      );
    }

    // ── 2. Build the Vapi assistant config from the version + receptionist ──
    const appUrl = getAppUrl();
    const serverUrl = appUrl ? `${appUrl}/api/vapi/function-call` : undefined;
    const webhookUrl = appUrl ? `${appUrl}/api/vapi/webhook` : undefined;

    const vapiConfig = {
      name: `${receptionist.name} (Receptionist)`,
      systemPrompt: version.systemPrompt,
      voice: version.voice,
      model: version.model,
      temperature: version.temperature,
      maxTokens: version.maxTokens,
      greeting: version.greeting || receptionist.greeting || 'Hi, thanks for calling! How can I help you today?',
      maxDurationSeconds: version.maxDurationSeconds,
      silenceTimeoutSeconds: version.silenceTimeoutSeconds,
      serverUrl,
      webhookUrl,
    };

    // ── 3. Check for existing ACTIVE deployment ──
    const existingDeployment = await db.aiProviderDeployment.findFirst({
      where: {
        aiAgentVersionId: version.id,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    let externalAssistantId: string;
    let deploymentStatus: 'created' | 'updated' = 'created';

    try {
      const vapi = getVapiVoiceProvider();

      if (existingDeployment?.externalAssistantId) {
        // ── 3a. Update existing assistant (refresh tools + prompt) ──
        console.log(`[deploy] updating existing Vapi assistant ${existingDeployment.externalAssistantId}`);
        await vapi.updateAssistant(existingDeployment.externalAssistantId, vapiConfig);
        externalAssistantId = existingDeployment.externalAssistantId;
        deploymentStatus = 'updated';
      } else {
        // ── 3b. Create new assistant ──
        console.log('[deploy] creating new Vapi assistant');
        const result = await vapi.createAssistant(vapiConfig);
        externalAssistantId = result.assistantId;
      }
    } catch (vapiErr) {
      // Vapi deployment failed — mark deployment FAILED + return error
      console.error('[deploy] Vapi assistant deployment failed:', vapiErr);
      const errorMessage = vapiErr instanceof Error ? vapiErr.message : 'Vapi deployment failed';

      // Record the failed attempt (if no existing deployment)
      if (!existingDeployment) {
        await db.aiProviderDeployment.create({
          data: {
            aiAgentVersionId: version.id,
            provider: 'VAPI',
            externalAssistantId: null,
            status: 'FAILED',
            lastError: errorMessage,
          },
        });
      } else {
        await db.aiProviderDeployment.update({
          where: { id: existingDeployment.id },
          data: { status: 'FAILED', lastError: errorMessage },
        });
      }

      return NextResponse.json(
        { error: 'Failed to deploy to Vapi', detail: errorMessage },
        { status: 502 },
      );
    }

    // ── 4. Upsert the AiProviderDeployment record ──
    let deployment;
    if (existingDeployment) {
      deployment = await db.aiProviderDeployment.update({
        where: { id: existingDeployment.id },
        data: {
          status: 'ACTIVE',
          externalAssistantId,
          lastSyncedAt: new Date(),
          lastError: null,
          deploymentConfigJson: JSON.stringify({
            model: vapiConfig.model,
            voice: vapiConfig.voice,
            serverUrl: vapiConfig.serverUrl,
            webhookUrl: vapiConfig.webhookUrl,
            toolsCount: 13, // Phase 9.8: 13 non-restricted tools
          }),
        },
      });
    } else {
      deployment = await db.aiProviderDeployment.create({
        data: {
          aiAgentVersionId: version.id,
          provider: 'VAPI',
          externalAssistantId,
          status: 'ACTIVE',
          deploymentConfigJson: JSON.stringify({
            model: vapiConfig.model,
            voice: vapiConfig.voice,
            serverUrl: vapiConfig.serverUrl,
            webhookUrl: vapiConfig.webhookUrl,
            toolsCount: 13,
          }),
          lastSyncedAt: new Date(),
        },
      });
    }

    console.log(`[deploy] Vapi assistant ${deploymentStatus} (id=${externalAssistantId}), deployment ${deployment.id} ACTIVE`);

    // ── 5. Publish the version (marks PUBLISHED + sets currentVersionId) ──
    try {
      await publishVersion({
        tenantId,
        receptionistId: receptionist.id,
        versionId: version.id,
        requireActiveDeployment: false, // we just created the deployment above
      });
      console.log(`[deploy] version ${version.id} published → receptionist.currentVersionId updated`);
    } catch (pubErr) {
      // publishVersion failed — the deployment exists but the version isn't marked published.
      // This is recoverable — the assistant is live on Vapi, just not flagged as current.
      console.error('[deploy] publishVersion failed (non-fatal — assistant is deployed):', pubErr);
    }

    // ── 6. Assign the assistant to the Vapi phone number (if a number exists) ──
    let phoneBound = false;
    const phoneConnection = await db.phoneConnection.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        phoneNumber: {
          select: { id: true, number: true, vapiNumberId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (phoneConnection?.phoneNumber?.vapiNumberId && phoneConnection.phoneNumber.status === 'active') {
      try {
        const vapi = getVapiVoiceProvider();
        await vapi.assignAssistantToPhoneNumber({
          vapiPhoneNumberId: phoneConnection.phoneNumber.vapiNumberId,
          assistantId: externalAssistantId,
        });
        phoneBound = true;
        console.log(`[deploy] assigned assistant ${externalAssistantId} to Vapi number ${phoneConnection.phoneNumber.vapiNumberId}`);
      } catch (bindErr) {
        // Non-fatal — the assistant is deployed, just not bound to the number yet.
        console.error('[deploy] phone binding failed (non-fatal):', bindErr);
      }
    }

    // ── 7. Return the result ──
    return NextResponse.json({
      ok: true,
      deployed: true,
      deploymentId: deployment.id,
      externalAssistantId,
      action: deploymentStatus, // 'created' or 'updated'
      versionId: version.id,
      versionNumber: version.versionNumber,
      phoneBound,
      phoneNumber: phoneConnection?.phoneNumber?.number || null,
      message: deploymentStatus === 'created'
        ? 'AI Receptionist deployed to Vapi successfully.'
        : 'AI Receptionist updated on Vapi (tools + prompt refreshed).',
    });
  } catch (error) {
    console.error('[POST /api/addons/receptionist/deploy] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to deploy AI Receptionist' },
      { status: 500 },
    );
  }
}
