/**
 * AI Web & Sitemap Crawler Engine
 * Parses XML sitemaps, crawls web pages, extracts clean content,
 * and ingests into the RAG Knowledge Base.
 */

export interface CrawledPage {
  url: string;
  title: string;
  text: string;
  charCount: number;
}

export interface CrawlResult {
  ok: boolean;
  sitemapUrl?: string;
  pagesDiscovered: number;
  pages: CrawledPage[];
  error?: string;
}

/**
 * Strips HTML tags, styles, scripts, and extra whitespace to extract clean readable prose.
 */
export function extractCleanTextFromHtml(html: string): { title: string; text: string } {
  let title = 'Web Page';
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim().replace(/\s+/g, ' ');
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

  // Extract meta description for high signal context
  let metaDesc = '';
  const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["'][^>]*>/i);
  if (metaMatch && metaMatch[1]) {
    metaDesc = `Summary: ${metaMatch[1].trim()}\n\n`;
  }

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

  const text = `${metaDesc}${cleaned}`.trim();
  return { title, text };
}

/**
 * Crawls a single web URL and extracts clean readable content.
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
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;
    const html = await res.text();
    const { title, text } = extractCleanTextFromHtml(html);

    if (!text || text.length < 50) return null;

    return {
      url: target,
      title: title || target,
      text: text.slice(0, 100_000),
      charCount: text.length,
    };
  } catch {
    return null;
  }
}

/**
 * Parses an XML sitemap or website URL to discover subpages and extract content.
 */
export async function crawlSitemap(targetUrl: string, maxPages = 25): Promise<CrawlResult> {
  try {
    let rawUrl = targetUrl.trim();
    if (!rawUrl.startsWith('http://') && !rawUrl.startsWith('https://')) {
      rawUrl = `https://${rawUrl}`;
    }

    let sitemapUrl = rawUrl;
    if (!rawUrl.toLowerCase().endsWith('.xml')) {
      const parsed = new URL(rawUrl);
      sitemapUrl = `${parsed.origin}/sitemap.xml`;
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
        } catch { /* ignore */ }
      }
    }

    const discoveredUrls: string[] = [];

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

    // If sitemap returned no URLs, fall back to crawling the main root URL
    if (discoveredUrls.length === 0) {
      discoveredUrls.push(rawUrl);
    }

    // Crawl pages in batches of 4
    const crawledPages: CrawledPage[] = [];
    const batchSize = 4;
    for (let i = 0; i < discoveredUrls.length; i += batchSize) {
      const batch = discoveredUrls.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((url) => crawlSingleUrl(url)));
      for (const page of results) {
        if (page) crawledPages.push(page);
      }
    }

    return {
      ok: true,
      sitemapUrl,
      pagesDiscovered: discoveredUrls.length,
      pages: crawledPages,
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
