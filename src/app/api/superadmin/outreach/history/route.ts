import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/superadmin/outreach/history?tenantId=X&page=1&limit=20
 * --------------------------------------------------------------
 * Paginated list of EmailCommunication rows for a tenant, newest first.
 *
 * Auth: superadmin only (`isSuperAdminRequest()` + `getAuthUser()`).
 *
 * Query params:
 *   tenantId — required, the tenant whose outreach history to fetch
 *   page     — optional, 1-based page index (default 1, min 1)
 *   limit    — optional, page size (default 20, max 100, min 1)
 *
 * The `sentByUserId` column is a plain String (no Prisma relation), so we
 * manually batch-fetch the User rows (id, name, email) and merge them into
 * the response as `sentByName`.
 *
 * Response:
 *   {
 *     communications: [{
 *       id, tenantId, recipientEmail, recipientName, templateId,
 *       subject, status, providerMessageId, sentByUserId, sentByName,
 *       sentAt, deliveredAt, bouncedAt, bouncedReason, complainedAt,
 *       createdAt
 *     }],
 *     total: number,
 *     page: number,
 *     limit: number
 *   }
 *
 * Status codes:
 *   200 — ok
 *   400 — missing/invalid tenantId or pagination params
 *   401 — not authenticated
 *   403 — not superadmin
 *   500 — unexpected DB error
 */

interface HistoryRow {
  id: string;
  tenantId: string;
  recipientEmail: string;
  recipientName: string | null;
  templateId: string | null;
  subject: string;
  status: string;
  providerMessageId: string | null;
  sentByUserId: string;
  sentAt: Date | null;
  deliveredAt: Date | null;
  bouncedAt: Date | null;
  bouncedReason: string | null;
  complainedAt: Date | null;
  createdAt: Date;
}

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export async function GET(request: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json(
      { error: 'Forbidden — SuperAdmin access required' },
      { status: 403 },
    );
  }

  // ── Parse query params ─────────────────────────────────────────────────
  const sp = request.nextUrl.searchParams;
  const tenantId = sp.get('tenantId');
  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenantId query parameter is required' },
      { status: 400 },
    );
  }

  const page = parsePositiveInt(sp.get('page'), 1, 100000);
  const limit = parsePositiveInt(sp.get('limit'), 20, 100);

  // ── Fetch communications + total count in parallel ─────────────────────
  let rows: HistoryRow[];
  let total: number;
  try {
    [rows, total] = await Promise.all([
      db.emailCommunication.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          tenantId: true,
          recipientEmail: true,
          recipientName: true,
          templateId: true,
          subject: true,
          status: true,
          providerMessageId: true,
          sentByUserId: true,
          sentAt: true,
          deliveredAt: true,
          bouncedAt: true,
          bouncedReason: true,
          complainedAt: true,
          createdAt: true,
        },
      }),
      db.emailCommunication.count({ where: { tenantId } }),
    ]);
  } catch (err) {
    console.error('[outreach/history] DB error:', err);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }

  // ── Batch-fetch sender User rows ───────────────────────────────────────
  const userIds = Array.from(new Set(rows.map((r) => r.sentByUserId).filter(Boolean)));
  const userMap = new Map<string, { name: string | null; email: string }>();
  if (userIds.length > 0) {
    try {
      const users = await db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      });
      for (const u of users) {
        userMap.set(u.id, { name: u.name, email: u.email });
      }
    } catch (err) {
      // Non-fatal — we just won't have sender names.
      console.error('[outreach/history] failed to load users:', err);
    }
  }

  // ── Assemble response ──────────────────────────────────────────────────
  const communications = rows.map((r) => {
    const sender = userMap.get(r.sentByUserId);
    return {
      id: r.id,
      tenantId: r.tenantId,
      recipientEmail: r.recipientEmail,
      recipientName: r.recipientName,
      templateId: r.templateId,
      subject: r.subject,
      status: r.status,
      providerMessageId: r.providerMessageId,
      sentByUserId: r.sentByUserId,
      sentByName: sender?.name ?? null,
      sentByEmail: sender?.email ?? null,
      sentAt: r.sentAt?.toISOString() ?? null,
      deliveredAt: r.deliveredAt?.toISOString() ?? null,
      bouncedAt: r.bouncedAt?.toISOString() ?? null,
      bouncedReason: r.bouncedReason,
      complainedAt: r.complainedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    };
  });

  return NextResponse.json({
    communications,
    total,
    page,
    limit,
  });
}
