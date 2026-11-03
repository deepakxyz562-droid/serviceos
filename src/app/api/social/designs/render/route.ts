import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    if(body.format !== undefined && !['png','jpeg'].includes(body.format))return NextResponse.json({error:'Choose PNG or JPEG'},{status:400});
    if(body.transparent !== undefined && typeof body.transparent !== 'boolean')return NextResponse.json({error:'Invalid transparency option'},{status:400});
    const { persistDesignAssets } = await import('@/lib/designs/assets');
    const { renderDesign } = await import('@/lib/designs/render');
    const design = await persistDesignAssets(body.design, user.tenantId, user.id);
    return NextResponse.json(await renderDesign(design, user.tenantId, {format:body.format,transparent:body.transparent}));
  } catch {
    return NextResponse.json({ error: 'Export failed. Check your images and retry.' }, { status: 422 });
  }
}
