import { NextRequest, NextResponse } from 'next/server';
import { getFeaturedTemplates } from '@/lib/forms/templates';

/**
 * GET /api/templates/featured — fetch featured templates.
 *
 * Returns up to `limit` (default 8) featured templates, sorted by usage.
 * Used by the homepage, dashboard, and marketing pages.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get('limit') || '8', 10) || 8, 50);

  const featured = await getFeaturedTemplates(limit);
  return NextResponse.json({ templates: featured, count: featured.length });
}
