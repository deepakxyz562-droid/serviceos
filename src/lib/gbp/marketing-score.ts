import { db } from '@/lib/db';
import { toIsoStringSafe } from '@/lib/safe-date';
import { computeGbpAudit } from './audit';
import { googleReviewScope } from '@/lib/social/google-review-scope';

export interface MarketingScoreComponents {
  profileCompleteness: number;
  engagementScore: number;
  responsivenessScore: number;
  postingCadenceScore: number;
}

export interface MarketingScoreResult {
  isConnected: boolean;
  score: number | null;
  label: string | null; // "Poor" | "Average" | "Good" | "Great"
  components: MarketingScoreComponents;
  reviewRating: number | null;
  reviewCount: number;
  reviewReplyRate: number;
  postsLast30Days: number;
  photosLast30Days: number;
  computedAt: string;
  presenceMode?: 'no_website' | 'bgos_hosted' | 'custom_domain';
  websiteSeoScore?: number | null;
}

function clamp0to100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bandLabel(score: number): string {
  if (score >= 75) return 'Great';
  if (score >= 50) return 'Good';
  if (score >= 25) return 'Average';
  return 'Poor';
}

/**
 * Composite Marketing Score (0-100), Dhanda-AI style speedometer.
 *
 * Weights:
 *   - Profile completeness (from the GBP audit checks)        → 40%
 *   - Review responsiveness (reply rate over all reviews)     → 20%
 *   - Posting cadence (posts + photos in the last 30 days)    → 20%
 *   - Engagement momentum (live GBP telemetry when available) → 20%
 *
 * When Google Business is not connected the score is `null` — the UI must
 * render the honest "Not available / NOT_CONNECTED" state.
 */
const SCORE_CACHE = new Map<string, { data: MarketingScoreResult; expires: number }>();
let scoreSnapshotTableAvailable: boolean | null = null;

export async function computeMarketingScore(tenantId: string, bypassCache = false): Promise<MarketingScoreResult> {
  const now = Date.now();
  if (!bypassCache) {
    const cached = SCORE_CACHE.get(tenantId);
    if (cached && cached.expires > now) {
      return cached.data;
    }
  }

  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const { prepareGoogleAccount } = await import('@/lib/social/google-account-helper');
  const [audit, googleAccount] = await Promise.all([
    computeGbpAudit(tenantId),
    prepareGoogleAccount(tenantId),
  ]);

  const reviewScope = await googleReviewScope(tenantId);
  const reviewWhere = {
    tenantId,
    ...reviewScope,
  };

  const [reviewStats, posts30d, photos30d] = await Promise.all([
    db.review.aggregate({
      where: reviewWhere,
      _count: { _all: true },
      _avg: { rating: true },
    }),
    db.socialPost.count({ where: { tenantId, createdAt: { gte: since30d } } }),
    db.socialPost.count({ where: { tenantId, createdAt: { gte: since30d }, mediaUrls: { not: '[]' } } }),
  ]);

  const reviewCount = reviewStats._count?._all ?? 0;
  const reviewRating = reviewStats._avg?.rating != null ? Math.round(reviewStats._avg.rating * 10) / 10 : null;

  // Reply responsiveness: how many reviews have a non-empty owner reply.
  let repliedCount = 0;
  if (reviewCount > 0) {
    const reviews = await db.review.findMany({
      where: reviewWhere,
      select: { responseJson: true },
      take: 500,
    });
    repliedCount = reviews.filter((r) => {
      try {
        const parsed = typeof r.responseJson === 'string' ? JSON.parse(r.responseJson || '{}') : r.responseJson;
        return Boolean(parsed?.text || parsed?.replyText);
      } catch {
        return false;
      }
    }).length;
  }
  const reviewReplyRate = reviewCount > 0 ? repliedCount / reviewCount : 0;
  const responsivenessScore = clamp0to100(reviewReplyRate * 100);

  // Posting cadence: 8 posts + 8 photo posts per month ≈ full marks.
  const cadence = (posts30d / 8) * 0.6 + (photos30d / 8) * 0.4;
  const postingCadenceScore = clamp0to100(cadence * 100);

  // Engagement momentum from live GBP telemetry when the API is available.
  let engagementScore = 0;
  try {
    const { fetchGoogleBusinessPerformanceMetrics } = await import('@/lib/social/adapters/googlebusiness');
    const accountId = googleAccount?.accountId || '';
    const metadata = typeof googleAccount?.metadata === 'string' ? JSON.parse(googleAccount.metadata || '{}') : googleAccount?.metadata || {};
    const placeId = metadata?.placeId || '';
    if (googleAccount && accountId) {
      const perf = await fetchGoogleBusinessPerformanceMetrics(googleAccount as any);
      const total =
        (perf?.searchImpressions || 0) +
        (perf?.mapsImpressions || 0) +
        (perf?.callClicks || 0) * 5 +
        (perf?.directionRequests || 0) * 5 +
        (perf?.websiteClicks || 0) * 3;
      // 150+ weighted monthly interactions ≈ full engagement marks.
      engagementScore = clamp0to100((total / 150) * 100);
    }
  } catch {
    // Telemetry unavailable (API not approved / offline) — engagement stays 0
    // and the remaining components still produce an honest score.
    engagementScore = 0;
  }

  const isConnected = Boolean(googleAccount);
  const profileCompleteness = clamp0to100(audit.score);

  const score = isConnected
    ? clamp0to100(
        profileCompleteness * 0.4 + responsivenessScore * 0.2 + postingCadenceScore * 0.2 + engagementScore * 0.2
      )
    : null;

  const finalResult: MarketingScoreResult = {
    isConnected,
    score,
    label: score != null ? bandLabel(score) : null,
    components: {
      profileCompleteness,
      engagementScore,
      responsivenessScore,
      postingCadenceScore,
    },
    reviewRating,
    reviewCount,
    reviewReplyRate,
    postsLast30Days: posts30d,
    photosLast30Days: photos30d,
    computedAt: new Date().toISOString(),
    presenceMode: audit.presenceMode,
    websiteSeoScore: audit.websiteSeoScore ?? null,
  };

  SCORE_CACHE.set(tenantId, { data: finalResult, expires: Date.now() + 5 * 60 * 1000 });
  return finalResult;
}

