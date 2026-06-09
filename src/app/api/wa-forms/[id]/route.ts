import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const form = await db.wAForm.findUnique({
      where: { id },
    })

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Don't expose inactive/archived forms via public link
    if (form.status !== 'active') {
      return NextResponse.json({ error: 'This form is no longer available' }, { status: 410 })
    }

    return NextResponse.json({ data: form })
  } catch (error) {
    console.error('Error fetching WA form:', error)
    return NextResponse.json({ error: 'Failed to fetch form' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Check that the form exists
    const existing = await db.wAForm.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Build update data — only include fields that were provided
    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.type !== undefined) updateData.type = body.type
    if (body.fieldsJson !== undefined) updateData.fieldsJson = body.fieldsJson
    if (body.welcomeMessage !== undefined) updateData.welcomeMessage = body.welcomeMessage
    if (body.completionMessage !== undefined) updateData.completionMessage = body.completionMessage
    if (body.status !== undefined) updateData.status = body.status

    const form = await db.wAForm.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ data: form })
  } catch (error) {
    console.error('Error updating WA form:', error)
    return NextResponse.json({ error: 'Failed to update form' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Check that the form exists
    const existing = await db.wAForm.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }

    // Soft-delete by setting status to 'archived'
    const form = await db.wAForm.update({
      where: { id },
      data: { status: 'archived' },
    })

    return NextResponse.json({ data: form })
  } catch (error) {
    console.error('Error deleting WA form:', error)
    return NextResponse.json({ error: 'Failed to delete form' }, { status: 500 })
  }
}
