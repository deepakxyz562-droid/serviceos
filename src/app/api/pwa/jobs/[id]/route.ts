import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { verifyJobMagicToken } from '@/lib/magic-link';

/**
 * Helper to authenticate either via a valid Job Magic Token or via session cookie.
 */
async function authenticateJobAccess(
  jobId: string,
  token?: string | null
): Promise<{ ok: boolean; employeeId?: string; workspaceId?: string; error?: string }> {
  // 1. Try magic token verification
  if (token) {
    const verified = verifyJobMagicToken(token);
    if (verified && verified.jobId === jobId) {
      return {
        ok: true,
        employeeId: verified.employeeId,
        workspaceId: verified.workspaceId,
      };
    }
  }

  // 2. Try authenticated user session
  const authUser = await getAuthUser();
  if (authUser) {
    return {
      ok: true,
      employeeId: authUser.id,
      workspaceId: authUser.workspaceId || undefined,
    };
  }

  return { ok: false, error: 'Unauthorized: Invalid or expired magic link' };
}

/**
 * GET /api/pwa/jobs/[id]
 * Fetch full job execution details for the zero-install mobile PWA.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    const auth = await authenticateJobAccess(jobId, token);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
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
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            role: true,
            hourlyRate: true,
            metadataJson: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Fetch existing proof records
    const [photos, signatures, checklists] = await Promise.all([
      db.jobPhoto.findMany({
        where: { jobId },
        orderBy: { capturedAt: 'desc' },
      }),
      db.jobSignature.findMany({
        where: { jobId },
        orderBy: { signedAt: 'desc' },
      }),
      db.jobChecklist.findMany({
        where: { jobId },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(job.assignee?.metadataJson || '{}');
    } catch {}

    const payType = (meta.payType as string) || (job.assignee?.hourlyRate && job.assignee.hourlyRate > 0 ? 'hourly' : 'hourly');
    const commissionRate = typeof meta.commissionRate === 'number' ? meta.commissionRate : 10;
    const flatAmount = typeof meta.commissionFlat === 'number' ? meta.commissionFlat : 0;

    // Calculate potential / earned commission
    const quotedAmount = Number(job.quotedAmount || 0);
    let estimatedCommission = 0;
    if (payType === 'flat') {
      estimatedCommission = flatAmount;
    } else if (payType === 'commission' || payType === 'subcontractor') {
      estimatedCommission = (quotedAmount * commissionRate) / 100;
    }

    return NextResponse.json({
      job: {
        id: job.id,
        jobNumber: job.jobNumber,
        title: job.title,
        description: job.description,
        status: job.status,
        priority: job.priority,
        address: job.address || job.customer?.address,
        scheduledAt: job.scheduledAt,
        scheduledTime: job.scheduledTime,
        quotedAmount: job.quotedAmount,
        notes: job.notes,
        customerName: job.customerName || job.customer?.name,
        customerPhone: job.customerPhone || job.customer?.phone,
        customerEmail: job.customerEmail || job.customer?.email,
        actualStartTime: job.actualStartTime,
        actualEndTime: job.actualEndTime,
        completedAt: job.completedAt,
        completionNotes: job.completionNotes,
        completionPhotosJson: job.completionPhotosJson,
        completionSignatureData: job.completionSignatureData,
      },
      technician: {
        id: job.assignee?.id || job.assigneeId,
        name: job.assignee?.name || job.assigneeName,
        phone: job.assignee?.phone || job.assigneePhone,
        payType,
        commissionRate,
        flatAmount,
        estimatedCommission: Math.round(estimatedCommission * 100) / 100,
      },
      photos,
      signatures,
      checklists,
    });
  } catch (error) {
    console.error('[GET /api/pwa/jobs/[id]] error:', error);
    return NextResponse.json({ error: 'Failed to load PWA job' }, { status: 500 });
  }
}

/**
 * POST /api/pwa/jobs/[id]
 * Perform job lifecycle actions: status update, photo capture, checklist, and completion with signature & commission calculation.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: jobId } = await params;
    const body = await request.json();
    const { token, action } = body;

    const auth = await authenticateJobAccess(jobId, token);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }

    const job = await db.job.findUnique({
      where: { id: jobId },
      include: {
        workspace: { select: { id: true, tenantId: true } },
        assignee: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const tenantId = job.workspace?.tenantId || job.workspaceId || 'default-tenant';
    const techName = job.assignee?.name || job.assigneeName || 'Technician';
    const techId = job.assigneeId || auth.employeeId;

    // ─── Action: Update Status ───
    if (action === 'status') {
      const { status, latitude, longitude } = body;
      const updateData: Record<string, unknown> = {
        status,
      };

      if (status === 'in_progress' || status === 'working') {
        if (!job.actualStartTime) {
          updateData.actualStartTime = new Date();
        }
      }

      if (latitude && longitude) {
        updateData.checkInLat = Number(latitude);
        updateData.checkInLng = Number(longitude);
      }

      const updated = await db.job.update({
        where: { id: jobId },
        data: updateData,
      });

      return NextResponse.json({ success: true, status: updated.status });
    }

    // ─── Action: Photo Upload / Capture ───
    if (action === 'photo') {
      const { photoType = 'before', photoUrl, caption, notes } = body;
      if (!photoUrl) {
        return NextResponse.json({ error: 'photoUrl is required' }, { status: 400 });
      }

      const photo = await db.jobPhoto.create({
        data: {
          tenantId,
          jobId,
          customerId: job.customerId || null,
          photoType,
          url: photoUrl,
          caption: caption || null,
          notes: notes || null,
          capturedBy: techId || null,
          capturedByName: techName,
          capturedAt: new Date(),
        },
      });

      // Also append to job.completionPhotosJson
      let existingPhotos: Array<{ type: string; url: string }> = [];
      try {
        existingPhotos = JSON.parse(job.completionPhotosJson || '[]');
      } catch {}
      existingPhotos.push({ type: photoType, url: photoUrl });

      await db.job.update({
        where: { id: jobId },
        data: {
          completionPhotosJson: JSON.stringify(existingPhotos),
        },
      });

      return NextResponse.json({ success: true, photo });
    }

    // ─── Action: Checklist ───
    if (action === 'checklist') {
      const { items, checklistName = 'Service Checklist', isComplete = false } = body;
      const checklist = await db.jobChecklist.create({
        data: {
          tenantId,
          jobId,
          customerId: job.customerId || null,
          name: checklistName,
          itemsJson: JSON.stringify(items || []),
          status: isComplete ? 'completed' : 'in_progress',
          completedAt: isComplete ? new Date() : null,
          completedBy: techId || null,
          completedByName: techName,
        },
      });

      return NextResponse.json({ success: true, checklist });
    }

    // ─── Action: Complete Job ───
    if (action === 'complete') {
      const {
        completionNotes,
        signatureData,
        signatoryName = 'Customer',
        beforePhotoUrl,
        afterPhotoUrl,
        checklistItems,
      } = body;

      // Ensure before and after photos exist in DB
      if (beforePhotoUrl) {
        await db.jobPhoto.create({
          data: {
            tenantId,
            jobId,
            customerId: job.customerId || null,
            photoType: 'before',
            url: beforePhotoUrl,
            capturedBy: techId || null,
            capturedByName: techName,
          },
        });
      }

      if (afterPhotoUrl) {
        await db.jobPhoto.create({
          data: {
            tenantId,
            jobId,
            customerId: job.customerId || null,
            photoType: 'after',
            url: afterPhotoUrl,
            capturedBy: techId || null,
            capturedByName: techName,
          },
        });
      }

      // Save customer signature
      if (signatureData) {
        await db.jobSignature.create({
          data: {
            tenantId,
            jobId,
            customerId: job.customerId || null,
            signatoryType: 'customer',
            signatoryName,
            signatoryRole: 'Customer',
            signatureUrl: signatureData,
            signedAt: new Date(),
          },
        });
      }

      // Save checklist if provided
      if (checklistItems && Array.isArray(checklistItems)) {
        await db.jobChecklist.create({
          data: {
            tenantId,
            jobId,
            customerId: job.customerId || null,
            name: 'Job Execution Checklist',
            itemsJson: JSON.stringify(checklistItems),
            status: 'completed',
            completedAt: new Date(),
            completedBy: techId || null,
            completedByName: techName,
          },
        });
      }

      const now = new Date();

      // Calculate commission earned for assignee
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(job.assignee?.metadataJson || '{}');
      } catch {}

      const payType = (meta.payType as string) || (job.assignee?.hourlyRate && job.assignee.hourlyRate > 0 ? 'hourly' : 'hourly');
      const commissionRate = typeof meta.commissionRate === 'number' ? meta.commissionRate : 10;
      const flatAmount = typeof meta.commissionFlat === 'number' ? meta.commissionFlat : 0;
      const quotedAmount = Number(job.quotedAmount || 0);

      let commissionEarned = 0;
      if (payType === 'flat') {
        commissionEarned = flatAmount;
      } else if (payType === 'commission' || payType === 'subcontractor') {
        commissionEarned = (quotedAmount * commissionRate) / 100;
      }

      // Merge commission info into Job metadata
      let jobMeta: Record<string, unknown> = {};
      try {
        jobMeta = JSON.parse((job as unknown as { metadataJson?: string }).metadataJson || '{}');
      } catch {}
      jobMeta.commissionEarned = Math.round(commissionEarned * 100) / 100;
      jobMeta.commissionPayType = payType;
      jobMeta.commissionCalculatedAt = now.toISOString();

      const updatedJob = await db.job.update({
        where: { id: jobId },
        data: {
          status: 'completed',
          completedAt: now,
          actualEndTime: now,
          completionNotes: completionNotes || 'Completed via Technician Mobile PWA Portal',
          completionSignatureData: signatureData || null,
          metadataJson: JSON.stringify(jobMeta),
        },
      });

      return NextResponse.json({
        success: true,
        status: 'completed',
        completedAt: now.toISOString(),
        commissionEarned: Math.round(commissionEarned * 100) / 100,
        payType,
        message: 'Job completed successfully! Proof and commission logged.',
        job: updatedJob,
      });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[POST /api/pwa/jobs/[id]] error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to execute job action' },
      { status: 500 }
    );
  }
}
