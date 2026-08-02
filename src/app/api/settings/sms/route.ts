import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, getAppUrl } from '@/lib/auth';
import { encryptKey, decryptKey } from '@/lib/ai-key-crypto';

/**
 * Tenant-owned SMS / 2-Way Text settings.
 *
 * Storage: `Tenant.settingsJson.smsSettings` (a JSON blob). The `authToken`
 * is stored ENCRYPTED (AES-256-GCM via `ai-key-crypto.ts`) under
 * `smsSettings.authTokenEncrypted`; the plaintext is NEVER persisted.
 *
 * GET response masks the auth token to `••••••••<last4>` so the UI can show
 * "configured" state without leaking the secret. The masked form is also
 * what the UI sends back on save when the user did NOT edit the token —
 * the PUT handler detects the mask and preserves the existing ciphertext.
 *
 * Auth: any authenticated tenant member may read; only owner/admin may write.
 */

export type SmsProvider = 'twilio' | 'vonage' | 'custom' | 'none';

export interface SmsKeywordRule {
  keyword: string;
  response: string;
}

export interface SmsSettings {
  provider: SmsProvider;
  accountSid: string;
  authToken: string; // masked in GET responses, plaintext from client on PUT
  phoneNumber: string;
  senderId: string;
  twoWayEnabled: boolean;
  keywordsEnabled: boolean;
  keywords: SmsKeywordRule[];
}

const DEFAULT_SETTINGS: SmsSettings = {
  provider: 'none',
  accountSid: '',
  authToken: '',
  phoneNumber: '',
  senderId: '',
  twoWayEnabled: false,
  keywordsEnabled: false,
  keywords: [],
};

// Sentinel used by the UI to represent a masked/unchanged auth token.
// The PUT handler treats any value starting with this prefix as "leave
// the existing stored ciphertext alone".
const MASK_PREFIX = '••••••••';

function maskToken(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 4) return MASK_PREFIX;
  return `${MASK_PREFIX}${plaintext.slice(-4)}`;
}

function isMasked(value: string): boolean {
  return !!value && value.startsWith(MASK_PREFIX);
}

function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function parseSettings(rawSettingsJson: string | null | undefined): {
  smsSettings: Partial<SmsSettings> & { authTokenEncrypted?: string };
  raw: Record<string, unknown>;
} {
  const parsed = safeJsonParse<Record<string, unknown>>(rawSettingsJson, {});
  const smsSettings = (parsed.smsSettings || {}) as Partial<SmsSettings> & {
    authTokenEncrypted?: string;
  };
  return { smsSettings, raw: parsed };
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      // Super-admins without an active tenant get the default empty config.
      return NextResponse.json({
        ...DEFAULT_SETTINGS,
        authToken: '',
        configured: false,
        webhookUrl: `${getAppUrl(request)}/api/sms/inbound`,
      });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const { smsSettings } = parseSettings(tenant.settingsJson);

    // Decrypt the auth token (best-effort — fall back to '' if decryption
    // fails because the ENCRYPTION_KEY was rotated).
    let authTokenPlaintext = '';
    if (smsSettings.authTokenEncrypted) {
      try {
        authTokenPlaintext = decryptKey(smsSettings.authTokenEncrypted);
      } catch {
        authTokenPlaintext = '';
      }
    }

    const settings: SmsSettings = {
      provider: (smsSettings.provider as SmsProvider) || DEFAULT_SETTINGS.provider,
      accountSid: smsSettings.accountSid || '',
      authToken: maskToken(authTokenPlaintext),
      phoneNumber: smsSettings.phoneNumber || '',
      senderId: smsSettings.senderId || '',
      twoWayEnabled: smsSettings.twoWayEnabled ?? false,
      keywordsEnabled: smsSettings.keywordsEnabled ?? false,
      keywords: Array.isArray(smsSettings.keywords) ? smsSettings.keywords : [],
    };

    const configured =
      settings.provider !== 'none' &&
      !!(settings.accountSid || settings.phoneNumber || authTokenPlaintext);

    return NextResponse.json({
      ...settings,
      configured,
      webhookUrl: `${getAppUrl(request)}/api/sms/inbound`,
    });
  } catch (error) {
    console.error('[/api/settings/sms GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch SMS settings' },
      { status: 500 },
    );
  }
}

