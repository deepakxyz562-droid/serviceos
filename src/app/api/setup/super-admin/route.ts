import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hashPassword } from '@/lib/auth';

/**
 * One-time setup endpoint to create/update the super admin.
 * In production, requires a SETUP_TOKEN header matching process.env.SETUP_TOKEN.
 * Also blocked once a super admin already exists.
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

    // Check if super admin already exists
    const existingAdmin = await db.user.findFirst({
      where: { isSuperAdmin: true },
    });

    if (existingAdmin) {
      return NextResponse.json({
        message: 'Super admin already exists',
        admin: { email: existingAdmin.email, name: existingAdmin.name },
      });
    }

    // Create or update super admin
    const adminEmail = 'admin@serviceos.ai';
    const adminPassword = 'Admin@123';

    const existingUser = await db.user.findUnique({
      where: { email: adminEmail },
    });

    if (existingUser) {
      // Update existing user to super admin
      const updated = await db.user.update({
        where: { email: adminEmail },
        data: {
          isSuperAdmin: true,
          role: 'super_admin',
        },
      });
      return NextResponse.json({
        message: 'Existing user promoted to super admin',
        admin: { email: updated.email, name: updated.name, role: updated.role, isSuperAdmin: updated.isSuperAdmin },
      });
    }

    // Create new super admin user (without tenant - platform admin)
    const passwordHash = await hashPassword(adminPassword);
    const admin = await db.user.create({
      data: {
        email: adminEmail,
        name: 'Super Admin',
        passwordHash,
        role: 'super_admin',
        isSuperAdmin: true,
        authProvider: 'email',
        isActive: true,
      },
    });

    return NextResponse.json({
      message: 'Super admin created successfully',
      admin: { email: admin.email, name: admin.name, role: admin.role, isSuperAdmin: admin.isSuperAdmin },
      credentials: { email: adminEmail, password: adminPassword },
    });
  } catch (error: any) {
    console.error('Super admin setup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to setup super admin' },
      { status: 500 }
    );
  }
}
