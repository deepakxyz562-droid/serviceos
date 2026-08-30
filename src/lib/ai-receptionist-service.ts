/**
 * AiReceptionistService
 * =====================
 *
 * Manages the AI Receptionist domain: creating receptionists, versioning
 * agent configurations, and tracking provider deployments.
 *
 * ARCHITECTURE BOUNDARY (per Phase 4 directive):
 *   - Tenant configuration (AiReceptionist + AiAgentVersion) is COMPLETELY
 *     separate from platform credentials (AiProviderConfig).
 *   - The AiProviderDeployment links a specific AiAgentVersion to a provider
 *     (Vapi), but the API key lives in AiProviderConfig (platform-level).
 *   - Phase 4 does NOT implement actual Vapi API calls — that's Phase 5.
 *     Phase 4 only establishes the domain model + service contracts.
 *
 * VERSIONING FLOW:
 *   1. Tenant creates receptionist → AiReceptionist (DRAFT)
 *   2. Tenant configures agent → AiAgentVersion (DRAFT, version 1)
 *   3. Deploy (Phase 5) → AiProviderDeployment (PENDING → ACTIVE)
 *   4. Deploy succeeds → AiAgentVersion (PUBLISHED) + AiReceptionist (ACTIVE, currentVersionId = v1)
 *   5. Tenant edits → AiAgentVersion (DRAFT, version 2) → deploy → swap currentVersionId
 *   6. Rollback → AiReceptionist.currentVersionId = v1
 *
 * SECURITY: This service never reads or returns decrypted API keys.
 * Provider credentials are accessed only by the Phase 5 VapiVoiceProvider.
 */

import { db } from '@/lib/db';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AiReceptionistResult {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  currentVersionId: string | null;
  greeting: string | null;
  afterHoursGreeting: string | null;
  businessHoursMode: string;
  handoffEnabled: boolean;
  handoffTransferTarget: string | null;
  handoffFallbackMode: string;
  smsSendBackEnabled: boolean;
  smsSendBackTemplate: string | null;
  trustedPhonesJson: string;
  knownCallerGreetingTemplate: string | null;
  backgroundNoiseEnabled: boolean;
  responseDelaySeconds: number;
  knowledgeConfigJson: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiAgentVersionResult {
  id: string;
  aiReceptionistId: string;
  versionNumber: number;
  status: string;
  systemPrompt: string;
  voice: string;
  voiceProvider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  greeting: string | null;
  personality: string;
  responseStyle: string;
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
  knowledgeConfigSnapshot: string;
  publishedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface AiProviderDeploymentResult {
  id: string;
  aiAgentVersionId: string;
  provider: string;
  externalAssistantId: string | null;
  externalPhoneNumberId: string | null;
  status: string;
  deploymentConfigJson: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
}

// ─── Provider capability constants + runtime validators (Phase 4 hardening) ───

export const PROVIDER_CAPABILITIES = {
  VAPI: ['VOICE_RUNTIME', 'AI_ASSISTANT'],
  TWILIO: ['PHONE_NUMBERS', 'INBOUND_CALLS', 'OUTBOUND_CALLS', 'SMS'],
  TELNYX: ['PHONE_NUMBERS', 'TELEPHONY'],
  ELEVENLABS: ['VOICE_SYNTHESIS'],
} as const;

export type ProviderName = keyof typeof PROVIDER_CAPABILITIES;
export type ProviderCapability = (typeof PROVIDER_CAPABILITIES)[ProviderName][number];

// Valid status values (runtime validators — Phase 4 hardening #10)
const VALID_RECEPTIONIST_STATUSES = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'] as const;
const VALID_VERSION_STATUSES = ['DRAFT', 'PUBLISHED', 'SUPERSEDED', 'FAILED'] as const;
const VALID_DEPLOYMENT_STATUSES = ['PENDING', 'DEPLOYING', 'ACTIVE', 'FAILED', 'DISABLED'] as const;

function validateProvider(provider: string): asserts provider is ProviderName {
  if (!(provider in PROVIDER_CAPABILITIES)) {
    throw new Error(`Invalid provider: ${provider}. Valid: ${Object.keys(PROVIDER_CAPABILITIES).join(', ')}`);
  }
}

function validateDeploymentStatus(status: string): asserts status is typeof VALID_DEPLOYMENT_STATUSES[number] {
  if (!VALID_DEPLOYMENT_STATUSES.includes(status as never)) {
    throw new Error(`Invalid deployment status: ${status}. Valid: ${VALID_DEPLOYMENT_STATUSES.join(', ')}`);
  }
}

function validateReceptionistStatus(status: string): asserts status is typeof VALID_RECEPTIONIST_STATUSES[number] {
  if (!VALID_RECEPTIONIST_STATUSES.includes(status as never)) {
    throw new Error(`Invalid receptionist status: ${status}. Valid: ${VALID_RECEPTIONIST_STATUSES.join(', ')}`);
  }
}

// ─── Receptionist CRUD ─────────────────────────────────────────────────────

/**
 * Create a new AI Receptionist for a tenant.
 *
 * One receptionist per tenant per AddonProduct (enforced by the caller —
 * the caller should check `getReceptionistForTenant` first).
 *
 * The receptionist is created in DRAFT status — it becomes ACTIVE when
 * the first agent version is deployed (Phase 5).
 */
export async function createReceptionist(params: {
  tenantId: string;
  name?: string;
  greeting?: string;
  afterHoursGreeting?: string;
  handoffEnabled?: boolean;
  handoffTransferTarget?: string;
  handoffFallbackMode?: string;
  smsSendBackEnabled?: boolean;
  smsSendBackTemplate?: string;
  backgroundNoiseEnabled?: boolean;
  responseDelaySeconds?: number;
}): Promise<AiReceptionistResult> {
  const receptionist = await db.aiReceptionist.create({
    data: {
      tenantId: params.tenantId,
      name: params.name || 'Sarah',
      status: 'DRAFT',
      greeting: params.greeting || null,
      afterHoursGreeting: params.afterHoursGreeting || null,
      handoffEnabled: params.handoffEnabled ?? true,
      handoffTransferTarget: params.handoffTransferTarget || null,
      handoffFallbackMode: params.handoffFallbackMode || 'VOICEMAIL',
      smsSendBackEnabled: params.smsSendBackEnabled ?? false,
      smsSendBackTemplate: params.smsSendBackTemplate || null,
      backgroundNoiseEnabled: params.backgroundNoiseEnabled ?? false,
      responseDelaySeconds: params.responseDelaySeconds ?? 0,
    },
  });

  return serializeReceptionist(receptionist);
}

/**
 * Get the tenant's AI Receptionist.
 *
 * Returns the single receptionist for this tenant (or null if none exists).
 * If the tenant has multiple (shouldn't happen — enforced by caller), returns
 * the most recently created.
 */
export async function getReceptionistForTenant(
  tenantId: string,
): Promise<AiReceptionistResult | null> {
  const receptionist = await db.aiReceptionist.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
  });

  if (!receptionist) return null;
  return serializeReceptionist(receptionist);
}

