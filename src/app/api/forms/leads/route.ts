import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendJobNotification } from '@/lib/whatsapp-notifications';
import { EventBus } from '@/lib/event-bus';

// ─── Universal Form Lead Capture Endpoint ──────────────────────────────────
//
// Accepts form submissions from ANY source:
//   • Embedded JS script (public/embed.js) on static/React/Next.js/PHP sites
//   • JotForm / Typeform / Google Forms webhooks
//   • Custom server-to-server POST (fetch/curl/PHP)
//   • WordPress plugin (backward-compatible with /api/wordpress/leads)
//
// Authentication:
//   Authorization: Bearer <api_key>   (server-side, preferred)
//   X-API-Key: <api_key>              (client-side embed script)
//   ?key=<api_key>                    (query param — for JotForm webhooks)
//
// Why query-param auth? JotForm webhooks cannot send custom HTTP headers.
// JotForm only allows you to paste a webhook URL — no headers, no body
// customization. To accept JotForm submissions directly, the API key MUST
// ride in the URL's query string. Header auth remains the default for all
// other integrations; query-param auth is a fallback used only when no
// header key is present (so logs/curl with headers keep working).
//
// The API key maps to a WebhookEndpoint record with source='webform'
// (or source='wordpress' for backward compatibility).
//
// CORS: fully open (Access-Control-Allow-Origin: *) so the embed script can
// call this from any domain. Rate limiting is handled at the WebhookEndpoint
// level (totalReceived / lastReceived tracking).

// ─── CORS helpers ──────────────────────────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  'Access-Control-Max-Age': '86400',
};

// ─── Field mapping ─────────────────────────────────────────────────────────
// Each lead field has a list of aliases. The mapper normalizes keys
// (lowercase, strip - _ spaces) and tries to match. This captures the vast
// majority of real-world form field naming conventions.

const FIELD_MAP: Record<string, string[]> = {
  name: [
    'your-name', 'your_name', 'name', 'full_name', 'fullname', 'contact_name',
    'customer_name', 'visitor_name', 'first-name', 'first_name', 'firstname',
    'fname', 'client_name', 'username', 'user_name', 'who', 'from',
  ],
  phone: [
    'your-phone', 'your_phone', 'phone', 'mobile', 'cell', 'telephone',
    'phone_number', 'contact_phone', 'phone-number', 'phonenumber', 'tel',
    'telephone_number', 'contact_number', 'whatsapp', 'whatsapp_number',
    'mobile_number', 'cellphone', 'phone_no',
  ],
  email: [
    'your-email', 'your_email', 'email', 'email_address', 'contact_email',
    'emailaddress', 'e-mail', 'email_id', 'mailto', 'user_email',
  ],
  address: [
    'your-address', 'your_address', 'address', 'street', 'location',
    'full_address', 'street-address', 'city', 'addr', 'location_address',
    'home_address', 'billing_address',
  ],
  serviceType: [
    'your-subject', 'your_subject', 'subject', 'service', 'service_type',
    'inquiry_type', 'inquiry-type', 'service_requested', 'request_type',
    'topic', 'category', 'department', 'interest', 'what_service',
  ],
  description: [
    'your-message', 'your_message', 'message', 'description', 'notes',
    'comments', 'body', 'details', 'msg', 'enquiry', 'inquiry', 'question',
    'comment', 'feedback', 'body_text', 'text',
  ],
  scheduledAt: [
    'preferred-date', 'preferred_date', 'date', 'booking_date', 'appointment_date',
    'service_date', 'preferred_date_time',
  ],
  scheduledTime: [
    'preferred-time', 'preferred_time', 'time', 'booking_time', 'appointment_time',
    'service_time',
  ],
  value: [
    'budget', 'value', 'amount', 'quote_amount', 'estimated_value', 'price',
    'project_budget',
  ],
  company: [
    'company', 'company_name', 'business', 'business_name', 'organization',
    'organisation', 'org',
  ],
};

