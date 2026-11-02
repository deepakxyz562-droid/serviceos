import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { runDesignJob } from '@/lib/designs/jobs';

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const body = await request.json();
    const provider = body.provider && ['cloudflare', 'gemini', 'openrouter'].includes(body.provider)
      ? body.provider
      : 'cloudflare';
    if (typeof body.prompt !== 'string' || !body.prompt.trim() || body.prompt.length > 4000 || !/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId || '')) {
      return NextResponse.json({ error: 'Provide a prompt and unique request ID' }, { status: 400 });
    }
    const rawPrompt = body.prompt.trim();
    const storedPrompt = (body.isPoster && !rawPrompt.startsWith('[POSTER]')) ? `[POSTER] ${rawPrompt}` : rawPrompt;
    const id = `${user.tenantId}:${body.requestId}`;

    // Resolve business visual context
    let category = typeof body.category === 'string' ? body.category.trim() : undefined;
    let businessName = typeof body.businessName === 'string' ? body.businessName.trim() : undefined;
    let website = typeof body.website === 'string' ? body.website.trim() : undefined;
    let products = Array.isArray(body.products) ? body.products : undefined;
    let services = Array.isArray(body.services) ? body.services : undefined;

    // Fallback: query database for tenant brand profile if context not supplied by client
    if (!category || !products || !businessName) {
      try {
        const [brandProfile, tenant] = await Promise.all([
          db.brandProfile.findUnique({ where: { tenantId: user.tenantId } }).catch(() => null),
          db.tenant.findUnique({ where: { id: user.tenantId } }).catch(() => null),
        ]);
        if (brandProfile) {
          if (!businessName && brandProfile.businessName) businessName = brandProfile.businessName;
          if (!category && brandProfile.industry) category = brandProfile.industry;
          if (!website && brandProfile.website) website = brandProfile.website;
          if (!products && brandProfile.products) {
            try { products = JSON.parse(brandProfile.products); } catch {}
          }
          if (!services && brandProfile.services) {
            try { services = JSON.parse(brandProfile.services); } catch {}
          }
        }
        if (tenant) {
          if (!businessName && tenant.name) businessName = tenant.name;
          if (!website && tenant.website) website = tenant.website;
        }
      } catch {}
    }

    const contextJson = JSON.stringify({ category, businessName, products, services, website });

    const existing = await db.designGenerationJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (existing) {
      if (existing.prompt !== storedPrompt || existing.provider !== provider) {
        return NextResponse.json({ error: 'Request ID already used with different content' }, { status: 409 });
      }
      if (existing.status === 'queued') {
        void runDesignJob(id);
      }
      return NextResponse.json({ jobId: id, status: existing.status }, { status: 202 });
    }

    await db.designGenerationJob.create({
      data: {
        id,
        tenantId: user.tenantId,
        userId: user.id,
        prompt: storedPrompt,
        provider,
        costBreakdownJson: contextJson,
      },
    });

    // Execute immediately in Node.js event loop
    void runDesignJob(id);

    return NextResponse.json({ jobId: id, status: 'queued' }, { status: 202 });
  } catch (err) {
    console.error('[/api/social/designs/image POST] error:', err);
    return NextResponse.json({ error: 'Could not queue image generation. Retry using the same request ID.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  const possibleIds = id
    ? id.includes(':')
      ? [id]
      : [id, `${user.tenantId}:${id}`]
    : undefined;

  let job = await db.designGenerationJob.findFirst({
    where: {
      tenantId: user.tenantId,
      ...(possibleIds ? { id: { in: possibleIds } } : {}),
    },
    orderBy: { createdAt: 'desc' },
  });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  // Self-healing: if job is queued and not cancelled, run and await completion directly
  if (job.status === 'queued' && !job.cancelRequested) {
    await runDesignJob(job.id);
    const refreshed = await db.designGenerationJob.findUnique({ where: { id: job.id } });
    if (refreshed) job = refreshed;
  }

  return NextResponse.json({
    jobId: job.id,
    status: job.status,
    error: job.error,
    result: job.status === 'completed' && job.resultJson ? JSON.parse(job.resultJson) : null,
  });
}
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  const possibleIds = id.includes(':') ? [id] : [id, `${user.tenantId}:${id}`];

  await db.designGenerationJob.updateMany({
    where: { id: { in: possibleIds }, tenantId: user.tenantId, status: 'queued' },
    data: { status: 'cancelled', cancelRequested: true, finishedAt: new Date() },
  });
  await db.designGenerationJob.updateMany({
    where: { id: { in: possibleIds }, tenantId: user.tenantId, status: 'running' },
    data: { cancelRequested: true },
  });
  return NextResponse.json({ message: 'Cancellation requested. Already-started provider work may still be charged.' });
}
