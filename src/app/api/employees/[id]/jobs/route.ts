import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/employees/[id]/jobs
 * Get all jobs assigned to a specific employee (for the employee portal).
 * Params: id (employee ID)
 * Query: status (optional filter: assigned, in_progress, completed)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // Verify employee exists
    const employee = await db.employee.findUnique({
      where: { id },
      select: { id: true, name: true, status: true },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Build where clause
    const where: Record<string, unknown> = {
      assigneeId: id,
    }

    if (statusFilter) {
      const validStatuses = ['assigned', 'in_progress', 'completed', 'pending', 'cancelled']
      if (!validStatuses.includes(statusFilter)) {
        return NextResponse.json(
          { error: `Invalid status filter. Must be one of: ${validStatuses.join(', ')}` },
          { status: 400 }
        )
      }
      where.status = statusFilter
    }

    const jobs = await db.job.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
          },
        },
      },
      orderBy: [
        { scheduledAt: 'desc' },
        { createdAt: 'desc' },
      ],
    })

    return NextResponse.json({
      employee: {
        id: employee.id,
        name: employee.name,
        status: employee.status,
      },
      jobs,
    })
  } catch (error) {
    console.error('Error fetching employee jobs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee jobs' },
      { status: 500 }
    )
  }
}
