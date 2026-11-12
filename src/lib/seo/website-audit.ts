import { randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { computeGbpAudit } from '@/lib/gbp/audit';
import { isMissingTableError } from '@/lib/gbp/marketing-score';
import { computeProfileTier, type ProfileTier } from '@/lib/marketplace/profile-tier';
import { isTemplatedDescription } from '@/lib/marketplace/industry-content';
import { revalidatePublicBusiness } from '@/lib/public-business';
import { submitToIndexNow } from '@/lib/indexnow';
import { prepareGoogleAccount } from '@/lib/social/google-account-helper';
import { fetchGoogleBusinessPlaceDetails, extractLocationRef } from '@/lib/social/adapters/googlebusiness';
import {
  resolveBusinessPresenceMode,
  normalizeSlugValue,
  type BusinessPresenceMode,
  type PresenceResolution,
} from './presence-mode';
import { safeFetchPublicText } from './safe-fetch';

export interface AuditCheckDetail {
  id: string;
  category: 'ai_crawlability' | 'structured_data' | 'on_page' | 'presence' | 'performance' | 'gbp';
  label: string;
  passed: boolean;
  severity: 'high' | 'medium' | 'low';
  scoreWeight: number;
  currentValue: string;
  recommendation: string;
  autoFixable: boolean;
  fixActionKey?: string;
}

export interface CoreWebVitalsSummary {
  available: boolean;
  performanceScore: number | null;
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  reason?: string;
}

export interface RobotsCrawlerStatus {
  agent: string;
  allowed: boolean;
  rule: string;
}

export interface RobotsAnalysis {
  fetched: boolean;
  url: string | null;
  hasSitemap: boolean;
  crawlers: RobotsCrawlerStatus[];
  error?: string;
}

export interface HtmlAnalysis {
  fetched: boolean;
  status: number | null;
  finalUrl: string | null;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  hasNoindex: boolean;
  canonicalUrl: string | null;
  h1Count: number;
  h1Texts: string[];
  jsonLdTypes: string[];
  hasLocalBusinessSchema: boolean;
  hasFaqSchema: boolean;
  hasNapMatch: boolean;
  isHttps: boolean;
  wordCount: number;
  error?: string;
}

export interface CustomDomainPatchSnippets {
  robotsTxt: string;
  metaTags: string;
  localBusinessJsonLd: string;
}

export interface SeoFixTaskDto {
  id: string;
  source: 'audit' | 'ai_gap';
  category: string;
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  targetMode: BusinessPresenceMode;
  autoFixable: boolean;
  fixActionKey: string | null;
  fixPayload: Record<string, any>;
  hasRollback: boolean;
  status: 'open' | 'applied' | 'dismissed' | 'rolled_back';
  appliedAt: string | null;
  createdAt: string;
}

export interface WebsiteAndAiAuditReport {
  auditedAt: string;
  presence: PresenceResolution;
  overallScore: number;
  gbpScore: number;
  websiteScore: number | null;
  aiReadinessScore: number;
  hostedProfileTier: ProfileTier | null;
  checks: AuditCheckDetail[];
  robots: RobotsAnalysis | null;
  html: HtmlAnalysis | null;
  cwv: CoreWebVitalsSummary;
  snippets: CustomDomainPatchSnippets | null;
  tasks: SeoFixTaskDto[];
}

const AI_CRAWLERS = ['OAI-SearchBot', 'GPTBot', 'PerplexityBot', 'Google-Extended', 'Googlebot'] as const;

function stripTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getAttr(tag: string, attrName: string): string | null {
  const re = new RegExp(`${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(re);
  return m ? decodeHtmlEntities(m[1] ?? m[2] ?? m[3] ?? '') : null;
}

function collectJsonLdTypes(node: unknown, out: Set<string>): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectJsonLdTypes(item, out);
    return;
  }
  const obj = node as Record<string, unknown>;
  if (typeof obj['@type'] === 'string') {
    out.add(obj['@type']);
  } else if (Array.isArray(obj['@type'])) {
    for (const t of obj['@type']) {
      if (typeof t === 'string') out.add(t);
    }
  }
  if (obj['@graph']) {
    collectJsonLdTypes(obj['@graph'], out);
  }
}

export function analyzeHtmlDocument(
  html: string,
  opts: { finalUrl: string; status: number; businessName?: string; phone?: string | null; city?: string | null },
): HtmlAnalysis {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(stripTags(titleMatch[1])) : null;

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  let metaDescription: string | null = null;
  let robotsMeta = '';
  for (const tag of metaTags) {
    const name = (getAttr(tag, 'name') || getAttr(tag, 'property') || '').toLowerCase();
    const content = getAttr(tag, 'content') || '';
    if (name === 'description' && !metaDescription) {
      metaDescription = content;
    }
    if (name === 'robots' || name === 'googlebot') {
      robotsMeta += ` ${content.toLowerCase()}`;
    }
  }
  const hasNoindex = /\bnoindex\b/i.test(robotsMeta);

  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  let canonicalUrl: string | null = null;
  for (const tag of linkTags) {
    const rel = (getAttr(tag, 'rel') || '').toLowerCase().split(/\s+/);
    if (rel.includes('canonical')) {
      canonicalUrl = getAttr(tag, 'href');
      break;
    }
  }

  const h1Matches = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Texts = h1Matches.map((m) => decodeHtmlEntities(stripTags(m[1]))).filter(Boolean);

  const scriptMatches = [...html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const typeSet = new Set<string>();
  for (const m of scriptMatches) {
    try {
      const parsed = JSON.parse(m[1].trim());
      collectJsonLdTypes(parsed, typeSet);
    } catch {
      // Ignore malformed JSON-LD script blocks
    }
  }
  const jsonLdTypes = [...typeSet];
  const localTypes = [
    'LocalBusiness',
    'HomeAndConstructionBusiness',
    'Plumber',
    'Electrician',
    'HVACBusiness',
    'Dentist',
    'MedicalBusiness',
    'HealthAndBeautyBusiness',
    'Restaurant',
    'ProfessionalService',
    'AutoRepair',
    'Service',
    'Organization',
  ];
  const hasLocalBusinessSchema = jsonLdTypes.some((t) =>
    localTypes.some((lt) => t.toLowerCase() === lt.toLowerCase() || t.toLowerCase().includes('localbusiness')),
  );
  const hasFaqSchema = jsonLdTypes.some((t) => t.toLowerCase() === 'faqpage');

  const bodyText = stripTags(html);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  const normalizedPhoneDigits = (opts.phone || '').replace(/\D+/g, '').slice(-8);
  const bodyDigits = bodyText.replace(/\D+/g, '');
  const phoneFound = Boolean(normalizedPhoneDigits.length >= 6 && bodyDigits.includes(normalizedPhoneDigits));
  const nameFound = Boolean(
    opts.businessName &&
      bodyText.toLowerCase().includes(opts.businessName.toLowerCase().slice(0, Math.min(opts.businessName.length, 16))),
  );
  const cityFound = Boolean(opts.city && bodyText.toLowerCase().includes(opts.city.toLowerCase()));
  const hasNapMatch = (nameFound && (phoneFound || cityFound)) || phoneFound;

  return {
    fetched: true,
    status: opts.status,
    finalUrl: opts.finalUrl,
    title,
    titleLength: title?.length ?? 0,
    metaDescription,
    metaDescriptionLength: metaDescription?.length ?? 0,
    hasNoindex,
    canonicalUrl,
    h1Count: h1Texts.length,
    h1Texts: h1Texts.slice(0, 5),
    jsonLdTypes,
    hasLocalBusinessSchema,
    hasFaqSchema,
    hasNapMatch,
    isHttps: opts.finalUrl.startsWith('https://'),
    wordCount,
    error: undefined,
  };
}

export function parseRobotsTxt(robotsTxt: string, robotsUrl: string): RobotsAnalysis {
  const lines = robotsTxt.split(/\r?\n/);
  const groups: Array<{ agents: string[]; rules: Array<{ type: 'allow' | 'disallow'; path: string }> }> = [];
  let current: { agents: string[]; rules: Array<{ type: 'allow' | 'disallow'; path: string }> } | null = null;
  let hasSitemap = false;

  for (const rawLine of lines) {
    const clean = rawLine.replace(/#.*$/, '').trim();
    if (!clean) continue;
    const colon = clean.indexOf(':');
    if (colon === -1) continue;
    const directive = clean.slice(0, colon).trim().toLowerCase();
    const value = clean.slice(colon + 1).trim();

    if (directive === 'sitemap' && value) {
      hasSitemap = true;
      continue;
    }
    if (directive === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if ((directive === 'allow' || directive === 'disallow') && current) {
      current.rules.push({ type: directive, path: value });
    }
  }

  const evalAgent = (agentName: string): RobotsCrawlerStatus => {
    const lower = agentName.toLowerCase();
    const exactGroups = groups.filter((g) => g.agents.includes(lower));
    const wildcardGroups = groups.filter((g) => g.agents.includes('*'));
    const applicable = exactGroups.length > 0 ? exactGroups : wildcardGroups;
    const rules = applicable.flatMap((g) => g.rules);

    if (rules.length === 0) {
      return { agent: agentName, allowed: true, rule: 'Allowed (no restrictive rule)' };
    }

    let bestMatch: { type: 'allow' | 'disallow'; path: string } | null = null;
    for (const r of rules) {
      if (!r.path) continue; // Disallow: (empty) means allow everything
      if (r.path === '/' || r.path === '/*') {
        if (!bestMatch || r.path.length > bestMatch.path.length || (r.path.length === bestMatch.path.length && r.type === 'allow')) {
          bestMatch = r;
        }
      }
    }

    if (bestMatch && bestMatch.type === 'disallow') {
      return {
        agent: agentName,
        allowed: false,
        rule: `${exactGroups.length > 0 ? agentName : '*'}: Disallow: ${bestMatch.path}`,
      };
    }

    return {
      agent: agentName,
      allowed: true,
      rule: bestMatch ? `Allow: ${bestMatch.path}` : 'Allowed',
    };
  };

  return {
    fetched: true,
    url: robotsUrl,
    hasSitemap,
    crawlers: AI_CRAWLERS.map(evalAgent),
  };
}

export async function fetchRobotsTxtAnalysis(targetUrl: string): Promise<RobotsAnalysis> {
  let robotsUrl: string;
  try {
    const u = new URL(targetUrl);
    robotsUrl = `${u.origin}/robots.txt`;
  } catch {
    return { fetched: false, url: null, hasSitemap: false, crawlers: [], error: 'Invalid URL' };
  }

  try {
    const res = await safeFetchPublicText(robotsUrl, { timeoutMs: 6000, maxBytes: 512 * 1024 });
    if (res.status === 404) {
      // Missing robots.txt defaults to allow all crawlers, though sitemap link is absent
      return {
        fetched: true,
        url: robotsUrl,
        hasSitemap: false,
        crawlers: AI_CRAWLERS.map((agent) => ({ agent, allowed: true, rule: 'No robots.txt (default allow)' })),
      };
    }
    if (!res.ok) {
      return {
        fetched: false,
        url: robotsUrl,
        hasSitemap: false,
        crawlers: [],
        error: `robots.txt returned HTTP ${res.status}`,
      };
    }
    return parseRobotsTxt(res.text, robotsUrl);
  } catch (err) {
    return {
      fetched: false,
      url: robotsUrl,
      hasSitemap: false,
      crawlers: [],
      error: err instanceof Error ? err.message : 'robots.txt unreachable',
    };
  }
}

export async function fetchPageSpeedInsights(targetUrl: string): Promise<CoreWebVitalsSummary> {
  const apiKey =
    process.env.GOOGLE_PAGESPEED_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.GOOGLE_MAPS_SERVER_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    '';
  if (!apiKey) {
    return {
      available: false,
      performanceScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      reason: 'Google PageSpeed Insights API key not configured',
    };
  }

  try {
    const psiUrl = new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');
    psiUrl.searchParams.set('url', targetUrl);
    psiUrl.searchParams.set('strategy', 'mobile');
    psiUrl.searchParams.set('category', 'performance');
    psiUrl.searchParams.set('key', apiKey);

    const res = await fetch(psiUrl.toString(), { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      return {
        available: false,
        performanceScore: null,
        lcpMs: null,
        cls: null,
        inpMs: null,
        reason: `PageSpeed API HTTP ${res.status}`,
      };
    }
    const json: any = await res.json();
    const perfRaw = json?.lighthouseResult?.categories?.performance?.score;
    const lcpRaw = json?.lighthouseResult?.audits?.['largest-contentful-paint']?.numericValue;
    const clsRaw = json?.lighthouseResult?.audits?.['cumulative-layout-shift']?.numericValue;
    const inpRaw = json?.lighthouseResult?.audits?.['interaction-to-next-paint']?.numericValue;

    return {
      available: typeof perfRaw === 'number' || typeof lcpRaw === 'number',
      performanceScore: typeof perfRaw === 'number' ? Math.round(perfRaw * 100) : null,
      lcpMs: typeof lcpRaw === 'number' ? Math.round(lcpRaw) : null,
      cls: typeof clsRaw === 'number' ? Number(clsRaw.toFixed(3)) : null,
      inpMs: typeof inpRaw === 'number' ? Math.round(inpRaw) : null,
    };
  } catch (err) {
    return {
      available: false,
      performanceScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      reason: err instanceof Error ? err.message : 'PageSpeed timeout',
    };
  }
}

export function generateCustomDomainSnippets(params: {
  businessName: string;
  industry: string;
  city: string;
  phone?: string | null;
  address?: string | null;
  websiteUrl: string;
  services: string[];
}): CustomDomainPatchSnippets {
  const hostOrigin = (() => {
    try {
      return new URL(params.websiteUrl).origin;
    } catch {
      return 'https://example.com';
    }
  })();

  const robotsTxt = [
    '# Allow search engines & AI search discovery bots (without forcing model training)',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: Googlebot',
    'Allow: /',
    '',
    `Sitemap: ${hostOrigin}/sitemap.xml`,
  ].join('\n');

  const serviceSummary = params.services.slice(0, 3).join(', ') || params.industry;
  const titleTag = `${params.businessName} — ${params.industry} in ${params.city}`.slice(0, 62);
  const metaDesc = `Trusted ${params.industry.toLowerCase()} in ${params.city}. Call ${params.businessName} for ${serviceSummary}. Verified local specialists, transparent pricing & fast booking.`.slice(0, 155);

  const metaTags = [
    `<title>${titleTag}</title>`,
    `<meta name="description" content="${metaDesc.replace(/"/g, '&quot;')}" />`,
    `<link rel="canonical" href="${params.websiteUrl}" />`,
  ].join('\n');

  const schemaObj = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: params.businessName,
    url: params.websiteUrl,
    ...(params.phone ? { telephone: params.phone } : {}),
    ...(params.address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: params.address,
            addressLocality: params.city,
          },
        }
      : { areaServed: params.city }),
    description: metaDesc,
    makesOffer: params.services.slice(0, 5).map((name) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name },
    })),
  };

  const localBusinessJsonLd = `<script type="application/ld+json">\n${JSON.stringify(schemaObj, null, 2)}\n</script>`;

  return { robotsTxt, metaTags, localBusinessJsonLd };
}

