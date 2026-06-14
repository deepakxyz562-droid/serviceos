import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

const DEFAULT_TENANT_ID = 'cmq9m3wje0002oy0x8oenckvq';
const DEFAULT_WORKSPACE_ID = 'cmq9m3xrx000coy0xd1nvdbgf';
const DEFAULT_USER_ID = 'cmq9m3ww30004oy0xkpbwt6zv';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const tenantId = body.tenantId || DEFAULT_TENANT_ID;
  const workspaceId = body.workspaceId || DEFAULT_WORKSPACE_ID;
  const userId = body.userId || DEFAULT_USER_ID;

  const counts = {
    broadcasts: 0,
    campaigns: 0,
    campaignTemplates: 0,
    bookings: 0,
    customerPortalSessions: 0,
    customers: 0,
    employees: 0,
    services: 0,
  };

  const errors: string[] = [];

  // ─── Helper: ensure customers exist ─────────────────────────────
  let customerIds: string[] = [];
  try {
    const existingCustomers = await db.customer.findMany({
      where: { workspaceId },
      take: 2,
      orderBy: { createdAt: 'asc' },
    });

    if (existingCustomers.length >= 2) {
      customerIds = existingCustomers.map((c) => c.id);
    } else {
      const customerData = [
        {
          name: 'Alice Johnson',
          phone: '+15551234567',
          email: 'alice@example.com',
          address: '123 Main St, Springfield',
          workspaceId,
        },
        {
          name: 'Bob Martinez',
          phone: '+15559876543',
          email: 'bob@example.com',
          address: '456 Oak Ave, Shelbyville',
          workspaceId,
        },
      ];

      for (let i = 0; i < 2 - existingCustomers.length; i++) {
        const c = await db.customer.create({ data: customerData[i] });
        customerIds.push(c.id);
        counts.customers++;
      }
      customerIds = [...existingCustomers.map((c) => c.id), ...customerIds].slice(0, 2);
    }
  } catch (e: any) {
    errors.push(`Customers: ${e.message}`);
  }

  // ─── Helper: ensure at least one employee exists ────────────────
  let employeeId: string | null = null;
  try {
    const existingEmployee = await db.employee.findFirst({
      where: { workspaceId },
    });
    if (existingEmployee) {
      employeeId = existingEmployee.id;
    } else {
      const emp = await db.employee.create({
        data: {
          name: 'David Chen',
          phone: '+15552223334',
          email: 'david@company.com',
          role: 'technician',
          status: 'available',
          workspaceId,
        },
      });
      employeeId = emp.id;
      counts.employees++;
    }
  } catch (e: any) {
    errors.push(`Employee: ${e.message}`);
  }

  // ─── Helper: ensure at least one service exists ─────────────────
  let serviceId: string | null = null;
  try {
    const existingService = await db.service.findFirst({
      where: { tenantId },
    });
    if (existingService) {
      serviceId = existingService.id;
    } else {
      const svc = await db.service.create({
        data: {
          name: 'Deep Home Cleaning',
          description: 'Comprehensive deep cleaning service for homes',
          category: 'cleaning',
          basePrice: 149,
          duration: 120,
          tenantId,
        },
      });
      serviceId = svc.id;
      counts.services++;
    }
  } catch (e: any) {
    errors.push(`Service: ${e.message}`);
  }

  // ─── 1. Broadcasts ─────────────────────────────────────────────
  const broadcasts = [
    {
      name: 'Weekend Special Offer',
      type: 'broadcast',
      status: 'sent',
      sentCount: 250,
      deliveredCount: 238,
      readCount: 156,
      messageContent: '🎉 Weekend Special! Get 20% off all services this weekend only. Book now!',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Monthly Newsletter',
      type: 'broadcast',
      status: 'scheduled',
      messageContent: 'Check out our latest updates, tips, and exclusive offers this month!',
      audienceType: 'all',
      scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Flash Sale Alert',
      type: 'broadcast',
      status: 'draft',
      messageContent: '⚡ FLASH SALE: 30% off for the next 2 hours! Don\'t miss out!',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'New Service Launch',
      type: 'broadcast',
      status: 'sent',
      sentCount: 500,
      deliveredCount: 475,
      readCount: 320,
      messageContent: '🚀 Exciting news! We\'ve launched a brand new service. Be among the first to try it!',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Customer Appreciation Day',
      type: 'broadcast',
      status: 'draft',
      messageContent: '💝 Thank you for being a loyal customer! Enjoy exclusive perks on Customer Appreciation Day.',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
  ];

  for (const data of broadcasts) {
    try {
      await db.campaign.create({ data });
      counts.broadcasts++;
    } catch (e: any) {
      errors.push(`Broadcast "${data.name}": ${e.message}`);
    }
  }

  // ─── 2. Campaigns ──────────────────────────────────────────────
  const campaigns = [
    {
      name: 'Summer Cleaning Promo',
      type: 'promotional',
      status: 'running',
      sentCount: 150,
      deliveredCount: 142,
      readCount: 98,
      clickedCount: 34,
      repliedCount: 12,
      convertedCount: 8,
      revenueGenerated: 1192,
      messageContent: '☀️ Summer is here! Get your home sparkling clean with our special summer promotion. 15% off all cleaning services!',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Monthly Service Reminder',
      type: 'reminder',
      status: 'scheduled',
      messageContent: 'Hi {{name}}, this is your monthly reminder to schedule your regular service. Book your slot now!',
      audienceType: 'all',
      scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Win-back Inactive Customers',
      type: 're_engagement',
      status: 'draft',
      messageContent: 'We miss you! Here\'s an exclusive offer to welcome you back. 25% off your next booking.',
      audienceType: 'segment',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Post-Service Follow-up',
      type: 'follow_up',
      status: 'completed',
      sentCount: 80,
      deliveredCount: 76,
      readCount: 62,
      repliedCount: 28,
      convertedCount: 5,
      revenueGenerated: 445,
      messageContent: 'Thanks for choosing us! How was your experience? Reply with your feedback and get 10% off next time.',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Holiday Special Offer',
      type: 'seasonal',
      status: 'paused',
      sentCount: 40,
      deliveredCount: 38,
      readCount: 25,
      clickedCount: 8,
      messageContent: '🎄 Holiday Special! Treat your home to a deep clean this festive season. Limited slots available!',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
    {
      name: 'Spring Cleaning Campaign',
      type: 'promotional',
      status: 'running',
      sentCount: 200,
      deliveredCount: 188,
      readCount: 145,
      clickedCount: 52,
      repliedCount: 18,
      convertedCount: 12,
      revenueGenerated: 2100,
      messageContent: '🌸 Spring into action! Refresh your space with our premium spring cleaning package. Book today!',
      audienceType: 'all',
      tenantId,
      workspaceId,
      createdById: userId,
    },
  ];

  for (const data of campaigns) {
    try {
      await db.campaign.create({ data });
      counts.campaigns++;
    } catch (e: any) {
      errors.push(`Campaign "${data.name}": ${e.message}`);
    }
  }

  // ─── 3. Campaign Templates ─────────────────────────────────────
  const campaignTemplates = [
    {
      name: 'Welcome New Customer',
      category: 'follow_up',
      content:
        'Hello {{name}}! 👋 Welcome to {{company}}! We\'re thrilled to have you on board. Your first service is just a click away.',
      isApproved: true,
      tenantId,
      workspaceId,
    },
    {
      name: 'Service Reminder',
      category: 'reminder',
      content:
        'Hi {{name}}, this is a friendly reminder that your {{service}} appointment is scheduled for {{date}} at {{time}}. Reply YES to confirm or NO to reschedule.',
      isApproved: true,
      tenantId,
      workspaceId,
    },
    {
      name: 'Special Offer',
      category: 'promotional',
      content:
        '🎉 {{discount}}% OFF! Use code {{code}} for your next {{service}}. Valid until {{date}}. Book now: {{url}}',
      isApproved: true,
      tenantId,
      workspaceId,
    },
    {
      name: 'Payment Reminder',
      category: 'reminder',
      content:
        'Hi {{name}}, your invoice #{{invoice_number}} for {{amount}} is due on {{date}}. Pay now: {{url}}',
      isApproved: true,
      tenantId,
      workspaceId,
    },
    {
      name: 'Thank You for Review',
      category: 'follow_up',
      content:
        'Thank you {{name}} for your ⭐⭐⭐⭐⭐ review! We\'re glad you loved your {{service}}. Here\'s {{discount}}% off your next booking: {{code}}',
      isApproved: false,
      tenantId,
      workspaceId,
    },
    {
      name: 'Seasonal Greetings',
      category: 'seasonal',
      content:
        '🎄 Season\'s Greetings {{name}}! Enjoy {{discount}}% off all services this holiday season. Book before {{date}}!',
      isApproved: true,
      tenantId,
      workspaceId,
    },
    {
      name: 'Re-engagement Offer',
      category: 're_engagement',
      content:
        'We miss you {{name}}! 💝 It\'s been a while. Here\'s an exclusive {{discount}}% discount just for you. Use code: COMEBACK{{code}}',
      isApproved: true,
      tenantId,
      workspaceId,
    },
    {
      name: 'Appointment Confirmation',
      category: 'reminder',
      content:
        '✅ Confirmed! {{name}}, your {{service}} appointment is booked for {{date}} at {{time}}. Address: {{address}}. Technician: {{employee}}',
      isApproved: true,
      tenantId,
      workspaceId,
    },
  ];

  for (const data of campaignTemplates) {
    try {
      await db.campaignTemplate.create({ data });
      counts.campaignTemplates++;
    } catch (e: any) {
      errors.push(`CampaignTemplate "${data.name}": ${e.message}`);
    }
  }

  // ─── 4. Bookings ───────────────────────────────────────────────
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const bookingsData = [
    {
      title: 'Deep Home Cleaning - Alice Johnson',
      description: 'Full deep cleaning service for 3-bedroom home',
      status: 'confirmed',
      source: 'whatsapp',
      customerName: 'Alice Johnson',
      customerPhone: '+15551234567',
      customerEmail: 'alice@example.com',
      customerId: customerIds[0] || null,
      employeeId,
      serviceId,
      address: '123 Main St, Springfield',
      scheduledAt: new Date(year, month, 2, 9, 0),
      scheduledEndTime: new Date(year, month, 2, 11, 0),
      duration: 120,
      notes: 'Customer prefers eco-friendly products',
      tenantId,
      workspaceId,
    },
    {
      title: 'Office Cleaning - Bob Martinez',
      description: 'Weekly office cleaning service',
      status: 'completed',
      source: 'website',
      customerName: 'Bob Martinez',
      customerPhone: '+15559876543',
      customerEmail: 'bob@example.com',
      customerId: customerIds[1] || null,
      employeeId,
      serviceId,
      address: '456 Oak Ave, Shelbyville',
      scheduledAt: new Date(year, month, 5, 14, 0),
      scheduledEndTime: new Date(year, month, 5, 16, 0),
      duration: 120,
      notes: 'Access code: 1234 at front door',
      completedAt: new Date(year, month, 5, 16, 30),
      tenantId,
      workspaceId,
    },
    {
      title: 'Move-out Cleaning - Sarah Williams',
      description: 'End-of-lease deep cleaning for apartment',
      status: 'pending',
      source: 'manual',
      customerName: 'Sarah Williams',
      customerPhone: '+15554443322',
      customerEmail: 'sarah@example.com',
      employeeId,
      serviceId,
      address: '789 Pine Rd, Capital City',
      scheduledAt: new Date(year, month, 15, 10, 0),
      scheduledEndTime: new Date(year, month, 15, 13, 0),
      duration: 180,
      tenantId,
      workspaceId,
    },
    {
      title: 'Carpet Cleaning - Tom Brown',
      description: 'Steam cleaning for living room and bedroom carpets',
      status: 'confirmed',
      source: 'api',
      customerName: 'Tom Brown',
      customerPhone: '+15557778899',
      employeeId,
      serviceId,
      address: '321 Elm St, Ogden',
      scheduledAt: new Date(year, month, 18, 11, 0),
      scheduledEndTime: new Date(year, month, 18, 12, 30),
      duration: 90,
      tenantId,
      workspaceId,
    },
    {
      title: 'Post-Construction Cleanup - Linda Davis',
      description: 'Cleaning after kitchen renovation',
      status: 'cancelled',
      source: 'whatsapp',
      customerName: 'Linda Davis',
      customerPhone: '+15556665544',
      customerEmail: 'linda@example.com',
      employeeId,
      serviceId,
      address: '654 Maple Dr, Riverdale',
      scheduledAt: new Date(year, month, 8, 8, 0),
      scheduledEndTime: new Date(year, month, 8, 12, 0),
      duration: 240,
      cancellationReason: 'Customer rescheduled to next month',
      cancelledAt: new Date(year, month, 7, 16, 0),
      tenantId,
      workspaceId,
    },
    {
      title: 'Weekly House Cleaning - Alice Johnson',
      description: 'Regular weekly maintenance cleaning',
      status: 'completed',
      source: 'form',
      customerName: 'Alice Johnson',
      customerPhone: '+15551234567',
      customerEmail: 'alice@example.com',
      customerId: customerIds[0] || null,
      employeeId,
      serviceId,
      address: '123 Main St, Springfield',
      scheduledAt: new Date(year, month, 10, 9, 0),
      scheduledEndTime: new Date(year, month, 10, 11, 0),
      duration: 120,
      completedAt: new Date(year, month, 10, 11, 15),
      tenantId,
      workspaceId,
    },
    {
      title: 'Window Cleaning - Bob Martinez',
      description: 'Interior and exterior window cleaning for 2-story home',
      status: 'pending',
      source: 'website',
      customerName: 'Bob Martinez',
      customerPhone: '+15559876543',
      customerEmail: 'bob@example.com',
      customerId: customerIds[1] || null,
      employeeId,
      serviceId,
      address: '456 Oak Ave, Shelbyville',
      scheduledAt: new Date(year, month, 22, 13, 0),
      scheduledEndTime: new Date(year, month, 22, 16, 0),
      duration: 180,
      tenantId,
      workspaceId,
    },
    {
      title: 'Spring Deep Clean - Emma Wilson',
      description: 'Comprehensive spring cleaning package',
      status: 'confirmed',
      source: 'manual',
      customerName: 'Emma Wilson',
      customerPhone: '+15551112233',
      customerEmail: 'emma@example.com',
      employeeId,
      serviceId,
      address: '987 Cedar Ln, Springfield',
      scheduledAt: new Date(year, month, 25, 8, 30),
      scheduledEndTime: new Date(year, month, 25, 12, 30),
      duration: 240,
      notes: 'Customer has 2 dogs - please ensure they are secured',
      tenantId,
      workspaceId,
    },
  ];

  for (const data of bookingsData) {
    try {
      await db.booking.create({ data });
      counts.bookings++;
    } catch (e: any) {
      errors.push(`Booking "${data.title}": ${e.message}`);
    }
  }

  // ─── 5. Customer Portal Sessions ───────────────────────────────
  if (customerIds.length >= 1) {
    try {
      const customer1 = await db.customer.findUnique({ where: { id: customerIds[0] } });
      if (customer1) {
        await db.customerPortalSession.create({
          data: {
            token: crypto.randomBytes(32).toString('hex'),
            customerId: customerIds[0],
            customerPhone: customer1.phone,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            tenantId,
          },
        });
        counts.customerPortalSessions++;
      }
    } catch (e: any) {
      errors.push(`PortalSession customer1: ${e.message}`);
    }
  }

  if (customerIds.length >= 2) {
    try {
      const customer2 = await db.customer.findUnique({ where: { id: customerIds[1] } });
      if (customer2) {
        await db.customerPortalSession.create({
          data: {
            token: crypto.randomBytes(32).toString('hex'),
            customerId: customerIds[1],
            customerPhone: customer2.phone,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            tenantId,
          },
        });
        counts.customerPortalSessions++;
      }
    } catch (e: any) {
      errors.push(`PortalSession customer2: ${e.message}`);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Seed completed',
    counts,
    errors: errors.length > 0 ? errors : undefined,
  });
}

export async function GET() {
  try {
    const tenantId = DEFAULT_TENANT_ID;

    const [
      broadcastCount,
      campaignCount,
      campaignTemplateCount,
      bookingCount,
      portalSessionCount,
    ] = await Promise.all([
      db.campaign.count({ where: { type: 'broadcast', tenantId } }),
      db.campaign.count({ where: { type: { not: 'broadcast' }, tenantId } }),
      db.campaignTemplate.count({ where: { tenantId } }),
      db.booking.count({ where: { tenantId } }),
      db.customerPortalSession.count({ where: { tenantId } }),
    ]);

    return NextResponse.json({
      counts: {
        broadcasts: broadcastCount,
        campaigns: campaignCount,
        campaignTemplates: campaignTemplateCount,
        bookings: bookingCount,
        customerPortalSessions: portalSessionCount,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
