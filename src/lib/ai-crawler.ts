/**
 * AI Web & Sitemap Crawler Engine (Deep Ingestion Pipeline)
 * Parses XML sitemaps, crawls websites with deep link discovery,
 * extracts clean content, and ingests into the Dual-Brain RAG Knowledge Base.
 */

import { extractDeterministicFacts, BusinessStructuredFacts } from '@/lib/ai-structured-facts';

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  charCount: number;
  description?: string;
  internalLinks?: string[];
}

export interface CrawlResult {
  ok: boolean;
  sitemapUrl?: string;
  pagesDiscovered: number;
  pages: CrawledPage[];
  error?: string;
  factsPreview?: Partial<BusinessStructuredFacts>;
}

const HIGH_PRIORITY_KEYWORDS = [
  'service',
  'services',
  'pricing',
  'price',
  'cost',
  'rate',
  'rates',
  'about',
  'contact',
  'faq',
  'faqs',
  'location',
  'locations',
  'area',
  'areas',
  'hour',
  'hours',
  'review',
  'reviews',
  'estimate',
  'quote',
  'book',
  'booking',
  'policy',
  'policies',
  'emergency',
  'guarantee',
  'warranty',
];

/**
 * Extracts clean readable prose, title, and meta description from raw HTML.
 */
export function extractCleanTextFromHtml(html: string): { title: string; text: string; description: string } {
  let title = 'Web Page';
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim().replace(/\s+/g, ' ');
  }

  // Extract meta description for high signal context
  let metaDesc = '';
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (metaMatch && metaMatch[1]) {
    metaDesc = metaMatch[1].trim();
  }

  // Remove scripts, styles, SVGs, and header/nav/footer if possible
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ')
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, ' ')
    .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
    .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');

  // Replace block tags with newlines
  cleaned = cleaned
    .replace(/<\/(p|div|h1|h2|h3|h4|h5|h6|li|tr|section|article)>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

  const formattedPrefix = metaDesc ? `Summary: ${metaDesc}\n\n` : '';
  const text = `${formattedPrefix}${cleaned}`.trim();

  return { title, text, description: metaDesc };
}

/**
 * Extracts and prioritizes internal links belonging to the same host.
 */
export function extractInternalLinks(html: string, baseUrlStr: string): string[] {
  try {
    const base = new URL(baseUrlStr);
    const linkMatches = html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi);
    const discovered = new Set<string>();
    const allLinks: string[] = [];

    for (const match of linkMatches) {
      const rawHref = match[1]?.trim();
      if (
        !rawHref ||
        rawHref.startsWith('#') ||
        rawHref.startsWith('javascript:') ||
        rawHref.startsWith('mailto:') ||
        rawHref.startsWith('tel:')
      ) {
        continue;
      }

      try {
        const resolved = new URL(rawHref, base.origin);
        // Ensure same origin / domain
        if (resolved.origin === base.origin) {
          resolved.search = '';
          resolved.hash = '';
          const cleanedUrl = resolved.toString().replace(/\/+$/, ''); // normalize trailing slash

          const lower = cleanedUrl.toLowerCase();
          if (
            !lower.endsWith('.png') &&
            !lower.endsWith('.jpg') &&
            !lower.endsWith('.jpeg') &&
            !lower.endsWith('.webp') &&
            !lower.endsWith('.gif') &&
            !lower.endsWith('.svg') &&
            !lower.endsWith('.pdf') &&
            !lower.endsWith('.zip') &&
            !lower.endsWith('.xml') &&
            cleanedUrl !== base.origin &&
            !discovered.has(cleanedUrl)
          ) {
            discovered.add(cleanedUrl);
            allLinks.push(cleanedUrl);
          }
        }
      } catch {
        // ignore malformed URLs
      }
    }

    // Sort links by priority: high-signal pages (pricing, services, contact, hours) first
    allLinks.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();
      const aMatches = HIGH_PRIORITY_KEYWORDS.filter((k) => aLower.includes(k)).length;
      const bMatches = HIGH_PRIORITY_KEYWORDS.filter((k) => bLower.includes(k)).length;
      return bMatches - aMatches;
    });

    return allLinks;
  } catch {
    return [];
  }
}

/**
 * Crawls a single web URL and extracts clean readable content and discovered links.
 */