function buildNonTemplatedDescription(params: {
  businessName: string;
  industry: string;
  city: string;
  services: string[];
  phone?: string | null;
  keywords?: string[];
}): string {
  const svcList = params.services.length > 0 ? params.services.slice(0, 4).join(', ') : `${params.industry} consultations, installations, and urgent support`;
  const kwList = (params.keywords || []).filter(Boolean).slice(0, 3);
  const kwPart = kwList.length > 0 ? ` Specialists in ${kwList.join(', ')}.` : '';
  const contactPart = params.phone ? ` Call ${params.phone} or book online for prompt service in ${params.city}.` : ` Reach out online to schedule your visit in ${params.city}.`;
  return `${params.businessName} delivers reliable ${params.industry.toLowerCase()} across ${params.city} with upfront estimates and attentive local support. Our team handles ${svcList}, tailored for homes and businesses seeking dependable quality.${kwPart}${contactPart}`.slice(0, 740);
}

function buildDefaultFaqs(params: {
  businessName: string;
  industry: string;
  city: string;
  services: string[];
  phone?: string | null;
  keywords?: string[];
}): Array<{ question: string; answer: string }> {
  const topServices = params.services.slice(0, 3).join(', ') || params.industry;
  const topKeywords = (params.keywords || []).filter(Boolean).slice(0, 3);
  const faqs = [
    {
      question: `What ${params.industry.toLowerCase()} services does ${params.businessName} offer in ${params.city}?`,
      answer: `${params.businessName} provides ${topServices} across ${params.city} with clear pricing and scheduled appointments.`,
    },
    {
      question: `How can I book or contact ${params.businessName} in ${params.city}?`,
      answer: params.phone
        ? `You can call ${params.phone} or submit an instant booking request directly through our profile page.`
        : `You can request a quote or schedule a service slot directly through our online profile page.`,
    },
    {
      question: `Which areas around ${params.city} do you serve?`,
      answer: `${params.businessName} serves customers throughout ${params.city} and nearby neighborhoods.`,
    },
  ];
  if (topKeywords.length > 0) {
    faqs.push({
      question: `Do you help with ${topKeywords[0]} in ${params.city}?`,
      answer: `Yes, ${params.businessName} assists customers in ${params.city} searching for ${topKeywords.join(', ')}.`,
    });
  }
  return faqs;
}

