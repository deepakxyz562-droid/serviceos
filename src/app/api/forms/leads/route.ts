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
}

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

function mapFields(payload: Record<string, any>): ParsedLead {
  const mapped: ParsedLead = {};

  // Build a normalized lookup: lowercase key with - _ spaces stripped
  const normalized: Record<string, any> = {};
  const normalizedKeys: string[] = [];
  for (const [k, v] of Object.entries(payload)) {
    const nk = k.toLowerCase().replace(/[-_\s]/g, '');
    if (normalized[nk] === undefined) {
      normalized[nk] = v;
      normalizedKeys.push(nk);
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
        break;
      }
      if (payload[alias] !== undefined && payload[alias] !== '') {
        (mapped as any)[leadField] = payload[alias];
        // Also mark the normalized form as consumed
        const aliasNorm = alias.toLowerCase().replace(/[-_\s]/g, '');
        consumed.add(aliasNorm);
        break;
      }
    }
  }

  // Pass 2: substring fallback for prefixed field names.
  // Handles JotForm (q1_name), Typeform (field_123456789), Google Forms, and
  // other builders that prepend IDs to field names. Only runs for fields that
  // weren't matched in pass 1. Uses "ends with" matching to avoid false
  // positives. Skips keys already consumed in pass 1.
  for (const [leadField, aliases] of Object.entries(FIELD_MAP)) {
    if ((mapped as any)[leadField] !== undefined) continue;
    for (const alias of aliases) {
      const aliasNorm = alias.toLowerCase().replace(/[-_\s]/g, '');
      // Skip very short aliases (2 chars or less) to avoid false positives
      if (aliasNorm.length <= 2) continue;
      for (const nk of normalizedKeys) {
        if (consumed.has(nk)) continue;
        // Match if payload key ENDS with the alias (e.g., "q1name" ends with "name")
        if (nk.endsWith(aliasNorm) && nk.length > aliasNorm.length) {
          const val = normalized[nk];
          if (val !== undefined && val !== '') {
            (mapped as any)[leadField] = val;
            consumed.add(nk);
            break;
          }
        }
      }
      if ((mapped as any)[leadField] !== undefined) break;
    }
  }

  // Recurse into nested `data` object (JotForm / Typeform wrap payloads)
  if (payload.data && typeof payload.data === 'object' && !Array.isArray(payload.data)) {
    const nested = mapFields(payload.data);
    for (const [k, v] of Object.entries(nested)) {
      if (v !== undefined && (mapped as any)[k] === undefined) {
        (mapped as any)[k] = v;
      }
    }
  }

  // JotForm-specific: fields are like q1_name, q2_email, q3_phone
  // Extract from the `request` payload shape JotForm uses
  if (payload.request && typeof payload.request === 'object') {
    const nested = mapFields(payload.request);
    for (const [k, v] of Object.entries(nested)) {
      if (v !== undefined && (mapped as any)[k] === undefined) {
        (mapped as any)[k] = v;
      }
    }
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
  }

  if (!providedKey) {
    return NextResponse.json({
      status: 'ok',
      service: 'ServiceOS Universal Form Lead Capture',
      version: '1.0.0',
      message: 'API key required. Use Authorization: Bearer <key> or X-API-Key: <key>',
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
    }

    if (!providedKey) {
      return NextResponse.json(
        {
          error: 'API key required. Use Authorization: Bearer <key> or X-API-Key header',
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
    ].filter(Boolean);

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
        notesJson: JSON.stringify([
          {
            text: `Lead captured from ${source}${formName ? ` (${formName})` : ''}${pageUrl ? ` on ${pageUrl}` : ''}`,
            timestamp: new Date().toISOString(),
            auto: true,
          },
        ]),
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
