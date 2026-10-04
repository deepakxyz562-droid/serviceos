'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Shirt, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { WidgetProps, str, num, bool } from '../widget-props';
import { cn } from '@/lib/utils';

interface VariantMatrix {
  [color: string]: {
    // stock may be `null` (= unknown / check availability) or a real
    // non-negative integer sourced from the InventoryItem table via
    // /api/products/[productId]/inventory. It is NEVER a fabricated
    // random number — see P8 worklog for context.
    [size: string]: { sku: string; stock: number | null; priceDelta?: number };
  };
}

interface VariantValue {
  productId?: string;
  color?: string;
  size?: string;
  sku?: string;
  stock?: number | null;
  unitPrice?: number;
  available?: boolean;
  currency?: string;
}

interface InventoryBySku {
  [sku: string]: number;
}

const DEFAULT_COLORS = [
  { label: 'Black', value: 'black', hex: '#111' },
  { label: 'White', value: 'white', hex: '#f8f8f8' },
  { label: 'Navy', value: 'navy', hex: '#1e3a5f' },
];
const DEFAULT_SIZES = ['S', 'M', 'L', 'XL'];

export function VariantSelector({ value, onChange, config, disabled, field }: WidgetProps) {
  const ariaLabel = str(field?.label, 'Variant selector');
  const currency = str(config.currency, 'USD');
  const basePrice = num(config.basePrice, 49);
  const productId = str(config.productId, '');

  const colors = useMemo(() => {
    const raw = config.colors;
    if (Array.isArray(raw) && raw.length) {
      return raw.map((c, i) => ({
        label: str((c as Record<string, unknown>).label, `Color ${i + 1}`),
        value: str((c as Record<string, unknown>).value, `c${i + 1}`),
        hex: str((c as Record<string, unknown>).hex, '#999'),
      }));
    }
    return DEFAULT_COLORS;
  }, [config.colors]);

  const sizes = Array.isArray(config.sizes) && config.sizes.length
    ? (config.sizes as string[]) : DEFAULT_SIZES;

  // ── Matrix construction ──────────────────────────────────────────
  //
  // Two sources:
  //   1. `config.matrix` (form-builder configured) — used as-is. Each
  //      cell may carry a real `stock` integer provided by the merchant.
  //   2. Synthesized matrix — built from colors × sizes with a derived
  //      SKU like `BLACK-S`. Stock is initialized to `null` (= unknown)
  //      instead of `Math.floor(Math.random() * 6) + 2` (which
  //      fabricated fake availability and misled users).
  //
  // The synthesized matrix is then overlaid with REAL stock levels
  // fetched from `/api/products/[productId]/inventory?skus=...` when a
  // `config.productId` is provided AND the caller is authenticated
  // (the endpoint is auth-gated to mirror /api/inventory/items). In a
  // public form context where no auth cookie is available, the fetch
  // 401s and the matrix stays at `null` (= neutral "Check availability").
  const matrix: VariantMatrix = useMemo(() => {
    if (config.matrix && typeof config.matrix === 'object') {
      return config.matrix as VariantMatrix;
    }
    const out: VariantMatrix = {};
    for (const c of colors) {
      out[c.value] = {};
      for (const s of sizes) {
        out[c.value][s] = {
          sku: `${c.value}-${s}`.toUpperCase(),
          stock: null,
          priceDelta: 0,
        };
      }
    }
    return out;
  }, [config.matrix, colors, sizes]);

  // Collect every SKU in the matrix so we can fetch real stock levels in
  // a single GET. Recomputed only when the matrix shape changes.
  const allSkus = useMemo(() => {
    const skus: string[] = [];
    for (const c of Object.keys(matrix)) {
      for (const s of Object.keys(matrix[c])) {
        const cell = matrix[c][s];
        if (cell?.sku) skus.push(cell.sku);
      }
    }
    return skus;
  }, [matrix]);

  const [inventoryBySku, setInventoryBySku] = useState<InventoryBySku>({});
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const fetchedKeyRef = useRef<string>('');

  useEffect(() => {
    // Only fetch when we have a productId AND at least one SKU AND we
    // haven't already fetched this exact combination. The fetch is
    // best-effort: on 401 (public form context with no auth cookie) or
    // any other failure, we silently fall back to the neutral state
    // (stock = null) — we never fabricate numbers.
    if (!productId || allSkus.length === 0) return;
    const fetchKey = `${productId}::${allSkus.join(',')}`;
    if (fetchedKeyRef.current === fetchKey) return;
    fetchedKeyRef.current = fetchKey;

    let cancelled = false;
    setInventoryLoading(true);
    fetch(
      `/api/products/${encodeURIComponent(productId)}/inventory?skus=${encodeURIComponent(allSkus.join(','))}`,
      { credentials: 'include' },
    )
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { bySku?: InventoryBySku } | null) => {
        if (!cancelled && data?.bySku) {
          setInventoryBySku(data.bySku);
        }
      })
      .catch(() => {
        /* silent — neutral state preserved (stock = null) */
      })
      .finally(() => {
        if (!cancelled) setInventoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [productId, allSkus]);

  // Merge the fetched real stock levels into the matrix. Cells with no
  // matching DB row stay at `null` (= "Check availability"). Cells that
  // have a real value get the integer stock level.
  const effectiveMatrix: VariantMatrix = useMemo(() => {
    if (Object.keys(inventoryBySku).length === 0) return matrix;
    const merged: VariantMatrix = {};
    for (const c of Object.keys(matrix)) {
      merged[c] = {};
      for (const s of Object.keys(matrix[c])) {
        const cell = matrix[c][s];
        if (!cell) continue;
        const realStock =
          cell.sku && Object.prototype.hasOwnProperty.call(inventoryBySku, cell.sku)
            ? inventoryBySku[cell.sku]
            : cell.stock;
        merged[c][s] = { ...cell, stock: realStock };
      }
    }
    return merged;
  }, [matrix, inventoryBySku]);

  const v: VariantValue = value && typeof value === 'object' ? (value as VariantValue) : {};
  const showStock = bool(config.showStock, true);

  const cell = v.color && v.size ? effectiveMatrix[v.color]?.[v.size] : undefined;
  const outOfStock = cell ? cell.stock !== null && cell.stock <= 0 : false;
  const unitPrice = +(basePrice + (cell?.priceDelta ?? 0)).toFixed(2);

  const pick = (color: string, size: string) => {
    if (disabled) return;
    const c = effectiveMatrix[color]?.[size];
    if (!c || c.stock !== null) {
      // Block the pick only when we KNOW the stock is 0. If stock is
      // `null` (unknown), allow the pick — the cart summary will show
      // "Check availability" instead of a fabricated number.
      if (c && c.stock !== null && c.stock <= 0) return;
    }
    onChange({
      productId: productId || 'prod-variant',
      color,
      size,
      sku: c?.sku,
      stock: c?.stock ?? null,
      unitPrice,
      available: c?.stock === null ? true : (c?.stock ?? 0) > 0,
      currency,
    });
  };

  return (
    <div className="space-y-3" aria-label={ariaLabel}>
      <div className="flex items-center gap-1.5">
        <Shirt className="size-4 text-primary" />
        <span className="text-xs font-bold">Select Variant</span>
        {inventoryLoading && (
          <span className="text-[10px] text-muted-foreground ml-1">checking stock…</span>
        )}
      </div>

      {/* Color picker */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5">
          Color {v.color && <span className="text-muted-foreground font-normal">— {colors.find((c) => c.value === v.color)?.label}</span>}
        </p>
        <div className="flex gap-2 flex-wrap">
          {colors.map((c) => {
            const chosen = v.color === c.value;
            return (
              <button
                key={c.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...v, color: c.value, size: undefined })}
                aria-label={`Color ${c.label}`}
                className={cn(
                  'size-9 rounded-full border-2 flex items-center justify-center transition-all',
                  chosen ? 'border-primary ring-2 ring-primary/30' : 'border-border hover:border-muted-foreground',
                )}
                style={{ background: c.hex }}
              >
                {chosen && <CheckMark />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Size matrix */}
      <div>
        <p className="text-[11px] font-semibold mb-1.5">
          Size {v.size && <span className="text-muted-foreground font-normal">— {v.size}</span>}
        </p>
        {!v.color ? (
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <AlertCircle className="size-3" /> Pick a color first.
          </p>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(sizes.length, 5)}, minmax(0, 1fr))` }}>
            {sizes.map((s) => {
              const c = effectiveMatrix[v.color!]?.[s];
              // `oos` = KNOWN out-of-stock (real stock = 0). Unknown
              // stock (null) is NOT marked out-of-stock — the user can
              // still pick it; the cart summary shows "Check availability".
              const oos = c?.stock !== null && c?.stock !== undefined && c.stock <= 0;
              const chosen = v.size === s;
              const lowStock = c?.stock !== null && c?.stock !== undefined && c.stock > 0 && c.stock <= 3;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={disabled || oos}
                  onClick={() => pick(v.color!, s)}
                  aria-label={`Size ${s}`}
                  className={cn(
                    'h-9 rounded-md border text-xs font-medium transition-colors relative',
                    chosen ? 'border-primary bg-primary text-primary-foreground' :
                    oos ? 'border-dashed border-border bg-muted/40 text-muted-foreground/60 line-through cursor-not-allowed' :
                    'border-border hover:bg-muted',
                  )}
                >
                  {s}
                  {showStock && lowStock && (
                    <span className="absolute -top-1 -right-1 text-[8px] bg-amber-500 text-white rounded-full px-1">
                      {c!.stock}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected summary */}
      {v.sku && (
        <div className="rounded-lg border border-emerald-300/70 dark:border-emerald-800/60 bg-emerald-50 dark:bg-emerald-950/30 p-2 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground font-mono">{v.sku}</span>
            {v.stock === null || v.stock === undefined ? (
              <Badge variant="outline" className="text-[9px] gap-1 text-muted-foreground">
                Check availability
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[9px] gap-1">
                Stock: {v.stock}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-emerald-200 dark:border-emerald-800/60">
            <span className="font-semibold">Unit price</span>
            <span className="font-black text-emerald-700 dark:text-emerald-400">{unitPrice.toFixed(2)} {currency}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CheckMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-3.5 text-white drop-shadow" fill="none" stroke="currentColor" strokeWidth={3}>
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default VariantSelector;