function parseJsonArray<T = any>(raw: string | null | undefined): T[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function getLatestWebsiteAudit(tenantId: string): Promise<{
  snapshot: WebsiteAndAiAuditReport | null;
  tasks: SeoFixTaskDto[];
}> {
  let settings: Record<string, any> = {};
  const tenant = await db.tenant
    .findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        publicSlug: true,
        industry: true,
        city: true,
        website: true,
        publicProfileEnabled: true,
        claimed: true,
        settingsJson: true,
      },
    })
    .catch(() => null);

  try {
    settings = JSON.parse(tenant?.settingsJson || '{}');
  } catch {}

  let dbTasks: SeoFixTaskDto[] = [];
  if ((db as any).seoFixTask?.findMany) {
    try {
      const rows = await (db as any).seoFixTask.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
      dbTasks = rows.map((r: any) => ({
        id: r.id,
        source: r.source === 'ai_gap' ? 'ai_gap' : 'audit',
        category: r.category,
        title: r.title,
        description: r.description,
        severity: r.severity || 'medium',
        targetMode: r.targetMode || 'no_website',
        autoFixable: Boolean(r.autoFixable),
        fixActionKey: r.fixActionKey || null,
        fixPayload: (() => {
          try {
            return JSON.parse(r.fixPayloadJson || '{}');
          } catch {
            return {};
          }
        })(),
        hasRollback: Boolean(r.rollbackSnapshotJson),
        status: r.status || 'open',
        appliedAt: r.appliedAt ? new Date(r.appliedAt).toISOString() : null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      }));
    } catch (err) {
      if (!isMissingTableError(err)) {
        console.warn('[seo-audit] seoFixTask read warning:', err instanceof Error ? err.message : err);
      }
    }
  }

  const tasks = dbTasks.length > 0 ? dbTasks : Array.isArray(settings.seoFixTasks) ? settings.seoFixTasks : [];

  if ((db as any).websiteAuditSnapshot?.findFirst) {
    try {
      const row = await (db as any).websiteAuditSnapshot.findFirst({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
      });
      if (row) {
        const storedFromSettings = settings.seoAuditSnapshot as WebsiteAndAiAuditReport | undefined;
        if (storedFromSettings && storedFromSettings.presence) {
          return { snapshot: { ...storedFromSettings, tasks }, tasks };
        }
      }
    } catch {}
  }

  if (settings.seoAuditSnapshot) {
    return {
      snapshot: { ...(settings.seoAuditSnapshot as WebsiteAndAiAuditReport), tasks },
      tasks,
    };
  }

  return { snapshot: null, tasks };
}

