import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { generateApiKey, hashApiKey } from '@/lib/api-key-auth';

/**
 * GET /api/api-keys — list API keys for the current user
 * POST /api/api-keys — create a new API key
 *
 * Authentication: JWT cookie (not API key — these are management endpoints)
 */
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const keys = await db.apiKey.findMany({
    where: { userId: user.id },
    select: { id: true, name: true, scopes: true, lastUsed: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ keys: keys.map(k => ({ ...k, scopes: JSON.parse(k.scopes || '[]') })) });
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { name, scopes = ['forms:read', 'forms:write'] } = body;

  if (!name) return NextResponse.json({ error: 'Key name is required' }, { status: 400 });

  const plaintextKey = generateApiKey();
  const keyHash = hashApiKey(plaintextKey);

  await db.apiKey.create({
    data: {
      userId: user.id,
      name,
      keyHash,
      scopes: JSON.stringify(scopes),
    },
  });

  // Return the plaintext key ONCE — it's never retrievable again
  return NextResponse.json({
    apiKey: plaintextKey,
    name,
    scopes,
    message: 'Save this key securely. It will not be shown again.',
  });
}
