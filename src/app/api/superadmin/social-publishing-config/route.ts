import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';

/**
 * Superadmin — Social Publishing OAuth App Configuration
 * ------------------------------------------------------
 *
 * Endpoints:
 *   GET    /api/superadmin/social-publishing-config
 *          → returns all 5 social-publishing platform cards with masked
 *            credentials, feature-flag settings (enabled + minPlan) read
 *            from IntegrationCredential.additionalConfigJson, and the
 *            count of tenants currently connected (SocialAccount rows
 *            grouped by platform).
 *
 *   PUT    /api/superadmin/social-publishing-config
 *          → upserts credentials for ONE platform. Body:
 *            { platform, clientId, clientSecret?, enabled?, minPlan? }
 *            `clientSecret` is OPTIONAL on update — when omitted (or
 *            blank), the existing stored secret is preserved (so the
 *            superadmin can flip the enabled flag without re-entering
 *            the secret).
 *
 *   DELETE /api/superadmin/social-publishing-config?platform=facebook
 *          → removes the IntegrationCredential row for that platform
 *            (SocialAccount rows for already-connected tenants are
 *            preserved — those tenants can keep using the account
 *            until their token expires, but no NEW tenants can connect).
 *
 * Storage:
 *   - Same pattern as /api/superadmin/integration-credentials: the
 *     secret is stored in `IntegrationCredential.clientSecret` and
 *     masked on read (`'••••••••' + last4`). Existing OAuth connect
 *     routes (`/api/oauth/{platform}`) read `clientSecret` as
 *     plaintext for the OAuth token exchange, so we keep parity with
 *     the legacy credentials endpoint — encrypting here would break
 *     those flows.
 *   - Feature flags (`enabled`, `minPlan`) are stored in
 *     `IntegrationCredential.additionalConfigJson` as JSON so we don't
 *     need a separate FeatureFlag row per platform. Defaults:
 *     `{ enabled: true, minPlan: 'growth' }`.
 *
 * The 5 platform cards (FB+IG share ONE Meta App entry, so the
 * superadmin only configures it once):
 *   1. facebook            → Meta App (covers FB Pages + IG Business)
 *   2. googlebusiness      → Google Business Profile
 *   3. linkedin            → LinkedIn
 *   4. pinterest           → Pinterest
 *   5. twitter             → X (Twitter)
 */

// ─── Platform catalog (canonical config the UI renders) ───────────────────

export interface SocialPublishingPlatformDef {
  /** IntegrationCredential.provider value (matches what OAuth routes look up). */
  key: string;
  /** Display name on the card. */
  label: string;
  /** Short description shown under the label. */
  description: string;
  /** Field label for the "ID" input (App ID vs Client ID). */
  idFieldLabel: string;
  /** Field label for the "secret" input. */
  secretFieldLabel: string;
  /** True if the secret may be left empty (PKCE public clients). */
  secretOptional?: boolean;
  /** OAuth callback URLs the superadmin must register in the provider's dashboard. */
  redirectUris: string[];
  /** OAuth scopes (space- or comma-separated per platform convention). */
  scopes: string[];
  /** Provider developer-console URL. */
  docsUrl: string;
  /** Optional warning banner shown above the card. */
  warning?: string;
}

/**
 * The 5 platform definitions. The `redirectUris` are RELATIVE paths — the
 * API returns them to the client as-is, and the UI prepends
 * `window.location.origin` to render the absolute URL the superadmin
 * copies into the provider's dashboard.
 *
 * NOTE on the FB+IG Meta App: both /api/oauth/facebook and
 * /api/oauth/instagram accept credentials registered under
 * `provider='facebook'` (the FB route prefers 'facebook', the IG route
 * prefers 'instagram' but falls back to 'facebook'). So a single
 * `facebook` IntegrationCredential row covers BOTH platform OAuth flows.
 */
