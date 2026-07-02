import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email-send'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, subject, text, html, providerId, usageType } = body

    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "to" email address' },
        { status: 400 }
      )
    }

    const result = await sendEmail({
      to,
      subject: subject || 'Test Email from ServiceOS',
      text: text || 'This is a test email sent from ServiceOS.',
      html: html || undefined,
      providerId: providerId || undefined,
      usageType: usageType || undefined,
      tenantId: authUser.tenantId || undefined,
    })

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      simulated: result.simulated,
      error: result.error,
      providerUsed: result.providerUsed,
      providerRequired: result.providerRequired,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
