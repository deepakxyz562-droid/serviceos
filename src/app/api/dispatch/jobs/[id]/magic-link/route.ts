import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { buildMagicDispatchBundle } from '@/lib/magic-link';

/**
 * GET /api/dispatch/jobs/[id]/magic-link
 * Generate a signed magic link & message templates for a technician to access the job via PWA.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id: jobId } = await params;
    const { searchParams } = new URL(request.url);
    const origin = searchParams.get('origin') || request.nextUrl.origin;

    const job = await db.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        jobNumber: true,
        title: true,
        address: true,
        scheduledAt: true,
        scheduledTime: true,
        customerName: true,
        customerPhone: true,
        assigneeId: true,
        assigneeName: true,
        assigneePhone: true,
        workspaceId: true,
        assignee: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            metadataJson: true,
            hourlyRate: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const techName = job.assignee?.name || job.assigneeName || 'Technician';
    const techPhone = job.assignee?.phone || job.assigneePhone || '';
    const employeeId = job.assigneeId || job.assignee?.id || undefined;

    const bundle = buildMagicDispatchBundle({
      origin,
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      customerName: job.customerName,
      address: job.address,
      scheduledTime: job.scheduledTime || (job.scheduledAt ? new Date(job.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null),
      techName,
      techPhone,
      employeeId,
      workspaceId: job.workspaceId,
    });

    let meta: Record<string, unknown> = {};
    try {
      meta = JSON.parse(job.assignee?.metadataJson || '{}');
    } catch {}

    const payType = (meta.payType as string) || (job.assignee?.hourlyRate && job.assignee.hourlyRate > 0 ? 'hourly' : 'hourly');

    return NextResponse.json({
      success: true,
      jobId: job.id,
      jobNumber: job.jobNumber,
      jobTitle: job.title,
      customerName: job.customerName,
      address: job.address,
      technician: {
        id: employeeId,
        name: techName,
        phone: techPhone,
        payType,
      },
      ...bundle,
    });
  } catch (error) {
    console.error('[GET /api/dispatch/jobs/[id]/magic-link] error:', error);
    return NextResponse.json(
      { error: 'Failed to generate dispatch magic link' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dispatch/jobs/[id]/magic-link
 * Allows requesting a refreshed or custom-expiry magic link.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return GET(request, { params });
}
