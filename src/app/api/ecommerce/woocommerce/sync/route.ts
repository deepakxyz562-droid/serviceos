import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/ecommerce/woocommerce/sync
 * Connects to a WooCommerce store via REST API,
 * synchronizes products into EcommerceProduct,
 * and attaches the store catalog to the tenant's AI Agent.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    const body = await req.json().catch(() => ({}));
    const { siteUrl: rawSiteUrl, storeUrl: altStoreUrl, consumerKey, consumerSecret, agentId } = body;
    const inputUrl = rawSiteUrl || altStoreUrl || '';

    // Resolve tenantId
    let tenantId = auth?.tenantId;
    let workspaceId = auth?.workspaceId;

    if (!tenantId && agentId) {
      const agent = await db.formAgent.findUnique({
        where: { id: agentId },
        select: { tenantId: true, workspaceId: true },
      });
      if (agent?.tenantId) {
        tenantId = agent.tenantId;
        workspaceId = agent.workspaceId;
      }
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Unauthorized: missing tenant session or valid agent ID' },
        { status: 401 }
      );
    }

    let cleanSiteUrl = inputUrl.trim();
    if (!cleanSiteUrl) {
      // Check existing connection
      const existingConn = await db.integrationConnection.findFirst({
        where: { tenantId, provider: 'woocommerce' },
      });
      if (existingConn?.storeUrl) {
        cleanSiteUrl = existingConn.storeUrl;
      } else {
        return NextResponse.json(
          { error: 'Store URL is required (e.g., https://mystore.com)' },
          { status: 400 }
        );
      }
    }

    // Ensure protocol
    if (!cleanSiteUrl.startsWith('http://') && !cleanSiteUrl.startsWith('https://')) {
      cleanSiteUrl = `https://${cleanSiteUrl}`;
    }
    cleanSiteUrl = cleanSiteUrl.replace(/\/+$/, '');

    let products: any[] = [];
    let syncError: string | null = null;

    // 1. Try WooCommerce REST API v3 with credentials
    if (consumerKey && consumerSecret) {
      try {
        const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const apiUrl = `${cleanSiteUrl}/wp-json/wc/v3/products?per_page=100`;

        const res = await fetch(apiUrl, {
          method: 'GET',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/json',
            'User-Agent': 'ServiceOS-Agent/1.0',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            products = data;
          }
        } else {
          syncError = `WooCommerce REST API returned HTTP ${res.status}: ${res.statusText}`;
        }
      } catch (err: any) {
        syncError = err?.message || 'Failed to contact WooCommerce REST API';
      }
    }

    // 2. Fallback: WooCommerce Store API (Public Storefront API for WP)
    if (products.length === 0) {
      try {
        const publicUrl = `${cleanSiteUrl}/wp-json/wc/store/v1/products?per_page=100`;
        const pubRes = await fetch(publicUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'ServiceOS-Agent/1.0',
            Accept: 'application/json',
          },
        });

        if (pubRes.ok) {
          const pubData = await pubRes.json();
          if (Array.isArray(pubData)) {
            products = pubData;
            syncError = null;
          }
        }
      } catch {
        // continue
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        {
          error:
            syncError ||
            'No products found. Verify your WooCommerce Site URL, Consumer Key, and Consumer Secret.',
          storeUrl: cleanSiteUrl,
        },
        { status: 400 }
      );
    }

    // 3. Find or create IntegrationConnection record
    let connection = await db.integrationConnection.findFirst({
      where: { tenantId, provider: 'woocommerce' },
    });

    if (!connection) {
      connection = await db.integrationConnection.create({
        data: {
          provider: 'woocommerce',
          name: `${cleanSiteUrl.replace(/^https?:\/\//, '')} Store`,
          status: 'connected',
          storeUrl: cleanSiteUrl,
          accessToken: consumerKey || null,
          apiSecret: consumerSecret || null,
          tenantId,
          workspaceId: workspaceId || null,
          syncSettingsJson: JSON.stringify({ products: true }),
        },
      });
    } else {
      connection = await db.integrationConnection.update({
        where: { id: connection.id },
        data: {
          storeUrl: cleanSiteUrl,
          accessToken: consumerKey || connection.accessToken,
          apiSecret: consumerSecret || connection.apiSecret,
          status: 'connected',
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
        },
      });
    }

    // 4. Upsert products into EcommerceProduct
    let syncedCount = 0;
    const syncedSummary: any[] = [];
    const catalogJsonItems: any[] = [];

    for (const p of products) {
      const extId = String(p.id);
      const title = p.name || p.title || 'Untitled Product';
      const rawDesc = p.description || p.short_description || '';
      const description = rawDesc
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);

      const price = parseFloat(p.price || p.regular_price || '0') || 0;
      const compareAtPrice = p.regular_price ? parseFloat(p.regular_price) : null;
      const inventoryQuantity =
        p.stock_quantity !== null && p.stock_quantity !== undefined
          ? Number(p.stock_quantity)
          : p.in_stock || p.is_in_stock
          ? 999
          : 0;

      const sku = p.sku || null;
      const productType = p.type || 'Product';

      // Tags
      const tags = Array.isArray(p.tags)
        ? p.tags.map((t: any) => (typeof t === 'string' ? t : t?.name)).filter(Boolean)
        : [];

      // Images
      const images = Array.isArray(p.images)
        ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.src)).filter(Boolean)
        : [];

      // Primary image
      const primaryImageUrl = images[0] || '';

      // Categories
      const categories = Array.isArray(p.categories)
        ? p.categories.map((c: any) => (typeof c === 'string' ? c : c?.name)).filter(Boolean)
        : [];
      const primaryCategory = categories[0] || 'General';

      const existingProd = await db.ecommerceProduct.findFirst({
        where: { integrationId: connection.id, externalProductId: extId },
      });

      if (existingProd) {
        await db.ecommerceProduct.update({
          where: { id: existingProd.id },
          data: {
            title,
            description,
            price,
            compareAtPrice,
            inventoryQuantity,
            sku,
            productType,
            tagsJson: JSON.stringify(tags),
            imagesJson: JSON.stringify(images),
            status: p.status === 'publish' || p.status === 'active' ? 'active' : 'draft',
          },
        });
      } else {
        await db.ecommerceProduct.create({
          data: {
            externalProductId: extId,
            title,
            description,
            status: p.status === 'publish' || p.status === 'active' ? 'active' : 'draft',
            productType,
            tagsJson: JSON.stringify(tags),
            price,
            compareAtPrice,
            currency: 'USD',
            sku,
            inventoryQuantity,
            imagesJson: JSON.stringify(images),
            integrationId: connection.id,
            tenantId,
            workspaceId: workspaceId || null,
          },
        });
      }

      catalogJsonItems.push({
        id: extId,
        name: title,
        price,
        category: primaryCategory,
        description,
        imageUrl: primaryImageUrl,
        sku: sku || undefined,
        isActive: inventoryQuantity > 0,
        source: 'woocommerce',
      });

      syncedCount++;
      if (syncedSummary.length < 10) {
        syncedSummary.push({ id: extId, title, price, inventory: inventoryQuantity });
      }
    }

    // Update connection count
    await db.integrationConnection.update({
      where: { id: connection.id },
      data: {
        totalSyncedProducts: syncedCount,
        lastSyncAt: new Date(),
        lastSyncStatus: 'success',
      },
    });

    // 5. Update Commerce Config catalog if exists
    try {
      const existingConfig = await db.gptformCommerceConfig.findFirst({
        where: { businessId: tenantId },
      });
      if (existingConfig) {
        let existingCatalog: any[] = [];
        try {
          existingCatalog = JSON.parse(existingConfig.catalogJson || '[]');
        } catch {}

        // Merge: keep non-woocommerce items, replace/append woocommerce items
        const nonWoo = existingCatalog.filter((it: any) => it.source !== 'woocommerce');
        const mergedCatalog = [...nonWoo, ...catalogJsonItems];

        await db.gptformCommerceConfig.update({
          where: { id: existingConfig.id },
          data: {
            catalogJson: JSON.stringify(mergedCatalog),
          },
        });
      }
    } catch (confErr) {
      console.warn('[woocommerce/sync] Could not update commerce config catalog:', confErr);
    }

    // 6. Update agent configJson if agentId is provided
    if (agentId) {
      try {
        const agent = await db.formAgent.findUnique({ where: { id: agentId } });
        if (agent) {
          let config: any = {};
          try {
            config =
              typeof agent.configJson === 'string'
                ? JSON.parse(agent.configJson)
                : agent.configJson || {};
          } catch {}

          config.channels = config.channels || {};
          config.channels.woocommerce = {
            ...(config.channels.woocommerce || {}),
            enabled: true,
            siteUrl: cleanSiteUrl,
            syncProducts: true,
            lastSyncAt: new Date().toISOString(),
            productCount: syncedCount,
          };

          await db.formAgent.update({
            where: { id: agentId },
            data: {
              configJson: JSON.stringify(config),
            },
          });
        }
      } catch (err) {
        console.warn('[woocommerce/sync] Warning updating agent configJson:', err);
      }
    }

    return NextResponse.json({
      success: true,
      storeUrl: cleanSiteUrl,
      count: syncedCount,
      sampleProducts: syncedSummary,
      message: `Successfully synchronized ${syncedCount} products from WooCommerce.`,
    });
  } catch (error: any) {
    console.error('[woocommerce/sync] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while syncing WooCommerce catalog' },
      { status: 500 }
    );
  }
}
