import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/api-auth';
import { isSuperAdminUser } from '@/lib/admin-auth';

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
 * SuperAdmins receive platform-wide aggregate stats without PostgREST URI length overflow.
 */
export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.ok) return auth.response;
  const user = auth.user;
  const isSuperAdmin = isSuperAdminUser(user);

  const workspaceId = user.workspaceId;
  const tenantId = user.tenantId;

  // Build the where clause — prefer workspaceId, fall back to tenantId.
  const scopeOR = [
    ...(workspaceId ? [{ workspaceId }] : []),
    ...(tenantId ? [{ tenantId }] : []),
  ] as const;

  if (!scopeOR.length && !isSuperAdmin) {
    return NextResponse.json({ error: 'No workspace access' }, { status: 403 });
  }

  const formWhere = scopeOR.length ? { OR: [...scopeOR] } : {};

  // Total forms + active forms
  const [totalForms, activeForms] = await Promise.all([
    db.form.count({ where: formWhere }),
    db.form.count({ where: { ...formWhere, status: 'active' } }),
  ]);

  // Fetch form IDs for mapping & localized scoping (capped at 500 to prevent PostgREST URL overflow)
  const forms = await db.form.findMany({
    where: formWhere,
    select: { id: true, name: true },
    take: 500,
  });
  const formIds = forms.map((f) => f.id);
  const formNameMap = new Map(forms.map((f) => [f.id, f.name]));

  // Total submissions across forms in scope
  let totalSubmissions = 0;
  if (!scopeOR.length && isSuperAdmin) {
    totalSubmissions = await db.formResponse.count({ where: {} });
  } else if (formIds.length > 0) {
    if (formIds.length <= 100) {
      totalSubmissions = await db.formResponse.count({ where: { formId: { in: formIds } } });
    } else {
      let sum = 0;
      for (let i = 0; i < formIds.length; i += 100) {
        const chunk = formIds.slice(i, i + 100);
        sum += await db.formResponse.count({ where: { formId: { in: chunk } } });
      }
      totalSubmissions = sum;
    }
  }

  // Conversion rate (denormalized on Form.conversionRate — average across forms)
  const conversionRates = (isSuperAdmin || formIds.length > 0)
    ? await db.form.aggregate({
        where: formWhere,
        _avg: { conversionRate: true },
      })
    : { _avg: { conversionRate: 0 } };

  // Recent submissions (5)
  const submissionWhere = (!scopeOR.length && isSuperAdmin)
    ? {}
    : formIds.length > 0
    ? { formId: { in: formIds.slice(0, 100) } }
    : null;

  const recentSubmissions = submissionWhere
    ? await db.formResponse.findMany({
        where: submissionWhere,
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

  // AI agent status — check AiReceptionist for the workspace/tenant
  const aiReceptionist = await db.aiReceptionist.findFirst({
    where: scopeOR.length
      ? {
          OR: [
            ...(workspaceId ? [{ workspaceId }] : []),
            ...(tenantId ? [{ tenantId }] : []),
          ],
        }
      : undefined,
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
    where: scopeOR.length
      ? {
          OR: [
            ...(workspaceId ? [{ workspaceId }] : []),
            ...(tenantId ? [{ tenantId }] : []),
          ],
        }
      : undefined,
  });

  // Appointments / Bookings stats (Calendly Engine)
  let totalBookings = 0;
  let upcomingBookings: any[] = [];

  const bookingWhere = (!scopeOR.length && isSuperAdmin)
    ? {}
    : tenantId
    ? { tenantId }
    : formIds.length > 0
    ? { formId: { in: formIds.slice(0, 100) } }
    : null;

  if (bookingWhere) {
    try {
      const [bCount, bList] = await Promise.all([
        db.booking.count({ where: bookingWhere }),
        db.booking.findMany({
          where: {
            ...bookingWhere,
            scheduledAt: { gte: new Date() },
            status: { in: ['confirmed', 'pending', 'scheduled'] },
          },
          take: 5,
          orderBy: { scheduledAt: 'asc' },
          select: {
            id: true,
            title: true,
            customerName: true,
            customerEmail: true,
            customerPhone: true,
            scheduledAt: true,
            scheduledEndTime: true,
            status: true,
            source: true,
          },
        }),
      ]);
      totalBookings = bCount;
      upcomingBookings = bList;
    } catch {
      // non-fatal
    }
  }

  // Live Chat waiting and active count
  let waitingChatsCount = 0;
  let activeChatsCount = 0;

  const chatWhere = (!scopeOR.length && isSuperAdmin)
    ? {}
    : tenantId
    ? { tenantId }
    : workspaceId
    ? { workspaceId }
    : formIds.length > 0
    ? { formId: { in: formIds.slice(0, 100) } }
    : null;

  if (chatWhere) {
    try {
      const [waiting, active] = await Promise.all([
        db.publicChatSession.count({
          where: {
            ...chatWhere,
            status: 'waiting_for_agent',
          },
        }),
        db.publicChatSession.count({
          where: {
            ...chatWhere,
            status: { in: ['active', 'claimed', 'waiting_for_agent'] },
          },
        }),
      ]);
      waitingChatsCount = waiting;
      activeChatsCount = active;
    } catch {
      // non-fatal
    }
  }

  const rawAvg = conversionRates?._avg?.conversionRate ?? 0;

  return NextResponse.json({
    totalForms,
    totalSubmissions,
    totalBookings,
    waitingChatsCount,
    activeChatsCount,
    upcomingBookings: upcomingBookings.map((b) => ({
      id: b.id,
      title: b.title || 'Scheduled Appointment',
      customerName: b.customerName || 'Customer',
      customerEmail: b.customerEmail || '',
      customerPhone: b.customerPhone || '',
      scheduledAt: b.scheduledAt
        ? typeof b.scheduledAt === 'string'
          ? b.scheduledAt
          : (b.scheduledAt as any)?.toISOString?.() || new Date(b.scheduledAt).toISOString()
        : null,
      status: b.status || 'confirmed',
      source: b.source || 'form',
    })),
    conversionRate: rawAvg * 100,
    activeForms,
    aiAgentStatus,
    kbDocuments,
    recentSubmissions: recentSubmissions.map((s) => ({
      id: s.id,
      respondent: s.respondent,
      formName: formNameMap.get(s.formId) || 'Unknown',
      source: s.source,
      createdAt: typeof s.createdAt === 'string'
        ? s.createdAt
        : (s.createdAt as any)?.toISOString?.() || new Date(s.createdAt).toISOString(),
      hasLead: !!s.leadId,
    })),
  });
}