interface ParsedLead {
  name?: string;
  phone?: string;
  email?: string | null;
  address?: string | null;
  serviceType?: string | null;
  description?: string | null;
  scheduledAt?: string | null;
  scheduledTime?: string | null;
  value?: number;
  company?: string | null;
  // All unmapped raw form fields (preserved for completeness — stored into
  // notesJson + a readable summary appended to `description`).
  rawFields?: Record<string, string>;
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Keys that are purely metadata/internal (not real form fields submitted by
// the user). These are excluded from the raw-fields capture so the notesJson
// "extra fields" section stays focused on actual user input.
const META_KEYS = new Set([
  'requestid', 'submissionid', 'formid', 'form_id', 'pretty',
  '_source_url', '_page_url', '_page_title', '_user_agent',
  '_form_title', '_form_name', '_form_plugin', 'form_name', 'form_plugin',
  'page_url', 'page_title', 'referrer', 'googleformid',
  '_source', 'source', 'ip', 'useragent', 'user_agent',
]);

// JotForm wraps form fields in a `rawRequest` object and uses numbered keys
// like `q1_name`, `q2_email4`, `q3_phone`. We strip the `qN_` / `qN` prefix
// before matching so the alias table can find them.
function stripJotformPrefix(key: string): string {
  // q1_name → name, q2_email4 → email4, q3_phone → phone
  return key.replace(/^q\d+[\s_-]*/i, '');
}

function mapFields(payload: Record<string, any>): ParsedLead {
  const mapped: ParsedLead = {};
  const rawFields: Record<string, string> = {};
  // Track every ORIGINAL key (and its stripped+normalized form) that was
  // consumed by the alias matcher, so the raw-fields collector doesn't
  // re-capture them. This set is shared across recursion so a field consumed
  // inside `rawRequest` is not re-added at the outer level.
  const consumedOriginalKeys = new Set<string>();

  // Build a normalized lookup: lowercase key with - _ spaces stripped.
  // For JotForm keys like `q1_name`, we ALSO register the stripped form
  // (`name`) so the alias table can match it directly.
  const normalized: Record<string, any> = {};
  const normalizedKeys: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    const nk = k.toLowerCase().replace(/[-_\s]/g, '');
    if (normalized[nk] === undefined) {
      normalized[nk] = v;
      normalizedKeys.push(nk);
    }
    // JotForm prefix-stripped form: q1_name → name
    const stripped = stripJotformPrefix(k).toLowerCase().replace(/[-_\s]/g, '');
    if (stripped && stripped !== nk && normalized[stripped] === undefined) {
      normalized[stripped] = v;
      normalizedKeys.push(stripped);
    }
    // Keep original too for exact matching
    if (payload[k] !== undefined && normalized[k] === undefined) normalized[k] = v;
  }

  // Track which normalized keys have been consumed so a single source field
  // doesn't map to multiple lead fields (e.g., "emailAddress" should only map
  // to `email`, not also to `address` via the ends-with fallback).
  const consumed = new Set<string>();

  // Pass 1: exact normalized match (highest confidence)
  for (const [leadField, aliases] of Object.entries(FIELD_MAP)) {
    if ((mapped as any)[leadField] !== undefined) continue;
    for (const alias of aliases) {
      const nk = alias.toLowerCase().replace(/[-_\s]/g, '');
      if (normalized[nk] !== undefined && normalized[nk] !== '' && !consumed.has(nk)) {
        (mapped as any)[leadField] = normalized[nk];
        consumed.add(nk);
        // Also mark every original key whose normalized/stripped form matches
        // this alias, so they're not re-captured as raw fields.
        for (const ok of Object.keys(payload)) {
          const onk = ok.toLowerCase().replace(/[-_\s]/g, '');
          const osk = stripJotformPrefix(ok).toLowerCase().replace(/[-_\s]/g, '');
          if (onk === nk || osk === nk) consumedOriginalKeys.add(ok);
        }
        break;
      }
      if (payload[alias] !== undefined && payload[alias] !== '') {
        (mapped as any)[leadField] = payload[alias];
        // Also mark the normalized form as consumed
        const aliasNorm = alias.toLowerCase().replace(/[-_\s]/g, '');
        consumed.add(aliasNorm);
        consumedOriginalKeys.add(alias);
        break;
      }
    }
  }

  // Pass 2: substring fallback for prefixed field names.
  // Handles JotForm (q1_name, q2_email4), Typeform (field_123456789), Google
  // Forms, and other builders that prepend IDs to field names. Only runs for
  // fields that weren't matched in pass 1. Uses both "ends with" and
  // "alias + trailing digits" matching (e.g., `email4` matches alias `email`).
  // Skips keys already consumed in pass 1.
  for (const [leadField, aliases] of Object.entries(FIELD_MAP)) {
    if ((mapped as any)[leadField] !== undefined) continue;
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase().replace(/[-_\s]/g, '');
      // Skip very short aliases (2 chars or less) to avoid false positives
      if (aliasNorm.length <= 2) continue;
      for (const nk of normalizedKeys) {
        if (consumed.has(nk)) continue;
        if (nk.length <= aliasNorm.length) continue;
        // Match A: payload key ENDS with the alias (e.g., "q1name" ends with "name")
        const endsMatch = nk.endsWith(aliasNorm);
        // Match B: payload key is alias + trailing digits (e.g., "email4" matches "email")
        // This is JotForm's pattern: q2_email4 → stripped "email4" → alias "email" + "4"
        const aliasDigitsMatch = new RegExp('^' + aliasNorm + '\\d+$', 'i').test(nk);
        if (endsMatch || aliasDigitsMatch) {
          const val = normalized[nk];
          if (val !== undefined && val !== '') {
            (mapped as any)[leadField] = val;
            consumed.add(nk);
            // Mark every original key whose normalized/stripped form is `nk`,
            // so the raw collector skips them.
            for (const ok of Object.keys(payload)) {
              const onk = ok.toLowerCase().replace(/[-_\s]/g, '');
              const osk = stripJotformPrefix(ok).toLowerCase().replace(/[-_\s]/g, '');
              if (onk === nk || osk === nk) consumedOriginalKeys.add(ok);
            }
            break;
          }
        }
      }
      if ((mapped as any)[leadField] !== undefined) break;
    }
  }

