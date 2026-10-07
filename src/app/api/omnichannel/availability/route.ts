import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.tenantId || !['owner', 'admin', 'standalone_user'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const credentials = await db.integrationCredential.findMany({ where: { status: 'active' }, select: { provider: true, clientId: true, clientSecret: true } });
    return NextResponse.json({ providers: credentials.map(c => ({ provider: c.provider, configured: !!c.clientId && !!c.clientSecret })) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Provider availability could not be checked.' }, { status: 503 });
  }
}
