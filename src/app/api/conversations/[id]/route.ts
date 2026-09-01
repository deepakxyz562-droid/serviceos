import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/conversations/[id] - Get conversation by ID with messages
//
// Security-3 IDOR fix:
//   The file previously imported `getAuthUser` but NEVER CALLED IT in GET —
//   any caller could read any conversation by ID. Now we require auth and
//   scope the lookup to the caller's tenant (super-admins bypass).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── Security-3 IDOR fix: require authentication + tenant isolation ──
    const user = await getAuthUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    // Tenant-scoped lookup: super-admins can access any tenant; everyone
    // else is constrained to their own tenant.
    const isSuperAdmin =
      user.isSuperAdmin || user.role === 'superadmin' || user.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: user.tenantId }

    const conversation = await db.conversation.findFirst({
      where: { id, ...tenantFilter },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        lead: { select: { id: true, name: true, status: true, serviceType: true } },
        job: { select: { id: true, title: true, status: true, assigneeName: true } },
        tenant: { select: { id: true, name: true } },
      },
    })

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Parse messages from JSON
    let messages: unknown[] = []
    try {
      messages = JSON.parse(conversation.messagesJson || '[]')
    } catch {
      messages = []
    }

    return NextResponse.json({
      conversation: {
        ...conversation,
        messages,
      },
    })
  } catch (error) {
    console.error('Error fetching conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/conversations/[id] - Update conversation (change stage, add message)
//
// Security-3 IDOR fix:
//   The PUT handler already called `getAuthUser()` but performed NO tenant
//   check — the findUnique used only `{ id }`, so a caller from tenant A
//   could update a conversation owned by tenant B. Now the lookup uses
//   findFirst with the tenant filter so cross-tenant updates 404.
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Tenant-scoped lookup: super-admins can access any tenant; everyone
    // else is constrained to their own tenant.
    const isSuperAdmin =
      authUser.isSuperAdmin ||
      authUser.role === 'superadmin' ||
      authUser.role === 'super_admin'
    const tenantFilter = isSuperAdmin ? {} : { tenantId: authUser.tenantId }

    const { id } = await params
    const body = await request.json()

    const existing = await db.conversation.findFirst({
      where: { id, ...tenantFilter },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const {
      status,
      currentStage,
      message,
      intentDetected,
      intentConfidence,
      customerId,
      leadId,
      jobId,
    } = body

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (status) updateData.status = status
    if (currentStage) updateData.currentStage = currentStage
    if (intentDetected !== undefined) updateData.intentDetected = intentDetected
    if (intentConfidence !== undefined) updateData.intentConfidence = intentConfidence
    if (customerId !== undefined) updateData.customerId = customerId
    if (leadId !== undefined) updateData.leadId = leadId
    if (jobId !== undefined) updateData.jobId = jobId

    // Add message to messagesJson if provided
    if (message) {
      let messages: unknown[] = []
      try {
        messages = JSON.parse(existing.messagesJson || '[]')
      } catch {
        messages = []
      }

      messages.push({
        id: `msg_${Date.now()}`,
        body: message.body || message,
        direction: message.direction || 'outbound',
        timestamp: new Date().toISOString(),
        ...(message.type && { type: message.type }),
        ...(message.interactive && { interactive: message.interactive }),
      })

      updateData.messagesJson = JSON.stringify(messages)
      updateData.lastMessageAt = new Date()
      updateData.lastMessageBody = typeof message === 'string' ? message : message.body || ''
      updateData.lastDirection = message.direction || 'outbound'
    }

    const conversation = await db.conversation.update({
      where: { id },
      data: updateData,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        lead: { select: { id: true, name: true, status: true } },
        job: { select: { id: true, title: true, status: true } },
      },
    })

    return NextResponse.json({ conversation })
  } catch (error) {
    console.error('Error updating conversation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
