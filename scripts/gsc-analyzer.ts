/**
 * GSC Opportunity Analyzer
 * =========================
 *
 * Reads a Google Search Console ZIP export and produces a prioritized
 * "Top SEO Opportunities" report.
 *
 * USAGE:
 *   bun run scripts/gsc-analyzer.ts [path-to-zip]
 *
 * Default path: /home/z/my-project/upload/gsc-export.zip
 *
 * OUTPUT:
 *   /home/z/my-project/gsc-opportunity-report.md (also printed to console)
 *
 * WHAT IT ANALYZES:
 *   1. Page opportunities bucketed by position tier (4-10, 11-20, 21-50, 51+)
 *   2. Query opportunities (high impressions + low position → page-1 push)
 *   3. High-impression + low-CTR queries (title/meta rewrite candidates)
 *   4. Country × device breakdown (where traffic comes from)
 *   5. Business pages with impressions but ZERO clicks
 *   6. SEO Opportunity Score per page (impressions × ranking potential × CTR gap × business value)
 *   7. URL classification (marketplace business / city page / industry page / software / blog / other)
 *
 * GSC ZIP STRUCTURE (standard web export):
 *   - Queries.csv  — Top queries, Clicks, Impressions, CTR, Position
 *   - Pages.csv    — Top pages, Clicks, Impressions, CTR, Position
 *   - Countries.csv — Country, Clicks, Impressions, CTR, Position
 *   - Devices.csv   — Device, Clicks, Impressions, CTR, Position
 *
 * LIMITATIONS:
 *   - GSC ZIP exports are AGGREGATE (no query→page mapping). Cannibalization
 *     detection (multiple URLs ranking for the same query) requires the
 *     Search Analytics API with query+page dimensions — NOT available in ZIP.
 *   - The report notes this and recommends the API approach if needed.
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────

const ZIP_PATH = process.argv[2] || '/home/z/my-project/upload/gsc-export.zip';
const OUTPUT_PATH = '/home/z/my-project/gsc-opportunity-report.md';
const TMP_DIR = '/tmp/gsc-extract';

// ─── Types ──────────────────────────────────────────────────────────────────

interface GscRow {
  key: string;       // query, URL, country, or device
  clicks: number;
  impressions: number;
  ctr: number;       // 0-1 (e.g. 0.025 = 2.5%)
  position: number;  // 1-100
}

interface UrlClassification {
  type:
    | 'marketplace-business'  // /hvac/city/slug
    | 'marketplace-city'       // /hvac/city
    | 'marketplace-industry'   // /hvac or /hvac-contractors
    | 'software'               // /hvac-software
    | 'blog'                   // /blog/slug
    | 'home'                   // /
    | 'other';
  industry?: string;
  city?: string;
  businessValue: number; // 0-1 — marketplace business pages = 1.0, blog = 0.5, software = 0.3
}

// ─── CSV parser (handles quoted fields with commas) ──────────────────────────

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  fields.push(current);
  return fields.map((f) => f.trim());
}

function parseCsv(content: string): GscRow[] {
  const lines = content.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Detect header — GSC exports sometimes have a 2-line header
  // (filter description + column names) or a 1-line header.
  // Find the first line that contains "Clicks" or "clicks".
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

  // Map header columns to indices. GSC columns vary slightly by export.
  // Header names seen in real exports: "Top queries", "Top pages",
  // "Page URL", "Country", "Device", "Clicks", "Impressions", "CTR", "Position".
  // Use substring matches so both singular + plural forms are handled
  // (e.g. "quer" matches both "query" and "queries"; "impression" matches
  // "Impressions").
  const colMap = {
    key: header.findIndex((h) =>
      h.includes('quer') || h.includes('page') || h.includes('url') ||
      h.includes('countr') || h.includes('device')),
    clicks: header.findIndex((h) => h.includes('click')),
    impressions: header.findIndex((h) => h.includes('impression')),
    ctr: header.findIndex((h) => h === 'ctr' || h.includes('ctr')),
    position: header.findIndex((h) => h.includes('position')),
  };

  if (colMap.key === -1) {
    // No recognizable key column — skip this file
    return [];
  }

  const rows: GscRow[] = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    if (fields.length < 4) continue;

    const key = fields[colMap.key] || '';
    const clicks = parseInt(fields[colMap.clicks] || '0', 10) || 0;
    const impressions = parseInt(fields[colMap.impressions] || '0', 10) || 0;
    const ctrStr = (fields[colMap.ctr] || '0').replace('%', '').trim();
    // GSC exports CTR as a percentage string like "4.44%" → parse + divide by 100
    const ctr = parseFloat(ctrStr) / 100 || 0;
    const position = parseFloat(fields[colMap.position] || '0') || 0;

    if (!key || impressions === 0) continue;
    rows.push({ key, clicks, impressions, ctr, position });
  }

  return rows;
}

// ─── URL classifier ──────────────────────────────────────────────────────────

const KNOWN_INDUSTRY_SLUGS = [
  'hvac', 'plumbers', 'electricians', 'cleaners', 'pest-control', 'landscapers',
  'roofers', 'painters', 'handymen', 'lawn-care', 'snow-removal', 'solar',
  'tree-care', 'pool-spa', 'garage-door', 'concrete', 'pet-services',
  'window-cleaning', 'window-cleaners', 'floorings', 'flooring-contractors',
  'handymen', 'appliance-repairs', 'electrician', // singular fallback
  'cleaning', // singular fallback
];

const INDUSTRY_CONTRACTORS_SUFFIXES = [
  'hvac-contractors', 'plumbing-contractors', 'electrical-contractors',
  'cleaning-contractors', 'pest-control-contractors', 'landscaping-contractors',
  'roofing-contractors', 'painting-contractors', 'handyman-contractors',
  'lawn-care-contractors', 'snow-removal-contractors', 'solar-contractors',
  'tree-care-contractors', 'pool-spa-contractors', 'garage-door-contractors',
  'concrete-contractors', 'pet-services-contractors', 'window-cleaning-contractors',
];

function classifyUrl(url: string): UrlClassification {
  // Strip protocol + domain, keep path
  let path = url;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://example.com${url}`);
    path = u.pathname;
  } catch {
    path = url.startsWith('/') ? url : `/${url}`;
  }

  const segments = path.split('/').filter(Boolean);

  // Home page
  if (segments.length === 0) {
    return { type: 'home', businessValue: 0.3 };
  }

  // Blog post
  if (segments[0] === 'blog' && segments.length >= 2) {
    return { type: 'blog', businessValue: 0.5 };
  }

  // Software page: /{industry}-software
  if (segments.length === 1 && segments[0].endsWith('-software')) {
    return { type: 'software', industry: segments[0].replace('-software', ''), businessValue: 0.3 };
  }

  // Industry contractors page: /{industry}-contractors
  if (segments.length === 1 && INDUSTRY_CONTRACTORS_SUFFIXES.includes(segments[0])) {
    const industry = segments[0].replace('-contractors', '');
    return { type: 'marketplace-industry', industry, businessValue: 0.7 };
  }

  // Industry browse page: /{industry-plural} (e.g. /hvac, /plumbers)
  if (segments.length === 1 && KNOWN_INDUSTRY_SLUGS.includes(segments[0])) {
    return { type: 'marketplace-industry', industry: segments[0], businessValue: 0.7 };
  }

  // Service × City landing page: /{industry}/{city}
  if (segments.length === 2 && KNOWN_INDUSTRY_SLUGS.includes(segments[0])) {
    return { type: 'marketplace-city', industry: segments[0], city: segments[1], businessValue: 0.8 };
  }

  // Business profile page: /{industry}/{city}/{slug}
  if (segments.length >= 3 && KNOWN_INDUSTRY_SLUGS.includes(segments[0])) {
    return { type: 'marketplace-business', industry: segments[0], city: segments[1], businessValue: 1.0 };
  }

  return { type: 'other', businessValue: 0.2 };
}

// ─── SEO Opportunity Score ───────────────────────────────────────────────────
//
// Formula:  opportunity = impressions × rankingPotential × ctrGap × businessValue
//
// rankingPotential: 1.0 at position 1-3, 0.8 at 4-10, 0.5 at 11-20, 0.2 at 21-50, 0.05 at 51+
//   → rewards pages already close to page 1 (easy wins) over deep pages
//
// ctrGap: expected CTR at position 1 (32%) minus current CTR, clamped to [0, 0.32]
//   → rewards pages with a big CTR improvement opportunity
//
// businessValue: per-URL-type weight (marketplace-business = 1.0, city = 0.8, etc.)
//   → rewards pages that convert to customers over informational pages

function computeOpportunityScore(row: GscRow, classification: UrlClassification): number {
  // Ranking potential — how close the page is to a valuable position
  let rankingPotential: number;
  if (row.position <= 3) rankingPotential = 1.0;
  else if (row.position <= 10) rankingPotential = 0.8;
  else if (row.position <= 20) rankingPotential = 0.5;
  else if (row.position <= 50) rankingPotential = 0.2;
  else rankingPotential = 0.05;

  // CTR gap — expected CTR at position 1 is ~32% (industry benchmark)
  const expectedCtrAtP1 = 0.32;
  const ctrGap = Math.max(0, expectedCtrAtP1 - row.ctr);

  // Final score
  return row.impressions * rankingPotential * ctrGap * classification.businessValue;
}

function opportunityTier(score: number): '🔥 Very High' | '🔥 High' | '🟠 Medium' | '⚪ Low' {
  // Tiers are relative — computed after we see the score distribution.
  // These thresholds are tuned for a marketplace with ~60K monthly impressions.
  if (score >= 100) return '🔥 Very High';
  if (score >= 20) return '🔥 High';
  if (score >= 5) return '🟠 Medium';
  return '⚪ Low';
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(ZIP_PATH)) {
    console.error(`\n❌ GSC ZIP file not found at: ${ZIP_PATH}`);
    console.error(`\nTo run the analyzer:`);
    console.error(`  1. Upload your GSC export ZIP to: ${ZIP_PATH}`);
    console.error(`     (or pass a different path as the first argument)`);
    console.error(`  2. Re-run: bun run scripts/gsc-analyzer.ts`);
    console.error(`\nGSC exports are downloaded from:`);
    console.error(`  Google Search Console → Performance → Export → Download ZIP`);
    process.exit(1);
  }

  console.log(`📂 Reading GSC export: ${ZIP_PATH}`);

  // Clean + create temp dir
  rmSync(TMP_DIR, { recursive: true, force: true });
  mkdirSync(TMP_DIR, { recursive: true });

  // Extract ZIP
  try {
    execSync(`unzip -o "${ZIP_PATH}" -d "${TMP_DIR}"`, { stdio: 'pipe' });
  } catch (err) {
    console.error(`❌ Failed to unzip: ${err}`);
    process.exit(1);
  }

  // Find CSV files (GSC ZIPs contain various CSVs — detect by filename)
  const findCsv = (namePattern: string): string | null => {
    try {
      const result = execSync(`find ${TMP_DIR} -iname "${namePattern}" -type f`, { encoding: 'utf-8' });
      const files = result.trim().split('\n').filter(Boolean);
      return files[0] || null;
    } catch {
      return null;
    }
  };

  const queriesCsvPath = findCsv('*quer*') || findCsv('*Queries*');
  const pagesCsvPath = findCsv('*page*') || findCsv('*Pages*');
  const countriesCsvPath = findCsv('*countr*') || findCsv('*Countries*');
  const devicesCsvPath = findCsv('*device*') || findCsv('*Devices*');

  console.log(`   Queries CSV:   ${queriesCsvPath || '(not found)'}`);
  console.log(`   Pages CSV:     ${pagesCsvPath || '(not found)'}`);
  console.log(`   Countries CSV: ${countriesCsvPath || '(not found)'}`);
  console.log(`   Devices CSV:    ${devicesCsvPath || '(not found)'}`);

  const queries = queriesCsvPath ? parseCsv(readFileSync(queriesCsvPath, 'utf-8')) : [];
  const pages = pagesCsvPath ? parseCsv(readFileSync(pagesCsvPath, 'utf-8')) : [];
  const countries = countriesCsvPath ? parseCsv(readFileSync(countriesCsvPath, 'utf-8')) : [];
  const devices = devicesCsvPath ? parseCsv(readFileSync(devicesCsvPath, 'utf-8')) : [];

  console.log(`\n📊 Parsed: ${queries.length} queries, ${pages.length} pages, ${countries.length} countries, ${devices.length} devices`);

  if (pages.length === 0 && queries.length === 0) {
    console.error(`\n❌ No query or page data found in the ZIP. Check the CSV format.`);
    process.exit(1);
  }

  // ─── Compute aggregates ─────────────────────────────────────────────────────
  //
  // GSC ZIP exports contain TWO classes of CSV:
  //   1. TRUNCATED dimensions (Pages.csv, Queries.csv) — capped at 1,000 rows.
  //      These represent only the TOP 1,000 pages/queries by impressions.
  //      Their totals UNDERCOUNT the true site-wide numbers.
  //   2. FULL dimensions (Countries.csv, Devices.csv) — NOT truncated (only
  //      ~143 countries + 3 devices exist). Their totals represent the
  //      TRUE site-wide impressions/clicks.
  //
  // Phase 0 fix (per review): use the FULL-dimension total as the headline
  // number, and clearly label the truncated dimensions as top-1,000 subsets.
  // Do NOT sum Pages + Queries + Countries + Devices — they are independently
  // aggregated GSC dimensions and would double-count.

  const truncatedTotalImpressions = pages.reduce((s, r) => s + r.impressions, 0);
  const truncatedTotalClicks = pages.reduce((s, r) => s + r.clicks, 0);
  const fullTotalImpressions = countries.reduce((s, r) => s + r.impressions, 0)
    || devices.reduce((s, r) => s + r.impressions, 0)
    || truncatedTotalImpressions; // fallback if Countries/Devices missing
  const fullTotalClicks = countries.reduce((s, r) => s + r.clicks, 0)
    || devices.reduce((s, r) => s + r.clicks, 0)
    || truncatedTotalClicks;

  // Headline metrics use the FULL total (more accurate).
  const totalImpressions = fullTotalImpressions;
  const totalClicks = fullTotalClicks;
  const avgCtr = totalImpressions > 0 ? totalClicks / totalImpressions : 0;

  // Weighted average position — computed from the truncated Pages dimension
  // (the only dimension that has per-URL position data). Labelled as such in
  // the report. This is a known limitation: the true site-wide avg position
  // would require the Search Analytics API, not available in ZIP exports.
  const weightedAvgPosition =
    pages.length > 0
      ? pages.reduce((s, r) => s + r.position * r.impressions, 0) / truncatedTotalImpressions
      : queries.length > 0
        ? queries.reduce((s, r) => s + r.position * r.impressions, 0) / (queries.reduce((s, r) => s + r.impressions, 0))
        : 0;

  // ─── Page analysis: classify URLs + compute opportunity scores ───────────────

  const pageAnalysis = pages.map((row) => {
    const classification = classifyUrl(row.key);
    const score = computeOpportunityScore(row, classification);
    return { ...row, classification, score, tier: opportunityTier(score) };
  });

  // Sort by opportunity score descending
  const sortedByOpportunity = [...pageAnalysis].sort((a, b) => b.score - a.score);

  // ─── Bucket pages by position tier ──────────────────────────────────────────

  const tierP1to3 = pageAnalysis.filter((p) => p.position >= 1 && p.position <= 3);
  const tierP4to10 = pageAnalysis.filter((p) => p.position > 3 && p.position <= 10);
  const tierP11to20 = pageAnalysis.filter((p) => p.position > 10 && p.position <= 20);
  const tierP21to50 = pageAnalysis.filter((p) => p.position > 20 && p.position <= 50);
  const tierP51plus = pageAnalysis.filter((p) => p.position > 50);

  // ─── High-impression + low-CTR queries (title/meta rewrite candidates) ──────

  const lowCtrQueries = queries
    .filter((q) => q.impressions >= 100 && q.ctr < 0.01) // ≥100 impressions, <1% CTR
    .sort((a, b) => b.impressions - a.impressions);

  // ─── Queries close to page 1 (position 4-15) ────────────────────────────────

  const queriesNearPage1 = queries
    .filter((q) => q.position >= 4 && q.position <= 15 && q.impressions >= 50)
    .sort((a, b) => a.position - b.position);

  // ─── Business pages with impressions but ZERO clicks ────────────────────────

  const zeroClickBusinessPages = pageAnalysis
    .filter((p) => p.classification.type === 'marketplace-business' && p.clicks === 0 && p.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions);

  // ─── Country × device breakdown ─────────────────────────────────────────────

  const sortedCountries = [...countries].sort((a, b) => b.impressions - a.impressions);
  const sortedDevices = [...devices].sort((a, b) => b.impressions - a.impressions);

  // ─── URL type distribution ──────────────────────────────────────────────────

  const typeDistribution: Record<string, { count: number; impressions: number; clicks: number; avgPosition: number }> = {};
  for (const p of pageAnalysis) {
    const t = p.classification.type;
    if (!typeDistribution[t]) typeDistribution[t] = { count: 0, impressions: 0, clicks: 0, avgPosition: 0 };
    typeDistribution[t].count++;
    typeDistribution[t].impressions += p.impressions;
    typeDistribution[t].clicks += p.clicks;
  }
  // Compute weighted avg position per type
  for (const t of Object.keys(typeDistribution)) {
    const pagesOfType = pageAnalysis.filter((p) => p.classification.type === t);
    const totalImp = pagesOfType.reduce((s, p) => s + p.impressions, 0);
    typeDistribution[t].avgPosition = totalImp > 0
      ? pagesOfType.reduce((s, p) => s + p.position * p.impressions, 0) / totalImp
      : 0;
  }

  // ─── Industry × City opportunities (from marketplace URLs) ──────────────────

  const industryCityOpportunities: Record<string, { impressions: number; clicks: number; avgPosition: number; count: number }> = {};
  for (const p of pageAnalysis) {
    if (p.classification.type === 'marketplace-business' && p.classification.industry && p.classification.city) {
      const key = `${p.classification.industry}/${p.classification.city}`;
      if (!industryCityOpportunities[key]) industryCityOpportunities[key] = { impressions: 0, clicks: 0, avgPosition: 0, count: 0 };
      industryCityOpportunities[key].impressions += p.impressions;
      industryCityOpportunities[key].clicks += p.clicks;
      industryCityOpportunities[key].count++;
    }
  }
  for (const k of Object.keys(industryCityOpportunities)) {
    const pages = pageAnalysis.filter((p) =>
      p.classification.type === 'marketplace-business' &&
      `${p.classification.industry}/${p.classification.city}` === k
    );
    const totalImp = industryCityOpportunities[k].impressions;
    industryCityOpportunities[k].avgPosition = totalImp > 0
      ? pages.reduce((s, p) => s + p.position * p.impressions, 0) / totalImp
      : 0;
  }
  const sortedIndustryCity = Object.entries(industryCityOpportunities)
    .sort(([, a], [, b]) => b.impressions - a.impressions)
    .slice(0, 20);

  // ─── Build markdown report ──────────────────────────────────────────────────

  let md = '';
  const fmt = (n: number) => n.toLocaleString('en-US');
  const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;
  const fmtPos = (n: number) => n.toFixed(1);

  md += `# GSC SEO Opportunity Report\n\n`;
  md += `**Generated:** ${new Date().toISOString()}\n`;
  md += `**Source:** ${ZIP_PATH}\n\n`;
  md += `---\n\n`;

  // Executive summary
  md += `## Executive Summary\n\n`;
  md += `> **⚠️ Data scope note:** GSC ZIP exports contain TWO classes of CSV.\n`;
  md += `> Countries.csv and Devices.csv are **full exports** (not truncated) — their totals represent the true site-wide metrics.\n`;
  md += `> Pages.csv and Queries.csv are **truncated to the top 1,000 rows** — their totals undercount the true numbers.\n`;
  md += `> Do NOT sum Pages + Queries + Countries + Devices — they are independently aggregated GSC dimensions and would double-count.\n\n`;
  md += `| Metric | Value | Source |\n|---|---|---|\n`;
  md += `| Total Impressions (full export) | ${fmt(fullTotalImpressions)} | Countries/Devices CSV (not truncated) |\n`;
  md += `| Total Clicks (full export) | ${fmt(fullTotalClicks)} | Countries/Devices CSV (not truncated) |\n`;
  md += `| Average CTR (full export) | ${fmtPct(avgCtr)} | Clicks ÷ Impressions (full) |\n`;
  md += `| Weighted Avg Position (top-1,000 pages) | ${fmtPos(weightedAvgPosition)} | Pages CSV (truncated) — per-URL position data only exists in this dimension |\n`;
  md += `| Top-1,000 Pages — Impressions | ${fmt(truncatedTotalImpressions)} | Pages CSV (truncated subset) |\n`;
  md += `| Top-1,000 Pages — Clicks | ${fmt(truncatedTotalClicks)} | Pages CSV (truncated subset) |\n`;
  md += `| Queries Analyzed (top-1,000) | ${fmt(queries.length)} | Queries CSV (truncated subset) |\n`;
  md += `| Pages Analyzed (top-1,000) | ${fmt(pages.length)} | Pages CSV (truncated subset) |\n\n`;
  md += `**How to read this:** The headline totals (${fmt(fullTotalImpressions)} impressions, ${fmt(fullTotalClicks)} clicks) come from the full Country/Device exports and represent the true site-wide metrics. All per-page and per-query analyses below come from the truncated top-1,000 subsets, so they cover only the highest-impression URLs/queries — the long tail is not included.\n\n`;

  // URL type distribution
  md += `## URL Type Distribution\n\n`;
  md += `Shows where your impressions come from (marketplace vs. software vs. blog):\n\n`;
  md += `| Type | Pages | Impressions | Clicks | Avg Position | CTR |\n|---|---:|---:|---:|---:|---:|\n`;
  for (const [type, data] of Object.entries(typeDistribution).sort(([, a], [, b]) => b.impressions - a.impressions)) {
    const ctr = data.impressions > 0 ? data.clicks / data.impressions : 0;
    md += `| ${type} | ${fmt(data.count)} | ${fmt(data.impressions)} | ${fmt(data.clicks)} | ${fmtPos(data.avgPosition)} | ${fmtPct(ctr)} |\n`;
  }
  md += `\n`;

  // Top 50 pages by Opportunity Score
  md += `## 🎯 Top 50 SEO Opportunities (by Opportunity Score)\n\n`;
  md += `**Formula:** \`impressions × rankingPotential × ctrGap × businessValue\`\n\n`;
  md += `| # | Opportunity | URL | Type | Pos | Impressions | CTR | Clicks |\n|---|---|---|---|---:|---:|---:|---:|---:|\n`;
  sortedByOpportunity.slice(0, 50).forEach((p, i) => {
    const url = p.key.length > 60 ? '...' + p.key.slice(-57) : p.key;
    md += `| ${i + 1} | ${p.tier} | ${url} | ${p.classification.type} | ${fmtPos(p.position)} | ${fmt(p.impressions)} | ${fmtPct(p.ctr)} | ${fmt(p.clicks)} |\n`;
  });
  md += `\n`;

  // Position tier breakdown — the user's main ask
  md += `## 📈 Page Opportunities by Position Tier\n\n`;

  md += `### 🔴 Priority 1: Pages at Position 4–10 (highest CTR opportunity)\n\n`;
  md += `These pages are on page 1 but below the top 3. Small CTR improvements = big traffic gains. Optimize titles + meta descriptions.\n\n`;
  if (tierP4to10.length === 0) {
    md += `_(no pages in this tier)_\n\n`;
  } else {
    md += `| URL | Type | Pos | Impressions | CTR | Clicks | Opportunity |\n|---|---|---:|---:|---:|---:|---|\n`;
    tierP4to10.sort((a, b) => b.impressions - a.impressions).slice(0, 30).forEach((p) => {
      const url = p.key.length > 70 ? '...' + p.key.slice(-67) : p.key;
      md += `| ${url} | ${p.classification.type} | ${fmtPos(p.position)} | ${fmt(p.impressions)} | ${fmtPct(p.ctr)} | ${fmt(p.clicks)} | ${p.tier} |\n`;
    });
    md += `\n`;
  }

  md += `### 🟠 Priority 2: Pages at Position 11–20 (strongest page-1 push)\n\n`;
  md += `These are on page 2. Push them to page 1 via internal links, content enrichment, or schema improvements.\n\n`;
  if (tierP11to20.length === 0) {
    md += `_(no pages in this tier)_\n\n`;
  } else {
    md += `| URL | Type | Pos | Impressions | CTR | Clicks |\n|---|---|---:|---:|---:|---:|\n`;
    tierP11to20.sort((a, b) => b.impressions - a.impressions).slice(0, 30).forEach((p) => {
      const url = p.key.length > 70 ? '...' + p.key.slice(-67) : p.key;
      md += `| ${url} | ${p.classification.type} | ${fmtPos(p.position)} | ${fmt(p.impressions)} | ${fmtPct(p.ctr)} | ${fmt(p.clicks)} |\n`;
    });
    md += `\n`;
  }

  md += `### 🟡 Priority 3: Pages at Position 21–50 (content/internal-link opportunities)\n\n`;
  md += `On page 3-5. Need substantial work (content depth, internal links, fresh backlinks) to reach page 1.\n\n`;
  if (tierP21to50.length === 0) {
    md += `_(no pages in this tier)_\n\n`;
  } else {
    md += `| URL | Type | Pos | Impressions | CTR | Clicks |\n|---|---|---:|---:|---:|---:|\n`;
    tierP21to50.sort((a, b) => b.impressions - a.impressions).slice(0, 20).forEach((p) => {
      const url = p.key.length > 70 ? '...' + p.key.slice(-67) : p.key;
      md += `| ${url} | ${p.classification.type} | ${fmtPos(p.position)} | ${fmt(p.impressions)} | ${fmtPct(p.ctr)} | ${fmt(p.clicks)} |\n`;
    });
    md += `\n`;
  }

  md += `### ⚪ Position 1–3 (already winning — protect these)\n\n`;
  md += `These pages are already winning. **Do not change their titles/canonical/H1/content.** Monitor for position drops.\n\n`;
  if (tierP1to3.length === 0) {
    md += `_(no pages in this tier)_\n\n`;
  } else {
    md += `| URL | Type | Pos | Impressions | CTR | Clicks |\n|---|---|---:|---:|---:|---:|\n`;
    tierP1to3.sort((a, b) => b.impressions - a.impressions).forEach((p) => {
      const url = p.key.length > 70 ? '...' + p.key.slice(-67) : p.key;
      md += `| ${url} | ${p.classification.type} | ${fmtPos(p.position)} | ${fmt(p.impressions)} | ${fmtPct(p.ctr)} | ${fmt(p.clicks)} |\n`;
    });
    md += `\n`;
  }

  // High-impression + low-CTR queries
  md += `## 📝 High-Impression + Low-CTR Queries (title/meta rewrite candidates)\n\n`;
  md += `These queries get ≥100 impressions but <1% CTR. The page ranks, but searchers aren't clicking. Rewrite titles + meta descriptions.\n\n`;
  if (lowCtrQueries.length === 0) {
    md += `_(no queries match this filter)_\n\n`;
  } else {
    md += `| Query | Impressions | CTR | Position | Clicks |\n|---|---:|---:|---:|---:|\n`;
    lowCtrQueries.slice(0, 30).forEach((q) => {
      const query = q.key.length > 60 ? q.key.slice(0, 57) + '...' : q.key;
      md += `| ${query} | ${fmt(q.impressions)} | ${fmtPct(q.ctr)} | ${fmtPos(q.position)} | ${fmt(q.clicks)} |\n`;
    });
    md += `\n`;
  }

  // Queries near page 1
  md += `## 🎯 Queries Near Page 1 (position 4–15, ≥50 impressions)\n\n`;
  md += `These queries are close to page 1. Small ranking improvements = traffic gains. Identify which URL ranks for each, then optimize that URL.\n\n`;
  if (queriesNearPage1.length === 0) {
    md += `_(no queries match this filter)_\n\n`;
  } else {
    md += `| Query | Position | Impressions | CTR | Clicks |\n|---|---:|---:|---:|---:|\n`;
    queriesNearPage1.slice(0, 30).forEach((q) => {
      const query = q.key.length > 60 ? q.key.slice(0, 57) + '...' : q.key;
      md += `| ${query} | ${fmtPos(q.position)} | ${fmt(q.impressions)} | ${fmtPct(q.ctr)} | ${fmt(q.clicks)} |\n`;
    });
    md += `\n`;
  }

  // Business pages with impressions but zero clicks
  md += `## 🚨 Business Pages with Impressions but ZERO Clicks\n\n`;
  md += `These marketplace business pages get impressions but no clicks. Possible causes: generic title, low position, or irrelevant query match.\n\n`;
  if (zeroClickBusinessPages.length === 0) {
    md += `_(no business pages match this filter)_\n\n`;
  } else {
    md += `| URL | Position | Impressions |\n|---|---:|---:|\n`;
    zeroClickBusinessPages.slice(0, 30).forEach((p) => {
      const url = p.key.length > 70 ? '...' + p.key.slice(-67) : p.key;
      md += `| ${url} | ${fmtPos(p.position)} | ${fmt(p.impressions)} |\n`;
    });
    md += `\n`;
  }

  // Industry × City opportunities
  md += `## 🌍 Top Industry × City Opportunities (marketplace businesses)\n\n`;
  md += `Where marketplace business pages are getting the most impressions. Expand these markets first.\n\n`;
  if (sortedIndustryCity.length === 0) {
    md += `_(no marketplace business pages with impressions)_\n\n`;
  } else {
    md += `| Industry/City | Businesses | Impressions | Clicks | Avg Position | CTR |\n|---|---:|---:|---:|---:|---:|\n`;
    sortedIndustryCity.forEach(([key, data]) => {
      const ctr = data.impressions > 0 ? data.clicks / data.impressions : 0;
      md += `| ${key} | ${fmt(data.count)} | ${fmt(data.impressions)} | ${fmt(data.clicks)} | ${fmtPos(data.avgPosition)} | ${fmtPct(ctr)} |\n`;
    });
    md += `\n`;
  }

  // Country breakdown
  if (sortedCountries.length > 0) {
    md += `## 🌎 Country Breakdown\n\n`;
    md += `| Country | Impressions | Clicks | CTR | Avg Position |\n|---|---:|---:|---:|---:|\n`;
    sortedCountries.forEach((c) => {
      md += `| ${c.key} | ${fmt(c.impressions)} | ${fmt(c.clicks)} | ${fmtPct(c.ctr)} | ${fmtPos(c.position)} |\n`;
    });
    md += `\n`;
  }

  // Device breakdown
  if (sortedDevices.length > 0) {
    md += `## 📱 Device Breakdown\n\n`;
    md += `Mobile vs. desktop performance. Big position gap = investigate Core Web Vitals on the worse device.\n\n`;
    md += `| Device | Impressions | Clicks | CTR | Avg Position |\n|---|---:|---:|---:|---:|\n`;
    sortedDevices.forEach((d) => {
      md += `| ${d.key} | ${fmt(d.impressions)} | ${fmt(d.clicks)} | ${fmtPct(d.ctr)} | ${fmtPos(d.position)} |\n`;
    });
    md += `\n`;
  }

  // Limitations + next steps
  md += `## ⚠️ Limitations & Next Steps\n\n`;
  md += `### Cannibalization detection (NOT possible from ZIP)\n`;
  md += `GSC ZIP exports are aggregate (queries and pages are separate CSVs). To detect cannibalization (multiple URLs ranking for the same query), use the Search Analytics API with \`dimensions=['query','page']\`.\n\n`;
  md += `### Recommended next steps\n`;
  md += `1. **Priority 1 (this week):** Optimize titles + meta descriptions for the top 10 pages at position 4-10. This is the highest-ROI quick win.\n`;
  md += `2. **Priority 2 (next 2 weeks):** For the top 10 pages at position 11-20, add internal links from related pages + enrich content. Goal: push to page 1.\n`;
  md += `3. **Priority 3 (this month):** For the top 5 industry/city combos above, claim + enrich the businesses to graduate them from Tier C → Tier A/B.\n`;
  md += `4. **Investigate:** Pick ONE page at position 1-3 (a "winner") and ONE page at position 20-30. Compare their profile-tier, claim status, review count, photo count, description length. That's the Sparkex differentiator analysis (Phase B from our plan).\n`;
  md += `5. **Monitor:** After any change, wait 14-28 days and re-export GSC to compare. Don't make decisions on daily fluctuations.\n\n`;
  md += `---\n\n`;
  md += `_Report generated by scripts/gsc-analyzer.ts_\n`;

  // Write report
  writeFileSync(OUTPUT_PATH, md);
  console.log(`\n✅ Report written to: ${OUTPUT_PATH}`);
  console.log(`\n${md}`);

  // Cleanup
  rmSync(TMP_DIR, { recursive: true, force: true });
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
