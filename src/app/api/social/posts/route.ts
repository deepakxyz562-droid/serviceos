import { NextRequest, NextResponse, after } from 'next/server';
import { createHash } from 'node:crypto';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { publishPost } from '@/lib/social/publisher';
import { logActivity } from '@/lib/activity-log';
import { validateBrandSafety } from '@/lib/brand-safety-gate';
import type { PublishTarget, SocialPlatform } from '@/lib/social/types';

/**
 * Social Posts API — list + create
 * --------------------------------
 *   GET  /api/social/posts              — list tenant's posts (filters + pagination)
 *   POST /api/social/posts              — create a draft OR schedule OR publish immediately
 *
 * POST behaviour:
 *   - status='draft'      → save as draft (no publish)
 *   - status='scheduled' + scheduledAt in future → save as scheduled (cron picks it up)
 *   - status='scheduled' + scheduledAt in past OR null → save + immediately publish
 *   - status='published'  → save + immediately publish (treated as "publish now")
 *
 * Filters (GET):
 *   ?status=draft|scheduled|publishing|published|partial|failed
 *   ?platform=facebook|instagram|...
 *   ?search=<text>
 *   ?dateFrom=ISO&dateTo=ISO
 *   ?page=1&limit=20
 */

const VALID_PLATFORMS: SocialPlatform[] = [
  'facebook',
  'instagram',
  'googlebusiness',
  'linkedin',
  'pinterest',
  'twitter',
];

function isValidPlatform(p: string): p is SocialPlatform {
  return (VALID_PLATFORMS as string[]).includes(p);
}

// ─── GET — list ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const approval = searchParams.get('approval');
    const platform = searchParams.get('platform');
    const search = searchParams.get('search');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10) || 20));

    const where: {
      tenantId: string;
      status?: string;
      approvalStatus?: string;
      OR?: Array<Record<string, unknown>>;
      createdAt?: { gte?: Date; lte?: Date };
    } = { tenantId };

    if (status) where.status = status;

    // AI-post review workflow (Pending / Approved / Rejected pills).
    // approvalStatus is handled gracefully in-memory and via gbpOfferData fallback
    // to prevent schema mismatch crashes when the column is absent in PostgREST.

    // Platform filter — search the publishTargets JSON for an entry with that platform.
    // SQLite doesn't have JSON-path queries, so we use a `contains` on the raw JSON string.
    if (platform && isValidPlatform(platform)) {
      where.OR = [{ publishTargets: { contains: `"platform":"${platform}"` } }];
    }

    if (search) {
      where.OR = [
        ...(where.OR || []),
        { content: { contains: search } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    const [posts, totalCount] = await Promise.all([
      db.socialPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: approval && approval !== 'any' ? 0 : (page - 1) * limit,
        take: approval && approval !== 'any' ? 100 : limit,
        select: {
          id: true,
          status: true,
          approvalStatus: true,
          content: true,
          mediaUrls: true,
          designJson: true,
          updatedAt: true,
          linkUrl: true,
          publishTargets: true,
          scheduledAt: true,
          publishedAt: true,
          failureReason: true,
          gbpPostType: true,
          gbpOfferData: true,
          pinterestBoard: true,
          createdById: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { metrics: true } },
        },
      }),
      db.socialPost.count({ where }),
    ]);

    // Parse JSON fields and resolve approvalStatus for client convenience.
    let data = posts.map((p) => {
      const offerData = safeJsonObject(p.gbpOfferData);
      let resolvedApproval =
        (p as Record<string, unknown>).approvalStatus ||
        (offerData?.approvalStatus as string | null) ||
        null;
      if (!resolvedApproval && p.status === 'draft') {
        resolvedApproval = 'pending';
      }
      return {
        ...p,
        approvalStatus: resolvedApproval,
        mediaUrls: safeJsonArray(p.mediaUrls),
        publishTargets: safeJsonArray(p.publishTargets),
      };
    });

    let total = totalCount;
    if (approval && approval !== 'any') {
      data = data.filter((p) => p.approvalStatus === approval);
      total = data.length;
      data = data.slice((page - 1) * limit, page * limit);
    }

    return NextResponse.json({
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error) {
    console.error('[api/social/posts] GET error:', error);
    return NextResponse.json({ error: 'Failed to load posts' }, { status: 500 });
  }
}

