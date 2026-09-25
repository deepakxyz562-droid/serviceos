import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';

/** DELETE /api/api-keys/[id] — revoke (delete) an API key */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const key = await db.apiKey.findFirst({ where: { id, userId: user.id } });
  if (!key) return NextResponse.json({ error: 'API key not found' }, { status: 404 });

  await db.apiKey.delete({ where: { id } });
  return NextResponse.json({ success: true, message: 'API key revoked' });
}
