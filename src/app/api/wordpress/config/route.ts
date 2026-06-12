import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { getAuthUser } from '@/lib/auth';

// ─── WordPress Integration Config ──────────────────────────────────────────
// POST: Generate a new WordPress webhook endpoint with API key
// GET: Retrieve existing WordPress endpoint config
// PUT: Update a WordPress webhook endpoint (field mapping, WhatsApp settings)
// DELETE: Delete a WordPress webhook endpoint

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const raw = randomBytes(24).toString('base64url');
  const key = `sos_wp_${raw}`;
  const hash = await hashApiKey(key);
  const prefix = key.slice(0, 12) + '...';
  return { key, hash, prefix };
}

function generateEndpointId(): string {
  return `wp_${randomBytes(8).toString('base64url')}`;
}

// ─── Default field mapping with all common WordPress form input types ──────
const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  'your-name': 'name',
  'your-phone': 'phone',
  'your-email': 'email',
  'your-subject': 'serviceType',
  'your-message': 'description',
  'your-address': 'address',
  'your-company': 'company',
  'first-name': 'name',
  'last-name': 'name',
  'full-name': 'name',
  'phone-number': 'phone',
  'mobile': 'phone',
  'email-address': 'email',
  'street-address': 'address',
  'city': 'address',
  'zip': 'address',
  'inquiry-type': 'serviceType',
  'service-type': 'serviceType',
  'preferred-date': 'scheduledAt',
  'preferred-time': 'scheduledTime',
  'budget': 'value',
  'comments': 'description',
  'notes': 'description',
  'message': 'description',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tenantId, workspaceId, sendWhatsApp, whatsappOwnerPhone, whatsappOwnerTemplate, whatsappUserTemplate, whatsappAiGenerated } = body;

    // Auto-populate tenantId from authenticated user if not provided
    let resolvedTenantId = tenantId || null;
    let resolvedWorkspaceId = workspaceId || null;
    if (!resolvedTenantId) {
      try {
        const authUser = await getAuthUser();
        if (authUser?.tenantId) {
          resolvedTenantId = authUser.tenantId;
          resolvedWorkspaceId = authUser.workspaceId || null;
        }
      } catch {
        // No authenticated user, continue with provided values
      }
    }

    // Generate API key + endpoint ID
    const { key, hash, prefix } = await generateApiKey();
    const endpointId = generateEndpointId();

    // Create the webhook endpoint with enhanced field mapping
    const endpoint = await db.webhookEndpoint.create({
      data: {
        name: name || 'WordPress Lead Capture',
        endpointId,
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        source: 'wordpress',
        leadSource: 'wordpress',
        active: true,
        autoCreateCustomer: true,
        sendWhatsApp: sendWhatsApp !== false,
        whatsappOwnerPhone: whatsappOwnerPhone || '',
        whatsappOwnerTemplate: whatsappOwnerTemplate || '',
        whatsappUserTemplate: whatsappUserTemplate || '',
        whatsappAiGenerated: whatsappAiGenerated || false,
        fieldMapping: JSON.stringify(DEFAULT_FIELD_MAPPING),
        tenantId: resolvedTenantId,
        workspaceId: resolvedWorkspaceId,
      },
    });

    // Get the base URL for the API
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      success: true,
      endpoint: {
        id: endpoint.id,
        name: endpoint.name,
        endpointId: endpoint.endpointId,
        apiKey: key,
        apiKeyPrefix: prefix,
        source: endpoint.source,
        active: endpoint.active,
        sendWhatsApp: endpoint.sendWhatsApp,
        whatsappOwnerPhone: endpoint.whatsappOwnerPhone,
        whatsappOwnerTemplate: endpoint.whatsappOwnerTemplate,
        whatsappUserTemplate: endpoint.whatsappUserTemplate,
        whatsappAiGenerated: endpoint.whatsappAiGenerated,
        fieldMapping: JSON.parse(endpoint.fieldMapping),
        webhookUrl: `${baseUrl}/api/webhooks/ingest/${endpointId}`,
        apiUrl: `${baseUrl}/api/wordpress/leads`,
        createdAt: endpoint.createdAt,
      },
      config: {
        api_url: `${baseUrl}/api/wordpress/leads`,
        api_key: key,
        webhook_url: `${baseUrl}/api/webhooks/ingest/${endpointId}`,
        endpoint_id: endpointId,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create endpoint';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const endpoints = await db.webhookEndpoint.findMany({
      where: { source: 'wordpress' },
      select: {
        id: true,
        name: true,
        endpointId: true,
        apiKeyPrefix: true,
        source: true,
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
        _count: { select: { logs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      endpoints: endpoints.map((ep) => ({
        ...ep,
        fieldMapping: (() => { try { return JSON.parse(ep.fieldMapping); } catch { return {}; } })(),
        webhookUrl: `${baseUrl}/api/webhooks/ingest/${ep.endpointId}`,
        apiUrl: `${baseUrl}/api/wordpress/leads`,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch endpoints';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PUT /api/wordpress/config ─────────────────────────────────────────────
// Update a WordPress webhook endpoint configuration
// Supports: fieldMapping, sendWhatsApp, whatsappOwnerPhone, whatsappOwnerTemplate,
//           whatsappUserTemplate, whatsappAiGenerated, and other endpoint fields

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, endpointId } = body;

    // Find the endpoint by id or endpointId
    let endpoint;
    if (id) {
      endpoint = await db.webhookEndpoint.findUnique({ where: { id } });
    } else if (endpointId) {
      endpoint = await db.webhookEndpoint.findFirst({ where: { endpointId, source: 'wordpress' } });
    }

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    // Updatable fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.autoCreateCustomer !== undefined) updateData.autoCreateCustomer = body.autoCreateCustomer;
    if (body.leadSource !== undefined) updateData.leadSource = body.leadSource;

    // Field mapping - editable auto-mapped form fields
    if (body.fieldMapping !== undefined) {
      updateData.fieldMapping = typeof body.fieldMapping === 'string'
        ? body.fieldMapping
        : JSON.stringify(body.fieldMapping);
    }

    // WhatsApp settings
    if (body.sendWhatsApp !== undefined) updateData.sendWhatsApp = body.sendWhatsApp;
    if (body.whatsappOwnerPhone !== undefined) updateData.whatsappOwnerPhone = body.whatsappOwnerPhone;
    if (body.whatsappOwnerTemplate !== undefined) updateData.whatsappOwnerTemplate = body.whatsappOwnerTemplate;
    if (body.whatsappUserTemplate !== undefined) updateData.whatsappUserTemplate = body.whatsappUserTemplate;
    if (body.whatsappAiGenerated !== undefined) updateData.whatsappAiGenerated = body.whatsappAiGenerated;

    const updated = await db.webhookEndpoint.update({
      where: { id: endpoint.id },
      data: updateData,
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      success: true,
      endpoint: {
        id: updated.id,
        name: updated.name,
        endpointId: updated.endpointId,
        apiKeyPrefix: updated.apiKeyPrefix,
        source: updated.source,
        active: updated.active,
        sendWhatsApp: updated.sendWhatsApp,
        whatsappOwnerPhone: updated.whatsappOwnerPhone,
        whatsappOwnerTemplate: updated.whatsappOwnerTemplate,
        whatsappUserTemplate: updated.whatsappUserTemplate,
        whatsappAiGenerated: updated.whatsappAiGenerated,
        fieldMapping: (() => { try { return JSON.parse(updated.fieldMapping); } catch { return {}; } })(),
        autoCreateCustomer: updated.autoCreateCustomer,
        webhookUrl: `${baseUrl}/api/webhooks/ingest/${updated.endpointId}`,
        apiUrl: `${baseUrl}/api/wordpress/leads`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update endpoint';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await db.webhookEndpoint.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete endpoint';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