/**
 * Update the receptionist's operational config (NOT the agent version).
 *
 * This updates fields like greeting, handoff policy, business hours — NOT
 * the system prompt, voice, or model (those require a new AiAgentVersion).
 */
export async function updateReceptionistConfig(params: {
  tenantId: string;
  receptionistId: string;
  name?: string;
  greeting?: string;
  afterHoursGreeting?: string;
  businessHoursMode?: string;
  customHoursJson?: string;
  handoffEnabled?: boolean;
  handoffTransferTarget?: string;
  handoffFallbackMode?: string;
  smsSendBackEnabled?: boolean;
  smsSendBackTemplate?: string;
  trustedPhonesJson?: string;
  knownCallerGreetingTemplate?: string;
  backgroundNoiseEnabled?: boolean;
  responseDelaySeconds?: number;
  knowledgeConfigJson?: string;
}): Promise<AiReceptionistResult> {
  const receptionist = await db.aiReceptionist.findFirst({
    where: { id: params.receptionistId, tenantId: params.tenantId },
  });

  if (!receptionist) {
    throw new Error('AI Receptionist not found or does not belong to this tenant');
  }

  // Build the update data — only update provided fields
  const updateData: Record<string, unknown> = {};
  if (params.name !== undefined) updateData.name = params.name;
  if (params.greeting !== undefined) updateData.greeting = params.greeting;
  if (params.afterHoursGreeting !== undefined) updateData.afterHoursGreeting = params.afterHoursGreeting;
  if (params.businessHoursMode !== undefined) updateData.businessHoursMode = params.businessHoursMode;
  if (params.customHoursJson !== undefined) updateData.customHoursJson = params.customHoursJson;
  if (params.handoffEnabled !== undefined) updateData.handoffEnabled = params.handoffEnabled;
  if (params.handoffTransferTarget !== undefined) updateData.handoffTransferTarget = params.handoffTransferTarget;
  if (params.handoffFallbackMode !== undefined) updateData.handoffFallbackMode = params.handoffFallbackMode;
  if (params.smsSendBackEnabled !== undefined) updateData.smsSendBackEnabled = params.smsSendBackEnabled;
  if (params.smsSendBackTemplate !== undefined) updateData.smsSendBackTemplate = params.smsSendBackTemplate;
  if (params.trustedPhonesJson !== undefined) updateData.trustedPhonesJson = params.trustedPhonesJson;
  if (params.knownCallerGreetingTemplate !== undefined) updateData.knownCallerGreetingTemplate = params.knownCallerGreetingTemplate;
  if (params.backgroundNoiseEnabled !== undefined) updateData.backgroundNoiseEnabled = params.backgroundNoiseEnabled;
  if (params.responseDelaySeconds !== undefined) updateData.responseDelaySeconds = params.responseDelaySeconds;
  if (params.knowledgeConfigJson !== undefined) updateData.knowledgeConfigJson = params.knowledgeConfigJson;

  const updated = await db.aiReceptionist.update({
    where: { id: receptionist.id },
    data: updateData,
  });

  return serializeReceptionist(updated);
}