export const SOCIAL_PUBLISHING_PLATFORMS: SocialPublishingPlatformDef[] = [
  {
    key: 'facebook',
    label: 'Facebook + Instagram (Meta App)',
    description:
      'Single Meta App covers Facebook Pages publishing AND Instagram Business publishing. Register it once here.',
    idFieldLabel: 'Meta App ID',
    secretFieldLabel: 'Meta App Secret',
    redirectUris: [
      '/api/oauth/facebook/callback',
      '/api/oauth/instagram/callback',
    ],
    scopes: [
      'pages_manage_posts',
      'pages_read_engagement',
      'pages_show_list',
      'pages_read_user_content',
      'instagram_content_publish',
    ],
    docsUrl: 'https://developers.facebook.com/apps/',
  },
  {
    key: 'googlebusiness',
    label: 'Google Business Profile',
    description: 'Publish local posts, offers, and events to GBP locations.',
    idFieldLabel: 'Google OAuth Client ID',
    secretFieldLabel: 'Google OAuth Client Secret',
    redirectUris: ['/api/oauth/googlebusiness/callback'],
    scopes: ['business.manage'],
    docsUrl:
      'https://console.cloud.google.com/apis/credentials',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    description: 'Publish posts to personal profile and organization pages.',
    idFieldLabel: 'LinkedIn Client ID',
    secretFieldLabel: 'LinkedIn Client Secret',
    redirectUris: ['/api/oauth/linkedin/callback'],
    scopes: [
      'w_member_social',
      'rw_organization',
      'r_organization_social',
      'r_member_social',
    ],
    docsUrl: 'https://www.linkedin.com/developers/apps',
  },
  {
    key: 'pinterest',
    label: 'Pinterest',
    description: 'Pin images to Pinterest boards.',
    idFieldLabel: 'Pinterest App ID',
    secretFieldLabel: 'Pinterest App Secret',
    redirectUris: ['/api/oauth/pinterest/callback'],
    scopes: [
      'boards:read',
      'pins:read',
      'pins:write',
      'user_accounts:read',
    ],
    docsUrl: 'https://developers.pinterest.com/docs/api/v5/',
  },
  {
    key: 'twitter',
    label: 'X (Twitter)',
    description:
      'Post tweets via OAuth 2.0 with PKCE. Public clients may leave the secret empty.',
    idFieldLabel: 'X Client ID',
    secretFieldLabel: 'X Client Secret',
    secretOptional: true,
    redirectUris: ['/api/oauth/twitter/callback'],
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
    docsUrl: 'https://developer.twitter.com/en/portal/dashboard',
    warning:
      'X Free tier: 1,500 posts/month total across all tenants. Each tenant is capped at 10 posts/month.',
  },
];

const PLATFORM_BY_KEY = new Map(
  SOCIAL_PUBLISHING_PLATFORMS.map((p) => [p.key, p]),
);

const VALID_MIN_PLANS = new Set(['trial', 'starter', 'growth', 'business', 'enterprise']);

// ─── Auth guard ────────────────────────────────────────────────────────────