function safeJsonArray(raw: string | null): unknown[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeJsonObject(raw: string | null | unknown): Record<string, unknown> | null {
  if (!raw) return null;
  if (typeof raw === 'object' && !Array.isArray(raw)) return raw as Record<string, unknown>;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ─── POST — create ─────────────────────────────────────────────────────────

interface CreatePostBody {
  draftId?: string;
  expectedUpdatedAt?: string;
  design?: unknown;
  isPoster?: boolean;
  isPreRendered?: boolean;
  content: string;
  mediaUrls?: string[];
  linkUrl?: string;
  targets?: { platform: SocialPlatform; socialAccountId: string }[];
  platforms?: string[];
  scheduledAt?: string; // ISO
  status?: 'draft' | 'scheduled' | 'published';
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  gbpPostType?: string;
  gbpOfferData?: { title: string; startDate?: string; endDate?: string; couponCode?: string; redeemUrl?: string; [key: string]: unknown };
  pinterestBoard?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Could not resolve tenant.' }, { status: 400 });
    }

    const body = (await request.json()) as CreatePostBody;
    const isDraft = (body?.status || 'draft') === 'draft';
    let design;
    if (body.design !== undefined) {
      try {
        const { persistDesignAssets } = await import('@/lib/designs/assets');
        design = await persistDesignAssets(body.design, tenantId, user.id);
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid design' }, { status: 400 });
      }
    }

    if (!body || !body.content || !body.content.trim()) {
      return NextResponse.json(
        { error: 'Post content is required.' },
        { status: 400 },
      );
    }

    // Auto-resolve targets: from explicit targets, platforms array, or active accounts
    let targets: { platform: SocialPlatform; socialAccountId: string }[] = Array.isArray(body.targets)
      ? [...body.targets]
      : [];

    if (targets.length === 0 && Array.isArray(body.platforms) && body.platforms.length > 0) {
      const requestedPlatforms = body.platforms;
      const ownedAccounts = await db.socialAccount.findMany({
        where: { tenantId, platform: { in: requestedPlatforms }, isActive: true },
        select: { id: true, platform: true },
      });
      for (const p of requestedPlatforms) {
        if (isValidPlatform(p)) {
          const match = ownedAccounts.find((a) => a.platform === p);
          if (match) {
            targets.push({ platform: p as SocialPlatform, socialAccountId: match.id });
          }
        }
      }
    }

    // For non-drafts: if no specific targets were found, check for any active account or preview account
    if (!isDraft && targets.length === 0) {
      const anyActiveAccounts = await db.socialAccount.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, platform: true },
        take: 3,
      });
      if (anyActiveAccounts.length > 0) {
        targets = anyActiveAccounts.map((a) => ({
          platform: a.platform as SocialPlatform,
          socialAccountId: a.id,
        }));
      } else {
        return NextResponse.json({error:'Connect a social account before publishing. You can still save this design as a draft.'},{status:400});
      }
    }

    body.targets = targets;

    if (!isDraft && body.targets.length === 0) {
      return NextResponse.json(
        { error: 'Please connect at least one social media channel to publish.' },
        { status: 400 },
      );
    }

    if (!['draft', 'scheduled', 'published'].includes(body.status || 'draft')) return NextResponse.json({ error: 'Invalid post status.' }, { status: 400 });
    if (body.status === 'scheduled' && (!body.scheduledAt || !Number.isFinite(Date.parse(body.scheduledAt)) || Date.parse(body.scheduledAt) <= Date.now())) return NextResponse.json({ error: 'Choose a valid future schedule.' }, { status: 400 });
    const key = request.headers.get('idempotency-key');
    if (key && !/^[a-zA-Z0-9_-]{16,100}$/.test(key)) return NextResponse.json({ error: 'Invalid request key.' }, { status: 400 });
    const requestId = key ? `sp_${createHash('sha256').update(`${tenantId}:${user.id}:${key}`).digest('hex')}` : undefined;
    if (requestId) {
      const existing = await db.socialPost.findUnique({ where: { id: requestId } });
      if (existing) return NextResponse.json({ data: { ...existing, mediaUrls: safeJsonArray(existing.mediaUrls), publishTargets: safeJsonArray(existing.publishTargets) } });
    }

    // Validate platforms.
    for (const t of body.targets) {
      if (!isValidPlatform(t.platform)) {
        return NextResponse.json(
          { error: `Invalid platform '${t.platform}'.` },
          { status: 400 },
        );
      }
      if (!t.socialAccountId) {
        return NextResponse.json(
          { error: 'Each target must have a socialAccountId.' },
          { status: 400 },
        );
      }
    }

    // Verify the user owns all the target SocialAccounts (if targets specified).
    const accountIds = body.targets.map((t) => t.socialAccountId);
    if (accountIds.length > 0) {
      const ownedAccounts = await db.socialAccount.findMany({
        where: { id: { in: accountIds }, tenantId, isActive: true },
        select: { id: true, platform: true },
      });
      const ownedIds = new Set(ownedAccounts.map((a) => a.id));
      if (body.targets.some(t => ownedAccounts.find(a => a.id === t.socialAccountId)?.platform !== t.platform)) return NextResponse.json({ error: 'A publishing channel does not match its connected account.' }, { status: 400 });
      const missing = accountIds.filter((id) => !ownedIds.has(id));
      if (missing.length > 0) {
        return NextResponse.json(
          { error: `Some target accounts are not connected or inactive: ${missing.join(', ')}` },
          { status: 400 },
        );
      }
    }

    // Layer 2: Brand Safety Gate check before storing or publishing
    const tenantRecord = typeof db.tenant?.findUnique === 'function' ? await db.tenant.findUnique({
      where: { id: tenantId },
      include: { brandProfile: true },
    }) : null;
    const activeBusinessName = tenantRecord?.brandProfile?.businessName || tenantRecord?.name || 'Business';
    const forbiddenPhrases = safeJsonArray(tenantRecord?.brandProfile?.forbiddenPhrases ?? null) as string[];
    const competitors = safeJsonArray(tenantRecord?.brandProfile?.competitors ?? null) as string[];

    const safetyCheck = validateBrandSafety(body.content, {
      tenantId,
      activeBusinessName,
      forbiddenPhrases,
      competitors,
    });

    if (!safetyCheck.passed) {
      return NextResponse.json(
        {
          error: `Brand safety violation: ${safetyCheck.violations.map((v) => v.message).join(' ')}`,
          code: 'BRAND_SAFETY_VIOLATION',
          violations: safetyCheck.violations,
        },
        { status: 422 },
      );
    }

    // Resolve final status + scheduledAt.
    const requestedStatus = body.status || 'draft';
    const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
    const now = new Date();

    // Publish-now = scheduled in the past OR explicit status='published'.
    const publishNow =
      requestedStatus === 'published' ||
      (requestedStatus === 'scheduled' && (!scheduledAt || scheduledAt.getTime() <= now.getTime()));

    // The publisher must claim a queued post itself. Persisting 'publishing' here
    // previously made publishPost skip it forever. Scheduled-now is also recoverable by cron.
    const initialStatus = publishNow ? 'scheduled' : requestedStatus;

    // Build the initial publishTargets JSON (all targets 'pending').
    const publishTargets: PublishTarget[] = body.targets.map((t) => ({
      platform: t.platform,
      socialAccountId: t.socialAccountId,
      status: 'pending' as const,
    }));

    const offerData: Record<string, unknown> = body.gbpOfferData ? { ...body.gbpOfferData } : {};
    if (body.approvalStatus) {
      offerData.approvalStatus = body.approvalStatus;
    }

    // Ensure media URLs are absolute public URLs for external adapters (GBP, FB, IG)
    const serverOrigin = process.env.NEXT_PUBLIC_APP_URL || 'https://bgos.fieseros.com';
    if (Array.isArray(body.mediaUrls)) {
      body.mediaUrls = body.mediaUrls.map((u) => {
        if (typeof u === 'string' && u.startsWith('/')) {
          return `${serverOrigin.replace(/\/+$/, '')}/${u.replace(/^\/+/, '')}`;
        }
        return u;
      });
    }

    // Render the exact source revision before queuing publication.
    // If the image is ALREADY a pre-rendered composite export (e.g. from bgos-design-export or explicitly marked isPreRendered), skip re-rendering.
    // Otherwise, any post with a structured design must be rendered to composite the headline, badge, and text overlays onto the photo.
    const hasPreRenderedMedia = Array.isArray(body.mediaUrls) && body.mediaUrls.length > 0 && typeof body.mediaUrls[0] === 'string' && body.mediaUrls[0].trim().length > 0;
    const isAlreadyRendered = hasPreRenderedMedia && (
      body.mediaUrls[0].includes('bgos-design-export') ||
      body.mediaUrls[0].includes('/designs/') ||
      Boolean(body.isPreRendered)
    );

    if (design && !isDraft && !isAlreadyRendered) {
      try {
        const { renderDesign } = await import('@/lib/designs/render');
        const rendered = await renderDesign(design, tenantId);
        if (rendered?.imageUrl) {
          body.mediaUrls = [rendered.imageUrl];
        }
      } catch (renderError) {
        console.warn('[api/social/posts] renderDesign warning:', renderError instanceof Error ? renderError.message : renderError);
        // If we already have a mediaUrl (e.g. background photo or asset), fall back to it gracefully
        if (!hasPreRenderedMedia) {
          return NextResponse.json(
            { error: `Could not export design image: ${renderError instanceof Error ? renderError.message : 'Rendering error'}` },
            { status: 400 }
          );
        }
      }
    }

    // Persist the post.
    let created = true;
    const postData = {
        ...(requestId ? { id: requestId } : {}),
        tenantId,
        status: initialStatus,
        approvalStatus: body.approvalStatus || null,
        content: body.content,
        designJson: design ? JSON.stringify(design) : null,
        mediaUrls: JSON.stringify(body.mediaUrls || []),
        linkUrl: body.linkUrl || null,
        publishTargets: JSON.stringify(publishTargets),
        scheduledAt: publishNow ? now : scheduledAt,
        publishedAt: null,
        failureReason: null,
        gbpPostType: body.gbpPostType || (body.gbpOfferData ? 'offer' : null),
        gbpOfferData: Object.keys(offerData).length > 0 ? JSON.stringify(offerData) : null,
        pinterestBoard: body.pinterestBoard || null,
        createdById: user.id,
      };
    const postSelect = {
        id: true,
        status: true,
        content: true,
        mediaUrls: true,
        designJson: true,
        linkUrl: true,
        publishTargets: true,
        scheduledAt: true,
        publishedAt: true,
        createdAt: true,
        updatedAt: true,
      } as const;
    let post;
    if(body.draftId){
      if(!body.expectedUpdatedAt || !Number.isFinite(new Date(body.expectedUpdatedAt).getTime()))return NextResponse.json({error:'Reopen the latest draft before publishing'},{status:409});
      const {id: ignoredId,createdById: ignoredCreator,...updateData}=postData;
      const promoted=await db.socialPost.updateMany({where:{id:body.draftId,tenantId,status:'draft',updatedAt:new Date(body.expectedUpdatedAt)},data:{...updateData,updatedAt:new Date()}});
      if(promoted.count!==1)return NextResponse.json({error:'The draft changed or was already published. Reopen it before retrying.'},{status:409});
      post=await db.socialPost.findFirst({where:{id:body.draftId,tenantId},select:postSelect});
      if(!post)return NextResponse.json({error:'Draft not found'},{status:404});
    }else{
      post=await db.socialPost.create({data:postData,select:postSelect }).catch(async (error) => {
      if (!requestId) throw error;
      const existing = await db.socialPost.findUnique({ where: { id: requestId } });
      if (!existing) throw error;
      created = false;
      return existing;
    });
    }


    if (!created) return NextResponse.json({ data: { ...post, mediaUrls: safeJsonArray(post.mediaUrls), publishTargets: safeJsonArray(post.publishTargets) } });

    // Audit log (best-effort).
    await logActivity({
      tenantId,
      actorId: user.id,
      actorType: 'user',
      action: 'create',
      entityType: 'social_post',
      entityId: post.id,
      entityName: body.content.slice(0, 60),
      description: publishNow
        ? `Published social post to ${body.targets.length} platform(s).`
        : `Created social post (${initialStatus}) targeting ${body.targets.length} platform(s).`,
      severity: 'info',
    }).catch(() => {});

    // If publish-now, fire the orchestrator.
    // The orchestrator runs in background and the UI polls /api/social/posts/[id] for completion.
    if (publishNow) {
      if (typeof after === 'function') {
        try {
          after(() => publishPost(post.id));
        } catch {
          void publishPost(post.id);
        }
      } else {
        void publishPost(post.id);
      }
    }

    return NextResponse.json(
      {
        data: {
          ...post,
          mediaUrls: safeJsonArray(post.mediaUrls),
          publishTargets: safeJsonArray(post.publishTargets),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[api/social/posts] POST error:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