  // Recurse into nested `data` object (Typeform / generic wrappers)
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    const nested = mapFields(payload.data);
    for (const [k, v] of Object.entries(nested)) {
      if (k === 'rawFields') continue;
      if (v !== undefined && (mapped as any)[k] === undefined) {
        (mapped as any)[k] = v;
      }
    }
    if (nested.rawFields) {
      for (const [k, v] of Object.entries(nested.rawFields)) {
        if (rawFields[k] === undefined) rawFields[k] = v;
      }
    }
  }

  // ─── JotForm `rawRequest` (the actual form-field container) ───────────────
  // JotForm wraps ALL submitted form fields inside `rawRequest`. Without this
  // recursion, those fields are invisible to the mapper and the lead is
  // created with empty name/email/phone.
  if (payload.rawRequest && typeof payload.rawRequest === 'object' && !Array.isArray(payload.rawRequest)) {
    const nested = mapFields(payload.rawRequest);
    for (const [k, v] of Object.entries(nested)) {
      if (k === 'rawFields') continue;
      if (v !== undefined && (mapped as any)[k] === undefined) {
        (mapped as any)[k] = v;
      }
    }
    if (nested.rawFields) {
      for (const [k, v] of Object.entries(nested.rawFields)) {
        if (rawFields[k] === undefined) rawFields[k] = v;
      }
    }
    // Mark rawRequest's original keys that were consumed inside the recursion
    // so the outer collectRaw() below does NOT re-add them. We detect
    // consumption by checking that the nested mapFields call already mapped
    // them (i.e., they're absent from nested.rawFields).
    for (const ok of Object.keys(payload.rawRequest)) {
      const osk = stripJotformPrefix(ok).toLowerCase().replace(/[-_\s]/g, '');
      // If the stripped key matches a known alias AND the nested call mapped
      // it, mark it as consumed at the outer level. Uses the same Match A
      // (endsWith) + Match B (alias + trailing digits) logic as pass 2.
      const matchedAlias = Object.values(FIELD_MAP).flat().some((alias) => {
        const aliasNorm = alias.toLowerCase().replace(/[-_\s]/g, '');
        if (aliasNorm.length <= 2) return false;
        if (aliasNorm === osk) return true;
        if (osk.endsWith(aliasNorm) && osk.length > aliasNorm.length) return true;
        if (new RegExp('^' + aliasNorm + '\\d+$', 'i').test(osk)) return true;
        return false;
      });
      if (matchedAlias) {
        // Was it consumed (not in nested.rawFields)?
        const displayKey = stripJotformPrefix(ok);
        const wasConsumed = !nested.rawFields || nested.rawFields[displayKey] === undefined;
        if (wasConsumed) {
          consumedOriginalKeys.add(ok);
        }
      }
    }
  }

  // Legacy JotForm `request` shape (older integrations)
  if (payload.request && typeof payload.request === 'object' && !Array.isArray(payload.request)) {
    const nested = mapFields(payload.request);
    for (const [k, v] of Object.entries(nested)) {
      if (k === 'rawFields') continue;
      if (v !== undefined && (mapped as any)[k] === undefined) {
        (mapped as any)[k] = v;
      }
    }
    if (nested.rawFields) {
      for (const [k, v] of Object.entries(nested.rawFields)) {
        if (rawFields[k] === undefined) rawFields[k] = v;
      }
    }
  }

  // ─── Capture ALL unmapped raw fields ─────────────────────────────────────
  // Walk every top-level + rawRequest key. Anything that (a) is not metadata,
  // (b) is a primitive value, and (c) was NOT consumed by the alias mapper
  // gets preserved in `rawFields`. This is what gets stored into notesJson
  // and appended (as a readable summary) to the lead's `description`.
  const collectRaw = (obj: Record<string, any>, keyPrefix = '') => {
    for (const [k, v] of Object.entries(obj)) {
      const nk = k.toLowerCase().replace(/[-_\s]/g, '');
      if (consumed.has(nk)) continue;
      if (consumedOriginalKeys.has(k)) continue;
      if (META_KEYS.has(nk) || META_KEYS.has(k.toLowerCase())) continue;
      // Skip structural wrappers (we've already recursed into them above)
      if (k === 'data' || k === 'request' || k === 'rawRequest') continue;
      // Skip nested objects/arrays — only capture primitives
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') continue;
      const strVal = String(v).trim();
      if (!strVal) continue;
      // Strip the qN_ prefix for readability: "q5_howdidyouhear" → "howdidyouhear"
      const displayKey = keyPrefix
        ? `${keyPrefix}.${stripJotformPrefix(k)}`
        : stripJotformPrefix(k);
      if (rawFields[displayKey] === undefined) {
        rawFields[displayKey] = strVal;
      }
    }
  };
  collectRaw(payload);
  if (payload.rawRequest && typeof payload.rawRequest === 'object' && !Array.isArray(payload.rawRequest)) {
    collectRaw(payload.rawRequest);
  }

  if (Object.keys(rawFields).length > 0) {
    mapped.rawFields = rawFields;
  }

  return mapped;
}

