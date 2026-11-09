import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { resolveGoogleConnectionState } from '@/lib/social/google-connection-state';
import {
  uploadGoogleBusinessMedia,
  listGoogleBusinessMedia,
} from '@/lib/social/adapters/googlebusiness';
import {
  resolveTenantLocale,
  computeLocalScheduledDate,
  parseHourMinute,
} from '@/lib/locale-timezone';

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
  title?: string;
  description?: string;
  tags?: string[];
  category?: GbpMediaCategory;
  mediaFormat?: 'PHOTO' | 'VIDEO';
}

function parseOfferMeta(raw: string | null | undefined): {
  title?: string;
  tags?: string[];
  category?: string;
  mediaFormat?: 'PHOTO' | 'VIDEO';
  altText?: string;
} {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return {
        title: typeof parsed.title === 'string' ? parsed.title : undefined,
        tags: Array.isArray(parsed.tags)
          ? parsed.tags.filter((t: unknown): t is string => typeof t === 'string')
          : undefined,
        category: typeof parsed.category === 'string' ? parsed.category : undefined,
        mediaFormat:
          parsed.mediaFormat === 'VIDEO' || parsed.mediaFormat === 'PHOTO'
            ? parsed.mediaFormat
            : undefined,
        altText: typeof parsed.altText === 'string' ? parsed.altText : undefined,
      };
    }
  } catch {}
  return {};
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
  if (explicit === 'VIDEO' || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) {
    return 'VIDEO';
  }
  return 'PHOTO';
}

