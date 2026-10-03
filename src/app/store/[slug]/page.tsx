import React from 'react';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { StoreClient } from './store-client';

interface StorePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; ref?: string }>;
}

export async function generateMetadata({ params }: StorePageProps) {
  const { slug } = await params;
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: { name: true },
  });

  return {
    title: `${tenant?.name || 'Online Store'} — Digital Menu & WhatsApp Storefront`,
    description: `Browse menu, order food or merchandise, and checkout directly via WhatsApp.`,
  };
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = await params;
  const { table } = await searchParams;

  // Resolve business / tenant
  const tenant = await db.tenant.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    select: {
      id: true,
      name: true,
      slug: true,
      phone: true,
      email: true,
      logo: true,
      address: true,
      city: true,
    },
  });

  let businessId = tenant?.id || slug;
  let businessName = tenant?.name || 'Our Store & Cafe';
  let businessPhone = tenant?.phone || '';

  // Check config
  let config = await db.gptformCommerceConfig.findFirst({
    where: {
      OR: [{ businessId }, { businessId: slug }],
    },
  });

  // Default fallback catalog if brand new
  let catalog: any[] = [];
  if (config?.catalogJson) {
    try {
      catalog = JSON.parse(config.catalogJson);
    } catch {
      catalog = [];
    }
  }

  if (catalog.length === 0) {
    catalog = [
      { id: '1', name: 'Fresh Artisan Croissant', price: 90, category: 'Bakery', description: 'Flaky French butter croissant baked fresh daily', isActive: true },
      { id: '2', name: 'Signature Cappuccino', price: 140, category: 'Beverages', description: 'Double espresso with silky steamed milk foam', isActive: true },
      { id: '3', name: 'Belgian Chocolate Brownie', price: 120, category: 'Desserts', description: 'Warm fudge brownie with 70% dark chocolate', isActive: true },
    ];
  }

  return (
    <StoreClient
      businessId={businessId}
      businessName={businessName}
      businessPhone={businessPhone}
      businessAddress={tenant?.address ? `${tenant.address}, ${tenant.city || ''}` : ''}
      currency={config?.currency || 'INR'}
      currencySymbol={config?.currencySymbol || '₹'}
      upiId={config?.upiId || ''}
      greeting={config?.greetingMessage || `Welcome to ${businessName}!`}
      catalog={catalog}
      tableNumber={table || null}
    />
  );
}
