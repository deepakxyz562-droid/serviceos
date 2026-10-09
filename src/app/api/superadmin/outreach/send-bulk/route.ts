import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { queueLegacyOutreach } from '@/lib/outreach/legacy-queue';
import { z } from 'zod';
export const dynamic = 'force-dynamic';
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user || !await isSuperAdminRequest(request)) return NextResponse.json({ error: 'SuperAdmin access required.' }, { status: 403 });
  const parsed = z.object({ tenantIds: z.array(z.string().min(1)).min(1).max(100), templateId: z.string().min(1), customVariables: z.record(z.string(), z.string()).optional() }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Provide up to 100 companies and a template.' }, { status: 400 });
  const results = [];
  for (const tenantId of [...new Set(parsed.data.tenantIds)]) {
    try { results.push(await queueLegacyOutreach({ ...parsed.data, tenantId }, user.id)); }
    catch (error) { results.push({ tenantId, status: 'skipped', reason: error instanceof Error ? error.message : 'Unable to queue.' }); }
  }
  return NextResponse.json({ requested: parsed.data.tenantIds.length, sent: 0, queued: results.filter(r => r.status === 'queued').length, results }, { status: 202 });
}
