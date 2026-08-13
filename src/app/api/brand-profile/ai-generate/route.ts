import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

/**
 * Brand Brain — AI Assist
 * -----------------------
 * POST /api/brand-profile/ai-generate
 * Body: { website: string }
 *
 * Fetches the website's HTML, extracts the visible text + meta tags, then
 * asks the z-ai-web-dev-sdk LLM to synthesise a complete BrandProfile from
 * that content. The response is a JSON object with the same field names as
 * the BrandProfile model — the frontend fills its form with the suggestions
 * and the user reviews/edits before saving.
 *
 * This route is auth-required (any tenant user). It does NOT persist the
 * suggestions — it only returns them. Persistence happens via PUT /api/brand-profile
 * after the user has reviewed the suggestions.
 *
 * Response shape:
 *   {
 *     suggestion: {
 *       businessName, industry, website, location, serviceArea,
 *       targetCustomer, customerPainPoints,
 *       tone, voiceDescription, forbiddenPhrases: string[], defaultCta,
 *       services: string[], products: string[], usps, currentOffers,
 *       competitors: string[]
 *     },
 *     fetchedAt: string
 *   }
 */

// ─── Types ─────────────────────────────────────────────────────────────────

interface AiGenerateBody {
  website?: string;
}

interface BrandProfileSuggestion {
  businessName: string;
  industry: string;
  website: string | null;
  location: string | null;
  serviceArea: string | null;
  targetCustomer: string | null;
  customerPainPoints: string | null;
  tone: string | null;
  voiceDescription: string | null;
  forbiddenPhrases: string[];
  defaultCta: string | null;
  services: string[];
  products: string[];
  usps: string | null;
  currentOffers: string | null;
  competitors: string[];
}

// ─── Constants ─────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 8_000;
const MAX_HTML_BYTES = 2_500_000; // 2.5 MB cap
const MAX_VISIBLE_TEXT_CHARS = 12_000; // truncate before sending to LLM
const VALID_TONES = ['Professional', 'Friendly', 'Casual', 'Luxury', 'Playful', 'Authoritative'];

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Normalise a URL — prepend `https://` if the user forgot the scheme.
 * Returns null if the URL is unparseable.
 */
function normaliseUrl(raw: string): string | null {
  let url = raw.trim();
  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  try {
    const parsed = new URL(url);
    // Reject obviously-bad schemes (data:, javascript:, etc.) — only http/https.
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Fetch the homepage HTML with a hard timeout and size cap. Returns the
 * raw HTML string, or null on any error (network, TLS, timeout, oversize).
 *
 * We intentionally tolerate TLS errors (many small-business sites have
 * expired/self-signed certs) and follow redirects — this is a read-only
 * public-page scrape with no credentials involved.
 */
async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        // Use a real-looking UA so marketing-site CDNs (Cloudflare, Wix,
        // Squarespace) don't return a 403 to "node-fetch" bot detection.
        'User-Agent':
          'Mozilla/5.0 (compatible; FieserosBrandBrain/1.0; +https://fieseros.com/bot)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!res.ok) {
      console.warn(`[brand-profile/ai-generate] fetch ${url} → HTTP ${res.status}`);
      return null;
    }
    // Read in chunks so we can abort early on oversize pages.
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      return text.slice(0, MAX_HTML_BYTES);
    }
    const decoder = new TextDecoder('utf-8');
    let html = '';
    let totalBytes = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_HTML_BYTES) {
        console.warn(`[brand-profile/ai-generate] ${url} exceeded ${MAX_HTML_BYTES} bytes — truncating`);
        html += decoder.decode(value, { stream: true }).slice(0, MAX_HTML_BYTES - html.length);
        break;
      }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode(); // flush
    return html;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[brand-profile/ai-generate] fetch ${url} failed: ${msg}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Extract the most useful signals from raw HTML for the LLM:
 *   - <title>
 *   - <meta name="description">
 *   - <meta property="og:title">
 *   - <meta property="og:description">
 *   - <meta property="og:site_name">
 *   - Visible text (tags stripped, whitespace collapsed), truncated.
 *
 * Returns a single newline-separated string the LLM can reason over.
 */
function extractPageSignals(html: string): string {
  const getMeta = (pattern: RegExp): string => {
    const m = html.match(pattern);
    return m?.[1]?.trim() ?? '';
  };

  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '').trim();
  const ogTitle = getMeta(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogSiteName = getMeta(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i);
  const metaDescription = getMeta(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  );
  const ogDescription = getMeta(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  );

  // Strip scripts/styles then collapse tags. Keeps headings + paragraphs.
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();

  const visibleText = cleaned.slice(0, MAX_VISIBLE_TEXT_CHARS);

  const lines: string[] = [];
  if (ogSiteName) lines.push(`Site name: ${ogSiteName}`);
  if (title) lines.push(`Title tag: ${title}`);
  if (ogTitle && ogTitle !== title) lines.push(`OG title: ${ogTitle}`);
  if (metaDescription) lines.push(`Meta description: ${metaDescription}`);
  if (ogDescription && ogDescription !== metaDescription) {
    lines.push(`OG description: ${ogDescription}`);
  }
  lines.push('');
  lines.push('VISIBLE PAGE TEXT (truncated):');
  lines.push(visibleText);

  return lines.join('\n');
}

