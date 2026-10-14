import React from 'react';
import { db } from '@/lib/db';
import { notFound } from 'next/navigation';
import { StoreClient } from './store-client';
import { computeStoreAvailabilityFromConfig } from '@/lib/commerce/store-availability';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface StorePageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string; ref?: string }>;
}

// Demo Sharma Kirana Store catalog matching design mockup
const DEMO_STORE = {
  businessId: 'demo-sharma-kirana',
  businessName: 'Sharma Kirana Store',
  businessPhone: '+91 98765 43210',
  businessAddress: 'Station Road, Kankarbagh, Patna, Bihar',
  currency: 'INR',
  currencySymbol: '₹',
  greeting: 'Fresh Products • Best Prices • Free Home Delivery',
  bannerText: '🎉 Welcome to Sharma Kirana Store! Order online for 30-45 min local delivery.',
  catalog: [
    {
      id: 'prod-atta',
      name: 'Aashirvaad Atta 5kg',
      price: 285,
      category: 'Atta, Rice & Dal',
      description: '100% pure whole wheat flour processed with traditional chakki grinding.',
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-milk',
      name: 'Amul Milk 1L',
      price: 68,
      category: 'Dairy & Eggs',
      description: 'Pasteurized toned milk with essential vitamins and calcium.',
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-maggi',
      name: 'Maggi Noodles 70g',
      price: 14,
      category: 'Snacks',
      description: 'Classic 2-minute masala instant noodles with authentic Indian spices.',
      imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-salt',
      name: 'Tata Salt 1kg',
      price: 28,
      category: 'Grocery',
      description: 'Vacuum evaporated iodized salt for guaranteed daily purity.',
      imageUrl: 'https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-oil',
      name: 'Fortune Sunflower Oil 1L',
      price: 145,
      category: 'Oil & Masala',
      description: 'Light and healthy refined sunflower oil enriched with Vitamin A & D.',
      imageUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-rice',
      name: 'India Gate Basmati Rice 5kg',
      price: 460,
      category: 'Atta, Rice & Dal',
      description: 'Aged long grain aromatic premium basmati rice for daily royal meals.',
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-biscuit',
      name: 'Good Day Butter Cookies 120g',
      price: 35,
      category: 'Snacks',
      description: 'Rich butter cookies with delightful aroma and crunchy bite.',
      imageUrl: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-soap',
      name: 'Dettol Original Soap 75g (Pack of 3)',
      price: 110,
      category: 'Personal Care',
      description: 'Antibacterial germ protection soap with signature pine fragrance.',
      imageUrl: 'https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-detergent',
      name: 'Surf Excel Quick Wash 1kg',
      price: 135,
      category: 'Household',
      description: 'Advanced stain removal washing powder that cleans effectively in 1 wash.',
      imageUrl: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-dishwash',
      name: 'Vim Lemon Dishwash Gel 500ml',
      price: 115,
      category: 'Kitchen Needs',
      description: 'Degreasing dishwash liquid gel with the power of 100 lemons.',
      imageUrl: 'https://images.unsplash.com/photo-1585670270608-b404fb880222?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-diapers',
      name: 'Pampers Baby Diapers Medium (32 Count)',
      price: 499,
      category: 'Baby Care',
      description: 'All-round protection pants with magic gel absorbency for up to 12 hours.',
      imageUrl: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=600&auto=format&fit=crop&q=80',
    },
    {
      id: 'prod-petfood',
      name: 'Pedigree Adult Dog Food 1.2kg',
      price: 360,
      category: 'Pet Care',
      description: 'Complete and balanced nutrition with chicken and vegetables for dogs.',
      imageUrl: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=600&auto=format&fit=crop&q=80',
    },
  ],
  billing: {
    taxRate: 5,
    taxType: 'inclusive' as const,
    taxName: 'GST',
    serviceChargeRate: 0,
    gstin: '10AAACS1429B1Z8',
    billFooterText: 'Thank you for shopping local with Sharma Kirana Store!',
  },
  discounts: [
    { code: 'WELCOME50', type: 'fixed' as const, value: 50, minOrder: 299, label: '₹50 OFF on first order above ₹299' },
    { code: 'FREESHIP', type: 'percentage' as const, value: 10, minOrder: 499, label: '10% OFF on orders above ₹499' },
  ],
};

