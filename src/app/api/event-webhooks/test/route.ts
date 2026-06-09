import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { dispatchJobEvent, type JobEventType } from '@/lib/event-webhook-dispatcher'

/**
 * POST /api/event-webhooks/test
 * Test dispatch a job event with sample data
 *
 * Body: { event: 'job.created' }
 *
 * Sends a test payload to all active webhooks for the given event.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const event = body.event as JobEventType

    if (!event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 })
    }

    // Build a sample job payload for testing
    const sampleJob = {
      id: 'test_job_' + Date.now(),
      jobNumber: 'TEST-001',
      title: 'Test Job - AC Repair',
      description: 'This is a test job to verify webhook integration',
      status: 'pending',
      priority: 'medium',
      type: 'service',
      address: '123 Test Street, Test City',
      scheduledAt: new Date().toISOString(),
      scheduledTime: '14:00',
      notes: 'Test webhook dispatch',
      customerName: 'John Customer',
      customerPhone: '+919876543210',
      assigneeName: 'Rahul Technician',
      assigneePhone: '+919123456789',
      workspaceId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const sampleEmployee = {
      id: 'test_emp_001',
      name: 'Rahul Technician',
      phone: '+919123456789',
      role: 'technician',
      status: 'available',
      whatsappId: null,
    }

    const sampleCustomer = {
      id: 'test_cust_001',
      name: 'John Customer',
      phone: '+919876543210',
      email: 'john@example.com',
    }

    const results = await dispatchJobEvent(event, sampleJob, {
      employee: sampleEmployee,
      customer: sampleCustomer,
      metadata: { test: true, triggeredBy: 'manual_test' },
    })

    return NextResponse.json({
      event,
      results,
      totalWebhooks: results.length,
      successCount: results.filter(r => r.success).length,
      failCount: results.filter(r => !r.success).length,
    })
  } catch (error) {
    console.error('Error testing event webhook:', error)
    return NextResponse.json({ error: 'Failed to test event webhook' }, { status: 500 })
  }
}