/**
 * Pause/resume/archive the receptionist (status transitions).
 *
 * PAUSED: temporarily disabled (manual pause — NOT auto-called on subscription
 *         suspension; the AdmissionController handles AI availability).
 * ARCHIVED: subscription expired + grace passed. Data retained read-only.
 */
export async function updateReceptionistStatus(params: {
  tenantId: string;
  receptionistId: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}): Promise<AiReceptionistResult> {
  validateReceptionistStatus(params.status); // Phase 4 hardening #10

  const receptionist = await db.aiReceptionist.findFirst({
    where: { id: params.receptionistId, tenantId: params.tenantId },
  });

  if (!receptionist) {
    throw new Error('AI Receptionist not found or does not belong to this tenant');
  }

  const updated = await db.aiReceptionist.update({
    where: { id: receptionist.id },
    data: { status: params.status },
  });

  return serializeReceptionist(updated);
}

// ─── Agent Version management ───────────────────────────────────────────────

/**
 * Create a new agent version (DRAFT).
 *
 * Called when the tenant edits the agent configuration (prompt, voice, model,
 * personality, behavior). The new version starts in DRAFT status — it becomes
 * PUBLISHED only after successful deployment (Phase 5).
 *
 * The version number auto-increments per receptionist.
 *
 * If `copyFromVersionId` is provided, copies the config from an existing
 * version (used for "edit current version" flow).
 */
