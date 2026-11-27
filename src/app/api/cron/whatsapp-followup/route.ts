import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { processWhatsAppInactivityFollowups } from '@/lib/whatsapp/inactivity-followup';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/whatsapp-followup
 * Scans quiet WhatsApp customer chats (based on tenant delay, default 2h) and sends context-aware follow-up nudges.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = verifyCronAuth(request);
    if (!auth.ok) return auth.response;

    const result = await processWhatsAppInactivityFollowups();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error: unknown) {
    console.error('[cron/whatsapp-followup] Error running inactivity cron:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Inactivity followup cron failed' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