function toIsoStringSafe(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val.toISOString();
  }
  if (typeof val === 'string') {
    const s = val.trim();
    if (!s) return null;
    const normalized =
      /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && !s.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(s)
        ? `${s.replace(' ', 'T')}Z`
        : s;
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? s : d.toISOString();
  }
  return null;
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
        livePhotos = (mediaRes.mediaItems || []).map((m, idx) => ({
          id: m.name || `gmedia-${idx}`,
          url: m.googleUrl,
          thumbnailUrl: m.thumbnailUrl || m.googleUrl,
          category: m.category || 'ADDITIONAL',
          createdAt: m.createTime,
          source: 'google' as const,
          mediaFormat: 'PHOTO',
          caption: m.category ? `Google Business Profile · ${m.category}` : undefined,
        }));
      } catch (err: unknown) {
        console.warn('[social/photos] Google media list warning:', err instanceof Error ? err.message : err);
      }
    }

    // Fetch queued/draft/failed photo media posts
    const scheduledPosts = await db.socialPost.findMany({
      where: {
        tenantId: user.tenantId,
        status: { in: ['scheduled', 'publishing', 'draft', 'failed'] },
        gbpPostType: 'photo_media',
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'desc' }],
      take: 80,
      select: {
        id: true,
        mediaUrls: true,
        scheduledAt: true,
        createdAt: true,
        content: true,
        status: true,
        gbpOfferData: true,
        failureReason: true,
      },
    });

    const queuedPhotos = scheduledPosts
      .flatMap((p) => {
        try {
          const urls = parseMediaUrls(p.mediaUrls);
          if (!urls.length) return [];
          const meta = parseOfferMeta(p.gbpOfferData);
          const scheduledForIso = toIsoStringSafe(p.scheduledAt);
          const createdAtIso = toIsoStringSafe(p.createdAt);
          return urls
            .map((u: string, idx: number) => ({
              id: urls.length === 1 ? p.id : `${p.id}-${idx}`,
              postId: p.id,
              url: u,
              thumbnailUrl: u,
              title: meta.title || undefined,
              tags: meta.tags || [],
              category: meta.category || 'SCHEDULED',
              gbpCategory: meta.category || 'ADDITIONAL',
              mediaFormat: meta.mediaFormat || inferMediaFormat(u),
              createdAt: scheduledForIso || createdAtIso || new Date().toISOString(),
              scheduledFor: scheduledForIso,
              source: 'queue' as const,
              status: p.status,
              caption: p.content,
              description: p.content,
              failureReason: p.failureReason || undefined,
            }));
        } catch (err: unknown) {
          console.warn('[social/photos] Failed to normalize queued photo post:', p.id, err instanceof Error ? err.message : err);
          return [];
        }
      })
      .filter(Boolean);

    return NextResponse.json({
      photos: [...livePhotos, ...queuedPhotos],
      liveCount: livePhotos.length,
      queuedCount: queuedPhotos.length,
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

    const body = await request.json().catch(() => ({}));
    const rawItems: PhotoInputItem[] = Array.isArray(body.items)
      ? body.items.filter((it: any) => it && typeof it.url === 'string' && it.url.trim())
      : [];

    const fallbackUrls: string[] = Array.isArray(body.photos)
      ? body.photos.filter((u: unknown): u is string => typeof u === 'string' && u.trim().length > 0)
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

    const items: PhotoInputItem[] =
      rawItems.length > 0
        ? rawItems.map((it) => ({
            url: it.url.trim(),
            title: (typeof it.title === 'string' ? it.title.trim() : '') || sharedTitle,
            description:
              (typeof it.description === 'string' ? it.description.trim() : '') || sharedDescription,
            tags: normalizeTags(it.tags).length > 0 ? normalizeTags(it.tags) : sharedTags,
            category: (it.category || sharedCategory) as GbpMediaCategory,
            mediaFormat: inferMediaFormat(it.url, it.mediaFormat),
          }))
        : fallbackUrls.map((url) => ({
            url,
            title: sharedTitle,
            description: sharedDescription,
            tags: sharedTags,
            category: sharedCategory,
            mediaFormat: inferMediaFormat(url),
          }));

    if (!items.length) {
      return NextResponse.json({ error: 'No photos or videos provided for upload.' }, { status: 400 });
    }

    const scheduleMode: 'instant' | 'daily' | 'weekly' | 'staggered' | 'draft' =
      body.scheduleMode || 'instant';

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, country: true, settingsJson: true },
    });
    const businessName = tenant?.name || 'our business';
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
      status: string;
      scheduledAt?: string;
      title?: string;
      tags?: string[];
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
              mediaType: 'image/jpeg',
              size: 0,
              uploadedBy: user.id || 'system',
            },
          });
        }
      } catch {}
    }

    if (scheduleMode === 'instant') {
      for (const item of items) {
        const effectiveDescription = buildDescriptionWithKeywords(
          item.description || `Recent work and services at ${businessName}`,
          item.title,
          item.tags,
        );
        const mediaMetaJson = JSON.stringify({
          title: item.title || `${businessName} Showcase`,
          tags: item.tags || [],
          category: item.category || 'ADDITIONAL',
          mediaFormat: item.mediaFormat || 'PHOTO',
        });

        if (googleAccount) {
          try {
            const uploaded = await uploadGoogleBusinessMedia(googleAccount, {
              sourceUrl: item.url,
              mediaFormat: item.mediaFormat || 'PHOTO',
              category: item.category || 'ADDITIONAL',
              description: effectiveDescription,
            });
            uploadedPhotos.push({
              url: uploaded.googleUrl,
              status: 'published',
              title: item.title,
              tags: item.tags,
            });
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn('[social/photos] Google media upload warning:', msg);
            // Persist in Not Posted queue with failure reason so user never loses media or metadata
            const savedDraft = await db.socialPost.create({
              data: {
                tenantId: user.tenantId,
                status: 'draft',
                content: effectiveDescription,
                mediaUrls: JSON.stringify([item.url]),
                publishTargets: JSON.stringify([
                  { platform: 'googlebusiness', socialAccountId: googleAccount.id, status: 'pending', error: msg },
                ]),
                scheduledAt: null,
                gbpPostType: 'photo_media',
                gbpOfferData: mediaMetaJson,
                failureReason: msg.slice(0, 500),
                createdById: user.id || 'system',
              },
            });
            uploadedPhotos.push({
              id: savedDraft.id,
              url: item.url,
              status: `saved_locally: ${msg}`,
              title: item.title,
              tags: item.tags,
            });
          }
        } else {
          const savedDraft = await db.socialPost.create({
            data: {
              tenantId: user.tenantId,
              status: 'draft',
              content: effectiveDescription,
              mediaUrls: JSON.stringify([item.url]),
              publishTargets: JSON.stringify([]),
              scheduledAt: null,
              gbpPostType: 'photo_media',
              gbpOfferData: mediaMetaJson,
              createdById: user.id || 'system',
            },
          });
          uploadedPhotos.push({
            id: savedDraft.id,
            url: item.url,
            status: 'saved_locally (Google account not connected)',
            title: item.title,
            tags: item.tags,
          });
        }
      }
    } else if (scheduleMode === 'draft') {
      for (const item of items) {
        const effectiveDescription = buildDescriptionWithKeywords(
          item.description || `Quality craftsmanship and customer satisfaction at ${businessName}.`,
          item.title,
          item.tags,
        );
        const created = await db.socialPost.create({
          data: {
            tenantId: user.tenantId,
            status: 'draft',
            content: effectiveDescription,
            mediaUrls: JSON.stringify([item.url]),
            publishTargets: JSON.stringify(
              googleAccount
                ? [{ platform: 'googlebusiness', socialAccountId: googleAccount.id, status: 'pending' }]
                : [],
            ),
            scheduledAt: null,
            gbpPostType: 'photo_media',
            gbpOfferData: JSON.stringify({
              title: item.title || `${businessName} Media`,
              tags: item.tags || [],
              category: item.category || 'ADDITIONAL',
              mediaFormat: item.mediaFormat || 'PHOTO',
            }),
            createdById: user.id || 'system',
          },
        });
        uploadedPhotos.push({
          id: created.id,
          url: item.url,
          status: 'draft',
          title: item.title,
          tags: item.tags,
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

        const publishTargets = googleAccount
          ? [
              {
                platform: 'googlebusiness',
                socialAccountId: googleAccount.id,
                status: 'pending',
              },
            ]
          : [];

        const created = await db.socialPost.create({
          data: {
            tenantId: user.tenantId,
            status: 'scheduled',
            content: caption,
            mediaUrls: JSON.stringify([item.url]),
            publishTargets: JSON.stringify(publishTargets),
            scheduledAt: scheduledTime,
            gbpPostType: 'photo_media',
            gbpOfferData: JSON.stringify({
              title: item.title || `${businessName} Showcase`,
              tags: item.tags || [],
              category: item.category || 'ADDITIONAL',
              mediaFormat: item.mediaFormat || 'PHOTO',
              timeZone: locale.timeZone,
              country: locale.country,
            }),
            createdById: user.id || 'system',
          },
        });

        uploadedPhotos.push({
          id: created.id,
          url: item.url,
          status: 'scheduled',
          scheduledAt: scheduledTime.toISOString(),
          title: item.title,
          tags: item.tags,
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
              : `Published ${publishedCount} media item(s) to Google Business Profile.`
            : `Scheduled ${uploadedPhotos.length} media item(s) (${scheduleMode} at ${String(preferredHour).padStart(2, '0')}:${String(preferredMinute).padStart(2, '0')} ${locale.timeZone}).`,
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
        gbpPostType: 'photo_media',
      },
      select: {
        id: true,
        content: true,
        status: true,
        scheduledAt: true,
        gbpOfferData: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Scheduled media item not found.' }, { status: 404 });
    }

    const meta = parseOfferMeta(existing.gbpOfferData);
    const nextMeta = {
      ...meta,
      ...(typeof body.title === 'string' ? { title: body.title.trim() } : {}),
      ...(body.tags !== undefined ? { tags: normalizeTags(body.tags) } : {}),
      ...(typeof body.category === 'string' ? { category: body.category.trim().toUpperCase() } : {}),
    };

    const updateData: Record<string, any> = {
      gbpOfferData: JSON.stringify(nextMeta),
    };

    if (typeof body.description === 'string') {
      updateData.content = body.description.trim() || existing.content;
    }

    if (body.scheduledAt !== undefined) {
      if (body.scheduledAt === null || body.scheduledAt === '') {
        updateData.scheduledAt = null;
        if (existing.status === 'scheduled') updateData.status = 'draft';
      } else {
        const dt = new Date(body.scheduledAt);
        if (isNaN(dt.getTime())) {
          return NextResponse.json({ error: 'Invalid schedule date.' }, { status: 400 });
        }
        updateData.scheduledAt = dt;
        updateData.status = 'scheduled';
      }
    }

    if (body.status === 'draft' || body.status === 'scheduled') {
      updateData.status = body.status;
      if (body.status === 'scheduled' && !updateData.scheduledAt && !existing.scheduledAt) {
        updateData.scheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      }
    }

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
        scheduledFor: toIsoStringSafe(updated.scheduledAt),
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id')?.trim();
    if (!id) {
      return NextResponse.json({ error: 'Media item id is required.' }, { status: 400 });
    }

    const existing = await db.socialPost.findFirst({
      where: { id, tenantId: user.tenantId, gbpPostType: 'photo_media' },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Media item not found.' }, { status: 404 });
    }

    await db.socialPost.delete({ where: { id: existing.id } });
    return NextResponse.json({ success: true, id: existing.id });
  } catch (error) {
    console.error('[social/photos] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete media item' }, { status: 500 });
  }
}
