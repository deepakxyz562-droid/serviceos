import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/commerce/products/import
 * Bulk imports products via CSV or JSON into EcommerceProduct and GptformCommerceConfig.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    let tenantId = auth?.tenantId;
    let workspaceId = auth?.workspaceId;

    const contentType = req.headers.get('content-type') || '';
    let rawItems: any[] = [];

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.products)) {
        rawItems = body.products;
      } else if (Array.isArray(body)) {
        rawItems = body;
      }
      if (!tenantId && body.tenantId) {
        tenantId = body.tenantId;
      }
    } else if (contentType.includes('multipart/form-data') || contentType.includes('text/csv')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ error: 'No file provided in upload' }, { status: 400 });
      }
      const text = await file.text();
      rawItems = parseCSV(text);
    }

    if (!tenantId) {
      // Fallback: lookup first tenant
      const defaultTenant = await db.tenant.findFirst({ select: { id: true } });
      if (defaultTenant) {
        tenantId = defaultTenant.id;
      } else {
        return NextResponse.json({ error: 'Unauthorized: missing tenant session' }, { status: 401 });
      }
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ error: 'No valid product rows found to import' }, { status: 400 });
    }

    // Find or create a CSV IntegrationConnection record
    let connection = await db.integrationConnection.findFirst({
      where: { tenantId, provider: 'csv_import' },
    });

    if (!connection) {
      connection = await db.integrationConnection.create({
        data: {
          provider: 'csv_import',
          name: 'CSV Product Catalog Import',
          status: 'connected',
          tenantId,
          workspaceId: workspaceId || null,
          syncSettingsJson: JSON.stringify({ products: true }),
        },
      });
    }

    let importedCount = 0;
    const errors: string[] = [];
    const newCatalogItems: any[] = [];

    for (let i = 0; i < rawItems.length; i++) {
      const row = rawItems[i];
      const title = (row.name || row.title || row['Product Name'] || '').trim();
      if (!title) {
        continue;
      }

      const price = parseFloat(row.price || row.Price || row['Regular Price'] || '0') || 0;
      const category = (row.category || row.Category || 'General').trim();
      const description = (row.description || row.Description || row.summary || '').trim().slice(0, 500);
      const imageUrl = (row.imageUrl || row.image || row.Image || row['Image URL'] || '').trim();
      const sku = (row.sku || row.SKU || '').trim() || undefined;
      const stock = parseInt(row.stock || row.Stock || row.quantity || '999', 10);
      const isActive = row.isActive !== undefined ? Boolean(row.isActive) : stock > 0;
      const extId = `csv_${Date.now()}_${i}`;

      try {
        await db.ecommerceProduct.create({
          data: {
            externalProductId: extId,
            title,
            description,
            price,
            sku,
            inventoryQuantity: stock,
            productType: category,
            imagesJson: imageUrl ? JSON.stringify([imageUrl]) : '[]',
            status: isActive ? 'active' : 'draft',
            currency: 'USD',
            integrationId: connection.id,
            tenantId,
            workspaceId: workspaceId || null,
          },
        });

        newCatalogItems.push({
          id: extId,
          name: title,
          price,
          category,
          description,
          imageUrl,
          sku,
          isActive,
          source: 'csv',
        });

        importedCount++;
      } catch (err: any) {
        errors.push(`Row ${i + 1} (${title}): ${err.message}`);
      }
    }

    // Merge into GptformCommerceConfig.catalogJson
    try {
      const existingConfig = await db.gptformCommerceConfig.findFirst({
        where: { businessId: tenantId },
      });
      if (existingConfig) {
        let existingCatalog: any[] = [];
        try {
          existingCatalog = JSON.parse(existingConfig.catalogJson || '[]');
        } catch {}

        const merged = [...existingCatalog, ...newCatalogItems];
        await db.gptformCommerceConfig.update({
          where: { id: existingConfig.id },
          data: {
            catalogJson: JSON.stringify(merged),
          },
        });
      }
    } catch (confErr) {
      console.warn('[csv/import] Could not update commerce config catalog:', confErr);
    }

    return NextResponse.json({
      success: true,
      imported: importedCount,
      failed: errors.length,
      errors: errors.slice(0, 5),
      message: `Successfully imported ${importedCount} products.`,
    });
  } catch (error: any) {
    console.error('[csv/import] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process product import' },
      { status: 500 }
    );
  }
}

/**
 * Basic robust CSV parser for header-based product files
 */
function parseCSV(text: string): Record<string, string>[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(obj);
  }

  return rows;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
