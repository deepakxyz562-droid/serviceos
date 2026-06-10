import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { randomBytes } from 'crypto';

// ─── WordPress Integration Config ──────────────────────────────────────────
// POST: Generate a new WordPress webhook endpoint with API key
// GET: Retrieve existing WordPress endpoint config

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, tenantId, workspaceId, sendWhatsApp } = body;

    // Auto-assign tenantId/workspaceId from authenticated user if not provided
    const authUser = await getAuthUser(request);
    const effectiveTenantId = tenantId || authUser?.tenantId || null;
    const effectiveWorkspaceId = workspaceId || authUser?.workspaceId || null;

    // Generate API key + endpoint ID
    const { key, hash, prefix } = await generateApiKey();
    const endpointId = generateEndpointId();

    // Create the webhook endpoint
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
        fieldMapping: JSON.stringify({
          'your-name': 'name',
          'your-phone': 'phone',
          'your-email': 'email',
          'your-subject': 'serviceType',
          'your-message': 'description',
        }),
        tenantId: effectiveTenantId,
        workspaceId: effectiveWorkspaceId,
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
        webhookUrl: `${baseUrl}/api/webhooks/ingest/${ep.endpointId}`,
        apiUrl: `${baseUrl}/api/wordpress/leads`,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch endpoints';
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
