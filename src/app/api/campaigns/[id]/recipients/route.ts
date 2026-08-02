import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/campaigns/[id]/recipients
 * Body: { contactId: string }
 *
 * Registers a contact as a recipient of a marketing campaign by creating
 * a CampaignMessage row with status='pending'. The row stores the
 * recipient's phone/name so the campaign can later dispatch without
 * re-resolving the contact. Re-adding the same contact/phone to the
 * same campaign is idempotent — we first check for an existing row and
 * return it without creating a duplicate.
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!authUser.tenantId) {
      return NextResponse.json({ error: 'No tenant context' }, { status: 403 });
    }

    const { id: campaignId } = await params;
    const body = await request.json().catch(() => ({}));
    const contactId = typeof body?.contactId === 'string' ? body.contactId.trim() : '';

    if (!contactId) {
      return NextResponse.json({ error: 'contactId is required' }, { status: 400 });
    }

    // Verify the campaign exists. Campaign.tenantId is optional but if it is
    // set, ensure it matches the user's tenant.
    const campaign = await db.campaign.findUnique({ where: { id: campaignId } });
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.tenantId && campaign.tenantId !== authUser.tenantId) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    // Verify the contact exists under the user's tenant.
    const contact = await db.contact.findFirst({
      where: { id: contactId, tenantId: authUser.tenantId },
      select: { id: true, name: true, phone: true, email: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const recipientPhone = (contact.phone || '').trim();
    if (!recipientPhone) {
      return NextResponse.json(
        { error: 'Contact has no phone number — cannot add as campaign recipient' },
        { status: 400 }
      );
    }

    // Idempotency: if there's already a CampaignMessage for this campaign
    // and recipientId (or phone), return it without creating a duplicate.
    const existing = await db.campaignMessage.findFirst({
      where: {
        campaignId,
        OR: [{ recipientId: contactId }, { recipientPhone }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { data: existing, alreadyRecipient: true },
        { status: 200 }
      );
    }

    const message = await db.campaignMessage.create({
      data: {
        campaignId,
        recipientId: contactId,
        recipientPhone,
        recipientName: contact.name || null,
        status: 'pending',
      },
    });

    // Best-effort: bump totalRecipients on the campaign.
    try {
      await db.campaign.update({
        where: { id: campaignId },
        data: { totalRecipients: { increment: 1 } },
      });
    } catch {
      // Non-fatal — count sync is best-effort.
    }

    return NextResponse.json(
      { data: message, alreadyRecipient: false },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error adding contact to campaign:', error);
    return NextResponse.json(
      { error: 'Failed to add contact to campaign' },
      { status: 500 }
    );
  }
}