export async function createAgentVersion(params: {
  tenantId: string;
  receptionistId: string;
  systemPrompt?: string;
  voice?: string;
  voiceProvider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  greeting?: string;
  personality?: string;
  responseStyle?: string;
  maxDurationSeconds?: number;
  silenceTimeoutSeconds?: number;
  knowledgeConfigSnapshot?: string;
  createdBy?: string;
  copyFromVersionId?: string; // if set, copies config from this version
}): Promise<AiAgentVersionResult> {
  // Verify the receptionist belongs to this tenant
  const receptionist = await db.aiReceptionist.findFirst({
    where: { id: params.receptionistId, tenantId: params.tenantId },
  });

  if (!receptionist) {
    throw new Error('AI Receptionist not found or does not belong to this tenant');
  }

  // If copying from an existing version, load its config
  let baseConfig: Record<string, unknown> = {};
  if (params.copyFromVersionId) {
    const sourceVersion = await db.aiAgentVersion.findFirst({
      where: { id: params.copyFromVersionId, aiReceptionistId: params.receptionistId },
    });
    if (sourceVersion) {
      baseConfig = {
        systemPrompt: sourceVersion.systemPrompt,
        voice: sourceVersion.voice,
        voiceProvider: sourceVersion.voiceProvider,
        model: sourceVersion.model,
        temperature: sourceVersion.temperature,
        maxTokens: sourceVersion.maxTokens,
        greeting: sourceVersion.greeting,
        personality: sourceVersion.personality,
        responseStyle: sourceVersion.responseStyle,
        maxDurationSeconds: sourceVersion.maxDurationSeconds,
        silenceTimeoutSeconds: sourceVersion.silenceTimeoutSeconds,
        knowledgeConfigSnapshot: sourceVersion.knowledgeConfigSnapshot,
      };
    }
  }

  // Get the next version number (max + 1)
  const maxVersion = await db.aiAgentVersion.aggregate({
    where: { aiReceptionistId: params.receptionistId },
    _max: { versionNumber: true },
  });
  const nextVersionNumber = (maxVersion._max.versionNumber || 0) + 1;

  const version = await db.aiAgentVersion.create({
    data: {
      aiReceptionistId: params.receptionistId,
      versionNumber: nextVersionNumber,
      status: 'DRAFT',
      systemPrompt: params.systemPrompt ?? (baseConfig.systemPrompt as string) ?? '',
      voice: params.voice ?? (baseConfig.voice as string) ?? 'rachel',
      voiceProvider: params.voiceProvider ?? (baseConfig.voiceProvider as string) ?? 'elevenlabs',
      model: params.model ?? (baseConfig.model as string) ?? 'gpt-4o-mini',
      temperature: params.temperature ?? (baseConfig.temperature as number) ?? 0.7,
      maxTokens: params.maxTokens ?? (baseConfig.maxTokens as number) ?? 500,
      greeting: params.greeting ?? (baseConfig.greeting as string | null) ?? null,
      personality: params.personality ?? (baseConfig.personality as string) ?? 'professional',
      responseStyle: params.responseStyle ?? (baseConfig.responseStyle as string) ?? 'concise',
      maxDurationSeconds: params.maxDurationSeconds ?? (baseConfig.maxDurationSeconds as number) ?? 600,
      silenceTimeoutSeconds: params.silenceTimeoutSeconds ?? (baseConfig.silenceTimeoutSeconds as number) ?? 120,
      knowledgeConfigSnapshot: params.knowledgeConfigSnapshot ?? (baseConfig.knowledgeConfigSnapshot as string) ?? '{}',
      createdBy: params.createdBy || null,
    },
  });

  return serializeVersion(version);
}

/**
 * Get the current (active) agent version for a receptionist.
 *
 * Returns the version pointed to by `AiReceptionist.currentVersionId`,
 * or null if no version is published yet.
 */
export async function getCurrentVersion(
  tenantId: string,
  receptionistId: string,
): Promise<AiAgentVersionResult | null> {
  const receptionist = await db.aiReceptionist.findFirst({
    where: { id: receptionistId, tenantId },
    include: {
      currentVersion: true,
    },
  });

  if (!receptionist || !receptionist.currentVersion) return null;
  return serializeVersion(receptionist.currentVersion);
}

/**
 * List all versions for a receptionist (for version history UI).
 */
export async function listVersions(
  tenantId: string,
  receptionistId: string,
): Promise<AiAgentVersionResult[]> {
  const versions = await db.aiAgentVersion.findMany({
    where: {
      aiReceptionistId: receptionistId,
      receptionist: { tenantId },
    },
    orderBy: { versionNumber: 'desc' },
  });

  return versions.map(serializeVersion);
}

/**
 * Publish a version (mark it as the active version).
 *
 * Called by the Phase 5 VapiVoiceProvider after successful deployment.
 * Sets the version status to PUBLISHED + updates AiReceptionist.currentVersionId.
 *
 * Uses a transaction to atomically:
 *   1. Mark the old current version as SUPERSEDED
 *   2. Mark the new version as PUBLISHED
 *   3. Update AiReceptionist.currentVersionId
 *   4. If this is the first version, set AiReceptionist.status = ACTIVE
 */