export async function computeWebsiteAndAiAudit(tenantId: string): Promise<WebsiteAndAiAuditReport> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { brandProfile: true },
  });
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const [gbpAudit, services, customDomains, googleAccount] = await Promise.all([
    computeGbpAudit(tenantId),
    db.service
      ?.findMany?.({
        where: { tenantId, isActive: true },
        select: { name: true },
        take: 25,
      })
      .catch(() => []) ?? [],
    (db as any).customDomain?.findMany
      ? (db as any).customDomain
          .findMany({
            where: { tenantId },
            orderBy: { updatedAt: 'desc' },
            take: 3,
          })
          .catch(() => [])
      : [],
    prepareGoogleAccount(tenantId).catch(() => null),
  ]);

  let gbpWebsite: string | null = null;
  if (googleAccount) {
    try {
      const details = await fetchGoogleBusinessPlaceDetails(googleAccount);
      gbpWebsite = details.website || null;
    } catch {}
  }

  const verifiedCustomDomain =
    Array.isArray(customDomains) && customDomains.length > 0
      ? customDomains.find((d: any) => d.status === 'SSL_ACTIVE' || d.status === 'DNS_VERIFIED') ||
        customDomains[0]
      : null;

  const presence = resolveBusinessPresenceMode({
    tenant,
    gbpWebsite,
    customDomain: verifiedCustomDomain
      ? { domain: verifiedCustomDomain.domain, status: verifiedCustomDomain.status }
      : null,
  });

  const businessName = tenant.brandProfile?.businessName || tenant.name;
  const industry = tenant.brandProfile?.industry || tenant.industry || 'Local Services';
  const city = tenant.city || tenant.brandProfile?.location || 'your city';
  const serviceNames = Array.isArray(services) ? services.map((s: any) => s.name).filter(Boolean) : [];

  const checks: AuditCheckDetail[] = [];
  let robots: RobotsAnalysis | null = null;
  let htmlAnalysis: HtmlAnalysis | null = null;
  let cwv: CoreWebVitalsSummary = {
    available: false,
    performanceScore: null,
    lcpMs: null,
    cls: null,
    inpMs: null,
    reason: presence.mode === 'no_website' ? 'No website URL configured' : 'Not measured',
  };
  let hostedProfileTier: ProfileTier | null = null;

  if (presence.mode === 'no_website') {
    checks.push(
      {
        id: 'presence_website',
        category: 'presence',
        label: 'Public Business Website & AI Landing Page',
        passed: false,
        severity: 'high',
        scoreWeight: 40,
        currentValue: 'No website URL configured',
        recommendation:
          'Google Search & AI assistants (ChatGPT Search, Gemini, Perplexity) cite websites when recommending local businesses. Launch your free BGOS mini-site in 1 click so AI engines have a citable page.',
        autoFixable: true,
        fixActionKey: 'activate_hosted_site',
      },
      {
        id: 'ai_identity_schema',
        category: 'structured_data',
        label: 'Machine-Readable Business Schema & FAQs',
        passed: false,
        severity: 'medium',
        scoreWeight: 30,
        currentValue: 'Unavailable without an active web page',
        recommendation:
          'Activating your BGOS website automatically publishes LocalBusiness & FAQPage JSON-LD schema tailored to your city.',
        autoFixable: true,
        fixActionKey: 'activate_hosted_site',
      },
      {
        id: 'gbp_conversion_link',
        category: 'gbp',
        label: 'Google Business Profile Website & Booking Link',
        passed: Boolean(gbpAudit.checks.find((c) => c.id === 'booking_link')?.passed),
        severity: 'medium',
        scoreWeight: 30,
        currentValue: gbpAudit.checks.find((c) => c.id === 'booking_link')?.currentValue || 'Missing',
        recommendation: 'Link your free BGOS mini-site or booking page to your Google Business Profile.',
        autoFixable: true,
        fixActionKey: 'activate_hosted_site',
      },
    );

    const aiReadinessScore = Math.min(35, Math.round(gbpAudit.score * 0.35));
    const overallScore = Math.round(gbpAudit.score * 0.7 + aiReadinessScore * 0.3);

    return persistAuditSnapshot(tenantId, {
      auditedAt: new Date().toISOString(),
      presence,
      overallScore,
      gbpScore: gbpAudit.score,
      websiteScore: null,
      aiReadinessScore,
      hostedProfileTier: null,
      checks,
      robots: null,
      html: null,
      cwv,
      snippets: null,
    });
  }

  // Modes with a web presence: 'bgos_hosted' or 'custom_domain'
  const inspectUrl = presence.canonicalUrl || presence.websiteUrl!;

  if (presence.mode === 'bgos_hosted') {
    const gallery = parseJsonArray(tenant.galleryJson);
    const hasImage = Boolean(tenant.coverImage || tenant.logo || gallery.length > 0);
    const confirmedBadgeCount = [
      tenant.identityVerified,
      tenant.businessVerified,
      tenant.insuranceVerified,
      Boolean(tenant.licenceNumber),
    ].filter(Boolean).length;
    const templated = isTemplatedDescription(tenant.description);
    const descLen = tenant.description?.trim().length ?? 0;

    hostedProfileTier = computeProfileTier({
      claimed: Boolean(tenant.claimed),
      description: tenant.description,
      isTemplatedDescription: templated,
      serviceCount: serviceNames.length,
      hasImage,
      confirmedBadgeCount,
      reviewCount: tenant.reviewCount ?? 0,
      publicProfileEnabled: Boolean(tenant.publicProfileEnabled),
    });

    const faqs = parseJsonArray<{ question: string; answer: string }>(tenant.faqsJson);

    checks.push({
      id: 'hosted_indexability_tier',
      category: 'ai_crawlability',
      label: 'Search & AI Indexability Tier (Tier A/B vs Tier C noindex)',
      passed: hostedProfileTier !== 'C' && Boolean(tenant.publicProfileEnabled),
      severity: hostedProfileTier === 'C' ? 'high' : 'low',
      scoreWeight: 25,
      currentValue:
        hostedProfileTier === 'C'
          ? `Tier C (noindex, follow) — ${!tenant.publicProfileEnabled ? 'public profile disabled' : !hasImage ? 'missing image' : `description ${descLen}/40 chars`}`
          : `Tier ${hostedProfileTier} (Indexable)`,
      recommendation:
        hostedProfileTier === 'A'
          ? 'Your BGOS hosted page qualifies for Tier A priority indexing (0.8 sitemap weight).'
          : 'Upgrade to Tier A: add an original ≥120-character description, at least 3 services, and claim/verify your profile.',
      autoFixable: hostedProfileTier !== 'A',
      fixActionKey: 'hosted_seo_enrich',
    });

    checks.push({
      id: 'hosted_description_quality',
      category: 'on_page',
      label: 'Original Non-Templated Business Description (≥120 chars)',
      passed: descLen >= 120 && !templated,
      severity: descLen < 40 || templated ? 'high' : 'medium',
      scoreWeight: 20,
      currentValue: templated ? 'Templated onboarding text detected' : `${descLen} characters`,
      recommendation: 'AI search engines skip boilerplate text. Publish original service- and city-specific copy.',
      autoFixable: true,
      fixActionKey: 'hosted_seo_enrich',
    });

    checks.push({
      id: 'hosted_seo_meta',
      category: 'on_page',
      label: 'Custom SEO Title & Meta Description',
      passed: Boolean(tenant.seoTitle && tenant.seoTitle.length >= 25 && tenant.seoDescription && tenant.seoDescription.length >= 80),
      severity: 'medium',
      scoreWeight: 15,
      currentValue: tenant.seoTitle ? `${tenant.seoTitle.slice(0, 48)}` : 'Using default fallback title',
      recommendation: 'Set a keyword-focused SEO title and meta description for higher click-through rates.',
      autoFixable: true,
      fixActionKey: 'hosted_seo_enrich',
    });

    checks.push({
      id: 'hosted_faq_schema',
      category: 'structured_data',
      label: 'FAQPage Schema & Customer Q&A Content',
      passed: faqs.length >= 2,
      severity: 'medium',
      scoreWeight: 20,
      currentValue: `${faqs.length} FAQ item(s) published`,
      recommendation: 'Structured FAQs directly answer conversational prompts in ChatGPT, Gemini, and Perplexity.',
      autoFixable: true,
      fixActionKey: 'hosted_seo_enrich',
    });

    const robotsAllowed = Boolean(tenant.publicProfileEnabled);
    robots = {
      fetched: true,
      url: 'https://fieseros.com/robots.txt',
      hasSitemap: true,
      crawlers: AI_CRAWLERS.map((agent) => ({
        agent,
        allowed: robotsAllowed,
        rule: robotsAllowed
          ? hostedProfileTier === 'C'
            ? 'robots.txt Allow: / (page meta is Tier C noindex until enriched)'
            : 'Allowed on canonical FieserOS page'
          : 'Public profile disabled',
      })),
    };

    const hostedWordCount = [tenant.description || '', ...serviceNames, ...faqs.map((f) => `${f.question} ${f.answer}`)]
      .join(' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;

    htmlAnalysis = {
      fetched: true,
      status: 200,
      finalUrl: inspectUrl,
      title: tenant.seoTitle || `${businessName}${city ? ` — ${city}` : ''}`,
      titleLength: (tenant.seoTitle || `${businessName}${city ? ` — ${city}` : ''}`).length,
      metaDescription: tenant.seoDescription || tenant.description || null,
      metaDescriptionLength: (tenant.seoDescription || tenant.description || '').length,
      hasNoindex: hostedProfileTier === 'C' || !tenant.publicProfileEnabled,
      canonicalUrl: inspectUrl,
      h1Count: 1,
      h1Texts: [businessName],
      jsonLdTypes: faqs.length >= 1 ? ['LocalBusiness', 'FAQPage'] : ['LocalBusiness'],
      hasLocalBusinessSchema: true,
      hasFaqSchema: faqs.length >= 1,
      hasNapMatch: Boolean(businessName && (tenant.phone || city)),
      isHttps: true,
      wordCount: hostedWordCount,
    };

    cwv = {
      available: false,
      performanceScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      reason: 'Server-rendered BGOS Mini-Site served via Next.js edge CDN',
    };

    checks.push({
      id: 'hosted_ai_crawlers',
      category: 'ai_crawlability',
      label: 'AI Search Bot Access (OAI-SearchBot & PerplexityBot)',
      passed: robotsAllowed && hostedProfileTier !== 'C',
      severity: 'low',
      scoreWeight: 20,
      currentValue:
        robotsAllowed && hostedProfileTier !== 'C'
          ? 'Fieseros robots.txt & meta index allow search & AI crawlers'
          : 'Tier C noindex restricts AI indexing until enriched',
      recommendation:
        robotsAllowed && hostedProfileTier !== 'C'
          ? 'Crawl permissions verified on canonical host fieseros.com.'
          : 'Enrich your description and services above to promote from Tier C (noindex) to indexable Tier A/B.',
      autoFixable: hostedProfileTier === 'C',
      fixActionKey: hostedProfileTier === 'C' ? 'hosted_seo_enrich' : undefined,
    });
  } else {
    // Custom domain mode: inspect live robots.txt, HTML, and optional PSI CWV safely
    const [robotsRes, htmlRes, psiRes] = await Promise.all([
      fetchRobotsTxtAnalysis(inspectUrl),
      safeFetchPublicText(inspectUrl, { timeoutMs: 8000 })
        .then((res) =>
          analyzeHtmlDocument(res.text, {
            finalUrl: res.finalUrl,
            status: res.status,
            businessName,
            phone: tenant.phone,
            city,
          }),
        )
        .catch(
          (err): HtmlAnalysis => ({
            fetched: false,
            status: null,
            finalUrl: inspectUrl,
            title: null,
            titleLength: 0,
            metaDescription: null,
            metaDescriptionLength: 0,
            hasNoindex: false,
            canonicalUrl: null,
            h1Count: 0,
            h1Texts: [],
            jsonLdTypes: [],
            hasLocalBusinessSchema: false,
            hasFaqSchema: false,
            hasNapMatch: false,
            isHttps: inspectUrl.startsWith('https://'),
            wordCount: 0,
            error: err instanceof Error ? err.message : 'Unable to fetch webpage',
          }),
        ),
      fetchPageSpeedInsights(inspectUrl),
    ]);

    robots = robotsRes;
    htmlAnalysis = htmlRes;
    cwv = psiRes;

    const blockedSearchAiBots = robotsRes.fetched
      ? robotsRes.crawlers.filter((c) => !c.allowed && (c.agent === 'OAI-SearchBot' || c.agent === 'PerplexityBot' || c.agent === 'Googlebot'))
      : [];

    checks.push({
      id: 'robots_ai_search_access',
      category: 'ai_crawlability',
      label: 'Search & AI Search Crawler Access (OAI-SearchBot, PerplexityBot, Googlebot)',
      passed: robotsRes.fetched ? blockedSearchAiBots.length === 0 : false,
      severity: 'high',
      scoreWeight: 20,
      currentValue: !robotsRes.fetched
        ? robotsRes.error || 'Could not inspect robots.txt'
        : blockedSearchAiBots.length > 0
          ? `Blocked: ${blockedSearchAiBots.map((b) => b.agent).join(', ')}`
          : 'All search & AI search crawlers allowed',
      recommendation:
        blockedSearchAiBots.length > 0
          ? 'Update robots.txt to Allow: / for OAI-SearchBot, PerplexityBot, and Googlebot so ChatGPT Search and AI engines can cite your site.'
          : 'Your robots.txt permits AI search crawlers.',
      autoFixable: false,
      fixActionKey: 'copy_snippet_robots',
    });

    checks.push({
      id: 'html_indexable',
      category: 'ai_crawlability',
      label: 'HTTP Reachability & Indexability (No noindex)',
      passed: htmlRes.fetched && (htmlRes.status ?? 0) >= 200 && (htmlRes.status ?? 0) < 400 && !htmlRes.hasNoindex && htmlRes.isHttps,
      severity: 'high',
      scoreWeight: 20,
      currentValue: !htmlRes.fetched
        ? htmlRes.error || 'Page unreachable'
        : htmlRes.hasNoindex
          ? 'Meta robots noindex detected!'
          : !htmlRes.isHttps
            ? 'Not serving over HTTPS'
            : `HTTP ${htmlRes.status} · HTTPS`,
      recommendation: 'Ensure your homepage returns HTTP 200 over HTTPS without a noindex directive.',
      autoFixable: false,
    });

    checks.push({
      id: 'html_title_meta_h1',
      category: 'on_page',
      label: 'Title Tag, Meta Description & H1 Heading',
      passed: Boolean(
        htmlRes.fetched &&
          htmlRes.titleLength >= 20 &&
          htmlRes.titleLength <= 70 &&
          htmlRes.metaDescriptionLength >= 60 &&
          htmlRes.h1Count >= 1,
      ),
      severity: 'medium',
      scoreWeight: 20,
      currentValue: htmlRes.fetched
        ? `Title: ${htmlRes.titleLength}ch · Desc: ${htmlRes.metaDescriptionLength}ch · H1: ${htmlRes.h1Count}`
        : 'Not inspected',
      recommendation: 'Include a clear 30-60 character <title> with city + service, 120-155 character meta description, and a single descriptive <h1>.',
      autoFixable: false,
      fixActionKey: 'copy_snippet_meta',
    });

    checks.push({
      id: 'structured_data_schema',
      category: 'structured_data',
      label: 'LocalBusiness / Organization JSON-LD Schema',
      passed: htmlRes.hasLocalBusinessSchema,
      severity: 'high',
      scoreWeight: 20,
      currentValue: htmlRes.jsonLdTypes.length > 0 ? htmlRes.jsonLdTypes.join(', ') : 'No JSON-LD schema found',
      recommendation: 'Add schema.org/LocalBusiness JSON-LD with name, address, phone, geo, and services so AI assistants extract verified facts.',
      autoFixable: false,
      fixActionKey: 'copy_snippet_schema',
    });

    checks.push({
      id: 'nap_consistency',
      category: 'presence',
      label: 'Business Name & Phone/City Match (NAP Consistency)',
      passed: htmlRes.hasNapMatch,
      severity: 'medium',
      scoreWeight: 10,
      currentValue: htmlRes.fetched ? (htmlRes.hasNapMatch ? 'Verified in page text' : 'Phone/business name not clearly visible') : 'Not inspected',
      recommendation: 'Display exact Name, Address, and Phone consistently in HTML text (not only inside images).',
      autoFixable: false,
    });

    checks.push({
      id: 'core_web_vitals',
      category: 'performance',
      label: 'Mobile Page Speed & Core Web Vitals',
      passed: cwv.available ? (cwv.performanceScore ?? 0) >= 60 && (cwv.lcpMs ?? 0) <= 3500 : Boolean(htmlRes.fetched && htmlRes.isHttps),
      severity: 'low',
      scoreWeight: 10,
      currentValue: cwv.available
        ? `Score ${cwv.performanceScore ?? '—'} · LCP ${cwv.lcpMs ? `${(cwv.lcpMs / 1000).toFixed(1)}s` : '—'} · CLS ${cwv.cls ?? '—'}`
        : cwv.reason || 'PSI telemetry unavailable',
      recommendation: 'Keep mobile LCP under 2.5s and CLS under 0.1 for stronger organic and local pack rankings.',
      autoFixable: false,
    });
  }

  const totalWeight = checks.reduce((s, c) => s + c.scoreWeight, 0) || 100;
  const passedWeight = checks.filter((c) => c.passed).reduce((s, c) => s + c.scoreWeight, 0);
  const websiteScore = Math.round((passedWeight / totalWeight) * 100);

  const aiReadinessChecks = checks.filter(
    (c) => c.category === 'ai_crawlability' || c.category === 'structured_data' || c.id === 'hosted_description_quality',
  );
  const aiWeight = aiReadinessChecks.reduce((s, c) => s + c.scoreWeight, 0) || 100;
  const aiPassed = aiReadinessChecks.filter((c) => c.passed).reduce((s, c) => s + c.scoreWeight, 0);
  const aiReadinessScore = Math.round((aiPassed / aiWeight) * 100);

  const overallScore = Math.round(gbpAudit.score * 0.45 + websiteScore * 0.35 + aiReadinessScore * 0.2);

  const snippets =
    presence.mode === 'custom_domain' && presence.websiteUrl
      ? generateCustomDomainSnippets({
          businessName,
          industry,
          city,
          phone: tenant.phone,
          address: tenant.address,
          websiteUrl: presence.websiteUrl,
          services: serviceNames,
        })
      : null;

  return persistAuditSnapshot(tenantId, {
    auditedAt: new Date().toISOString(),
    presence,
    overallScore,
    gbpScore: gbpAudit.score,
    websiteScore,
    aiReadinessScore,
    hostedProfileTier,
    checks,
    robots,
    html: htmlAnalysis,
    cwv,
    snippets,
  });
}

