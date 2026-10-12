'use client';

import React, { useState } from 'react';
import {
  Cookie,
  CupSoda,
  Droplets,
  Flame,
  Milk,
  Package,
  ShoppingBasket,
  Sparkles,
  Wheat,
} from 'lucide-react';
import type { BosProductItem } from '@/components/bos/bos-types';

const MASTER_CDN_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BOS_MASTER_CDN_URL
    ? process.env.NEXT_PUBLIC_BOS_MASTER_CDN_URL.replace(/\/$/, '')
    : '') || '/bos/products';

/**
 * Centralized Shared Master Barcode Map (EAN-13 -> Packshot path)
 * Shared across all stores so no store needs to upload duplicate FMCG images.
 */
const CENTRALIZED_BARCODE_IMAGE_MAP: Record<string, string> = {
  '8901030000019': `${MASTER_CDN_BASE}/tata-salt.png`,
  '8901030845201': `${MASTER_CDN_BASE}/tata-salt.png`,
  '8901058000012': `${MASTER_CDN_BASE}/maggi-noodles.png`,
  '8901058851458': `${MASTER_CDN_BASE}/maggi-noodles.png`,
  '8901262000015': `${MASTER_CDN_BASE}/amul-milk.png`,
  '8901262010023': `${MASTER_CDN_BASE}/amul-milk.png`,
  '8905009000023': `${MASTER_CDN_BASE}/sunflower-oil.png`,
  '8906007280129': `${MASTER_CDN_BASE}/sunflower-oil.png`,
  '8901719213304': `${MASTER_CDN_BASE}/parle-g.png`,
  '8901719101014': `${MASTER_CDN_BASE}/parle-g.png`,
  '8901764011234': `${MASTER_CDN_BASE}/coca-cola.png`,
  '8901764012235': `${MASTER_CDN_BASE}/coca-cola.png`,
  '8904004400129': `${MASTER_CDN_BASE}/bread.png`,
  '8901030834567': `${MASTER_CDN_BASE}/dove-soap.png`,
  '8901030704215': `${MASTER_CDN_BASE}/dove-soap.png`,
  '8901030245678': `${MASTER_CDN_BASE}/surf-excel.png`,
  '8901030654114': `${MASTER_CDN_BASE}/surf-excel.png`,
  '8901360007890': `${MASTER_CDN_BASE}/aashirvaad-atta.png`,
  '8901725121143': `${MASTER_CDN_BASE}/aashirvaad-atta.png`,
  '8902080104512': `${MASTER_CDN_BASE}/tropicana-juice.png`,
  '8901314010216': `${MASTER_CDN_BASE}/colgate-toothpaste.png`,
  '8901030512148': `${MASTER_CDN_BASE}/clinic-plus.png`,
  '8901396123456': `${MASTER_CDN_BASE}/dettol.png`,
  '8901396321453': `${MASTER_CDN_BASE}/dettol.png`,
  '4987176045218': `${MASTER_CDN_BASE}/ariel-detergent.png`,
};

const CENTRALIZED_KEYWORD_IMAGE_MAP: Array<{ keywords: string[]; url: string }> = [
  { keywords: ['tata salt', 'salt'], url: `${MASTER_CDN_BASE}/tata-salt.png` },
  { keywords: ['maggi', 'noodles'], url: `${MASTER_CDN_BASE}/maggi-noodles.png` },
  { keywords: ['amul milk', 'milk'], url: `${MASTER_CDN_BASE}/amul-milk.png` },
  { keywords: ['sunflower oil', 'cooking oil', 'fortune oil'], url: `${MASTER_CDN_BASE}/sunflower-oil.png` },
  { keywords: ['parle-g', 'parle g'], url: `${MASTER_CDN_BASE}/parle-g.png` },
  { keywords: ['coca cola', 'coke'], url: `${MASTER_CDN_BASE}/coca-cola.png` },
  { keywords: ['bread', 'britannia bread'], url: `${MASTER_CDN_BASE}/bread.png` },
  { keywords: ['dove soap', 'dove'], url: `${MASTER_CDN_BASE}/dove-soap.png` },
  { keywords: ['surf excel'], url: `${MASTER_CDN_BASE}/surf-excel.png` },
  { keywords: ['aashirvaad', 'atta'], url: `${MASTER_CDN_BASE}/aashirvaad-atta.png` },
  { keywords: ['tropicana'], url: `${MASTER_CDN_BASE}/tropicana-juice.png` },
  { keywords: ['colgate'], url: `${MASTER_CDN_BASE}/colgate-toothpaste.png` },
  { keywords: ['clinic plus'], url: `${MASTER_CDN_BASE}/clinic-plus.png` },
  { keywords: ['dettol'], url: `${MASTER_CDN_BASE}/dettol.png` },
  { keywords: ['ariel'], url: `${MASTER_CDN_BASE}/ariel-detergent.png` },
];

/**
 * Resolves a product image URL from:
 * 1. Explicit product.imageUrl (remote CDN or centralized asset)
 * 2. Centralized Master Barcode Map
 * 3. Centralized Master Product Keyword Map
 * Returns undefined if no match is found (so UI displays Icon + Product Name fallback).
 */
export function resolveBosProductImage(
  product: Pick<BosProductItem, 'name' | 'barcode' | 'imageUrl'>,
): string | undefined {
  if (product.imageUrl && product.imageUrl.trim()) {
    return product.imageUrl.trim();
  }

  const cleanBarcode = (product.barcode || '').trim();
  if (cleanBarcode && CENTRALIZED_BARCODE_IMAGE_MAP[cleanBarcode]) {
    return CENTRALIZED_BARCODE_IMAGE_MAP[cleanBarcode];
  }

  const lowerName = (product.name || '').toLowerCase();
  for (const entry of CENTRALIZED_KEYWORD_IMAGE_MAP) {
    if (entry.keywords.some((kw) => lowerName.includes(kw))) {
      return entry.url;
    }
  }

  return undefined;
}

