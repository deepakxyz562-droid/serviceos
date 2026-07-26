import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger, withRequestId } from '@/lib/logger';

/**
 * Provider Portfolio — get + upsert (ServiceOS V1.5 — P10-flows)
 * ------------------------------------------------------------
 * GET  /api/provider/portfolio          — get own portfolio
 * POST /api/provider/portfolio          — create or update portfolio items
 *
 * Body (POST): a partial portfolio — any of these top-level keys may be set,
 * the rest are preserved from the existing row:
 *   {
 *     items?:   Array<{ title, description?, imageUrl?, beforeUrl?, afterUrl?, date?, category? }>,
 *     videos?:  Array<{ title, url, description? }>,
 *     awards?:  Array<{ name, issuer?, year?, description? }>,
 *     projects?:Array<{ title, description?, images?, date?, value?, duration? }>,
 *     team?:    Array<{ name, role?, photo?, bio?, certifications? }>,
 *     isActive?: boolean,
 *   }
 *
 * Auth required. Caller must have a tenantId. The portfolio row is uniquely
 * keyed on tenantId (ProviderPortfolio.tenantId is @unique) — upsert.
 *
 * Returns: { portfolio }
 */

const MAX_ITEMS = 50;
const MAX_VIDEOS = 20;
const MAX_AWARDS = 30;
const MAX_PROJECTS = 50;
const MAX_TEAM = 30;

interface PortfolioItem {
  title: string;
  description?: string;
  imageUrl?: string;
  beforeUrl?: string;
  afterUrl?: string;
  date?: string;
  category?: string;
}

function coerceArray<T>(value: unknown, max: number, coerceItem: (v: unknown) => T | null): T[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(coerceItem)
    .filter((v): v is T => v !== null)
    .slice(0, max);
}

function coerceString(v: unknown, max = 500): string | undefined {
  if (typeof v === 'string' && v.trim().length > 0) {
    return v.trim().slice(0, max);
  }
  return undefined;
}

function coerceNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  return undefined;
}

function coerceItem(v: unknown): PortfolioItem | null {
  if (typeof v !== 'object' || v === null) return null;
  const rec = v as Record<string, unknown>;
  const title = coerceString(rec.title, 200);
  if (!title) return null;
  return {
    title,
    description: coerceString(rec.description, 2000),
    imageUrl: coerceString(rec.imageUrl, 500),
    beforeUrl: coerceString(rec.beforeUrl, 500),
    afterUrl: coerceString(rec.afterUrl, 500),
    date: coerceString(rec.date, 50),
    category: coerceString(rec.category, 100),
  };
}

function coerceVideo(v: unknown): Record<string, unknown> | null {
  if (typeof v !== 'object' || v === null) return null;
  const rec = v as Record<string, unknown>;
  const title = coerceString(rec.title, 200);
  const url = coerceString(rec.url, 500);
  if (!title || !url) return null;
  return { title, url, description: coerceString(rec.description, 1000) };
}

function coerceAward(v: unknown): Record<string, unknown> | null {
  if (typeof v !== 'object' || v === null) return null;
  const rec = v as Record<string, unknown>;
  const name = coerceString(rec.name, 200);
  if (!name) return null;
  return {
    name,
    issuer: coerceString(rec.issuer, 200),
    year: coerceNumber(rec.year),
    description: coerceString(rec.description, 1000),
  };
}

function coerceProject(v: unknown): Record<string, unknown> | null {
  if (typeof v !== 'object' || v === null) return null;
  const rec = v as Record<string, unknown>;
  const title = coerceString(rec.title, 200);
  if (!title) return null;
  const images = Array.isArray(rec.images)
    ? rec.images.filter((s): s is string => typeof s === 'string').slice(0, 10)
    : [];
  return {
    title,
    description: coerceString(rec.description, 2000),
    images,
    date: coerceString(rec.date, 50),
    value: coerceNumber(rec.value),
    duration: coerceString(rec.duration, 100),
  };
}

function coerceTeam(v: unknown): Record<string, unknown> | null {
  if (typeof v !== 'object' || v === null) return null;
  const rec = v as Record<string, unknown>;
  const name = coerceString(rec.name, 200);
  if (!name) return null;
  const certs = Array.isArray(rec.certifications)
    ? rec.certifications.filter((s): s is string => typeof s === 'string').slice(0, 10)
    : [];
  return {
    name,
    role: coerceString(rec.role, 100),
    photo: coerceString(rec.photo, 500),
    bio: coerceString(rec.bio, 2000),
    certifications: certs,
  };
}

