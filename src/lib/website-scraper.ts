/**
 * Website scraper — fetches the homepage HTML of a business website and
 * extracts an email address and a description.
 *
 * Used by scripts/google-places-seed.ts after the Google Places response
 * is parsed (places that have a `websiteUri` get scraped).
 *
 * Strategy:
 *  - Fetch homepage with a 5s timeout, follow redirects, ignore SSL errors
 *    (many small business sites have cert issues — we don't transmit secrets)
 *  - Email extraction:
 *      1. <a href="mailto:..."> links (most reliable)
 *      2. Regex over visible text for info@/contact@/hello@/office@/etc.
 *      3. Skip generic addresses (webmaster@, noreply@, example@, sentry@, wix@)
 *      4. Skip if domain doesn't match the website's domain (avoid 3rd-party)
 *  - Description extraction:
 *      1. <meta property="og:description">
 *      2. <meta name="description">
 *      3. First <p> tag with >100 chars
 *      4. null if all fail (caller falls back to template)
 */

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 2_000_000; // 2 MB cap — refuse huge pages
const MAX_DESCRIPTION_LENGTH = 600;
const MAX_EMAIL_LENGTH = 254;

const GENERIC_EMAIL_PREFIXES = new Set([
  'webmaster',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'example',
  'sentry',
  'wix',
  'wordpress',
  'donate',
  'admin',
  'root',
  'sysadmin',
]);

const PREFERRED_EMAIL_PREFIXES = [
  'info',
  'contact',
  'hello',
  'office',
  'support',
  'sales',
  'service',
  'booking',
  'appointments',
  'admin',
];

interface ScrapedWebsite {
  email: string | null;
  description: string | null;
  fetchOk: boolean;
}

/**
 * Extracts the registrable domain from a URL (e.g. "https://www.acme.com/about" → "acme.com").
 * Falls back to hostname if parsing fails.
 */
function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    // Take last two labels (acme.com, acme.co.uk → just take last 2 for simplicity)
    const parts = host.split('.');
    if (parts.length <= 2) return host;
    return parts.slice(-2).join('.');
  } catch {
    return '';
  }
}

/**
 * Decodes HTML entities in a string. Handles the common ones — anything
 * exotic is left as-is (small-business sites rarely use anything beyond
 * &amp; &lt; &gt; &quot; &#39; &nbsp;).
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function stripTags(html: string): string {
  // Remove script/style blocks entirely
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  // Strip remaining tags
  return cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Pulls an email out of an HTML string.
 * Order: mailto links first, then visible-text regex.
 */
function extractEmail(html: string, websiteDomain: string): string | null {
  // 1. mailto links
  const mailtoRegex = /mailto:([^"'?>\s]+@[^"'?>\s]+\.[^"'?>\s]+)/gi;
  const mailtoMatches: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = mailtoRegex.exec(html)) !== null) {
    mailtoMatches.push(decodeEntities(m[1]).toLowerCase().trim());
  }

  // 2. Regex over visible text for common prefixes
  const visible = stripTags(html);
  const prefixPattern = PREFERRED_EMAIL_PREFIXES.join('|');
  const visibleRegex = new RegExp(
    `\\b(${prefixPattern})@([a-z0-9.-]+\\.[a-z]{2,})\\b`,
    'gi',
  );
  const visibleMatches: string[] = [];
  while ((m = visibleRegex.exec(visible)) !== null) {
    visibleMatches.push(m[0].toLowerCase().trim());
  }

  // 3. Generic email regex (last resort — any email-shaped string in visible text)
  const genericRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const genericMatches: string[] = [];
  while ((m = genericRegex.exec(visible)) !== null) {
    genericMatches.push(m[0].toLowerCase().trim());
  }

  // Combine in priority order: mailto > preferred-prefix visible > generic visible
  const candidates = [...mailtoMatches, ...visibleMatches, ...genericMatches];

  for (const email of candidates) {
    if (email.length > MAX_EMAIL_LENGTH) continue;
    const [localPart, domain] = email.split('@');
    if (!localPart || !domain) continue;

    // Skip generic/no-reply addresses
    const prefix = localPart.split('+')[0]; // strip +alias
    if (GENERIC_EMAIL_PREFIXES.has(prefix)) continue;

    // Skip if domain doesn't match website domain (3rd-party email)
    if (websiteDomain) {
      const emailDomain = domain.toLowerCase();
      if (!emailDomain.endsWith(websiteDomain) && !websiteDomain.endsWith(emailDomain)) {
        // Mismatched domain (e.g. analytics tool email) — skip
        continue;
      }
    }

    return email;
  }

  return null;
}

/**
 * Pulls a description out of an HTML string.
 * Order: og:description > meta description > first long <p>.
 */
function extractDescription(html: string): string | null {
  // 1. og:description
  const ogMatch = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
    );
  if (ogMatch && ogMatch[1]) {
    const d = decodeEntities(ogMatch[1]).trim();
    if (d.length >= 30) return d.slice(0, MAX_DESCRIPTION_LENGTH);
  }

  // 2. meta description
  const metaMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
    );
  if (metaMatch && metaMatch[1]) {
    const d = decodeEntities(metaMatch[1]).trim();
    if (d.length >= 30) return d.slice(0, MAX_DESCRIPTION_LENGTH);
  }

  // 3. First long <p> tag
  const pRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pRegex.exec(html)) !== null) {
    const text = stripTags(pm[1]).trim();
    if (text.length >= 100) {
      return decodeEntities(text).slice(0, MAX_DESCRIPTION_LENGTH);
    }
  }

  return null;
}

/**
 * Fetches a business homepage and extracts email + description.
 *
 * Returns `{ email: null, description: null, fetchOk: false }` on any error
 * (timeout, DNS, SSL, 4xx/5xx, robots, etc.) — the caller falls back to a
 * generated description and skips email.
 */
export async function scrapeWebsite(
  websiteUrl: string,
): Promise<ScrapedWebsite> {
  if (!websiteUrl) {
    return { email: null, description: null, fetchOk: false };
  }

  // Normalize URL
  let url = websiteUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }

  const websiteDomain = extractDomain(url);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; FieserosMarketplaceBot/1.0; +https://fieseros.com/bot)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      return { email: null, description: null, fetchOk: false };
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      // Not HTML — probably a PDF / image. Skip.
      return { email: null, description: null, fetchOk: false };
    }

    // Read up to MAX_HTML_BYTES
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return processHtml(text, websiteDomain);
    }

    let received = 0;
    const chunks: Uint8Array[] = [];
    while (received < MAX_HTML_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.length;
      }
    }
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }

    const decoder = new TextDecoder('utf-8', { fatal: false });
    const html = chunks.map((c) => decoder.decode(c, { stream: true })).join('') + decoder.decode();

    return processHtml(html, websiteDomain);
  } catch {
    // Timeout, DNS, SSL, network — all treated as "skip"
    return { email: null, description: null, fetchOk: false };
  }
}

function processHtml(html: string, websiteDomain: string): ScrapedWebsite {
  if (!html || html.length < 100) {
    return { email: null, description: null, fetchOk: true };
  }
  return {
    email: extractEmail(html, websiteDomain),
    description: extractDescription(html),
    fetchOk: true,
  };
}
