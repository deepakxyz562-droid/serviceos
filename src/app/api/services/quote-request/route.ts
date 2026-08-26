/**
 * POST /api/services/quote-request
 * ─────────────────────────────────────────────────────────────────────────
 * Receives a quote request from the /services/get-a-quote form and creates
 * a Lead in the "Fieseros Services" internal tenant's CRM.
 *
 * ARCHITECTURE (per Phase 3 design):
 *   - The Lead is created with STRUCTURED fields wherever the schema supports
 *     them (name, phone, email, source, serviceType, title, value).
 *   - notesJson holds the free-form metadata (current website, requirements,
 *     UTM attribution) as a JSON array — NOT abusing `description`.
 *   - tagsJson holds the industry + timeline as tags (JSON array of strings).
 *   - The Lead flows into the existing CRM pipeline (Lead → Deal → Quote →
 *     Invoice → Payment → Job). No new system — Fieseros dogfoods its own CRM.
 *
 * LEAD SOURCE TAXONOMY (per review direction):
 *   services_website     → from /services/website-development
 *   services_seo         → from /services/seo
 *   services_google_ads  → from /services/google-ads
 *   services_industry    → from /services/website-development/[industry]
 *   services_quote       → from /services/get-a-quote (generic / unknown referrer)
 *
 * RATE LIMIT: 3 requests per hour per IP (same pattern as resend-verification).
 *
 * EMAILS:
 *   1. Confirmation email to the visitor (sendServicesLeadConfirmation)
 *   2. Notification email to services@fieseros.com (sendServicesLeadNotification)
 *
 * No DB schema changes — uses existing Lead model fields only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAppUrl } from '@/lib/auth';
import { RateLimiter, applyRateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';
import {
  sendServicesLeadConfirmation,
  sendServicesLeadNotification,
} from '@/lib/emails/services-lead-emails';

export const dynamic = 'force-dynamic';

// 3 requests per hour per IP — same limiter pattern as the email-verification
// resend endpoint. Tight enough to prevent abuse, lenient enough for legitimate
// users who need to submit multiple requests.
const QUOTE_LIMITER = new RateLimiter(60 * 60 * 1000, 3);

// The Fieseros Services internal tenant (created in Phase 0).
// All service leads flow into this tenant's CRM.
const FIESEROS_SERVICES_TENANT_ID = 'fieseros_services_internal_001';

// Budget range → numeric value (for the Lead.value field).
// Used for pipeline reporting ("$X of services leads this month").
const BUDGET_VALUES: Record<string, number> = {
  'under-1000': 999,
  '1000-2500': 2000,
  '2500-5000': 4000,
  '5000-10000': 7500,
  '10000+': 15000,
};

function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isPhoneValid(phone: string): boolean {
  // Accept any string with at least 7 digits (international-friendly).
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 7;
}

/**
 * Determine the lead source based on the referrer context.
 * Per the lead-source taxonomy: services_website, services_seo,
 * services_google_ads, services_industry, services_quote.
 */
function resolveLeadSource(params: {
  service?: string;
  industry?: string;
  referrerPath?: string;
}): string {
  const { service, industry, referrerPath } = params;

  // If an industry is specified, it came from an industry-specific page.
  if (industry) return 'services_industry';

  // If we have a referrer path, use it to determine the source.
  if (referrerPath) {
    if (referrerPath.includes('/services/website-development')) return 'services_website';
    if (referrerPath.includes('/services/seo')) return 'services_seo';
    if (referrerPath.includes('/services/google-ads')) return 'services_google_ads';
  }

  // Fall back to the service field if available.
  if (service === 'website') return 'services_website';
  if (service === 'seo') return 'services_seo';
  if (service === 'google_ads') return 'services_google_ads';

  // Default — generic quote form submission.
  return 'services_quote';
}