export async function publishVersion(params: {
  tenantId: string;
  receptionistId: string;
  versionId: string;
  /** Phase 4 hardening #6: if true (default), requires an ACTIVE deployment
   * before switching currentVersionId. Set to false ONLY for the initial
   * publish of the very first version (where no deployment exists yet) or
   * for internal recovery flows. */
  requireActiveDeployment?: boolean;
}): Promise<{ ok: boolean; receptionistId: string; versionId: string }> {
  const requireDeployment = params.requireActiveDeployment ?? true;

  // Verify ownership
  const receptionist = await db.aiReceptionist.findFirst({
    where: { id: params.receptionistId, tenantId: params.tenantId },
  });

  if (!receptionist) {
    throw new Error('AI Receptionist not found or does not belong to this tenant');
  }

  const newVersion = await db.aiAgentVersion.findFirst({
    where: { id: params.versionId, aiReceptionistId: params.receptionistId },
  });

  if (!newVersion) {
    throw new Error('Agent version not found or does not belong to this receptionist');
  }

  // ── Phase 4 hardening #6: require ACTIVE deployment before publishing ──
  // Prevents switching currentVersionId to a version that has no working
  // Vapi assistant. This is the most important safety guard before Phase 5.
  if (requireDeployment && receptionist.currentVersionId) {
    // Only check if there's already a current version (skip on first publish)
    const activeDeployment = await db.aiProviderDeployment.findFirst({
      where: { aiAgentVersionId: newVersion.id, status: 'ACTIVE' },
    });
    if (!activeDeployment) {
      throw new Error(
        'Cannot publish a version without an ACTIVE deployment. Deploy to Vapi first, then publish.',
      );
    }
  }

  // ── Phase 4 hardening #3: atomic swap inside a transaction ──
  // Re-read the receptionist INSIDE the transaction to prevent the
  // concurrent-publish race (two publishes both reading the old
  // currentVersionId and both superseding it).
  await db.$transaction(async (tx) => {
    // Lock the receptionist row (PostgreSQL FOR UPDATE via raw query)
    // This serializes concurrent publishVersion calls for the same receptionist.
    await tx.$queryRaw`SELECT * FROM "AiReceptionist" WHERE id = ${receptionist.id} FOR UPDATE`;

    // Re-read currentVersionId (may have changed since the outer read)
    const currentReceptionist = await tx.aiReceptionist.findUnique({
      where: { id: receptionist.id },
      select: { currentVersionId: true },
    });

    // 1. Mark the old current version as SUPERSEDED (if any + if different from target)
    const oldVersionId = currentReceptionist?.currentVersionId;
    if (oldVersionId && oldVersionId !== newVersion.id) {
      await tx.aiAgentVersion.update({
        where: { id: oldVersionId },
        data: { status: 'SUPERSEDED' },
      });
    }

    // 2. Mark the new version as PUBLISHED
    await tx.aiAgentVersion.update({
      where: { id: newVersion.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // 3. Update AiReceptionist.currentVersionId + status
    const isFirstVersion = !oldVersionId;
    await tx.aiReceptionist.update({
      where: { id: receptionist.id },
      data: {
        currentVersionId: newVersion.id,
        status: isFirstVersion ? 'ACTIVE' : receptionist.status,
      },
    });
  });

  console.log(
    `[AiReceptionistService] published version ${newVersion.versionNumber} for receptionist ${receptionist.id}`,
  );

  return { ok: true, receptionistId: receptionist.id, versionId: newVersion.id };
}

/**
 * Rollback to a previous version.
 *
 * Sets the specified version as the current version + re-marks it as PUBLISHED.
 * The previously-active version is marked as SUPERSEDED.
 *
 * NOTE: This does NOT re-deploy to Vapi (Phase 5 will handle re-deployment
 * via AiProviderDeployment). It only swaps the `currentVersionId` pointer.
 * The Phase 5 deploy flow should detect the version change and re-deploy.
 */
export async function rollbackToVersion(params: {
  tenantId: string;
  receptionistId: string;
  versionId: string;
}): Promise<{ ok: boolean; receptionistId: string; versionId: string }> {
  // Use the same publishVersion logic (it handles the swap atomically)
  return publishVersion({
    tenantId: params.tenantId,
    receptionistId: params.receptionistId,
    versionId: params.versionId,
  });
}

// ─── Provider deployment tracking ────────────────────────────────────────────

/**
 * Create a provider deployment record for an agent version.
 *
 * Called by the Phase 5 VapiVoiceProvider BEFORE calling the Vapi API.
 * The deployment starts in PENDING status and transitions to:
 *   - DEPLOYING (while the Vapi API call is in flight)
 *   - ACTIVE (on success) — then publishVersion is called
 *   - FAILED (on failure) — previous version stays active
 *
 * Phase 4 only creates the record. Phase 5 implements the actual Vapi calls.
 */
export async function createProviderDeployment(params: {
  tenantId: string; // Phase 4 hardening #1: tenant ownership check
  agentVersionId: string;
  provider?: ProviderName;
  deploymentConfigJson?: string;
}): Promise<AiProviderDeploymentResult> {
  const provider = params.provider || 'VAPI';
  validateProvider(provider); // Phase 4 hardening #10

  // ── Phase 4 hardening #1: verify the agent version belongs to this tenant ──
  const agentVersion = await db.aiAgentVersion.findFirst({
    where: {
      id: params.agentVersionId,
      receptionist: { tenantId: params.tenantId },
    },
    select: { id: true, aiReceptionistId: true },
  });

  if (!agentVersion) {
    throw new Error('Agent version not found or does not belong to this tenant');
  }

  // ── Phase 4 hardening #7: verify provider has the required capabilities ──
  const requiredCapability = 'VOICE_RUNTIME';
  const providerConfig = await db.aiProviderConfig.findUnique({
    where: { provider },
    select: { status: true, capabilities: true },
  });

  if (!providerConfig) {
    throw new Error(
      `Provider ${provider} is not configured. Superadmin must add it in AI Provider Settings.`,
    );
  }

  if (providerConfig.status !== 'ACTIVE') {
    throw new Error(`Provider ${provider} is ${providerConfig.status} — cannot create deployment`);
  }

  const capabilities = providerConfig.capabilities
    ? providerConfig.capabilities.split(',').map((c) => c.trim())
    : [];

  if (!capabilities.includes(requiredCapability)) {
    throw new Error(
      `Provider ${provider} does not have the '${requiredCapability}' capability. ` +
        `Configured capabilities: ${capabilities.join(', ') || 'none'}`,
    );
  }

  const deployment = await db.aiProviderDeployment.create({
    data: {
      aiAgentVersionId: params.agentVersionId,
      provider,
      status: 'PENDING',
      deploymentConfigJson: params.deploymentConfigJson || '{}',
    },
  });

  return serializeDeployment(deployment);
}

/**
 * Update a provider deployment's status (Phase 5 VapiVoiceProvider calls this).
 */
export async function updateDeploymentStatus(params: {
  tenantId: string; // Phase 4 hardening #1: tenant ownership check
  deploymentId: string;
  status: 'PENDING' | 'DEPLOYING' | 'ACTIVE' | 'FAILED' | 'DISABLED';
  externalAssistantId?: string;
  externalPhoneNumberId?: string;
  lastError?: string;
}): Promise<AiProviderDeploymentResult> {
  validateDeploymentStatus(params.status); // Phase 4 hardening #10

  // ── Phase 4 hardening #1: verify the deployment belongs to this tenant ──
  const deployment = await db.aiProviderDeployment.findFirst({
    where: {
      id: params.deploymentId,
      agentVersion: { receptionist: { tenantId: params.tenantId } },
    },
    select: { id: true, aiAgentVersionId: true, provider: true },
  });

  if (!deployment) {
    throw new Error('Deployment not found or does not belong to this tenant');
  }

  const updateData: Record<string, unknown> = {
    status: params.status,
    lastSyncedAt: new Date(),
  };
  if (params.externalAssistantId !== undefined) updateData.externalAssistantId = params.externalAssistantId;
  if (params.externalPhoneNumberId !== undefined) updateData.externalPhoneNumberId = params.externalPhoneNumberId;
  if (params.lastError !== undefined) updateData.lastError = params.lastError;

  // ── Phase 4 hardening #8: demote prior ACTIVE deployment for same receptionist+provider ──
  // When a new deployment becomes ACTIVE, the previous ACTIVE deployment
  // for the same (receptionist, provider) pair must be set to DISABLED.
  // This ensures exactly one ACTIVE deployment per receptionist+provider.
  if (params.status === 'ACTIVE') {
    await db.$transaction(async (tx) => {
      // Demote any prior ACTIVE deployments for the same receptionist + provider
      await tx.aiProviderDeployment.updateMany({
        where: {
          provider: deployment.provider,
          status: 'ACTIVE',
          id: { not: deployment.id },
          agentVersion: {
            aiReceptionistId: {
              in: (
                await tx.aiAgentVersion.findMany({
                  where: { aiReceptionist: { tenantId: params.tenantId } },
                  select: { aiReceptionistId: true },
                  distinct: ['aiReceptionistId'],
                })
              ).map((v) => v.aiReceptionistId),
            },
          },
        },
        data: { status: 'DISABLED' },
      });

      // Update the target deployment
      const updated = await tx.aiProviderDeployment.update({
        where: { id: deployment.id },
        data: updateData,
      });
      return serializeDeployment(updated);
    }).then((result) => {
      return result;
    });
  }

  const updated = await db.aiProviderDeployment.update({
    where: { id: deployment.id },
    data: updateData,
  });

  return serializeDeployment(updated);
}

/**
 * Get the active deployment for an agent version.
 */
export async function getActiveDeployment(
  tenantId: string, // Phase 4 hardening #1: tenant ownership check
  agentVersionId: string,
): Promise<AiProviderDeploymentResult | null> {
  const deployment = await db.aiProviderDeployment.findFirst({
    where: {
      aiAgentVersionId: agentVersionId,
      status: 'ACTIVE',
      agentVersion: { receptionist: { tenantId } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return deployment ? serializeDeployment(deployment) : null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function serializeReceptionist(r: {
  id: string;
  tenantId: string;
  name: string;
  status: string;
  currentVersionId: string | null;
  greeting: string | null;
  afterHoursGreeting: string | null;
  businessHoursMode: string;
  handoffEnabled: boolean;
  handoffTransferTarget: string | null;
  handoffFallbackMode: string;
  smsSendBackEnabled: boolean;
  smsSendBackTemplate: string | null;
  trustedPhonesJson: string;
  knownCallerGreetingTemplate: string | null;
  backgroundNoiseEnabled: boolean;
  responseDelaySeconds: number;
  knowledgeConfigJson: string;
  createdAt: Date;
  updatedAt: Date;
}): AiReceptionistResult {
  return {
    id: r.id,
    tenantId: r.tenantId,
    name: r.name,
    status: r.status,
    currentVersionId: r.currentVersionId,
    greeting: r.greeting,
    afterHoursGreeting: r.afterHoursGreeting,
    businessHoursMode: r.businessHoursMode,
    handoffEnabled: r.handoffEnabled,
    handoffTransferTarget: r.handoffTransferTarget,
    handoffFallbackMode: r.handoffFallbackMode,
    smsSendBackEnabled: r.smsSendBackEnabled,
    smsSendBackTemplate: r.smsSendBackTemplate,
    trustedPhonesJson: r.trustedPhonesJson,
    knownCallerGreetingTemplate: r.knownCallerGreetingTemplate,
    backgroundNoiseEnabled: r.backgroundNoiseEnabled,
    responseDelaySeconds: r.responseDelaySeconds,
    knowledgeConfigJson: r.knowledgeConfigJson,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

function serializeVersion(v: {
  id: string;
  aiReceptionistId: string;
  versionNumber: number;
  status: string;
  systemPrompt: string;
  voice: string;
  voiceProvider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  greeting: string | null;
  personality: string;
  responseStyle: string;
  maxDurationSeconds: number;
  silenceTimeoutSeconds: number;
  knowledgeConfigSnapshot: string;
  publishedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}): AiAgentVersionResult {
  return {
    id: v.id,
    aiReceptionistId: v.aiReceptionistId,
    versionNumber: v.versionNumber,
    status: v.status,
    systemPrompt: v.systemPrompt,
    voice: v.voice,
    voiceProvider: v.voiceProvider,
    model: v.model,
    temperature: v.temperature,
    maxTokens: v.maxTokens,
    greeting: v.greeting,
    personality: v.personality,
    responseStyle: v.responseStyle,
    maxDurationSeconds: v.maxDurationSeconds,
    silenceTimeoutSeconds: v.silenceTimeoutSeconds,
    knowledgeConfigSnapshot: v.knowledgeConfigSnapshot,
    publishedAt: v.publishedAt,
    createdBy: v.createdBy,
    createdAt: v.createdAt,
  };
}

function serializeDeployment(d: {
  id: string;
  aiAgentVersionId: string;
  provider: string;
  externalAssistantId: string | null;
  externalPhoneNumberId: string | null;
  status: string;
  deploymentConfigJson: string;
  lastSyncedAt: Date | null;
  lastError: string | null;
}): AiProviderDeploymentResult {
  return {
    id: d.id,
    aiAgentVersionId: d.aiAgentVersionId,
    provider: d.provider,
    externalAssistantId: d.externalAssistantId,
    externalPhoneNumberId: d.externalPhoneNumberId,
    status: d.status,
    deploymentConfigJson: d.deploymentConfigJson,
    lastSyncedAt: d.lastSyncedAt,
    lastError: d.lastError,
  };
}
