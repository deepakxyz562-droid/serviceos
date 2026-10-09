import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { queueLegacyOutreach } from '@/lib/outreach/legacy-queue';
export const dynamic = 'force-dynamic';
// All entry points use the same persistent queue, pacing and global quota.
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !await isSuperAdminRequest()) return NextResponse.json({ error: 'SuperAdmin access required.' }, { status: 403 });
  try {
    const result = await queueLegacyOutreach(await request.json(), user.id);
    if (result.status !== 'queued') return NextResponse.json({ error: result.reason }, { status: 409 });
    return NextResponse.json({ ok: true, queued: true, communication: { status: 'queued', providerMessageId: null } }, { status: 202 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not queue email.' }, { status: 400 }); }
}
