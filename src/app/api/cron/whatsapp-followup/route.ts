import { NextRequest, NextResponse } from 'next/server';
import { processWhatsAppInactivityFollowups } from '@/lib/whatsapp/inactivity-followup';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cron/whatsapp-followup
 * Scans quiet WhatsApp customer chats (>2 hours without activity) and sends context-aware follow-up nudges.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
