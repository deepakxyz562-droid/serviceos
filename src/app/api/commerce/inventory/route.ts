import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireQuoteFlowBusiness } from '@/lib/quote-flow-session';

/**
 * GET & PATCH /api/commerce/inventory
 * Stock tracking, low-stock alerts, and restocking for merchant catalog
 */
export async function GET(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);

    const config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });

    if (!config) {
      return NextResponse.json({ items: [], lowStockItems: [], totalItemsCount: 0 });
    }

    let catalog: any[] = [];
    try {
      catalog = JSON.parse(config.catalogJson || '[]');
    } catch {}

    const enriched = catalog.map((p: any) => {
      const stock = typeof p.stock === 'number' ? p.stock : 50; // default 50 if unmetered
      const minStock = typeof p.minStock === 'number' ? p.minStock : 10;
      const isLowStock = stock <= minStock;

      return {
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category || 'General',
        stock,
        minStock,
        isLowStock,
        imageUrl: p.imageUrl,
        isActive: p.isActive !== false,
      };
    });

    const lowStockItems = enriched.filter((i) => i.isLowStock);
    const totalValuation = enriched.reduce((sum, i) => sum + i.stock * i.price, 0);

    return NextResponse.json({
      items: enriched,
      lowStockItems,
      totalItemsCount: enriched.length,
      lowStockCount: lowStockItems.length,
      totalValuation: Number(totalValuation.toFixed(2)),
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to fetch inventory:', e);
    return NextResponse.json({ error: e.message || 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { business } = await requireQuoteFlowBusiness(req);
    const body = await req.json();
    const { productId, deltaStock, newStock, minStock } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }

    const config = await db.gptformCommerceConfig.findFirst({
      where: { businessId: business.id },
    });

    if (!config) {
      return NextResponse.json({ error: 'Commerce config not found' }, { status: 404 });
    }

    let catalog: any[] = [];
    try {
      catalog = JSON.parse(config.catalogJson || '[]');
    } catch {}

    const productIndex = catalog.findIndex((p: any) => p.id === productId);
    if (productIndex === -1) {
      return NextResponse.json({ error: 'Product not found in catalog' }, { status: 404 });
    }

    const currentStock = typeof catalog[productIndex].stock === 'number' ? catalog[productIndex].stock : 50;
    let updatedStock = currentStock;

    if (typeof newStock === 'number') {
      updatedStock = Math.max(0, newStock);
    } else if (typeof deltaStock === 'number') {
      updatedStock = Math.max(0, currentStock + deltaStock);
    }

    catalog[productIndex].stock = updatedStock;
    if (typeof minStock === 'number') {
      catalog[productIndex].minStock = minStock;
    }

    await db.gptformCommerceConfig.update({
      where: { id: config.id },
      data: { catalogJson: JSON.stringify(catalog) },
    });

    return NextResponse.json({
      success: true,
      updatedProduct: catalog[productIndex],
    });
  } catch (e: any) {
    if (e.message === 'UNAUTHORIZED' || e.message === 'NO_BUSINESS') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Failed to update inventory:', e);
    return NextResponse.json({ error: e.message || 'Failed to update inventory' }, { status: 500 });
  }
}
