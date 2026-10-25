import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { ownerBusiness } from '@/lib/commerce/access';

/**
 * GET /api/commerce/products - list all active products
 * POST /api/commerce/products - add or batch add products
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    const tenantId = auth?.tenantId;

    if (!tenantId) {
      return NextResponse.json({ error: 'Unauthorized: Authentication required' }, { status: 401 });
    }

    const [integrationCount, dbProducts, commerceConfig] = await Promise.all([
      db.integrationConnection.count({
        where: { tenantId, status: 'connected' },
      }),
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

    // Only surface external ecommerce products if the tenant has a connected integration
    const activeEcommerceProducts = integrationCount > 0 ? dbProducts : [];

    return NextResponse.json({
      success: true,
      count: activeEcommerceProducts.length + configCatalog.length,
      dbProducts: activeEcommerceProducts,
      catalog: configCatalog,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let business;
    try {
      business = await ownerBusiness(req, 'canManageProducts');
    } catch (authErr: any) {
      const isForbidden = authErr?.message === 'FORBIDDEN_INSUFFICIENT_ROLE';
      return NextResponse.json(
        { error: isForbidden ? 'Forbidden: Insufficient permissions to manage products' : 'Unauthorized: Authentication required' },
        { status: isForbidden ? 403 : 401 }
      );
    }

    const tenantId = business.tenantId || business.id;

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
      where: {
        OR: [{ businessId: business.id }, ...(business.tenantId ? [{ businessId: business.tenantId }] : [])],
      },
      orderBy: { updatedAt: 'desc' },
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
    } else {
      await db.gptformCommerceConfig.create({
        data: {
          businessId: business.id,
          catalogJson: JSON.stringify([newItem]),
          fieldsJson: '[]',
        },
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