function dayBucket(d: Date): Date {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

/**
 * Upsert today's GbpScoreSnapshot (one row per tenant per day) and return the
 * trailing history used by the swipeable score carousel / growth chart.
 */
export async function snapshotMarketingScore(
  tenantId: string,
  existingResult?: MarketingScoreResult
): Promise<{ history: { date: string; score: number }[] }> {
  if (scoreSnapshotTableAvailable === false) {
    return { history: [] };
  }

  const result = existingResult || (await computeMarketingScore(tenantId));
  if (!result.isConnected || result.score == null) {
    return { history: await readHistory(tenantId) };
  }

  const snapshotDate = dayBucket(new Date());
  try {
    const existing = await db.gbpScoreSnapshot.findFirst({
      where: { tenantId, snapshotDate },
      select: { id: true },
    });
    if (existing) {
      await db.gbpScoreSnapshot.update({
        where: { id: existing.id },
        data: {
          overallScore: result.score,
          label: result.label || 'Poor',
          profileCompleteness: result.components.profileCompleteness,
          engagementScore: result.components.engagementScore,
          responsivenessScore: result.components.responsivenessScore,
          postingCadenceScore: result.components.postingCadenceScore,
          reviewRating: result.reviewRating,
          reviewCount: result.reviewCount,
        },
      });
    } else {
      await db.gbpScoreSnapshot.create({
        data: {
          tenantId,
          snapshotDate,
          overallScore: result.score,
          label: result.label || 'Poor',
          profileCompleteness: result.components.profileCompleteness,
          engagementScore: result.components.engagementScore,
          responsivenessScore: result.components.responsivenessScore,
          postingCadenceScore: result.components.postingCadenceScore,
          reviewRating: result.reviewRating,
          reviewCount: result.reviewCount,
        },
      });
    }
    scoreSnapshotTableAvailable = true;
  } catch (err: any) {
    if (isMissingTableError(err)) {
      scoreSnapshotTableAvailable = false;
    } else {
      console.error('[marketing-score] snapshot failed:', err?.message?.slice(0, 200));
    }
  }

  return { history: await readHistory(tenantId) };
}

export async function readHistory(tenantId: string, days = 30): Promise<{ date: string; score: number }[]> {
  if (scoreSnapshotTableAvailable === false) {
    return [];
  }
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.gbpScoreSnapshot.findMany({
      where: { tenantId, snapshotDate: { gte: since } },
      orderBy: { snapshotDate: 'asc' },
      select: { snapshotDate: true, overallScore: true },
      take: days,
    });
    scoreSnapshotTableAvailable = true;
    return rows
      .map((r) => {
        const iso = toIsoStringSafe(r.snapshotDate);
        return iso ? { date: iso.slice(0, 10), score: r.overallScore } : null;
      })
      .filter((x): x is { date: string; score: number } => Boolean(x));
  } catch (err: any) {
    if (isMissingTableError(err)) {
      scoreSnapshotTableAvailable = false;
    } else {
      console.error('[marketing-score] history read failed:', err?.message?.slice(0, 200));
    }
    return [];
  }
}

export function isMissingTableError(err: any): boolean {
  const msg = String(err?.message || '');
  return (
    msg.includes('does not exist') ||
    msg.includes('PGRST205') ||
    msg.includes('42P01') ||
    msg.includes('Could not find the table')
  );
}
