import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import {
  listPhoneNumbers as vapiListNumbers,
  buyPhoneNumber as vapiBuyNumber,
  importPhoneNumber as vapiImportNumber,
  updatePhoneNumber as vapiUpdateNumber,
  deletePhoneNumber as vapiDeleteNumber,
} from '@/lib/vapi-client';

async function isFeatureVisible(tenantId: string): Promise<boolean> {
  const flag = await db.featureFlag.findUnique({
    where: { tenantId_featureKey: { tenantId, featureKey: 'ai_receptionist' } },
    select: { enabled: true },
  });
  return flag?.enabled ?? true;
}

// GET — list phone numbers (local + Vapi)
export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isFeatureVisible(auth.tenantId))) {
      return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
    }

    const localNumbers = await db.aiPhoneNumber.findMany({
      where: { tenantId: auth.tenantId },
      include: { agent: { select: { id: true, name: true, vapiAssistantId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    let vapiNumbers: any[] = [];
    try {
      const vapiData = await vapiListNumbers();
      vapiNumbers = Array.isArray(vapiData) ? vapiData : [];
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code === 'VAPI_NOT_CONFIGURED') {
        return NextResponse.json({
          numbers: localNumbers,
          vapiConfigured: false,
        });
      }
    }

    // Sync: any Vapi numbers we don't have locally, create a local record
    const knownVapiIds = new Set(localNumbers.map((n) => n.vapiNumberId).filter(Boolean));
    const newVapiNumbers = vapiNumbers.filter((v: any) => v.id && !knownVapiIds.has(v.id));

    if (newVapiNumbers.length > 0) {
      await db.aiPhoneNumber.createMany({
        data: newVapiNumbers.map((v: any) => ({
          tenantId: auth.tenantId!,
          vapiNumberId: v.id,
          phoneNumber: v.number || v.phoneNumber || '',
          friendlyName: v.name || v.friendlyName || null,
          vapiAssistantId: v.assistantId || null,
          status: 'available',
        })),
      });
    }

    const refreshed = await db.aiPhoneNumber.findMany({
      where: { tenantId: auth.tenantId },
      include: { agent: { select: { id: true, name: true, vapiAssistantId: true } } },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      numbers: refreshed,
      vapiConfigured: true,
    });
  } catch (error) {
    console.error('[Vapi PhoneNumbers GET]', error);
    return NextResponse.json({ error: 'Failed to fetch phone numbers' }, { status: 500 });
  }
}

// POST — buy a new number OR import an existing one
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isFeatureVisible(auth.tenantId))) {
      return NextResponse.json({ error: 'Feature not available' }, { status: 403 });
    }
    const body = await request.json();
    const { action, areaCode, country, number, friendlyName } = body as {
      action: 'buy' | 'import';
      areaCode?: string;
      country?: string;
      number?: string;
      friendlyName?: string;
    };

    if (action === 'buy') {
      const result: any = await vapiBuyNumber(areaCode, country || 'US');
      const created = await db.aiPhoneNumber.create({
        data: {
          tenantId: auth.tenantId,
          vapiNumberId: result?.id || null,
          phoneNumber: result?.number || result?.phoneNumber || '',
          friendlyName: friendlyName || null,
          country: country || 'US',
        },
      });
      return NextResponse.json({ number: created, vapi: result });
    } else if (action === 'import') {
      if (!number) return NextResponse.json({ error: 'Number required for import' }, { status: 400 });
      const result: any = await vapiImportNumber(number, friendlyName);
      const created = await db.aiPhoneNumber.create({
        data: {
          tenantId: auth.tenantId,
          vapiNumberId: result?.id || null,
          phoneNumber: number,
          friendlyName: friendlyName || null,
        },
      });
      return NextResponse.json({ number: created, vapi: result });
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[Vapi PhoneNumbers POST]', error);
    const code = (error as Error & { code?: string }).code;
    if (code === 'VAPI_NOT_CONFIGURED') {
      return NextResponse.json({ error: 'Vapi API key not configured' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to acquire phone number' }, { status: 500 });
  }
}

// PATCH — assign number to an agent
export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { id, assistantId } = body as { id: string; assistantId: string | null };

    const existing = await db.aiPhoneNumber.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!existing) return NextResponse.json({ error: 'Number not found' }, { status: 404 });

    let vapiAssistantId: string | null = null;
    if (assistantId) {
      const agent = await db.aiAgent.findFirst({
        where: { id: assistantId, tenantId: auth.tenantId },
        select: { vapiAssistantId: true },
      });
      vapiAssistantId = agent?.vapiAssistantId || null;
    }

    // Update on Vapi
    if (existing.vapiNumberId && vapiAssistantId) {
      try {
        await vapiUpdateNumber(existing.vapiNumberId, { assistantId: vapiAssistantId });
      } catch (e) {
        console.error('[Vapi PhoneNumbers PATCH] Vapi update failed:', e);
      }
    }

    const updated = await db.aiPhoneNumber.update({
      where: { id },
      data: { assistantId, vapiAssistantId },
      include: { agent: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ number: updated });
  } catch (error) {
    console.error('[Vapi PhoneNumbers PATCH]', error);
    return NextResponse.json({ error: 'Failed to update phone number' }, { status: 500 });
  }
}

// DELETE — release a number
export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth?.tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await db.aiPhoneNumber.findFirst({
      where: { id, tenantId: auth.tenantId },
    });
    if (!existing) return NextResponse.json({ error: 'Number not found' }, { status: 404 });

    if (existing.vapiNumberId) {
      try { await vapiDeleteNumber(existing.vapiNumberId); } catch (e) { console.error('Vapi delete:', e); }
    }

    await db.aiPhoneNumber.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Vapi PhoneNumbers DELETE]', error);
    return NextResponse.json({ error: 'Failed to release number' }, { status: 500 });
  }
}
