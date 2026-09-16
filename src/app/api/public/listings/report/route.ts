import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      tenantId,
      slug,
      reportType,
      submittedBy,
      submitterEmail,
      submitterPhone,
      suggestedData,
      reason,
    } = body;

    if (!reportType) {
      return NextResponse.json(
        { error: 'reportType is required' },
        { status: 400 }
      );
    }

    if (!tenantId && !slug) {
      return NextResponse.json(
        { error: 'Either tenantId or slug is required' },
        { status: 400 }
      );
    }

    // Find the tenant
    const tenant = await db.tenant.findFirst({
      where: tenantId ? { id: tenantId } : { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        industry: true,
        phone: true,
        email: true,
        website: true,
        address: true,
        city: true,
        state: true,
        postalCode: true,
        country: true,
        claimed: true,
        businessCategoriesJson: true,
        tagline: true,
        description: true,
      },
    });

    if (!tenant) {
      return NextResponse.json(
        { error: 'Business listing not found' },
        { status: 404 }
      );
    }

    const reportId = 'rep_' + crypto.randomBytes(8).toString('hex');
    const currentSnapshot = {
      name: tenant.name,
      slug: tenant.slug,
      industry: tenant.industry,
      phone: tenant.phone,
      email: tenant.email,
      website: tenant.website,
      address: tenant.address,
      city: tenant.city,
      state: tenant.state,
      postalCode: tenant.postalCode,
      country: tenant.country,
      claimed: tenant.claimed,
      businessCategoriesJson: tenant.businessCategoriesJson,
    };

    const report = await db.listingReport.create({
      data: {
        id: reportId,
        tenantId: tenant.id,
        reportType,
        submittedBy: submittedBy ? String(submittedBy).trim().slice(0, 150) : null,
        submitterEmail: submitterEmail ? String(submitterEmail).trim().slice(0, 255) : null,
        submitterPhone: submitterPhone ? String(submitterPhone).trim().slice(0, 50) : null,
        currentDataJson: JSON.stringify(currentSnapshot),
        suggestedDataJson: JSON.stringify(suggestedData || {}),
        reason: reason ? String(reason).trim().slice(0, 1000) : null,
        status: 'pending',
      },
    });

    logger.info('[ListingReport] New report created', {
      reportId: report.id,
      tenantId: tenant.id,
      tenantName: tenant.name,
      reportType,
      submitterEmail,
    });

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Thank you. Your request has been submitted and queued for verification.',
    });
  } catch (error: any) {
    logger.error('[ListingReport] Error creating report:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit report' },
      { status: 500 }
    );
  }
}
