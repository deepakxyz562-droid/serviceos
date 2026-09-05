/**
 * Phase B — Ranking Differentiator Analysis
 * ==========================================
 *
 * Compares top-ranking marketplace business pages against lower-ranking ones
 * to identify which profile signals correlate with higher Google rankings.
 *
 * APPROACH:
 *   1. Read the GSC Pages.csv (already in /tmp/gsc-extract/)
 *   2. Filter to marketplace-business URLs only
 *   3. Bucket by position tier: 1-3, 4-10, 11-20, 21-30
 *   4. Sample top N pages (by impressions) from each tier
 *   5. Always include DF Cleaning (the user's named test case)
 *   6. For each URL, fetch the live HTML from fieseros.com
 *   7. Extract profile signals from the HTML + JSON-LD
 *   8. Output a comparison table + correlation analysis
 *
 * SIGNALS EXTRACTED PER PAGE:
 *   - GSC: position, impressions, clicks, CTR
 *   - Claimed status (from "not yet claimed" / "Claim this business" text)
 *   - Description length (characters, after HTML strip)
 *   - Description is templated (detects "Looking for reliable..." boilerplate)
 *   - Service count (count of service cards)
 *   - Photo count (gallery images)
 *   - Review count (from aggregateRating or visible text)
 *   - Rating (from aggregateRating)
 *   - Verification badges (identity / business / insurance / licence — count 0-4)
 *   - Schema @type (HVACBusiness, Plumber, etc.)
 *   - Schema has geo
 *   - Schema has openingHoursSpecification
 *   - Schema has sameAs (social links)
 *   - Schema has aggregateRating
 *   - Schema has FAQ
 *   - Page word count (visible text)
 *
 * OUTPUT:
 *   /home/z/my-project/phase-b-differentiator-report.md
 *
 * USAGE:
 *   bun run scripts/phase-b-differentiator.ts [path-to-pages.csv] [sample-size-per-tier]
 *
 * DEFAULTS:
 *   path-to-pages.csv = /tmp/gsc-extract/Pages.csv (auto-extracted from the GSC ZIP)
 *   sample-size-per-tier = 10
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { execSync } from 'child_process';

// ─── Config ──────────────────────────────────────────────────────────────────

const GSC_ZIP = '/home/z/my-project/upload/fieseros.com-Performance-on-Search-2026-09-05.zip';
const CSV_PATH = process.argv[2] || '/tmp/gsc-extract/Pages.csv';
const SAMPLE_SIZE = parseInt(process.argv[3] || '10', 10);
const OUTPUT_PATH = '/home/z/my-project/phase-b-differentiator-report.md';
const FETCH_DELAY_MS = 800; // be polite to the production server
const FETCH_TIMEOUT_MS = 15000;

const KNOWN_INDUSTRY_SLUGS = [
  'hvac', 'plumbers', 'electricians', 'cleaners', 'pest-control', 'landscapers',
  'roofers', 'painters', 'handymen', 'lawn-care', 'snow-removal', 'solar',
  'tree-care', 'pool-spa', 'garage-door', 'concrete', 'pet-services',
  'window-cleaning', 'window-cleaners', 'floorings', 'flooring-contractors',
  'appliance-repairs', 'electrician', 'cleaning',
];

// DF Cleaning — always include (user's named test case)
const DF_CLEANING_URL = 'https://fieseros.com/cleaners/austin/df-cleaning-llc-eafbb8';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GscPageRow {
  url: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface ProfileSignals {
  url: string;
  // GSC data
  position: number;
  impressions: number;
  clicks: number;
  ctr: number;
  tier: '1-3' | '4-10' | '11-20' | '21-30';
  // Profile signals (from live HTML)
  claimed: boolean | null; // null = couldn't determine
  descriptionLength: number;
  descriptionIsTemplated: boolean;
  serviceCount: number;
  photoCount: number;
  reviewCount: number;
  rating: number | null;
  verificationBadgeCount: number;
  // Schema signals (from JSON-LD)
  schemaType: string | null;
  schemaHasGeo: boolean;
  schemaHasOpeningHours: boolean;
  schemaHasSameAs: boolean;
  schemaHasAggregateRating: boolean;
  schemaHasFaq: boolean;
  // Page signals
  visibleWordCount: number;
  // Errors
  fetchError?: string;
}

// ─── CSV parser (same as gsc-analyzer) ───────────────────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = false; }
      } else { current += char; }
    } else {
      if (char === '"') { inQuotes = true; }
      else if (char === ',') { fields.push(current); current = ''; }
      else { current += char; }
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parsePagesCsv(content: string): GscPageRow[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  let headerLineIdx = 0;
  let header: string[] = [];
  for (let i = 0; i < Math.min(3, lines.length); i++) {
    const candidate = parseCsvLine(lines[i]);
    if (candidate.some((h) => h.toLowerCase().includes('click'))) {
      headerLineIdx = i;
      header = candidate.map((h) => h.toLowerCase().trim());
      break;
    }
  }
  if (header.length === 0) return [];
  const colMap = {
    url: header.findIndex((h) => h.includes('page') || h.includes('url')),
    clicks: header.findIndex((h) => h.includes('click')),
    impressions: header.findIndex((h) => h.includes('impression')),
    ctr: header.findIndex((h) => h === 'ctr' || h.includes('ctr')),
    position: header.findIndex((h) => h.includes('position')),
  };
  const rows: GscPageRow[] = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 4) continue;
    const url = fields[colMap.url] || '';
    const clicks = parseInt(fields[colMap.clicks] || '0', 10) || 0;
    const impressions = parseInt(fields[colMap.impressions] || '0', 10) || 0;
    const ctrStr = (fields[colMap.ctr] || '0').replace('%', '').trim();
    const ctr = parseFloat(ctrStr) / 100 || 0;
    const position = parseFloat(fields[colMap.position] || '0') || 0;
    if (!url || impressions === 0) continue;
    rows.push({ url, clicks, impressions, ctr, position });
  }
  return rows;
}

// ─── URL classifier (marketplace-business only) ──────────────────────────────

function isMarketplaceBusinessUrl(url: string): boolean {
  let path = url;
  try { path = new URL(url).pathname; } catch { return false; }
  const segments = path.split('/').filter(Boolean);
  return segments.length >= 3 && KNOWN_INDUSTRY_SLUGS.includes(segments[0]);
}

// ─── Tier classifier ─────────────────────────────────────────────────────────

function getTier(position: number): '1-3' | '4-10' | '11-20' | '21-30' | null {
  if (position >= 1 && position <= 3) return '1-3';
  if (position > 3 && position <= 10) return '4-10';
  if (position > 10 && position <= 20) return '11-20';
  if (position > 20 && position <= 30) return '21-30';
  return null;
}

// ─── HTML fetcher ─────────────────────────────────────────────────────────────

function fetchHtml(url: string): { html: string; error?: string } {
  try {
    const result = execSync(
      `curl -s --max-time ${FETCH_TIMEOUT_MS} -L -A "Fieseros-SEO-Analyzer/1.0 (phase-b-differentiator)" "${url}"`,
      { encoding: 'utf-8', timeout: FETCH_TIMEOUT_MS + 5000, maxBuffer: 10 * 1024 * 1024 }
    );
    return { html: result };
  } catch (err) {
    return { html: '', error: String(err).slice(0, 200) };
  }
}

// ─── Signal extractors ───────────────────────────────────────────────────────

function extractClaimStatus(html: string): boolean | null {
  // "not yet claimed" → unclaimed
  if (/not yet claimed|Claim this business/i.test(html)) return false;
  // "claimed by owner" / "verified owner" → claimed
  if (/claimed by owner|profile claimed|This business has claimed/i.test(html)) return true;
  return null;
}

function extractDescriptionSignals(html: string): { length: number; isTemplated: boolean } {
  // Try to extract from JSON-LD description first (most reliable)
  const schemaDescMatch = html.match(/"@type":"(?:HVACBusiness|Plumber|Electrician|LocalBusiness|PestControl|Landscaper|RoofingContractor|HousePainter|AutoRepair|HealthAndBeautyBusiness|PetStore|FoodEstablishment)"[^}]*"description":"([^"]*)"/);
  let desc = schemaDescMatch?.[1] || '';
  // If not in schema, try the visible About section
  if (!desc) {
    const aboutMatch = html.match(/About\s+(?:this business|the business|DF Cleaning|.*?)[^<]*<[^>]*>([^<]{50,500})/i);
    if (aboutMatch) desc = aboutMatch[1];
  }
  // Strip HTML if present
  const plain = desc.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const isTemplated = /Looking for reliable .* services in .*\? .* is a .* business based in/.test(plain);
  return { length: plain.length, isTemplated };
}

function extractServiceCount(html: string): number {
  // Count service cards — they typically have class "rounded-lg border bg-card" or similar
  // Also try counting from the services section
  const serviceCardMatches = html.match(/data-service-id|service-card|class="[^"]*rounded-lg border bg-card[^"]*"/g);
  if (serviceCardMatches) return serviceCardMatches.length;
  // Fallback: count <h3> tags in the services section
  const servicesSectionMatch = html.match(/id="services"[^]*?(?=<section|$)/);
  if (servicesSectionMatch) {
    const h3Matches = servicesSectionMatch[0].match(/<h3[^>]*>([^<]+)<\/h3>/g);
    if (h3Matches) return h3Matches.length;
  }
  return 0;
}

function extractPhotoCount(html: string): number {
  // Count images in the gallery section
  const gallerySectionMatch = html.match(/id="gallery"[^]*?(?=<section|$)/);
  if (gallerySectionMatch) {
    const imgMatches = gallerySectionMatch[0].match(/<img[^>]*>/g);
    if (imgMatches) return imgMatches.length;
  }
  return 0;
}

function extractReviewSignals(html: string): { count: number; rating: number | null } {
  // From JSON-LD aggregateRating
  const arMatch = html.match(/"aggregateRating":\{"@type":"AggregateRating","ratingValue":"([^"]+)","reviewCount":"([^"]+)"/);
  if (arMatch) {
    return { count: parseInt(arMatch[2], 10) || 0, rating: parseFloat(arMatch[1]) || null };
  }
  // Fallback: visible text "X reviews"
  const reviewTextMatch = html.match(/(\d+)\s+reviews?/i);
  const ratingTextMatch = html.match(/(\d\.\d)\s*(?:out of\s*5|stars?|\bscore)?/i);
  return {
    count: reviewTextMatch ? parseInt(reviewTextMatch[1], 10) || 0 : 0,
    rating: ratingTextMatch ? parseFloat(ratingTextMatch[1]) || null : null,
  };
}

function extractVerificationBadges(html: string): number {
  // Count confirmed verification badges — look for "Identity Verified", "Business Verified", etc.
  const patterns = [
    /Identity Verified/i,
    /Business Verified/i,
    /Insurance Verified/i,
    /Licence Verified|Licensed & Insured/i,
  ];
  let count = 0;
  for (const p of patterns) {
    if (p.test(html)) count++;
  }
  return count;
}

function extractSchemaSignals(html: string): {
  type: string | null;
  hasGeo: boolean;
  hasOpeningHours: boolean;
  hasSameAs: boolean;
  hasAggregateRating: boolean;
  hasFaq: boolean;
} {
  const schemaTypeMatch = html.match(/"@type":"(HVACBusiness|Plumber|Electrician|LocalBusiness|PestControl|Landscaper|RoofingContractor|HousePainter|AutoRepair|HealthAndBeautyBusiness|PetStore|FoodEstablishment|MovingCompany)"/);
  return {
    type: schemaTypeMatch?.[1] || null,
    hasGeo: /"geo":\{"@type":"GeoCoordinates"/.test(html),
    hasOpeningHours: /"openingHoursSpecification":\[/.test(html),
    hasSameAs: /"sameAs":\[/.test(html),
    hasAggregateRating: /"aggregateRating":\{/.test(html),
    hasFaq: /"@type":"FAQPage"/.test(html),
  };
}

function extractVisibleWordCount(html: string): number {
  // Strip script, style, JSON-LD, and HTML tags; count words
  const text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;|&nbsp;|&lt;|&gt;|&quot;|&#39;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.split(/\s+/).filter((w) => w.length > 2).length;
}

function extractAllSignals(url: string, gsc: GscPageRow, tier: '1-3' | '4-10' | '11-20' | '21-30'): ProfileSignals {
  const { html, error } = fetchHtml(url);
  if (error || !html) {
    return {
      url, position: gsc.position, impressions: gsc.impressions, clicks: gsc.clicks, ctr: gsc.ctr, tier,
      claimed: null, descriptionLength: 0, descriptionIsTemplated: false, serviceCount: 0,
      photoCount: 0, reviewCount: 0, rating: null, verificationBadgeCount: 0,
      schemaType: null, schemaHasGeo: false, schemaHasOpeningHours: false,
      schemaHasSameAs: false, schemaHasAggregateRating: false, schemaHasFaq: false,
      visibleWordCount: 0, fetchError: error || 'empty response',
    };
  }
  const desc = extractDescriptionSignals(html);
  const reviews = extractReviewSignals(html);
  const schema = extractSchemaSignals(html);
  return {
    url, position: gsc.position, impressions: gsc.impressions, clicks: gsc.clicks, ctr: gsc.ctr, tier,
    claimed: extractClaimStatus(html),
    descriptionLength: desc.length,
    descriptionIsTemplated: desc.isTemplated,
    serviceCount: extractServiceCount(html),
    photoCount: extractPhotoCount(html),
    reviewCount: reviews.count,
    rating: reviews.rating,
    verificationBadgeCount: extractVerificationBadges(html),
    schemaType: schema.type,
    schemaHasGeo: schema.hasGeo,
    schemaHasOpeningHours: schema.hasOpeningHours,
    schemaHasSameAs: schema.hasSameAs,
    schemaHasAggregateRating: schema.hasAggregateRating,
    schemaHasFaq: schema.hasFaq,
    visibleWordCount: extractVisibleWordCount(html),
  };
}

// ─── Sleep helper ────────────────────────────────────────────────────────────

function sleep(ms: number) {
  execSync(`sleep ${ms / 1000}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  // Extract GSC ZIP if CSV not already present
  let csvContent: string;
  if (existsSync(CSV_PATH)) {
    csvContent = readFileSync(CSV_PATH, 'utf-8');
  } else {
    console.log(`📂 Extracting GSC ZIP to /tmp/gsc-extract/...`);
    rmSync('/tmp/gsc-extract', { recursive: true, force: true });
    mkdirSync('/tmp/gsc-extract', { recursive: true });
    execSync(`unzip -o "${GSC_ZIP}" -d /tmp/gsc-extract`, { stdio: 'pipe' });
    const csvPath = '/tmp/gsc-extract/Pages.csv';
    if (!existsSync(csvPath)) {
      console.error(`❌ Pages.csv not found in ZIP`);
      process.exit(1);
    }
    csvContent = readFileSync(csvPath, 'utf-8');
  }

  console.log(`📊 Parsing Pages.csv...`);
  const allPages = parsePagesCsv(csvContent);
  console.log(`   Total pages: ${allPages.length}`);

  // Filter to marketplace-business URLs only
  const marketplacePages = allPages.filter((p) => isMarketplaceBusinessUrl(p.url));
  console.log(`   Marketplace business pages: ${marketplacePages.length}`);

  // Bucket by tier
  const tiers: Record<'1-3' | '4-10' | '11-20' | '21-30', GscPageRow[]> = {
    '1-3': [], '4-10': [], '11-20': [], '21-30': [],
  };
  for (const p of marketplacePages) {
    const tier = getTier(p.position);
    if (tier) tiers[tier].push(p);
  }

  // Sort each tier by impressions desc, take top SAMPLE_SIZE
  const sampled: { row: GscPageRow; tier: '1-3' | '4-10' | '11-20' | '21-30' }[] = [];
  (Object.keys(tiers) as Array<'1-3' | '4-10' | '11-20' | '21-30'>).forEach((tier) => {
    tiers[tier].sort((a, b) => b.impressions - a.impressions);
    const sample = tiers[tier].slice(0, SAMPLE_SIZE);
    console.log(`   Tier ${tier}: ${tiers[tier].length} pages → sampling top ${sample.length}`);
    sample.forEach((row) => sampled.push({ row, tier }));
  });

  // Always include DF Cleaning if not already in the sample
  const dfInSample = sampled.some((s) => s.row.url === DF_CLEANING_URL);
  const dfRow = allPages.find((p) => p.url === DF_CLEANING_URL);
  if (!dfInSample && dfRow) {
    const dfTier = getTier(dfRow.position);
    if (dfTier) {
      sampled.push({ row: dfRow, tier: dfTier });
      console.log(`   + DF Cleaning (test case): tier ${dfTier}, ${dfRow.impressions} impressions`);
    } else {
      console.log(`   ! DF Cleaning position ${dfRow.position} outside tiers 1-30 — including anyway`);
      // Find which tier it's closest to and include
      const closestTier = dfRow.position <= 10 ? '4-10' : '11-20';
      sampled.push({ row: dfRow, tier: closestTier });
    }
  }

  console.log(`\n🔍 Fetching ${sampled.length} live pages (with ${FETCH_DELAY_MS}ms delay)...`);

  const results: ProfileSignals[] = [];
  for (let i = 0; i < sampled.length; i++) {
    const { row, tier } = sampled[i];
    const urlShort = row.url.replace('https://fieseros.com', '');
    console.log(`   [${i + 1}/${sampled.length}] ${urlShort} (pos ${row.position}, ${row.impressions} impr)`);
    const signals = extractAllSignals(row.url, row, tier);
    results.push(signals);
    if (i < sampled.length - 1) sleep(FETCH_DELAY_MS);
  }

  // ─── Build report ───────────────────────────────────────────────────────────
  let md = '';
  const fmt = (n: number) => n.toLocaleString('en-US');
  const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const fmtPos = (n: number) => n.toFixed(1);

  md += `# Phase B — Ranking Differentiator Analysis\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Source:** GSC Pages.csv + live fieseros.com page fetches\n`;
  md += `**Sample:** top ${SAMPLE_SIZE} pages per tier + DF Cleaning\n`;
  md += `**Total pages analyzed:** ${results.length}\n\n`;
  md += `---\n\n`;

  // Per-page detail table
  md += `## Per-Page Profile Signals\n\n`;
  md += `All ${results.length} sampled pages with their GSC ranking data + extracted profile signals:\n\n`;
  md += `| Tier | URL | Pos | Impr | Clicks | CTR | Claimed | Desc Len | Templated | Services | Photos | Reviews | Rating | Badges | Word Count |\n`;
  md += `|---|---|---:|---:|---:|---:|---|---:|---|---:|---:|---:|---|---:|---:|\n`;
  for (const r of results) {
    const urlShort = r.url.replace('https://fieseros.com/', '');
    const urlDisplay = urlShort.length > 50 ? '...' + urlShort.slice(-47) : urlShort;
    const claimed = r.claimed === null ? '?' : r.claimed ? '✓' : '✗';
    const templated = r.descriptionIsTemplated ? 'YES' : 'no';
    const rating = r.rating !== null ? r.rating.toFixed(1) : '-';
    md += `| ${r.tier} | ${urlDisplay} | ${fmtPos(r.position)} | ${fmt(r.impressions)} | ${r.clicks} | ${fmtPct(r.ctr)} | ${claimed} | ${r.descriptionLength} | ${templated} | ${r.serviceCount} | ${r.photoCount} | ${r.reviewCount} | ${rating} | ${r.verificationBadgeCount} | ${r.visibleWordCount} |\n`;
  }
  md += `\n`;

  // Tier averages table
  md += `## Tier Averages (the key comparison)\n\n`;
  md += `Average profile signals per tier — this reveals what correlates with higher rankings:\n\n`;

  const tierKeys = ['1-3', '4-10', '11-20', '21-30'] as const;
  const tierLabels: Record<string, string> = {
    '1-3': 'Position 1-3 (top winners)',
    '4-10': 'Position 4-10 (page 1 lower)',
    '11-20': 'Position 11-20 (page 2)',
    '21-30': 'Position 21-30 (page 3)',
  };

  md += `| Signal | ${tierLabels['1-3']} | ${tierLabels['4-10']} | ${tierLabels['11-20']} | ${tierLabels['21-30']} |\n`;
  md += `|---|---:|---:|---:|---:|\n`;

  const avg = (arr: ProfileSignals[], key: (r: ProfileSignals) => number): string => {
    if (arr.length === 0) return '-';
    const sum = arr.reduce((s, r) => s + key(r), 0);
    return (sum / arr.length).toFixed(1);
  };
  const pct = (arr: ProfileSignals[], key: (r: ProfileSignals) => boolean): string => {
    if (arr.length === 0) return '-';
    const count = arr.filter(key).length;
    return `${Math.round((count / arr.length) * 100)}%`;
  };

  const tierArrays: Record<string, ProfileSignals[]> = { '1-3': [], '4-10': [], '11-20': [], '21-30': [] };
  for (const r of results) tierArrays[r.tier].push(r);

  md += `| Sample size | ${tierArrays['1-3'].length} | ${tierArrays['4-10'].length} | ${tierArrays['11-20'].length} | ${tierArrays['21-30'].length} |\n`;
  md += `| Avg impressions | ${avg(tierArrays['1-3'], r => r.impressions)} | ${avg(tierArrays['4-10'], r => r.impressions)} | ${avg(tierArrays['11-20'], r => r.impressions)} | ${avg(tierArrays['21-30'], r => r.impressions)} |\n`;
  md += `| Avg CTR | ${avg(tierArrays['1-3'], r => r.ctr * 100)}% | ${avg(tierArrays['4-10'], r => r.ctr * 100)}% | ${avg(tierArrays['11-20'], r => r.ctr * 100)}% | ${avg(tierArrays['21-30'], r => r.ctr * 100)}% |\n`;
  md += `| Claimed rate | ${pct(tierArrays['1-3'], r => r.claimed === true)} | ${pct(tierArrays['4-10'], r => r.claimed === true)} | ${pct(tierArrays['11-20'], r => r.claimed === true)} | ${pct(tierArrays['21-30'], r => r.claimed === true)} |\n`;
  md += `| Avg description length | ${avg(tierArrays['1-3'], r => r.descriptionLength)} | ${avg(tierArrays['4-10'], r => r.descriptionLength)} | ${avg(tierArrays['11-20'], r => r.descriptionLength)} | ${avg(tierArrays['21-30'], r => r.descriptionLength)} |\n`;
  md += `| Templated description rate | ${pct(tierArrays['1-3'], r => r.descriptionIsTemplated)} | ${pct(tierArrays['4-10'], r => r.descriptionIsTemplated)} | ${pct(tierArrays['11-20'], r => r.descriptionIsTemplated)} | ${pct(tierArrays['21-30'], r => r.descriptionIsTemplated)} |\n`;
  md += `| Avg service count | ${avg(tierArrays['1-3'], r => r.serviceCount)} | ${avg(tierArrays['4-10'], r => r.serviceCount)} | ${avg(tierArrays['11-20'], r => r.serviceCount)} | ${avg(tierArrays['21-30'], r => r.serviceCount)} |\n`;
  md += `| Avg photo count | ${avg(tierArrays['1-3'], r => r.photoCount)} | ${avg(tierArrays['4-10'], r => r.photoCount)} | ${avg(tierArrays['11-20'], r => r.photoCount)} | ${avg(tierArrays['21-30'], r => r.photoCount)} |\n`;
  md += `| Avg review count | ${avg(tierArrays['1-3'], r => r.reviewCount)} | ${avg(tierArrays['4-10'], r => r.reviewCount)} | ${avg(tierArrays['11-20'], r => r.reviewCount)} | ${avg(tierArrays['21-30'], r => r.reviewCount)} |\n`;
  md += `| Has rating | ${pct(tierArrays['1-3'], r => r.rating !== null)} | ${pct(tierArrays['4-10'], r => r.rating !== null)} | ${pct(tierArrays['11-20'], r => r.rating !== null)} | ${pct(tierArrays['21-30'], r => r.rating !== null)} |\n`;
  md += `| Avg verification badges | ${avg(tierArrays['1-3'], r => r.verificationBadgeCount)} | ${avg(tierArrays['4-10'], r => r.verificationBadgeCount)} | ${avg(tierArrays['11-20'], r => r.verificationBadgeCount)} | ${avg(tierArrays['21-30'], r => r.verificationBadgeCount)} |\n`;
  md += `| Has geo schema | ${pct(tierArrays['1-3'], r => r.schemaHasGeo)} | ${pct(tierArrays['4-10'], r => r.schemaHasGeo)} | ${pct(tierArrays['11-20'], r => r.schemaHasGeo)} | ${pct(tierArrays['21-30'], r => r.schemaHasGeo)} |\n`;
  md += `| Has opening hours | ${pct(tierArrays['1-3'], r => r.schemaHasOpeningHours)} | ${pct(tierArrays['4-10'], r => r.schemaHasOpeningHours)} | ${pct(tierArrays['11-20'], r => r.schemaHasOpeningHours)} | ${pct(tierArrays['21-30'], r => r.schemaHasOpeningHours)} |\n`;
  md += `| Has sameAs (social) | ${pct(tierArrays['1-3'], r => r.schemaHasSameAs)} | ${pct(tierArrays['4-10'], r => r.schemaHasSameAs)} | ${pct(tierArrays['11-20'], r => r.schemaHasSameAs)} | ${pct(tierArrays['21-30'], r => r.schemaHasSameAs)} |\n`;
  md += `| Has aggregateRating | ${pct(tierArrays['1-3'], r => r.schemaHasAggregateRating)} | ${pct(tierArrays['4-10'], r => r.schemaHasAggregateRating)} | ${pct(tierArrays['11-20'], r => r.schemaHasAggregateRating)} | ${pct(tierArrays['21-30'], r => r.schemaHasAggregateRating)} |\n`;
  md += `| Has FAQ schema | ${pct(tierArrays['1-3'], r => r.schemaHasFaq)} | ${pct(tierArrays['4-10'], r => r.schemaHasFaq)} | ${pct(tierArrays['11-20'], r => r.schemaHasFaq)} | ${pct(tierArrays['21-30'], r => r.schemaHasFaq)} |\n`;
  md += `| Avg visible word count | ${avg(tierArrays['1-3'], r => r.visibleWordCount)} | ${avg(tierArrays['4-10'], r => r.visibleWordCount)} | ${avg(tierArrays['11-20'], r => r.visibleWordCount)} | ${avg(tierArrays['21-30'], r => r.visibleWordCount)} |\n`;
  md += `\n`;

  // DF Cleaning baseline
  const dfResult = results.find((r) => r.url === DF_CLEANING_URL);
  if (dfResult) {
    md += `## 🔬 DF Cleaning Baseline (test case)\n\n`;
    md += `Recorded for before/after comparison. Do NOT optimize this page yet — measure first.\n\n`;
    md += `| Signal | Value |\n|---|---|\n`;
    md += `| URL | ${dfResult.url} |\n`;
    md += `| GSC position | ${fmtPos(dfResult.position)} |\n`;
    md += `| GSC impressions | ${fmt(dfResult.impressions)} |\n`;
    md += `| GSC clicks | ${dfResult.clicks} |\n`;
    md += `| GSC CTR | ${fmtPct(dfResult.ctr)} |\n`;
    md += `| Claimed | ${dfResult.claimed === null ? 'unknown' : dfResult.claimed ? 'YES' : 'NO'} |\n`;
    md += `| Description length | ${dfResult.descriptionLength} chars |\n`;
    md += `| Description templated | ${dfResult.descriptionIsTemplated ? 'YES (boilerplate)' : 'no'} |\n`;
    md += `| Service count | ${dfResult.serviceCount} |\n`;
    md += `| Photo count | ${dfResult.photoCount} |\n`;
    md += `| Review count | ${dfResult.reviewCount} |\n`;
    md += `| Rating | ${dfResult.rating !== null ? dfResult.rating.toFixed(1) : 'none'} |\n`;
    md += `| Verification badges | ${dfResult.verificationBadgeCount}/4 |\n`;
    md += `| Schema has geo | ${dfResult.schemaHasGeo ? 'yes' : 'no'} |\n`;
    md += `| Schema has opening hours | ${dfResult.schemaHasOpeningHours ? 'yes' : 'no'} |\n`;
    md += `| Schema has sameAs | ${dfResult.schemaHasSameAs ? 'yes' : 'no'} |\n`;
    md += `| Schema has aggregateRating | ${dfResult.schemaHasAggregateRating ? 'yes' : 'no'} |\n`;
    md += `| Schema has FAQ | ${dfResult.schemaHasFaq ? 'yes' : 'no'} |\n`;
    md += `| Visible word count | ${dfResult.visibleWordCount} |\n\n`;
  }

  // Methodology + limitations
  md += `## Methodology & Limitations\n\n`;
  md += `**Data sources:**\n`;
  md += `- GSC Pages.csv (ranking + impression data, top-1,000 truncated)\n`;
  md += `- Live fieseros.com page HTML (profile signals extracted via regex)\n\n`;
  md += `**Sample size:** ${results.length} pages total (top ${SAMPLE_SIZE} per tier + DF Cleaning). This is a SMALL sample — correlations are suggestive, not statistically significant. Treat findings as hypotheses to test, not conclusions.\n\n`;
  md += `**What this analysis CANNOT tell you:**\n`;
  md += `- Causation (does claiming improve ranking, or do higher-ranking businesses claim more?)\n`;
  md += `- The effect of external factors (backlinks, domain authority, query competition)\n`;
  md += `- Whether enriching a specific page will improve its ranking\n\n`;
  md += `**What this analysis CAN tell you:**\n`;
  md += `- Which profile signals are present in top-ranking pages but absent in lower-ranking ones\n`;
  md += `- Which signals to prioritize in the claim/onboarding flow\n`;
  md += `- A baseline for DF Cleaning so we can measure the effect of future enrichment\n\n`;
  md += `**Recommended next step:** After identifying a strong differentiator (e.g. "top pages have 5+ services, lower pages have 0"), run a controlled experiment: enrich 5-10 lower-ranking pages with that signal, wait 14-28 days, re-run this analysis, compare.\n\n`;

  writeFileSync(OUTPUT_PATH, md);
  console.log(`\n✅ Report written to: ${OUTPUT_PATH}`);
  console.log(`\n${md}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
