import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Shape of a single lead returned by pollGoogleAdsLeads(). Mirrors the
 * subset of GoogleAdsLead columns we persist (leadId is the only required
 * field — everything else is optional / null-coalesced on insert).
 */
interface PolledGoogleAdsLead {
  leadId: string;
  formId?: string | null;
  formName?: string | null;
  campaignId?: string | null;
  campaignName?: string | null;
  adGroupId?: string | null;
  resourceName?: string | null;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  postalCode?: string | null;
  customFieldsJson?: string;
  rawDataJson?: string;
  submittedAt?: Date | null;
}

/**
 * pollGoogleAdsLeads(config)
 *
 * Real Google Ads Lead Form submissions flow (documented for the future
 * implementation):
 *
 *   Step 1 — refresh OAuth2 access token:
 *     POST https://oauth2.googleapis.com/token
 *       Content-Type: application/x-www-form-urlencoded
 *       body: grant_type=refresh_token
 *             &client_id=<clientId>
 *             &client_secret=<clientSecret>
 *             &refresh_token=<refreshToken>
 *     → 200 { access_token, expires_in, token_type }
 *
 *   Step 2 — query lead_form_submission_data via searchStream:
 *     POST https://googleads.googleapis.com/v17/customers/{loginCustomerId}/googleAds:searchStream
 *       Headers:
 *         developer-token: <developerToken>
 *         Authorization: Bearer <access_token>
 *         login-customer-id: <loginCustomerId>  (manager account id, no dashes)
 *       body: {
 *         "query": "SELECT
 *                     lead_form_submission_data.id,
 *                     lead_form_submission_data.campaign,
 *                     lead_form_submission_data.ad_group,
 *                     lead_form_submission_data.custom_lead_form_id,
 *                     lead_form_submission_data.lead_on_behalf_of_business_name,
 *                     lead_form_submission_data.contact_info_fields,
 *                     lead_form_submission_data.custom_submission_fields,
 *                     segments.date
 *                   FROM lead_form_submission_data
 *                   WHERE segments.date DURING LAST_7_DAYS"
 *       }
 *     → 200 [{ results: [{ leadFormSubmissionData: {...}, campaign: {...}, ... }] }]
 *
 *   Step 3 — map each result to the PolledGoogleAdsLead shape and return.
 *
 * NOTE: This is currently a STUB so the route is functional without real
 * credentials. Replace the body of this function with the real fetch calls
 * when integrating against the live Google Ads API.
 */
async function pollGoogleAdsLeads(config: {
  clientId: string | null;
  clientSecret: string | null;
  developerToken: string | null;
  refreshToken: string | null;
  loginCustomerId: string | null;
}): Promise<PolledGoogleAdsLead[]> {
  // TODO: implement real Google Ads API call (see doc comment above).
  // Steps:
  //   1. POST https://oauth2.googleapis.com/token to refresh the access token.
  //   2. POST https://googleads.googleapis.com/v17/customers/{loginCustomerId}/googleAds:searchStream
  //      with developer-token + Authorization headers to fetch lead_form_submission_data.
  //   3. Map results to PolledGoogleAdsLead[].
  void config; // placeholder until real implementation lands
  return [];
}

/**
 * POST /api/integrations/google-ads/poll
 * Polls the Google Ads API for new lead-form submissions and persists any
 * new leads (deduped by [tenantId, leadId]).
 *
 * Returns:
 *   200 { newLeads: <count>, lastPollAt: <ISO> }
 *   400 { newLeads: 0, error: 'Google Ads not configured' }
 *          — when the tenant has no config or is missing refresh token /
 *            developer token.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const config = await db.googleAdsLeadConfig.findUnique({
      where: { tenantId },
    });

    if (!config || !config.refreshToken || !config.developerToken) {
      return NextResponse.json(
        { newLeads: 0, error: 'Google Ads not configured' },
        { status: 400 }
      );
    }

    // Fetch new leads from the Google Ads API (stubbed for now).
    const polledLeads = await pollGoogleAdsLeads({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      developerToken: config.developerToken,
      refreshToken: config.refreshToken,
      loginCustomerId: config.loginCustomerId,
    });

    // Persist new leads, deduping on [tenantId, leadId]. Existing rows are
    // skipped (upsert with no-op update) — re-polling shouldn't overwrite a
    // lead that's already been worked / converted.
    let newCount = 0;
    for (const polled of polledLeads) {
      const result = await db.googleAdsLead.upsert({
        where: {
          tenantId_leadId: {
            tenantId,
            leadId: polled.leadId,
          },
        },
        create: {
          tenantId,
          leadId: polled.leadId,
          formId: polled.formId ?? null,
          formName: polled.formName ?? null,
          campaignId: polled.campaignId ?? null,
          campaignName: polled.campaignName ?? null,
          adGroupId: polled.adGroupId ?? null,
          resourceName: polled.resourceName ?? null,
          contactName: polled.contactName ?? null,
          email: polled.email ?? null,
          phone: polled.phone ?? null,
          postalCode: polled.postalCode ?? null,
          customFieldsJson: polled.customFieldsJson ?? '{}',
          rawDataJson: polled.rawDataJson ?? '{}',
          submittedAt: polled.submittedAt ?? null,
        },
        update: {},
      });
      // Prisma doesn't expose whether upsert actually inserted vs updated.
      // Detect "new" by comparing receivedAt (default now() on insert) to
      // createdAt — they're equal only on the insert path because both
      // default to now() together.
      if (result.receivedAt.getTime() === result.createdAt.getTime()) {
        newCount++;
      }
    }

    // Always stamp lastPollAt so the UI can show "last checked".
    const updatedConfig = await db.googleAdsLeadConfig.update({
      where: { tenantId },
      data: { lastPollAt: new Date() },
    });

    return NextResponse.json({
      newLeads: newCount,
      lastPollAt: updatedConfig.lastPollAt,
    });
  } catch (error) {
    console.error('Error polling Google Ads leads:', error);
    return NextResponse.json(
      { error: 'Failed to poll Google Ads leads' },
      { status: 500 }
    );
  }
}
