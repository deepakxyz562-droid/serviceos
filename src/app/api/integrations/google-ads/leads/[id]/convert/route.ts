import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/integrations/google-ads/leads/[id]/convert
 * Converts a Google Ads lead into a CRM Contact (+ a CRM Lead) and marks
 * the GoogleAdsLead as converted.
 *
 * Flow:
 *   1. Auth check + load GoogleAdsLead (must belong to tenant).
 *   2. If not found → 404.
 *   3. If already converted (convertedContactId set) → 400.
 *   4. Create a Contact with source='ads'.
 *   5. Create a CRM Lead with source='google_ads'.
 *   6. Update the GoogleAdsLead: leadStatus='converted',
 *      convertedContactId, processedAt=now.
 *   7. Return { contactId, leadId }.
 *
 * Note: the [id] route param is a Promise in Next.js 16 route handlers.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = user.tenantId || 'default';
    const { id } = await params;

    const lead = await db.googleAdsLead.findFirst({
      where: { id, tenantId },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.convertedContactId) {
      return NextResponse.json(
        { error: 'Lead already converted' },
        { status: 400 }
      );
    }

    const contactName = lead.contactName || 'Unknown';
    const formRef = lead.formName || lead.formId || '';

    // Create the Contact (CRM subscriber record) from the Google Ads lead.
    const contact = await db.contact.create({
      data: {
        name: contactName,
        email: lead.email,
        phone: lead.phone,
        zip: lead.postalCode,
        source: 'ads',
        status: 'active',
        tenantId,
      },
    });

    // Also create a CRM Lead so sales reps see it in their pipeline.
    const crmLead = await db.lead.create({
      data: {
        name: contactName,
        phone: lead.phone || '',
        email: lead.email,
        source: 'google_ads',
        tenantId,
        description: `Converted from Google Ads lead form: ${formRef}`,
      },
    });

    // Mark the GoogleAdsLead as converted + link back to the Contact.
    await db.googleAdsLead.update({
      where: { id: lead.id },
      data: {
        leadStatus: 'converted',
        convertedContactId: contact.id,
        processedAt: new Date(),
      },
    });

    return NextResponse.json(
      { contactId: contact.id, leadId: crmLead.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error converting Google Ads lead:', error);
    return NextResponse.json(
      { error: 'Failed to convert Google Ads lead' },
      { status: 500 }
    );
  }
}
