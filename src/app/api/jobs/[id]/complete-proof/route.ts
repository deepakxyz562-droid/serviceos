import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { EventBus } from '@/lib/event-bus';

/**
 * POST /api/jobs/[id]/complete-proof
 *
 * Employee submits job completion proof with optional COD payment collection.
 * This endpoint handles:
 * 1. Saving completion proof (photos, notes, signature)
 * 2. COD payment collection (if paymentMethod is "cod")
 * 3. Closing the job (status → "completed")
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const body = await request.json();
    const {
      completionNotes,
      completionPhotos,   // Array of base64 strings or URLs
      signatureData,      // Base64 string of customer signature
      paymentMethod,      // "cod", "online", "card", etc.
      amountCollected,    // Amount collected if COD
      customerRating,     // Optional rating from customer
    } = body;

    // ─── Validate job exists and belongs to workspace ───
    const job = await db.job.findUnique({
      where: { id: jobId },
      include: { assignee: true, customer: true },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.workspaceId !== user.workspaceId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // ─── Validate job status ───
    if (job.status === 'completed') {
      return NextResponse.json({ error: 'Job is already completed' }, { status: 400 });
    }

    if (job.status !== 'in_progress' && job.status !== 'assigned') {
      return NextResponse.json(
        { error: `Cannot complete a job with status "${job.status}". Job must be in progress or assigned.` },
        { status: 400 }
      );
    }

    // ─── Validate COD payment ───
    if (paymentMethod === 'cod') {
      if (amountCollected === undefined || amountCollected === null || amountCollected < 0) {
        return NextResponse.json(
          { error: 'Amount collected is required for COD payment' },
          { status: 400 }
        );
      }
    }

    // ─── Build update data ───
    const updateData: Record<string, unknown> = {
      status: 'completed',
      actualEndTime: new Date(),
      completedAt: new Date(),
      completionNotes: completionNotes || null,
      completionPhotosJson: completionPhotos ? JSON.stringify(completionPhotos) : '[]',
      completionSignatureData: signatureData || null,
    };

    // ─── Handle COD payment ───
    if (paymentMethod === 'cod') {
      updateData.paymentMethod = 'cod';
      updateData.paymentStatus = 'collected';
      updateData.amountCollected = amountCollected;
      updateData.collectedAt = new Date();
      updateData.collectedById = job.assigneeId;
    } else if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
      if (['online', 'card', 'upi', 'bank_transfer'].includes(paymentMethod)) {
        updateData.paymentStatus = 'pending';
      }
    }

    // ─── Handle customer rating ───
    if (customerRating !== undefined && customerRating >= 1 && customerRating <= 5) {
      updateData.customerRating = customerRating;
    }

    // ─── Update job ───
    const updatedJob = await db.job.update({
      where: { id: jobId },
      data: updateData,
      include: {
        assignee: true,
        customer: true,
        resource: true,
      },
    });

    // ─── Update employee: set back to available, increment completedJobs ───
    if (job.assigneeId) {
      try {
        await db.employee.update({
          where: { id: job.assigneeId },
          data: {
            status: 'available',
            completedJobs: { increment: 1 },
            currentJobId: null,
          },
        });
      } catch (e) {
        console.error('Failed to update employee status on completion:', e);
      }
    }

    // ─── Update resource back to available ───
    if (job.resourceId) {
      try {
        const resource = await db.resource.findUnique({ where: { id: job.resourceId } });
        if (resource) {
          await db.resource.update({
            where: { id: job.resourceId },
            data: {
              status: 'available',
              completedJobs: resource.completedJobs + 1,
            },
          });
        }
      } catch (e) {
        console.error('Failed to update resource status on completion:', e);
      }
    }

    // ─── Create invoice for COD if amount collected ───
    if (paymentMethod === 'cod' && amountCollected > 0) {
      try {
        const invoiceCount = await db.invoice.count();
        const invoiceNumber = `INV-${String(invoiceCount + 1).padStart(5, '0')}`;

        await db.invoice.create({
          data: {
            number: invoiceNumber,
            tenantId: job.workspaceId,
            jobId: job.id,
            customerId: job.customerId,
            employeeId: job.assigneeId,
            amount: amountCollected,
            tax: 0,
            discount: 0,
            total: amountCollected,
            currency: 'USD',
            status: 'paid',
            paidAt: new Date(),
            notes: `COD payment collected by ${job.assigneeName || 'employee'}`,
          },
        });
      } catch (e) {
        console.error('Failed to create invoice for COD:', e);
      }
    }

    // ─── Emit event via EventBus ───
    try {
      await EventBus.emit('job.completed', {
        job: {
          id: updatedJob.id,
          jobNumber: updatedJob.jobNumber,
          title: updatedJob.title,
          status: updatedJob.status,
          priority: updatedJob.priority,
          type: updatedJob.type,
          address: updatedJob.address,
          customerName: updatedJob.customerName,
          customerPhone: updatedJob.customerPhone,
          assigneeName: updatedJob.assigneeName,
          assigneePhone: updatedJob.assigneePhone,
          workspaceId: updatedJob.workspaceId,
        },
        employee: updatedJob.assigneeId
          ? { id: updatedJob.assigneeId, name: updatedJob.assigneeName, phone: updatedJob.assigneePhone }
          : null,
        customer: job.customerPhone
          ? { name: job.customerName, phone: job.customerPhone }
          : null,
        resourceType: 'job',
        resourceId: updatedJob.id,
        completionProof: {
          hasPhotos: (completionPhotos && completionPhotos.length > 0) || false,
          hasSignature: !!signatureData,
          hasNotes: !!completionNotes,
          paymentMethod: paymentMethod || null,
          amountCollected: paymentMethod === 'cod' ? amountCollected : null,
        },
      }, { tenantId: updatedJob.workspaceId || undefined, workspaceId: updatedJob.workspaceId || undefined });
    } catch (e) {
      console.error('Failed to emit job.completed event:', e);
    }

    // ─── Send WhatsApp notifications ───
    try {
      const { notifyCustomerJobCompleted, notifyEmployeeJobCompleted } = await import('@/lib/whatsapp-notifications');
      if (job.customerPhone) {
        await notifyCustomerJobCompleted(updatedJob, { name: updatedJob.assigneeName, phone: updatedJob.assigneePhone });
      }
      if (updatedJob.assigneeId) {
        const employee = await db.employee.findUnique({ where: { id: updatedJob.assigneeId } });
        if (employee) {
          await notifyEmployeeJobCompleted(updatedJob, employee);
        }
      }
    } catch (e) {
      console.error('Failed to send completion notifications:', e);
    }

    return NextResponse.json({
      success: true,
      job: updatedJob,
      message: paymentMethod === 'cod'
        ? `Job completed. COD payment of $${amountCollected} collected.`
        : 'Job completed successfully with proof.',
    });
  } catch (error) {
    console.error('Error completing job with proof:', error);
    return NextResponse.json(
      { error: 'Failed to complete job with proof' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/jobs/[id]/complete-proof
 * Get completion proof details for a job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: jobId } = await params;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        completionNotes: true,
        completionPhotosJson: true,
        completionSignatureData: true,
        completedAt: true,
        paymentMethod: true,
        paymentStatus: true,
        amountCollected: true,
        collectedAt: true,
        customerRating: true,
        assigneeName: true,
        customerName: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Parse photos JSON
    let photos: string[] = [];
    try {
      photos = JSON.parse(job.completionPhotosJson || '[]');
    } catch {
      photos = [];
    }

    return NextResponse.json({
      ...job,
      completionPhotos: photos,
      completionPhotosJson: undefined, // Remove raw JSON from response
    });
  } catch (error) {
    console.error('Error fetching job completion proof:', error);
    return NextResponse.json(
      { error: 'Failed to fetch completion proof' },
      { status: 500 }
    );
  }
}
