import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { EventBus } from '@/lib/event-bus';
import { sendEmail } from '@/lib/email-send';
import { notifyOwner } from '@/lib/owner-notifications';

// GET /api/leads - List leads with optional status filter
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const source = searchParams.get('source');
    const priority = searchParams.get('priority');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search');

    // Build where clause - use tenantId if authenticated, otherwise show all
    const where: Record<string, unknown> = {};
    if (authUser?.tenantId) {
      where.tenantId = authUser.tenantId;
    }

    if (status) {
      where.status = status;
    }
    if (source) {
      where.source = source;
    }
    if (priority) {
      where.priority = priority;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      db.lead.findMany({
        where,
        include: {
          assignedTo: {
            select: { id: true, name: true, phone: true, avatar: true },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          job: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.lead.count({ where }),
    ]);

    return NextResponse.json({
      leads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List leads error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

// POST /api/leads - Create a new lead
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();

    const body = await request.json();
    const {
      name,
      phone,
      email,
      source,
      status,
      priority,
      value,
      description,
      address,
      serviceType,
      serviceId,
      assignedToId,
      notesJson,
      tagsJson,
      followUpAt,
    } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Name and phone are required' },
        { status: 400 }
      );
    }

    const lead = await db.lead.create({
      data: {
        name,
        phone,
        email: email || null,
        source: source || 'manual',
        status: status || 'new',
        priority: priority || 'medium',
        value: value || 0,
        description: description || null,
        address: address || null,
        serviceType: serviceType || null,
        serviceId: serviceId || null,
        assignedToId: assignedToId || null,
        tenantId: authUser?.tenantId || null,
        notesJson: notesJson || '[]',
        tagsJson: tagsJson || '[]',
        followUpAt: followUpAt ? new Date(followUpAt) : null,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, phone: true, avatar: true },
        },
      },
    });

    // Emit lead.created event via EventBus
    try {
      await EventBus.emit('lead.created', {
        leadId: lead.id,
        name: lead.name,
        phone: lead.phone,
        source: lead.source,
        status: lead.status,
        serviceType: lead.serviceType,
        tenantId: lead.tenantId,
        resourceType: 'lead',
        resourceId: lead.id,
        summary: `New lead: ${lead.name} (${lead.source})`,
      }, { tenantId: lead.tenantId || undefined });
    } catch (eventErr) {
      console.error('[LeadsCreate] Failed to emit lead.created event:', eventErr);
    }

    // ─── Send "New Lead" email notification to the tenant owner / tenant email ──
    // Resolved in this order:
    //   1. Tenant.email (company email)
    //   2. Owner user's email (role='owner' on this tenant)
    //   3. The authenticated user's email (the creator — at least they get a copy)
    // We use the transactional email provider (AWS SES / SMTP) configured for the tenant.
    // If no provider is configured, sendEmail() returns simulated:true so the lead
    // creation flow never breaks — the email is just logged to the server console.
    try {
      if (lead.tenantId) {
        const tenant = await db.tenant.findUnique({
          where: { id: lead.tenantId },
          select: { id: true, name: true, email: true },
        });

        let notifyEmail: string | null = tenant?.email || null;
        let notifyName: string = tenant?.name || 'Team';

        if (!notifyEmail) {
          // Fall back to the tenant's owner user
          const owner = await db.user.findFirst({
            where: { tenantId: lead.tenantId, role: 'owner', isActive: true },
            select: { email: true, name: true },
          });
          if (owner) {
            notifyEmail = owner.email;
            notifyName = owner.name || notifyName;
          }
        }

        if (!notifyEmail && authUser?.email) {
          // Last resort: the creator's email
          notifyEmail = authUser.email;
          notifyName = authUser.name || notifyName;
        }

        if (notifyEmail) {
          const leadValue = lead.value
            ? `$${Number(lead.value).toLocaleString()}`
            : 'Not specified';

          const subject = `🎯 New Lead: ${lead.name}`;
          const html = [
            `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">`,
            `<h2 style="color: #10b981; margin-bottom: 16px;">🎯 New Lead Received</h2>`,
            `<p style="font-size: 16px; color: #374151;">Hi ${notifyName},</p>`,
            `<p style="font-size: 16px; color: #374151;">A new lead has been created in your ServiceOS workspace. Here are the details:</p>`,
            `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">`,
            `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; width: 35%; border: 1px solid #e5e7eb;">Name</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.name}</td></tr>`,
            `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Phone</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.phone}</td></tr>`,
            `${lead.email ? `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Email</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.email}</td></tr>` : ''}`,
            `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Source</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.source}</td></tr>`,
            `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Service</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.serviceType || 'Not specified'}</td></tr>`,
            `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Priority</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.priority}</td></tr>`,
            `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb;">Estimated Value</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${leadValue}</td></tr>`,
            `${lead.description ? `<tr><td style="padding: 10px; background: #f9fafb; font-weight: 600; border: 1px solid #e5e7eb; vertical-align: top;">Description</td><td style="padding: 10px; border: 1px solid #e5e7eb;">${lead.description}</td></tr>` : ''}`,
            `</table>`,
            `<p style="font-size: 14px; color: #6b7280; margin-top: 24px;">Follow up promptly to maximize conversion!</p>`,
            `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />`,
            `<p style="font-size: 12px; color: #9ca3af;">— Sent from ServiceOS</p>`,
            `</div>`,
          ].join('\n');

          const text = `New Lead Received\n\nName: ${lead.name}\nPhone: ${lead.phone}\n${lead.email ? `Email: ${lead.email}\n` : ''}Source: ${lead.source}\nService: ${lead.serviceType || 'N/A'}\nPriority: ${lead.priority}\nEstimated Value: ${leadValue}\n${lead.description ? `\nDescription: ${lead.description}\n` : ''}\nFollow up promptly!\n\n— Sent from ServiceOS`;

          const result = await sendEmail({
            to: notifyEmail,
            subject,
            html,
            text,
            usageType: 'transactional',
          });

          if (result.simulated) {
            console.log(`[LeadsCreate] Email SIMULATED to ${notifyEmail} (no real provider configured)`);
          } else if (!result.success) {
            console.error(`[LeadsCreate] Failed to send lead email to ${notifyEmail}:`, result.error);
          } else {
            console.log(`[LeadsCreate] Lead email sent to ${notifyEmail} via ${result.providerUsed}`);
          }
        }
      }
    } catch (emailErr) {
      // Email failure must NOT break the lead creation flow — just log it
      console.error('[LeadsCreate] Lead email notification failed:', emailErr);
    }

    // ─── Send WhatsApp notification to the tenant owner ──────────────
    // Independent of email: even if email failed/simulated, WhatsApp still fires.
    try {
      if (lead.tenantId) {
        const leadValueStr = lead.value
          ? `$${Number(lead.value).toLocaleString()}`
          : 'N/A';
        const waMessage = [
          '🎯 *New Lead Received*',
          '',
          `*Name:* ${lead.name}`,
          `*Phone:* ${lead.phone}`,
          lead.email ? `*Email:* ${lead.email}` : '',
          `*Source:* ${lead.source}`,
          `*Service:* ${lead.serviceType || 'N/A'}`,
          `*Priority:* ${lead.priority}`,
          `*Value:* ${leadValueStr}`,
          lead.description ? `*Notes:* ${lead.description.slice(0, 120)}` : '',
          '',
          'Follow up promptly to maximize conversion!',
        ].filter(Boolean).join('\n');

        await notifyOwner(lead.tenantId, {
          eventType: 'lead.created',
          eventLabel: 'New Lead',
          whatsappMessage: waMessage,
          leadId: lead.id,
        });
      }
    } catch (waErr) {
      console.error('[LeadsCreate] Owner WhatsApp notification failed:', waErr);
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}