async function requireSuperAdmin() {
  const auth = await getAuthUser();
  if (!auth) {
    return {
      auth,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
  if (!(await isSuperAdminRequest())) {
    return {
      auth,
      error: NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 },
      ),
    };
  }
  return { auth, error: null };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

interface FeatureFlagConfig {
  enabled: boolean;
  minPlan: 'trial' | 'starter' | 'growth' | 'business' | 'enterprise';
}

const DEFAULT_FEATURE_FLAGS: FeatureFlagConfig = {
  enabled: true,
  minPlan: 'growth',
};

/**
 * Parse `additionalConfigJson` for the { enabled, minPlan } feature-flag
 * shape. Defaults to enabled + minPlan='growth' when missing/malformed.
 * Extra keys (e.g. legacy `appSecret`, `signingSecret`) are preserved.
 */
function parseFeatureFlags(json: string | null | undefined): FeatureFlagConfig {
  if (!json) return { ...DEFAULT_FEATURE_FLAGS };
  try {
    const obj = JSON.parse(json);
    const enabled =
      typeof obj.enabled === 'boolean' ? obj.enabled : DEFAULT_FEATURE_FLAGS.enabled;
    const minPlan =
      typeof obj.minPlan === 'string' && VALID_MIN_PLANS.has(obj.minPlan)
        ? (obj.minPlan as FeatureFlagConfig['minPlan'])
        : DEFAULT_FEATURE_FLAGS.minPlan;
    return { enabled, minPlan };
  } catch {
    return { ...DEFAULT_FEATURE_FLAGS };
  }
}

/**
 * Mask a stored secret for display. Returns `'••••••••' + last4` when
 * the secret has 8+ chars; returns `'****'` for short secrets; returns
 * `''` for empty. NEVER exposes the full plaintext.
 */
function maskSecret(secret: string | null | undefined): string {
  if (!secret) return '';
  if (secret.length <= 8) return '****';
  return '••••••••' + secret.slice(-4);
}

/**
 * Mask the clientId for display. Client IDs are LESS sensitive than
 * secrets (they're sent in OAuth URLs the user can see in their
 * browser), but we still mask the middle so casual screen-share leaks
 * are limited. `1234567890123456` → `1234...3456`.
 */
function maskClientId(id: string | null | undefined): string {
  if (!id) return '';
  if (id.length <= 8) return id;
  return `${id.slice(0, 4)}...${id.slice(-4)}`;
}

// ─── GET ───────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { auth, error } = await requireSuperAdmin();
  if (error) return error;

  // 1. Load all IntegrationCredential rows for the 5 publishing platforms.
  //    We do a single query then group in-memory (only 5 rows max).
  const rows = await db.integrationCredential.findMany({
    where: {
      provider: { in: SOCIAL_PUBLISHING_PLATFORMS.map((p) => p.key) },
    },
    orderBy: { provider: 'asc' },
  });

  // 2. Load ALL SocialAccount rows (just platform + tenantId) in ONE query,
  //    then dedupe in-memory. Previously this used groupBy + N per-platform
  //    distinct findMany queries — but groupBy THROWS when the SocialAccount
  //    table doesn't exist in Supabase yet (the 7-engine tables haven't been
  //    migrated), causing the entire endpoint to return HTTP 500.
  //
  //    Now: a single findMany, wrapped in try/catch so a missing table
  //    degrades gracefully to zero counts instead of crashing the page.
  const connectedTenants: Record<string, number> = {};
  const totalAccounts: Record<string, number> = {};
  try {
    const accounts = await db.socialAccount.findMany({
      select: { platform: true, tenantId: true },
    });
    // Distinct (tenantId, platform) → count of unique tenants per platform.
    const tenantsPerPlatform = new Map<string, Set<string>>();
    for (const a of accounts) {
      const platform = String(a.platform ?? '');
      const tenantId = String(a.tenantId ?? '');
      if (!platform || !tenantId) continue;
      if (!tenantsPerPlatform.has(platform)) {
        tenantsPerPlatform.set(platform, new Set());
      }
      tenantsPerPlatform.get(platform)!.add(tenantId);
      totalAccounts[platform] = (totalAccounts[platform] || 0) + 1;
    }
    for (const [platform, tenants] of tenantsPerPlatform) {
      connectedTenants[platform] = tenants.size;
    }
  } catch (err) {
    // The SocialAccount table may not exist in Supabase yet (migration
    // supabase-migration-social-publishing.sql not run). Degrade to zeros
    // so the config page still loads — the superadmin can still register
    // OAuth credentials; they just see 0 connected tenants until the
    // migration is applied and tenants actually connect accounts.
    console.warn(
      '[social-publishing-config] Could not load SocialAccount counts (table may not exist yet):',
      err instanceof Error ? err.message : err,
    );
  }

  // 3. Assemble the response.
  const platforms = SOCIAL_PUBLISHING_PLATFORMS.map((def) => {
    const row = rows.find((r) => r.provider === def.key);
    const flags = parseFeatureFlags(row?.additionalConfigJson);
    return {
      key: def.key,
      label: def.label,
      description: def.description,
      idFieldLabel: def.idFieldLabel,
      secretFieldLabel: def.secretFieldLabel,
      secretOptional: def.secretOptional,
      redirectUris: def.redirectUris,
      scopes: def.scopes,
      docsUrl: def.docsUrl,
      warning: def.warning,
      configured: !!row && row.status === 'active' && !!row.clientId,
      credentialId: row?.id || null,
      clientId: row?.clientId || '',
      clientIdMasked: maskClientId(row?.clientId),
      clientSecretMasked: maskSecret(row?.clientSecret),
      hasSecret: !!(row?.clientSecret && row.clientSecret.length > 0),
      scopesStored: row?.scopes || def.scopes.join(def.key === 'linkedin' || def.key === 'twitter' ? ' ' : ','),
      flags,
      connectedTenants: connectedTenants[def.key] || 0,
      totalAccounts: totalAccounts[def.key] || 0,
      updatedAt: row?.updatedAt?.toISOString() || null,
    };
  });

  return NextResponse.json({
    platforms,
    summary: {
      total: platforms.length,
      configured: platforms.filter((p) => p.configured).length,
      enabled: platforms.filter((p) => p.flags.enabled).length,
      connectedTenantsTotal: Object.values(connectedTenants).reduce((a, b) => a + b, 0),
    },
  });
}

