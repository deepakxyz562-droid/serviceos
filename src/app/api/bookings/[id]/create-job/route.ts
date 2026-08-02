import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/bookings/[id]/create-job
 * Converts a booking into a Job record (transactional).
 *
 * Behavior:
 *  - Auth required; tenant isolation enforced.
 *  - If a Job already exists with externalId = booking.id (and
 *    externalSource = 'booking'), return 409 with `existingJobId`.
 *  - Otherwise create a Job via db.job.create() with the booking's data,
 *    set externalId=booking.id and externalSource='booking'.
 *  - Merge { jobId: <new job id> } into booking.metadataJson.
 *  - Optionally bump booking status from 'confirmed' to 'in_progress'.
 *
 * Returns: { job, booking, message } with HTTP 201.
 */

function safeParseMetadata(json: string | null | undefined): Record<string, unknown> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Body is optional — allow empty
    let body: Record<string, unknown> = {};
    try {
      const parsed = await request.json();
      if (parsed && typeof parsed === 'object') {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      body = {};
    }

    // Fetch the booking
    const booking = await db.booking.findUnique({ where: { id } });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Defensive: check for an existing job linked to this booking
    const existingJob = await db.job.findFirst({
      where: {
        externalId: booking.id,
        externalSource: 'booking',
      },
      select: { id: true, status: true, title: true },
    });

    if (existingJob) {
      return NextResponse.json(
        {
          error: 'Job already exists for this booking',
          existingJobId: existingJob.id,
          existingJobStatus: existingJob.status,
        },
        { status: 409 }
      );
    }

    // Lookup employee name/phone if booking.employeeId is set
    let assigneeName: string | null = null;
    let assigneePhone: string | null = null;
    if (booking.employeeId) {
      const employee = await db.employee.findUnique({
        where: { id: booking.employeeId },
        select: { name: true, phone: true },
      });
      if (employee) {
        assigneeName = employee.name;
        assigneePhone = employee.phone;
      }
    }

    // Determine initial job status
    const jobStatus = booking.employeeId ? 'assigned' : 'pending';

    // Merge existing booking metadata so we don't clobber anything
    const existingMeta = safeParseMetadata(booking.metadataJson);

    // Run the job creation + booking metadata update transactionally
    const result = await db.$transaction(async (tx) => {
      const jobId = crypto.randomUUID();

      const job = await tx.job.create({
        data: {
          id: jobId,
          title: booking.title,
          description: booking.description || null,
          status: jobStatus,
          priority: 'medium',
          type: 'service',
          address: booking.address || null,
          scheduledAt: booking.scheduledAt || null,
          notes: booking.notes || null,
          // Customer info
          customerId: booking.customerId || null,
          customerName: booking.customerName || null,
          customerPhone: booking.customerPhone || null,
          // Assignee info
          assigneeId: booking.employeeId || null,
          assigneeName,
          assigneePhone,
          // WhatsApp / assignment tracking
          whatsappMessageId: null,
          whatsappSessionId: null,
          assignmentStatus: booking.employeeId ? 'accepted' : null,
          // Link back to the booking
          externalId: booking.id,
          externalSource: 'booking',
          workspaceId: booking.workspaceId || user.workspaceId || null,
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              phone: true,
              role: true,
              status: true,
              avatar: true,
            },
          },
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
        },
      });

      // Update booking metadata + (optionally) bump status to in_progress
      const bookingUpdateData: Record<string, unknown> = {
        metadataJson: JSON.stringify({ ...existingMeta, jobId: job.id }),
      };
      if (booking.status === 'confirmed') {
        bookingUpdateData.status = 'in_progress';
      }

      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: bookingUpdateData,
        include: {
          employee: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
        },
      });

      return { job, booking: updatedBooking };
    });

    // Best-effort EventBus emit (don't fail the request if EventBus errors)
    try {
      const { EventBus } = await import('@/lib/event-bus');
      await EventBus.emit(
        'job.created',
        {
          job: {
            id: result.job.id,
            jobNumber: result.job.jobNumber,
            title: result.job.title,
            status: result.job.status,
            priority: result.job.priority,
            type: result.job.type,
            address: result.job.address,
            customerName: result.job.customerName,
            customerPhone: result.job.customerPhone,
            workspaceId: result.job.workspaceId,
            source: 'booking',
            bookingId: booking.id,
          },
          resourceType: 'job',
          resourceId: result.job.id,
          summary: `Job created from booking: ${result.job.title}`,
        },
        {
          tenantId: result.job.workspaceId || undefined,
          workspaceId: result.job.workspaceId || undefined,
        }
      );
    } catch (eventErr) {
      console.error(
        '[BookingCreateJob] Failed to emit job.created event:',
        eventErr
      );
    }

    return NextResponse.json(
      {
        job: result.job,
        booking: result.booking,
        message: 'Job created from booking',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[BookingCreateJob] Error creating job from booking:', error);
    return NextResponse.json(
      { error: 'Failed to create job from booking' },
      { status: 500 }
    );
  }
}
