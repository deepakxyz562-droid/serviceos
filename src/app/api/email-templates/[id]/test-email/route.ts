import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import { sendEmail } from '@/lib/email-send'
import { personalizeTemplate } from '@/lib/template-vars'

/**
 * POST /api/email-templates/[id]/test-email
 * Send a test email using a template to the user's own email address.
 * Uses example variable values for preview.
 *
 * Body: { to?: string }  (defaults to the current user's email)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const tenantId = user.tenantId || 'default'

    const { id } = await params
    const template = await db.emailTemplate.findUnique({ where: { id } })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }
    // Ownership check
    if (template.tenantId !== null && template.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({}))
    const to = body.to || user.email

    if (!to || typeof to !== 'string') {
      return NextResponse.json({ error: 'No recipient email address available' }, { status: 400 })
    }

    // Build example variable values from the template's declared variables
    let exampleVars: Record<string, string> = {}
    try {
      const vars = JSON.parse(template.variablesJson || '[]') as Array<{ key: string; example?: string }>
      exampleVars = vars.reduce((acc, v) => {
        if (v.key) acc[v.key] = v.example || `[${v.key}]`
        return acc
      }, {} as Record<string, string>)
    } catch {
      // ignore
    }

    const personalizedSubject = personalizeTemplate(template.subject, exampleVars)
    const personalizedHtml = personalizeTemplate(template.htmlBody, exampleVars)

    const result = await sendEmail({
      to,
      subject: personalizedSubject,
      html: personalizedHtml,
      text: template.textBody || undefined,
      usageType: 'transactional',
      tenantId: user.tenantId || undefined,
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to send test email', simulated: result.simulated },
        { status: 200 } // 200 so the UI can show the error message in a toast
      )
    }

    return NextResponse.json({
      data: {
        sent: true,
        to,
        simulated: result.simulated || false,
        messageId: result.messageId,
      },
    })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