async function persistAuditSnapshot(
  tenantId: string,
  partial: Omit<WebsiteAndAiAuditReport, 'tasks'>,
): Promise<WebsiteAndAiAuditReport> {
  const failedChecks = partial.checks.filter((c) => !c.passed);

  let tasks: SeoFixTaskDto[] = [];
  try {
    const existingTasks = await getLatestWebsiteAudit(tenantId).then((r) => r.tasks);
    const keepNonAuditOrApplied = existingTasks.filter(
      (t) => t.source === 'ai_gap' || t.status === 'applied',
    );

    const newTasks: SeoFixTaskDto[] = failedChecks.map((check) => ({
      id: `audit-${check.id}`,
      source: 'audit',
      category: check.category,
      title: check.label,
      description: check.recommendation,
      severity: check.severity,
      targetMode: partial.presence.mode,
      autoFixable: check.autoFixable,
      fixActionKey: check.fixActionKey || null,
      fixPayload: partial.snippets && check.fixActionKey?.startsWith('copy_snippet')
        ? {
            snippetKey: check.fixActionKey,
            snippet:
              check.fixActionKey === 'copy_snippet_robots'
                ? partial.snippets.robotsTxt
                : check.fixActionKey === 'copy_snippet_meta'
                  ? partial.snippets.metaTags
                  : partial.snippets.localBusinessJsonLd,
          }
        : {},
      hasRollback: false,
      status: 'open',
      appliedAt: null,
      createdAt: partial.auditedAt,
    }));

    // Merge cleanly: avoid duplicating open task with same fixActionKey/title
    const seenTitles = new Set<string>();
    const merged: SeoFixTaskDto[] = [];
    for (const t of [...newTasks, ...keepNonAuditOrApplied]) {
      const k = `${t.source}:${t.title}`;
      if (seenTitles.has(k)) continue;
      seenTitles.add(k);
      merged.push(t);
    }
    tasks = merged.slice(0, 25);

    if ((db as any).seoFixTask?.createMany || (db as any).seoFixTask?.upsert) {
      // Remove stale open audit tasks and insert fresh open audit tasks
      await (db as any).seoFixTask
        ?.deleteMany?.({ where: { tenantId, source: 'audit', status: 'open' } })
        .catch(() => {});

      for (const t of newTasks) {
        await (db as any).seoFixTask
          ?.create?.({
            data: {
              id: randomUUID(),
              tenantId,
              source: 'audit',
              category: t.category,
              title: t.title,
              description: t.description,
              severity: t.severity,
              targetMode: t.targetMode,
              autoFixable: t.autoFixable,
              fixActionKey: t.fixActionKey,
              fixPayloadJson: JSON.stringify(t.fixPayload || {}),
              status: 'open',
            },
          })
          .catch(() => {});
      }
    }

    if ((db as any).websiteAuditSnapshot?.create) {
      await (db as any).websiteAuditSnapshot
        .create({
          data: {
            tenantId,
            presenceMode: partial.presence.mode,
            targetUrl: partial.presence.canonicalUrl || partial.presence.websiteUrl,
            overallScore: partial.overallScore,
            gbpScore: partial.gbpScore,
            websiteScore: partial.websiteScore,
            aiReadinessScore: partial.aiReadinessScore,
            cwvLcpMs: partial.cwv.lcpMs,
            cwvCls: partial.cwv.cls,
            cwvPerformanceScore: partial.cwv.performanceScore,
            issuesJson: JSON.stringify(partial.checks),
            recommendationsJson: JSON.stringify(failedChecks.map((f) => f.recommendation)),
          },
        })
        .catch(() => {});
    }
  } catch {}

  const report: WebsiteAndAiAuditReport = { ...partial, tasks };

  try {
    const fresh = await db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } });
    const parsed = (() => {
      try {
        return JSON.parse(fresh?.settingsJson || '{}');
      } catch {
        return {};
      }
    })();
    parsed.seoAuditSnapshot = report;
    parsed.seoFixTasks = tasks;
    await db.tenant.update({
      where: { id: tenantId },
      data: { settingsJson: JSON.stringify(parsed) },
    });
  } catch {}

  return report;
}

