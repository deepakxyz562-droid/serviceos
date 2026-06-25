import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * Tenant integration connections — CRUD over `HubIntegrationConnection`.
 *
 * IMPORTANT: `credentialsJson` is NEVER returned by any endpoint here. It is
 * stored on write (POST) but stripped on read (GET) and from the POST response.
 *
 * Unique key: (tenantId, integrationKey).
 */

// Public projection of a connection — omits credentialsJson entirely.
interface ConnectionPublic {
  id: string;
  tenantId: string;
  integrationKey: string;
  status: string;
  configJson: ReturnType<typeof parseJsonObject> | undefined;
  connectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  errorMessage: string | null;
}

function parseJsonObject(raw: string | null | undefined): Record<string, unknown> | undefined {
  if (!raw) return undefined;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : undefined;
  } catch {
    return undefined;
  }
}

function toPublic(c: {
  id: string;
  tenantId: string;
  integrationKey: string;
  status: string;
  configJson: string | null;
  connectedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  errorMessage: string | null;
}): ConnectionPublic {
  return {
    id: c.id,
    tenantId: c.tenantId,
    integrationKey: c.integrationKey,
    status: c.status,
    configJson: parseJsonObject(c.configJson),
    connectedAt: c.connectedAt ? c.connectedAt.toISOString() : null,
    lastSyncAt: c.lastSyncAt ? c.lastSyncAt.toISOString() : null,
    lastSyncStatus: c.lastSyncStatus,
    errorMessage: c.errorMessage,
  };
}

// GET: list current tenant's connections (credentialsJson stripped)
export async function GET(_request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const connections = await db.hubIntegrationConnection.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(connections.map(toPublic));
  } catch (error) {
    console.error('[Integrations Connections GET] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to load connections';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: upsert a connection for (tenantId, integrationKey)
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const body = await request.json() as {
      integrationKey?: unknown;
      status?: unknown;
      credentialsJson?: unknown;
      configJson?: unknown;
    };

    if (typeof body.integrationKey !== 'string' || body.integrationKey.trim().length === 0) {
      return NextResponse.json({ error: '`integrationKey` is required' }, { status: 400 });
    }

    const integrationKey = body.integrationKey.trim();
    const status = typeof body.status === 'string' ? body.status : 'disconnected';
    const credentialsJson = JSON.stringify(
      (body.credentialsJson && typeof body.credentialsJson === 'object')
        ? body.credentialsJson
        : {},
    );
    const configJson = JSON.stringify(
      (body.configJson && typeof body.configJson === 'object')
        ? body.configJson
        : {},
    );

    const now = new Date();
    const isConnected = status === 'connected';

    const upserted = await db.hubIntegrationConnection.upsert({
      where: { tenantId_integrationKey: { tenantId, integrationKey } },
      create: {
        tenantId,
        integrationKey,
        status,
        credentialsJson,
        configJson,
        connectedAt: isConnected ? now : null,
      },
      update: {
        status,
        credentialsJson,
        configJson,
        // Set connectedAt when transitioning to "connected"; preserve existing otherwise.
        ...(isConnected ? { connectedAt: now } : {}),
      },
    });

    return NextResponse.json(toPublic(upserted));
  } catch (error) {
    console.error('[Integrations Connections POST] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to save connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: remove a connection by integrationKey query param
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';

    const { searchParams } = new URL(request.url);
    const integrationKey = searchParams.get('integrationKey');

    if (!integrationKey || integrationKey.trim().length === 0) {
      return NextResponse.json({ error: '`integrationKey` query parameter is required' }, { status: 400 });
    }

    const existing = await db.hubIntegrationConnection.findUnique({
      where: { tenantId_integrationKey: { tenantId, integrationKey } },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    await db.hubIntegrationConnection.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Integrations Connections DELETE] Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete connection';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
