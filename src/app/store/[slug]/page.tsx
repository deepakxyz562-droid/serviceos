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

  if (!tenant) notFound();
  const ownerBusiness = await db.aiBusiness.findFirst({ where: { tenantId: tenant.id } });
  if (!ownerBusiness) notFound();
  let businessId = ownerBusiness.id;
  let businessName = tenant?.name || 'Our Store & Cafe';
  let businessPhone = tenant?.phone || '';

  // Check config
  let config = await db.gptformCommerceConfig.findFirst({
    where: {
      OR: [{ businessId }, { businessId: tenant.id }],
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

  if (!config || !config.isActive) notFound();


  // Parse extra billing, promotions & bannerText from fieldsJson
  let billingConfig: any = null;
  let discountsConfig: any[] = [];
  let bannerText: string = '';
  if (config?.fieldsJson) {
    try {
      const parsedFields = JSON.parse(config.fieldsJson);
      if (parsedFields.billing) billingConfig = parsedFields.billing;
      if (typeof parsedFields.bannerText === 'string') {
        bannerText = parsedFields.bannerText;
      }
    } catch {}
  }

  const promotions=await db.promotion.findMany({where:{tenantId:tenant.id,isActive:true,startDate:{lte:new Date()},OR:[{endDate:null},{endDate:{gte:new Date()}}]},take:50});
  discountsConfig=promotions.filter(p=>p.usageLimit==null||p.usedCount<p.usageLimit).map(p=>({code:p.code,type:p.type,value:p.value,minOrder:p.minSpend,label:p.description}));

  // Fallback banner if none set
  if (!bannerText && discountsConfig.length > 0) {
    const first = discountsConfig[0];
    bannerText = `🎉 Special Offer: Use code ${first.code} to get ${first.type === 'percentage' ? `${first.value}%` : `₹${first.value}`} OFF!`;
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
      bannerText={bannerText}
      catalog={catalog}
      tableNumber={table || null}
      billing={billingConfig}
      discounts={discountsConfig}
    />
  );
}
