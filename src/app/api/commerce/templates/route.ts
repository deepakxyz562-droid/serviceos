import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';
import { INDUSTRY_TEMPLATES } from '@/lib/commerce-templates';

/**
 * GET /api/commerce/templates
 * List available rich industry catalog presets
 */
export async function GET() {
  const templates = Object.values(INDUSTRY_TEMPLATES).map((t) => ({
    key: t.key,
    name: t.name,
    tagline: t.tagline,
    icon: t.icon,
    accentColor: t.accentColor,
    bannerUrl: t.bannerUrl,
    categoriesCount: t.categories.length,
    productsCount: t.products.length,
    sampleCategories: t.categories.slice(0, 4),
    sampleProducts: t.products.slice(0, 3).map((p) => ({
      name: p.name,
      price: p.price,
      unit: p.unit || (p.durationMins ? `${p.durationMins}m` : undefined),
    })),
  }));

  return NextResponse.json({ templates });
}

/**
 * POST /api/commerce/templates
 * Apply an industry template to merchant's store catalog
 */
export async function POST(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { templateKey, replaceExisting = true } = body;

    const template = INDUSTRY_TEMPLATES[templateKey];
    if (!template) {
      return NextResponse.json(
        { error: `Invalid template key. Available: ${Object.keys(INDUSTRY_TEMPLATES).join(', ')}` },
        { status: 400 }
      );
    }

    // Find or create GptformCommerceConfig
    let config = await db.gptformCommerceConfig.findFirst({
      where: {
        OR: [
          { businessId: business.id },
          ...(business.tenantId ? [{ businessId: business.tenantId }] : []),
        ],
      },
    });

    let currentCatalog: any[] = [];
    if (config?.catalogJson) {
      try {
        currentCatalog = JSON.parse(config.catalogJson);
      } catch {
        currentCatalog = [];
      }
    }

    let finalCatalog: any[] = [];
    if (replaceExisting) {
      finalCatalog = template.products;
    } else {
      // Append non-duplicate products
      const existingNames = new Set(currentCatalog.map((p) => (p.name || '').toLowerCase().trim()));
      const newItems = template.products.filter(
        (p) => !existingNames.has(p.name.toLowerCase().trim())
      );
      finalCatalog = [...currentCatalog, ...newItems];
    }

    if (config) {
      config = await db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: {
          catalogJson: JSON.stringify(finalCatalog),
        },
      });
    } else {
      config = await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify(finalCatalog),
          currency: business.currency || 'INR',
          currencySymbol: business.currencySymbol || '₹',
        },
      });
    }

    return NextResponse.json({
      success: true,
      templateApplied: template.name,
      productsCount: finalCatalog.length,
      categories: template.categories,
      catalog: finalCatalog,
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to apply industry template:', e);
    return NextResponse.json({ error: e.message || 'Failed to apply template' }, { status: 500 });
  }
}
