import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { EventBus } from '@/lib/event-bus'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const search = searchParams.get('search')
    const priority = searchParams.get('priority')
    const assigneeId = searchParams.get('assigneeId')
    const customerId = searchParams.get('customerId')

    const where: Record<string, unknown> = {}

    if (status) where.status = status
    if (type) where.type = type
    if (priority) where.priority = priority
    if (assigneeId) where.assigneeId = assigneeId
    if (customerId) where.customerId = customerId
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { customerName: { contains: search } },
        { assigneeName: { contains: search } },
        { address: { contains: search } },
      ]
    }

    const jobs = await db.job.findMany({
      where,
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Error fetching jobs:', error)
    return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const job = await db.job.create({
      data: {
        title: body.title,
        description: body.description,
        status: body.status || 'pending',
        priority: body.priority || 'medium',
        type: body.type || 'delivery',
        address: body.address,
        pickup: body.pickup,
        dropoff: body.dropoff,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : undefined,
        notes: body.notes,
        customerId: body.customerId,
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        assigneeId: body.assigneeId,
        assigneeName: body.assigneeName,
        assigneePhone: body.assigneePhone,
        resourceId: body.resourceId,
        externalId: body.externalId,
        externalSource: body.externalSource,
        workspaceId: body.workspaceId,
      },
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
    })

    // Build event data with full job + employee + customer info
    const employee = job.assigneeId
      ? await db.employee.findUnique({ where: { id: job.assigneeId } })
      : null
    const customer = job.customerId
      ? await db.customer.findUnique({ where: { id: job.customerId } })
      : null

    // Emit job.created event via EventBus (handles auto-notifications + webhook dispatch + audit)
    try {
      await EventBus.emit('job.created', {
        job: {
          id: job.id,
          title: job.title,
          description: job.description,
          status: job.status,
          priority: job.priority,
          type: job.type,
          address: job.address,
          scheduledAt: job.scheduledAt?.toISOString(),
          scheduledTime: job.scheduledTime,
          customerName: job.customerName,
          customerPhone: job.customerPhone,
          customerEmail: customer?.email,
          customerId: job.customerId,
          customerUserId: undefined,
          assigneeId: job.assigneeId,
          assigneeName: job.assigneeName,
          workspaceId: job.workspaceId,
          tenantId: undefined,
          jobNumber: job.jobNumber,
        },
        employee: employee ? {
          id: employee.id,
          name: employee.name,
          phone: employee.phone,
          email: employee.email,
          whatsappId: employee.whatsappId,
          userId: employee.userId,
          workspaceId: employee.workspaceId,
        } : null,
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
        } : (job.customerPhone ? { name: job.customerName, phone: job.customerPhone } : null),
        jobId: job.id,
        resourceType: 'job',
        resourceId: job.id,
        summary: `New job: ${job.title}`,
      }, { tenantId: undefined, workspaceId: job.workspaceId || undefined })
    } catch (eventErr) {
      console.error('[JobsAPI] Failed to emit job.created event:', eventErr)
    }

    // If job was created with an assignee, also emit job.assigned
    if (job.assigneeId && employee) {
      try {
        await EventBus.emit('job.assigned', {
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
            status: job.status,
            priority: job.priority,
            type: job.type,
            address: job.address,
            scheduledAt: job.scheduledAt?.toISOString(),
            scheduledTime: job.scheduledTime,
            customerName: job.customerName,
            customerPhone: job.customerPhone,
            customerEmail: customer?.email,
            customerId: job.customerId,
            customerUserId: undefined,
            assigneeId: job.assigneeId,
            assigneeName: job.assigneeName,
            workspaceId: job.workspaceId,
            tenantId: undefined,
            jobNumber: job.jobNumber,
          },
          employee: {
            id: employee.id,
            name: employee.name,
            phone: employee.phone,
            email: employee.email,
            whatsappId: employee.whatsappId,
            userId: employee.userId,
            workspaceId: employee.workspaceId,
          },
          jobId: job.id,
          employeeId: employee.id,
          resourceType: 'job',
          resourceId: job.id,
          summary: `Job assigned to ${employee.name}`,
        }, { tenantId: undefined, workspaceId: job.workspaceId || undefined })
      } catch (eventErr) {
        console.error('[JobsAPI] Failed to emit job.assigned event:', eventErr)
      }
    }

    return NextResponse.json(job, { status: 201 })
  } catch (error) {
    console.error('Error creating job:', error)
    return NextResponse.json({ error: 'Failed to create job' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...data } = body

    if (!id) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400 })
    }

    // Handle date fields
    const updateData: Record<string, unknown> = { ...data }
    if (data.scheduledAt) updateData.scheduledAt = new Date(data.scheduledAt)
    if (data.actualStartTime) updateData.actualStartTime = new Date(data.actualStartTime)
    if (data.actualEndTime) updateData.actualEndTime = new Date(data.actualEndTime)

    // Get current job state for comparison
    const existingJob = await db.job.findUnique({
      where: { id },
      include: { assignee: true, customer: true },
    })

    const job = await db.job.update({
      where: { id },
      data: updateData,
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
    })

    // Emit events for status changes
    if (data.status && existingJob) {
      const employee = job.assignee || existingJob.assignee
      const customer = job.customer || existingJob.customer

      // Job cancelled
      if (data.status === 'cancelled') {
        try {
          await EventBus.emit('job.cancelled', {
            job: {
              id: job.id,
              title: job.title,
              status: 'cancelled',
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              assigneeName: job.assigneeName,
              workspaceId: job.workspaceId,
              jobNumber: job.jobNumber,
            },
            employee: employee ? {
              id: employee.id,
              name: employee.name,
              phone: employee.phone,
              email: employee.email,
              whatsappId: employee.whatsappId,
              userId: employee.userId,
              workspaceId: employee.workspaceId,
            } : null,
            customer: customer ? {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
            } : null,
            jobId: job.id,
            reason: data.cancelReason,
            resourceType: 'job',
            resourceId: job.id,
            fromStatus: existingJob.status,
            toStatus: 'cancelled',
            summary: `Job cancelled: ${job.title}`,
          }, { workspaceId: job.workspaceId || undefined })
        } catch (eventErr) {
          console.error('[JobsAPI] Failed to emit job.cancelled event:', eventErr)
        }
      }

      // Job completed
      if (data.status === 'completed') {
        try {
          await EventBus.emit('job.completed', {
            job: {
              id: job.id,
              title: job.title,
              description: job.description,
              status: 'completed',
              address: job.address,
              scheduledAt: job.scheduledAt?.toISOString(),
              scheduledTime: job.scheduledTime,
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              customerEmail: customer?.email,
              customerId: job.customerId,
              customerUserId: undefined,
              assigneeId: job.assigneeId,
              assigneeName: job.assigneeName,
              workspaceId: job.workspaceId,
              tenantId: undefined,
              jobNumber: job.jobNumber,
            },
            employee: employee ? {
              id: employee.id,
              name: employee.name,
              phone: employee.phone,
              email: employee.email,
              whatsappId: employee.whatsappId,
              userId: employee.userId,
              workspaceId: employee.workspaceId,
            } : null,
            customer: customer ? {
              id: customer.id,
              name: customer.name,
              phone: customer.phone,
              email: customer.email,
            } : null,
            jobId: job.id,
            resourceType: 'job',
            resourceId: job.id,
            fromStatus: existingJob.status,
            toStatus: 'completed',
            summary: `Job completed: ${job.title}`,
          }, { workspaceId: job.workspaceId || undefined })
        } catch (eventErr) {
          console.error('[JobsAPI] Failed to emit job.completed event:', eventErr)
        }
      }

      // Job started (in_progress)
      if (data.status === 'in_progress' || data.status === 'started') {
        try {
          await EventBus.emit('job.started', {
            job: {
              id: job.id,
              title: job.title,
              description: job.description,
              status: data.status,
              address: job.address,
              scheduledAt: job.scheduledAt?.toISOString(),
              scheduledTime: job.scheduledTime,
              customerName: job.customerName,
              customerPhone: job.customerPhone,
              customerEmail: customer?.email,
              customerId: job.customerId,
              assigneeName: job.assigneeName,
              workspaceId: job.workspaceId,
              jobNumber: job.jobNumber,
            },
            employee: employee ? {
              id: employee.id,
              name: employee.name,
              phone: employee.phone,
              email: employee.email,
              whatsappId: employee.whatsappId,
              userId: employee.userId,
              workspaceId: employee.workspaceId,
            } : null,
            jobId: job.id,
            resourceType: 'job',
            resourceId: job.id,
            fromStatus: existingJob.status,
            toStatus: data.status,
            summary: `Job started: ${job.title}`,
          }, { workspaceId: job.workspaceId || undefined })
        } catch (eventErr) {
          console.error('[JobsAPI] Failed to emit job.started event:', eventErr)
        }
      }

      // Job assigned (assigneeId changed)
      if (data.assigneeId && data.assigneeId !== existingJob.assigneeId) {
        const newEmployee = await db.employee.findUnique({ where: { id: data.assigneeId } })
        if (newEmployee) {
          try {
            await EventBus.emit('job.assigned', {
              job: {
                id: job.id,
                title: job.title,
                description: job.description,
                status: job.status,
                priority: job.priority,
                type: job.type,
                address: job.address,
                scheduledAt: job.scheduledAt?.toISOString(),
                scheduledTime: job.scheduledTime,
                customerName: job.customerName,
                customerPhone: job.customerPhone,
                customerEmail: customer?.email,
                customerId: job.customerId,
                customerUserId: undefined,
                assigneeId: data.assigneeId,
                assigneeName: newEmployee.name,
                workspaceId: job.workspaceId,
                tenantId: undefined,
                jobNumber: job.jobNumber,
              },
              employee: {
                id: newEmployee.id,
                name: newEmployee.name,
                phone: newEmployee.phone,
                email: newEmployee.email,
                whatsappId: newEmployee.whatsappId,
                userId: newEmployee.userId,
                workspaceId: newEmployee.workspaceId,
              },
              jobId: job.id,
              employeeId: newEmployee.id,
              resourceType: 'job',
              resourceId: job.id,
              summary: `Job reassigned to ${newEmployee.name}`,
            }, { workspaceId: job.workspaceId || undefined })
          } catch (eventErr) {
            console.error('[JobsAPI] Failed to emit job.assigned event:', eventErr)
          }
        }
      }
    }

    return NextResponse.json(job)
  } catch (error) {
    console.error('Error updating job:', error)
    return NextResponse.json({ error: 'Failed to update job' }, { status: 500 })
  }
}
