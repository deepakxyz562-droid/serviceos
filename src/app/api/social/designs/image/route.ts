import { NextRequest, NextResponse, after } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { runDesignJob } from '@/lib/designs/jobs';
import { isUnsafeReferenceHostname } from '@/lib/designs/image-provider';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { IMAGE_PROVIDER_CHOICES, type ImageProviderChoice } from '../../../../../../shared/image-review';

export const maxDuration = 120;

function scheduleDesignJob(id: string, source: string) {
  const exec = () =>
    Promise.resolve(runDesignJob(id)).catch((err) => {
      console.error(`[/api/social/designs/image ${source}] background runDesignJob error:`, err);
    });
  try {
    after(exec);
  } catch {
    void exec();
  }
}

const VALID_ASPECT_RATIOS = new Set(['1:1', '4:5', '9:16', '16:9']);

function sanitizeAndValidateReferenceUrls(raw: unknown): {
  urls: string[];
  error?: string;
} {
  if (raw === undefined || raw === null) return { urls: [] };
  if (!Array.isArray(raw)) {
    return { urls: [], error: 'referenceImageUrls must be an array of image URLs' };
  }
  const urls: string[] = [];
  for (const entry of raw.slice(0, 3)) {
    if (typeof entry !== 'string' || !entry.trim()) {
      return { urls: [], error: 'Each reference image URL must be a non-empty string' };
    }
    const trimmed = entry.trim();
    if (trimmed.startsWith('/uploads/')) {
      if (trimmed.includes('..')) {
        return { urls: [], error: 'Invalid local reference image path' };
      }
      urls.push(trimmed);
      continue;
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return { urls: [], error: 'Reference image URLs must use http, https, or /uploads/' };
      }
      if (parsed.username || parsed.password || isUnsafeReferenceHostname(parsed.hostname)) {
        return { urls: [], error: 'Unsafe reference image URL host is not allowed' };
      }
      urls.push(trimmed);
    } catch {
      return { urls: [], error: `Invalid reference image URL: ${trimmed}` };
    }
  }
  return { urls };
}

function buildAutoBusinessPrompt(params: {
  businessName?: string;
  category?: string;
  products?: string[];
  services?: string[];
  hasRefs: boolean;
}): string {
  const name = params.businessName || 'our business';
  const category = params.category || 'local business';
  const offerings = [...(params.products || []), ...(params.services || [])]
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');
  const blob = `${name} ${category} ${offerings}`.toLowerCase();
  const isHospitality = /(farmhouse|farm house|resort|villa|cottage|homestay|retreat|banquet|lawn|staycation|hotel)/i.test(
    blob,
  );
  if (params.hasRefs) {
    if (isHospitality) {
      return `Preserve our real property from the reference photos for ${name} and stage an inviting golden-hour commercial showcase with lush manicured greenery, warm ambient lights, and welcoming resort elegance.`;
    }
    return `Preserve the real business space and key identity from the reference photos for ${name} (${category}${offerings ? `, featuring ${offerings}` : ''}), upgraded with warm daylight studio quality and clean commercial framing.`;
  }
  if (isHospitality) {
    return `Photorealistic golden-hour commercial showcase of ${name}, featuring welcoming outdoor architecture, manicured green lawn, cozy seating, and warm string lighting.`;
  }
  return `Photorealistic commercial showcase for ${name} (${category})${offerings ? ` highlighting ${offerings}` : ''}, authentic inviting atmosphere and crisp lighting.`;
}

