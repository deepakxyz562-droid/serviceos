const DEFAULT_GRAPH_API = 'https://graph.facebook.com/v21.0';

const ALLOWED_REDIRECT_HOSTS = new Set([
  'bgos.site',
  'www.bgos.site',
  'fieseros.com',
  'www.fieseros.com',
  'bgos.fieseros.com',
]);

export type WhatsAppActivationState = 'active' | 'pending';

export interface MetaActivationSnapshot {
  activationStatus: WhatsAppActivationState;
  wabaId: string | null;
  phoneNumberId: string | null;
  displayPhoneNumber: string | null;
  verifiedName: string | null;
  nameStatus: string | null;
  messagingLimitTier: string | null;
  qualityRating: string | null;
  phoneStatus: string | null;
  codeVerificationStatus: string | null;
  accountReviewStatus: string | null;
}

/**
 * Allow only trusted first-party `/whatsapp-connect` URLs for Meta `dialog/oauth` token exchange.
 */
export function validateWhatsappRedirectUri(rawUri?: string | null): string | null {
  if (!rawUri || typeof rawUri !== 'string') return null;
  try {
    const parsed = new URL(rawUri.trim());
    if (parsed.pathname !== '/whatsapp-connect') return null;
    const host = parsed.hostname.toLowerCase();
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';
    if (parsed.protocol === 'https:' && ALLOWED_REDIRECT_HOSTS.has(host)) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    if (isLocalHost && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return `${parsed.origin}${parsed.pathname}`;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Determine whether an onboarded WhatsApp Business number is ready to send (`active`)
 * or still waiting for Meta provisioning / OTP / review (`pending`).
 */
export function determineWhatsAppActivation(params: {
  phoneNumberId?: string | null;
  phoneStatus?: string | null;
  codeVerificationStatus?: string | null;
  accountReviewStatus?: string | null;
}): WhatsAppActivationState {
  if (!params.phoneNumberId?.trim()) return 'pending';

  const pStatus = (params.phoneStatus || '').trim().toUpperCase();
  const cvStatus = (params.codeVerificationStatus || '').trim().toUpperCase();
  const reviewStatus = (params.accountReviewStatus || '').trim().toUpperCase();

  if (['PENDING', 'UNVERIFIED', 'DISCONNECTED', 'DELETED', 'MIGRATED'].includes(pStatus)) {
    return 'pending';
  }
  if (pStatus !== 'CONNECTED' && ['NOT_VERIFIED', 'UNVERIFIED', 'EXPIRED'].includes(cvStatus)) {
    return 'pending';
  }
  if (reviewStatus === 'PENDING' && pStatus !== 'CONNECTED' && cvStatus !== 'VERIFIED') {
    return 'pending';
  }

  return 'active';
}

/**
 * Query Meta Graph API for live WABA review status and phone number activation status.
 */
export async function fetchMetaAccountActivationSnapshot(params: {
  wabaId?: string | null;
  phoneNumberId?: string | null;
  accessToken: string;
  apiBase?: string;
}): Promise<MetaActivationSnapshot> {
  const apiBase = params.apiBase || DEFAULT_GRAPH_API;
  let wabaId = params.wabaId?.trim() || null;
  let phoneNumberId = params.phoneNumberId?.trim() || null;
  let displayPhoneNumber: string | null = null;
  let verifiedName: string | null = null;
  let nameStatus: string | null = null;
  let messagingLimitTier: string | null = null;
  let qualityRating: string | null = null;
  let phoneStatus: string | null = null;
  let codeVerificationStatus: string | null = null;
  let accountReviewStatus: string | null = null;

  if (wabaId) {
    try {
      const [wabaRes, phoneRes] = await Promise.all([
        fetch(
          `${apiBase}/${wabaId}?fields=id,account_review_status&access_token=${encodeURIComponent(params.accessToken)}`,
        ).catch(() => null),
        fetch(
          `${apiBase}/${wabaId}/phone_numbers?fields=id,display_phone_number,verified_name,name_status,code_verification_status,quality_rating,messaging_limit_tier,status&access_token=${encodeURIComponent(params.accessToken)}`,
        ).catch(() => null),
      ]);

      if (wabaRes?.ok) {
        const wabaData = await wabaRes.json().catch(() => ({}));
        accountReviewStatus = wabaData.account_review_status || null;
      }

      if (phoneRes?.ok) {
        const phoneData = await phoneRes.json().catch(() => ({}));
        const numbers: any[] = Array.isArray(phoneData.data) ? phoneData.data : [];
        const matched =
          (phoneNumberId && numbers.find((n) => n.id === phoneNumberId)) || numbers[0];
        if (matched) {
          phoneNumberId = matched.id || phoneNumberId;
          displayPhoneNumber = matched.display_phone_number || null;
          verifiedName = matched.verified_name || null;
          nameStatus = matched.name_status || null;
          messagingLimitTier = matched.messaging_limit_tier || null;
          qualityRating = matched.quality_rating || null;
          phoneStatus = matched.status || null;
          codeVerificationStatus = matched.code_verification_status || null;
        }
      }
    } catch {
      // Best-effort metadata query
    }
  } else if (phoneNumberId) {
    try {
      const singleRes = await fetch(
        `${apiBase}/${phoneNumberId}?fields=id,display_phone_number,verified_name,name_status,code_verification_status,quality_rating,messaging_limit_tier,status&access_token=${encodeURIComponent(params.accessToken)}`,
      ).catch(() => null);
      if (singleRes?.ok) {
        const matched = await singleRes.json().catch(() => ({}));
        displayPhoneNumber = matched.display_phone_number || null;
        verifiedName = matched.verified_name || null;
        nameStatus = matched.name_status || null;
        messagingLimitTier = matched.messaging_limit_tier || null;
        qualityRating = matched.quality_rating || null;
        phoneStatus = matched.status || null;
        codeVerificationStatus = matched.code_verification_status || null;
      }
    } catch {
      // Best-effort metadata query
    }
  }

  const activationStatus = determineWhatsAppActivation({
    phoneNumberId,
    phoneStatus,
    codeVerificationStatus,
    accountReviewStatus,
  });

  return {
    activationStatus,
    wabaId,
    phoneNumberId,
    displayPhoneNumber,
    verifiedName,
    nameStatus,
    messagingLimitTier,
    qualityRating,
    phoneStatus,
    codeVerificationStatus,
    accountReviewStatus,
  };
}
