import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateSuperAdminCache } from '@/lib/admin-auth';

/**
 * Promote the admin@fieseros.ai user to super admin.
 * In production, requires a SETUP_TOKEN header matching process.env.SETUP_TOKEN.
 */
export async function POST(request: Request) {
  try {
    // In production, require a setup token to prevent unauthorized escalation
    if (process.env.NODE_ENV === 'production') {
      const setupToken = request.headers.get('x-setup-token');
      if (!process.env.SETUP_TOKEN || setupToken !== process.env.SETUP_TOKEN) {
        return NextResponse.json(
          { error: 'Unauthorized. Setup token required.' },
          { status: 403 }
        );
      }
    }

    const admin = await db.user.update({
      where: { email: 'admin@fieseros.ai' },
      data: {
        isSuperAdmin: true,
        role: 'super_admin',
      },
    });

    // Invalidate the super-admin cache for this user so the promotion
    // takes effect immediately (rather than waiting up to 60 seconds).
    invalidateSuperAdminCache(admin.id);

    return NextResponse.json({
      message: 'User promoted to super admin',
      admin: { email: admin.email, name: admin.name, role: admin.role, isSuperAdmin: admin.isSuperAdmin },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
