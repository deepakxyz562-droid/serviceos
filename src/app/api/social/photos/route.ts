import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { resolveGoogleConnectionState } from '@/lib/social/google-connection-state';
import {
  uploadGoogleBusinessMedia,
  listGoogleBusinessMedia,
} from '@/lib/social/adapters/googlebusiness';
import { publishPost } from '@/lib/social/publisher';
import {
  resolveTenantLocale,
  computeLocalScheduledDate,
  parseHourMinute,
} from '@/lib/locale-timezone';
import { toIsoStringSafe } from '@/lib/safe-date';

type GbpMediaCategory =
  | 'ADDITIONAL'
  | 'COVER'
  | 'PROFILE'
  | 'EXTERIOR'
  | 'INTERIOR'
  | 'PRODUCT'
  | 'AT_WORK'
  | 'TEAMS';

interface PhotoInputItem {
  url: string;
  thumbnailUrl?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: GbpMediaCategory;
  mediaFormat?: 'PHOTO' | 'VIDEO';
  seoFilename?: string;
  geoTagged?: boolean;
  altText?: string;
  seoScore?: number;
}

interface StoredMediaMeta {
  gbpPostType?: string;
  title?: string;
  thumbnailUrl?: string;
  tags?: string[];
  category?: string;
  mediaFormat?: 'PHOTO' | 'VIDEO';
  altText?: string;
  seoFilename?: string;
  geoTagged?: boolean;
  seoScore?: number;
  scheduledFor?: string;
  timeZone?: string;
  country?: string;
}

function inferImageMimeType(url: string, mediaFormat?: 'PHOTO' | 'VIDEO'): string {
  const clean = url.split('?')[0].toLowerCase();
  if (mediaFormat === 'VIDEO') {
    if (clean.endsWith('.mov')) return 'video/quicktime';
    if (clean.endsWith('.webm')) return 'video/webm';
    return 'video/mp4';
  }
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function parseOfferMeta(raw: string | null | undefined): StoredMediaMeta {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        gbpPostType: typeof parsed.gbpPostType === 'string' ? parsed.gbpPostType : undefined,
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
        thumbnailUrl: typeof parsed.thumbnailUrl === 'string' ? parsed.thumbnailUrl : undefined,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.filter((t: unknown): t is string => typeof t === 'string')
          : undefined,
        category: typeof parsed.category === 'string' ? parsed.category : undefined,
        mediaFormat:
          parsed.mediaFormat === 'VIDEO' || parsed.mediaFormat === 'PHOTO'
            ? parsed.mediaFormat
            : undefined,
        altText: typeof parsed.altText === 'string' ? parsed.altText : undefined,
        seoFilename: typeof parsed.seoFilename === 'string' ? parsed.seoFilename : undefined,
        geoTagged: typeof parsed.geoTagged === 'boolean' ? parsed.geoTagged : undefined,
        seoScore: typeof parsed.seoScore === 'number' ? parsed.seoScore : undefined,
        scheduledFor: typeof parsed.scheduledFor === 'string' ? parsed.scheduledFor : undefined,
        timeZone: typeof parsed.timeZone === 'string' ? parsed.timeZone : undefined,
        country: typeof parsed.country === 'string' ? parsed.country : undefined,
      };
    }
  } catch {}
  return {};
}

function parsePublishTargetsRaw(raw: string | null | undefined): Array<Record<string, any>> {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((t): t is Record<string, any> => Boolean(t && typeof t === 'object'));
    }
  } catch {}
  return [];
}

function parseMediaMetaFromTargets(raw: string | null | undefined): StoredMediaMeta {
  const targets = parsePublishTargetsRaw(raw);
  for (const target of targets) {
    const mm = target?.mediaMeta;
    if (mm && typeof mm === 'object') {
      return {
        gbpPostType: typeof mm.gbpPostType === 'string' ? mm.gbpPostType : undefined,
        title: typeof mm.title === 'string' ? mm.title : undefined,
        thumbnailUrl: typeof mm.thumbnailUrl === 'string' ? mm.thumbnailUrl : undefined,
        tags: Array.isArray(mm.tags)
          ? mm.tags.filter((t: unknown): t is string => typeof t === 'string')
          : undefined,
        category: typeof mm.category === 'string' ? mm.category : undefined,
        mediaFormat:
          mm.mediaFormat === 'VIDEO' || mm.mediaFormat === 'PHOTO' ? mm.mediaFormat : undefined,
        altText: typeof mm.altText === 'string' ? mm.altText : undefined,
        seoFilename: typeof mm.seoFilename === 'string' ? mm.seoFilename : undefined,
        geoTagged: typeof mm.geoTagged === 'boolean' ? mm.geoTagged : undefined,
        seoScore: typeof mm.seoScore === 'number' ? mm.seoScore : undefined,
        scheduledFor: typeof mm.scheduledFor === 'string' ? mm.scheduledFor : undefined,
        timeZone: typeof mm.timeZone === 'string' ? mm.timeZone : undefined,
        country: typeof mm.country === 'string' ? mm.country : undefined,
      };
    }
  }
  return {};
}

