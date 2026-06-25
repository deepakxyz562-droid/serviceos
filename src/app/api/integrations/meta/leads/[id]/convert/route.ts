import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/integrations/meta/leads/[id]/convert
 * Converts a Meta lead into a CRM Contact (+ a CRM Lead) and marks the
 * MetaLead as converted.
 *
 * Flow:
 *   1. Auth check + load MetaLead (must belong to tenant).
 *   2. If already converted (convertedContactId set), return 400.
 *   3. Create a Contact with source='ads'.
 *   4. Create a CRM Lead with source='meta_ads'.
 *   5. Update the MetaLead: leadStatus='converted', convertedContactId,
 *      processedAt=now.
 *   6. Return { contactId, leadId }.
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

    const lead = await db.metaLead.findFirst({
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

    // Create the Contact (CRM subscriber record) from the Meta lead data.
    const contact = await db.contact.create({
      data: {
        name: contactName,
        email: lead.email,
        phone: lead.phone,
        city: lead.city,
        country: lead.country,
        source: 'ads',
        status: 'active',
        tenantId,
        workspaceId: user.workspaceId || null,
      },
    });

    // Also create a CRM Lead so sales reps see it in their pipeline.
    const crmLead = await db.lead.create({
      data: {
        name: contactName,
        phone: lead.phone || '',
        email: lead.email,
        source: 'meta_ads',
        tenantId,
        description: `Converted from Meta lead form: ${
          lead.formName || lead.formId
        }`,
      },
    });

    // Mark the MetaLead as converted + link back to the Contact.
    await db.metaLead.update({
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
    console.error('Error converting Meta lead:', error);
    return NextResponse.json(
      { error: 'Failed to convert Meta lead' },
      { status: 500 }
    );
  }
}