function calculateLeadScore(data: ParsedLead): number {
  let score = 35;
  if (data.phone) score += 20;
  if (data.email) score += 15;
  if (data.serviceType) score += 15;
  if (data.description) score += 10;
  if (data.address) score += 5;
  return Math.min(score, 100);
}

function replaceTemplateVars(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return String(data[key] ?? match);
  });
}

// Detect the form source from the payload
function detectSource(payload: Record<string, any>): string {
  const formPlugin = payload._form_plugin || payload.form_plugin;
  if (formPlugin) return formPlugin;

  // JotForm sends formID and a specific structure
  if (payload.formID || payload.form_id || payload._form_plugin === 'jotform') {
    return 'jotform';
  }

  // Typeform sends a form_response object
  if (payload.form_response) return 'typeform';

  // Google Forms (via Apps Script) typically include googleFormId
  if (payload.googleFormId || payload._source === 'google-forms') {
    return 'google-forms';
  }

  return 'webform';
}

// ─── OPTIONS: CORS preflight ───────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// ─── GET: health check / connection test ───────────────────────────────────

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const xApiKey = request.headers.get('x-api-key');
  let providedKey = '';

  if (authHeader?.startsWith('Bearer ')) {
    providedKey = authHeader.slice(7).trim();
  } else if (xApiKey) {
    providedKey = xApiKey.trim();
  } else {
    // Fallback: ?key=<apikey> query param.
    // Required for JotForm webhooks — JotForm cannot send custom headers,
    // so the API key must ride in the URL. Only used when no header key is
    // present (so callers using headers are unaffected).
    const url = new URL(request.url);
    const queryKey = url.searchParams.get('key');
    if (queryKey) {
      providedKey = queryKey.trim();
    }
  }

  if (!providedKey) {
    return NextResponse.json({
      status: 'ok',
      service: 'ServiceOS Universal Form Lead Capture',
      version: '1.0.0',
      message: 'API key required. Use Authorization: Bearer <key>, X-API-Key header, or ?key=<key> query param',
      features: [
        'lead_creation',
        'auto_customer',
        'whatsapp_owner_notification',
        'whatsapp_user_notification',
        'ai_generated_messages',
        'universal_field_mapping',
      ],
    }, { headers: CORS_HEADERS });
  }

  const keyHash = await hashApiKey(providedKey);
  const endpoint = await db.webhookEndpoint.findFirst({
    where: {
      apiKeyHash: keyHash,
      source: { in: ['webform', 'wordpress'] },
    },
    select: {
      name: true,
      endpointId: true,
      active: true,
      totalReceived: true,
      lastReceived: true,
      lastError: true,
      sendWhatsApp: true,
      whatsappOwnerPhone: true,
      whatsappOwnerTemplate: true,
      whatsappUserTemplate: true,
      whatsappAiGenerated: true,
      fieldMapping: true,
      autoCreateCustomer: true,
      createdAt: true,
    },
  });

  if (!endpoint) {
    return NextResponse.json(
      { status: 'error', error: 'Invalid API key' },
      { status: 403, headers: CORS_HEADERS }
    );
  }

  return NextResponse.json({
    status: 'connected',
    endpoint: {
      name: endpoint.name,
      active: endpoint.active,
      totalReceived: endpoint.totalReceived,
      lastReceived: endpoint.lastReceived,
      sendWhatsApp: endpoint.sendWhatsApp,
      whatsappOwnerPhone: endpoint.whatsappOwnerPhone ? '***configured***' : 'not set',
      whatsappUserTemplate: endpoint.whatsappUserTemplate ? '***configured***' : 'not set',
      whatsappAiGenerated: endpoint.whatsappAiGenerated,
      autoCreateCustomer: endpoint.autoCreateCustomer,
      fieldMapping: (() => {
        try {
          return JSON.parse(endpoint.fieldMapping);
        } catch {
          return {};
        }
      })(),
    },
    message: 'Connection successful! Your form integration is properly configured.',
  }, { headers: CORS_HEADERS });
}

