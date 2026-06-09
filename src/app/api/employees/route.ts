import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const workspaceId = searchParams.get('workspaceId')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}

    if (role) where.role = role
    if (status) where.status = status
    if (workspaceId) where.workspaceId = workspaceId
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { location: { contains: search } },
      ]
    }

    const employees = await db.employee.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(employees)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      phone,
      role,
      skills,
      status,
      avatar,
      whatsappId,
      rating,
      completedJobs,
      location,
      workspaceId,
      lastSeenAt,
      currentJobId,
      userId,
      lastLocationAt,
      onLeaveUntil,
      latitude,
      longitude,
    } = body

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
    }

    const employee = await db.employee.create({
      data: {
        name,
        phone,
        role: role || 'driver',
        skills: skills ? JSON.stringify(skills) : '[]',
        status: status || 'available',
        avatar,
        whatsappId,
        rating: rating ?? 0,
        completedJobs: completedJobs ?? 0,
        location,
        latitude,
        longitude,
        workspaceId,
        lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null,
        currentJobId: currentJobId || null,
        userId: userId || null,
        lastLocationAt: lastLocationAt ? new Date(lastLocationAt) : null,
        onLeaveUntil: onLeaveUntil ? new Date(onLeaveUntil) : null,
      },
    })

    return NextResponse.json(employee, { status: 201 })
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const {
      name,
      phone,
      role,
      skills,
      status,
      avatar,
      whatsappId,
      rating,
      completedJobs,
      location,
      lastSeenAt,
      currentJobId,
      userId,
      lastLocationAt,
      onLeaveUntil,
      latitude,
      longitude,
      workspaceId,
    } = body

    const employee = await db.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(phone && { phone }),
        ...(role && { role }),
        ...(skills && { skills: JSON.stringify(skills) }),
        ...(status && { status }),
        ...(avatar !== undefined && { avatar }),
        ...(whatsappId !== undefined && { whatsappId }),
        ...(rating !== undefined && { rating }),
        ...(completedJobs !== undefined && { completedJobs }),
        ...(location !== undefined && { location }),
        ...(latitude !== undefined && { latitude }),
        ...(longitude !== undefined && { longitude }),
        ...(workspaceId !== undefined && { workspaceId }),
        ...(lastSeenAt !== undefined && { lastSeenAt: lastSeenAt ? new Date(lastSeenAt) : null }),
        ...(currentJobId !== undefined && { currentJobId: currentJobId || null }),
        ...(userId !== undefined && { userId: userId || null }),
        ...(lastLocationAt !== undefined && { lastLocationAt: lastLocationAt ? new Date(lastLocationAt) : null }),
        ...(onLeaveUntil !== undefined && { onLeaveUntil: onLeaveUntil ? new Date(onLeaveUntil) : null }),
      },
    })

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Error updating employee:', error)
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Employee ID is required' }, { status: 400 })
    }

    await db.employee.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting employee:', error)
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 })
  }
}
