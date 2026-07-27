import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { randomBytes } from 'crypto';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// ─── Website Form Integration Config ────────────────────────────────────────
//
// Manages WebhookEndpoint records with source='webform' for the universal
// form lead capture feature (/api/forms/leads + public/embed.js).
//
// POST:   Generate a new webform endpoint with API key
// GET:    List existing webform endpoints for the tenant
// PUT:    Update a webform endpoint (WhatsApp settings, field mapping)
// DELETE: Delete a webform endpoint

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function generateApiKey(): Promise<{ key: string; hash: string; prefix: string }> {
  const raw = randomBytes(24).toString('base64url');
  const key = `sos_wf_${raw}`;
  const hash = await hashApiKey(key);
  const prefix = key.slice(0, 12) + '...';
  return { key, hash, prefix };
}

function generateEndpointId(): string {
  return `wf_${randomBytes(8).toString('base64url')}`;
}

const DEFAULT_FIELD_MAPPING: Record<string, string> = {
  name: 'name',
  full_name: 'name',
  fullname: 'name',
  first_name: 'name',
  email: 'email',
  email_address: 'email',
  phone: 'phone',
  mobile: 'phone',
  telephone: 'phone',
  message: 'description',
  description: 'description',
  comments: 'description',
  notes: 'description',
  subject: 'serviceType',
  service: 'serviceType',
  service_type: 'serviceType',
  inquiry_type: 'serviceType',
  address: 'address',
  street: 'address',
  city: 'address',
  company: 'company',
  company_name: 'company',
  budget: 'value',
  amount: 'value',
  date: 'scheduledAt',
  preferred_date: 'scheduledAt',
  time: 'scheduledTime',
  preferred_time: 'scheduledTime',
};

// ─── POST: create new endpoint ──────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      name,
      tenantId,
      workspaceId,
      sendWhatsApp,
      whatsappOwnerPhone,
      whatsappOwnerTemplate,
      whatsappUserTemplate,
      whatsappAiGenerated,
    } = body;

    // Auto-populate tenantId from authenticated user
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
        // No authenticated user
      }
    }

    const { key, hash, prefix } = await generateApiKey();
    const endpointId = generateEndpointId();

    const endpoint = await db.webhookEndpoint.create({
      data: {
        name: name || 'Website Form Capture',
        endpointId,
        apiKeyHash: hash,
        apiKeyPrefix: prefix,
        source: 'webform',
        leadSource: 'webform',
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

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json(
      {
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
          apiUrl: `${baseUrl}/api/forms/leads`,
          embedScriptUrl: `${baseUrl}/embed.js`,
          createdAt: endpoint.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create endpoint';
    console.error('[/api/webform/config POST] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── GET: list endpoints ────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SuperAdmin sees all; tenant users see only their own
    const isSuperAdmin = await isSuperAdminRequest();
    const where = isSuperAdmin ? { source: 'webform' } : { source: 'webform', tenantId: authUser.tenantId || undefined };

    const endpoints = await db.webhookEndpoint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = `${protocol}://${host}`;

    return NextResponse.json({
      endpoints: endpoints.map((ep) => ({
        id: ep.id,
        name: ep.name,
        endpointId: ep.endpointId,
        apiKeyPrefix: ep.apiKeyPrefix,
        source: ep.source,
        active: ep.active,
        sendWhatsApp: ep.sendWhatsApp,
        whatsappOwnerPhone: ep.whatsappOwnerPhone,
        whatsappOwnerTemplate: ep.whatsappOwnerTemplate,
        whatsappUserTemplate: ep.whatsappUserTemplate,
        whatsappAiGenerated: ep.whatsappAiGenerated,
        autoCreateCustomer: ep.autoCreateCustomer,
        fieldMapping: (() => {
          try {
            return JSON.parse(ep.fieldMapping);
          } catch {
            return {};
          }
        })(),
        totalReceived: ep.totalReceived,
        lastReceived: ep.lastReceived,
        apiUrl: `${baseUrl}/api/forms/leads`,
        embedScriptUrl: `${baseUrl}/embed.js`,
        createdAt: ep.createdAt,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to list endpoints';
    console.error('[/api/webform/config GET] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE: delete endpoint ────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id query parameter is required' }, { status: 400 });
    }

    const isSuperAdmin = await isSuperAdminRequest();
    const where = isSuperAdmin
      ? { id, source: 'webform' }
      : { id, source: 'webform', tenantId: authUser.tenantId || undefined };

    await db.webhookEndpoint.deleteMany({ where });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete endpoint';
    console.error('[/api/webform/config DELETE] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