function isPhotoMediaRow(post: {
  gbpPostType?: string | null;
  gbpOfferData?: string | null;
  publishTargets?: string | null;
  designJson?: string | null;
  linkUrl?: string | null;
  mediaUrls?: unknown;
}): boolean {
  if (post.gbpPostType === 'photo_media') return true;

  const targetMeta = parseMediaMetaFromTargets(post.publishTargets);
  if (targetMeta.gbpPostType === 'photo_media' || targetMeta.mediaFormat) {
    return true;
  }

  const offerMeta = parseOfferMeta(post.gbpOfferData);
  if (offerMeta.mediaFormat || offerMeta.altText || (offerMeta.category && !(post.gbpOfferData || '').includes('startDate'))) {
    return true;
  }

  // Posts created through media/photos composer carrying category/tags metadata
  if (targetMeta.category || (targetMeta.tags && targetMeta.tags.length > 0)) {
    return true;
  }

  // Media posts targeting GBP without multi-platform social distributions or structured designs
  if (!post.designJson && !post.linkUrl) {
    const urls = parseMediaUrls(post.mediaUrls);
    if (urls.length > 0) {
      const targets = parsePublishTargetsRaw(post.publishTargets);
      const hasOtherSocialPlatform = targets.some(
        (t) => typeof t.platform === 'string' && t.platform !== 'googlebusiness',
      );
      if (!hasOtherSocialPlatform) return true;
    }
  }

  return false;
}

function normalizeTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(
      raw
        .map((t) => String(t || '').replace(/^#+/, '').trim())
        .filter((t) => t.length > 0 && t.length <= 40),
    ),
  ).slice(0, 12);
}

function inferMediaFormat(url: string, explicit?: string): 'PHOTO' | 'VIDEO' {
  if (explicit === 'VIDEO' || /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(url)) {
    return 'VIDEO';
  }
  return 'PHOTO';
}

function isVideoFileUrl(url?: string | null): boolean {
  return Boolean(url && /\.(mp4|mov|webm|m4v|3gp|mkv|avi)(\?|$)/i.test(url));
}

function resolveValidThumbnailUrl(
  rawThumb: unknown,
  mediaUrl: string,
  mediaFormat: 'PHOTO' | 'VIDEO',
  request: NextRequest,
): string | undefined {
  if (typeof rawThumb !== 'string') return undefined;
  const trimmed = rawThumb.trim();
  if (!trimmed) return undefined;
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
    return undefined;
  }
  const publicThumb = toPublicMediaUrl(trimmed, request);
  if (isVideoFileUrl(publicThumb)) return undefined;
  if (mediaFormat === 'VIDEO' && publicThumb === mediaUrl) return undefined;
  return publicThumb;
}

function resolvePublicOrigin(request: NextRequest): string | null {
  const proto =
    request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ||
    request.nextUrl?.protocol?.replace(/:$/, '') ||
    'https';
  const host =
    request.headers.get('x-forwarded-host')?.split(',')[0]?.trim() ||
    request.headers.get('host')?.split(',')[0]?.trim();
  if (host) return `${proto}://${host}`;
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : null;
}

function toPublicMediaUrl(url: string, request: NextRequest): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) {
    const origin = resolvePublicOrigin(request);
    if (origin) return `${origin}${trimmed}`;
  }
  return trimmed;
}

function parseMediaUrls(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((u): u is string => typeof u === 'string' && u.trim().length > 0).map((u) => u.trim());
  }
  if (typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((u): u is string => typeof u === 'string' && u.trim().length > 0)
        .map((u) => u.trim());
    }
    if (typeof parsed === 'string' && parsed.trim().length > 0) {
      return [parsed.trim()];
    }
  } catch {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
      return [trimmed];
    }
  }
  return [];
}

function buildDescriptionWithKeywords(description: string, title?: string, tags?: string[]): string {
  const base = (description || '').trim();
  if (base) return base;
  const tagText = tags && tags.length > 0 ? ` — ${tags.slice(0, 3).join(', ')}` : '';
  return `${(title || 'Recent showcase').trim()}${tagText}`.trim();
}

