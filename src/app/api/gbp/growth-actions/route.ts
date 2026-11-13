import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { computeGbpAudit } from '@/lib/gbp/audit';
import {
  buildAutoOptimizePlan,
  executeAutoOptimize,
  rollbackAutoOptimize,
  type AutoOptimizeStepId,
} from '@/lib/gbp/auto-optimizer';
import { generateLocalizedServiceDescriptions } from '@/lib/gbp/service-optimizer';
import { callAI } from '@/lib/ai-client';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { replyToGoogleBusinessReview } from '@/lib/social/adapters/googlebusiness';

export const dynamic = 'force-dynamic';

interface GrowthAction {
  id: string;
  title: string;
  doneCount: number;
  totalCount: number;
  weeklyTarget: number | null;
  doneThisWeek: number;
  cta: string;
  href: string;
  dismissed: boolean;
  completed: boolean;
}

interface GrowthState {
  dismissed: string[];
  done: string[];
}

function readState(settingsJson: string | null): GrowthState {
  try {
    const parsed = JSON.parse(settingsJson || '{}');
    const s = parsed?.gbpGrowthActions || {};
    return {
      dismissed: Array.isArray(s.dismissed) ? s.dismissed : [],
      done: Array.isArray(s.done) ? s.done : [],
    };
  } catch {
    return { dismissed: [], done: [] };
  }
}

function readMarketingTargets(settingsJson: string | null, industry?: string): {
  weeklyPosts: number;
  weeklyPhotos: number;
  weeklyReviews: number;
} {
  const isIndustrial = (industry || '').toLowerCase().includes('fabrication') ||
                       (industry || '').toLowerCase().includes('engineering') ||
                       (industry || '').toLowerCase().includes('manufacturing');
  const defaultPosts = isIndustrial ? 3 : 5;
  const defaultPhotos = isIndustrial ? 3 : 5;
  const defaultReviews = 5;

  try {
    const parsed = JSON.parse(settingsJson || '{}');
    const targets = parsed?.brandBrain?.marketingTargets || {};
    return {
      weeklyPosts: typeof targets.weeklyPostTarget === 'number' ? targets.weeklyPostTarget : defaultPosts,
      weeklyPhotos: typeof targets.weeklyPhotoTarget === 'number' ? targets.weeklyPhotoTarget : defaultPhotos,
      weeklyReviews: typeof targets.weeklyReviewTarget === 'number' ? targets.weeklyReviewTarget : defaultReviews,
    };
  } catch {
    return {
      weeklyPosts: defaultPosts,
      weeklyPhotos: defaultPhotos,
      weeklyReviews: defaultReviews,
    };
  }
}

