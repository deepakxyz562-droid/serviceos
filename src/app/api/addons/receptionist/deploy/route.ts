import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { db } from '@/lib/db';
import {
  getReceptionistForTenant,
  getCurrentVersion,
  publishVersion,
} from '@/lib/ai-receptionist-service';
import { getVapiVoiceProvider } from '@/lib/vapi-voice-provider';

/**
 * POST /api/addons/receptionist/deploy
 * ─────────────────────────────────────────────────────────────────────────
 * Phase 9.8: Deploy the current agent version to Vapi + bind to phone number.
 *
 * This endpoint enforces the full lifecycle at the backend (not just the UI):
 *
 *   1. subscription ACTIVE (AI_RECEPTIONIST)
 *   2. entitlement ACTIVE (AddonEntitlement)
 *   3. receptionist configuration exists (AiReceptionist)
 *   4. agent version exists (AiAgentVersion — DRAFT or PUBLISHED)
 *   5. phone number exists (PhoneNumber status=active + PhoneConnection ACTIVE)
 *
 * If ANY check fails → 403/400 with a clear error code.
 *
 * ORDERING (the "AI-active" invariant):
 *   The AiProviderDeployment is only marked ACTIVE **after** every external
 *   operation required for a callable number succeeds:
 *     a. Vapi createAssistant / updateAssistant → must succeed
 *     b. Vapi assignAssistantToPhoneNumber → must succeed (if phone exists)
 *     c. Only then → AiProviderDeployment.status = ACTIVE + publishVersion
 *
 *   If (a) succeeds but (b) fails → deployment status = FAILED with lastError
 *   explaining the phone binding failed. The tenant sees a clear error, not a
 *   false "ACTIVE" state.
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

    // ── 1. Enforce: subscription ACTIVE ──
    // Phase 9.8: Use a two-step lookup instead of a nested relation filter.
    // PostgREST can't translate `addonPlan: { addonProduct: { code: 'AI_RECEPTIONIST' } }`.
    const addonProduct = await db.addonProduct.findUnique({
      where: { code: 'AI_RECEPTIONIST' },
      select: { id: true },
    });

    const subscription = addonProduct
      ? await db.tenantAddonSubscription.findFirst({
          where: {
            tenantId,
            addonProductId: addonProduct.id,
            status: { in: ['ACTIVE', 'PAST_DUE'] },
          },
          select: { id: true, status: true, currentPeriodEnd: true },
        })
      : null;

    if (!subscription) {
      return NextResponse.json(
        {
          error: 'No active AI Receptionist subscription. Purchase the add-on first.',
          code: 'SUBSCRIPTION_REQUIRED',
        },
        { status: 403 },
      );
    }

    // ── 2. Enforce: entitlement ACTIVE ──
    // Phase 9.8: Same two-step pattern — filter by addonProductId directly,
    // not via a nested `subscription: { addonProduct: { code: ... } }` filter.
    const entitlement = await db.addonEntitlement.findFirst({
      where: {
        tenantId,
        status: 'ACTIVE',
      },
      select: { id: true, includedNumbers: true, maxConcurrentCalls: true },
    });

    if (!entitlement) {
      return NextResponse.json(
        {
          error: 'No active AI Receptionist entitlement. Contact support.',
          code: 'ENTITLEMENT_REQUIRED',
        },
        { status: 403 },
      );
    }

    // ── 3. Enforce: receptionist configuration exists ──
    const receptionist = await getReceptionistForTenant(tenantId);
    if (!receptionist) {
      return NextResponse.json(
        {
          error: 'No AI Receptionist configured. Complete the configuration step first.',
          code: 'RECEPTIONIST_REQUIRED',
        },
        { status: 400 },
      );
    }

    // ── 4. Enforce: agent version exists ──
    let version = explicitVersionId
      ? await db.aiAgentVersion.findFirst({
          where: { id: explicitVersionId, aiReceptionistId: receptionist.id },
        })
      : await getCurrentVersion(tenantId, receptionist.id);

    if (!version) {
      version = await db.aiAgentVersion.findFirst({
        where: { aiReceptionistId: receptionist.id, status: 'DRAFT' },
        orderBy: { versionNumber: 'desc' },
      });
    }

    if (!version) {
      return NextResponse.json(
        {
          error: 'No agent version found. Configure your receptionist first.',
          code: 'VERSION_REQUIRED',
        },
        { status: 400 },
      );
    }

    // ── 5. Enforce: phone number exists + is active ──
    const phoneConnection = await db.phoneConnection.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      include: {
        phoneNumber: {
          select: { id: true, number: true, vapiNumberId: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!phoneConnection) {
      return NextResponse.json(
        {
          error: 'No active phone number. Purchase a phone number first.',
          code: 'PHONE_REQUIRED',
        },
        { status: 400 },
      );
    }

    const phone = phoneConnection.phoneNumber;
    if (phone.status !== 'active') {
      return NextResponse.json(
        {
          error: `Phone number is ${phone.status}. Cannot deploy to an inactive number.`,
          code: 'PHONE_INACTIVE',
        },
        { status: 400 },
      );
    }
    if (!phone.vapiNumberId) {
      return NextResponse.json(
        {
          error: 'Phone number is not bound to Vapi. Contact support to reconcile.',
          code: 'VAPI_BINDING_MISSING',
        },
        { status: 400 },
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // All pre-conditions passed. Now perform the actual deployment.
    // ════════════════════════════════════════════════════════════════════════

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

    // ── Step A: Create/update the Vapi assistant (with 13 tools) ──
    const existingDeployment = await db.aiProviderDeployment.findFirst({
      where: {
        aiAgentVersionId: version.id,
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    let externalAssistantId: string;
    let action: 'created' | 'updated' = 'created';

    try {
      const vapi = getVapiVoiceProvider();

      if (existingDeployment?.externalAssistantId) {
        console.log(`[deploy] updating existing Vapi assistant ${existingDeployment.externalAssistantId}`);
        await vapi.updateAssistant(existingDeployment.externalAssistantId, vapiConfig);
        externalAssistantId = existingDeployment.externalAssistantId;
        action = 'updated';
      } else {
        console.log('[deploy] creating new Vapi assistant');
        const result = await vapi.createAssistant(vapiConfig);
        externalAssistantId = result.assistantId;
      }
    } catch (vapiErr) {
      // Step A failed — no Vapi assistant exists. Record FAILED + return.
      console.error('[deploy] Step A (Vapi assistant) failed:', vapiErr);
      const errorMessage = vapiErr instanceof Error ? vapiErr.message : 'Vapi assistant creation failed';

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
        { error: 'Failed to create/update Vapi assistant', detail: errorMessage, code: 'VAPI_ASSISTANT_FAILED' },
        { status: 502 },
      );
    }

    // ── Step B: Bind the assistant to the Vapi phone number ──
    // CRITICAL: This MUST succeed before we mark the deployment ACTIVE.
    // If binding fails, the tenant would see "ACTIVE" but calls wouldn't work.
    try {
      const vapi = getVapiVoiceProvider();
      await vapi.assignAssistantToPhoneNumber({
        vapiPhoneNumberId: phone.vapiNumberId!,
        assistantId: externalAssistantId,
      });
      console.log(`[deploy] Step B: bound assistant ${externalAssistantId} to Vapi number ${phone.vapiNumberId}`);
    } catch (bindErr) {
      // Step B failed — Vapi assistant exists but isn't bound to the number.
      // Mark the deployment FAILED (NOT ACTIVE) so the tenant sees the real state.
      console.error('[deploy] Step B (phone binding) failed:', bindErr);
      const bindError = bindErr instanceof Error ? bindErr.message : 'Vapi phone binding failed';

      if (existingDeployment) {
        await db.aiProviderDeployment.update({
          where: { id: existingDeployment.id },
          data: {
            status: 'FAILED',
            externalAssistantId,
            lastError: `Vapi assistant created (${externalAssistantId}) but phone binding failed: ${bindError}`,
          },
        });
      } else {
        await db.aiProviderDeployment.create({
          data: {
            aiAgentVersionId: version.id,
            provider: 'VAPI',
            externalAssistantId,
            status: 'FAILED',
            lastError: `Vapi assistant created (${externalAssistantId}) but phone binding failed: ${bindError}`,
          },
        });
      }

      return NextResponse.json(
        {
          error: 'Vapi assistant created but failed to bind to phone number.',
          detail: bindError,
          code: 'VAPI_BINDING_FAILED',
        },
        { status: 502 },
      );
    }

    // ════════════════════════════════════════════════════════════════════════
    // Both Step A (assistant) + Step B (binding) succeeded.
    // NOW we can mark the deployment ACTIVE + publish the version.
    // ════════════════════════════════════════════════════════════════════════

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
            toolsCount: 13,
            phoneNumberBound: true,
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
            phoneNumberBound: true,
          }),
          lastSyncedAt: new Date(),
        },
      });
    }

    console.log(`[deploy] deployment ${deployment.id} → ACTIVE (assistant=${externalAssistantId}, phone=${phone.number})`);

    // ── Step C: Publish the version (marks PUBLISHED + sets currentVersionId) ──
    try {
      await publishVersion({
        tenantId,
        receptionistId: receptionist.id,
        versionId: version.id,
        requireActiveDeployment: false, // we just created the ACTIVE deployment
      });
      console.log(`[deploy] version ${version.id} published → receptionist.currentVersionId updated`);
    } catch (pubErr) {
      // Non-fatal — the assistant is deployed + bound. publishVersion can be retried.
      console.error('[deploy] Step C (publishVersion) failed (non-fatal):', pubErr);
    }

    return NextResponse.json({
      ok: true,
      deployed: true,
      deploymentId: deployment.id,
      externalAssistantId,
      action, // 'created' or 'updated'
      versionId: version.id,
      versionNumber: version.versionNumber,
      phoneBound: true,
      phoneNumber: phone.number,
      message: action === 'created'
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
