import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Map dot-notation events (e.g., job.created) to their
 * SCREAMING_SNAKE_CASE equivalents for backward compatibility.
 */
const EVENT_ALIASES: Record<string, string> = {
  'job.created': 'NEW_JOB',
  'job.updated': 'UPDATE_JOB',
  'job.cancelled': 'CANCEL_JOB',
  'job.assigned': 'UPDATE_JOB',
  'job.accepted': 'UPDATE_JOB',
  'job.started': 'UPDATE_JOB',
  'job.completed': 'UPDATE_JOB',
  'job.rejected': 'UPDATE_JOB',
}

function normalizeEvent(event: string): string {
  return EVENT_ALIASES[event] || event
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { source, event: rawEvent, data } = body

    if (!rawEvent || !data) {
      return NextResponse.json({ error: 'event and data are required' }, { status: 400 })
    }

    const event = normalizeEvent(rawEvent)

    switch (event) {
      case 'NEW_JOB': {
        const job = await db.job.create({
          data: {
            title: data.title || 'New Job',
            description: data.description,
            status: data.status || 'pending',
            priority: data.priority || 'medium',
            type: data.type || 'delivery',
            address: data.address,
            pickup: data.pickup,
            dropoff: data.dropoff,
            scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
            notes: data.notes,
            customerId: data.customerId,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            externalId: data.externalId,
            externalSource: source || data.externalSource,
            workspaceId: data.workspaceId,
          },
        })

        // Update webhook source last sync time
        if (source) {
          await db.webhookSource.updateMany({
            where: { type: source, status: 'active' },
            data: { lastSyncAt: new Date() },
          })
        }

        return NextResponse.json({ success: true, job }, { status: 201 })
      }

      case 'UPDATE_JOB': {
        if (!data.externalId) {
          return NextResponse.json({ error: 'externalId is required for UPDATE_JOB' }, { status: 400 })
        }

        const existingJob = await db.job.findFirst({
          where: { externalId: data.externalId },
        })

        if (!existingJob) {
          return NextResponse.json({ error: 'Job not found with given externalId' }, { status: 404 })
        }

        const updateData: Record<string, unknown> = {}
        if (data.title !== undefined) updateData.title = data.title
        if (data.description !== undefined) updateData.description = data.description
        if (data.status !== undefined) updateData.status = data.status
        if (data.priority !== undefined) updateData.priority = data.priority
        if (data.type !== undefined) updateData.type = data.type
        if (data.address !== undefined) updateData.address = data.address
        if (data.pickup !== undefined) updateData.pickup = data.pickup
        if (data.dropoff !== undefined) updateData.dropoff = data.dropoff
        if (data.notes !== undefined) updateData.notes = data.notes
        if (data.customerName !== undefined) updateData.customerName = data.customerName
        if (data.customerPhone !== undefined) updateData.customerPhone = data.customerPhone

        const job = await db.job.update({
          where: { id: existingJob.id },
          data: updateData,
        })

        // Update webhook source last sync time
        if (source) {
          await db.webhookSource.updateMany({
            where: { type: source, status: 'active' },
            data: { lastSyncAt: new Date() },
          })
        }

        return NextResponse.json({ success: true, job })
      }

      case 'CANCEL_JOB': {
        if (!data.externalId) {
          return NextResponse.json({ error: 'externalId is required for CANCEL_JOB' }, { status: 400 })
        }

        const existingJob = await db.job.findFirst({
          where: { externalId: data.externalId },
        })

        if (!existingJob) {
          return NextResponse.json({ error: 'Job not found with given externalId' }, { status: 404 })
        }

        const job = await db.job.update({
          where: { id: existingJob.id },
          data: { status: 'cancelled' },
        })

        // If job had a resource, set it back to available
        if (existingJob.resourceId) {
          await db.resource.update({
            where: { id: existingJob.resourceId },
            data: { status: 'available' },
          })
        }

        // Update webhook source last sync time
        if (source) {
          await db.webhookSource.updateMany({
            where: { type: source, status: 'active' },
            data: { lastSyncAt: new Date() },
          })
        }

        return NextResponse.json({ success: true, job })
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown event: ${rawEvent}`,
            hint: 'Supported events: NEW_JOB, UPDATE_JOB, CANCEL_JOB, job.created, job.updated, job.cancelled, job.assigned, job.accepted, job.started, job.completed, job.rejected',
          },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return NextResponse.json({ error: 'Failed to process webhook' }, { status: 500 })
  }
}