/**
 * GET /api/gbp/growth-actions
 * The BGOS 2.0 Segmented Growth Action Engine:
 *   - complete_profile : passed/total GBP audit checks
 *   - upload_media     : photo posts in the last 7 days (target based on industry/settings)
 *   - approve_post     : AI posts pending approval (target based on industry/settings)
 * Returns segmented approval queues:
 *   - segments.reviews : unreplied Google reviews ready for AI review reply approval
 *   - segments.posts   : AI social posts pending approval
 *   - segments.audit   : failed audit checks with recommended fixes
 *   - segments.seo     : 1-click AI SEO fixes & uncovered Search Term service suggestions
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    const tenantId = user.tenantId;

    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [autoPlan, mediaPosts7d, allPosts, allReviews, tenant] = await Promise.all([
      buildAutoOptimizePlan(tenantId, { syncCompetitors: false }).catch(() => null),
      db.socialPost.count({ where: { tenantId, mediaUrls: { not: '[]' }, createdAt: { gte: since7d } } }).catch(() => 0),
      db.socialPost.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }).catch(() => []),
      db.review.findMany({
        where: { tenantId, source: 'google' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }).catch(() => []),
      db.tenant.findUnique({
        where: { id: tenantId },
        select: { settingsJson: true, name: true, industry: true },
      }),
    ]);

    const audit = autoPlan?.audit ?? (await computeGbpAudit(tenantId).catch(() => null));

    const state = readState(tenant?.settingsJson || null);
    const targets = readMarketingTargets(tenant?.settingsJson || null, tenant?.industry || '');

    const checks = audit?.checks || [];
    const passedChecks = checks.filter((c) => c.passed).length;
    const failedChecks = checks.filter((c) => !c.passed);

    // Extract pending posts safely (in-memory to prevent Supabase column-missing errors)
    const pendingPostsList = allPosts.filter(
      (p) => (p as any).approvalStatus === 'pending' || p.status === 'draft',
    );

    // Extract unreplied reviews
    const unrepliedReviews = allReviews.filter((r) => {
      try {
        const parsed = JSON.parse(r.responseJson || '{}');
        return !parsed.text && !parsed.replyText;
      } catch {
        return true;
      }
    });

    const pendingPostsCount = pendingPostsList.length;
    const pendingReviewsCount = unrepliedReviews.length;

    const actions: GrowthAction[] = [
      {
        id: 'complete_profile',
        title: 'Complete your Profile',
        doneCount: passedChecks,
        totalCount: checks.length || 8,
        weeklyTarget: null,
        doneThisWeek: 0,
        cta: 'Auto-Optimize',
        href: '/app?view=gbpAI',
        dismissed: state.dismissed.includes('complete_profile'),
        completed: passedChecks === checks.length && checks.length > 0,
      },
      {
        id: 'upload_media',
        title: 'Upload Media',
        doneCount: mediaPosts7d,
        totalCount: targets.weeklyPhotos,
        weeklyTarget: targets.weeklyPhotos,
        doneThisWeek: mediaPosts7d,
        cta: 'Upload',
        href: '/app?view=socialMedia',
        dismissed: state.dismissed.includes('upload_media'),
        completed: mediaPosts7d >= targets.weeklyPhotos,
      },
      {
        id: 'approve_post',
        title: 'Approve Post',
        doneCount: Math.max(0, targets.weeklyPosts - pendingPostsCount),
        totalCount: targets.weeklyPosts,
        weeklyTarget: targets.weeklyPosts,
        doneThisWeek: Math.max(0, targets.weeklyPosts - pendingPostsCount),
        cta: 'Approve',
        href: '/app?view=socialMedia',
        dismissed: state.dismissed.includes('approve_post'),
        completed: pendingPostsCount === 0,
      },
    ];

    const seoActions = autoPlan?.actions || [];
    const seoPendingFixes = seoActions.filter((a) => !a.alreadyOptimal && a.ready);
    const seoOptimalCount = seoActions.filter((a) => a.alreadyOptimal).length;
    const uncoveredSearchTerms = autoPlan?.uncoveredSearchTerms || [];
    const seoPendingCount = seoPendingFixes.length + uncoveredSearchTerms.length;

    // Specific audit flags for individual high-impact checks
    const hasPhone = checks.find((c) => c.id === 'phone_number')?.passed ?? true;
    const hasWebsite = checks.find((c) => c.id === 'website_url')?.passed ?? true;
    const hasHours = checks.find((c) => c.id === 'business_hours')?.passed ?? true;
    const hasBooking = checks.find((c) => c.id === 'booking_link')?.passed ?? true;
    const hasDesc = checks.find((c) => c.id === 'optimized_description')?.passed ?? true;
    const hasCategories = checks.find((c) => c.id === 'secondary_categories')?.passed ?? true;
    const hasServices = checks.find((c) => c.id === 'services_catalog')?.passed ?? true;

    // Build the prioritized 10 Growth Actions matching the BGOS Growth Autopilot Spec:
    // Priority Score formula: (Impact * Confidence) / Effort
    interface AutopilotGrowthActionItem {
      id: string;
      category: 'P0_foundation' | 'P0_trust' | 'P1_content' | 'P1_seo' | 'P1_conversion';
      priorityLevel: 'P0' | 'P1' | 'P2';
      priorityScore: number;
      impact: number;
      confidence: number;
      effort: number;
      title: string;
      finding: string;
      evidence: string;
      status: 'ready_for_review' | 'awaiting_approval' | 'waiting_for_owner' | 'action_required' | 'completed';
      executionMode: 'automatic_monitoring' | 'automatic_preparation' | 'authorized_execution';
      phase: 'foundation' | 'trust' | 'visibility' | 'conversions';
      phaseDays: string;
      cta: string;
      actionType: 'add_phone' | 'add_website' | 'set_hours' | 'approve_reviews' | 'approve_posts' | 'auto_optimize_seo' | 'upload_photos' | 'enable_booking' | 'add_services';
      readyCount?: number;
    }

    const autopilotActions: AutopilotGrowthActionItem[] = [];

    // 1. Primary Phone Number
    if (!hasPhone) {
      autopilotActions.push({
        id: 'add_phone',
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: (5 * 5) / 1, // 25
        impact: 5,
        confidence: 5,
        effort: 1,
        title: 'Add Primary Phone Number',
        finding: 'No primary business phone number linked to your profile.',
        evidence: '60% of Google Maps mobile searchers call businesses directly before visiting.',
        status: 'action_required',
        executionMode: 'authorized_execution',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: 'Add Phone Number',
        actionType: 'add_phone',
      });
    }

    // 2. Primary Website URL
    if (!hasWebsite) {
      autopilotActions.push({
        id: 'add_website',
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: (5 * 5) / 1, // 25
        impact: 5,
        confidence: 5,
        effort: 1,
        title: 'Add Website or Storefront Link',
        finding: 'No website or storefront URL linked to Google Search & Maps.',
        evidence: 'Profiles with a website receive 35% more clicks and capture direct customer inquiries.',
        status: 'action_required',
        executionMode: 'authorized_execution',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: 'Add Website URL',
        actionType: 'add_website',
      });
    }

    // 3. Customer Reviews Management
    if (unrepliedReviews.length > 0) {
      autopilotActions.push({
        id: 'review_management',
        category: 'P0_trust',
        priorityLevel: 'P0',
        priorityScore: (5 * 5) / 1, // 25
        impact: 5,
        confidence: 5,
        effort: 1,
        title: 'Reply to Customer Reviews',
        finding: `${unrepliedReviews.length} personalized review response(s) prepared by AI.`,
        evidence: 'Businesses with 100% review reply rate rank higher in the Google Local 3-Pack.',
        status: 'awaiting_approval',
        executionMode: 'authorized_execution',
        phase: 'trust',
        phaseDays: 'Days 8–30',
        cta: `Approve ${unrepliedReviews.length} AI Repl${unrepliedReviews.length > 1 ? 'ies' : 'y'}`,
        actionType: 'approve_reviews',
        readyCount: unrepliedReviews.length,
      });
    }

    // 4. Business Operating Hours
    if (!hasHours) {
      autopilotActions.push({
        id: 'set_hours',
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: (4 * 5) / 2, // 10
        impact: 4,
        confidence: 5,
        effort: 2,
        title: 'Set Business Operating Hours',
        finding: 'Operating hours are missing or incomplete for your listing.',
        evidence: 'Accurate opening hours prevent customer bounces and get 42% more directions.',
        status: 'action_required',
        executionMode: 'authorized_execution',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: 'Set Hours',
        actionType: 'set_hours',
      });
    }

    // 5. 750-Char Local SEO Description
    if (!hasDesc) {
      autopilotActions.push({
        id: 'business_description',
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: (4 * 4) / 1, // 16
        impact: 4,
        confidence: 4,
        effort: 1,
        title: 'Optimize 750-Char Local SEO Description',
        finding: 'Profile description is short or missing targeted city & service keywords.',
        evidence: 'Google gives up to 750 characters to showcase your local specialties and credibility.',
        status: 'ready_for_review',
        executionMode: 'automatic_preparation',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: 'Review AI Description',
        actionType: 'auto_optimize_seo',
      });
    }

    // 6. Connect Booking / Place Actions Link
    if (!hasBooking) {
      autopilotActions.push({
        id: 'booking_link',
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: (4 * 4) / 1, // 16
        impact: 4,
        confidence: 4,
        effort: 1,
        title: 'Connect Google Maps Booking / Order Link',
        finding: 'Place Action link is inactive on Google Search and Maps.',
        evidence: 'Direct "Order Online" or "Book Appointment" buttons increase visitor conversion by 2.4x.',
        status: 'ready_for_review',
        executionMode: 'authorized_execution',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: 'Enable Booking Link',
        actionType: 'enable_booking',
      });
    }

    // 7. Complete Service Details & Categories
    if (!hasServices || !hasCategories || seoPendingFixes.length > 0) {
      autopilotActions.push({
        id: 'categories_and_services',
        category: 'P0_foundation',
        priorityLevel: 'P0',
        priorityScore: (4 * 5) / 2, // 10
        impact: 4,
        confidence: 5,
        effort: 2,
        title: 'Complete Service Details & Categories',
        finding: `${seoPendingFixes.length || 2} services need 300-500 char localized SEO descriptions.`,
        evidence: 'Detailed service descriptions index your profile for high-intent local searches.',
        status: 'ready_for_review',
        executionMode: 'automatic_preparation',
        phase: 'foundation',
        phaseDays: 'Days 1–7',
        cta: 'Apply 1-Click AI Fix',
        actionType: 'add_services',
      });
    }

    // 8. Google Posts Publishing & Scheduling
    autopilotActions.push({
      id: 'google_posts',
      category: 'P1_content',
      priorityLevel: 'P1',
      priorityScore: (3 * 4) / 2, // 6
      impact: 3,
      confidence: 4,
      effort: 2,
      title: pendingPostsCount > 0 ? `Approve ${pendingPostsCount} Drafted Google Post(s)` : 'Publish Weekly Google Updates & Offers',
      finding: pendingPostsCount > 0
        ? `${pendingPostsCount} AI post(s) drafted and awaiting your approval.`
        : 'Keep your profile fresh with a weekly Google update, offer, or event.',
      evidence: 'Regular posts show Google your business is active and engaged with local searchers.',
      status: pendingPostsCount > 0 ? 'awaiting_approval' : 'ready_for_review',
      executionMode: 'authorized_execution',
      phase: 'trust',
      phaseDays: 'Days 8–30',
      cta: pendingPostsCount > 0 ? `Approve ${pendingPostsCount} Posts` : 'Draft AI Post',
      actionType: 'approve_posts',
      readyCount: pendingPostsCount,
    });

    // 9. Authentic Work & Storefront Photos
    autopilotActions.push({
      id: 'photo_optimization',
      category: 'P1_content',
      priorityLevel: 'P1',
      priorityScore: (4 * 4) / 3, // 5.3
      impact: 4,
      confidence: 4,
      effort: 3,
      title: 'Add Authentic Business Photos',
      finding: `Upload recent work, storefront, or interior photos (${mediaPosts7d}/${targets.weeklyPhotos} uploaded this week).`,
      evidence: 'Real photos evaluate your services for customers. Google rejects stock or synthetic images.',
      status: mediaPosts7d >= targets.weeklyPhotos ? 'completed' : 'waiting_for_owner',
      executionMode: 'authorized_execution',
      phase: 'trust',
      phaseDays: 'Days 8–30',
      cta: 'Upload Real Photos',
      actionType: 'upload_photos',
    });

    // 10. Local Search Demand Keywords
    autopilotActions.push({
      id: 'local_keywords',
      category: 'P1_seo',
      priorityLevel: 'P1',
      priorityScore: (4 * 4) / 2, // 8
      impact: 4,
      confidence: 4,
      effort: 2,
      title: 'Target Local Search Demand Queries',
      finding: uncoveredSearchTerms.length > 0
        ? `${uncoveredSearchTerms.length} nearby search queries detected without dedicated services.`
        : 'Discover queries nearby customers use to find businesses like yours.',
      evidence: 'Matching your services to real search queries captures nearby high-intent searches.',
      status: uncoveredSearchTerms.length > 0 ? 'ready_for_review' : 'completed',
      executionMode: 'automatic_preparation',
      phase: 'visibility',
      phaseDays: 'Days 31–60',
      cta: 'Optimize Keywords',
      actionType: 'add_services',
    });

    // Sort by priorityScore descending
    autopilotActions.sort((a, b) => b.priorityScore - a.priorityScore);

    const pendingApprovalsCount = autopilotActions.filter(
      (a) => a.status === 'awaiting_approval' || a.status === 'ready_for_review'
    ).length;

    const readinessScore = audit?.score ?? 78;

    const roadmapPhases = [
      {
        phase: 1,
        title: 'Days 1–7: Fix the Foundation',
        objective: 'Verification, primary category, contact information, hours, website, and booking link.',
        status: (hasPhone && hasWebsite && hasHours && hasBooking) ? 'completed' : 'in_progress',
        itemsCount: 5,
        completedCount: [hasPhone, hasWebsite, hasHours, hasBooking, hasCategories].filter(Boolean).length,
      },
      {
        phase: 2,
        title: 'Days 8–30: Improve Customer Trust',
        objective: 'Review replies, authentic real photos, and weekly Google Posts publishing schedule.',
        status: (unrepliedReviews.length === 0 && mediaPosts7d >= targets.weeklyPhotos) ? 'completed' : 'in_progress',
        itemsCount: 3,
        completedCount: (unrepliedReviews.length === 0 ? 1 : 0) + (mediaPosts7d >= targets.weeklyPhotos ? 1 : 0) + (pendingPostsCount === 0 ? 1 : 0),
      },
      {
        phase: 3,
        title: 'Days 31–60: Expand Visibility',
        objective: 'Discover keyword search demand, localized 300-char service descriptions, and local SEO.',
        status: (hasServices && uncoveredSearchTerms.length === 0) ? 'completed' : 'in_progress',
        itemsCount: 4,
        completedCount: hasServices ? 2 : 1,
      },
      {
        phase: 4,
        title: 'Days 61–90: Improve Conversions',
        objective: 'Measure calls, direction requests, website clicks, and booking pathways.',
        status: 'in_progress',
        itemsCount: 3,
        completedCount: 2,
      },
    ];

    const weeklyTotalTarget = targets.weeklyPosts + targets.weeklyPhotos + (targets.weeklyReviews || 4);
    const weeklyTotalDone = Math.min(
      weeklyTotalTarget,
      Math.min(mediaPosts7d, targets.weeklyPhotos) +
      Math.max(0, targets.weeklyPosts - pendingPostsCount) +
      Math.max(0, (targets.weeklyReviews || 4) - pendingReviewsCount)
    );
    const totalTarget = weeklyTotalTarget + seoActions.length;
    const totalDone = Math.min(totalTarget, weeklyTotalDone + seoOptimalCount);
    const leftCount = Math.max(0, totalTarget - totalDone);

    return NextResponse.json({
      actions,
      totalDone,
      totalTarget,
      leftCount,
      pendingApprovalCount: pendingApprovalsCount,
      readinessScore,
      readinessGrade: audit?.grade ?? (readinessScore >= 80 ? 'A' : readinessScore >= 60 ? 'B' : 'C'),
      autopilotActions,
      roadmap: roadmapPhases,
      seoPendingCount,
      targets,
      segments: {
        reviews: {
          count: pendingReviewsCount,
          items: unrepliedReviews.map((r) => ({
            id: r.id,
            authorName: r.authorName || 'Google User',
            rating: r.rating || 5,
            comment: r.comment || '',
            createdAt: r.createdAt,
            reviewUrl: r.reviewUrl,
          })),
        },
        posts: {
          count: pendingPostsCount,
          items: pendingPostsList.map((p) => ({
            id: p.id,
            content: p.content,
            mediaUrls: (() => {
              try {
                return JSON.parse(p.mediaUrls || '[]');
              } catch {
                return [];
              }
            })(),
            gbpPostType: p.gbpPostType || "whats_new",
            scheduledAt: p.scheduledAt,
            createdAt: p.createdAt,
          })),
        },
        audit: {
          count: failedChecks.length,
          items: failedChecks.map((c) => ({
            id: c.id,
            label: c.label,
            actionRequired: c.actionRequired,
            recommendation: c.recommendation,
          })),
        },
        seo: {
          pendingCount: seoPendingCount,
          pendingFixCount: seoPendingFixes.length,
          score: audit?.score ?? 0,
          grade: audit?.grade ?? 'C',
          connectedToGoogle: audit?.connectedToGoogle ?? false,
          landingUrl: autoPlan?.landingUrl || null,
          hasRollback: Boolean(autoPlan?.settings?.autoOptimizeRollback),
          searchTermsUsed: autoPlan?.keywords?.slice(0, 6) || [],
          items: seoActions,
          uncoveredSearchTerms,
        },
      },
    });
  } catch (error: unknown) {
    console.error('[growth-actions] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to compute growth actions' },
      { status: 500 },
    );
  }
}

/**
 * POST /api/gbp/growth-actions
 * Supports:
 *   1. Segmented Bulk Approval:
 *      { action: 'approve_segment', segment: 'reviews' | 'posts' }
 *   2. Single Item Approval:
 *      { action: 'approve_item', segment: 'reviews' | 'posts', itemId: string, replyText?: string }
 *   3. Interactive 1-Click SEO Auto-Optimize & Search Demand Actions:
 *      { action: 'apply_seo_all' | 'apply_seo_step' | 'rollback_seo' | 'create_service_from_term', ... }
 *   4. Legacy task dismiss/undismiss:
 *      { id: 'complete_profile'|'upload_media'|'approve_post', action: 'dismiss'|'undismiss'|'done'|'undone' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user || !user.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = String(body?.action || '');
    const segment = String(body?.segment || '');

    // ─── 1. Segmented Bulk Approval ───────────────────────────────────────────
    if (action === 'approve_segment') {
      if (segment === 'posts') {
        const posts = await db.socialPost.findMany({
          where: { tenantId: user.tenantId },
        }).catch(() => []);
        const pending = posts.filter(
          (p) => (p as any).approvalStatus === 'pending' || p.status === 'draft',
        );
        let count = 0;
        for (const p of pending) {
          try {
            await db.socialPost.update({
              where: { id: p.id },
              data: { status: 'scheduled' },
            });
            count++;
          } catch {}
        }
        return NextResponse.json({
          success: true,
          segment: 'posts',
          approvedCount: count,
          message: `Successfully approved ${count} posts.`,
        });
      }

      if (segment === 'reviews') {
        const tenant = await db.tenant.findUnique({
          where: { id: user.tenantId },
          select: {
            name: true,
            settingsJson: true,
            brandProfile: {
              select: { businessName: true },
            },
          },
        });
        const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'our business';

        const reviews = await db.review.findMany({
          where: { tenantId: user.tenantId, source: 'google' },
          orderBy: { createdAt: 'desc' },
          take: 20,
        });

        const unreplied = reviews.filter((r) => {
          try {
            const parsed = JSON.parse(r.responseJson || '{}');
            return !parsed.text && !parsed.replyText;
          } catch {
            return true;
          }
        });

        let approvedCount = 0;
        const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);

        for (const review of unreplied) {
          try {
            const author = review.authorName || 'Valued Customer';
            const rating = review.rating || 5;
            const comment = review.comment || 'Great experience!';

            const aiRes = await callAI([
              { role: 'system', content: 'You are an authentic, professional local business owner responding to customer reviews.' },
              {
                role: 'user',
                content: `Write a warm, 2-sentence response from the owner of "${businessName}" thanking ${author} for their ${rating}-star review ("${comment}"). Keep it polite, sincere, and mention our dedication to quality service. No quotes around the response.`,
              },
            ]);

            let replyText = (typeof aiRes === 'string' ? aiRes : (aiRes as any)?.content || (aiRes as any)?.text || '').trim();
            if (!replyText) {
              replyText = `Thank you so much ${author}! We truly appreciate your ${rating}-star review and look forward to serving you again at ${businessName}.`;
            }

            let publishedToGoogle = false;
            let googleError: string | null = null;
            if (review.googleReviewId && googleAccount) {
              try {
                await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
                publishedToGoogle = true;
              } catch (err: unknown) {
                googleError = err instanceof Error ? err.message : String(err);
              }
            }

            await db.review.update({
              where: { id: review.id },
              data: {
                responseJson: JSON.stringify({
                  text: replyText,
                  respondedAt: new Date().toISOString(),
                  publishedToGoogle,
                  googleError,
                }),
              },
            });
            approvedCount++;
          } catch (err) {
            console.error(`Failed to auto-reply to review ${review.id}:`, err);
          }
        }

        return NextResponse.json({
          success: true,
          segment: 'reviews',
          approvedCount,
          message: `Successfully approved & replied to ${approvedCount} reviews.`,
        });
      }

      return NextResponse.json({ error: 'invalid segment for bulk approval' }, { status: 400 });
    }

    // ─── 2. Single Item Approval ─────────────────────────────────────────────
    if (action === 'approve_item') {
      const itemId = String(body?.itemId || '');
      if (!itemId) {
        return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
      }

      if (segment === 'posts') {
        const post = await db.socialPost.findFirst({
          where: { id: itemId, tenantId: user.tenantId },
        });
        if (!post) {
          return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }
        await db.socialPost.update({
          where: { id: itemId },
          data: { status: 'scheduled' },
        });
        return NextResponse.json({ success: true, message: 'Post approved.' });
      }

      if (segment === 'reviews') {
        const review = await db.review.findFirst({
          where: { id: itemId, tenantId: user.tenantId },
        });
        if (!review) {
          return NextResponse.json({ error: 'Review not found' }, { status: 404 });
        }
        const tenant = await db.tenant.findUnique({
          where: { id: user.tenantId },
          select: {
            name: true,
            brandProfile: {
              select: { businessName: true },
            },
          },
        });
        const businessName = tenant?.brandProfile?.businessName || tenant?.name || 'our business';
        const replyText = body?.replyText?.trim() || `Thank you so much ${review.authorName || 'valued customer'}! We truly appreciate your support at ${businessName}.`;

        const googleAccount = await prepareGoogleAccount(user.tenantId).catch(() => null);
        let publishedToGoogle = false;
        let googleError: string | null = null;
        if (review.googleReviewId && googleAccount) {
          try {
            await replyToGoogleBusinessReview(googleAccount, review.googleReviewId, replyText);
            publishedToGoogle = true;
          } catch (err: unknown) {
            googleError = err instanceof Error ? err.message : String(err);
          }
        }

        await db.review.update({
          where: { id: itemId },
          data: {
            responseJson: JSON.stringify({
              text: replyText,
              respondedAt: new Date().toISOString(),
              publishedToGoogle,
              googleError,
            }),
          },
        });
        return NextResponse.json({ success: true, message: 'Review reply approved & saved.' });
      }

      return NextResponse.json({ error: 'invalid segment' }, { status: 400 });
    }

    // ─── 3. Interactive 1-Click SEO Fixes & Search Demand Actions ─────────────
    if (action === 'apply_seo_all') {
      const steps =
        Array.isArray(body?.steps) && body.steps.length > 0
          ? (body.steps as AutoOptimizeStepId[])
          : undefined;
      const result = await executeAutoOptimize(user.tenantId, {
        steps,
        pushToGoogle: body?.pushToGoogle !== false,
        locationId: typeof body?.locationId === 'string' ? body.locationId : undefined,
        syncCompetitors: true,
      });
      return NextResponse.json({
        ...result,
        message: `Applied ${result.appliedSteps.length} SEO fix(es)${result.syncedToGoogle ? ' & synced to Google' : ' to BGOS'}. Score: ${result.scoreBefore}% → ${result.scoreAfter}%.`,
      });
    }

    if (action === 'apply_seo_step') {
      const stepId = String(body?.stepId || '') as AutoOptimizeStepId;
      const VALID_STEPS: AutoOptimizeStepId[] = [
        'description',
        'categories',
        'attributes',
        'services',
        'landing_page',
        'booking_link',
      ];
      if (!VALID_STEPS.includes(stepId)) {
        return NextResponse.json({ error: 'invalid stepId' }, { status: 400 });
      }
      const result = await executeAutoOptimize(user.tenantId, {
        steps: [stepId],
        pushToGoogle: body?.pushToGoogle !== false,
        locationId: typeof body?.locationId === 'string' ? body.locationId : undefined,
        syncCompetitors: true,
      });
      return NextResponse.json({
        ...result,
        stepId,
        message: `Applied ${stepId.replace('_', ' ')}${result.syncedToGoogle ? ' & synced to Google' : ' to BGOS'}. Score: ${result.scoreBefore}% → ${result.scoreAfter}%.`,
      });
    }

    if (action === 'rollback_seo') {
      const rollbackResult = await rollbackAutoOptimize(user.tenantId);
      if (rollbackResult.notFound) {
        return NextResponse.json({ error: rollbackResult.error }, { status: 404 });
      }
      return NextResponse.json({
        ...rollbackResult,
        message: `Reverted last SEO auto-optimization. Score restored to ${rollbackResult.scoreAfter}%.`,
      });
    }

    if (action === 'create_service_from_term') {
      const keyword = String(body?.keyword || '').trim();
      const serviceNameInput = String(body?.serviceName || '').trim();
      if (!keyword && !serviceNameInput) {
        return NextResponse.json({ error: 'keyword or serviceName is required' }, { status: 400 });
      }
      const plan = await buildAutoOptimizePlan(user.tenantId, { syncCompetitors: false });
      const matchedDemand = plan.uncoveredSearchTerms.find(
        (t) => t.keyword.toLowerCase() === keyword.toLowerCase(),
      );
      const serviceName = serviceNameInput || matchedDemand?.suggestedServiceName || keyword;
      const targetKeyword = keyword || serviceName;

      const svcRes = await generateLocalizedServiceDescriptions({
        tenantId: user.tenantId,
        services: [{ name: serviceName, targetKeyword }],
        save: true,
        pushToGoogle: body?.pushToGoogle !== false,
        locationId: typeof body?.locationId === 'string' ? body.locationId : undefined,
      });

      return NextResponse.json({
        success: true,
        action: 'create_service_from_term',
        service: svcRes.services[0] || null,
        syncedToGoogle: svcRes.syncedToGoogle,
        googleWarnings: svcRes.googleWarnings,
        message: `Created 300-500 char localized service "${serviceName}"${svcRes.syncedToGoogle ? ' & synced to Google' : ''}.`,
      });
    }

    // ─── 4. Update Contact & Profile Details (Phone, Website, Hours) ────────
    if (action === 'update_contact_info') {
      const phone = typeof body?.phone === 'string' ? body.phone.trim() : undefined;
      const website = typeof body?.website === 'string' ? body.website.trim() : undefined;
      const hours = body?.hours && typeof body.hours === 'object' ? body.hours : undefined;

      const tenant = await db.tenant.findUnique({
        where: { id: user.tenantId },
        select: { settingsJson: true },
      });
      let settings: Record<string, any> = {};
      try {
        settings = JSON.parse(tenant?.settingsJson || '{}');
      } catch {}

      const tenantUpdate: Record<string, any> = {};
      const brandUpdate: Record<string, any> = {};

      if (phone !== undefined) {
        tenantUpdate.phone = phone;
        settings.phone = phone;
        settings.primaryPhone = phone;
        brandUpdate.phone = phone;
      }

      if (website !== undefined) {
        settings.website = website;
        settings.websiteUrl = website;
        brandUpdate.website = website;
      }

      if (hours !== undefined) {
        settings.businessHours = hours;
        settings.operatingHours = hours;
      }

      tenantUpdate.settingsJson = JSON.stringify(settings);

      await db.tenant.update({
        where: { id: user.tenantId },
        data: tenantUpdate,
      });

      await db.brandProfile.upsert({
        where: { tenantId: user.tenantId },
        update: brandUpdate,
        create: {
          tenantId: user.tenantId,
          ...brandUpdate,
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        message: 'Contact details updated successfully.',
      });
    }

    // ─── 5. Legacy Task Dismiss / Undismiss ───────────────────────────────────
    const id = String(body?.id || '');
    const VALID_IDS = ['complete_profile', 'upload_media', 'approve_post'];
    if (!VALID_IDS.includes(id)) {
      return NextResponse.json({ error: 'invalid action id' }, { status: 400 });
    }
    if (!['dismiss', 'undismiss', 'done', 'undone'].includes(action)) {
      return NextResponse.json({ error: 'invalid action' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settingsJson: true },
    });
    let settings: Record<string, any> = {};
    try {
      settings = JSON.parse(tenant?.settingsJson || '{}');
    } catch {}

    const state: GrowthState = {
      dismissed: Array.isArray(settings?.gbpGrowthActions?.dismissed) ? settings.gbpGrowthActions.dismissed : [],
      done: Array.isArray(settings?.gbpGrowthActions?.done) ? settings.gbpGrowthActions.done : [],
    };

    if (action === 'dismiss' && !state.dismissed.includes(id)) state.dismissed.push(id);
    if (action === 'undismiss') state.dismissed = state.dismissed.filter((x) => x !== id);
    if (action === 'done' && !state.done.includes(id)) state.done.push(id);
    if (action === 'undone') state.done = state.done.filter((x) => x !== id);

    settings.gbpGrowthActions = state;
    await db.tenant.update({
      where: { id: user.tenantId },
      data: { settingsJson: JSON.stringify(settings) },
    });

    return NextResponse.json({ success: true, state });
  } catch (error: unknown) {
    console.error('[growth-actions] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update growth action' },
      { status: 500 },
    );
  }
}

