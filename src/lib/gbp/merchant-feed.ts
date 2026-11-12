import type { BgosProduct } from '../../../shared/bgos-contracts';

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface MerchantFeedInput {
  businessName: string;
  description: string;
  canonicalUrl: string;
  currency: string;
  products: BgosProduct[];
}

/**
 * Render a Google Merchant Center compatible RSS 2.0 XML product feed.
 * Designed for Google Merchant Center / Pointy / Business Profile product sync.
 */
export function buildGoogleMerchantXmlFeed(input: MerchantFeedInput): string {
  const currency = (input.currency || 'INR').toUpperCase();
  const baseProductLink = `${input.canonicalUrl}#products`;
  const itemsXml = input.products
    .map((p) => {
      const id = p.id || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const desc = (p.description || `${p.name} — available at ${input.businessName}`).slice(0, 4900);
      const availability = p.inStock === false ? 'out of stock' : 'in stock';
      const priceLine =
        typeof p.price === 'number' && Number.isFinite(p.price) && p.price >= 0
          ? `\n      <g:price>${p.price.toFixed(2)} ${escapeXml(currency)}</g:price>`
          : '';
      const imageLine = p.imageUrl
        ? `\n      <g:image_link>${escapeXml(p.imageUrl)}</g:image_link>`
        : '';
      const categoryLine = p.category
        ? `\n      <g:product_type>${escapeXml(p.category)}</g:product_type>`
        : '';

      return `    <item>
      <g:id>${escapeXml(id)}</g:id>
      <g:title>${escapeXml(p.name.slice(0, 150))}</g:title>
      <g:description>${escapeXml(desc)}</g:description>
      <g:link>${escapeXml(baseProductLink)}</g:link>${imageLine}
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>${priceLine}
      <g:brand>${escapeXml(input.businessName.slice(0, 70))}</g:brand>${categoryLine}
      <g:identifier_exists>no</g:identifier_exists>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(input.businessName)} — Product Catalog</title>
    <link>${escapeXml(input.canonicalUrl)}</link>
    <description>${escapeXml((input.description || `${input.businessName} official product catalog`).slice(0, 500))}</description>
${itemsXml}
  </channel>
</rss>
`;
}
