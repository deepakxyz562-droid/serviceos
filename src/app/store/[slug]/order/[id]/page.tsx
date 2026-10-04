import React from 'react';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { OrderTrackerClient } from './order-tracker-client';

interface OrderTrackingPageProps {
  params: Promise<{ slug: string; id: string }>;
}

export async function generateMetadata({ params }: OrderTrackingPageProps) {
  const { id } = await params;
  return {
    title: `Order #${id.slice(-6).toUpperCase()} — Live Status & Queue`,
    description: `Track your live order status, queue position, and pickup alerts in real time.`,
  };
}

export default async function OrderTrackingPage({ params }: OrderTrackingPageProps) {
  const { slug, id } = await params;

  // Resolve business
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { id: true, name: true, phone: true, address: true },
  });

  const businessId = tenant?.id || slug;
  const businessName = tenant?.name || 'Local Store';
  const businessPhone = tenant?.phone || '';

  // Initial order fetch from database
  const order = await db.gptformCommerceOrder.findFirst({
    where: {
      OR: [
        { id },
        { id: { endsWith: id.toLowerCase() } },
      ],
    },
  });

  if (!order) {
    notFound();
  }

  // Count orders ahead today
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const ordersAhead = await db.gptformCommerceOrder.count({
    where: {
      businessId: order.businessId,
      createdAt: {
        gte: startOfDay,
        lt: order.createdAt,
      },
      status: { in: ['PENDING', 'CONFIRMED', 'PREPARING'] },
    },
  });

  let items = [];
  try {
    items = JSON.parse(order.itemsJson || '[]');
  } catch {}

  const config = await db.gptformCommerceConfig.findFirst({
    where: {
      OR: [{ businessId: businessId }, { id: businessId }],
    },
    select: { upiId: true, currencySymbol: true },
  });

  const initialOrderData = {
    id: order.id,
    orderNumber: order.id.slice(-6).toUpperCase(),
    status: order.status || 'PENDING',
    paymentStatus: order.paymentStatus || 'UNPAID',
    paymentMethod: order.paymentMethod || 'WHATSAPP_COD',
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    deliveryType: order.deliveryType,
    deliveryAddress: order.deliveryAddress,
    deliveryDate: order.deliveryDate,
    notes: order.notes,
    total: order.total,
    createdAt: order.createdAt.toISOString(),
    items,
    businessName,
    businessPhone,
  };

  const initialQueueData = {
    ordersAhead,
    estimatedWaitMinutes: Math.max(3, ordersAhead * 3),
    counterNumber: 'Counter 1',
  };

  return (
    <OrderTrackerClient
      slug={slug}
      orderId={order.id}
      initialOrder={initialOrderData}
      initialQueue={initialQueueData}
      currencySymbol={config?.currencySymbol || '₹'}
      upiId={config?.upiId || ''}
    />
  );
}