// ─── PUT ───────────────────────────────────────────────────────────────────

interface PutBody {
  platform?: string;
  clientId?: string;
  clientSecret?: string;
  enabled?: boolean;
  minPlan?: string;
}

export async function PUT(request: NextRequest) {
  const { auth, error } = await requireSuperAdmin();
  if (error) return error;

  let body: PutBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { platform, clientId, clientSecret, enabled, minPlan } = body;

  // 1. Validate platform key.
  if (!platform || !PLATFORM_BY_KEY.has(platform)) {
    return NextResponse.json(
      { error: `Invalid platform. Expected one of: ${[...PLATFORM_BY_KEY.keys()].join(', ')}` },
      { status: 400 },
    );
  }

  const def = PLATFORM_BY_KEY.get(platform)!;

  // 2. Validate clientId (REQUIRED on every save — even secret-only
  //    updates need the ID re-entered so we don't accidentally lose it).
  if (!clientId || !clientId.trim()) {
    return NextResponse.json(
      { error: `${def.idFieldLabel} is required` },
      { status: 400 },
    );
  }

  // 3. Validate minPlan if provided.
  if (minPlan !== undefined && !VALID_MIN_PLANS.has(minPlan)) {
    return NextResponse.json(
      { error: `Invalid minPlan. Expected one of: ${[...VALID_MIN_PLANS].join(', ')}` },
      { status: 400 },
    );
  }

  // 4. Look up any existing row (so we can preserve the secret when the
  //    PUT body omits it).
  const existing = await db.integrationCredential.findFirst({
    where: { provider: platform },
  });

  // 5. Resolve the final secret value:
  //    - If body has a non-empty clientSecret → use it (update).
  //    - Else if existing row has a secret → preserve it.
  //    - Else → empty string (only allowed for PKCE public clients like X).
  let resolvedSecret: string;
  if (clientSecret && clientSecret.trim()) {
    resolvedSecret = clientSecret.trim();
  } else if (existing?.clientSecret) {
    resolvedSecret = existing.clientSecret;
  } else {
    resolvedSecret = '';
  }

  if (!resolvedSecret && !def.secretOptional) {
    return NextResponse.json(
      { error: `${def.secretFieldLabel} is required for ${def.label}` },
      { status: 400 },
    );
  }

  // 6. Build the additionalConfigJson — preserve any non-flag keys
  //    (legacy appSecret, signingSecret, etc.) and merge in the new
  //    enabled/minPlan values.
  const existingConfig: Record<string, unknown> = (() => {
    if (!existing?.additionalConfigJson) return {};
    try {
      return JSON.parse(existing.additionalConfigJson) as Record<string, unknown>;
    } catch {
      return {};
    }
  })();

  const newFlags: FeatureFlagConfig = {
    enabled: typeof enabled === 'boolean' ? enabled : existingConfig.enabled === false ? false : true,
    minPlan:
      (minPlan && (VALID_MIN_PLANS.has(minPlan) ? minPlan : null)) ||
      (typeof existingConfig.minPlan === 'string' && VALID_MIN_PLANS.has(existingConfig.minPlan)
        ? existingConfig.minPlan
        : DEFAULT_FEATURE_FLAGS.minPlan),
  } as FeatureFlagConfig;

  // Strip stale enabled/minPlan from existingConfig, then merge fresh.
  const { enabled: _e, minPlan: _m, ...preservedConfig } = existingConfig;
  const finalConfig = { ...preservedConfig, ...newFlags };

  // 7. Build the canonical scopes string for storage (matches what the
  //    OAuth connect routes use).
  const scopesStored =
    platform === 'linkedin' || platform === 'twitter'
      ? def.scopes.join(' ')
      : def.scopes.join(',');

  // 8. Upsert.
  const data = {
    provider: platform,
    displayName: def.label,
    clientId: clientId.trim(),
    clientSecret: resolvedSecret,
    scopes: scopesStored,
    additionalConfigJson: JSON.stringify(finalConfig),
    status: 'active' as const,
    createdBy: auth!.id,
  };

  let record;
  if (existing) {
    record = await db.integrationCredential.update({
      where: { id: existing.id },
      data,
    });
  } else {
    record = await db.integrationCredential.create({ data });
  }

  // 9. Audit-log the save. Use a sentinel tenantId when the superadmin
  //    isn't bound to a tenant (the column is required on ActivityLog).
  //    The activity-log helper silently skips when tenantId is empty,
  //    so we use the auth user's tenantId if present, otherwise a
  //    well-known sentinel.
  const tenantIdForLog = auth!.tenantId || 'superadmin';
  await logActivity({
    tenantId: tenantIdForLog,
    actorId: auth!.id,
    actorType: 'superadmin',
    action: 'update',
    entityType: 'integration_credential',
    entityId: record.id,
    entityName: def.label,
    description: `Superadmin saved ${def.label} OAuth credentials. Enabled=${newFlags.enabled}, minPlan=${newFlags.minPlan}.`,
    metadataJson: JSON.stringify({
      platform,
      hasSecret: !!resolvedSecret,
      flags: newFlags,
    }),
    severity: 'info',
  }).catch(() => {
    // Best-effort — never fail the save on audit-log errors.
  });

  return NextResponse.json({
    success: true,
    id: record.id,
    platform: record.provider,
    configured: true,
    flags: newFlags,
    clientIdMasked: maskClientId(record.clientId),
    clientSecretMasked: maskSecret(record.clientSecret),
    hasSecret: !!record.clientSecret,
    updatedAt: record.updatedAt.toISOString(),
  });
}

