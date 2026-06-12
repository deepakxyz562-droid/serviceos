import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // Verify form exists and is active
    const form = await db.wAForm.findUnique({ where: { id } })
    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 })
    }
    if (form.status !== 'active') {
      return NextResponse.json({ error: 'This form is no longer accepting responses' }, { status: 410 })
    }

    const { respondentPhone, respondentName, responses } = body

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json({ error: 'Responses are required' }, { status: 400 })
    }

    // Create the form response
    const formResponse = await db.wAFormResponse.create({
      data: {
        formId: id,
        respondentPhone: respondentPhone || '',
        respondentName: respondentName || null,
        responsesJson: JSON.stringify(responses),
        status: 'completed',
        tenantId: form.tenantId,
      },
    })

    // Update form submission count
    await db.wAForm.update({
      where: { id },
      data: {
        totalSubmissions: { increment: 1 },
      },
    })

    return NextResponse.json({
      data: {
        id: formResponse.id,
        status: 'completed',
        completionMessage: form.completionMessage || 'Thank you for your submission!',
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error submitting form response:', error)
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 })
  }
}
