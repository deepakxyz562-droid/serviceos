import { db } from '@/lib/db';
import { getCreemConfig, getBaseUrl } from '@/lib/creem';
import { logger } from '@/lib/logger';

/**
 * Delete a Creem product by ID via DELETE /v1/products/{id}
 *
 * NOTE: Creem's API docs don't document a DELETE endpoint, but the REST
 * convention is DELETE /v1/products/{product_id}. This function attempts
 * that call. If Creem doesn't support deletion, it returns { ok: false }
 * and the admin must delete products manually in the Creem dashboard.
 *
 * @param productId - The Creem product ID (e.g. "prod_xxx")
 * @returns { ok: boolean, message: string }
 */
export async function deleteCreemProduct(productId: string): Promise<{ ok: boolean; message: string }> {
  const cfg = await getCreemConfig();
  if (!cfg) {
    throw new Error('Creem is not configured.');
  }

  try {
    const res = await fetch(
      `${getBaseUrl(cfg.apiKey)}/v1/products/${productId}`,
      {
        method: 'DELETE',
        headers: {
          'x-api-key': cfg.apiKey,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(10_000),
      }
    );

    if (res.ok) {
      return { ok: true, message: 'Product deleted successfully.' };
    }

    if (res.status === 404) {
      return { ok: false, message: 'Product not found (may already be deleted).' };
    }

    if (res.status === 405) {
      return { ok: false, message: 'Creem does not support product deletion via API. Please delete manually in the Creem dashboard.' };
    }

    const text = await res.text().catch(() => '');
    return { ok: false, message: `Creem API error (HTTP ${res.status}): ${text.slice(0, 200)}` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Network error deleting product.' };
  }
}

/**
 * Delete all mapped Creem products + clear the product mapping.
 *
 * This is the "clean slate" function for when the admin has duplicate
 * products in Creem and wants to start fresh. It:
 *   1. Reads all mapped product IDs from the Creem config
 *   2. Attempts to delete each one via the Creem API
 *   3. Clears ALL product IDs from the config (sets products to {})
 *   4. Returns the results so the admin can see what succeeded/failed
 *
 * After this, the admin can click "Create All in Creem" to create
 * fresh products without duplicates.
 */
export async function deleteAllCreemProducts(): Promise<{
  deleted: Array<{ productId: string; ok: boolean; message?: string }>;
  clearedCount: number;
}> {
  const cfg = await getCreemConfig();
  if (!cfg) {
    throw new Error('Creem is not configured.');
  }

  const results: Array<{ productId: string; ok: boolean; message?: string }> = [];

  // FIX 2: Collect ALL product IDs — both from the current mapping AND
  // from the productHistory array. The history tracks every product ID
  // ever created by createAllCreemProducts(), including orphans from
  // previous runs that are no longer in the current products mapping.
  // This ensures "Delete All" can clean up ALL 45 products (or however
  // many were created across multiple runs).
  const allProductIds: string[] = [];

  // 1. From current products mapping
  if (cfg.products) {
    for (const [planCode, cycles] of Object.entries(cfg.products)) {
      if (cycles.monthly) allProductIds.push(cycles.monthly);
      if (cycles.yearly) allProductIds.push(cycles.yearly);
    }
  }

  // 2. From productHistory (includes ALL previously-created IDs)
  // Read the raw config to get productHistory (not exposed in CreemConfig type)
  const toggle = await db.revenueFeatureToggle.findUnique({
    where: { featureKey: 'creem_billing' },
  });

  let historyIds: string[] = [];
  if (toggle) {
    try {
      const rawConfig = JSON.parse(toggle.configJson || '{}');
      historyIds = Array.isArray(rawConfig.productHistory) ? rawConfig.productHistory : [];
    } catch { /* empty config */ }
  }

  // Merge + deduplicate all IDs
  const allIds = Array.from(new Set([...allProductIds, ...historyIds]));

  // Delete each product
  for (const productId of allIds) {
    const result = await deleteCreemProduct(productId);
    results.push({ productId, ok: result.ok, message: result.message });
  }

  // Clear ALL product mappings AND productHistory from the config
  if (toggle) {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(toggle.configJson || '{}');
    } catch { /* empty config */ }

    // Clear both the products map AND the history
    config.products = {};
    config.productHistory = [];

    await db.revenueFeatureToggle.update({
      where: { featureKey: 'creem_billing' },
      data: { configJson: JSON.stringify(config) },
    });
  }

  return {
    deleted: results,
    clearedCount: allIds.length,
  };
}
