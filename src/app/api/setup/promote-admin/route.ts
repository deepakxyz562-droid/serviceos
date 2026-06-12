import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Promote the admin@serviceos.ai user to super admin.
 * One-time migration endpoint.
 */
export async function POST() {
  try {
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