export async function crawlSingleUrl(url: string): Promise<CrawledPage | null> {
  try {
    let target = url.trim();
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = `https://${target}`;
    }

    const res = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ServiceOSKnowledgeBot/2.0; +https://serviceos.com)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9',
      },
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    const { title, text, description } = extractCleanTextFromHtml(html);

    if (!text || text.length < 50) return null;

    const internalLinks = extractInternalLinks(html, target);

    return {
      url: target,
      title: title || target,
      text: text.slice(0, 100_000),
      charCount: text.length,
      description,
      internalLinks,
    };
  } catch {
    return null;
  }
}

/**
 * Deep Multi-Page Crawler:
 * 1. Attempts sitemap.xml inspection.
 * 2. Crawls the primary landing URL.
 * 3. Follows high-signal internal navigation links (services, pricing, about, contact, FAQ)
 *    up to maxPages limit.
 */
export async function crawlSitemap(targetUrl: string, maxPages = 25): Promise<CrawlResult> {
  try {
    let rawUrl = targetUrl.trim();
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`;
    }

    let parsedOrigin = '';
    try {
      parsedOrigin = new URL(rawUrl).origin;
    } catch {
      parsedOrigin = rawUrl;
    }

    let sitemapUrl = rawUrl;
    if (!rawUrl.toLowerCase().endsWith('.xml')) {
      sitemapUrl = `${parsedOrigin}/sitemap.xml`;
    }

    let sitemapXml = '';
    try {
      const sitemapRes = await fetch(sitemapUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ServiceOSKnowledgeBot/2.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (sitemapRes.ok) {
        sitemapXml = await sitemapRes.text();
      }
    } catch {
      // Fallback: try rawUrl if sitemap was different
      if (sitemapUrl !== rawUrl) {
        try {
          const res = await fetch(rawUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; ServiceOSKnowledgeBot/2.0)' },
            signal: AbortSignal.timeout(8000),
          });
          if (res.ok) sitemapXml = await res.text();
        } catch {
          /* ignore */
        }
      }
    }

    const discoveredUrls: string[] = [];

    // Parse loc elements if valid sitemap XML was returned
    if (sitemapXml && sitemapXml.includes('<loc>')) {
      const locMatches = sitemapXml.match(/<loc>([^<]+)<\/loc>/gi) || [];
      for (const m of locMatches) {
        const urlStr = m.replace(/<\/?loc>/gi, '').trim();
        if (
          urlStr.startsWith('http') &&
          !discoveredUrls.includes(urlStr) &&
          !urlStr.endsWith('.xml') &&
          !urlStr.endsWith('.png') &&
          !urlStr.endsWith('.jpg') &&
          !urlStr.endsWith('.pdf')
        ) {
          discoveredUrls.push(urlStr);
          if (discoveredUrls.length >= maxPages) break;
        }
      }
    }

    // Always include the root page if not already in list
    if (!discoveredUrls.includes(rawUrl)) {
      discoveredUrls.unshift(rawUrl);
    }

    // Crawl the primary page first to uncover internal navigation links if sitemap returned few results
    const crawledPages: CrawledPage[] = [];
    const rootPage = await crawlSingleUrl(discoveredUrls[0]);
    if (rootPage) {
      crawledPages.push(rootPage);
      if (rootPage.internalLinks && rootPage.internalLinks.length > 0) {
        for (const link of rootPage.internalLinks) {
          if (!discoveredUrls.includes(link) && discoveredUrls.length < maxPages) {
            discoveredUrls.push(link);
          }
        }
      }
    }

    // Crawl remaining URLs in concurrent batches of 4
    const remainingUrls = discoveredUrls.slice(1, maxPages);
    const batchSize = 4;
    for (let i = 0; i < remainingUrls.length; i += batchSize) {
      const batch = remainingUrls.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((url) => crawlSingleUrl(url)));
      for (const page of results) {
        if (page) crawledPages.push(page);
      }
    }

    // Extract quick business facts preview from combined crawled content
    let factsPreview: Partial<BusinessStructuredFacts> | undefined;
    if (crawledPages.length > 0) {
      const sampleText = crawledPages.map((p) => `${p.title}\n${p.text.slice(0, 3000)}`).join('\n\n');
      factsPreview = extractDeterministicFacts(sampleText, crawledPages[0].title, rawUrl);
    }

    return {
      ok: true,
      sitemapUrl,
      pagesDiscovered: crawledPages.length,
      pages: crawledPages,
      factsPreview,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      pagesDiscovered: 0,
      pages: [],
      error: `Sitemap crawling failed: ${msg}`,
    };
  }
}
