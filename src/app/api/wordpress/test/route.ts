import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// ─── WordPress Test Connection ──────────────────────────────────────────────
// Tests the API key and returns connection status

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key } = body;

    if (!api_key) {
      return NextResponse.json({ success: false, error: 'API key is required' }, { status: 400 });
    }

    const keyHash = await hashApiKey(api_key);
    const endpoint = await db.webhookEndpoint.findFirst({
      where: { apiKeyHash: keyHash, source: 'wordpress', active: true },
      select: {
        name: true,
        endpointId: true,
        active: true,
        totalReceived: true,
        lastReceived: true,
      },
    });

    if (!endpoint) {
      return NextResponse.json({
        success: false,
        error: 'Invalid API key or endpoint inactive',
      }, { status: 403 });
    }

    // Count recent logs
    const recentLogs = await db.webhookEndpointLog.count({
      where: {
        webhookEndpoint: { endpointId: endpoint.endpointId },
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Connection successful! ServiceOS is ready to receive leads from WordPress.',
      endpoint: {
        name: endpoint.name,
        active: endpoint.active,
        totalReceived: endpoint.totalReceived,
        lastReceived: endpoint.lastReceived,
        recentLeads24h: recentLogs,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Test failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