export async function GET(request: NextRequest) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  try {
    const portfolio = await db.providerPortfolio.findUnique({
      where: { tenantId: authUser.tenantId },
    });

    if (!portfolio) {
      // Return an empty default portfolio so the UI has a stable shape.
      return NextResponse.json({
        portfolio: {
          tenantId: authUser.tenantId,
          items: [],
          videos: [],
          awards: [],
          projects: [],
          team: [],
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      });
    }

    const safeParse = <T,>(json: string, fallback: T): T => {
      try {
        const parsed = JSON.parse(json);
        return parsed ?? fallback;
      } catch {
        return fallback;
      }
    };

    log.info({ tenantId: authUser.tenantId }, 'provider/portfolio: fetched');
    return NextResponse.json({
      portfolio: {
        id: portfolio.id,
        tenantId: portfolio.tenantId,
        items: safeParse(portfolio.itemsJson, []),
        videos: safeParse(portfolio.videosJson, []),
        awards: safeParse(portfolio.awardsJson, []),
        projects: safeParse(portfolio.projectsJson, []),
        team: safeParse(portfolio.teamJson, []),
        isActive: portfolio.isActive,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      },
    });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'provider/portfolio: fetch failed');
    return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const log = withRequestId(request);

  const authUser = await getAuthUser();
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (!authUser.tenantId) {
    return NextResponse.json(
      { error: 'No tenant associated with this account' },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Coerce incoming arrays.
  const items =
    'items' in body
      ? coerceArray(body.items, MAX_ITEMS, coerceItem)
      : undefined;
  const videos =
    'videos' in body
      ? coerceArray(body.videos, MAX_VIDEOS, coerceVideo)
      : undefined;
  const awards =
    'awards' in body
      ? coerceArray(body.awards, MAX_AWARDS, coerceAward)
      : undefined;
  const projects =
    'projects' in body
      ? coerceArray(body.projects, MAX_PROJECTS, coerceProject)
      : undefined;
  const team =
    'team' in body
      ? coerceArray(body.team, MAX_TEAM, coerceTeam)
      : undefined;
  const isActive =
    typeof body.isActive === 'boolean' ? body.isActive : undefined;

  if (
    items === undefined &&
    videos === undefined &&
    awards === undefined &&
    projects === undefined &&
    team === undefined &&
    isActive === undefined
  ) {
    return NextResponse.json(
      { error: 'No portfolio fields provided to update.' },
      { status: 400 },
    );
  }

  try {
    // Fetch the existing row so we can merge — we need the current JSON
    // strings to preserve unmodified arrays.
    const existing = await db.providerPortfolio.findUnique({
      where: { tenantId: authUser.tenantId },
    });

    const safeParse = (json: string | null | undefined, fallback: unknown[]) => {
      if (!json) return fallback;
      try {
        const parsed = JSON.parse(json);
        return Array.isArray(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    };

    const itemsJson = JSON.stringify(items ?? safeParse(existing?.itemsJson, []));
    const videosJson = JSON.stringify(videos ?? safeParse(existing?.videosJson, []));
    const awardsJson = JSON.stringify(awards ?? safeParse(existing?.awardsJson, []));
    const projectsJson = JSON.stringify(projects ?? safeParse(existing?.projectsJson, []));
    const teamJson = JSON.stringify(team ?? safeParse(existing?.teamJson, []));

    const portfolio = await db.providerPortfolio.upsert({
      where: { tenantId: authUser.tenantId },
      create: {
        tenantId: authUser.tenantId,
        itemsJson,
        videosJson,
        awardsJson,
        projectsJson,
        teamJson,
        isActive: isActive ?? true,
      },
      update: {
        itemsJson,
        videosJson,
        awardsJson,
        projectsJson,
        teamJson,
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    log.info(
      {
        tenantId: authUser.tenantId,
        portfolioId: portfolio.id,
        itemsCount: items?.length,
        teamCount: team?.length,
      },
      'provider/portfolio: upserted',
    );

    return NextResponse.json({
      portfolio: {
        id: portfolio.id,
        tenantId: portfolio.tenantId,
        items: safeParse(portfolio.itemsJson, []),
        videos: safeParse(portfolio.videosJson, []),
        awards: safeParse(portfolio.awardsJson, []),
        projects: safeParse(portfolio.projectsJson, []),
        team: safeParse(portfolio.teamJson, []),
        isActive: portfolio.isActive,
        createdAt: portfolio.createdAt,
        updatedAt: portfolio.updatedAt,
      },
    });
  } catch (err) {
    log.error({ err, tenantId: authUser.tenantId }, 'provider/portfolio: upsert failed');
    return NextResponse.json({ error: 'Failed to save portfolio' }, { status: 500 });
  }
}
