import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    const { persistDesignAssets } = await import('@/lib/designs/assets');
    const { renderDesign } = await import('@/lib/designs/render');
    const design = await persistDesignAssets(body.design, user.tenantId, user.id);
    return NextResponse.json(await renderDesign(design, user.tenantId));
  } catch {
    return NextResponse.json({ error: 'Export failed. Check your images and retry.' }, { status: 422 });
  }
}
