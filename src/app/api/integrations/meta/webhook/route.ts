import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Meta Leadgen Webhook.
 *
 * Two endpoints share this file:
 *   - GET  → Meta subscription verification (no auth, public).
 *   - POST → receives leadgen webhook events (no auth, public).
 *
 * Meta docs:
 *   https://developers.facebook.com/docs/marketing-api/guides/lead-ads/webhooks
 */

// ---------------------------------------------------------------------------
// Types for the Meta webhook payload
// ---------------------------------------------------------------------------

interface MetaLeadgenValue {
  leadgen_id: string;
  form_id: string;
  page_id: string;
  ad_id?: string;
  adset_id?: string;
  campaign_id?: string;
  created_time?: number; // unix seconds
}

interface MetaLeadgenChange {
  field: 'leadgen';
  value: MetaLeadgenValue;
}

interface MetaWebhookEntry {
  id: string; // page id
  changes: MetaLeadgenChange[];
}

interface MetaWebhookPayload {
  object: 'page';
  entry: MetaWebhookEntry[];
}

// ---------------------------------------------------------------------------
// TODO(stub): Graph API lead-field fetcher
// ---------------------------------------------------------------------------

/**
 * Fetch the full lead field data (name, email, phone, city, country, custom
 * answers) for a leadgen_id by calling the Meta Graph API:
 *
 *   GET https://graph.facebook.com/v19.0/{leadgen_id}
 *       ?fields=field_data,created_time
 *       &access_token={pageAccessToken}
 *
 * Production usage: implement this with `fetch` against the Graph API using
 * the stored page access token, parse `field_data` (an array of
 * { name, values: string[] }) into structured fields, and return a normalized
 * object. For now it's a stub returning null so the route is functional
 * without real Meta credentials — raw webhook value is stored in rawDataJson
 * and the structured contact fields are left null until this is implemented.
 */
async function fetchLeadFieldData(
  _leadgenId: string,
  _pageAccessToken: string | null
): Promise<{
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  customFieldsJson: string;
} | null> {
  // TODO: implement Graph API call:
  //   const res = await fetch(
  //     `https://graph.facebook.com/v19.0/${leadgenId}` +
  //       `?fields=field_data,created_time&access_token=${pageAccessToken}`
  //   );
  //   ... parse field_data → { contactName, email, phone, city, country, ... }
  return null;
}

// ---------------------------------------------------------------------------
// GET — Meta subscription verification (public, NO auth)
// ---------------------------------------------------------------------------

/**
 * Meta calls this once when an admin registers the webhook URL in the App
 * Dashboard. Reads `hub.mode`, `hub.challenge`, `hub.verify_token`.
 *
 * If `hub.mode === 'subscribe'`:
 *   - find the tenant whose MetaLeadConfig.verifyToken matches hub.verify_token
 *   - if found: set their subscriptionVerified=true and return the challenge
 *     as plain text (status 200).
 *   - if not found: return 403.
 * Otherwise return 400.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('hub.mode');
    const challenge = searchParams.get('hub.challenge');
    const verifyToken = searchParams.get('hub.verify_token');

    if (mode !== 'subscribe') {
      return NextResponse.json(
        { error: 'Invalid hub.mode' },
        { status: 400 }
      );
    }

    if (!verifyToken) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Find the tenant whose verifyToken matches.
    const config = await db.metaLeadConfig.findFirst({
      where: { verifyToken },
    });

    if (!config) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // Mark subscription verified — Meta has confirmed the webhook URL.
    await db.metaLeadConfig.update({
      where: { id: config.id },
      data: { subscriptionVerified: true },
    });

    // Meta requires the exact challenge string as the response body.
    return new NextResponse(challenge || '', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
  } catch (error) {
    console.error('Error verifying Meta webhook subscription:', error);
    return NextResponse.json(
      { error: 'Webhook verification failed' },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST — receive leadgen webhook events (public, NO auth)
// ---------------------------------------------------------------------------

/**
 * Meta posts leadgen events here whenever a user submits a Lead Ad form.
 *
 * Body shape:
 *   { object: 'page', entry: [{ id, changes: [{ field: 'leadgen',
 *     value: { leadgen_id, form_id, page_id, ad_id, adset_id,
 *              campaign_id, created_time } }] }] }
 *
 * For each entry/changes where field === 'leadgen':
 *   - look up the tenant by MetaLeadConfig.pageId === entry.id (pageId).
 *     If no tenant config exists, skip (but still return 200 so Meta stops
 *     retrying).
 *   - for each leadgen value: if a MetaLead with (tenantId, leadgenId)
 *     already exists, skip (idempotent). Otherwise create a new MetaLead
 *     with the raw webhook value stored in rawDataJson.
 *
 * Always return 200 with { success: true } — Meta requires 200 to stop
 * retrying the webhook.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MetaWebhookPayload;

    if (!body || body.object !== 'page' || !Array.isArray(body.entry)) {
      // Not a Meta page webhook — still 200 so Meta doesn't retry.
      return NextResponse.json({ success: true }, { status: 200 });
    }

    for (const entry of body.entry) {
      if (!entry || !Array.isArray(entry.changes)) continue;

      // Look up the tenant whose pageId matches this entry.
      const config = await db.metaLeadConfig.findFirst({
        where: { pageId: entry.id },
      });
      if (!config) {
        // No tenant owns this page — skip silently. Still 200 to Meta.
        continue;
      }

      for (const change of entry.changes) {
        if (!change || change.field !== 'leadgen') continue;
        const value = change.value;
        if (!value || !value.leadgen_id) continue;

        // Idempotency: skip if we've already stored this leadgen event.
        const existing = await db.metaLead.findUnique({
          where: {
            tenantId_leadgenId: {
              tenantId: config.tenantId,
              leadgenId: value.leadgen_id,
            },
          },
        });
        if (existing) continue;

        const receivedAt = value.created_time
          ? new Date(value.created_time * 1000)
          : new Date();

        // TODO: fetch lead field data via fetchLeadFieldData() once the
        // Graph API call is implemented. For now contact fields stay null
        // and the raw webhook value is preserved in rawDataJson so nothing
        // is lost.
        const fieldData = await fetchLeadFieldData(
          value.leadgen_id,
          config.pageAccessToken
        );

        await db.metaLead.create({
          data: {
            tenantId: config.tenantId,
            leadgenId: value.leadgen_id,
            formId: value.form_id,
            pageId: value.page_id,
            platform: 'facebook',
            adId: value.ad_id || null,
            adsetId: value.adset_id || null,
            campaignId: value.campaign_id || null,
            contactName: fieldData?.contactName ?? null,
            email: fieldData?.email ?? null,
            phone: fieldData?.phone ?? null,
            city: fieldData?.city ?? null,
            country: fieldData?.country ?? null,
            customFieldsJson: fieldData?.customFieldsJson ?? '{}',
            rawDataJson: JSON.stringify(value),
            receivedAt,
          },
        });
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error processing Meta leadgen webhook:', error);
    // Even on internal errors we return 200 to Meta — otherwise it will
    // retry indefinitely. The error is logged server-side for debugging.
    return NextResponse.json({ success: true }, { status: 200 });
  }
}
