import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

// GET /api/settings/auth — Get tenant-level auth settings
// Returns: { allowCustomerWhatsappOtp, allowEmployeeWhatsappOtp } + platform auth status
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { settingsJson: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = JSON.parse(tenant.settingsJson || '{}');

    // Also get platform auth settings to know what's available
    const platformSettings = await db.platformAuthSettings.findUnique({
      where: { id: 'platform' },
    });

    return NextResponse.json({
      allowCustomerWhatsappOtp: settings.allowCustomerWhatsappOtp ?? false,
      allowEmployeeWhatsappOtp: settings.allowEmployeeWhatsappOtp ?? false,
      allowEmployee2faWhatsapp: settings.allowEmployee2faWhatsapp ?? false,
      // Platform-level flags so the UI knows what's available
      platformWhatsappOtpEnabled: platformSettings?.whatsappOtpEnabled ?? false,
      platformGoogleEnabled: platformSettings?.googleEnabled ?? false,
      platformTwoFactorEnabled: platformSettings?.twoFactorEnabled ?? false,
    });
  } catch (error) {
    console.error('Get tenant auth settings error:', error);
    return NextResponse.json({ error: 'Failed to fetch auth settings' }, { status: 500 });
  }
}

// PUT /api/settings/auth — Update tenant-level auth settings
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can update auth settings' }, { status: 403 });
    }

    const body = await request.json();
    const { allowCustomerWhatsappOtp, allowEmployeeWhatsappOtp, allowEmployee2faWhatsawk } = body;

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      select: { settingsJson: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const settings = JSON.parse(tenant.settingsJson || '{}');

    if (allowCustomerWhatsappOtp !== undefined) {
      settings.allowCustomerWhatsappOtp = allowCustomerWhatsappOtp;
    }
    if (allowEmployeeWhatsappOtp !== undefined) {
      settings.allowEmployeeWhatsappOtp = allowEmployeeWhatsappOtp;
    }
    if (allowEmployee2faWhatsawk !== undefined) {
      settings.allowEmployee2faWhatsapp = allowEmployee2faWhatsawk;
    }

    await db.tenant.update({
      where: { id: authUser.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({
      allowCustomerWhatsappOtp: settings.allowCustomerWhatsappOtp ?? false,
      allowEmployeeWhatsappOtp: settings.allowEmployeeWhatsappOtp ?? false,
      allowEmployee2faWhatsapp: settings.allowEmployee2faWhatsapp ?? false,
      success: true,
    });
  } catch (error) {
    console.error('Update tenant auth settings error:', error);
    return NextResponse.json({ error: 'Failed to update auth settings' }, { status: 500 });
  }
}
