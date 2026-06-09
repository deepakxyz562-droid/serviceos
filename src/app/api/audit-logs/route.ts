import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/audit-logs - List audit logs with filters
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const action = searchParams.get('action')
    const resourceType = searchParams.get('resourceType')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    const where: Record<string, unknown> = {}

    if (userId) where.userId = userId
    if (action) where.action = { contains: action }
    if (resourceType) where.resourceType = resourceType

    // Date range filter
    const dateFilter: Record<string, unknown> = {}
    if (startDate) dateFilter.gte = new Date(startDate)
    if (endDate) dateFilter.lte = new Date(endDate)
    if (Object.keys(dateFilter).length > 0) {
      where.createdAt = dateFilter
    }

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.auditLog.count({ where }),
    ])

    // Parse metadataJson for each log
    const formattedLogs = logs.map(log => {
      let metadata = null
      try {
        metadata = JSON.parse(log.metadataJson || 'null')
      } catch {
        metadata = null
      }

      return {
        id: log.id,
        userId: log.userId,
        user: log.user,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        ip: log.ip,
        metadata,
        createdAt: log.createdAt,
      }
    })

    return NextResponse.json({
      logs: formattedLogs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error('Error listing audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