/**
 * Coerce the LLM's parsed output into the BrandProfileSuggestion shape,
 * applying sensible defaults + list normalisation. Always returns an object
 * (never throws) so the route never 500s on a malformed LLM response.
 */
function coerceSuggestion(raw: Record<string, unknown>): BrandProfileSuggestion {
  const str = (v: unknown, fallback = ''): string =>
    typeof v === 'string' ? v.trim() : v == null ? fallback : String(v).trim();
  const list = (v: unknown): string[] => {
    if (Array.isArray(v)) {
      return v
        .filter((x): x is string => typeof x === 'string')
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    if (typeof v === 'string' && v.trim()) {
      // Sometimes the LLM returns comma-separated strings instead of arrays.
      return v
        .split(/[,;]\s*/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  };

  const tone = str(raw.tone);
  const normalisedTone = VALID_TONES.includes(tone) ? tone : 'Professional';

  return {
    businessName: str(raw.businessName) || 'Untitled Business',
    industry: str(raw.industry) || 'Service',
    website: str(raw.website) || null,
    location: str(raw.location) || null,
    serviceArea: str(raw.serviceArea) || null,
    targetCustomer: str(raw.targetCustomer) || null,
    customerPainPoints: str(raw.customerPainPoints) || null,
    tone: normalisedTone,
    voiceDescription: str(raw.voiceDescription) || null,
    forbiddenPhrases: list(raw.forbiddenPhrases),
    defaultCta: str(raw.defaultCta) || null,
    services: list(raw.services),
    products: list(raw.products),
    usps: str(raw.usps) || null,
    currentOffers: str(raw.currentOffers) || null,
    competitors: list(raw.competitors),
  };
}

// ─── Route handler ─────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!user.tenantId) {
      return NextResponse.json(
        { error: 'No active tenant for this user.' },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => null)) as AiGenerateBody | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const websiteUrl = normaliseUrl(body.website || '');
    if (!websiteUrl) {
      return NextResponse.json(
        { error: 'A valid website URL is required.' },
        { status: 400 },
      );
    }

    // 1. Scrape the homepage.
    const html = await fetchHtml(websiteUrl);
    if (!html) {
      return NextResponse.json(
        {
          error:
            'Could not fetch the website. Check the URL is correct and publicly reachable, then try again.',
        },
        { status: 502 },
      );
    }

    // 2. Extract the signal we'll feed to the LLM.
    const pageSignals = extractPageSignals(html);
    if (pageSignals.replace(/\s/g, '').length < 50) {
      return NextResponse.json(
        {
          error:
            'The website returned almost no readable content (it may be a JS-only app or a login wall). Try entering the brand details manually.',
        },
        { status: 422 },
      );
    }

    // 3. Ask the LLM to synthesise a BrandProfile from the page signals.
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const systemPrompt =
      'You are a brand analyst. Given the homepage content of a business website, infer a complete ' +
      'brand profile the business can use as a starting point for AI-generated marketing content. ' +
      'Be specific but conservative: only populate fields you can justify from the page content. ' +
      'Use an empty string for fields you cannot infer. Do NOT invent specific prices, phone numbers, ' +
      'or competitor URLs that are not present on the page. ' +
      'Tone MUST be one of: Professional, Friendly, Casual, Luxury, Playful, Authoritative. ' +
      'List fields (services, products, forbiddenPhrases, competitors) MUST be JSON arrays of strings. ' +
      'Return ONLY a valid JSON object with this exact shape — no markdown, no prose, no code fences:\n' +
      '{\n' +
      '  "businessName": string,\n' +
      '  "industry": string,\n' +
      '  "website": string,\n' +
      '  "location": string,\n' +
      '  "serviceArea": string,\n' +
      '  "targetCustomer": string,\n' +
      '  "customerPainPoints": string,\n' +
      '  "tone": "Professional"|"Friendly"|"Casual"|"Luxury"|"Playful"|"Authoritative",\n' +
      '  "voiceDescription": string,\n' +
      '  "forbiddenPhrases": string[],\n' +
      '  "defaultCta": string,\n' +
      '  "services": string[],\n' +
      '  "products": string[],\n' +
      '  "usps": string,\n' +
      '  "currentOffers": string,\n' +
      '  "competitors": string[]\n' +
      '}';

    const userPrompt = `Website URL: ${websiteUrl}\n\nHomepage content:\n${pageSignals}\n\nReturn the JSON brand profile now.`;

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });

    const rawText = completion?.choices?.[0]?.message?.content?.trim() || '';

    // Extract JSON from the response (handles markdown code fences + stray prose).
    let jsonStr = rawText;
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        {
          error: 'The AI returned a malformed response. Please try again or fill the form manually.',
          raw: rawText.slice(0, 500),
        },
        { status: 502 },
      );
    }

    const suggestion = coerceSuggestion(parsed);

    return NextResponse.json({
      suggestion,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[/api/brand-profile/ai-generate] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
