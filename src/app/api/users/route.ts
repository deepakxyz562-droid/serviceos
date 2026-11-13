import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser, hashPassword } from '@/lib/auth';
import { buildPhoneVariants } from '@/lib/phone-account-lookup';
import { isDeliverableEmail } from '@/lib/emails/bgos/templates';
import { sendEmail } from '@/lib/email-send';

// GET /api/users - List users and pending invitations in the current tenant
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      include: { brandProfile: true },
    });

    const businessName =
      tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';

    const users = await db.user.findMany({
      where: { tenantId: authUser.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const invitations = await db.invitation.findMany({
      where: { tenantId: authUser.tenantId, status: 'pending' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        status: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      users,
      invitations,
      currentUserId: authUser.id,
      currentUserRole: authUser.role,
      businessName,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

// POST /api/users - Invite/create a new user in the tenant (Grexa multi-user parity)
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // Only owner or admin can invite users
    if (authUser.role !== 'owner' && authUser.role !== 'admin') {
      return NextResponse.json({ error: 'Only owners and admins can invite users' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { name, email, role, phone } = body;

    const trimmedEmail = (email || '').trim().toLowerCase();
    const trimmedName = (name || '').trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!trimmedEmail && !trimmedPhone) {
      return NextResponse.json(
        { error: 'Please provide either a mobile phone number (for OTP login) or an email address.' },
        { status: 400 }
      );
    }

    // Normalize phone number (E.164) and resolve clean digits
    let normalizedPhone: string | null = null;
    let phoneDigits = '';
    if (trimmedPhone) {
      const pv = buildPhoneVariants(trimmedPhone);
      normalizedPhone = pv.e164 || trimmedPhone;
      phoneDigits = pv.cleanDigits.length >= 10 ? pv.cleanDigits.slice(-10) : pv.cleanDigits;
    }

    // Auto-synthesize internal email if only phone was supplied
    const effectiveEmail =
      trimmedEmail ||
      (phoneDigits
        ? `phone_${phoneDigits}@bgos.fieseros.com`
        : `staff_${Date.now()}@bgos.fieseros.com`);

    // Check if user already exists by email or phone
    let existing = await db.user.findUnique({ where: { email: effectiveEmail } });
    if (!existing && normalizedPhone && typeof (db.user as any).findFirst === 'function') {
      const pv = buildPhoneVariants(normalizedPhone);
      const orConditions: Record<string, unknown>[] = [
        ...pv.variants.map((v) => ({ phone: v })),
        ...(pv.tenDigits.length >= 10 ? [{ phone: { contains: pv.tenDigits } }] : []),
      ];
      existing = await db.user.findFirst({
        where: { OR: orConditions },
      });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: authUser.tenantId },
      include: { brandProfile: true },
    });

    const businessName =
      tenant?.brandProfile?.businessName || tenant?.name || 'Our Business';

    // Normalize role: Grexa roles -> admin, manager, staff
    const normalizedRole = ['admin', 'manager', 'staff', 'technician', 'employee'].includes(role)
      ? role
      : 'staff';

    // Generate a temporary password (10 characters: alphanumeric)
    const tempPassword = Math.random().toString(36).slice(-5) + Math.random().toString(36).slice(-5);
    const passwordHash = await hashPassword(tempPassword);

    let user: any;

    if (existing) {
      // Re-link or update role for existing user
      user = await db.user.update({
        where: { id: existing.id },
        data: {
          name: trimmedName || existing.name,
          role: normalizedRole,
          phone: normalizedPhone || existing.phone,
          tenantId: existing.tenantId || authUser.tenantId,
          workspaceId: existing.workspaceId || authUser.workspaceId,
          isActive: true,
          emailVerified: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
    } else {
      // Create fresh user in the tenant
      user = await db.user.create({
        data: {
          email: effectiveEmail,
          name: trimmedName,
          role: normalizedRole,
          phone: normalizedPhone || null,
          passwordHash,
          tenantId: authUser.tenantId,
          workspaceId: authUser.workspaceId,
          isActive: true,
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
    }

    const portalUrl =
      process.env.BGOS_PUBLIC_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'https://bgos.fieseros.com';

    const loginUrl = `${portalUrl}/login`;
    const roleCapitalized = normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);

    // Dispatch branded invitation email if deliverable email was provided
    let emailSent = false;
    let emailError: string | null = null;
    if (trimmedEmail && isDeliverableEmail(trimmedEmail)) {
      try {
        const html = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #0F172A; background-color: #ffffff;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="font-size: 26px; font-weight: 800; color: #0B9042; letter-spacing: -0.5px;">BGOS</span>
            </div>
            <h1 style="font-size: 20px; font-weight: 700; margin-bottom: 12px; color: #0F172A;">
              You've been invited to join ${businessName}
            </h1>
            <p style="font-size: 15px; line-height: 24px; color: #334155; margin-bottom: 20px;">
              Hello <strong>${trimmedName}</strong>,<br/><br/>
              You have been added to <strong>${businessName}</strong> on ServiceOS BGOS as <strong>${roleCapitalized}</strong>.
            </p>
            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
              <p style="margin: 0 0 10px 0; font-size: 13px; font-weight: 700; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Sign-In Options</p>
              ${normalizedPhone ? `<p style="margin: 6px 0; font-size: 14px; color: #0F172A;">📱 <strong>Phone + OTP (Recommended):</strong> Open the BGOS app and log in with <strong>${normalizedPhone}</strong></p>` : ''}
              <p style="margin: 6px 0; font-size: 14px; color: #0F172A;">✉️ <strong>Email:</strong> ${trimmedEmail}</p>
              <p style="margin: 6px 0; font-size: 14px; color: #0F172A;">🔑 <strong>Temporary Password:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: 700;">${tempPassword}</code></p>
            </div>
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${loginUrl}" style="display: inline-block; background-color: #0B9042; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 28px; border-radius: 10px;">
                Open BGOS Portal &rarr;
              </a>
            </div>
            <p style="font-size: 12px; color: #94A3B8; text-align: center; margin-top: 32px; border-top: 1px solid #F1F5F9; padding-top: 16px;">
              If you did not expect this invitation, you can safely ignore this email.
            </p>
          </div>
        `;
        const text = `Hello ${trimmedName},\n\nYou have been invited to join ${businessName} on ServiceOS BGOS as ${roleCapitalized}!\n\nAccess portal: ${loginUrl}\nEmail: ${trimmedEmail}\nTemporary Password: ${tempPassword}\n\n${normalizedPhone ? `You can also sign in instantly on the BGOS mobile app with your phone number (${normalizedPhone}) and SMS OTP.` : ''}`;

        const sendResult = await sendEmail({
          to: trimmedEmail,
          subject: `Invitation to join ${businessName} on BGOS`,
          html,
          text,
          usageType: 'transactional',
          tenantId: authUser.tenantId,
        });

        emailSent = Boolean(sendResult?.success);
        if (!sendResult?.success) {
          emailError = sendResult?.error || 'Email dispatch failed';
        }
      } catch (err: any) {
        console.error('[api/users] Failed to send invitation email:', err);
        emailError = err?.message || 'Email service error';
      }
    }

    const whatsappShareText = normalizedPhone
      ? `Hello ${trimmedName}, you have been added to ${businessName} on ServiceOS BGOS as ${roleCapitalized}!\n\n📱 Instant Mobile Sign-in: Open the BGOS app & log in with your phone (${normalizedPhone}) using SMS OTP.\n\n🌐 Web Portal: ${loginUrl}\nEmail: ${effectiveEmail}\nTemp Password: ${tempPassword}`
      : `Hello ${trimmedName}, you have been invited to join ${businessName} on ServiceOS BGOS as ${roleCapitalized}!\n\nAccess portal: ${loginUrl}\nEmail: ${effectiveEmail}\nTemporary Password: ${tempPassword}\n\nPlease log in and update your password.`;

    return NextResponse.json(
      {
        user,
        emailSent,
        emailError,
        tempPassword,
        loginUrl,
        whatsappShareText,
        businessName,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
