import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

function safeParseJson(str: string): unknown[] {
  try {
    return JSON.parse(str || '[]')
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { jobId } = body

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const job = await db.job.findUnique({ where: { id: jobId } })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Get available employees and resources
    const availableEmployees = await db.employee.findMany({
      where: { status: 'available' },
      orderBy: { rating: 'desc' },
    })

    const availableResources = await db.resource.findMany({
      where: { status: 'available' },
      orderBy: { rating: 'desc' },
    })

    // Log notification attempt
    const logEntry = {
      action: 'whatsapp_assign_initiated',
      jobId,
      availableEmployees: availableEmployees.length,
      availableResources: availableResources.length,
      timestamp: new Date().toISOString(),
    }
    const currentLogs = safeParseJson(job.notificationLogJson)
    currentLogs.push(logEntry)

    await db.job.update({
      where: { id: jobId },
      data: { notificationLogJson: JSON.stringify(currentLogs) },
    })

    // Simulate sending WhatsApp interactive message
    const simulatedMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      type: 'interactive',
      interactive: {
        type: 'button',
        body: {
          text: `New Job Assignment: ${job.title}\n\nLocation: ${job.address || 'N/A'}\nPriority: ${job.priority}\n\nDo you accept this job?`,
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: `accept_${jobId}`, title: '✅ Accept' } },
            { type: 'reply', reply: { id: `reject_${jobId}`, title: '❌ Reject' } },
          ],
        },
      },
    }

    return NextResponse.json({
      success: true,
      jobId,
      availableEmployees: availableEmployees.map((e) => ({
        id: e.id,
        name: e.name,
        phone: e.phone,
        role: e.role,
        rating: e.rating,
        location: e.location,
      })),
      availableResources: availableResources.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        type: r.type,
        rating: r.rating,
        location: r.location,
      })),
      simulatedMessage,
    })
  } catch (error) {
    console.error('Error assigning via WhatsApp:', error)
    return NextResponse.json({ error: 'Failed to assign via WhatsApp' }, { status: 500 })
  }
}
