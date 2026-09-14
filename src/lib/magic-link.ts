import crypto from 'crypto';

/**
 * Secret key for signing dispatch magic links.
 * Falls back safely across production and dev environments.
 */
const SECRET_KEY =
  process.env.JWT_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.SUPABASE_JWT_SECRET ||
  'serviceos-dispatch-magic-token-secret-v1';

export interface JobMagicTokenPayload {
  jobId: string;
  employeeId?: string;
  workspaceId?: string;
  exp: number; // Unix timestamp in ms
}

/**
 * Generate a cryptographically signed magic token for a job assignment.
 */
export function generateJobMagicToken(
  jobId: string,
  employeeId?: string,
  workspaceId?: string,
  expiresInDays: number = 7
): string {
  const payload: JobMagicTokenPayload = {
    jobId,
    employeeId: employeeId || undefined,
    workspaceId: workspaceId || undefined,
    exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
  };

  const dataStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(dataStr)
    .digest('base64url');

  return `${dataStr}.${signature}`;
}

/**
 * Verify and decode a job magic token.
 * Returns payload if valid and not expired, null otherwise.
 */
export function verifyJobMagicToken(token: string): JobMagicTokenPayload | null {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [dataStr, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(dataStr)
    .digest('base64url');

  if (signature !== expectedSig) {
    return null;
  }

  try {
    const payload: JobMagicTokenPayload = JSON.parse(
      Buffer.from(dataStr, 'base64url').toString('utf-8')
    );

    if (!payload.jobId || !payload.exp) {
      return null;
    }

    if (Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Helper to build the full magic URL, SMS text, and WhatsApp dispatch link.
 */
export function buildMagicDispatchBundle(params: {
  origin?: string;
  jobId: string;
  jobNumber?: string | null;
  jobTitle: string;
  customerName?: string | null;
  address?: string | null;
  scheduledTime?: string | null;
  techName?: string | null;
  techPhone?: string | null;
  employeeId?: string | null;
  workspaceId?: string | null;
}) {
  const {
    origin = process.env.NEXT_PUBLIC_APP_URL || 'https://serviceos.app',
    jobId,
    jobNumber,
    jobTitle,
    customerName,
    address,
    scheduledTime,
    techName,
    techPhone,
    employeeId,
    workspaceId,
  } = params;

  const token = generateJobMagicToken(jobId, employeeId || undefined, workspaceId || undefined);
  const cleanOrigin = origin.replace(/\/+$/, '');
  const magicUrl = `${cleanOrigin}/pwa/jobs/${jobId}?token=${encodeURIComponent(token)}`;

  const jobRef = jobNumber ? `#${jobNumber}` : `#${jobId.slice(-6).toUpperCase()}`;
  const timeSnippet = scheduledTime ? ` at ${scheduledTime}` : '';
  const customerSnippet = customerName ? ` for ${customerName}` : '';
  const locationSnippet = address ? ` at ${address}` : '';

  const smsText = `Hi ${techName || 'there'}, you have a new job assignment: ${jobRef} (${jobTitle})${customerSnippet}${locationSnippet}${timeSnippet}. Open your one-click mobile job portal here: ${magicUrl}`;

  const cleanPhone = (techPhone || '').replace(/[^0-9+]/g, '').replace(/^\+/, '');
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(smsText)}`
    : `https://wa.me/?text=${encodeURIComponent(smsText)}`;

  return {
    token,
    magicUrl,
    smsText,
    whatsappUrl,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
}
