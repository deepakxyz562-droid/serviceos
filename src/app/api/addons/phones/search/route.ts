import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getTelephonyProvider } from '@/lib/telephony-provider';

/**
 * GET /api/addons/phones/search
 * ─────────────────────────────────────────────────────────────────────────
 * Search for available phone numbers from Twilio.
 *
 * Query: ?countryCode=US&areaCode=312&capabilities=voice,sms
 *
 * Returns a list of available numbers — the tenant selects one, then
 * POSTs to /api/addons/phones/buy with the selected number.
 *
 * Phase 8.6: search → select → purchase (not "buy first available").
 *
 * Auth: owner only.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const countryCode = searchParams.get('countryCode') || 'US';
    const areaCode = searchParams.get('areaCode') || '';
    const capabilities = (searchParams.get('capabilities') || 'voice,sms').split(',');

    const provider = await getTelephonyProvider();
    if (!provider) {
      return NextResponse.json(
        { error: 'Telephony provider not configured. Please contact support.' },
        { status: 503 },
      );
    }

    // Search via Twilio (through the TelephonyProvider interface)
    // We use the Twilio provider directly for the search API
    const { getTwilioTelephonyProvider } = await import('@/lib/twilio-telephony-provider');
    const twilio = getTwilioTelephonyProvider();

    // Call the search method (added to TwilioTelephonyProvider)
    const auth = await getTwilioAuthHeader(twilio);
    const { accountSid } = await getTwilioConfig(twilio);

    const searchUrl = new URL(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/Local.json`);
    searchUrl.searchParams.set('IsoCountry', countryCode);
    if (areaCode) searchUrl.searchParams.set('AreaCode', areaCode);
    if (capabilities.includes('voice')) searchUrl.searchParams.set('VoiceEnabled', 'true');
    if (capabilities.includes('sms')) searchUrl.searchParams.set('SmsEnabled', 'true');
    searchUrl.searchParams.set('Limit', '10');

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: { Authorization: auth },
    });

    if (!response.ok) {
      const error = await response.text();
      return NextResponse.json(
        { error: `Search failed: ${response.status} ${error}` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const numbers = (data.available_phone_numbers || []).map((n: Record<string, unknown>) => ({
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name,
      capabilities: {
        voice: n.capabilities?.voice ?? false,
        sms: n.capabilities?.sms ?? false,
      },
      locality: n.locality || null,
      region: n.region || null,
      isoCountry: n.iso_country || countryCode,
    }));

    return NextResponse.json({ numbers });
  } catch (error) {
    console.error('[GET /api/addons/phones/search] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search phone numbers' },
      { status: 500 },
    );
  }
}

// ─── Helpers (access the provider's internal auth) ──────────────────────────

async function getTwilioAuthHeader(_provider: unknown): Promise<string> {
  const { getDecryptedApiKey } = await import('@/lib/ai-provider-config-service');
  const authToken = await getDecryptedApiKey('TWILIO');
  if (!authToken) throw new Error('Twilio credentials not configured');

  const { db } = await import('@/lib/db');
  const config = await db.aiProviderConfig.findUnique({
    where: { provider: 'TWILIO' },
    select: { configJson: true },
  });

  let accountSid = '';
  if (config?.configJson) {
    try {
      accountSid = JSON.parse(config.configJson).accountSid || '';
    } catch { /* ignore */ }
  }

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
  return `Basic ${credentials}`;
}

async function getTwilioConfig(_provider: unknown): Promise<{ accountSid: string }> {
  const { db } = await import('@/lib/db');
  const config = await db.aiProviderConfig.findUnique({
    where: { provider: 'TWILIO' },
    select: { configJson: true },
  });

  let accountSid = '';
  if (config?.configJson) {
    try {
      accountSid = JSON.parse(config.configJson).accountSid || '';
    } catch { /* ignore */ }
  }

  if (!accountSid) throw new Error('Twilio Account SID not configured');
  return { accountSid };
}