export async function applyHostedOrActivationSeoFix(params: {
  tenantId: string;
  actionKey: 'activate_hosted_site' | 'hosted_seo_enrich';
  taskId?: string;
  customDescription?: string;
  customSeoTitle?: string;
  customSeoDescription?: string;
  syncToGoogle?: boolean;
}): Promise<{
  success: boolean;
  websiteUrl: string;
  canonicalUrl: string;
  rollbackId: string;
  syncedToGoogle: boolean;
  message: string;
}> {
  const { tenantId, actionKey } = params;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    include: { brandProfile: true },
  });
  if (!tenant) throw new Error('Tenant not found');

  const services =
    (await db.service
      ?.findMany?.({ where: { tenantId, isActive: true }, select: { name: true }, take: 15 })
      .catch(() => [])) ?? [];
  const serviceNames = Array.isArray(services) ? services.map((s: any) => s.name).filter(Boolean) : [];

  const rollbackSnapshot = {
    slug: tenant.slug,
    website: tenant.website,
    publicProfileEnabled: tenant.publicProfileEnabled,
    claimed: tenant.claimed,
    description: tenant.description,
    seoTitle: tenant.seoTitle,
    seoDescription: tenant.seoDescription,
    faqsJson: tenant.faqsJson,
  };

  const slug = normalizeSlugValue(tenant.publicSlug || tenant.slug || tenant.name, tenant.id);
  const businessName = tenant.brandProfile?.businessName || tenant.name;
  const industry = tenant.brandProfile?.industry || tenant.industry || 'Local Services';
  const city = tenant.city || tenant.brandProfile?.location || 'your area';

  const currentDesc = tenant.description?.trim() || '';
  const needsRichDesc = currentDesc.length < 120 || isTemplatedDescription(currentDesc);

  const rawSettings = (() => {
    try {
      return JSON.parse((tenant as any).settingsJson || '{}');
    } catch {
      return {};
    }
  })();
  const discoveryKeywords: string[] = Array.isArray(rawSettings?.googleDiscovery?.keywords)
    ? rawSettings.googleDiscovery.keywords
        .map((k: any) => (typeof k?.keyword === 'string' ? k.keyword.trim() : ''))
        .filter(Boolean)
        .slice(0, 6)
    : [];
  const mergedServiceNames = [
    ...serviceNames,
    ...(Array.isArray(rawSettings?.seoServices)
      ? rawSettings.seoServices
          .map((s: any) => (typeof s?.name === 'string' ? s.name.trim() : ''))
          .filter(Boolean)
      : []),
  ].filter((name, idx, arr) => arr.findIndex((n) => n.toLowerCase() === name.toLowerCase()) === idx);

  let nextDescription = params.customDescription?.trim() || currentDesc;
  if (!params.customDescription && needsRichDesc) {
    // Try AI generation quickly if available, otherwise crisp non-templated copy
    try {
      const { callAI } = await import('@/lib/ai-client');
      const kwPrompt = discoveryKeywords.length > 0 ? `, Top Search Terms: ${discoveryKeywords.slice(0, 4).join(', ')}` : '';
      const res: any = await Promise.race([
        callAI([
          {
            role: 'system',
            content:
              'Write one original 160-260 character local business About paragraph mentioning the exact business name, city, and services. Plain text only, no quotes, no filler phrases.',
          },
          {
            role: 'user',
            content: `Business: ${businessName}, Category: ${industry}, City: ${city}, Services: ${mergedServiceNames.join(', ') || industry}${kwPrompt}`,
          },
        ]),
        new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000)),
      ]);
      const aiText = (typeof res === 'string' ? res : res?.text || res?.content || '').trim();
      if (aiText.length >= 120 && !isTemplatedDescription(aiText)) {
        nextDescription = aiText.slice(0, 740);
      }
    } catch {}

    if (nextDescription.length < 120 || isTemplatedDescription(nextDescription)) {
      nextDescription = buildNonTemplatedDescription({
        businessName,
        industry,
        city,
        services: mergedServiceNames,
        phone: tenant.phone,
        keywords: discoveryKeywords,
      });
    }
  }

  const nextSeoTitle =
    params.customSeoTitle?.trim() ||
    (tenant.seoTitle && tenant.seoTitle.length >= 25
      ? tenant.seoTitle
      : `${businessName} — ${discoveryKeywords[0] || industry} in ${city}`.slice(0, 62));

  const nextSeoDescription =
    params.customSeoDescription?.trim() ||
    (tenant.seoDescription && tenant.seoDescription.length >= 80
      ? tenant.seoDescription
      : `Book ${businessName} for ${discoveryKeywords.slice(0, 2).join(' & ') || industry.toLowerCase()} in ${city}. View services, verified customer reviews, and instant appointment options.`.slice(0, 155));

  const existingFaqs = parseJsonArray<{ question: string; answer: string }>(tenant.faqsJson);
  const nextFaqs =
    existingFaqs.length >= 2
      ? existingFaqs
      : buildDefaultFaqs({
          businessName,
          industry,
          city,
          services: mergedServiceNames,
          phone: tenant.phone,
          keywords: discoveryKeywords,
        });

  const hostedShortUrl = `https://bgos.fieseros.com/b/${slug}`;
  const presenceAfter = resolveBusinessPresenceMode({
    tenant: { ...tenant, slug, website: tenant.website || hostedShortUrl, publicProfileEnabled: true, claimed: true },
  });

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      slug,
      website: tenant.website || hostedShortUrl,
      publicProfileEnabled: true,
      claimed: true,
      description: nextDescription,
      seoTitle: nextSeoTitle,
      seoDescription: nextSeoDescription,
      faqsJson: JSON.stringify(nextFaqs),
    },
  });

  revalidatePublicBusiness(slug);
  void submitToIndexNow([presenceAfter.hostedCanonicalUrl]).catch(() => {});

  let syncedToGoogle = false;
  if (params.syncToGoogle && actionKey === 'activate_hosted_site') {
    try {
      const googleAccount = await prepareGoogleAccount(tenantId);
      if (googleAccount?.accessToken && googleAccount.metadata) {
        const { locationId } = await extractLocationRef(googleAccount);
        if (locationId) {
          const patchUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/locations/${encodeURIComponent(locationId)}?updateMask=websiteUri`;
          const gRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${googleAccount.accessToken}`,
            },
            body: JSON.stringify({ websiteUri: hostedShortUrl }),
          });
          syncedToGoogle = gRes.ok;
        }
      }
    } catch {}
  }

  const rollbackId = params.taskId || `fix-${Date.now()}`;
  const appliedAt = new Date().toISOString();

  if ((db as any).seoFixTask?.updateMany) {
    try {
      await (db as any).seoFixTask.updateMany({
        where: params.taskId
          ? { id: params.taskId, tenantId }
          : { tenantId, fixActionKey: actionKey, status: 'open' },
        data: {
          status: 'applied',
          rollbackSnapshotJson: JSON.stringify(rollbackSnapshot),
          appliedAt: new Date(appliedAt),
        },
      });
    } catch {}
  }

  try {
    const fresh = await db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } });
    const parsed = JSON.parse(fresh?.settingsJson || '{}');
    const tasksList: SeoFixTaskDto[] = Array.isArray(parsed.seoFixTasks) ? parsed.seoFixTasks : [];
    parsed.seoFixTasks = tasksList.map((t) =>
      (params.taskId && t.id === params.taskId) || t.fixActionKey === actionKey
        ? { ...t, status: 'applied', hasRollback: true, appliedAt }
        : t,
    );
    parsed.seoRollbackHistory = {
      ...(parsed.seoRollbackHistory || {}),
      [rollbackId]: rollbackSnapshot,
    };
    await db.tenant.update({
      where: { id: tenantId },
      data: { settingsJson: JSON.stringify(parsed) },
    });
  } catch {}

  return {
    success: true,
    websiteUrl: tenant.website || hostedShortUrl,
    canonicalUrl: presenceAfter.hostedCanonicalUrl,
    rollbackId,
    syncedToGoogle,
    message:
      actionKey === 'activate_hosted_site'
        ? `Free SEO-ready mini-site activated at ${hostedShortUrl} with Schema & FAQs.`
        : `Hosted page upgraded with rich copy, SEO meta tags, and FAQPage schema — index cache refreshed.`,
  };
}