export async function generateMetadata({ params }: StorePageProps) {
  const { slug } = await params;

  if (slug === 'sharma-kirana') {
    return {
      title: `${DEMO_STORE.businessName} — Digital Menu & Storefront`,
      description: `Browse fresh groceries, dairy, snacks, and daily essentials delivered to your home.`,
    };
  }

  if (slug === 'my-store' || slug.startsWith('demo')) {
    return {
      title: `My Store — Digital Menu & Storefront`,
      description: `Browse products and daily essentials with fast local delivery.`,
    };
  }

  try {
    const tenant = await db.tenant.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      select: { name: true },
    });

    return {
      title: `${tenant?.name || 'Online Store'} — Digital Menu & WhatsApp Storefront`,
      description: `Browse menu, order food or merchandise, and checkout directly via WhatsApp.`,
    };
  } catch {
    return {
      title: `Online Store — Digital Menu & Storefront`,
      description: `Browse products and daily essentials.`,
    };
  }
}

export default async function StorePage({ params, searchParams }: StorePageProps) {
  const { slug } = await params;
  const { table } = await searchParams;

  // Handle demo / fallback slug for my-store and demos
  const isDemoSlug = slug === 'my-store' || slug === 'sharma-kirana' || slug.startsWith('demo');

  let tenant: any = null;
  try {
    tenant = await db.tenant.findFirst({
      where: {
        OR: [
          { slug },
          { publicSlug: slug },
          { id: slug },
          { slug: decodeURIComponent(slug) },
          { publicSlug: decodeURIComponent(slug) },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        phone: true,
        email: true,
        logo: true,
        address: true,
        city: true,
      },
    });
  } catch (err) {
    console.warn('[store/page] Database lookup failed for tenant, checking fallback:', err);
  }

  // If no tenant is found and it's a demo slug or fallback is requested, serve dynamic fallback
  if (!tenant) {
    if (isDemoSlug || slug === 'store') {
      let demoConfig: any = null;
      try {
        demoConfig = await db.gptformCommerceConfig.findFirst({
          where: {
            OR: [
              { businessId: DEMO_STORE.businessId },
              { businessId: slug },
            ],
          },
          orderBy: { updatedAt: 'desc' },
        });
      } catch {}

      const isExplicitSharma = slug === 'sharma-kirana';
      const storeName = isExplicitSharma ? 'Sharma Kirana Store' : (slug === 'my-store' ? 'My Store' : 'Local Store');
      const storeAddress = isExplicitSharma ? 'Station Road, Kankarbagh, Patna, Bihar' : 'Local Neighborhood';
      const storeBanner = isExplicitSharma ? '🎉 Welcome to Sharma Kirana Store! Order online for 30-45 min local delivery.' : '';
      const storeDiscounts = isExplicitSharma ? DEMO_STORE.discounts : [];
      const storeBilling = {
        enableGst: isExplicitSharma ? true : false,
        taxRate: isExplicitSharma ? 5 : 0,
        taxType: 'inclusive' as const,
        taxName: 'GST',
        serviceChargeRate: 0,
        gstin: isExplicitSharma ? '10AAACS1429B1Z8' : '',
        billFooterText: `Thank you for shopping local with ${storeName}!`,
      };

      const demoAvailability = computeStoreAvailabilityFromConfig(demoConfig, storeName);

      return (
        <StoreClient
          businessId={isExplicitSharma ? DEMO_STORE.businessId : slug}
          businessName={storeName}
          businessPhone={isExplicitSharma ? DEMO_STORE.businessPhone : ''}
          businessAddress={storeAddress}
          currency={DEMO_STORE.currency}
          currencySymbol={DEMO_STORE.currencySymbol}
          upiId={demoConfig?.upiId || (isExplicitSharma ? 'sharmakirana@okhdfcbank' : '')}
          paymentQrUrl=""
          enableOnlinePayment={true}
          greeting={`Welcome to ${storeName}!`}
          bannerText={storeBanner}
          catalog={DEMO_STORE.catalog}
          tableNumber={table || null}
          billing={storeBilling}
          discounts={storeDiscounts}
          isStoreOpen={demoAvailability.isOpen}
          storeCloseReason={demoAvailability.reason}
          todayHoursText={demoAvailability.todayHoursText}
        />
      );
    }
    notFound();
  }

  // Found real tenant in DB
  let businessId = tenant.id;
  let businessName = tenant.name || 'Local Store';
  let businessPhone = tenant.phone || '';

  try {
    const ownerBusiness = await db.aiBusiness.findFirst({ where: { tenantId: tenant.id } });
    if (ownerBusiness) {
      businessId = ownerBusiness.id;
      if (ownerBusiness.phone) businessPhone = ownerBusiness.phone;
    }
  } catch {}

  // Check config
  let config: any = null;
  try {
    config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [{ businessId }, { businessId: tenant.id }],
      },
    });
  } catch {}

  let catalog: any[] = [];
  if (config?.catalogJson) {
    try {
      catalog = JSON.parse(config.catalogJson);
    } catch {
      catalog = [];
    }
  }

  // If merchant has no catalog yet, provide standard starter grocery catalog
  if (!catalog || catalog.length === 0) {
    catalog = DEMO_STORE.catalog;
  }

  let billingConfig: any = {
    enableGst: false,
    taxRate: 0,
    taxType: 'inclusive' as const,
    taxName: 'GST',
    serviceChargeRate: 0,
    gstin: '',
    billFooterText: `Thank you for shopping local with ${businessName}!`,
  };
  let discountsConfig: any[] = [];
  let bannerText: string = '';

  let paymentQrUrl: string = '';
  let enableOnlinePayment: boolean = true;

  if (config?.fieldsJson) {
    try {
      const parsedFields = JSON.parse(config.fieldsJson);
      if (parsedFields.billing) {
        billingConfig = { ...billingConfig, ...parsedFields.billing };
      }
      if (typeof parsedFields.bannerText === 'string' && parsedFields.bannerText.trim()) {
        bannerText = parsedFields.bannerText.trim();
      }
      if (parsedFields.paymentQrUrl) paymentQrUrl = parsedFields.paymentQrUrl;
      if (parsedFields.enableOnlinePayment !== undefined) enableOnlinePayment = Boolean(parsedFields.enableOnlinePayment);
    } catch {}
  }

  try {
    const promotions = await db.promotion.findMany({
      where: {
        tenantId: tenant.id,
        isActive: true,
        startDate: { lte: new Date() },
        OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
      },
      take: 50,
    });
    if (promotions.length > 0) {
      discountsConfig = promotions
        .filter((p) => p.usageLimit == null || p.usedCount < p.usageLimit)
        .map((p) => ({
          code: p.code,
          type: p.type,
          value: p.value,
          minOrder: p.minSpend,
          label: p.description,
        }));
    }
  } catch {}

  const availability = computeStoreAvailabilityFromConfig(config, businessName);

  const businessAddress = tenant?.address
    ? [tenant.address, tenant.city].filter(Boolean).join(', ')
    : 'Local Neighborhood';

  return (
    <StoreClient
      businessId={businessId}
      businessName={businessName}
      businessPhone={businessPhone}
      businessAddress={businessAddress}
      currency={config?.currency || 'INR'}
      currencySymbol={config?.currencySymbol || '₹'}
      upiId={config?.upiId || ''}
      paymentQrUrl={paymentQrUrl}
      enableOnlinePayment={enableOnlinePayment}
      greeting={config?.greetingMessage || `Welcome to ${businessName}!`}
      bannerText={bannerText}
      catalog={catalog}
      tableNumber={table || null}
      billing={billingConfig}
      discounts={discountsConfig}
      isStoreOpen={availability.isOpen}
      storeCloseReason={availability.reason}
      todayHoursText={availability.todayHoursText}
    />
  );
}