// ─── POST: create lead from form submission ────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ─── 1. Authenticate ────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const xApiKey = request.headers.get('x-api-key');
    let providedKey = '';

    if (authHeader?.startsWith('Bearer ')) {
      providedKey = authHeader.slice(7).trim();
    } else if (xApiKey) {
      providedKey = xApiKey.trim();
    } else {
      // Fallback: ?key=<apikey> query param.
      // Required for JotForm webhooks — JotForm cannot send custom HTTP
      // headers, so the API key must ride in the URL. Only used when no
      // header key is present, so callers using headers keep working.
      const url = new URL(request.url);
      const queryKey = url.searchParams.get('key');
      if (queryKey) {
        providedKey = queryKey.trim();
      }
    }

    if (!providedKey) {
      return NextResponse.json(
        {
          error: 'API key required. Use Authorization: Bearer <key>, X-API-Key header, or ?key=<key> query param',
          code: 'AUTH_REQUIRED',
        },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    const keyHash = await hashApiKey(providedKey);
    const endpoint = await db.webhookEndpoint.findFirst({
      where: {
        apiKeyHash: keyHash,
        source: { in: ['webform', 'wordpress'] },
        active: true,
      },
    });

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Invalid API key or inactive endpoint', code: 'AUTH_FAILED' },
        { status: 403, headers: CORS_HEADERS }
      );
    }

    // ─── 2. Parse payload ───────────────────────────────────────────────
    let payload: Record<string, any>;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = {};
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      try {
        payload = await request.json();
      } catch {
        // Body wasn't JSON — try form-encoded as fallback
        try {
          const text = await request.text();
          payload = {};
          new URLSearchParams(text).forEach((v, k) => {
            payload[k] = v;
          });
        } catch {
          return NextResponse.json(
            { error: 'Could not parse request body. Send JSON or form-encoded data.', code: 'PARSE_ERROR' },
            { status: 400, headers: CORS_HEADERS }
          );
        }
      }
    }

    // ─── 3. Map fields ──────────────────────────────────────────────────
    const mapped = mapFields(payload);

    // Apply custom field mapping from endpoint config
    try {
      const customMapping = JSON.parse(endpoint.fieldMapping || '{}') as Record<string, string>;
      for (const [srcField, leadField] of Object.entries(customMapping)) {
        if (payload[srcField] !== undefined && !(mapped as any)[leadField]) {
          (mapped as any)[leadField] = payload[srcField];
        }
      }
    } catch {
      // ignore bad JSON in fieldMapping
    }

    // ─── 3a. Build a readable summary of raw/unmapped fields ─────────────
    // Appended to `description` so users see them immediately in the lead
    // detail view; also stored structured in notesJson below.
    //
    // Also includes mapped fields that don't have a dedicated Lead column
    // (scheduledAt, scheduledTime, company) — these are extracted by the
    // alias matcher but never stored on the Lead record, so we surface them
    // here to avoid silent data loss.
    const rawFields: Record<string, string> = { ...(mapped.rawFields || {}) };
    if (mapped.scheduledAt && !rawFields.scheduledAt) rawFields.scheduledAt = String(mapped.scheduledAt);
    if (mapped.scheduledTime && !rawFields.scheduledTime) rawFields.scheduledTime = String(mapped.scheduledTime);
    if (mapped.company && !rawFields.company) rawFields.company = String(mapped.company);
    const rawFieldEntries = Object.entries(rawFields);
    const rawFieldsSummary = rawFieldEntries.length > 0
      ? rawFieldEntries.map(([k, v]) => `${k}: ${String(v).slice(0, 200)}`).join('; ')
      : '';

    // ─── 4. Validate ────────────────────────────────────────────────────
    if (!mapped.name && !mapped.phone) {
      return NextResponse.json(
        {
          error: 'Missing required fields: at least name or phone is required',
          code: 'MISSING_FIELDS',
          receivedFields: Object.keys(payload),
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    // ─── 5. Create lead ─────────────────────────────────────────────────
    const leadScore = calculateLeadScore(mapped);
    const source = detectSource(payload);
    const formName = payload._form_name || payload.form_name || payload._form_title || '';
    const pageUrl = payload._source_url || payload._page_url || payload.page_url || payload.referrer || '';
    const pageTitle = payload._page_title || payload.page_title || '';

    const descriptionParts = [
      mapped.description ? String(mapped.description) : '',
      formName ? `Form: ${formName}` : '',
      pageUrl ? `Page: ${pageUrl}` : '',
      pageTitle ? `Page Title: ${pageTitle}` : '',
      `Source: ${source}`,
      // Append a readable summary of all raw/unmapped form fields so users
      // see them immediately in the lead detail view.
      rawFieldsSummary ? `Extra Fields: ${rawFieldsSummary}` : '',
    ].filter(Boolean);

    const leadNotes: any[] = [
      {
        text: `Lead captured from ${source}${formName ? ` (${formName})` : ''}${pageUrl ? ` on ${pageUrl}` : ''}`,
        timestamp: new Date().toISOString(),
        auto: true,
      },
    ];
    // Store the structured raw payload so it's machine-readable for future
    // UI work (e.g., a dedicated "Raw Form Fields" panel in the lead detail).
    if (rawFieldEntries.length > 0) {
      leadNotes.push({
        text: 'Raw form fields submitted',
        timestamp: new Date().toISOString(),
        auto: true,
        type: 'raw_fields',
        data: rawFields,
      });
    }

    const lead = await db.lead.create({
      data: {
        name: String(mapped.name || 'Unknown'),
        phone: String(mapped.phone || ''),
        email: mapped.email ? String(mapped.email) : null,
        source,
        status: 'new',
        priority: leadScore > 70 ? 'high' : leadScore > 40 ? 'medium' : 'low',
        value: mapped.value ? Number(mapped.value) : 0,
        description: descriptionParts.join(' | '),
        address: mapped.address ? String(mapped.address) : null,
        serviceType: mapped.serviceType ? String(mapped.serviceType) : null,
        tenantId: endpoint.tenantId,
        tagsJson: JSON.stringify([
          source,
          `score:${leadScore}`,
          ...(mapped.company ? [`company:${mapped.company}`] : []),
        ]),
        notesJson: JSON.stringify(leadNotes),
      },
    });

    // ─── 6. Auto-create customer ────────────────────────────────────────
    try {
      if (endpoint.autoCreateCustomer && mapped.phone) {
        const existingCustomer = await db.customer.findFirst({
          where: { phone: String(mapped.phone) },
        });
        if (!existingCustomer) {
          await db.customer.create({
            data: {
              name: String(mapped.name || 'Unknown'),
              phone: String(mapped.phone),
              email: mapped.email ? String(mapped.email) : null,
              address: mapped.address ? String(mapped.address) : null,
              workspaceId: endpoint.workspaceId,
            },
          });
        }
      }
    } catch (custErr) {
      console.error('[forms/leads] Customer auto-create failed:', custErr);
    }

    // ─── 7. Send WhatsApp to owner if configured ───────────────────────
    let ownerWhatsappResult: Record<string, unknown> | null = null;
    if (endpoint.sendWhatsApp) {
      try {
        const ownerPhone = endpoint.whatsappOwnerPhone;

        if (ownerPhone) {
          const ownerTemplate = endpoint.whatsappOwnerTemplate || '';
          const ownerMessage = ownerTemplate
            ? replaceTemplateVars(ownerTemplate, {
                name: mapped.name || 'Unknown',
                phone: mapped.phone || '',
                email: mapped.email || '',
                serviceType: mapped.serviceType || '',
                description: mapped.description || '',
                leadId: lead.id,
                source,
                score: leadScore,
              })
            : [
                `🔔 New Lead from ${source}`,
                '',
                `Name: ${mapped.name || 'Unknown'}`,
                `Phone: ${mapped.phone || 'N/A'}`,
                mapped.email ? `Email: ${mapped.email}` : '',
                mapped.serviceType ? `Service: ${mapped.serviceType}` : '',
                mapped.description
                  ? `Message: ${String(mapped.description).slice(0, 200)}`
                  : '',
                '',
                `Priority: ${leadScore > 70 ? 'High' : leadScore > 40 ? 'Medium' : 'Low'} (Score: ${leadScore})`,
                `Lead ID: ${lead.id}`,
              ].filter(Boolean).join('\n');

          await sendJobNotification({
            to: ownerPhone,
            message: ownerMessage,
            recipientName: 'Owner',
            recipientRole: 'manager' as 'customer',
            subject: `New ${source} Lead: ${mapped.name || 'Unknown'}`,
            tenantId: endpoint.tenantId || undefined,
          });

          ownerWhatsappResult = { success: true, to: ownerPhone };
        } else if (endpoint.tenantId) {
          // Fallback: tenant's WhatsApp phone
          const tenant = await db.tenant.findUnique({ where: { id: endpoint.tenantId } });
          if (tenant?.whatsappPhone) {
            const ownerMessage = [
              `🔔 New Lead from ${source}`,
              '',
              `Name: ${mapped.name || 'Unknown'}`,
              `Phone: ${mapped.phone || 'N/A'}`,
              mapped.email ? `Email: ${mapped.email}` : '',
              mapped.serviceType ? `Service: ${mapped.serviceType}` : '',
              '',
              `Lead ID: ${lead.id}`,
            ].filter(Boolean).join('\n');

            await sendJobNotification({
              to: tenant.whatsappPhone,
              message: ownerMessage,
              recipientName: 'Owner',
              recipientRole: 'manager' as 'customer',
              subject: `New ${source} Lead: ${mapped.name || 'Unknown'}`,
              tenantId: endpoint.tenantId,
            });

            ownerWhatsappResult = { success: true, to: tenant.whatsappPhone, fallback: true };
          }
        }

        if (!ownerWhatsappResult) {
          ownerWhatsappResult = {
            success: false,
            error: 'No owner WhatsApp phone configured on endpoint or tenant',
          };
        }
      } catch (err) {
        console.error('[forms/leads] Owner WhatsApp failed:', err);
        ownerWhatsappResult = { success: false, error: String(err) };
      }
    }

    // ─── 8. Send WhatsApp to form submitter if configured ──────────────
    let userWhatsappResult: Record<string, unknown> | null = null;
    const userPhone = mapped.phone ? String(mapped.phone) : '';
    const userName = mapped.name || 'there';

    if (userPhone) {
      try {
        const userTemplate = endpoint.whatsappUserTemplate || '';

        if (userTemplate || endpoint.whatsappAiGenerated) {
          let userMessage = '';

          if (userTemplate) {
            userMessage = replaceTemplateVars(userTemplate, {
              name: userName,
              serviceType: mapped.serviceType || '',
              source,
            });
          }

          if (endpoint.whatsappAiGenerated) {
            try {
              const aiResponse = await fetch(
                '/api/ai/suggest-nodes?XTransformPort=3000',
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    prompt: `Generate a brief, friendly WhatsApp confirmation message for a new lead. Lead name: "${userName}". Service: "${mapped.serviceType || 'General inquiry'}". Source: ${source} form. Keep it under 200 characters. Only return the message text.`,
                  }),
                }
              );

              if (aiResponse.ok) {
                const aiData = await aiResponse.json();
                if (aiData.message || aiData.suggestion) {
                  userMessage = aiData.message || aiData.suggestion;
                }
              }
            } catch (aiErr) {
              console.error('[forms/leads] AI WhatsApp generation failed:', aiErr);
            }
          }

          if (userMessage) {
            await sendJobNotification({
              to: userPhone,
              message: userMessage,
              recipientName: userName,
              recipientRole: 'customer',
              subject: 'Lead submission received',
              tenantId: endpoint.tenantId || undefined,
            });

            userWhatsappResult = { success: true, to: userPhone };
          }
        }
      } catch (err) {
        console.error('[forms/leads] User WhatsApp failed:', err);
        userWhatsappResult = { success: false, error: String(err) };
      }
    }

    // ─── 9. Emit lead.created event ─────────────────────────────────────
    try {
      await EventBus.emit('lead.created', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        tenantId: lead.tenantId,
      });
    } catch (eventErr) {
      console.error('[forms/leads] EventBus emit failed:', eventErr);
    }

    // ─── 10. Update endpoint stats ──────────────────────────────────────
    try {
      await db.webhookEndpoint.update({
        where: { id: endpoint.id },
        data: {
          totalReceived: { increment: 1 },
          lastReceived: new Date(),
        },
      });
    } catch {
      // non-fatal
    }

    // ─── 11. Log ────────────────────────────────────────────────────────
    try {
      await db.webhookEndpointLog.create({
        data: {
          webhookEndpointId: endpoint.id,
          source,
          sourceIp:
            request.headers.get('x-forwarded-for') ||
            request.headers.get('x-real-ip') ||
            null,
          payloadJson: JSON.stringify(payload).slice(0, 10000),
          leadId: lead.id,
          status: 'processed',
          processingMs: Date.now() - startTime,
        },
      });
    } catch {
      // non-fatal
    }

    return NextResponse.json(
      {
        success: true,
        leadId: lead.id,
        leadName: lead.name,
        message: 'Lead created successfully',
        source,
        whatsapp: {
          owner: ownerWhatsappResult,
          user: userWhatsappResult,
        },
        processingMs: Date.now() - startTime,
      },
      { status: 201, headers: CORS_HEADERS }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to process lead';
    console.error('[/api/forms/leads] Error:', error);
    return NextResponse.json(
      { error: message, code: 'INTERNAL_ERROR' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