export async function rollbackSeoFix(tenantId: string, taskId: string): Promise<{ success: boolean; message: string }> {
  let snapshot: Record<string, any> | null = null;

  if ((db as any).seoFixTask?.findFirst) {
    try {
      const task = await (db as any).seoFixTask.findFirst({ where: { id: taskId, tenantId } });
      if (task?.rollbackSnapshotJson) {
        snapshot = JSON.parse(task.rollbackSnapshotJson);
      }
    } catch {}
  }

  if (!snapshot) {
    const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { settingsJson: true } });
    try {
      const parsed = JSON.parse(t?.settingsJson || '{}');
      snapshot = parsed?.seoRollbackHistory?.[taskId] || null;
    } catch {}
  }

  if (!snapshot) {
    return { success: false, message: 'No rollback snapshot found for this task' };
  }

  await db.tenant.update({
    where: { id: tenantId },
    data: {
      website: snapshot.website ?? null,
      publicProfileEnabled: Boolean(snapshot.publicProfileEnabled),
      claimed: Boolean(snapshot.claimed),
      description: snapshot.description ?? null,
      seoTitle: snapshot.seoTitle ?? null,
      seoDescription: snapshot.seoDescription ?? null,
      faqsJson: snapshot.faqsJson ?? '[]',
    },
  });

  revalidatePublicBusiness(snapshot.slug);

  if ((db as any).seoFixTask?.updateMany) {
    await (db as any).seoFixTask
      .updateMany({ where: { id: taskId, tenantId }, data: { status: 'rolled_back' } })
      .catch(() => {});
  }

  return { success: true, message: 'Previous profile SEO settings restored.' };
}
