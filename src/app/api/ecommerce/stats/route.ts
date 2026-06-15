import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

// GET /api/ecommerce/stats - Get ecommerce dashboard stats
export async function GET() {
  try {
    const auth = await getAuthUser()
    if (!auth?.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = auth.tenantId
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Run independent queries in parallel
    const [
      ordersToday,
      revenueTodayResult,
      totalOrders,
      totalRevenueResult,
      totalProducts,
      activeProducts,
      totalCustomers,
      ordersByStatus,
      revenueByProvider,
      recentOrdersCount,
      pendingOrders,
      integrationConnections,
    ] = await Promise.all([
      // Orders created today
      db.ecommerceOrder.count({
        where: {
          tenantId,
          orderedAt: { gte: todayStart },
        },
      }),

      // Revenue today (sum of totals for orders placed today)
      db.ecommerceOrder.aggregate({
        where: {
          tenantId,
          orderedAt: { gte: todayStart },
          status: { notIn: ['cancelled', 'refunded'] },
        },
        _sum: { total: true },
      }),

      // Total all-time orders
      db.ecommerceOrder.count({
        where: { tenantId },
      }),

      // Total all-time revenue
      db.ecommerceOrder.aggregate({
        where: {
          tenantId,
          status: { notIn: ['cancelled', 'refunded'] },
        },
        _sum: { total: true },
      }),

      // Total products
      db.ecommerceProduct.count({
        where: { tenantId },
      }),

      // Active products
      db.ecommerceProduct.count({
        where: { tenantId, status: 'active' },
      }),

      // Total unique customers (by customerEmail)
      db.ecommerceOrder.groupBy({
        by: ['customerEmail'],
        where: {
          tenantId,
          customerEmail: { not: null },
        },
      }),

      // Orders by status
      db.ecommerceOrder.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: { status: true },
      }),

      // Revenue by provider (through integration)
      db.integrationConnection.findMany({
        where: { tenantId },
        select: {
          id: true,
          provider: true,
          name: true,
          orders: {
            where: {
              status: { notIn: ['cancelled', 'refunded'] },
            },
            select: { total: true },
          },
          totalSyncedOrders: true,
          totalSyncedProducts: true,
        },
      }),

      // Orders in last 30 days
      db.ecommerceOrder.count({
        where: {
          tenantId,
          orderedAt: { gte: thirtyDaysAgo },
        },
      }),

      // Pending/unfulfilled orders
      db.ecommerceOrder.count({
        where: {
          tenantId,
          status: { in: ['pending', 'confirmed', 'processing'] },
        },
      }),

      // Integration connections with status
      db.integrationConnection.findMany({
        where: { tenantId },
        select: {
          id: true,
          provider: true,
          name: true,
          status: true,
          lastSyncAt: true,
          lastSyncStatus: true,
          totalSyncedOrders: true,
          totalSyncedProducts: true,
          totalSyncedCustomers: true,
        },
      }),
    ])

    // Calculate revenue today
    const revenueToday = revenueTodayResult._sum.total || 0

    // Calculate total revenue
    const totalRevenue = totalRevenueResult._sum.total || 0

    // Calculate average order value
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0

    // Build orders by status map
    const ordersByStatusMap: Record<string, number> = {}
    ordersByStatus.forEach((item) => {
      ordersByStatusMap[item.status] = item._count.status
    })

    // Build revenue by provider map
    const storeRevenueByProvider = revenueByProvider.map((integration) => {
      const storeRevenue = integration.orders.reduce((sum, order) => sum + order.total, 0)
      return {
        provider: integration.provider,
        name: integration.name,
        integrationId: integration.id,
        revenue: Math.round(storeRevenue * 100) / 100,
        totalOrders: integration.totalSyncedOrders,
        totalProducts: integration.totalSyncedProducts,
      }
    })

    // Top products by calculating from orders' itemsJson
    // Since itemsJson is a string, we need to fetch recent orders and parse
    const recentOrders = await db.ecommerceOrder.findMany({
      where: {
        tenantId,
        orderedAt: { gte: thirtyDaysAgo },
        status: { notIn: ['cancelled', 'refunded'] },
      },
      select: { itemsJson: true },
      take: 500,
    })

    // Aggregate product sales from itemsJson
    const productSalesMap: Record<string, { name: string; qty: number; revenue: number }> = {}
    for (const order of recentOrders) {
      try {
        const items = JSON.parse(order.itemsJson || '[]') as Array<{
          name?: string;
          productId?: string;
          qty?: number;
          price?: number;
          quantity?: number;
        }>
        for (const item of items) {
          const key = item.productId || item.name || 'unknown'
          if (!productSalesMap[key]) {
            productSalesMap[key] = {
              name: item.name || 'Unknown Product',
              qty: 0,
              revenue: 0,
            }
          }
          productSalesMap[key].qty += item.qty || item.quantity || 1
          productSalesMap[key].revenue += (item.qty || item.quantity || 1) * (item.price || 0)
        }
      } catch {
        // Skip orders with invalid itemsJson
      }
    }

    // Sort by revenue and take top 5
    const topProducts = Object.entries(productSalesMap)
      .map(([id, data]) => ({
        id,
        name: data.name,
        totalQty: data.qty,
        revenue: Math.round(data.revenue * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Estimate conversion rate (orders / (orders + pending) as a simple proxy)
    // In a real scenario, you'd track sessions/page views
    const conversionRate =
      totalOrders + pendingOrders > 0
        ? (totalOrders / (totalOrders + pendingOrders)) * 100
        : 0

    // Abandoned carts (simulated - use pending orders as proxy)
    // In production, you'd track cart events from the provider
    const abandonedCarts = Math.floor(pendingOrders * 0.3)

    // Build integrations summary
    const integrationsSummary = integrationConnections.map((ic) => ({
      id: ic.id,
      provider: ic.provider,
      name: ic.name,
      status: ic.status,
      lastSyncAt: ic.lastSyncAt,
      lastSyncStatus: ic.lastSyncStatus,
      totalSyncedOrders: ic.totalSyncedOrders,
      totalSyncedProducts: ic.totalSyncedProducts,
      totalSyncedCustomers: ic.totalSyncedCustomers,
    }))

    return NextResponse.json({
      // Key metrics
      ordersToday,
      revenueToday: Math.round(revenueToday * 100) / 100,
      totalOrders,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      abandonedCarts,
      conversionRate: Math.round(conversionRate * 100) / 100,
      pendingOrders,

      // Product metrics
      totalProducts,
      activeProducts,
      totalCustomers: totalCustomers.length,

      // Time-based metrics
      ordersLast30Days: recentOrdersCount,

      // Detailed breakdowns
      ordersByStatus: ordersByStatusMap,
      topProducts,
      storeRevenueByProvider,
      integrations: integrationsSummary,
    })
  } catch (error) {
    console.error('Error fetching ecommerce stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
