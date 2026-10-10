import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { resolveBgosMobileAccount } from '@/lib/bgos-mobile-account';
import { ProductAccessError } from '@/lib/product-access';
export async function GET(request: NextRequest) {
  const auth = await getAuthUser(request);
  if (!auth || auth.role === 'customer') return NextResponse.json({ error: 'Please sign in again.' }, { status: 401 });
  try {
    const { user, workspace, onboardingRequired } = await resolveBgosMobileAccount(auth.id, auth.workspaceId || undefined);
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, workspaceId: user.workspaceId },
      workspace, onboardingRequired }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { if (error instanceof ProductAccessError) return NextResponse.json({ error: 'An active BGOS workspace is required.' }, { status: error.status }); return NextResponse.json({ error: 'Could not check your workspace. Please retry.' }, { status: 503 }); }
}
