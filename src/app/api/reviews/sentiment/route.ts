import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { callAI } from '@/lib/ai-client';

export const dynamic = 'force-dynamic';

interface CategoryStats {
  id: string;
  label: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  score: number; // 0 - 100
  keywords: string[];
}

const TOPICS: Record<string, { label: string; positiveWords: string[]; negativeWords: string[] }> = {
  speed: {
    label: 'Speed & Punctuality',
    positiveWords: ['fast', 'quick', 'on time', 'prompt', 'speedy', 'timely', 'urgent', 'rapid'],
    negativeWords: ['slow', 'delay', 'delayed', 'late', 'waited', 'waiting', 'took too long'],
  },
  quality: {
    label: 'Quality & Craftsmanship',
    positiveWords: ['clean', 'perfect', 'excellent', 'great quality', 'durable', 'solid', 'neat', 'best', 'flawless', 'superb'],
    negativeWords: ['broken', 'defect', 'damaged', 'poor quality', 'rough', 'bad finish', 'subpar'],
  },
  pricing: {
    label: 'Pricing & Value',
    positiveWords: ['fair', 'reasonable', 'affordable', 'great price', 'good value', 'worth it', 'economical'],
    negativeWords: ['expensive', 'overpriced', 'high price', 'hidden fee', 'costly', 'rip off'],
  },
  staff: {
    label: 'Staff & Communication',
    positiveWords: ['polite', 'helpful', 'professional', 'responsive', 'cooperative', 'kind', 'friendly', 'courteous'],
    negativeWords: ['rude', 'unprofessional', 'arrogant', 'unresponsive', 'ignored', 'bad behavior'],
  },
};

/**
 * GET /api/reviews/sentiment
 * Analyzes customer review sentiment categorizing by speed, quality, pricing, and staff.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true },
    });
    const businessName = tenant?.name || 'our business';

    const reviews = await db.review.findMany({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        authorName: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });

    const totalReviews = reviews.length;
    if (totalReviews === 0) {
      return NextResponse.json({
        totalAnalyzed: 0,
        overallScore: 100,
        categories: Object.entries(TOPICS).map(([id, t]) => ({
          id,
          label: t.label,
          total: 0,
          positive: 0,
          negative: 0,
          neutral: 0,
          score: 100,
          keywords: [],
        })),
        aiInsight: 'No reviews found yet. Display your Google Review QR standee to start collecting authentic feedback.',
        highlights: [],
      });
    }

    const categories: Record<string, CategoryStats> = {};
    for (const [id, topic] of Object.entries(TOPICS)) {
      categories[id] = {
        id,
        label: topic.label,
        total: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        score: 100,
        keywords: [],
      };
    }

    let positiveReviewsCount = 0;
    let negativeReviewsCount = 0;

    for (const rev of reviews) {
      const text = (rev.comment || '').toLowerCase();
      const rating = rev.rating || 5;

      if (rating >= 4) positiveReviewsCount++;
      else if (rating <= 2) negativeReviewsCount++;

      for (const [id, topic] of Object.entries(TOPICS)) {
        const hasPos = topic.positiveWords.some((w) => text.includes(w));
        const hasNeg = topic.negativeWords.some((w) => text.includes(w));

        if (hasPos || hasNeg || (rating === 5 && id === 'quality')) {
          categories[id].total++;
          if (hasNeg || rating <= 2) {
            categories[id].negative++;
          } else if (hasPos || rating >= 4) {
            categories[id].positive++;
          } else {
            categories[id].neutral++;
          }
        }
      }
    }

    // Compute score per category
    const categoryList: CategoryStats[] = Object.values(categories).map((c) => {
      const total = c.total || 1;
      const score = Math.round((c.positive / total) * 100);
      return {
        ...c,
        score: c.total === 0 ? 100 : score,
      };
    });

    const overallScore = Math.round(
      (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / (totalReviews * 5)) * 100,
    );

    // Generate brief AI sentiment summary
    let aiInsight = `Overall reputation is solid at ${overallScore}%. Customer satisfaction is high across service quality and staff responsiveness.`;
    try {
      const reviewSnippets = reviews
        .slice(0, 5)
        .map((r) => `[${r.rating}★]: "${r.comment || 'No text'}"`)
        .join('\n');

      const aiRes = await callAI([
        { role: 'system', content: 'You are an executive reputation analyst.' },
        {
          role: 'user',
          content: `Here are recent customer reviews for "${businessName}":\n${reviewSnippets}\nWrite a 2-sentence actionable insight summary for the owner highlighting what customers love most and one opportunity for growth.`,
        },
      ]);
      const content = typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '';
      if (content.trim()) aiInsight = content.trim();
    } catch {}

    return NextResponse.json({
      totalAnalyzed: totalReviews,
      overallScore,
      categories: categoryList,
      aiInsight,
      highlights: reviews.slice(0, 3).map((r) => ({
        id: r.id,
        author: r.authorName || 'Google User',
        rating: r.rating || 5,
        text: r.comment || 'Positive review',
      })),
    });
  } catch (error: unknown) {
    console.error('[reviews/sentiment] GET failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze review sentiment' },
      { status: 500 },
    );
  }
}