/**
 * Live lookup against free public Open Food Facts / Open Beauty Facts CDN.
 * Zero hosting cost — returns the remote CDN image URL, brand, and product name if found.
 */
export async function lookupPublicProductByBarcodeOrName(query: {
  barcode?: string;
  name?: string;
}): Promise<{
  imageUrl?: string;
  brand?: string;
  unit?: string;
  source?: string;
} | null> {
  const code = (query.barcode || '').trim();
  const name = (query.name || '').trim();

  // First check centralized master catalog
  const localMatch = resolveBosProductImage({
    name,
    barcode: code,
  });
  if (localMatch) {
    return {
      imageUrl: localMatch,
      source: 'BOS Centralized Master Catalog',
    };
  }

  // Next query Open Food Facts public API by barcode
  if (code && /^\d{8,14}$/.test(code)) {
    const endpoints = [
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
      `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const data = await res.json();
        const p = data?.product;
        const img =
          p?.image_front_small_url || p?.image_front_url || p?.image_url;
        if (img) {
          return {
            imageUrl: String(img),
            brand: p?.brands ? String(p.brands).split(',')[0].trim() : undefined,
            unit: p?.quantity ? String(p.quantity).trim() : undefined,
            source: 'Open Food Facts Public CDN',
          };
        }
      } catch {
        // Ignore network error and continue
      }
    }
  }

  // Or search Open Food Facts by product name
  if (name.length >= 3) {
    try {
      const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
        name,
      )}&search_simple=1&action=process&json=1&page_size=1`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const data = await res.json();
        const first = data?.products?.[0];
        const img =
          first?.image_front_small_url ||
          first?.image_front_url ||
          first?.image_url;
        if (img) {
          return {
            imageUrl: String(img),
            brand: first?.brands
              ? String(first.brands).split(',')[0].trim()
              : undefined,
            unit: first?.quantity ? String(first.quantity).trim() : undefined,
            source: 'Open Food Facts Public CDN',
          };
        }
      }
    } catch {
      // Ignore network error
    }
  }

  return null;
}

function getCategoryStyle(category = '') {
  const c = category.toLowerCase();
  if (c.includes('dairy') || c.includes('milk')) {
    return { Icon: Milk, bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100' };
  }
  if (c.includes('beverage') || c.includes('juice') || c.includes('drink')) {
    return { Icon: CupSoda, bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100' };
  }
  if (c.includes('biscuit') || c.includes('snack') || c.includes('noodle')) {
    return { Icon: Cookie, bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100' };
  }
  if (c.includes('oil') || c.includes('ghee')) {
    return { Icon: Flame, bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-100' };
  }
  if (c.includes('personal') || c.includes('soap') || c.includes('care')) {
    return { Icon: Sparkles, bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100' };
  }
  if (c.includes('household') || c.includes('detergent') || c.includes('clean')) {
    return { Icon: Droplets, bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100' };
  }
  if (c.includes('grocery') || c.includes('groceries') || c.includes('atta')) {
    return { Icon: Wheat, bg: 'bg-[#EBF7F1]', text: 'text-[#0A6847]', border: 'border-[#DCE9E3]' };
  }
  return { Icon: ShoppingBasket, bg: 'bg-[#EBF7F1]', text: 'text-[#0A6847]', border: 'border-[#DCE9E3]' };
}

/**
 * Renders the product image from centralized/public CDN, or if unavailable/broken,
 * displays the Category Icon + Product Name inside the thumbnail frame.
 */
export function BosProductThumbnail({
  product,
  size = 'md',
  className = '',
}: {
  product: Pick<BosProductItem, 'name' | 'category' | 'barcode' | 'imageUrl'>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const resolvedUrl = resolveBosProductImage(product);
  const cleanName = (product.name || 'Product').replace(/\s*\([^)]+\)\s*$/, '');
  const { Icon, bg, text, border } = getCategoryStyle(product.category);

  const sizeClasses = {
    sm: 'h-9 w-9 rounded-lg p-1',
    md: 'h-10 w-10 rounded-lg p-1',
    lg: 'h-[72px] w-[72px] rounded-xl p-1.5',
    xl: 'h-[88px] w-full rounded-xl p-1.5',
  }[size];

  if (resolvedUrl && !imgError) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center border border-[#E6EFEA] bg-[#F9FCFA] overflow-hidden ${sizeClasses} ${className}`}
      >
        <img
          src={resolvedUrl}
          alt={product.name}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  // Fallback when image is not available: Category Icon + Product Name
  return (
    <div
      className={`flex flex-col shrink-0 items-center justify-center border ${border} ${bg} ${text} text-center overflow-hidden select-none ${sizeClasses} ${className}`}
      title={product.name}
    >
      <Icon
        className={
          size === 'xl' || size === 'lg'
            ? 'h-5 w-5 shrink-0 opacity-90'
            : 'h-3.5 w-3.5 shrink-0 opacity-90'
        }
      />
      <span
        className={`mt-0.5 w-full truncate font-bold leading-tight px-0.5 ${
          size === 'xl' || size === 'lg' ? 'text-[9.5px]' : 'text-[7.5px]'
        }`}
      >
        {cleanName}
      </span>
    </div>
  );
}
