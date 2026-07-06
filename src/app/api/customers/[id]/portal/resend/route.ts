import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { getAuthUser, getAppUrl } from '@/lib/auth'
import { sendEmail } from '@/lib/email-send'

// POST /api/customers/[id]/portal/resend
// Regenerates the activation link for a customer whose portal is enabled but
// who hasn't activated yet (or who needs a password reset).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user || !['owner', 'admin', 'manager', 'employee', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only staff can resend invitations.' },
        { status: 403 }
      )
    }

    const { id } = await params

    const customer = await db.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        portalEnabled: true,
        invitationStatus: true,
        workspace: {
          select: {
            tenant: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Auto-enable portal if it wasn't already (resend implies they want access)
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await db.customer.update({
      where: { id },
      data: {
        portalEnabled: true,
        invitationStatus: 'pending',
        invitationSentAt: new Date(),
        activationToken: token,
        activationTokenExpiresAt: expiresAt,
      },
    })

    // Build the activation URL. Resolve the tenant slug the same way as
    // /api/customers/[id]/portal/enable: prefer the customer's workspace→tenant
    // chain, but fall back to the authenticated staff user's tenantId so we
    // never generate a slug-less URL when the customer has no workspace.
    const baseUrl = getAppUrl(request)
    let slug = customer.workspace?.tenant?.slug || null
    let tenantId = customer.workspace?.tenant?.id || user.tenantId || null
    let tenantName = customer.workspace?.tenant?.name || null
    if ((!slug || !tenantId) && user.tenantId) {
      try {
        const tenant = await db.tenant.findUnique({
          where: { id: user.tenantId },
          select: { id: true, name: true, slug: true },
        })
        slug = slug || tenant?.slug || null
        tenantId = tenantId || tenant?.id || null
        tenantName = tenantName || tenant?.name || null
      } catch {
        // ignore — fall back to slug-less URL (handled by /accept-invite route)
      }
    }
    const activationUrl = slug
      ? `${baseUrl}/${slug}/accept-invite?token=${token}`
      : `${baseUrl}/accept-invite?token=${token}`

    // ── Actually email the new activation link to the customer ──────────
    // Previously the resend only refreshed the DB row + returned the URL —
    // staff still had to copy/paste. Now we send a branded invitation email
    // with an "Activate Account" button. Wrapped in try/catch so the resend
    // request still succeeds (and returns the URL for manual copy) even if
    // email delivery fails.
    let emailSent = false
    let emailError: string | undefined
    if (customer.email) {
      try {
        const activateButton = `<div style="margin: 24px 0;"><a href="${activationUrl}" style="display:inline-block;padding:12px 28px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Activate Account</a></div>`
        const html = [
          `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px">`,
          `<h2 style="color:#0f172a;">Your portal invitation is ready</h2>`,
          `<p>Hi ${customer.name || 'there'},</p>`,
          `<p>${tenantName || 'ServiceOS'} has sent you a new customer portal invitation. Use the button below to activate your account and start tracking your jobs, invoices, and quotes online.</p>`,
          activateButton,
          `<p style="font-size:13px;color:#6b7280;">Or copy this link into your browser:<br/><a href="${activationUrl}" style="color:#059669;word-break:break-all;">${activationUrl}</a></p>`,
          `<p style="font-size:12px;color:#9ca3af;">This invitation link expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>`,
          `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;" />`,
          `<p style="font-size:12px;color:#9ca3af;">— Sent from ${tenantName || 'ServiceOS'}</p>`,
          `</div>`,
        ].join('\n')
        const r = await sendEmail({
          to: customer.email,
          subject: `Your portal invitation from ${tenantName || 'ServiceOS'}`,
          html,
          text: `You're invited to the ${tenantName || 'ServiceOS'} customer portal.\n\nActivate your account: ${activationUrl}\n\nThis invitation link expires in 7 days.\n\n— ${tenantName || 'ServiceOS'}`,
          usageType: 'transactional',
          tenantId: tenantId || undefined,
        })
        emailSent = !!r.success
        emailError = r.error
      } catch (err) {
        console.error('[portal/resend] invitation email send failed:', err)
        emailError = String(err)
      }
    }

    return NextResponse.json({
      success: true,
      portalEnabled: true,
      invitationStatus: 'pending',
      activationUrl,
      token,
      expiresAt: expiresAt.toISOString(),
      emailSent,
      emailError,
      message: customer.email
        ? emailSent
          ? `New activation link generated and emailed to ${customer.email}.`
          : `New activation link generated for ${customer.email}, but email failed to send — share the link manually.`
        : 'New activation link generated.',
    })
  } catch (error) {
    console.error('Error resending customer invitation:', error)
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    )
  }
}
