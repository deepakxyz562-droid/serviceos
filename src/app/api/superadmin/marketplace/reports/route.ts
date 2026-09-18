import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email-send';
import { mapIndustryToPluralSlug } from '@/lib/seo/plural-industry-slugs';
import { invalidatePublicBusinessCache } from '@/lib/public-business';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') || 'pending';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    // Fetch reports with tenant information
    const [reports, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      db.listingReport.findMany({
        where: whereClause,
        include: {
          tenant: {
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
              country: true,
              claimed: true,
              publicProfileEnabled: true,
              listingTier: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.listingReport.count({ where: whereClause }),
      db.listingReport.count({ where: { status: 'pending' } }),
      db.listingReport.count({ where: { status: 'approved' } }),
      db.listingReport.count({ where: { status: 'rejected' } }),
    ]);

    return NextResponse.json({
      reports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      counts: {
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        all: pendingCount + approvedCount + rejectedCount,
      },
    });
  } catch (error: any) {
    logger.error('[ListingReport Admin GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const isSuperAdmin =
      user.isSuperAdmin === true ||
      user.role === 'superadmin' ||
      user.role === 'super_admin';

    if (!isSuperAdmin) {
      return NextResponse.json({ error: 'SuperAdmin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { reportId, action, adminNote, overrideData } = body;

    if (!reportId || !action || !['approve', 'reject', 'reapply'].includes(action)) {
      return NextResponse.json(
        { error: 'reportId and valid action ("approve" | "reject" | "reapply") are required' },
        { status: 400 }
      );
    }

    const report = await db.listingReport.findUnique({
      where: { id: reportId },
      include: {
        tenant: true,
      },
    });

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (action === 'reject') {
      const updated = await db.listingReport.update({
        where: { id: reportId },
        data: {
          status: 'rejected',
          adminNote: adminNote || null,
          reviewedById: user.id,
          reviewedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Report has been rejected.',
        report: updated,
      });
    }

    // Action === 'approve' or 'reapply'
    let suggestedData: any = {};
    try {
      suggestedData = JSON.parse(report.suggestedDataJson || '{}');
    } catch {
      suggestedData = {};
    }

    let currentSnapshot: any = {};
    try {
      currentSnapshot = JSON.parse(report.currentDataJson || '{}');
    } catch {
      currentSnapshot = {};
    }

    let tenant = report.tenant;
    if (!tenant && report.tenantId) {
      tenant = await db.tenant.findUnique({
        where: { id: report.tenantId },
      });
    }

    const appliedChanges: any = {};
    const tenantUpdateData: any = {};

    // 1. Business Name (from overrideData, suggestedData, or reason statement fallback)
    const proposedName = (
      overrideData?.name ||
      overrideData?.newName ||
      suggestedData?.newName ||
      suggestedData?.name ||
      suggestedData?.businessName ||
      ''
    ).trim();

    if (proposedName) {
      tenantUpdateData.name = proposedName;
      appliedChanges.name = proposedName;
    }

    // 2. Category / Industry
    const proposedCategory = (
      overrideData?.industry ||
      overrideData?.category ||
      overrideData?.targetCategory ||
      suggestedData?.targetCategory ||
      suggestedData?.newCategory ||
      suggestedData?.category ||
      (report.reportType === 'category_change' ? suggestedData.targetCategory : '') ||
      ''
    ).toLowerCase().trim();

    if (proposedCategory) {
      tenantUpdateData.industry = proposedCategory;
      tenantUpdateData.businessCategoriesJson = JSON.stringify([proposedCategory]);
      appliedChanges.industry = proposedCategory;
    }

    // 3. Tagline & Branding update
    if (proposedName || proposedCategory) {
      const tenantName = proposedName || tenant?.name || currentSnapshot.name || 'Business';
      const tenantCategory = proposedCategory || tenant?.industry || currentSnapshot.industry || 'services';
      const tenantCity = tenant?.city || currentSnapshot.city || 'local area';
      tenantUpdateData.tagline = `${tenantName} — ${tenantCategory} in ${tenantCity}`;
    }

    // 4. Privacy Phone Removal
    const removePhone = overrideData?.removePhone ?? (report.reportType === 'privacy_phone_removal');
    if (removePhone) {
      tenantUpdateData.phone = null;
      tenantUpdateData.whatsappPhone = null;
      tenantUpdateData.outreachDisabled = true;
      tenantUpdateData.outreachDisabledAt = new Date();
      tenantUpdateData.outreachDisabledReason =
        adminNote || `Privacy request approved (${report.reason || 'Personal phone removal'})`;
      appliedChanges.phoneRemoved = true;
      appliedChanges.outreachDisabled = true;
    }

    // 5. Phone Update
    if (!removePhone) {
      const proposedPhone = overrideData?.phone !== undefined ? overrideData.phone : (suggestedData?.newPhone !== undefined ? suggestedData.newPhone : suggestedData?.phone);
      if (proposedPhone !== undefined && proposedPhone !== '') {
        tenantUpdateData.phone = proposedPhone;
        appliedChanges.phone = proposedPhone;
      }
    }

    // 6. Website Update
    const proposedWebsite = overrideData?.website !== undefined ? overrideData.website : (suggestedData?.newWebsite !== undefined ? suggestedData.newWebsite : suggestedData?.website);
    if (proposedWebsite !== undefined && proposedWebsite !== '') {
      tenantUpdateData.website = proposedWebsite;
      appliedChanges.website = proposedWebsite;
    }

    // 7. Address Update
    const proposedAddress = overrideData?.address !== undefined ? overrideData.address : (suggestedData?.newAddress !== undefined ? suggestedData.newAddress : suggestedData?.address);
    if (proposedAddress !== undefined && proposedAddress !== '') {
      tenantUpdateData.address = proposedAddress;
      appliedChanges.address = proposedAddress;
    }

    // 8. Permanently Closed
    const markClosed = overrideData?.markClosed ?? (report.reportType === 'permanently_closed');
    if (markClosed) {
      tenantUpdateData.publicProfileEnabled = false;
      tenantUpdateData.listingTier = 'none';
      appliedChanges.permanentlyClosed = true;
    }

    tenantUpdateData.updatedAt = new Date();

    // Execute tenant update if tenant exists in database
    if (tenant && tenant.id) {
      if (Object.keys(tenantUpdateData).length > 1) { // includes updatedAt
        await db.tenant.update({
          where: { id: tenant.id },
          data: tenantUpdateData,
        });

        // ── Invalidate Edge / Next.js caches ──────────────────────────────
        try {
          await invalidatePublicBusinessCache();
          revalidatePath('/[companySlug]/[city]/[slug]', 'page');
          
          const ind = tenantUpdateData.industry || tenant.industry || 'services';
          const pluralSlug = mapIndustryToPluralSlug(ind);
          const citySlug = (tenant.city || currentSnapshot.city || 'city').toLowerCase().replace(/\s+/g, '-');
          const tSlug = tenant.slug || currentSnapshot.slug;

          if (tSlug) {
            revalidatePath(`/${pluralSlug}/${citySlug}/${tSlug}`, 'page');
          }
          if (citySlug) {
            revalidatePath(`/${pluralSlug}/${citySlug}`, 'page');
          }
          revalidatePath(`/${pluralSlug}`, 'page');
        } catch (cacheErr) {
          logger.warn('[ListingReport Admin POST] Cache invalidation warning:', cacheErr);
        }
      }
    } else {
      appliedChanges.note = 'Report approved (no linked active tenant record in database)';
    }

    // Update report state
    const updatedReport = await db.listingReport.update({
      where: { id: reportId },
      data: {
        status: 'approved',
        adminNote: adminNote || null,
        reviewedById: user.id,
        reviewedAt: new Date(),
        appliedChangesJson: JSON.stringify(appliedChanges),
      },
    });

    // Optional email confirmation to submitter
    if (report.submitterEmail) {
      try {
        const businessName = tenant?.name || currentSnapshot.name || 'Business Listing';
        const industry = tenantUpdateData.industry || tenant?.industry || currentSnapshot.industry || 'services';
        const pluralSlug = mapIndustryToPluralSlug(industry);
        const citySlug = (tenant?.city || currentSnapshot.city || 'city').toLowerCase().replace(/\s+/g, '-');
        const tenantSlug = tenant?.slug || currentSnapshot.slug;
        const listingUrl = tenantSlug
          ? `https://fieseros.com/${pluralSlug}/${citySlug}/${tenantSlug}`
          : `https://fieseros.com/marketplace`;

        let subject = `Update regarding your request for ${businessName} on Fieseros`;
        let htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.6;">
            <div style="background-color: #10b981; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px;">Fieseros Directory Update</h1>
            </div>
            <div style="border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p>Hello ${report.submittedBy || 'there'},</p>
              <p>We are writing to confirm that your request regarding <strong>${businessName}</strong> has been reviewed and successfully processed by our team.</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 12px 16px; margin: 20px 0;">
                <p style="margin: 0; font-size: 14px;"><strong>Action Taken:</strong> ${report.reportType.replace(/_/g, ' ').toUpperCase()}</p>
                ${adminNote ? `<p style="margin: 8px 0 0; font-size: 13px; color: #64748b;"><strong>Note:</strong> ${adminNote}</p>` : ''}
              </div>
              <p>The changes are now active on our live directory: <br/><a href="${listingUrl}" style="color: #059669; font-weight: bold;">${listingUrl}</a></p>
              <p style="font-size: 13px; color: #64748b; margin-top: 24px;">Thank you for helping us keep business data accurate and privacy-compliant.</p>
              <p style="font-size: 13px; color: #64748b; margin: 0;">— The Fieseros Compliance & Support Team</p>
            </div>
          </div>
        `;

        await sendEmail({
          to: report.submitterEmail,
          subject,
          html: htmlBody,
          usageType: 'transactional',
        }).catch((err) => logger.warn('[ListingReport Admin POST] Email send skipped or failed:', err));
      } catch (emailErr) {
        logger.warn('[ListingReport Admin POST] Failed to trigger email notification:', emailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Report approved and changes applied successfully.',
      report: updatedReport,
      appliedChanges,
    });
  } catch (error: any) {
    logger.error('[ListingReport Admin POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to moderate report' },
      { status: 500 }
    );
  }
}
