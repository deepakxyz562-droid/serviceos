import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { resolveTenantId } from '@/lib/api-auth';
import { EventBus } from '@/lib/event-bus';

// ─── POST /api/forms/responses/[id]/convert ──────────────────────────────────
// Convert a FormResponse into a CRM Lead, Job, or Customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = await params;
    const tenantId = resolveTenantId(authUser);
    const body = await request.json().catch(() => ({}));
    const target = body.target || 'lead'; // 'lead' | 'job' | 'customer'

    const response = await db.formResponse.findUnique({
      where: { id },
      include: { form: true },
    });

    if (!response) {
      return NextResponse.json({ error: 'Form response not found' }, { status: 404 });
    }

    let dataObj: Record<string, unknown> = {};
    if (typeof response.dataJson === 'string') {
      try {
        dataObj = JSON.parse(response.dataJson);
      } catch {
        dataObj = {};
      }
    } else if (response.dataJson) {
      dataObj = response.dataJson as Record<string, unknown>;
    }

    const name = String(response.respondentName || dataObj.name || dataObj.fullName || dataObj.customerName || 'Inquiry Contact');
    const phone = String(response.respondent || dataObj.phone || dataObj.phoneNumber || dataObj.mobile || '');
    const email = String(dataObj.email || (response.respondent && response.respondent.includes('@') ? response.respondent : '') || '');
    const address = String(dataObj.address || dataObj.serviceAddress || dataObj.location || '');
    const notes = String(dataObj.notes || dataObj.message || dataObj.details || dataObj.description || JSON.stringify(dataObj));
    const serviceType = String(dataObj.service || dataObj.serviceType || dataObj.trade || response.form?.name || 'General Inquiry');

    const effectiveTenantId = tenantId || response.tenantId || response.form?.tenantId || null;

    if (target === 'lead') {
      const lead = await db.lead.create({
        data: {
          name,
          phone: phone || '',
          email: email || null,
          address: address || null,
          description: `Form Submission: ${response.form?.name || 'Smart Form'}\n${notes}`,
          source: `Form: ${response.form?.name || 'Web Form'}`,
          serviceType,
          status: 'new',
          ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
          tagsJson: JSON.stringify(['form_submission', response.form?.type || 'lead_capture']),
        },
      });

      await db.formResponse.update({
        where: { id: response.id },
        data: { leadId: lead.id },
      });

      try {
        await EventBus.emit('lead.created', {
          leadId: lead.id,
          name: lead.name,
          phone: lead.phone,
          source: lead.source,
          tenantId: lead.tenantId,
          resourceType: 'lead',
          resourceId: lead.id,
          summary: `New lead converted from form: ${response.form?.name}`,
        }, { tenantId: lead.tenantId || undefined });
      } catch {}

      return NextResponse.json({
        success: true,
        message: 'Converted to Lead',
        leadId: lead.id,
        lead,
      });
    }

    if (target === 'job') {
      const job = await db.job.create({
        data: {
          title: `${serviceType} - ${name}`,
          description: `Form Submission: ${response.form?.name || 'Form'}\n${notes}`,
          customerName: name,
          customerPhone: phone || null,
          customerEmail: email || null,
          address: address || null,
          status: 'scheduled',
          priority: 'medium',
          type: 'booking',
          ...(effectiveTenantId ? { tenantId: effectiveTenantId } : {}),
        },
      });

      await db.formResponse.update({
        where: { id: response.id },
        data: { jobId: job.id },
      });

      return NextResponse.json({
        success: true,
        message: 'Converted to Job / Booking',
        jobId: job.id,
        job,
      });
    }

    return NextResponse.json({ error: `Unsupported conversion target: ${target}` }, { status: 400 });
  } catch (error) {
    console.error('Convert form response error:', error);
    return NextResponse.json({ error: 'Failed to convert response' }, { status: 500 });
  }
}
