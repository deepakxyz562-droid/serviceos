import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── Universal Webhook Ingest Endpoint ──────────────────────────────────────
// Receives inbound webhooks from any source (WordPress, Zapier, custom forms)
// Authenticates via API key (Bearer token or X-API-Key header)
// Auto-maps payload fields to Lead model
// Creates lead + optionally sends WhatsApp notification

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const LEAD_FIELD_MAP: Record<string, string[]> = {
  name: ['name', 'full_name', 'fullname', 'contact_name', 'customer_name', 'your-name', 'your_name', 'first_name', 'visitor_name'],
  phone: ['phone', 'mobile', 'cell', 'telephone', 'phone_number', 'your-phone', 'your_phone', 'contact_phone', 'visitor_phone', 'mobile_number'],
  email: ['email', 'email_address', 'your-email', 'your_email', 'contact_email', 'visitor_email'],
  address: ['address', 'street', 'location', 'your-address', 'your_address', 'full_address'],
  serviceType: ['service', 'service_type', 'service_type_requested', 'subject', 'your-subject', 'interest', 'inquiry_type', 'topic'],
  description: ['description', 'message', 'notes', 'your-message', 'your_message', 'comments', 'body', 'details', 'inquiry'],
  source: ['source', 'utm_source', 'referral_source', 'lead_source'],
  priority: ['priority', 'urgency', 'importance'],
  value: ['value', 'amount', 'deal_value', 'estimated_value'],
};

function smartFieldMap(payload: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  const lowerPayload: Record<string, any> = {};
  for (const [k, v] of Object.entries(payload)) {
    lowerPayload[k.toLowerCase().replace(/[-_\s]/g, '')] = v;
  }

  for (const [leadField, aliases] of Object.entries(LEAD_FIELD_MAP)) {
    for (const alias of aliases) {
      const normalizedAlias = alias.toLowerCase().replace(/[-_\s]/g, '');
      if (lowerPayload[normalizedAlias] !== undefined) {
        mapped[leadField] = lowerPayload[normalizedAlias];
        break;
      }
    }
    // Also check original keys (case-insensitive)
    if (mapped[leadField] === undefined) {
      for (const [k, v] of Object.entries(payload)) {
        if (aliases.includes(k.toLowerCase())) {
          mapped[leadField] = v;
          break;
        }
      }
    }
  }

  return mapped;
}

