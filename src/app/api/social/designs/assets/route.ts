import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 15_000_000) return NextResponse.json({ error: 'Image too large' }, { status: 413 });
    const body = await request.json();
    if (typeof body.data !== 'string' || body.data.length > 15_000_000) return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    const match = /^data:image\/(png|jpeg|jpg|webp|heic|heif);base64,([A-Za-z0-9+/=\s]+)$/i.exec(body.data);
    if (!match) return NextResponse.json({ error: 'Use a PNG, JPEG, WebP, or HEIC image' }, { status: 400 });
    const { saveDesignAsset } = await import('@/lib/designs/assets');
    return NextResponse.json(await saveDesignAsset(Buffer.from(match[2].replace(/\s+/g, ''), 'base64'), user.tenantId, user.id), { status: 201 });
  } catch {
    return NextResponse.json({ error: 'The image could not be stored. Please retry.' }, { status: 422 });
  }
}
