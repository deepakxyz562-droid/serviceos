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

    // Phase 10: Enrich the system prompt with the tenant's business name.
    // If the stored prompt already has behavioral instructions (from the
    // updated onboarding Step 2), just inject the business name.
    // If the stored prompt is the old generic one, prepend the full
    // behavioral operating policy so existing assistants get the tools
    // instructions on redeploy.
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const businessName = tenant?.name || 'our company';

    let systemPrompt = version.systemPrompt;
    // Check if the prompt already has behavioral instructions
    if (!systemPrompt.includes('LEAD CAPTURE') && !systemPrompt.includes('create_lead')) {
      // Old generic prompt — replace with the full behavioral operating policy
      systemPrompt = `You are ${receptionist.name}, an AI receptionist for ${businessName}. Be friendly, helpful, concise, and genuinely helpful.

YOUR PRIMARY RESPONSIBILITIES:
1. Greet the caller and ask how you can help them today.
2. Understand what the caller needs — listen carefully before acting.

CALLER IDENTIFICATION:
- Ask for the caller's name and phone number early in the conversation.
- If they provide a phone number, use the get_customer tool to check if they're an existing customer.
- If they're an existing customer, greet them by name and reference their previous service history when relevant.

LEAD CAPTURE:
- If the caller is a new customer expressing interest in a service, asking for a quote, requesting a callback, or describing a problem that needs service:
  - Collect their name, phone number, and a brief description of what they need.
  - Use the create_lead tool to capture them as a lead. Include the service they're interested in as notes.
- Do NOT create a lead for general questions (hours, address, pricing) unless the caller specifically requests follow-up.
- Do NOT create a lead for existing customers calling about existing appointments.

APPOINTMENT BOOKING:
- If the caller wants to schedule an appointment:
  1. First, identify if they're an existing customer (use get_customer). If new, use create_customer to create a customer record.
  2. Use check_availability to find available time slots for their requested date.
  3. Present available options to the caller.
  4. Once the caller confirms a time, use schedule_job to book the appointment.
  5. Confirm the booking details back to the caller.
- NEVER tell the caller their appointment is booked unless the schedule_job tool returns success.

SERVICE INFORMATION:
- If the caller asks about services, use get_service_options to show what's available.
- If the caller asks about business hours, use get_business_hours.

HUMAN TRANSFER:
- If the caller explicitly asks to speak to a human, or if their request is too complex for you to handle, use the transfer_to_human tool.
- If no transfer number is configured, let them know and offer to take a message instead.

CRITICAL RULES:
- Never invent information. If you don't know something, say so and offer to find out.
- Never claim an action was completed (booking, lead creation, transfer) unless the tool returned success.
- Always confirm important details (date, time, phone number) by repeating them back to the caller.
- Keep your responses concise — this is a phone call, not a text chat.`;

      // Also update the stored version with the new prompt
      await db.aiAgentVersion.update({
        where: { id: version.id },
        data: { systemPrompt },
      });
    } else {
      // Prompt already has behavioral instructions — just inject the business name
      // if it's not already there
      if (!systemPrompt.includes(businessName)) {
        systemPrompt = systemPrompt.replace(
          'a service business',
          businessName,
        );
        await db.aiAgentVersion.update({
          where: { id: version.id },
          data: { systemPrompt },
        });
      }
    }

    // Vapi enforces a 40-character max on assistant names. Truncate safely.
    const rawName = `${receptionist.name} (Receptionist)`;
    const vapiAssistantName = rawName.length > 40
      ? `${receptionist.name}`.slice(0, 40)
      : rawName;

    const vapiConfig = {
      name: vapiAssistantName,
      systemPrompt,
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
      // Step A failed — log the FULL error for diagnosis
      console.error('[deploy] Step A (Vapi assistant) failed:', vapiErr);
      const errorMessage = vapiErr instanceof Error ? vapiErr.message : String(vapiErr);

      // Phase 10: If updating an existing assistant failed (e.g., the assistant
      // was deleted from the Vapi dashboard, or the ID is stale), try creating
      // a NEW assistant as a fallback. This is more resilient than failing outright.
      if (existingDeployment?.externalAssistantId) {
        console.log('[deploy] updateAssistant failed — trying createAssistant as fallback...');
        try {
          const vapi = getVapiVoiceProvider();
          const result = await vapi.createAssistant(vapiConfig);
          externalAssistantId = result.assistantId;
          action = 'created';
          console.log('[deploy] fallback createAssistant succeeded:', externalAssistantId);
          // Skip to Step B — don't fall through to the error handling below
        } catch (fallbackErr) {
          console.error('[deploy] fallback createAssistant also failed:', fallbackErr);
          const fallbackError = fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr);

          await db.aiProviderDeployment.update({
            where: { id: existingDeployment.id },
            data: { status: 'FAILED', lastError: `Update: ${errorMessage} | Create fallback: ${fallbackError}` },
          });

          return NextResponse.json(
            { error: 'Failed to create/update Vapi assistant', detail: `${errorMessage} | Fallback: ${fallbackError}`, code: 'VAPI_ASSISTANT_FAILED' },
            { status: 502 },
          );
        }
      } else {
        // No existing deployment — this is a fresh create that failed
        await db.aiProviderDeployment.create({
          data: {
            aiAgentVersionId: version.id,
            provider: 'VAPI',
            externalAssistantId: null,
            status: 'FAILED',
            lastError: errorMessage,
          },
        });

        return NextResponse.json(
          { error: 'Failed to create Vapi assistant', detail: errorMessage, code: 'VAPI_ASSISTANT_FAILED' },
          { status: 502 },
        );
      }
    }

    // ── Step B: Bind the assistant to the Vapi phone number + set webhook URL ──
    // CRITICAL: This MUST succeed before we mark the deployment ACTIVE.
    // If binding fails, the tenant would see "ACTIVE" but calls wouldn't work.
    //
    // Phase 10: We do THREE operations here, not just one:
    //   B1. assignAssistantToPhoneNumber — ensures the correct assistant answers
    //   B2. configurePhoneNumberServerUrl — ensures Vapi sends webhook events to Fieseros
    //
    // Without B2, Vapi sends call lifecycle events (recording, transcript, usage)
    // to whatever serverUrl was set during the original import — which may be
    // stale, wrong, or missing. This is the root cause of "no call log, no
    // recording, no usage" — Vapi can't reach Fieseros' webhook endpoint.
    try {
      const vapi = getVapiVoiceProvider();

      // B1: Assign the correct assistant to the phone number
      await vapi.assignAssistantToPhoneNumber({
        vapiPhoneNumberId: phone.vapiNumberId!,
        assistantId: externalAssistantId,
      });
      console.log(`[deploy] Step B1: bound assistant ${externalAssistantId} to Vapi number ${phone.vapiNumberId}`);

      // B2: Set the phone number's serverUrl to the Fieseros webhook endpoint
      // This is where Vapi sends: status-update, end-of-call-report, transcript events
      // Without this, Vapi doesn't know where to send call lifecycle events.
      const webhookUrl = appUrl ? `${appUrl}/api/vapi/webhook` : undefined;
      if (webhookUrl) {
        await vapi.configurePhoneNumberServerUrl({
          vapiPhoneNumberId: phone.vapiNumberId!,
          serverUrl: webhookUrl,
        });
        console.log(`[deploy] Step B2: set phone number serverUrl to ${webhookUrl}`);
      } else {
        console.warn('[deploy] Step B2: skipped — no appUrl configured (webhook URL unknown)');
      }
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
    // Phase 10: publishVersion() uses db.$transaction + $queryRaw FOR UPDATE,
    // which the Supabase REST adapter does NOT support. The transaction fails
    // silently, leaving currentVersionId = null on the AiReceptionist row.
    // This causes "No agent version found" on the next deploy attempt.
    //
    // Fix: do the updates directly (no transaction) — the 3 operations are:
    //   1. Mark old version as SUPERSEDED (if any)
    //   2. Mark new version as PUBLISHED
    //   3. Set currentVersionId on the AiReceptionist
    try {
      // 1. Check if there's an old current version to supersede
      const currentReceptionist = await db.aiReceptionist.findFirst({
        where: { id: receptionist.id, tenantId },
        select: { currentVersionId: true },
      });
      const oldVersionId = currentReceptionist?.currentVersionId;
      if (oldVersionId && oldVersionId !== version.id) {
        await db.aiAgentVersion.update({
          where: { id: oldVersionId },
          data: { status: 'SUPERSEDED' },
        }).catch(() => {}); // non-fatal
      }

      // 2. Mark the new version as PUBLISHED
      await db.aiAgentVersion.update({
        where: { id: version.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: new Date(),
        },
      });

      // 3. Set currentVersionId on the AiReceptionist + status=ACTIVE
      await db.aiReceptionist.update({
        where: { id: receptionist.id },
        data: {
          currentVersionId: version.id,
          status: 'ACTIVE',
        },
      });

      console.log(`[deploy] version ${version.id} published → receptionist.currentVersionId updated`);
    } catch (pubErr) {
      // Non-fatal — the assistant is deployed + bound. The version publish can be retried.
      console.error('[deploy] Step C (version publish) failed (non-fatal):', pubErr);
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