/**
 * GET /api/social/photos
 * List all photos/media on Google Business Profile + scheduled / draft / unposted queue items.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const overrideCountry = searchParams.get('country');
    const overrideTimeZone = searchParams.get('timeZone');

    const [tenant, googleAccount] = await Promise.all([
      db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { country: true, settingsJson: true },
      }),
      prepareGoogleAccount(user.tenantId),
    ]);
    const { isConnected, connectionState } = await resolveGoogleConnectionState(
      user.tenantId,
      googleAccount,
    );
    const locale = resolveTenantLocale({
      tenantCountry: tenant?.country,
      settingsJson: tenant?.settingsJson,
      overrideCountry,
      overrideTimeZone,
    });
    let livePhotos: Array<{
      id: string;
      url: string;
      thumbnailUrl?: string;
      category?: string;
      createdAt: string;
      source: 'google' | 'queue';
      mediaFormat?: string;
      title?: string;
      caption?: string;
      tags?: string[];
    }> = [];

    if (googleAccount) {
      try {
        const mediaRes = await listGoogleBusinessMedia(googleAccount);
        livePhotos = (mediaRes.mediaItems || []).map((m, idx) => {
          const mediaFormat =
            (m as { mediaFormat?: string }).mediaFormat || inferMediaFormat(m.googleUrl);
          const validLiveThumb =
            m.thumbnailUrl &&
            !isVideoFileUrl(m.thumbnailUrl) &&
            (mediaFormat !== 'VIDEO' || m.thumbnailUrl !== m.googleUrl)
              ? m.thumbnailUrl
              : undefined;
          const shortId = m.name ? m.name.split('/').pop() || '' : '';
          const isPendingReview = shortId.startsWith('CIAB');
          return {
            id: m.name || `gmedia-${idx}`,
            url: m.googleUrl,
            thumbnailUrl: validLiveThumb || (mediaFormat === 'VIDEO' ? undefined : m.googleUrl),
            category: m.category || 'ADDITIONAL',
            createdAt: m.createTime,
            source: 'google' as const,
            mediaFormat,
            caption: m.category ? `Google Business Profile · ${m.category}` : undefined,
            reviewStatus: isPendingReview ? ('in_review' as const) : ('approved' as const),
            status: isPendingReview ? 'in_review' : 'published',
            statusLabel: isPendingReview ? 'In Google Review (12–48h)' : 'Live on Google Maps',
          };
        });
      } catch (err: unknown) {
        console.warn('[social/photos] Google media list warning:', err instanceof Error ? err.message : err);
      }
    }

    // Fetch candidate queued/draft/failed posts and filter in JS so unmigrated Supabase schemas
    // missing `gbpPostType` or `gbpOfferData` never drop scheduled/draft media items.
    const candidatePosts = await db.socialPost.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['scheduled', 'publishing', 'draft', 'failed'] },
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 150,
      select: {
        id: true,
        mediaUrls: true,
        scheduledAt: true,
        createdAt: true,
        content: true,
        status: true,
        gbpPostType: true,
        gbpOfferData: true,
        publishTargets: true,
        designJson: true,
        linkUrl: true,
        failureReason: true,
      },
    });

    const scheduledPosts = candidatePosts.filter((p) => isPhotoMediaRow(p));

    const queuedPhotos = scheduledPosts
      .flatMap((p) => {
        try {
          const urls = parseMediaUrls(p.mediaUrls);
          if (!urls.length) return [];
          const offerMeta = parseOfferMeta(p.gbpOfferData);
          const targetMeta = parseMediaMetaFromTargets(p.publishTargets);
          const meta: StoredMediaMeta = {
            ...targetMeta,
            ...offerMeta,
            tags: (offerMeta.tags && offerMeta.tags.length > 0 ? offerMeta.tags : targetMeta.tags) || [],
          };
          const scheduledForIso =
            toIsoStringSafe(p.scheduledAt) || toIsoStringSafe(meta.scheduledFor);
          const createdAtIso = toIsoStringSafe(p.createdAt);
          return urls.map((rawUrl: string, idx: number) => {
            const publicUrl = toPublicMediaUrl(rawUrl, request);
            const mediaFormat = meta.mediaFormat || inferMediaFormat(publicUrl);
            const resolvedThumb = resolveValidThumbnailUrl(
              meta.thumbnailUrl,
              publicUrl,
              mediaFormat,
              request,
            );
            return {
              id: urls.length === 1 ? p.id : `${p.id}-${idx}`,
              postId: p.id,
              url: publicUrl,
              thumbnailUrl: resolvedThumb || (mediaFormat === 'VIDEO' ? undefined : publicUrl),
              title: meta.title || undefined,
              tags: meta.tags || [],
              category: meta.category || 'SCHEDULED',
              gbpCategory: meta.category || 'ADDITIONAL',
              mediaFormat,
              ...(meta.seoFilename ? { seoFilename: meta.seoFilename } : {}),
              ...(meta.geoTagged !== undefined ? { geoTagged: meta.geoTagged } : {}),
              ...(meta.altText ? { altText: meta.altText } : {}),
              ...(typeof meta.seoScore === 'number' ? { seoScore: meta.seoScore } : {}),
              createdAt: scheduledForIso || createdAtIso || new Date().toISOString(),
              scheduledFor: scheduledForIso,
              source: 'queue' as const,
              status: p.status,
              caption: p.content,
              description: p.content,
              failureReason: p.failureReason || undefined,
            };
          });
        } catch (err: unknown) {
          console.warn('[social/photos] Failed to normalize queued photo post:', p.id, err instanceof Error ? err.message : err);
          return [];
        }
      })
      .filter(Boolean);

    const scheduledCount = queuedPhotos.filter(
      (p) => p.status === 'scheduled' || p.status === 'publishing',
    ).length;
    const notPostedCount = queuedPhotos.filter(
      (p) => p.status === 'draft' || p.status === 'failed',
    ).length;
    const hasInReviewPhoto = livePhotos.some((p: any) => p.reviewStatus === 'in_review');
    const hasActivePublishing = candidatePosts.some((p) => p.status === 'publishing');

    return NextResponse.json({
      photos: [...livePhotos, ...queuedPhotos],
      liveCount: livePhotos.length,
      queuedCount: queuedPhotos.length,
      scheduledCount,
      notPostedCount,
      hasInReviewPhoto,
      hasActivePublishing,
      isConnected,
      connectionState,
      locale,
    });
  } catch (error: unknown) {
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch photos' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/social/photos
 * Upload photos/videos in bulk with optional per-item AI metadata (title, tags, description, category)
 * and AI auto-drip scheduling (instant, daily, weekly, staggered, or draft).
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const rawItems: PhotoInputItem[] = Array.isArray(body.items)
      ? body.items.filter((it: any) => it && typeof it.url === 'string' && it.url.trim())
      : [];

    const fallbackUrls: string[] = Array.isArray(body.photos) && body.photos.length > 0
      ? body.photos.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
      : Array.isArray(body.mediaUrls) && body.mediaUrls.length > 0
        ? body.mediaUrls.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
        : typeof body.photoUrl === 'string' && body.photoUrl.trim()
          ? [body.photoUrl.trim()]
          : typeof body.url === 'string' && body.url.trim()
            ? [body.url.trim()]
            : [];

    const sharedTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const sharedDescription =
      typeof body.description === 'string' && body.description.trim()
        ? body.description.trim()
        : typeof body.aiSeoKeywords === 'string'
          ? body.aiSeoKeywords.trim()
          : '';
    const sharedTags = normalizeTags(body.tags);
    const sharedCategory = (body.category || 'ADDITIONAL') as GbpMediaCategory;
    const sharedSeoFilename =
      typeof body.seoFilename === 'string' && body.seoFilename.trim()
        ? body.seoFilename.trim()
        : undefined;
    const sharedGeoTagged =
      typeof body.geoTagged === 'boolean' ? body.geoTagged : undefined;
    const sharedAltText =
      typeof body.altText === 'string' && body.altText.trim()
        ? body.altText.trim()
        : undefined;
    const sharedSeoScore =
      typeof body.seoScore === 'number' && Number.isFinite(body.seoScore)
        ? body.seoScore
        : undefined;

    const items: PhotoInputItem[] =
      rawItems.length > 0
        ? rawItems.map((it) => {
            const fmt = inferMediaFormat(it.url, it.mediaFormat);
            const publicUrl = toPublicMediaUrl(it.url, request);
            return {
              url: it.url.trim(),
              thumbnailUrl: resolveValidThumbnailUrl(it.thumbnailUrl, publicUrl, fmt, request),
              title: (typeof it.title === 'string' ? it.title.trim() : '') || sharedTitle,
              description:
                (typeof it.description === 'string' ? it.description.trim() : '') || sharedDescription,
              tags: normalizeTags(it.tags).length > 0 ? normalizeTags(it.tags) : sharedTags,
              category: (it.category || sharedCategory) as GbpMediaCategory,
              mediaFormat: fmt,
              seoFilename:
                (typeof it.seoFilename === 'string' && it.seoFilename.trim()) || sharedSeoFilename,
              geoTagged: typeof it.geoTagged === 'boolean' ? it.geoTagged : sharedGeoTagged,
              altText: (typeof it.altText === 'string' && it.altText.trim()) || sharedAltText,
              seoScore:
                typeof it.seoScore === 'number' && Number.isFinite(it.seoScore)
                  ? it.seoScore
                  : sharedSeoScore,
            };
          })
        : fallbackUrls.map((url) => ({
            url,
            title: sharedTitle,
            description: sharedDescription,
            tags: sharedTags,
            category: sharedCategory,
            mediaFormat: inferMediaFormat(url),
            seoFilename: sharedSeoFilename,
            geoTagged: sharedGeoTagged,
            altText: sharedAltText,
            seoScore: sharedSeoScore,
          }));

    if (!items.length) {
      return NextResponse.json({ error: 'No photos or videos provided for upload.' }, { status: 400 });
    }

    const scheduleMode: 'instant' | 'daily' | 'weekly' | 'staggered' | 'draft' =
      body.scheduleMode || 'instant';
    const requestedPostType = typeof body.postType === 'string' ? body.postType.trim() : undefined;

    // Concurrency guard: block simultaneous instant publishing while another post/photo is in-flight
    if (scheduleMode === 'instant') {
      const activePublishing = await db.socialPost.findFirst({
        where: { tenantId: user.tenantId, status: 'publishing' },
        select: { id: true },
      });
      if (activePublishing) {
        return NextResponse.json(
          {
            error:
              'Another post or photo is currently being published to Google. Please wait a moment for it to complete.',
            code: 'PUBLISH_IN_PROGRESS',
          },
          { status: 409 },
        );
      }
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        country: true,
        settingsJson: true,
        brandProfile: {
          select: { businessName: true },
        },
      },
    });
    const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'our business';
    const locale = resolveTenantLocale({
      tenantCountry: tenant?.country,
      settingsJson: tenant?.settingsJson,
      overrideCountry: typeof body.country === 'string' ? body.country : undefined,
      overrideTimeZone: typeof body.timeZone === 'string' ? body.timeZone : undefined,
    });
    const { hour: preferredHour, minute: preferredMinute } = parseHourMinute(
      typeof body.preferredTime === 'string' ? body.preferredTime : '10:00',
      10,
      0,
    );

    const googleAccount = await prepareGoogleAccount(user.tenantId);
    const uploadedPhotos: Array<{
      id?: string;
      url: string;
      thumbnailUrl?: string;
      status: string;
      scheduledAt?: string;
      title?: string;
      tags?: string[];
      seoFilename?: string;
      geoTagged?: boolean;
      altText?: string;
      seoScore?: number;
    }> = [];

    // Best-effort asset catalog registration (non-blocking if omitted in test mocks)
    for (const item of items) {
      try {
        if (db.imageLibrary?.create && item.mediaFormat !== 'VIDEO') {
          await db.imageLibrary.create({
            data: {
              tenantId: user.tenantId,
              name: item.title || `${businessName} Media`,
              url: item.url,
              folder: 'gbp-media',
              mediaType: inferImageMimeType(item.url, item.mediaFormat),
              size: 0,
              uploadedBy: user.id || 'system',
            },
          });
        }
      } catch {}
    }

    const buildSeoFields = (item: PhotoInputItem) => ({
      ...(item.seoFilename ? { seoFilename: item.seoFilename } : {}),
      ...(item.geoTagged !== undefined ? { geoTagged: item.geoTagged } : {}),
      ...(item.altText ? { altText: item.altText } : {}),
      ...(typeof item.seoScore === 'number' ? { seoScore: item.seoScore } : {}),
    });

    if (scheduleMode === 'instant') {
      // In instant mode: publish the first photo immediately.
      // If multiple photos are submitted, auto-schedule subsequent photos into the daily drip queue
      // to avoid Google automated spam filters and Cloud Vision rate limits.
      const firstItem = items[0];
      const publicItemUrl = toPublicMediaUrl(firstItem.url, request);
      const effectiveDescription = buildDescriptionWithKeywords(
        firstItem.description || `Recent work and services at ${businessName}`,
        firstItem.title,
        firstItem.tags,
      );
      const seoFields = buildSeoFields(firstItem);
      const isVideo = firstItem.mediaFormat === 'VIDEO';
      const effectivePostType = isVideo
        ? 'photo_media'
        : requestedPostType === 'whats_new' || requestedPostType === 'offer'
        ? requestedPostType
        : 'photo_media';
      const mediaMetaObj: StoredMediaMeta = {
        gbpPostType: effectivePostType,
        title: firstItem.title || `${businessName} Showcase`,
        ...(firstItem.thumbnailUrl ? { thumbnailUrl: firstItem.thumbnailUrl } : {}),
        tags: firstItem.tags || [],
        category: firstItem.category || 'ADDITIONAL',
        mediaFormat: firstItem.mediaFormat || 'PHOTO',
        ...seoFields,
      };
      const mediaMetaJson = JSON.stringify(mediaMetaObj);

      if (googleAccount) {
        try {
          const postRecord = await db.socialPost.create({
            data: {
              tenantId: user.tenantId,
              status: 'draft',
              content: effectiveDescription,
              mediaUrls: JSON.stringify([publicItemUrl]),
              publishTargets: JSON.stringify([
                {
                  platform: 'googlebusiness',
                  socialAccountId: googleAccount.id,
                  status: 'pending',
                  mediaMeta: mediaMetaObj,
                },
              ]),
              scheduledAt: null,
              gbpPostType: effectivePostType,
              gbpOfferData: mediaMetaJson,
              createdById: user.id || 'system',
            },
          });

          await publishPost(postRecord.id);

          const finished = await db.socialPost.findUnique({
            where: { id: postRecord.id },
            select: { status: true, publishTargets: true, failureReason: true },
          });
          const finishedTargets = parsePublishTargetsRaw(finished?.publishTargets);
          const gbpRes = finishedTargets.find((t) => t.platform === 'googlebusiness');
          const isReview = Boolean(
            gbpRes?.externalPostId && gbpRes.externalPostId.includes('CIAB'),
          );

          uploadedPhotos.push({
            id: postRecord.id,
            url: gbpRes?.permalink || publicItemUrl,
            thumbnailUrl: firstItem.thumbnailUrl,
            status:
              finished?.status === 'published'
                ? isReview
                  ? 'in_review'
                  : 'published'
                : `saved_locally: ${finished?.failureReason || 'Publish failed'}`,
            reviewStatus: isReview ? ('in_review' as const) : ('approved' as const),
            statusLabel: isReview ? 'In Google Review (12–48h)' : 'Live on Google Maps',
            title: firstItem.title,
            tags: firstItem.tags,
            ...seoFields,
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          console.warn('[social/photos] Instant publish warning:', msg);
          const savedDraft = await db.socialPost.create({
            data: {
              tenantId: user.tenantId,
              status: 'draft',
              content: effectiveDescription,
              mediaUrls: JSON.stringify([publicItemUrl]),
              publishTargets: JSON.stringify([
                {
                  platform: 'googlebusiness',
                  socialAccountId: googleAccount.id,
                  status: 'pending',
                  error: msg,
                  mediaMeta: mediaMetaObj,
                },
              ]),
              scheduledAt: null,
              gbpPostType: effectivePostType,
              gbpOfferData: mediaMetaJson,
              failureReason: msg.slice(0, 500),
              createdById: user.id || 'system',
            },
          });
          uploadedPhotos.push({
            id: savedDraft.id,
            url: publicItemUrl,
            thumbnailUrl: firstItem.thumbnailUrl,
            status: `saved_locally: ${msg}`,
            title: firstItem.title,
            tags: firstItem.tags,
            ...seoFields,
          });
        }
      } else {
        const savedDraft = await db.socialPost.create({
          data: {
            tenantId: user.tenantId,
            status: 'draft',
            content: effectiveDescription,
            mediaUrls: JSON.stringify([publicItemUrl]),
            publishTargets: JSON.stringify([
              {
                platform: 'googlebusiness',
                socialAccountId: '',
                status: 'pending',
                mediaMeta: mediaMetaObj,
              },
            ]),
            scheduledAt: null,
            gbpPostType: effectivePostType,
            gbpOfferData: mediaMetaJson,
            createdById: user.id || 'system',
          },
        });
        uploadedPhotos.push({
          id: savedDraft.id,
          url: publicItemUrl,
          thumbnailUrl: firstItem.thumbnailUrl,
          status: 'saved_locally (Google account not connected)',
          title: firstItem.title,
          tags: firstItem.tags,
          ...seoFields,
        });
      }

      // If more than 1 item was selected, schedule remaining items daily to avoid Google spam flags
      if (items.length > 1) {
        const now = new Date();
        for (let i = 1; i < items.length; i++) {
          const item = items[i];
          const itemPublicUrl = toPublicMediaUrl(item.url, request);
          const scheduledTime = computeLocalScheduledDate({
            dayOffset: i,
            hour: preferredHour,
            minute: preferredMinute,
            timeZone: locale.timeZone,
            now,
          });
          const caption = buildDescriptionWithKeywords(
            item.description || `Recent work and services at ${businessName}`,
            item.title,
            item.tags,
          );
          const subSeoFields = buildSeoFields(item);
          const subIsVideo = item.mediaFormat === 'VIDEO';
          const subPostType = subIsVideo
            ? 'photo_media'
            : requestedPostType === 'whats_new' || requestedPostType === 'offer'
            ? requestedPostType
            : 'photo_media';

          const subMetaObj: StoredMediaMeta = {
            gbpPostType: subPostType,
            title: item.title || `${businessName} Showcase`,
            ...(item.thumbnailUrl ? { thumbnailUrl: item.thumbnailUrl } : {}),
            tags: item.tags || [],
            category: item.category || 'ADDITIONAL',
            mediaFormat: item.mediaFormat || 'PHOTO',
            scheduledFor: scheduledTime.toISOString(),
            timeZone: locale.timeZone,
            country: locale.country,
            ...subSeoFields,
          };

          const created = await db.socialPost.create({
            data: {
              tenantId: user.tenantId,
              status: 'scheduled',
              content: caption,
              mediaUrls: JSON.stringify([itemPublicUrl]),
              publishTargets: JSON.stringify([
                {
                  platform: 'googlebusiness',
                  socialAccountId: googleAccount?.id || '',
                  status: 'pending',
                  mediaMeta: subMetaObj,
                },
              ]),
              scheduledAt: scheduledTime,
              gbpPostType: subPostType,
              gbpOfferData: JSON.stringify(subMetaObj),
              createdById: user.id || 'system',
            },
          });

          uploadedPhotos.push({
            id: created.id,
            url: itemPublicUrl,
            thumbnailUrl: item.thumbnailUrl,
            status: 'scheduled',
            statusLabel: `Scheduled for ${scheduledTime.toLocaleDateString()}`,
            scheduledAt: scheduledTime.toISOString(),
            title: item.title,
            tags: item.tags,
            ...subSeoFields,
          });
        }
      }
    } else if (scheduleMode === 'draft') {
      for (const item of items) {
        const publicItemUrl = toPublicMediaUrl(item.url, request);
        const effectiveDescription = buildDescriptionWithKeywords(
          item.description || `Quality craftsmanship and customer satisfaction at ${businessName}.`,
          item.title,
          item.tags,
        );
        const seoFields = buildSeoFields(item);
        const isVideo = item.mediaFormat === 'VIDEO';
        const effectivePostType = isVideo
          ? 'photo_media'
          : requestedPostType === 'whats_new' || requestedPostType === 'offer'
          ? requestedPostType
          : 'photo_media';
        const mediaMetaObj: StoredMediaMeta = {
          gbpPostType: effectivePostType,
          title: item.title || `${businessName} Media`,
          ...(item.thumbnailUrl ? { thumbnailUrl: item.thumbnailUrl } : {}),
          tags: item.tags || [],
          category: item.category || 'ADDITIONAL',
          mediaFormat: item.mediaFormat || 'PHOTO',
          ...seoFields,
        };
        const created = await db.socialPost.create({
          data: {
            tenantId: user.tenantId,
            status: 'draft',
            content: effectiveDescription,
            mediaUrls: JSON.stringify([publicItemUrl]),
            publishTargets: JSON.stringify([
              {
                platform: 'googlebusiness',
                socialAccountId: googleAccount?.id || '',
                status: 'pending',
                mediaMeta: mediaMetaObj,
              },
            ]),
            scheduledAt: null,
            gbpPostType: effectivePostType,
            gbpOfferData: JSON.stringify(mediaMetaObj),
            createdById: user.id || 'system',
          },
        });
        uploadedPhotos.push({
          id: created.id,
          url: publicItemUrl,
          thumbnailUrl: item.thumbnailUrl,
          status: 'draft',
          title: item.title,
          tags: item.tags,
          ...seoFields,
        });
      }
    } else {
      // Scheduled publishing mode: daily, staggered (every 2 days), or weekly at workspace local time
      const dayInterval = scheduleMode === 'daily' ? 1 : scheduleMode === 'weekly' ? 7 : 2;
      const now = new Date();
      const todaySlot = computeLocalScheduledDate({
        dayOffset: 0,
        hour: preferredHour,
        minute: preferredMinute,
        timeZone: locale.timeZone,
        now,
      });
      const canStartToday = todaySlot.getTime() > now.getTime() + 15 * 60_000;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const publicItemUrl = toPublicMediaUrl(item.url, request);
        const dayOffset = (canStartToday ? i : i + 1) * dayInterval;
        const scheduledTime = computeLocalScheduledDate({
          dayOffset,
          hour: preferredHour,
          minute: preferredMinute,
          timeZone: locale.timeZone,
          now,
        });
        const caption = buildDescriptionWithKeywords(
          item.description ||
            `Quality craftsmanship and customer satisfaction at ${businessName}. Serving local residents and businesses.`,
          item.title,
          item.tags,
        );
        const seoFields = buildSeoFields(item);
        const isVideo = item.mediaFormat === 'VIDEO';
        const effectivePostType = isVideo
          ? 'photo_media'
          : requestedPostType === 'whats_new' || requestedPostType === 'offer'
          ? requestedPostType
          : 'photo_media';

        const mediaMetaObj: StoredMediaMeta = {
          gbpPostType: effectivePostType,
          title: item.title || `${businessName} Showcase`,
          ...(item.thumbnailUrl ? { thumbnailUrl: item.thumbnailUrl } : {}),
          tags: item.tags || [],
          category: item.category || 'ADDITIONAL',
          mediaFormat: item.mediaFormat || 'PHOTO',
          scheduledFor: scheduledTime.toISOString(),
          timeZone: locale.timeZone,
          country: locale.country,
          ...seoFields,
        };

        const publishTargets = [
          {
            platform: 'googlebusiness',
            socialAccountId: googleAccount?.id || '',
            status: 'pending',
            mediaMeta: mediaMetaObj,
          },
        ];

        const created = await db.socialPost.create({
          data: {
            tenantId: user.tenantId,
            status: 'scheduled',
            content: caption,
            mediaUrls: JSON.stringify([publicItemUrl]),
            publishTargets: JSON.stringify(publishTargets),
            scheduledAt: scheduledTime,
            gbpPostType: effectivePostType,
            gbpOfferData: JSON.stringify({
              title: mediaMetaObj.title,
              ...(mediaMetaObj.thumbnailUrl ? { thumbnailUrl: mediaMetaObj.thumbnailUrl } : {}),
              tags: mediaMetaObj.tags,
              category: mediaMetaObj.category,
              mediaFormat: mediaMetaObj.mediaFormat,
              timeZone: locale.timeZone,
              country: locale.country,
              ...seoFields,
            }),
            createdById: user.id || 'system',
          },
        });

        uploadedPhotos.push({
          id: created.id,
          url: publicItemUrl,
          thumbnailUrl: item.thumbnailUrl,
          status: 'scheduled',
          scheduledAt: scheduledTime.toISOString(),
          title: item.title,
          tags: item.tags,
          ...seoFields,
        });
      }
    }

    const publishedCount = uploadedPhotos.filter((p) => p.status === 'published').length;
    const savedLocalCount = uploadedPhotos.filter((p) => p.status.includes('saved_locally')).length;

    return NextResponse.json({
      success: true,
      count: uploadedPhotos.length,
      scheduleMode,
      locale,
      results: uploadedPhotos,
      message:
        scheduleMode === 'draft'
          ? `Saved ${uploadedPhotos.length} media item(s) to drafts (Not Posted).`
          : scheduleMode === 'instant'
            ? savedLocalCount > 0 && publishedCount === 0
              ? `Saved ${uploadedPhotos.length} media item(s) in BGOS (connect Google Business Profile to publish live).`
              : requestedPostType === 'whats_new'
                ? items.length > 1
                  ? `Published update post live. Scheduled remaining ${items.length - 1} item(s) daily at ${String(preferredHour).padStart(2, '0')}:${String(preferredMinute).padStart(2, '0')} ${locale.timeZone}.`
                  : `Update post published live to Google Business Profile (Visible in Updates tab).`
                : uploadedPhotos.some((p: any) => p.reviewStatus === 'in_review')
                  ? items.length > 1
                    ? `Uploaded photo to Google Photos gallery (in review: 12–48h). Scheduled remaining ${items.length - 1} photo(s) daily at ${String(preferredHour).padStart(2, '0')}:${String(preferredMinute).padStart(2, '0')} ${locale.timeZone}.`
                    : `Photo uploaded to Google Photos gallery and is currently in Google Review (12–48h).`
                  : items.length > 1
                    ? `Published 1 photo to gallery. Scheduled remaining ${items.length - 1} photo(s) daily at ${String(preferredHour).padStart(2, '0')}:${String(preferredMinute).padStart(2, '0')} ${locale.timeZone}.`
                    : `Published photo to Google Maps Photos gallery.`
            : `Scheduled ${uploadedPhotos.length} ${requestedPostType === 'whats_new' ? 'update post(s)' : 'photo(s)'} (${scheduleMode} at ${String(preferredHour).padStart(2, '0')}:${String(preferredMinute).padStart(2, '0')} ${locale.timeZone}).`,
    });
  } catch (error: unknown) {
    console.error('Error in photo upload/schedule:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process photos' },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/social/photos
 * Update title, description, tags, category, status, or schedule time of an existing queued/draft media post.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const body = await request.json().catch(() => ({}));
    const rawId = typeof body.postId === 'string' ? body.postId : typeof body.id === 'string' ? body.id : '';
    const postId = rawId.trim();
    if (!postId) {
      return NextResponse.json({ error: 'Media item id is required.' }, { status: 400 });
    }

    const existing = await db.socialPost.findFirst({
      where: {
        id: postId,
        tenantId: user.tenantId,
      },
      select: {
        id: true,
        content: true,
        status: true,
        scheduledAt: true,
        gbpPostType: true,
        gbpOfferData: true,
        publishTargets: true,
        designJson: true,
        linkUrl: true,
        mediaUrls: true,
      },
    });

    if (!existing || !isPhotoMediaRow(existing)) {
      return NextResponse.json({ error: 'Scheduled media item not found.' }, { status: 404 });
    }

    const offerMeta = parseOfferMeta(existing.gbpOfferData);
    const targetMeta = parseMediaMetaFromTargets(existing.publishTargets);
    const meta: StoredMediaMeta = { ...targetMeta, ...offerMeta };
    const requestedPostType = typeof body.postType === 'string' ? body.postType.trim() : undefined;
    const mediaUrls = parseMediaUrls(existing.mediaUrls);
    const rawUrl = mediaUrls[0];
    const inferredFormat = rawUrl ? inferMediaFormat(toPublicMediaUrl(rawUrl, request)) : 'PHOTO';
    const mediaFormat = meta.mediaFormat || inferredFormat;
    const isVideo = mediaFormat === 'VIDEO';
    const effectivePostType = isVideo
      ? 'photo_media'
      : requestedPostType === 'whats_new' || requestedPostType === 'offer'
      ? requestedPostType
      : (existing.gbpPostType === 'whats_new' || existing.gbpPostType === 'offer') && !requestedPostType
      ? existing.gbpPostType
      : 'photo_media';

    const nextMeta: StoredMediaMeta = {
      ...meta,
      gbpPostType: effectivePostType,
      mediaFormat,
      ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
      ...(body.tags !== undefined ? { tags: normalizeTags(body.tags) } : {}),
      ...(typeof body.category === 'string' ? { category: body.category.trim().toUpperCase() } : {}),
    };

    const updateData: Record<string, any> = {
      gbpOfferData: JSON.stringify(nextMeta),
      gbpPostType: effectivePostType,
    };

    if (typeof body.description === 'string') {
      updateData.content = body.description.trim() || existing.content;
    }

    const wantPublishNow = body.publishNow === true || body.status === 'published';

    if (wantPublishNow) {
      // In-flight concurrency lock
      const activePublishing = await db.socialPost.findFirst({
        where: { tenantId: user.tenantId, status: 'publishing' },
        select: { id: true },
      });
      if (activePublishing) {
        return NextResponse.json(
          {
            error:
              'Another post or media item is currently being published to Google. Please wait a moment for it to complete.',
            code: 'PUBLISH_IN_PROGRESS',
          },
          { status: 409 },
        );
      }

      if (!rawUrl) {
        return NextResponse.json({ error: 'Media URL is missing on this queued item.' }, { status: 400 });
      }
      const sourceUrl = toPublicMediaUrl(rawUrl, request);
      const effectiveDescription = buildDescriptionWithKeywords(
        typeof body.description === 'string' && body.description.trim()
          ? body.description.trim()
          : existing.content || '',
        nextMeta.title,
        nextMeta.tags,
      );

      const googleAccount = await prepareGoogleAccount(user.tenantId);
      const baseMeta = { ...nextMeta, gbpPostType: effectivePostType };

      if (!googleAccount) {
        return NextResponse.json(
          { error: 'Connect your Google Business Profile first to publish this media live.' },
          { status: 400 },
        );
      }

      await db.socialPost.update({
        where: { id: existing.id },
        data: {
          content: effectiveDescription,
          gbpPostType: effectivePostType,
          gbpOfferData: JSON.stringify(baseMeta),
          status: 'draft',
          failureReason: null,
        },
      });

      await publishPost(existing.id);

      const publishedPost = await db.socialPost.findUnique({
        where: { id: existing.id },
        select: { id: true, status: true, publishTargets: true, failureReason: true, content: true },
      });

      const targets = parsePublishTargetsRaw(publishedPost?.publishTargets);
      const gbpTarget = targets.find((t) => t.platform === 'googlebusiness');

      if (publishedPost?.status === 'failed' || gbpTarget?.status === 'failed') {
        const errMsg = publishedPost?.failureReason || gbpTarget?.error || 'Google publish failed';
        return NextResponse.json({ error: errMsg }, { status: 502 });
      }

      const isReview = Boolean(
        gbpTarget?.externalPostId && gbpTarget.externalPostId.includes('CIAB'),
      );

      return NextResponse.json({
        success: true,
        published: true,
        googleUrl: gbpTarget?.permalink || sourceUrl,
        reviewStatus: isReview ? ('in_review' as const) : ('approved' as const),
        statusLabel: isReview ? 'In Google Review (12–48h)' : 'Live on Google Maps',
        message: isReview
          ? 'Photo uploaded to Google Business Profile and is now in Google Review (takes 12–48h).'
          : 'Photo published live to Google Business Profile.',
        item: {
          id: existing.id,
          title: baseMeta.title,
          description: publishedPost?.content || effectiveDescription,
          tags: baseMeta.tags || [],
          category: baseMeta.category || 'ADDITIONAL',
          status: isReview ? 'in_review' : publishedPost?.status || 'published',
          reviewStatus: isReview ? ('in_review' as const) : ('approved' as const),
          statusLabel: isReview ? 'In Google Review (12–48h)' : 'Live on Google Maps',
          url: gbpTarget?.permalink || sourceUrl,
          scheduledFor: null,
        },
      });
    }

    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt === null || body.scheduledAt === '') {
        updateData.scheduledAt = null;
        nextMeta.scheduledFor = undefined;
        if (existing.status === 'scheduled') updateData.status = 'draft';
      } else {
        const dt = new Date(body.scheduledAt);
        if (isNaN(dt.getTime())) {
          return NextResponse.json({ error: 'Invalid schedule date.' }, { status: 400 });
        }
        updateData.scheduledAt = dt;
        nextMeta.scheduledFor = dt.toISOString();
        updateData.status = 'scheduled';
        updateData.failureReason = null;
      }
    }

    if (body.status === 'draft' || body.status === 'scheduled') {
      updateData.status = body.status;
      if (body.status === 'scheduled') {
        updateData.failureReason = null;
        if (!updateData.scheduledAt && !existing.scheduledAt) {
          const nextDt = new Date(Date.now() + 24 * 60 * 60 * 1000);
          updateData.scheduledAt = nextDt;
          nextMeta.scheduledFor = nextDt.toISOString();
        }
      }
    }

    const existingTargets = parsePublishTargetsRaw(existing.publishTargets);
    const nextTargets =
      existingTargets.length > 0
        ? existingTargets.map((t, idx) =>
            idx === 0 || t.platform === 'googlebusiness' ? { ...t, mediaMeta: nextMeta } : t,
          )
        : [{ platform: 'googlebusiness', socialAccountId: '', status: 'pending', mediaMeta: nextMeta }];
    updateData.publishTargets = JSON.stringify(nextTargets);
    updateData.gbpOfferData = JSON.stringify(nextMeta);

    const updated = await db.socialPost.update({
      where: { id: existing.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      item: {
        id: updated.id,
        title: nextMeta.title,
        description: updated.content,
        tags: nextMeta.tags || [],
        category: nextMeta.category || 'ADDITIONAL',
        status: updated.status,
        scheduledFor: toIsoStringSafe(updated.scheduledAt) || toIsoStringSafe(nextMeta.scheduledFor),
      },
    });
  } catch (error) {
    console.error('[social/photos] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to update media details' }, { status: 500 });
  }
}

/**
 * DELETE /api/social/photos?id=<postId>
 * Remove a scheduled or draft media item from the queue.
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const deleteGate = await requireBgosEntitled(user);
    if (!deleteGate.ok) return deleteGate.response;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Media item id is required.' }, { status: 400 });
    }

    const existing = await db.socialPost.findFirst({
      where: { id, tenantId: user.tenantId },
      select: {
        id: true,
        gbpPostType: true,
        gbpOfferData: true,
        publishTargets: true,
        designJson: true,
        linkUrl: true,
        mediaUrls: true,
      },
    });
    if (!existing || !isPhotoMediaRow(existing)) {
      return NextResponse.json({ error: 'Media item not found.' }, { status: 404 });
    }

    await db.socialPost.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, id: existing.id });
  } catch (error) {
    console.error('[social/photos] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete media item' }, { status: 500 });
  }
}
