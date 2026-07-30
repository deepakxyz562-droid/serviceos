import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// ─────────────────────────────────────────────────────────────────────────────
// /api/superadmin/plans  — Plan Catalog CRUD (superadmin only).
//
// GET   — list all plans (including inactive), sorted by sortOrder asc.
// POST  — create a new plan. `code` is required and must be unique.
//
// Auth pattern mirrors /api/superadmin/plan-features/route.ts:
//   getAuthUser() → 401 if missing; isSuperAdminRequest() → 403 if not super.
// ─────────────────────────────────────────────────────────────────────────────

const MARKETPLACE_ACCESS_VALUES = ['none', 'browse_only', 'receive_bookings', 'priority'] as const;
type MarketplaceAccess = (typeof MARKETPLACE_ACCESS_VALUES)[number];

interface PlanInput {
  code?: string;
  name?: string;
  description?: string | null;
  monthlyPrice?: number | string;
  yearlyPrice?: number | string;
  originalMonthlyPrice?: number | string;
  originalYearlyPrice?: number | string;
  discountBadge?: string | null;
  currency?: string;
  maxUsers?: number | string;
  maxJobs?: number | string;
  maxWorkflows?: number | string;
  aiQuota?: number | string;
  whatsappQuota?: number | string;
  emailQuota?: number | string;
  smsQuota?: number | string;
  storageQuotaMb?: number | string;
  featuresJson?: string;
  limitsJson?: string;
  isAddon?: boolean;
  parentPlanCode?: string | null;
  marketplaceAccess?: string;
  popular?: boolean;
  isActive?: boolean;
  sortOrder?: number | string;
}

// GET /api/superadmin/plans — list all plans.
export async function GET() {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 },
      );
    }

    const plans = await db.plan.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error('[/api/superadmin/plans GET] Error:', error);
    return NextResponse.json({ error: 'Failed to load plans' }, { status: 500 });
  }
}

// POST /api/superadmin/plans — create a new plan.
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json(
        { error: 'Forbidden — SuperAdmin access required' },
        { status: 403 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as PlanInput;

    // Validate required fields.
    if (!body.code || typeof body.code !== 'string' || !body.code.trim()) {
      return NextResponse.json({ error: 'Plan code is required' }, { status: 400 });
    }
    const code = body.code.trim();
    if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
      return NextResponse.json({ error: 'Plan name is required' }, { status: 400 });
    }

    // Validate marketplaceAccess.
    if (body.marketplaceAccess && !(MARKETPLACE_ACCESS_VALUES as readonly string[]).includes(body.marketplaceAccess)) {
      return NextResponse.json(
        { error: `marketplaceAccess must be one of: ${MARKETPLACE_ACCESS_VALUES.join(', ')}` },
        { status: 400 },
      );
    }

    // Enforce unique code.
    const existing = await db.plan.findUnique({ where: { code }, select: { id: true } });
    if (existing) {
      return NextResponse.json(
        { error: `A plan with code "${code}" already exists` },
        { status: 400 },
      );
    }

    // Validate JSON blobs if provided.
    let featuresJson = '{}';
    if (body.featuresJson) {
      try {
        featuresJson = JSON.stringify(JSON.parse(body.featuresJson));
      } catch {
        return NextResponse.json({ error: 'featuresJson must be valid JSON' }, { status: 400 });
      }
    }
    let limitsJson = '{}';
    if (body.limitsJson) {
      try {
        limitsJson = JSON.stringify(JSON.parse(body.limitsJson));
      } catch {
        return NextResponse.json({ error: 'limitsJson must be valid JSON' }, { status: 400 });
      }
    }

    const plan = await db.plan.create({
      data: {
        code,
        name: body.name.trim(),
        description: body.description?.trim() || null,
        monthlyPrice: numOr(body.monthlyPrice, 0),
        yearlyPrice: numOr(body.yearlyPrice, 0),
        originalMonthlyPrice: numOr(body.originalMonthlyPrice, 0),
        originalYearlyPrice: numOr(body.originalYearlyPrice, 0),
        discountBadge: body.discountBadge?.trim() || null,
        currency: body.currency?.trim() || 'USD',
        maxUsers: intOr(body.maxUsers, 1),
        maxJobs: intOr(body.maxJobs, 100),
        maxWorkflows: intOr(body.maxWorkflows, 10),
        aiQuota: intOr(body.aiQuota, 100),
        whatsappQuota: intOr(body.whatsappQuota, 1000),
        emailQuota: intOr(body.emailQuota, 5000),
        smsQuota: intOr(body.smsQuota, 500),
        storageQuotaMb: intOr(body.storageQuotaMb, 1024),
        featuresJson,
        limitsJson,
        isAddon: boolOr(body.isAddon, false),
        parentPlanCode: body.parentPlanCode?.trim() || null,
        marketplaceAccess: (body.marketplaceAccess as MarketplaceAccess) || 'none',
        popular: boolOr(body.popular, false),
        isActive: boolOr(body.isActive, true),
        sortOrder: intOr(body.sortOrder, 0),
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error('[/api/superadmin/plans POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create plan' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function numOr(v: number | string | undefined, fallback: number): number {
  if (v === undefined || v === null || v === '') return fallback;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function intOr(v: number | string | undefined, fallback: number): number {
  const n = numOr(v, fallback);
  return Math.trunc(n);
}

function boolOr(v: boolean | undefined, fallback: boolean): boolean {
  if (v === undefined || v === null) return fallback;
  return Boolean(v);
}
