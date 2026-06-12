import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';

// GET /api/admin/whatsapp - WhatsApp management data across all tenants
export async function GET() {
  try {
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden: Super admin access required' }, { status: 403 });
    }

    // Run independent queries in parallel
    const [
      tenantsWithWhatsApp,
      totalConversations,
      totalInboxMessages,
      totalNotificationLogs,
      recentMessages,
    ] = await Promise.all([
      // All tenants with WhatsApp config
      db.tenant.findMany({
        where: { whatsappPhone: { not: null } },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          whatsappPhone: true,
          whatsappConfigJson: true,
          _count: {
            select: { conversations: true },
          },
        },
      }),

      // Total conversations
      db.conversation.count(),

      // Total inbox messages
      db.inboxMessage.count(),

      // WhatsApp notification logs
      db.notificationLog.count({
        where: { type: 'whatsapp' },
      }),

      // Recent WhatsApp messages (last 50)
      db.inboxMessage.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          conversationId: true,
          senderType: true,
          senderName: true,
          content: true,
          direction: true,
          status: true,
          messageType: true,
          tenantId: true,
          createdAt: true,
        },
      }),
    ]);

    // Process per-tenant WhatsApp data
    const whatsappTenants = tenantsWithWhatsApp.map((tenant) => {
      let whatsappConfig: Record<string, unknown> = {};
      try {
        whatsappConfig = JSON.parse(tenant.whatsappConfigJson || '{}');
      } catch {
        whatsappConfig = {};
      }

      return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        tenantSlug: tenant.slug,
        plan: tenant.plan,
        whatsappPhone: tenant.whatsappPhone,
        connected: Boolean(whatsappConfig.accessToken || whatsappConfig.apiKey),
        verificationStatus: (whatsappConfig.verificationStatus as string) || 'pending',
        phoneNumberId: (whatsappConfig.phoneNumberId as string) || null,
        businessAccountId: (whatsappConfig.businessAccountId as string) || null,
        webhookVerified: Boolean(whatsappConfig.webhookVerified),
        conversationCount: tenant._count.conversations,
      };
    });

    // Calculate message usage by tenant
    const messageUsageByTenant = await db.inboxMessage.groupBy({
      by: ['tenantId'],
      _count: { id: true },
      where: { tenantId: { not: null } },
    });

    const messageUsageMap: Record<string, number> = {};
    messageUsageByTenant.forEach((item) => {
      if (item.tenantId) {
        messageUsageMap[item.tenantId] = item._count.id;
      }
    });

    // WhatsApp notification stats by status
    const notificationStats = await db.notificationLog.groupBy({
      by: ['status'],
      where: { type: 'whatsapp' },
      _count: { status: true },
    });

    const notificationStatsMap: Record<string, number> = {};
    notificationStats.forEach((item) => {
      notificationStatsMap[item.status] = item._count.status;
    });

    // Template status from campaign templates
    const templateStats = await db.campaignTemplate.groupBy({
      by: ['isApproved'],
      _count: { isApproved: true },
    });

    const templateStatusMap = {
      approved: 0,
      pending: 0,
      total: 0,
    };
    templateStats.forEach((item) => {
      if (item.isApproved) {
        templateStatusMap.approved += item._count.isApproved;
      } else {
        templateStatusMap.pending += item._count.isApproved;
      }
      templateStatusMap.total += item._count.isApproved;
    });

    // Format recent messages
    const formattedRecentMessages = recentMessages.map((msg) => ({
      id: msg.id,
      conversationId: msg.conversationId,
      senderType: msg.senderType,
      senderName: msg.senderName,
      content: msg.content.substring(0, 100),
      direction: msg.direction,
      status: msg.status,
      messageType: msg.messageType,
      tenantId: msg.tenantId,
      createdAt: msg.createdAt.toISOString(),
    }));

    // Connected numbers summary
    const connectedCount = whatsappTenants.filter((t) => t.connected).length;
    const pendingVerification = whatsappTenants.filter(
      (t) => t.verificationStatus === 'pending'
    ).length;

    return NextResponse.json({
      summary: {
        totalTenantsWithWhatsApp: whatsappTenants.length,
        connectedNumbers: connectedCount,
        pendingVerification,
        totalConversations,
        totalMessages: totalInboxMessages,
        totalWhatsAppNotifications: totalNotificationLogs,
      },
      connectedNumbersPerTenant: whatsappTenants,
      messageUsageByTenant: messageUsageMap,
      verificationStatus: {
        connected: connectedCount,
        pending: pendingVerification,
        disconnected: whatsappTenants.length - connectedCount,
      },
      templateStatus: templateStatusMap,
      notificationDeliveryStats: notificationStatsMap,
      recentMessages: formattedRecentMessages,
    });
  } catch (error) {
    console.error('Admin whatsapp GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch WhatsApp management data' }, { status: 500 });
  }
}
