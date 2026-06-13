import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (auth.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        planStatus: true,
        createdAt: true,
        suspendedAt: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = tenants.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email || '',
      plan: t.plan,
      status: t.planStatus,
      usersCount: t._count.users,
      createdAt: t.createdAt.toISOString(),
    }));

    return NextResponse.json({ tenants: formatted });
  } catch (error) {
    console.error('[SuperAdmin Tenants] Error:', error);
    return NextResponse.json({ tenants: [] });
  }
}
