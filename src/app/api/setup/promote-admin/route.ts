import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Promote the admin@serviceos.ai user to super admin.
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
      where: { email: 'admin@serviceos.ai' },
      data: {
        isSuperAdmin: true,
        role: 'super_admin',
      },
    });

    return NextResponse.json({
      message: 'User promoted to super admin',
      admin: { email: admin.email, name: admin.name, role: admin.role, isSuperAdmin: admin.isSuperAdmin },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
