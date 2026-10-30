import { db } from '@/lib/db';
import { computeGbpAudit } from './audit';

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
export async function computeMarketingScore(tenantId: string): Promise<MarketingScoreResult> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [audit, googleAccount] = await Promise.all([
    computeGbpAudit(tenantId),
    db.socialAccount.findFirst({
      where: { tenantId, platform: 'googlebusiness', isActive: true },
      select: { id: true, accountId: true, accountName: true, metadata: true },
    }),
  ]);

  let activeProfileId = '5008';
  if (googleAccount?.metadata) {
    try {
      const meta = typeof googleAccount.metadata === 'string' ? JSON.parse(googleAccount.metadata) : googleAccount.metadata;
      if (meta?.activeProfileId) activeProfileId = String(meta.activeProfileId);
    } catch {}
  }

  const reviewWhere: Record<string, unknown> = { tenantId };
  if (activeProfileId === '5008') {
    reviewWhere.OR = [
      { googleReviewId: { startsWith: '5008' } },
      { googleReviewId: { startsWith: 'goog_rev_' } },
    ];
  } else {
    reviewWhere.googleReviewId = { startsWith: activeProfileId };
  }

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

  return {
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
  };
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
export async function snapshotMarketingScore(tenantId: string): Promise<{ history: { date: string; score: number }[] }> {
  const result = await computeMarketingScore(tenantId);
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
  } catch (err: any) {
    // Missing table (migration not yet applied on this database) must never
    // break the score API — history simply stays empty.
    if (!isMissingTableError(err)) console.error('[marketing-score] snapshot failed:', err?.message?.slice(0, 200));
  }

  return { history: await readHistory(tenantId) };
}

export async function readHistory(tenantId: string, days = 30): Promise<{ date: string; score: number }[]> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const rows = await db.gbpScoreSnapshot.findMany({
      where: { tenantId, snapshotDate: { gte: since } },
      orderBy: { snapshotDate: 'asc' },
      select: { snapshotDate: true, overallScore: true },
      take: days,
    });
    return rows.map((r) => ({ date: r.snapshotDate.toISOString().slice(0, 10), score: r.overallScore }));
  } catch (err: any) {
    if (!isMissingTableError(err)) console.error('[marketing-score] history read failed:', err?.message?.slice(0, 200));
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