export async function POST(request: NextRequest) {
  // Rate limit before any DB work.
  const limited = applyRateLimit(QUOTE_LIMITER, request);
  if (limited) {
    return rateLimitResponse(limited.resetAtMs);
  }

  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      email,
      phone,
      businessName,
      service,
      industry,
      budget,
      timeline,
      currentWebsite,
      requirements,
      utm,
    } = body as {
      name?: string;
      email?: string;
      phone?: string;
      businessName?: string;
      service?: string;
      industry?: string;
      budget?: string;
      timeline?: string;
      currentWebsite?: string;
      requirements?: string;
      utm?: { source?: string; medium?: string; campaign?: string };
    };

    // ── Validate required fields ──────────────────────────────────────────
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Your name is required.' }, { status: 400 });
    }
    if (!email || !isEmailValid(email)) {
      return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
    }
    if (!phone || !isPhoneValid(phone)) {
      return NextResponse.json({ error: 'A valid phone number is required.' }, { status: 400 });
    }
    if (!businessName || !businessName.trim()) {
      return NextResponse.json({ error: 'Business name is required.' }, { status: 400 });
    }

    // Determine the lead source from the referrer context.
    const referrerHeader = request.headers.get('referer') || '';
    const referrerPath = referrerHeader ? (() => {
      try { return new URL(referrerHeader).pathname; } catch { return ''; }
    })() : '';
    const leadSource = resolveLeadSource({
      service,
      industry,
      referrerPath,
    });

    // Map service to a human-readable label for the Lead title.
    const serviceLabel =
      service === 'website' ? 'Website Development' :
      service === 'seo' ? 'SEO' :
      service === 'google_ads' ? 'Google Ads' :
      'Services';

    // Map budget range to a numeric value (for Lead.value — pipeline reporting).
    const numericValue = budget ? (BUDGET_VALUES[budget] || 0) : 0;

    // Build the Lead title.
    const title = `[${serviceLabel}] ${businessName.trim()}`;

    // ── Build structured tags (tagsJson) ──────────────────────────────────
    // tagsJson is a JSON array of strings.
    const tags: string[] = [];
    if (industry) tags.push(industry);
    if (timeline) tags.push(timeline);
    if (budget) tags.push(budget);

    // ── Build notes (notesJson) ───────────────────────────────────────────
    // notesJson is a JSON array of note objects. We add one note with all
    // the free-form metadata (current website, requirements, UTM).
    const notes: Array<{ text: string; type: string; createdAt: string }> = [];
    const noteParts: string[] = [];
    if (currentWebsite) noteParts.push(`Current website: ${currentWebsite}`);
    if (requirements) noteParts.push(`Requirements: ${requirements}`);
    if (utm?.source) noteParts.push(`UTM source: ${utm.source}`);
    if (utm?.medium) noteParts.push(`UTM medium: ${utm.medium}`);
    if (utm?.campaign) noteParts.push(`UTM campaign: ${utm.campaign}`);
    if (noteParts.length > 0) {
      notes.push({
        text: noteParts.join('\n'),
        type: 'services_quote_metadata',
        createdAt: new Date().toISOString(),
      });
    }

    // ── Create the Lead in the Fieseros Services tenant ───────────────────
    // Uses STRUCTURED fields only — no JSON-in-description.
    const lead = await db.lead.create({
      data: {
        title,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim().toLowerCase(),
        source: leadSource,
        serviceType: service || undefined,
        status: 'new',
        priority: 'high',
        value: numericValue,
        tenantId: FIESEROS_SERVICES_TENANT_ID,
        tagsJson: JSON.stringify(tags),
        notesJson: JSON.stringify(notes),
      },
    });

    logger.info(
      { component: 'services-quote', leadId: lead.id, leadSource, businessName, service },
      'Services lead created',
    );

    // ── Send emails (non-blocking) ────────────────────────────────────────
    const appUrl = getAppUrl(request);
    const emailCtx = {
      visitorName: name.trim(),
      visitorEmail: email.trim().toLowerCase(),
      visitorPhone: phone.trim(),
      businessName: businessName.trim(),
      service: service || 'services',
      industry,
      budget,
      timeline,
      currentWebsite,
      requirements,
      leadId: lead.id,
      appUrl,
    };

    // Send both emails in parallel — non-blocking (errors are logged, not thrown).
    await Promise.allSettled([
      sendServicesLeadConfirmation(emailCtx),
      sendServicesLeadNotification(emailCtx),
    ]);

    return NextResponse.json({
      ok: true,
      leadId: lead.id,
      message: 'Your request has been submitted. We\'ll be in touch within 1 business day.',
    });
  } catch (error) {
    console.error('[POST /api/services/quote-request] error:', error);
    return NextResponse.json(
      { error: 'Failed to submit your request. Please try again.' },
      { status: 500 },
    );
  }
}