function parseCompletedJobResult(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    if ('__pendingMeta' in parsed && !('url' in parsed)) return null;
    return parsed as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  const gate = await requireBgosEntitled(user);
  if (!gate.ok) return gate.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (!/^[-a-zA-Z0-9]{16,80}$/.test(body.requestId || '')) {
      return NextResponse.json({ error: 'Provide a unique request ID' }, { status: 400 });
    }

    const { urls: referenceImageUrls, error: refUrlError } = sanitizeAndValidateReferenceUrls(
      body.referenceImageUrls,
    );
    if (refUrlError) {
      return NextResponse.json({ error: refUrlError }, { status: 400 });
    }

    const autoFromBusiness = Boolean(body.autoFromBusiness);
    const aspectRatio =
      typeof body.aspectRatio === 'string' && VALID_ASPECT_RATIOS.has(body.aspectRatio)
        ? (body.aspectRatio as '1:1' | '4:5' | '9:16' | '16:9')
        : undefined;

    const provider: ImageProviderChoice =
      typeof body.provider === 'string' &&
      (IMAGE_PROVIDER_CHOICES as readonly string[]).includes(body.provider)
        ? (body.provider as ImageProviderChoice)
        : referenceImageUrls.length > 0
          ? 'gemini'
          : 'cloudflare';

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
          db.tenant
            .findUnique({
              where: { id: user.tenantId },
              select: { name: true, industry: true, settingsJson: true },
            })
            .catch(() => null),
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
          if (!category && tenant.industry) category = tenant.industry;
          if (tenant.settingsJson && (!products || products.length === 0)) {
            try {
              const parsed = JSON.parse(tenant.settingsJson);
              const items = parsed?.brandBrain?.sellingItems;
              if (Array.isArray(items) && items.length > 0) {
                products = items
                  .map((it: any) => (typeof it?.name === 'string' ? it.name.trim() : ''))
                  .filter(Boolean);
              }
            } catch {}
          }
        }
      } catch {}
    }

    let rawPrompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!rawPrompt && autoFromBusiness) {
      rawPrompt = buildAutoBusinessPrompt({
        businessName,
        category,
        products,
        services,
        hasRefs: referenceImageUrls.length > 0,
      });
    }

    if (!rawPrompt || rawPrompt.length > 4000) {
      return NextResponse.json({ error: 'Provide a prompt and unique request ID' }, { status: 400 });
    }

    const storedPrompt = body.isPoster && !rawPrompt.startsWith('[POSTER]') ? `[POSTER] ${rawPrompt}` : rawPrompt;
    const id = `${user.tenantId}:${body.requestId}`;

    const pendingMeta = {
      category,
      businessName,
      products,
      services,
      website,
      referenceImageUrls,
      aspectRatio,
      autoFromBusiness,
    };

    const existing = await db.designGenerationJob.findFirst({ where: { id, tenantId: user.tenantId } });
    if (existing) {
      if (existing.prompt !== storedPrompt || existing.provider !== provider) {
        return NextResponse.json({ error: 'Request ID already used with different content' }, { status: 409 });
      }
      if (existing.status === 'queued') {
        scheduleDesignJob(id, 'POST-existing');
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
        resultJson: JSON.stringify({ __pendingMeta: pendingMeta }),
      },
    });

    // Schedule via Next 16 after() so Node/serverless runtimes keep the job alive past response
    scheduleDesignJob(id, 'POST');

    return NextResponse.json({ jobId: id, status: 'queued' }, { status: 202 });
  } catch (err) {
    console.error('[/api/social/designs/image POST] error:', err);
    return NextResponse.json({ error: 'Could not queue image generation. Retry using the same request ID.' }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
    const id = request.nextUrl.searchParams.get('id');
    const possibleIds = id
      ? id.includes(':')
        ? [id]
        : [id, `${user.tenantId}:${id}`]
      : undefined;

    const job = await db.designGenerationJob.findFirst({
      where: {
        tenantId: user.tenantId,
        ...(possibleIds ? { id: { in: possibleIds } } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    // Kick off queued work non-blockingly so polling GET never blocks up to 150s
    // and never hits mobile 30s or proxy 100s timeouts.
    if (job.status === 'queued' && !job.cancelRequested) {
      scheduleDesignJob(job.id, 'GET');
    }

    const completedResult = job.status === 'completed' ? parseCompletedJobResult(job.resultJson) : null;
    if (job.status === 'completed' && !completedResult) {
      return NextResponse.json({
        jobId: job.id,
        status: 'failed',
        error: job.error || 'Generated image result could not be loaded cleanly. Please try again.',
        result: null,
      });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      error: job.error || null,
      result: completedResult,
    });
  } catch (err) {
    console.error('[/api/social/designs/image GET] error:', err);
    return NextResponse.json(
      { error: 'Could not retrieve image generation status. Please retry.' },
      { status: 500 },
    );
  }
}
export async function DELETE(request: NextRequest) {
  const user = await getAuthUser(request);
  if (!user?.tenantId) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  try {
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
  } catch (err) {
    console.error('[/api/social/designs/image DELETE] error:', err);
    return NextResponse.json({ error: 'Could not cancel image generation job.' }, { status: 500 });
  }
}
