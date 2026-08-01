import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { toISO } from '@/lib/date-utils';

/**
 * GET /api/omnichannel/conversations/[id]/customer-context
 *
 * Returns customer context for the omnichannel right-side profile panel:
 *   - stats: { reviews, jobs, contacts }
 *   - reviews: latest 3 published reviews (→ "Survey Results" accordion)
 *   - jobs: latest 5 jobs matching the customer's phone (→ "Case History" accordion)
 *
 * Matches the reference omnichannel design where the contact profile shows
 * a stats grid (Tweets/Followers/Following → Reviews/Jobs/Contacts) plus
 * collapsible "Survey Results" and "Case History" sections.
 *
 * All lookups are scoped to the conversation's tenant + customer phone so
 * we never leak cross-tenant data. Returns empty arrays / zero counts on
 * any error — the panel renders gracefully without crashing.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Fetch the conversation to get the customer's phone + tenant.
    //
    // BUG FIX: previously this selected `customerEmail: true` directly from
    // the Conversation table, but Conversation has no such column (the schema
    // only has customerPhone, customerName, customerWhatsappId). Every call
    // to this route 400'd with "column Conversation.customerEmail does not
    // exist" (14 logged errors). The email now comes from the related
    // Customer record via `include`.
    const conv = await db.conversation.findUnique({
      where: { id },
      select: {
        id: true,
        customerName: true,
        customerPhone: true,
        customerId: true,
        tenantId: true,
        leadId: true,
      },
      include: {
        customer: { select: { email: true } },
      },
    });

    if (!conv) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const phone = conv.customerPhone;
    const email = conv.customer?.email ?? null;
    const tenantId = conv.tenantId;

    // ── Build parallel queries for stats + recent items ──
    // All queries are defensive — if a table/column is missing in the current
    // DB schema, the catch returns empty/zero so the panel never crashes.

    const reviewsPromise = (async () => {
      try {
        return await db.review.findMany({
          where: {
            tenantId,
            status: 'published',
            rating: { gte: 1 },
            ...(phone ? { customer: { phone } } : {}),
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
          select: {
            id: true,
            rating: true,
            comment: true,
            authorName: true,
            source: true,
            createdAt: true,
            responseJson: true,
          },
        });
      } catch {
        // Fallback: query without the customer join (older schemas may not
        // have the Customer relation set up on Review).
        try {
          return await db.review.findMany({
            where: { tenantId, status: 'published', rating: { gte: 1 } },
            orderBy: { createdAt: 'desc' },
            take: 3,
            select: {
              id: true,
              rating: true,
              comment: true,
              authorName: true,
              source: true,
              createdAt: true,
              responseJson: true,
            },
          });
        } catch {
          return [];
        }
      }
    })();

    const jobsPromise = (async () => {
      try {
        if (!phone) return [];
        return await db.job.findMany({
          where: { tenantId, customerPhone: phone },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            scheduledAt: true,
            quotedAmount: true,
            jobNumber: true,
            createdAt: true,
          },
        });
      } catch {
        return [];
      }
    })();

    const contactsPromise = (async () => {
      try {
        // Count Customer records matching phone or email.
        const where: { tenantId?: string; OR?: Array<Record<string, unknown>> } = { tenantId };
        const orClauses: Array<Record<string, unknown>> = [];
        if (phone) orClauses.push({ phone });
        if (email) orClauses.push({ email });
        if (orClauses.length > 0) {
          where.OR = orClauses;
          return await db.customer.count({ where });
        }
        return 0;
      } catch {
        return 0;
      }
    })();

    const reviewsCountPromise = (async () => {
      try {
        return await db.review.count({
          where: { tenantId, status: 'published', rating: { gte: 1 } },
        });
      } catch {
        return 0;
      }
    })();

    const jobsCountPromise = (async () => {
      try {
        if (!phone) return 0;
        return await db.job.count({
          where: { tenantId, customerPhone: phone },
        });
      } catch {
        return 0;
      }
    })();

    const [reviews, jobs, contactsCount, reviewsCount, jobsCount] = await Promise.all([
      reviewsPromise,
      jobsPromise,
      contactsPromise,
      reviewsCountPromise,
      jobsCountPromise,
    ]);

    return NextResponse.json({
      stats: {
        reviews: reviewsCount,
        jobs: jobsCount,
        contacts: contactsCount,
      },
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        authorName: r.authorName,
        source: r.source,
        createdAt: toISO(r.createdAt as Date | string),
        responseJson: r.responseJson,
      })),
      jobs: jobs.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        priority: j.priority,
        scheduledAt: toISO(j.scheduledAt as Date | string | null),
        quotedAmount: j.quotedAmount,
        jobNumber: j.jobNumber,
        createdAt: toISO(j.createdAt as Date | string),
      })),
    });
  } catch (error) {
    console.error('[omnichannel/customer-context] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
