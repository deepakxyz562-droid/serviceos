import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * GET /api/commerce/products - list all active products
 * POST /api/commerce/products - add or batch add products
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    let tenantId = auth?.tenantId;

    if (!tenantId) {
      const defaultTenant = await db.tenant.findFirst({ select: { id: true } });
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [dbProducts, commerceConfig] = await Promise.all([
      db.ecommerceProduct.findMany({
        where: { tenantId, status: 'active' },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      db.gptformCommerceConfig.findFirst({
        where: { businessId: tenantId },
      }),
    ]);

    let configCatalog: any[] = [];
    if (commerceConfig?.catalogJson) {
      try {
        configCatalog = JSON.parse(commerceConfig.catalogJson);
      } catch {}
    }

    return NextResponse.json({
      success: true,
      count: dbProducts.length + configCatalog.length,
      dbProducts,
      catalog: configCatalog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    let tenantId = auth?.tenantId;
    let workspaceId = auth?.workspaceId;

    if (!tenantId) {
      const defaultTenant = await db.tenant.findFirst({ select: { id: true } });
      tenantId = defaultTenant?.id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, title, price, category, description, imageUrl, sku, stock, inStock } = body;

    const prodName = (name || title || '').trim();
    if (!prodName) {
      return NextResponse.json({ error: 'Product name is required' }, { status: 400 });
    }

    const parsedPrice = parseFloat(price || '0') || 0;
    const isAvailable = inStock !== undefined ? Boolean(inStock) : true;
    const newId = `prod_${Date.now()}`;

    // Update GptformCommerceConfig
    const config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: tenantId },
    });

    const newItem = {
      id: newId,
      name: prodName,
      price: parsedPrice,
      category: category || 'General',
      description: description || '',
      imageUrl: imageUrl || '',
      sku: sku || undefined,
      isActive: isAvailable,
      source: 'manual',
    };

    if (config) {
      let catalog: any[] = [];
      try {
        catalog = JSON.parse(config.catalogJson || '[]');
      } catch {}
      catalog.push(newItem);

      await db.gptformCommerceConfig.update({
        where: { id: config.id },
        data: { catalogJson: JSON.stringify(catalog) },
      });
    }

    return NextResponse.json({
      success: true,
      product: newItem,
      message: 'Product created successfully',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}
