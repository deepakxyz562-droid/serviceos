import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/companies/resolve?slug=abc-cleaning
 *
 * Resolve a company slug to its public profile (id, name, slug, logo, industry).
 * Used by the company-scoped login pages /{slug}/login, /{slug}/employee, /{slug}/customer
 * to render the company branding before the user enters credentials.
 *
 * Returns 404 when the slug doesn't match any tenant.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const slug = searchParams.get('slug')?.trim().toLowerCase();

    if (!slug) {
      return NextResponse.json({ error: 'Slug is required' }, { status: 400 });
    }

    const tenant = await db.tenant.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        industry: true,
        email: true,
        phone: true,
        onboardingCompleted: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { found: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    const workspace = await db.workspace.findFirst({
      where: { tenantId: tenant.id },
      select: { id: true, name: true, slug: true },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      found: true,
      company: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        logo: tenant.logo,
        industry: tenant.industry,
        email: tenant.email,
        phone: tenant.phone,
        onboardingCompleted: tenant.onboardingCompleted,
        workspace: workspace
          ? { id: workspace.id, name: workspace.name, slug: workspace.slug }
          : null,
      },
    });
  } catch (error) {
    console.error('[Companies Resolve Error]', error);
    return NextResponse.json(
      { found: false, error: 'Failed to resolve company' },
      { status: 500 }
    );
  }
}