// ─── DELETE ────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const { auth, error } = await requireSuperAdmin();
  if (error) return error;

  const platform = request.nextUrl.searchParams.get('platform');
  if (!platform || !PLATFORM_BY_KEY.has(platform)) {
    return NextResponse.json(
      { error: `Invalid or missing ?platform= param. Expected one of: ${[...PLATFORM_BY_KEY.keys()].join(', ')}` },
      { status: 400 },
    );
  }

  const def = PLATFORM_BY_KEY.get(platform)!;
  const existing = await db.integrationCredential.findFirst({
    where: { provider: platform },
  });

  if (!existing) {
    // Idempotent — already gone.
    return NextResponse.json({ success: true, alreadyMissing: true });
  }

  await db.integrationCredential.deleteMany({ where: { id: existing.id } });

  const tenantIdForLog = auth!.tenantId || 'superadmin';
  await logActivity({
    tenantId: tenantIdForLog,
    actorId: auth!.id,
    actorType: 'superadmin',
    action: 'delete',
    entityType: 'integration_credential',
    entityId: existing.id,
    entityName: def.label,
    description: `Superadmin removed ${def.label} OAuth credentials. Tenants can no longer connect this platform (existing connections remain until token expiry).`,
    metadataJson: JSON.stringify({ platform }),
    severity: 'warning',
  }).catch(() => {
    // Best-effort.
  });

  return NextResponse.json({ success: true });
}
