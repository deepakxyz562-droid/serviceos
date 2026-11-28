import { db } from '@/lib/db';
import { invalidateBootstrapCache } from '@/lib/bgos/bootstrap-cache';
import { ensureAndSyncBusinessChatbot } from '@/lib/bgos-business-chatbot';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { updateGoogleBusinessProfile } from '@/lib/social/adapters/googlebusiness';
import {
  checkAndEnforcePendingLock,
  setPendingGoogleUpdate,
  type PendingGoogleUpdate,
} from '@/lib/gbp/pending-update';
import { sendBgosGbpUpdatePendingEmail } from '@/lib/emails/bgos/sender';

export interface WhatsAppIdentitySyncInput {
  tenantId: string;
  phone?: string | null;
  whatsappUrl?: string | null;
  locationId?: string;
  syncChatbot?: boolean;
  syncGoogleBusiness?: boolean;
}

export interface WhatsAppIdentitySyncResult {
  phone: string;
  whatsappUrl: string;
  syncedToGoogle: boolean;
  googleWarnings: string[];
  chatbotEnsured: boolean;
}

function safeParseSettings(raw?: string | null): Record<string, any> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * Normalizes a phone number or wa.me link into canonical WhatsApp digits + click-to-chat URL.
 */
export function buildWhatsAppChatLink(phoneOrUrl?: string | null): {
  phone: string;
  whatsappUrl: string;
} {
  const raw = String(phoneOrUrl || '').trim();
  if (!raw) return { phone: '', whatsappUrl: '' };

  if (/^https?:\/\//i.test(raw)) {
    const digitsMatch = raw.match(/wa\.me\/(\d+)/i);
    return {
      phone: digitsMatch?.[1] ? `+${digitsMatch[1]}` : raw,
      whatsappUrl: raw,
    };
  }

  const cleanDigits = raw.replace(/\D/g, '');
  if (!cleanDigits) return { phone: raw, whatsappUrl: '' };
  const normalizedDigits = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  return {
    phone: raw.startsWith('+') ? raw : `+${normalizedDigits}`,
    whatsappUrl: `https://wa.me/${normalizedDigits}`,
  };
}

/**
 * Synchronizes the tenant's connected WhatsApp Business number across:
 *   1. Tenant.whatsappPhone + settingsJson (bookingPageConfig, whatsappChatLink, googlePlaceActions)
 *   2. Active AI Chatbot (`FormAgent`) via `ensureAndSyncBusinessChatbot`
 *   3. Google Business Profile `attributes/url_whatsapp` (best-effort / lock-safe)
 */
export async function syncTenantWhatsAppIdentity(
  params: WhatsAppIdentitySyncInput,
): Promise<WhatsAppIdentitySyncResult> {
  const {
    tenantId,
    locationId,
    syncChatbot = true,
    syncGoogleBusiness = false,
  } = params;

  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: {
      settingsJson: true,
      phone: true,
      whatsappPhone: true,
    },
  });

  const settings = safeParseSettings(tenant?.settingsJson);
  const resolvedInput =
    String(params.phone || '').trim() ||
    String(tenant?.whatsappPhone || '').trim() ||
    String(settings.whatsappNumber || '').trim() ||
    String(settings.communicationPhone || '').trim() ||
    String(settings.bookingPageConfig?.whatsapp || '').trim() ||
    String(tenant?.phone || '').trim();

  const fromUrl = params.whatsappUrl?.trim()
    ? buildWhatsAppChatLink(params.whatsappUrl.trim())
    : buildWhatsAppChatLink(resolvedInput);

  const phone = fromUrl.phone || resolvedInput;
  const whatsappUrl = fromUrl.whatsappUrl;

  if (phone || whatsappUrl) {
    if (phone) {
      settings.communicationPhone = phone;
      settings.whatsappNumber = phone;
      settings.bookingPageConfig = {
        ...(settings.bookingPageConfig || {}),
        whatsapp: phone,
      };
    }
    if (whatsappUrl) {
      settings.whatsappChatLink = whatsappUrl;
      settings.googlePlaceActions = {
        ...(settings.googlePlaceActions || {}),
        whatsappUri: whatsappUrl,
      };
    }

    await db.tenant
      .update({
        where: { id: tenantId },
        data: {
          ...(phone ? { whatsappPhone: phone } : {}),
          settingsJson: JSON.stringify(settings),
        },
      })
      .catch((err) => {
        console.warn('[WhatsApp Identity Sync] Tenant update notice:', err);
      });

    invalidateBootstrapCache(tenantId);
  }

  let chatbotEnsured = false;
  if (syncChatbot) {
    try {
      await ensureAndSyncBusinessChatbot(tenantId, { triggerSource: 'whatsapp_connect' });
      chatbotEnsured = true;
    } catch (botErr) {
      console.warn('[WhatsApp Identity Sync] Chatbot ensure notice:', botErr);
    }
  }

  let syncedToGoogle = false;
  const googleWarnings: string[] = [];

  if (syncGoogleBusiness && whatsappUrl) {
    const lockCheck = checkAndEnforcePendingLock(JSON.stringify(settings));
    if (lockCheck.locked) {
      googleWarnings.push(
        lockCheck.reason || 'A previous Google Business update is pending review; WhatsApp saved locally.',
      );
    } else {
      try {
        const googleAccount = await prepareGoogleAccount(tenantId, locationId);
        if (googleAccount?.accessToken) {
          const gbpRes = await updateGoogleBusinessProfile(googleAccount, {
            whatsappUrl,
          });
          syncedToGoogle = gbpRes.appliedMasks.includes('attributes/url_whatsapp');
          if (gbpRes.warnings.length > 0) {
            googleWarnings.push(...gbpRes.warnings);
          }

          settings.googlePlaceActions = {
            ...(settings.googlePlaceActions || {}),
            whatsappUri: whatsappUrl,
            whatsappSyncedToGoogle: syncedToGoogle,
            whatsappSyncedAt: syncedToGoogle ? new Date().toISOString() : settings.googlePlaceActions?.whatsappSyncedAt,
            whatsappWarnings: gbpRes.warnings,
          };
          await db.tenant
            .update({
              where: { id: tenantId },
              data: { settingsJson: JSON.stringify(settings) },
            })
            .catch(() => {});

          if (syncedToGoogle) {
            const newPending: PendingGoogleUpdate = {
              status: 'PENDING',
              type: 'whatsapp',
              label: 'WhatsApp Chat Button',
              submittedAt: new Date().toISOString(),
              targetFields: ['attributes/url_whatsapp'],
              hasPendingEdits: true,
            };
            await setPendingGoogleUpdate(tenantId, newPending).catch(() => {});
            sendBgosGbpUpdatePendingEmail({
              tenantId,
              updateLabel: 'WhatsApp Chat Button',
              updateType: 'whatsapp',
              requiresVerification: false,
            }).catch((err) => console.warn('[sendBgosGbpUpdatePendingEmail error]:', err));
          }
        } else {
          googleWarnings.push('Google Business Profile is not connected yet.');
        }
      } catch (gbpErr) {
        googleWarnings.push(gbpErr instanceof Error ? gbpErr.message : 'Google WhatsApp sync notice');
      }
    }
  }

  return {
    phone,
    whatsappUrl,
    syncedToGoogle,
    googleWarnings,
    chatbotEnsured,
  };
}
