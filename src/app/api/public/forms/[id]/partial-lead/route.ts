import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/public/forms/[id]/partial-lead
 *
 * Captures incomplete / drop-off form leads when a respondent enters
 * their email or phone number but abandons before final submission.
 *
 * Uses the existing FormResponse table with status='partial' (added in
 * Phase 6). No separate FormSubmission model is needed — a partial lead
 * is just a FormResponse that hasn't been completed yet. When the user
 * eventually submits the full form, the submit route updates the
 * existing partial row to status='completed' (matched by email/phone).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { email, phone, name, partialData } = body;

    if (!email && !phone) {
      return NextResponse.json({ skipped: true, reason: 'No contact info provided' });
    }

    const form = await db.form.findFirst({
      where: {
        OR: [{ id }, { slug: id }],
        status: { not: 'archived' },
      },
      select: {
        id: true,
        tenantId: true,
        workspaceId: true,
        name: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Upsert partial lead using FormResponse with status='partial'
    try {
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);

      // Find an existing partial response from this visitor within the last 15 min
      const existing = await db.formResponse.findFirst({
        where: {
          formId: form.id,
          status: 'partial',
          createdAt: { gte: fifteenMinsAgo },
          OR: [
            ...(email ? [{ respondent: String(email).toLowerCase().trim() }] : []),
            ...(phone ? [{ respondent: String(phone).trim() }] : []),
          ],
        },
      });

      const mergedData = {
        ...(partialData || {}),
        ...(email ? { email: String(email).toLowerCase().trim() } : {}),
        ...(phone ? { phone: String(phone).trim() } : {}),
        ...(name ? { name: String(name).trim() } : {}),
        _isPartialDropoff: true,
        _lastActivity: new Date().toISOString(),
      };

      if (existing) {
        // Update the existing partial response with the latest data
        const prevData = (() => {
          try { return JSON.parse(existing.dataJson || '{}'); } catch { return {}; }
        })();

        await db.formResponse.update({
          where: { id: existing.id },
          data: {
            dataJson: JSON.stringify({ ...prevData, ...mergedData }),
            respondent: email || phone || existing.respondent,
            respondentName: name || existing.respondentName,
            startedAt: existing.startedAt || existing.createdAt,
          },
        });
      } else {
        // Create a new partial response record
        await db.formResponse.create({
          data: {
            formId: form.id,
            tenantId: form.tenantId,
            workspaceId: form.workspaceId,
            status: 'partial',
            source: 'partial_lead_capture',
            respondent: email || phone || null,
            respondentName: name || null,
            dataJson: JSON.stringify(mergedData),
            startedAt: new Date(),
          },
        });
      }
    } catch (dbErr) {
      console.warn('[partial-lead] Database capture error (non-fatal):', dbErr);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to record partial lead', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
