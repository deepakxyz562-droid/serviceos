import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'
import { sendEmail } from '@/lib/email-send'

// POST /api/employees/[id]/invite
// Generates an invitation link for an employee to activate their account.
// Creates (or reuses) a User record + creates an Invitation record.
// Sends the invitation email with the activation link.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only owners/admins can send invitations.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const employee = await db.employee.findUnique({
      where: { id },
      include: {
        userAccount: {
          select: { id: true, email: true, name: true, isActive: true },
        },
        workspace: {
          select: { id: true, tenantId: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // Determine the email to invite
    const email = employee.email || employee.userAccount?.email
    if (!email) {
      return NextResponse.json(
        { error: 'Employee has no email address. Add an email to send an invitation.' },
        { status: 400 }
      )
    }

    // Determine tenantId + workspaceId
    const tenantId = employee.workspace?.tenantId || user.tenantId
    const workspaceId = employee.workspaceId || employee.workspace?.id || user.workspaceId

    // Create or reuse the User account
    let userId = employee.userId
    if (!userId) {
      // Check if a user with that email already exists
      const existingUser = await db.user.findUnique({ where: { email } })
      if (existingUser) {
        userId = existingUser.id
        // Link the employee to the user account
        await db.employee.update({
          where: { id },
          data: { userId: existingUser.id },
        })
      } else {
        // Create a new (inactive) user account — they'll set their password via the invitation
        const newUser = await db.user.create({
          data: {
            email,
            name: employee.name,
            phone: employee.phone,
            role: employee.role === 'owner' ? 'owner' : 'employee',
            authProvider: 'email',
            isActive: false, // inactive until they accept the invitation
            tenantId,
            workspaceId,
          },
        })
        userId = newUser.id
        await db.employee.update({
          where: { id },
          data: { userId: newUser.id },
        })
      }
    }

    // Delete any existing invitations for this employee (employeeId is unique)
    await db.invitation.deleteMany({
      where: { employeeId: id },
    })

    // Generate a secure token (valid for 7 days)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Create the invitation
    const invitation = await db.invitation.create({
      data: {
        token,
        email,
        name: employee.name,
        role: 'employee',
        phone: employee.phone,
        status: 'pending',
        invitedById: user.id,
        tenantId,
        workspaceId,
        employeeId: id,
        expiresAt,
      },
    })

    // Update the employee's invitation status
    await db.employee.update({
      where: { id },
      data: { invitationStatus: 'pending' },
    })

    // Build the activation URL — include the company slug so the link
    // matches the /{companySlug}/accept-invite route.
    const baseUrl = getAppUrl(request)
    let tenantSlug: string | null = null
    let tenantName: string | null = null
    if (tenantId) {
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: tenantId },
          select: { slug: true, name: true },
        })
        tenantSlug = tenant?.slug || null
        tenantName = tenant?.name || null
      } catch {
        // ignore — fall back to slug-less URL
      }
    }
    const activationUrl = tenantSlug
      ? `${baseUrl}/${tenantSlug}/accept-invite?token=${token}`
      : `${baseUrl}/accept-invite?token=${token}`

    // ── Send the invitation email ────────────────────────────────────────
    // Previously this route only generated the link and returned it to the
    // caller — the email was NEVER sent. The owner had to manually share
    // the URL. Now we send it via sendEmail() (same pattern as the
    // verification + welcome emails).
    try {
      const businessName = tenantName || 'your business'
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${escapeHtml(businessName)} on Fieseros</title>
</head>
<body style="font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f1f5f9;margin:0;padding:0;width:100%">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(15,23,42,0.06),0 1px 3px rgba(15,23,42,0.04);border:1px solid #e2e8f0;max-width:600px;width:100%">
          <tr><td style="background-color:#0f766e;height:6px;line-height:6px"></td></tr>
          <tr>
            <td style="padding:32px 40px 20px;text-align:center;">
              <div style="display:inline-block;width:52px;height:52px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:14px;line-height:52px;color:#0f766e;font-weight:700;font-size:22px;margin-bottom:12px;">&#9993;</div>
              <h1 style="color:#0f172a;font-size:24px;font-weight:700;margin:0 0 6px;letter-spacing:-0.02em;">You're invited!</h1>
              <p style="color:#64748b;font-size:14px;margin:0;">Join ${escapeHtml(businessName)} on Fieseros</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 40px 36px;color:#334155;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 16px;">Hi ${escapeHtml(employee.name)},</p>
              <p style="margin:0 0 16px;">
                You've been invited to join <strong>${escapeHtml(businessName)}</strong> on Fieseros.
                Click the button below to set up your account and start managing jobs, schedules, and more.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td style="background-color:#0f766e;border-radius:10px;padding:13px 28px;">
                    <a href="${escapeHtml(activationUrl)}" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Accept Invitation &rarr;</a>
                  </td>
                </tr>
              </table>
              <p style="color:#64748b;font-size:13px;margin:18px 0 8px;">Or copy this link into your browser:</p>
              <p style="color:#0f766e;font-size:12px;margin:0 0 24px;word-break:break-all;font-family:monospace;background:#f8fafc;padding:10px 12px;border-radius:6px;border:1px solid #e2e8f0;">${escapeHtml(activationUrl)}</p>
              <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:12px 14px;margin-top:20px;">
                <p style="margin:0;color:#78350f;font-size:12px;line-height:1.5;">
                  <strong>This invitation expires in 7 days.</strong> If you didn't expect this invitation, you can safely ignore this email.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();

      const text = `You're invited to join ${businessName} on Fieseros

Hi ${employee.name},

You've been invited to join ${businessName} on Fieseros. Click the link below to set up your account:

${activationUrl}

This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.`;

      await sendEmail({
        to: email,
        subject: `You're invited to join ${businessName} on Fieseros`,
        html,
        text,
        usageType: 'transactional',
      });
    } catch (emailErr) {
      console.error('[employee-invite] Failed to send email:', emailErr);
      // Non-blocking — the invitation is still created, the URL is returned
      // so the owner can share it manually if the email fails.
    }

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      invitationStatus: 'pending',
      activationUrl,
      token,
      email,
      expiresAt: expiresAt.toISOString(),
      message: `Invitation sent to ${email}. The employee will receive an email with a link to activate their account.`,
    })
  } catch (error) {
    console.error('Error sending employee invitation:', error)
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    )
  }
}

function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
