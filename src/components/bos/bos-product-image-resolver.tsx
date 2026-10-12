'use client';

import React, { useEffect, useState } from 'react';
import {
  Cookie,
  CupSoda,
  Droplets,
  Flame,
  Milk,
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
const CENTRALIZED_BARCODE_IMAGE_MAP: Record<string, { url: string; brand?: string; unit?: string }> = {
  '8901030000019': { url: `${MASTER_CDN_BASE}/tata-salt.png`, brand: 'Tata', unit: '1kg' },
  '8901030845201': { url: `${MASTER_CDN_BASE}/tata-salt.png`, brand: 'Tata', unit: '1kg' },
  '8904043901015': { url: `${MASTER_CDN_BASE}/tata-salt.png`, brand: 'Tata', unit: '1kg' },
  '8901058000012': { url: `${MASTER_CDN_BASE}/maggi-noodles.png`, brand: 'Nestle', unit: '70g' },
  '8901058851458': { url: `${MASTER_CDN_BASE}/maggi-noodles.png`, brand: 'Nestle', unit: '70g' },
  '8901262000015': { url: `${MASTER_CDN_BASE}/amul-milk.png`, brand: 'Amul', unit: '1L' },
  '8901262010023': { url: `${MASTER_CDN_BASE}/amul-milk.png`, brand: 'Amul', unit: '1L' },
  '8905009000023': { url: `${MASTER_CDN_BASE}/sunflower-oil.png`, brand: 'Fortune', unit: '1L' },
  '8906007280129': { url: `${MASTER_CDN_BASE}/sunflower-oil.png`, brand: 'Fortune', unit: '1L' },
  '8901719213304': { url: `${MASTER_CDN_BASE}/parle-g.png`, brand: 'Parle', unit: '250g' },
  '8901719101014': { url: `${MASTER_CDN_BASE}/parle-g.png`, brand: 'Parle', unit: '250g' },
  '8901764011234': { url: `${MASTER_CDN_BASE}/coca-cola.png`, brand: 'Coca-Cola', unit: '500ml' },
  '8901764012235': { url: `${MASTER_CDN_BASE}/coca-cola.png`, brand: 'Coca-Cola', unit: '500ml' },
  '8904004400129': { url: `${MASTER_CDN_BASE}/bread.png`, brand: 'Britannia', unit: '400g' },
  '8901030834567': { url: `${MASTER_CDN_BASE}/dove-soap.png`, brand: 'Unilever', unit: '100g' },
  '8901030704215': { url: `${MASTER_CDN_BASE}/dove-soap.png`, brand: 'Unilever', unit: '100g' },
  '8901030245678': { url: `${MASTER_CDN_BASE}/surf-excel.png`, brand: 'Unilever', unit: '1kg' },
  '8901030654114': { url: `${MASTER_CDN_BASE}/surf-excel.png`, brand: 'Unilever', unit: '1kg' },
  '8901360007890': { url: `${MASTER_CDN_BASE}/aashirvaad-atta.png`, brand: 'ITC', unit: '5kg' },
  '8901725121143': { url: `${MASTER_CDN_BASE}/aashirvaad-atta.png`, brand: 'ITC', unit: '5kg' },
  '8902080104512': { url: `${MASTER_CDN_BASE}/tropicana-juice.png`, brand: 'Tropicana', unit: '1L' },
  '8901314010216': { url: `${MASTER_CDN_BASE}/colgate-toothpaste.png`, brand: 'Colgate', unit: '150g' },
  '8901030512148': { url: `${MASTER_CDN_BASE}/clinic-plus.png`, brand: 'Unilever', unit: '340ml' },
  '8901396123456': { url: `${MASTER_CDN_BASE}/dettol.png`, brand: 'Reckitt', unit: '200ml' },
  '8901396321453': { url: `${MASTER_CDN_BASE}/dettol.png`, brand: 'Reckitt', unit: '200ml' },
  '4987176045218': { url: `${MASTER_CDN_BASE}/ariel-detergent.png`, brand: 'P&G', unit: '1kg' },
};

const CENTRALIZED_KEYWORD_IMAGE_MAP: Array<{
  keywords: string[];
  url: string;
  brand?: string;
  unit?: string;
}> = [
  { keywords: ['tata salt', 'iodized salt', 'salt'], url: `${MASTER_CDN_BASE}/tata-salt.png`, brand: 'Tata', unit: '1kg' },
  { keywords: ['maggi', 'noodles', 'yippee', 'ramen', 'pasta'], url: `${MASTER_CDN_BASE}/maggi-noodles.png`, brand: 'Nestle', unit: '70g' },
  { keywords: ['amul milk', 'mother dairy', 'milk', 'curd', 'lassi', 'paneer', 'dairy'], url: `${MASTER_CDN_BASE}/amul-milk.png`, brand: 'Amul', unit: '1L' },
  { keywords: ['sunflower oil', 'cooking oil', 'fortune oil', 'mustard oil', 'soyabean oil', 'groundnut oil', 'refined oil', 'oil', 'ghee'], url: `${MASTER_CDN_BASE}/sunflower-oil.png`, brand: 'Fortune', unit: '1L' },
  { keywords: ['parle-g', 'parle g', 'marie', 'good day', 'bourbon', 'oreo', 'biscuit', 'cookies'], url: `${MASTER_CDN_BASE}/parle-g.png`, brand: 'Parle', unit: '250g' },
  { keywords: ['coca cola', 'coke', 'pepsi', 'thumbs up', 'thums up', 'sprite', 'fanta', 'limca', 'cold drink', 'soda'], url: `${MASTER_CDN_BASE}/coca-cola.png`, brand: 'Coca-Cola', unit: '500ml' },
  { keywords: ['bread', 'britannia bread', 'brown bread', 'pav', 'bun', 'rusk'], url: `${MASTER_CDN_BASE}/bread.png`, brand: 'Britannia', unit: '400g' },
  { keywords: ['dove soap', 'dove', 'lux', 'pears', 'cinthol', 'santoor', 'lifebuoy', 'bath soap', 'soap'], url: `${MASTER_CDN_BASE}/dove-soap.png`, brand: 'Unilever', unit: '100g' },
  { keywords: ['surf excel', 'rin', 'wheel', 'tide', 'ghadi'], url: `${MASTER_CDN_BASE}/surf-excel.png`, brand: 'Unilever', unit: '1kg' },
  { keywords: ['aashirvaad', 'atta', 'wheat flour', 'maida', 'besan', 'suji', 'rice', 'basmati'], url: `${MASTER_CDN_BASE}/aashirvaad-atta.png`, brand: 'ITC', unit: '5kg' },
  { keywords: ['tropicana', 'real juice', 'mango juice', 'orange juice', 'mixed fruit', 'juice', 'frooti', 'maaza'], url: `${MASTER_CDN_BASE}/tropicana-juice.png`, brand: 'Tropicana', unit: '1L' },
  { keywords: ['colgate', 'pepsodent', 'sensodyne', 'close up', 'dabur red', 'toothpaste', 'toothbrush'], url: `${MASTER_CDN_BASE}/colgate-toothpaste.png`, brand: 'Colgate', unit: '150g' },
  { keywords: ['clinic plus', 'sunsilk', 'head & shoulders', 'pantene', 'tressemme', 'shampoo', 'conditioner'], url: `${MASTER_CDN_BASE}/clinic-plus.png`, brand: 'Unilever', unit: '340ml' },
  { keywords: ['dettol', 'savlon', 'handwash', 'sanitizer', 'antiseptic', 'liquid soap'], url: `${MASTER_CDN_BASE}/dettol.png`, brand: 'Reckitt', unit: '200ml' },
  { keywords: ['ariel', 'matic', 'detergent', 'washing powder', 'liquid detergent'], url: `${MASTER_CDN_BASE}/ariel-detergent.png`, brand: 'P&G', unit: '1kg' },
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

  const lowerName = (product.name || '').trim().toLowerCase();
  if (lowerName) {
    for (const entry of CENTRALIZED_KEYWORD_IMAGE_MAP) {
      if (entry.keywords.some((kw) => lowerName.includes(kw))) {
        return entry.url;
      }
    }
  }

  const cleanBarcode = (product.barcode || '').trim();
  if (cleanBarcode && CENTRALIZED_BARCODE_IMAGE_MAP[cleanBarcode]) {
    return CENTRALIZED_BARCODE_IMAGE_MAP[cleanBarcode].url;
  }

  return undefined;
}

async function fetchJsonWithTimeout(url: string, timeoutMs = 4500): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Live lookup against:
 * 1. BOS Centralized Master Catalog (by product name or barcode)
 * 2. Open Food Facts / Open Beauty Facts / Open Products Facts API v2 (by barcode or name)
 * 3. DummyJSON & Wikimedia Commons public product CDNs (by product name)
 * Zero hosting cost — returns the remote CDN image URL, brand, and product unit if found.
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
  const lowerName = name.toLowerCase();

  // 1. Check Centralized Keyword Catalog by Name first (so typing a product name works immediately)
  if (lowerName) {
    for (const entry of CENTRALIZED_KEYWORD_IMAGE_MAP) {
      if (entry.keywords.some((kw) => lowerName.includes(kw))) {
        return {
          imageUrl: entry.url,
          brand: entry.brand,
          unit: entry.unit,
          source: 'BOS Centralized Master Catalog',
        };
      }
    }
  }

  // 2. Check Centralized Barcode Map
  if (code && CENTRALIZED_BARCODE_IMAGE_MAP[code]) {
    const match = CENTRALIZED_BARCODE_IMAGE_MAP[code];
    return {
      imageUrl: match.url,
      brand: match.brand,
      unit: match.unit,
      source: 'BOS Centralized Master Catalog',
    };
  }

  // 3. Query Open Food Facts / Open Beauty Facts / Open Products Facts by Barcode
  if (code && /^\d{8,14}$/.test(code)) {
    const endpoints = [
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,quantity,image_front_small_url,image_front_url,image_url`,
      `https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,quantity,image_front_small_url,image_front_url,image_url`,
      `https://world.openproductsfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,quantity,image_front_small_url,image_front_url,image_url`,
    ];

    for (const url of endpoints) {
      const data = await fetchJsonWithTimeout(url, 4000);
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
    }
  }

  // 4. Search Public Product CDNs by Product Name
  if (name.length >= 2) {
    // 4a. Open Food Facts fast filtered search
    const offUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(
      name,
    )}&search_simple=1&action=process&json=1&page_size=3&fields=product_name,brands,quantity,image_front_small_url,image_front_url,image_url`;
    const offData = await fetchJsonWithTimeout(offUrl, 4000);
    if (Array.isArray(offData?.products)) {
      const itemWithImg = offData.products.find(
        (item: any) =>
          item?.image_front_small_url || item?.image_front_url || item?.image_url,
      );
      if (itemWithImg) {
        const img =
          itemWithImg.image_front_small_url ||
          itemWithImg.image_front_url ||
          itemWithImg.image_url;
        return {
          imageUrl: String(img),
          brand: itemWithImg.brands
            ? String(itemWithImg.brands).split(',')[0].trim()
            : undefined,
          unit: itemWithImg.quantity
            ? String(itemWithImg.quantity).trim()
            : undefined,
          source: 'Open Food Facts Public CDN',
        };
      }
    }

    // 4b. DummyJSON Public Retail Product CDN
    const dummyData = await fetchJsonWithTimeout(
      `https://dummyjson.com/products/search?q=${encodeURIComponent(name)}&limit=1`,
      3500,
    );
    const dummyFirst = dummyData?.products?.[0];
    if (dummyFirst?.thumbnail) {
      return {
        imageUrl: String(dummyFirst.thumbnail),
        brand: dummyFirst.brand ? String(dummyFirst.brand) : undefined,
        source: 'Public Retail Product CDN',
      };
    }

    // 4c. Wikimedia Commons Public Thumbnail API (CORS enabled via origin=*)
    const wikiUrl = `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(
      name,
    )}&gsrlimit=1&prop=pageimages&piprop=thumbnail&pithumbsize=240&format=json&origin=*`;
    const wikiData = await fetchJsonWithTimeout(wikiUrl, 3500);
    const pages = wikiData?.query?.pages;
    if (pages && typeof pages === 'object') {
      const firstPage: any = Object.values(pages)[0];
      const thumb = firstPage?.thumbnail?.source;
      if (thumb) {
        return {
          imageUrl: String(thumb),
          source: 'Wikimedia Public Commons CDN',
        };
      }
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

  useEffect(() => {
    setImgError(false);
  }, [resolvedUrl]);

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
