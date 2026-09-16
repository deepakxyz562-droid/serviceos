import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * POST /api/public/forms/[id]/partial-lead
 *
 * Captures incomplete / drop-off form leads when a respondent enters
 * their email or phone number but abandons before final submission.
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
        name: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    // Upsert or log partial lead in FormSubmission or Lead table
    try {
      // Check if a recent partial submission exists within 15 minutes
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      const existing = await db.formSubmission.findFirst({
        where: {
          formId: form.id,
          status: 'partial',
          createdAt: { gte: fifteenMinsAgo },
          OR: [
            ...(email ? [{ respondentEmail: String(email).toLowerCase().trim() }] : []),
            ...(phone ? [{ respondentPhone: String(phone).trim() }] : []),
          ],
        },
      });

      if (existing) {
        // Update partial data
        await db.formSubmission.update({
          where: { id: existing.id },
          data: {
            dataJson: JSON.stringify({
              ...JSON.parse(existing.dataJson || '{}'),
              ...partialData,
              _isPartialDropoff: true,
              _lastActivity: new Date().toISOString(),
            }),
          },
        });
      } else {
        // Create new partial drop-off record
        await db.formSubmission.create({
          data: {
            formId: form.id,
            tenantId: form.tenantId,
            status: 'partial',
            source: 'partial_lead_capture',
            respondentEmail: email ? String(email).toLowerCase().trim() : null,
            respondentPhone: phone ? String(phone).trim() : null,
            respondentName: name ? String(name).trim() : null,
            dataJson: JSON.stringify({
              ...partialData,
              _isPartialDropoff: true,
              _capturedAt: new Date().toISOString(),
            }),
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
