import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { maskedConfigFromString, encodeProviderConfig } from '@/lib/email-providers';
import { resolveFallbackTenantId } from '@/lib/tenant-resolver';

/**
 * GET /api/superadmin/providers/email-providers
 * List all platform-level EmailProviders (isPlatform=true) for super admin.
 * Query params:
 *   - status: 'active' | 'paused' | 'error'
 *   - providerType: filter by provider type
 */
export async function GET(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const providerType = searchParams.get('providerType');
    const showAll = searchParams.get('showAll') === 'true';

    const where: Record<string, unknown> = {};
    if (!showAll) {
      where.isPlatform = true;
    }
    if (status && ['active', 'paused', 'error'].includes(status)) {
      where.status = status;
    }
    if (providerType) {
      where.providerType = providerType;
    }

    const providers = await db.emailProvider.findMany({
      where,
      orderBy: [{ isDefaultTransactional: 'desc' }, { createdAt: 'desc' }],
    });

    const masked = providers.map((p) => ({
      ...p,
      config: maskedConfigFromString(p.configJson),
      configJson: undefined,
    }));

    return NextResponse.json({ data: masked });
  } catch (error) {
    console.error('[SuperAdmin] Error fetching email providers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch email providers' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/superadmin/providers/email-providers
 * Create a new platform-level EmailProvider.
 * Body: { name, providerType, configJson, fromName, fromEmail, replyTo?,
 *         usageType, isDefaultTransactional?, isDefaultMarketing?, tenantId? }
 * Super admin can specify tenantId (defaults to first tenant).
 * isPlatform is always true for super admin created providers.
 *
 * ATOMICITY NOTE (Supabase):
 * PostgREST does not support real ACID transactions — db.$transaction is
 * simulated as independent HTTP calls with NO rollback. Previously, the
 * order was: (1) updateMany to clear old defaults, (2) create the new
 * provider. If step 2 failed transiently (429, network blip, circuit
 * breaker), step 1 had already committed — silently unsetting the previous
 * default provider. Repeated failures could leave the tenant with NO
 * default provider at all.
 *
 * FIX: Reversed the order — create FIRST, then clear old defaults. If
 * create fails, existing defaults are untouched. We also added a single
 * retry on the create call for transient PostgREST errors.
 */
export async function POST(request: NextRequest) {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      providerType,
      configJson,
      fromName,
      fromEmail,
      replyTo,
      usageType,
      isDefaultTransactional,
      isDefaultMarketing,
      tenantId,
      status: reqStatus,
    } = body as Record<string, unknown>;

    // Validate required fields
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const validProviderTypes = ['smtp', 'resend', 'sendgrid', 'ses', 'mailgun', 'postmark', 'brevo'];
    if (!providerType || typeof providerType !== 'string' || !validProviderTypes.includes(providerType)) {
      return NextResponse.json(
        { error: `providerType must be one of: ${validProviderTypes.join(', ')}` },
        { status: 400 }
      );
    }
    if (!fromName || typeof fromName !== 'string' || !fromName.trim()) {
      return NextResponse.json({ error: 'fromName is required' }, { status: 400 });
    }
    if (!fromEmail || typeof fromEmail !== 'string' || !fromEmail.trim()) {
      return NextResponse.json({ error: 'fromEmail is required' }, { status: 400 });
    }

    // If no tenantId specified, attach to the first real tenant (not a fake 'platform' string).
    // C-2C + cache: use shared cached helper to avoid 10s timeout on every request.
    let finalTenantId = typeof tenantId === 'string' && tenantId.trim() ? tenantId.trim() : undefined;
    if (!finalTenantId) {
      finalTenantId = (await resolveFallbackTenantId(null)) || 'platform';
    }
    const finalUsageType = typeof usageType === 'string' && ['transactional', 'marketing', 'both'].includes(usageType)
      ? usageType
      : 'both';
    const wantDefaultTransactional = Boolean(isDefaultTransactional);
    const wantDefaultMarketing = Boolean(isDefaultMarketing);
    const configString = encodeProviderConfig(configJson);

    // STEP 1: Create the new provider FIRST (with 1 retry for transient errors).
    // If this fails, existing defaults are untouched — no data corruption.
    const createData = {
      name: name.trim(),
      providerType,
      configJson: configString,
      fromName: fromName.trim(),
      fromEmail: fromEmail.trim(),
      replyTo: typeof replyTo === 'string' && replyTo.trim() ? replyTo.trim() : null,
      usageType: finalUsageType,
      isDefaultTransactional: wantDefaultTransactional,
      isDefaultMarketing: wantDefaultMarketing,
      isPlatform: true,
      status: (typeof reqStatus === 'string' && ['active', 'paused'].includes(reqStatus)) ? reqStatus : 'active',
      tenantId: finalTenantId,
      workspaceId: null,
    };

    let created;
    try {
      created = await db.emailProvider.create({ data: createData });
    } catch (createError) {
      // Retry once after 500ms for transient PostgREST errors (429 rate-limit,
      // network blip, circuit breaker open, schema-cache invalidation).
      // These are the root cause of the intermittent "Failed to create email
      // provider" bug on Supabase production.
      console.warn('[SuperAdmin] Email provider create failed, retrying in 500ms...', createError);
      await new Promise((resolve) => setTimeout(resolve, 500));
      try {
        created = await db.emailProvider.create({ data: createData });
      } catch (retryError) {
        console.error('[SuperAdmin] Email provider create failed after retry:', retryError);
        const errMsg = retryError instanceof Error ? retryError.message : 'Unknown error';
        return NextResponse.json(
          { error: `Failed to create email provider after retry: ${errMsg}` },
          { status: 500 }
        );
      }
    }

    // STEP 2: Clear old defaults — ONLY if the create succeeded.
    // On Supabase, these updateMany calls commit immediately (no rollback),
    // but since the new provider already exists with the correct default flags,
    // clearing the old ones is safe and correct.
    if (wantDefaultTransactional) {
      await db.emailProvider.updateMany({
        where: {
          tenantId: finalTenantId,
          isDefaultTransactional: true,
          id: { not: created.id },
        },
        data: { isDefaultTransactional: false },
      }).catch((err) => {
        console.error('[SuperAdmin] Failed to clear old defaultTransactional:', err);
      });
    }
    if (wantDefaultMarketing) {
      await db.emailProvider.updateMany({
        where: {
          tenantId: finalTenantId,
          isDefaultMarketing: true,
          id: { not: created.id },
        },
        data: { isDefaultMarketing: false },
      }).catch((err) => {
        console.error('[SuperAdmin] Failed to clear old defaultMarketing:', err);
      });
    }

    return NextResponse.json(
      {
        ...created,
        config: maskedConfigFromString(created.configJson),
        configJson: undefined,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[SuperAdmin] Error creating email provider:', error);
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create email provider: ${errMsg}` },
      { status: 500 }
    );
  }
}