function calculateLeadScore(data: Record<string, any>): number {
  let score = 30; // base score for inbound webhook lead
  if (data.phone) score += 20;
  if (data.email) score += 15;
  if (data.serviceType) score += 15;
  if (data.description) score += 10;
  if (data.address) score += 5;
  if (data.value && Number(data.value) > 0) score += 5;
  return Math.min(score, 100);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const startTime = Date.now();
  const { endpointId } = await params;

  // ─── 1. Find the webhook endpoint ──────────────────────────────────────
  const endpoint = await db.webhookEndpoint.findUnique({
    where: { endpointId },
  });

  if (!endpoint || !endpoint.active) {
    return NextResponse.json(
      { error: 'Webhook endpoint not found or inactive', code: 'ENDPOINT_NOT_FOUND' },
      { status: 404 }
    );
  }

  // ─── 2. Authenticate ───────────────────────────────────────────────────
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
      { error: 'API key required. Use Authorization: Bearer <key> or X-API-Key header', code: 'AUTH_REQUIRED' },
      { status: 401 }
    );
  }

  const keyHash = await hashApiKey(providedKey);
  if (keyHash !== endpoint.apiKeyHash) {
    return NextResponse.json(
      { error: 'Invalid API key', code: 'AUTH_FAILED' },
      { status: 403 }
    );
  }

  // ─── 3. Parse payload ──────────────────────────────────────────────────
  let payload: Record<string, any>;
  try {
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else if (contentType.includes('form-data') || contentType.includes('x-www-form-urlencoded')) {
      const formData = await request.formData();
      payload = {};
      formData.forEach((value, key) => {
        payload[key] = value.toString();
      });
    } else {
      payload = await request.json();
    }
  } catch {
    return NextResponse.json(
      { error: 'Invalid request body', code: 'INVALID_PAYLOAD' },
      { status: 400 }
    );
  }

  // Handle nested data (some sources wrap in a "data" or "body" field)
  const data = payload.data || payload.body || payload.fields || payload;
  const source = payload._source || payload.source || endpoint.source;

  // ─── 4. Smart field mapping ────────────────────────────────────────────
  const mapped = smartFieldMap(data);

  // Apply custom field mapping if configured
  let customMapping: Record<string, string> = {};
  try {
    customMapping = JSON.parse(endpoint.fieldMapping || '{}');
  } catch {}
  for (const [srcField, leadField] of Object.entries(customMapping)) {
    if (data[srcField] !== undefined && !mapped[leadField]) {
      mapped[leadField] = data[srcField];
    }
  }

  // ─── 5. Validate required fields ───────────────────────────────────────
  if (!mapped.name && !mapped.phone) {
    await db.webhookEndpointLog.create({
      data: {
        webhookEndpointId: endpoint.id,
        source: source || 'unknown',
        sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
        payloadJson: JSON.stringify(payload).slice(0, 10000),
        status: 'error',
        error: 'Missing required fields: name or phone',
        processingMs: Date.now() - startTime,
      },
    });
    return NextResponse.json(
      { error: 'Missing required fields: at least "name" or "phone" is required', code: 'MISSING_FIELDS', mappedFields: Object.keys(mapped) },
      { status: 400 }
    );
  }

  // ─── 6. Create lead ────────────────────────────────────────────────────
  let leadId: string | null = null;
  let leadError: string | null = null;

  try {
    const leadScore = calculateLeadScore(mapped);
    const lead = await db.lead.create({
      data: {
        name: String(mapped.name || 'Unknown'),
        phone: String(mapped.phone || ''),
        email: mapped.email ? String(mapped.email) : null,
        source: endpoint.leadSource || source || 'webhook',
        status: 'new',
        priority: mapped.priority || (leadScore > 70 ? 'high' : leadScore > 40 ? 'medium' : 'low'),
        value: mapped.value ? Number(mapped.value) : 0,
        description: mapped.description ? String(mapped.description) : null,
        address: mapped.address ? String(mapped.address) : null,
        serviceType: mapped.serviceType ? String(mapped.serviceType) : null,
        tenantId: endpoint.tenantId,
        tagsJson: JSON.stringify([`webhook:${endpoint.source}`, `score:${leadScore}`]),
        notesJson: JSON.stringify([{
          text: `Lead captured via ${endpoint.name} (${endpoint.source})`,
          timestamp: new Date().toISOString(),
          auto: true,
        }]),
      },
    });
    leadId = lead.id;

    // Auto-create customer if enabled
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
  } catch (err: any) {
    leadError = err.message || 'Failed to create lead';
  }

  // ─── 7. Update endpoint stats ──────────────────────────────────────────
  await db.webhookEndpoint.update({
    where: { id: endpoint.id },
    data: {
      totalReceived: { increment: 1 },
      lastReceived: new Date(),
      lastError: leadError,
    },
  });

  // ─── 8. Log the request ────────────────────────────────────────────────
  await db.webhookEndpointLog.create({
    data: {
      webhookEndpointId: endpoint.id,
      source: source || endpoint.source,
      sourceIp: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null,
      payloadJson: JSON.stringify(payload).slice(0, 10000),
      leadId,
      status: leadId ? 'processed' : 'error',
      error: leadError,
      processingMs: Date.now() - startTime,
    },
  });

  // ─── 9. Response ───────────────────────────────────────────────────────
  if (leadId) {
    return NextResponse.json({
      success: true,
      leadId,
      message: 'Lead created successfully',
      source: endpoint.source,
      processingMs: Date.now() - startTime,
    }, { status: 201 });
  } else {
    return NextResponse.json({
      success: false,
      error: leadError || 'Failed to create lead',
      code: 'LEAD_CREATION_FAILED',
    }, { status: 500 });
  }
}

// ─── Health check / GET ───────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  const { endpointId } = await params;
  const endpoint = await db.webhookEndpoint.findUnique({
    where: { endpointId },
    select: {
      id: true,
      name: true,
      endpointId: true,
      source: true,
      active: true,
      apiKeyPrefix: true,
      totalReceived: true,
      lastReceived: true,
      createdAt: true,
    },
  });

  if (!endpoint) {
    return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
  }

  return NextResponse.json({
    status: 'ok',
    endpoint: {
      name: endpoint.name,
      source: endpoint.source,
      active: endpoint.active,
      totalReceived: endpoint.totalReceived,
      lastReceived: endpoint.lastReceived,
    },
  });
}
