import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveTenantId, resolveWorkspaceId } from '@/lib/api-auth';

// ─── Helper: Parse JSON safely ────────────────────────────────────────────────
function safeParseJson<T>(val: string | null | undefined, fallback: T): T {
  if (!val) return fallback;
  try {
    return JSON.parse(val) as T;
  } catch {
    return fallback;
  }
}

// ─── Helper: Convert to CSV ───────────────────────────────────────────────────
function generateCsv(responses: Array<Record<string, unknown>>): string {
  if (!responses.length) return 'ID,Form Name,Respondent Name,Respondent Contact,Source,Submitted At,Data Summary\n';

  const headers = ['ID', 'Form Name', 'Form Type', 'Respondent Name', 'Contact Info', 'Source', 'Lead Created', 'Job Created', 'Submitted At', 'Submission Data'];
  
  const rows = responses.map((r) => {
    const form = (r.form as Record<string, unknown>) || {};
    const dataObj = typeof r.dataJson === 'string' ? safeParseJson<Record<string, unknown>>(r.dataJson, {}) : (r.dataJson || {});
    const dataSummary = Object.entries(dataObj)
      .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' | ')
      .replace(/"/g, '""');

    return [
      `"${r.id || ''}"`,
      `"${String(form.name || 'Unknown Form').replace(/"/g, '""')}"`,
      `"${String(form.type || 'standard').replace(/"/g, '""')}"`,
      `"${String(r.respondentName || '').replace(/"/g, '""')}"`,
      `"${String(r.respondent || '').replace(/"/g, '""')}"`,
      `"${String(r.source || 'direct').replace(/"/g, '""')}"`,
      `"${r.leadId ? 'Yes' : 'No'}"`,
      `"${r.jobId || r.bookingId ? 'Yes' : 'No'}"`,
      `"${r.createdAt ? new Date(r.createdAt as string).toISOString() : ''}"`,
      `"${dataSummary}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

// ─── GET /api/forms/responses ─────────────────────────────────────────────────
// Cross-form submissions inbox & data store for a tenant.
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = resolveTenantId(authUser, searchParams.get('tenantId'));
    const workspaceId = resolveWorkspaceId(authUser, searchParams.get('workspaceId'));
    const formId = searchParams.get('formId');
    const source = searchParams.get('source');
    const status = searchParams.get('status'); // 'new', 'with_lead', 'with_job', 'all'
    const search = searchParams.get('search');
    const isExportCsv = searchParams.get('export') === 'csv';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = isExportCsv ? 2000 : Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25')));

    const where: Record<string, unknown> = {};

    // Tenant isolation: Match directly by tenantId or by the form's tenantId
    if (tenantId) {
      where.OR = [
        { tenantId },
        { form: { tenantId } },
      ];
    } else if (workspaceId) {
      where.form = { workspaceId };
    }

    if (formId && formId !== 'all') {
      where.formId = formId;
    }

    if (source && source !== 'all') {
      where.source = source;
    }

    if (status === 'new') {
      where.leadId = null;
      where.jobId = null;
    } else if (status === 'with_lead') {
      where.leadId = { not: null };
    } else if (status === 'with_job') {
      where.OR = [
        { jobId: { not: null } },
        { bookingId: { not: null } },
      ];
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { respondentName: { contains: q } },
        { respondent: { contains: q } },
        { dataJson: { contains: q } },
      ];
    }

    // Fetch responses and stats concurrently
    const [responses, total, statsAll, statsWithLead, statsWithJob] = await Promise.all([
      db.formResponse.findMany({
        where,
        include: {
          form: {
            select: {
              id: true,
              name: true,
              type: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: isExportCsv ? 0 : (page - 1) * limit,
        take: limit,
      }),
      db.formResponse.count({ where }),
      tenantId ? db.formResponse.count({ where: { OR: [{ tenantId }, { form: { tenantId } }] } }) : 0,
      tenantId ? db.formResponse.count({ where: { OR: [{ tenantId }, { form: { tenantId } }], leadId: { not: null } } }) : 0,
      tenantId ? db.formResponse.count({ where: { OR: [{ tenantId }, { form: { tenantId } }], jobId: { not: null } } }) : 0,
    ]);

    // Handle CSV Export
    if (isExportCsv) {
      const csvData = generateCsv(responses as unknown as Array<Record<string, unknown>>);
      const filename = `form-submissions-${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    // Format responses for response table
    const formattedResponses = responses.map((r) => {
      const dataObj = safeParseJson<Record<string, unknown>>(r.dataJson, {});
      return {
        id: r.id,
        formId: r.formId,
        form: r.form || { id: r.formId, name: 'Untitled Form', type: 'lead_capture' },
        respondentName: r.respondentName || (dataObj.name as string) || (dataObj.fullName as string) || 'Anonymous Visitor',
        respondent: r.respondent || (dataObj.email as string) || (dataObj.phone as string) || null,
        data: dataObj,
        source: r.source || 'direct',
        leadId: r.leadId,
        customerId: r.customerId,
        jobId: r.jobId || r.bookingId,
        quoteId: r.quoteId,
        actionsResults: safeParseJson<Record<string, unknown>>(r.actionsResultsJson, {}),
        createdAt: r.createdAt,
      };
    });

    return NextResponse.json({
      responses: formattedResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      stats: {
        total: statsAll,
        convertedLeads: statsWithLead,
        convertedJobs: statsWithJob,
        newUnread: Math.max(0, statsAll - statsWithLead - statsWithJob),
      },
    });
  } catch (error) {
    console.error('List cross-form responses error:', error);
    return NextResponse.json({ error: 'Failed to fetch form responses' }, { status: 500 });
  }
}

// ─── DELETE /api/forms/responses ──────────────────────────────────────────────
// Delete one or multiple form response records
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await db.formResponse.delete({ where: { id } });
      return NextResponse.json({ success: true, message: 'Submission deleted' });
    }

    const body = await request.json().catch(() => ({}));
    const ids: string[] = body.ids || [];

    if (ids.length > 0) {
      await db.formResponse.deleteMany({
        where: { id: { in: ids } },
      });
      return NextResponse.json({ success: true, message: `${ids.length} submissions deleted` });
    }

    return NextResponse.json({ error: 'Submission ID or IDs required' }, { status: 400 });
  } catch (error) {
    console.error('Delete form response error:', error);
    return NextResponse.json({ error: 'Failed to delete submission' }, { status: 500 });
  }
}
