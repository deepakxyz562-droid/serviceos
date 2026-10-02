import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/ecommerce/shopify/sync
 * Connects to a Shopify store, synchronizes products into EcommerceProduct,
 * and attaches the store catalog to the tenant's AI Agent.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    const body = await req.json().catch(() => ({}));
    const { storeUrl: rawStoreUrl, accessToken, agentId } = body;

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

    let cleanDomain = (rawStoreUrl || '').trim();
    if (!cleanDomain) {
      // Check existing connection
      const existingConn = await db.integrationConnection.findFirst({
        where: { tenantId, provider: 'shopify' },
      });
      if (existingConn?.storeUrl) {
        cleanDomain = existingConn.storeUrl;
      } else {
        return NextResponse.json(
          { error: 'Store URL is required (e.g., mystore.myshopify.com)' },
          { status: 400 }
        );
      }
    }

    // Clean up domain format
    cleanDomain = cleanDomain.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').trim();
    if (!cleanDomain.includes('.') && !cleanDomain.includes(':')) {
      cleanDomain = `${cleanDomain}.myshopify.com`;
    }

    let products: any[] = [];
    let syncError: string | null = null;

    // 1. Try Shopify Admin REST API if accessToken is provided
    if (accessToken) {
      try {
        const adminUrl = `https://${cleanDomain}/admin/api/2024-01/products.json?limit=50`;
        const res = await fetch(adminUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': accessToken,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.products)) {
            products = data.products;
          }
        } else {
          syncError = `Shopify Admin API responded with HTTP ${res.status}: ${res.statusText}`;
        }
      } catch (err: any) {
        syncError = err.message || 'Failed to contact Shopify Admin API';
      }
    }

    // 2. Fallback to public Storefront products.json if Admin API didn't return products
    if (products.length === 0) {
      try {
        const publicUrl = `https://${cleanDomain}/products.json?limit=50`;
        const publicRes = await fetch(publicUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'ServiceOS-Agent/1.0',
            'Accept': 'application/json',
          },
        });

        if (publicRes.ok) {
          const publicData = await publicRes.json();
          if (Array.isArray(publicData.products)) {
            products = publicData.products;
            syncError = null; // Successfully retrieved via Storefront
          }
        } else if (!syncError) {
          syncError = `Could not reach store at https://${cleanDomain}/products.json (${publicRes.status})`;
        }
      } catch (err: any) {
        if (!syncError) {
          syncError = err.message || 'Failed to connect to store domain';
        }
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        {
          error: syncError || 'No products found. Verify your store domain and Admin API Access Token.',
          storeDomain: cleanDomain,
        },
        { status: 400 }
      );
    }

    // 3. Find or create IntegrationConnection record
    let connection = await db.integrationConnection.findFirst({
      where: { tenantId, provider: 'shopify' },
    });

    if (!connection) {
      connection = await db.integrationConnection.create({
        data: {
          provider: 'shopify',
          name: `${cleanDomain} Store`,
          status: 'connected',
          storeUrl: cleanDomain,
          accessToken: accessToken || null,
          tenantId,
          workspaceId: workspaceId || null,
          syncSettingsJson: JSON.stringify({ products: true }),
        },
      });
    } else {
      connection = await db.integrationConnection.update({
        where: { id: connection.id },
        data: {
          storeUrl: cleanDomain,
          accessToken: accessToken || connection.accessToken,
          status: 'connected',
          lastSyncAt: new Date(),
          lastSyncStatus: 'success',
        },
      });
    }

    // 4. Upsert products into EcommerceProduct
    let syncedCount = 0;
    const syncedSummary = [];

    for (const p of products) {
      const extId = String(p.id);
      const title = p.title || 'Untitled Product';
      const description = (p.body_html || p.description || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 500);
      const price = parseFloat(p.variants?.[0]?.price || '0') || 0;
      const compareAtPrice = p.variants?.[0]?.compare_at_price
        ? parseFloat(p.variants[0].compare_at_price)
        : null;
      const inventoryQuantity =
        p.variants?.reduce(
          (sum: number, v: any) => sum + (Number(v.inventory_quantity) || 0),
          0
        ) ?? 0;
      const sku = p.variants?.[0]?.sku || null;
      const vendor = p.vendor || null;
      const productType = p.product_type || 'Product';
      const tags = Array.isArray(p.tags)
        ? p.tags
        : typeof p.tags === 'string'
        ? p.tags.split(',').map((t: string) => t.trim())
        : [];
      const images = Array.isArray(p.images)
        ? p.images.map((img: any) => (typeof img === 'string' ? img : img?.src)).filter(Boolean)
        : [];

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
            vendor,
            productType,
            tagsJson: JSON.stringify(tags),
            imagesJson: JSON.stringify(images),
            status: p.status || 'active',
          },
        });
      } else {
        await db.ecommerceProduct.create({
          data: {
            externalProductId: extId,
            title,
            description,
            status: p.status || 'active',
            productType,
            vendor,
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

    // 5. Update agent configJson if agentId is provided
    if (agentId) {
      try {
        const agent = await db.formAgent.findUnique({ where: { id: agentId } });
        if (agent) {
          let config: any = {};
          try {
            config = typeof agent.configJson === 'string' ? JSON.parse(agent.configJson) : (agent.configJson || {});
          } catch {}

          config.channels = config.channels || {};
          config.channels.shopify = {
            ...(config.channels.shopify || {}),
            enabled: true,
            shopDomain: cleanDomain,
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
        console.warn('[shopify/sync] Warning updating agent configJson:', err);
      }
    }

    return NextResponse.json({
      success: true,
      storeDomain: cleanDomain,
      count: syncedCount,
      sampleProducts: syncedSummary,
      message: `Successfully synchronized ${syncedCount} products from Shopify.`,
    });
  } catch (error: any) {
    console.error('[shopify/sync] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error while syncing Shopify catalog' },
      { status: 500 }
    );
  }
}
