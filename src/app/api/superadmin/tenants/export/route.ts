import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { escapeCsv, buildCsv, withBom, exportFilename, EXPORT_MIME } from '@/lib/csv-export';

/**
 * GET /api/superadmin/tenants/export
 *
 * Exports tenant (business) data as a downloadable file (CSV, XLS, or JSON).
 * Supports the same filters as the TenantsTab UI plus additional data-quality
 * filters:
 *
 * Query params:
 *   format       csv | xls | json  (default: csv)
 *   search       text search (name / email / slug / phone)
 *   plan         trial | starter | growth | pro | enterprise
 *   status       active | trial | suspended
 *   country      ISO country code (exact match)
 *   industry     industry id (exact match)
 *   city         city substring (case-insensitive)
 *   claimed      true | false  (only claimed / only unclaimed)
 *   noEmail      true  (only tenants with no email)
 *   noWebsite    true  (only tenants with no website)
 *   noPhone      true  (only tenants with no phone)
 *   marketplace  true | false  (marketplaceOptIn filter)
 *   publicProfile true | false  (publicProfileEnabled filter)
 *   listingTier  none | free | claimed_free | claimed | pro
 *
 * Auth: SuperAdmin only.
 */
export async function GET(request: NextRequest) {
  // ── Auth guard ──────────────────────────────────────────────────────────
  const auth = await getAuthUser();
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json({ error: 'Forbidden — SuperAdmin access required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);

  // ── Parse format ────────────────────────────────────────────────────────
  const format = (searchParams.get('format') || 'csv').toLowerCase();
  if (!['csv', 'xls', 'json'].includes(format)) {
    return NextResponse.json({ error: 'Invalid format. Use csv, xls, or json.' }, { status: 400 });
  }

  // ── Parse filters ───────────────────────────────────────────────────────
  const search = searchParams.get('search')?.trim() || '';
  const plan = searchParams.get('plan')?.trim() || '';
  const status = searchParams.get('status')?.trim() || '';
  const country = searchParams.get('country')?.trim().toUpperCase() || '';
  const industry = searchParams.get('industry')?.trim() || '';
  const city = searchParams.get('city')?.trim() || '';
  const claimed = searchParams.get('claimed'); // 'true' | 'false' | null
  const noEmail = searchParams.get('noEmail') === 'true';
  const noWebsite = searchParams.get('noWebsite') === 'true';
  const noPhone = searchParams.get('noPhone') === 'true';
  const marketplace = searchParams.get('marketplace'); // 'true' | 'false' | null
  const publicProfile = searchParams.get('publicProfile'); // 'true' | 'false' | null
  const listingTier = searchParams.get('listingTier')?.trim() || '';

  // ── Build where clause ──────────────────────────────────────────────────
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { slug: { contains: search } },
      { email: { contains: search } },
      { phone: { contains: search } },
    ];
  }

  if (plan) where.plan = plan;
  if (status) where.planStatus = status;
  if (country) where.country = country;
  if (industry) where.industry = industry;
  if (city) {
    where.OR = [
      { city: { contains: city } },
      { state: { contains: city } },
    ];
  }
  if (listingTier) where.listingTier = listingTier;

  // Boolean filters
  if (claimed === 'true') where.claimed = true;
  else if (claimed === 'false') where.claimed = false;

  if (marketplace === 'true') where.marketplaceOptIn = true;
  else if (marketplace === 'false') where.marketplaceOptIn = false;

  if (publicProfile === 'true') where.publicProfileEnabled = true;
  else if (publicProfile === 'false') where.publicProfileEnabled = false;

  // "No X" filters — match null OR empty string
  if (noEmail) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { email: null },
      { email: '' },
    ];
  }
  if (noWebsite) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { website: null },
      { website: '' },
    ];
  }
  if (noPhone) {
    where.OR = [
      ...(Array.isArray(where.OR) ? where.OR : []),
      { phone: null },
      { phone: '' },
    ];
  }

  // ── Fetch data ──────────────────────────────────────────────────────────
  const tenants = await db.tenant.findMany({
    where,
    select: {
      id: true,
      name: true,
      slug: true,
      email: true,
      phone: true,
      website: true,
      industry: true,
      city: true,
      state: true,
      country: true,
      plan: true,
      planStatus: true,
      listingTier: true,
      claimed: true,
      marketplaceOptIn: true,
      publicProfileEnabled: true,
      rating: true,
      reviewCount: true,
      mrr: true,
      arr: true,
      createdAt: true,
      suspendedAt: true,
      suspensionReason: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // ── Build output ────────────────────────────────────────────────────────
  const filename = exportFilename('tenants-export', format === 'json' ? 'json' : format === 'xls' ? 'xls' : 'csv');

  if (format === 'json') {
    const jsonData = JSON.stringify({
      metadata: {
        exportedAt: new Date().toISOString(),
        totalRecords: tenants.length,
        filters: { search, plan, status, country, industry, city, claimed, noEmail, noWebsite, noPhone, marketplace, publicProfile, listingTier },
      },
      tenants,
    }, null, 2);

    return new NextResponse(jsonData, {
      status: 200,
      headers: {
        'Content-Type': EXPORT_MIME.json,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // CSV / XLS — same content, different extension + MIME
  const headers = [
    'ID', 'Name', 'Slug', 'Email', 'Phone', 'Website',
    'Industry', 'City', 'State', 'Country',
    'Plan', 'Plan Status', 'Listing Tier', 'Claimed',
    'Marketplace Opt-In', 'Public Profile',
    'Rating', 'Review Count',
    'MRR', 'ARR',
    'Created At', 'Suspended At', 'Suspension Reason',
  ];

  const rows = tenants.map((t: Record<string, unknown>) => [
    t.id ?? '',
    t.name ?? '',
    t.slug ?? '',
    t.email ?? '',
    t.phone ?? '',
    t.website ?? '',
    t.industry ?? '',
    t.city ?? '',
    t.state ?? '',
    t.country ?? '',
    t.plan ?? '',
    t.planStatus ?? '',
    t.listingTier ?? '',
    t.claimed ? 'Yes' : 'No',
    t.marketplaceOptIn ? 'Yes' : 'No',
    t.publicProfileEnabled ? 'Yes' : 'No',
    t.rating != null ? Number(t.rating) : '',
    t.reviewCount != null ? Number(t.reviewCount) : '',
    t.mrr != null ? Number(t.mrr) : '',
    t.arr != null ? Number(t.arr) : '',
    t.createdAt ? new Date(t.createdAt as string).toISOString() : '',
    t.suspendedAt ? new Date(t.suspendedAt as string).toISOString() : '',
    t.suspensionReason ?? '',
  ]);

  const csv = withBom(buildCsv(headers, rows));

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': format === 'xls' ? EXPORT_MIME.xls : EXPORT_MIME.csv,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
