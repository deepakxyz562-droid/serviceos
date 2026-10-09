import { NextRequest, NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { runOutreachTick } from '@/lib/outreach/automation';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function POST(request: NextRequest) {
  // Unlike read-only development cron jobs, this endpoint can send real mail.
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'CRON_SECRET required.' }, { status: 503 });
  const auth = verifyCronAuth(request);
  if (!auth.ok) return auth.response;
  try { return NextResponse.json({ ok: true, ...await runOutreachTick() }); }
  catch (error) {
    console.error('[outreach/worker] failed', error);
    return NextResponse.json({ error: 'Outreach worker failed. Inspect the paused campaign and server logs.' }, { status: 503 });
  }
}
