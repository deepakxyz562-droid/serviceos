import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';

/**
 * GET /api/forms/dashboard-stats
 *
 * Returns aggregate stats for the Forms dashboard:
 * - total forms, total submissions, conversion rate, active forms
 * - AI agent status (none/draft/active/paused)
 * - KB document count
 * - 5 most recent submissions
 *
 * Scoped to the caller's workspaceId (primary) or tenantId (backward compat).
 */
export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = auth.user;

  const workspaceId = user.workspaceId;
  const tenantId = user.tenantId;

  // Build the where clause — prefer workspaceId, fall back to tenantId.
  const formWhere: Record<string, unknown> = {
    OR: [
      ...(workspaceId ? [{ workspaceId }] : []),
      ...(tenantId ? [{ tenantId }] : []),
    ],
  };
  if (!formWhere.OR.length) {
    return NextResponse.json({ error: 'No workspace access' }, { status: 403 });
  }

  // Total forms + active forms
  const [totalForms, activeForms] = await Promise.all([
    db.form.count({ where: formWhere }),
    db.form.count({ where: { ...formWhere, status: 'active' } }),
  ]);

  // Total submissions across all forms in scope
  const forms = await db.form.findMany({
    where: formWhere,
    select: { id: true, name: true },
  });
  const formIds = forms.map((f) => f.id);

  const totalSubmissions = formIds.length
    ? await db.formResponse.count({ where: { formId: { in: formIds } } })
    : 0;

  // Conversion rate (denormalized on Form.conversionRate — average across forms)
  const conversionRates = formIds.length
    ? await db.form.aggregate({
        where: formWhere,
        _avg: { conversionRate: true },
      })
    : { _avg: { conversionRate: 0 } };

  // Recent submissions (5)
  const recentSubmissions = formIds.length
    ? await db.formResponse.findMany({
        where: { formId: { in: formIds } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          respondent: true,
          formId: true,
          source: true,
          createdAt: true,
          leadId: true,
        },
      })
    : [];

  // Map formId → form name
  const formNameMap = new Map(forms.map((f) => [f.id, f.name]));

  // AI agent status — check AiReceptionist for the workspace/tenant
  const aiReceptionist = await db.aiReceptionist.findFirst({
    where: {
      OR: [
        ...(workspaceId ? [{ workspaceId }] : []),
        ...(tenantId ? [{ tenantId }] : []),
      ],
    },
    select: { status: true },
  });

  const aiAgentStatus: 'none' | 'draft' | 'active' | 'paused' =
    !aiReceptionist ? 'none' :
    aiReceptionist.status === 'ACTIVE' ? 'active' :
    aiReceptionist.status === 'DRAFT' ? 'draft' :
    aiReceptionist.status === 'PAUSED' ? 'paused' :
    aiReceptionist.status === 'ARCHIVED' ? 'paused' : 'none';

  // KB document count
  const kbDocuments = await db.aiKnowledgeDocument.count({
    where: {
      OR: [
        ...(workspaceId ? [{ workspaceId }] : []),
        ...(tenantId ? [{ tenantId }] : []),
      ],
    },
  });

  return NextResponse.json({
    totalForms,
    totalSubmissions,
    conversionRate: (conversionRates._avg.conversionRate || 0) * 100,
    activeForms,
    aiAgentStatus,
    kbDocuments,
    recentSubmissions: recentSubmissions.map((s) => ({
      id: s.id,
      respondent: s.respondent,
      formName: formNameMap.get(s.formId) || 'Unknown',
      source: s.source,
      createdAt: s.createdAt.toISOString(),
      hasLead: !!s.leadId,
    })),
  });
}