// ─── PUT ─────────────────────────────────────────────────────────────────────

const ALLOWED_PROVIDERS: SmsProvider[] = ['twilio', 'vonage', 'custom', 'none'];

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json(
        { error: 'No active tenant for this session' },
        { status: 400 },
      );
    }
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can update SMS settings' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as Partial<SmsSettings>;
    const provider = (body.provider as SmsProvider) || 'none';
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        { error: `Invalid provider. Allowed: ${ALLOWED_PROVIDERS.join(', ')}` },
        { status: 400 },
      );
    }

    const accountSid = typeof body.accountSid === 'string' ? body.accountSid.trim() : '';
    const phoneNumber = typeof body.phoneNumber === 'string' ? body.phoneNumber.trim() : '';
    const senderId = typeof body.senderId === 'string' ? body.senderId.trim() : '';
    const submittedAuthToken = typeof body.authToken === 'string' ? body.authToken : '';
    const twoWayEnabled = !!body.twoWayEnabled;
    const keywordsEnabled = !!body.keywordsEnabled;
    const keywords: SmsKeywordRule[] = Array.isArray(body.keywords)
      ? body.keywords
          .filter((k): k is SmsKeywordRule =>
            !!k && typeof k.keyword === 'string' && typeof k.response === 'string'
          )
          .map((k) => ({
            keyword: k.keyword.trim().slice(0, 64),
            response: k.response.trim().slice(0, 480),
          }))
          .filter((k) => k.keyword.length > 0)
      : [];

    // Load existing tenant settings so we can preserve the auth token when
    // the client sends back the masked placeholder.
    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    const { smsSettings: existing, raw: existingRaw } = parseSettings(
      tenant?.settingsJson,
    );

    let authTokenEncrypted = existing.authTokenEncrypted || '';
    if (submittedAuthToken && !isMasked(submittedAuthToken)) {
      // User entered a new plaintext token → encrypt + store.
      try {
        authTokenEncrypted = encryptKey(submittedAuthToken);
      } catch (err) {
        console.error('[/api/settings/sms PUT] encryptKey failed:', err);
        return NextResponse.json(
          { error: 'Failed to encrypt auth token' },
          { status: 500 },
        );
      }
    }
    // If submittedAuthToken is empty AND it was masked (sent by client) →
    // keep existing ciphertext. If empty AND not masked → user cleared the
    // token intentionally → wipe.
    if (!submittedAuthToken && !isMasked(submittedAuthToken)) {
      authTokenEncrypted = '';
    }

    const newSmsSettings = {
      provider,
      accountSid,
      // Never persist the plaintext token — only the encrypted form.
      authToken: '',
      authTokenEncrypted,
      phoneNumber,
      senderId,
      twoWayEnabled,
      keywordsEnabled,
      keywords,
    };

    const updatedSettingsJson = JSON.stringify({
      ...existingRaw,
      smsSettings: newSmsSettings,
    });

    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: updatedSettingsJson },
    });

    // Build the masked response (same shape as GET).
    let authTokenPlaintext = '';
    if (authTokenEncrypted) {
      try {
        authTokenPlaintext = decryptKey(authTokenEncrypted);
      } catch {
        authTokenPlaintext = '';
      }
    }

    const settings: SmsSettings = {
      provider,
      accountSid,
      authToken: maskToken(authTokenPlaintext),
      phoneNumber,
      senderId,
      twoWayEnabled,
      keywordsEnabled,
      keywords,
    };

    const configured =
      provider !== 'none' && !!(accountSid || phoneNumber || authTokenPlaintext);

    return NextResponse.json({
      ...settings,
      configured,
      webhookUrl: `${getAppUrl(request)}/api/sms/inbound`,
      success: true,
    });
  } catch (error) {
    console.error('[/api/settings/sms PUT] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update SMS settings' },
      { status: 500 },
    );
  }
}
