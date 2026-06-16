import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// GET /api/superadmin/auth-settings — Get platform auth settings
export async function GET() {
  try {
    const isSuperAdmin = await isSuperAdminRequest();
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    let settings = await db.platformAuthSettings.findUnique({
      where: { id: 'platform' },
    });

    if (!settings) {
      // Create default settings on first access
      settings = await db.platformAuthSettings.create({
        data: { id: 'platform' },
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Get auth settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch auth settings' }, { status: 500 });
  }
}

// PUT /api/superadmin/auth-settings — Update platform auth settings
export async function PUT(request: NextRequest) {
  try {
    const isSuperAdmin = await isSuperAdminRequest();
    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden — Super Admin only' }, { status: 403 });
    }

    const body = await request.json();

    // Whitelist allowed fields
    const allowedFields = [
      'emailPasswordEnabled',
      'smsOtpEnabled',
      'smsOtpProvider',
      'smsOtpConfigJson',
      'whatsappOtpEnabled',
      'whatsappOtpProvider',
      'whatsappOtpAccessToken',
      'whatsappOtpPhoneNumberId',
      'whatsappOtpBusinessId',
      'whatsappOtpTemplate',
      'whatsappOtpConfigJson',
      'googleEnabled',
      'googleClientId',
      'googleClientSecret',
      'twoFactorEnabled',
      'twoFactorMethods',
      'otpLength',
      'otpExpirySeconds',
      'maxOtpAttempts',
    ];

    const data: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    const settings = await db.platformAuthSettings.upsert({
      where: { id: 'platform' },
      update: data,
      create: { id: 'platform', ...data },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Update auth settings error:', error);
    return NextResponse.json({ error: 'Failed to update auth settings' }, { status: 500 });
  }
}
