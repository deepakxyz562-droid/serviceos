import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { requireBgosEntitled } from '@/lib/bgos-entitlement';
import { db } from '@/lib/db';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { resolveBusinessPresenceMode } from '@/lib/seo/presence-mode';
import { computeWebsiteAndAiAudit, getLatestWebsiteAudit } from '@/lib/seo/website-audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const [{ snapshot, tasks }, tenant, customDomains, gbpAudit] = await Promise.all([
      getLatestWebsiteAudit(user.tenantId),
      db.tenant
        .findUnique({
          where: { id: user.tenantId },
          select: {
            id: true,
            name: true,
            slug: true,
            publicSlug: true,
            industry: true,
            city: true,
            website: true,
            publicProfileEnabled: true,
            claimed: true,
            settingsJson: true,
            brandProfile: { select: { industry: true, location: true } },
          },
        })
        .catch(() => null),
      (db as any).customDomain?.findMany
        ? (db as any).customDomain
            .findMany({ where: { tenantId: user.tenantId }, orderBy: { updatedAt: 'desc' }, take: 3 })
            .catch(() => [])
        : [],
      computeGbpAudit(user.tenantId).catch(() => null),
    ]);

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
    }

    const verifiedCustomDomain = Array.isArray(customDomains)
      ? customDomains.find((d: any) => d.status === 'SSL_ACTIVE' || d.status === 'DNS_VERIFIED') || customDomains[0]
      : null;

    const presence = resolveBusinessPresenceMode({
      tenant: tenant as any,
      customDomain: verifiedCustomDomain
        ? { domain: verifiedCustomDomain.domain, status: verifiedCustomDomain.status }
        : null,
    });

    return NextResponse.json({
      success: true,
      snapshot,
      tasks,
      presence,
      gbpScore: gbpAudit?.score ?? null,
    });
  } catch (error) {
    console.error('[api/seo/audit] GET failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load SEO audit' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user?.tenantId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const gate = await requireBgosEntitled(user);
    if (!gate.ok) return gate.response;

    const report = await computeWebsiteAndAiAudit(user.tenantId);
    return NextResponse.json({ success: true, report });
  } catch (error) {
    console.error('[api/seo/audit] POST failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Website & AI audit failed' },
      { status: 500 },
    );
  }
}
