/**
 * extract-git-lastmod.ts
 *
 * Scans all static Next.js pages and extracts the actual Git commit date
 * (YYYY-MM-DD) for each route. Outputs `src/lib/seo/static-page-dates.json`
 * which is consumed by `sitemap-builder.ts`.
 *
 * Run manually or as part of sitemap generation:
 *   bun scripts/extract-git-lastmod.ts
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'lib', 'seo', 'static-page-dates.json');

// Map of route path to primary source file(s) that determine when the content was modified
const ROUTE_SOURCE_MAP: Record<string, string[]> = {
  '/': ['src/app/page.tsx', 'src/components/marketing/'],
  '/marketplace': ['src/app/marketplace/page.tsx', 'src/app/marketplace/marketplace-client.tsx'],
  '/features': ['src/app/features/page.tsx'],
  '/industries': ['src/app/industries/page.tsx'],
  '/field-service-software': ['src/app/field-service-software/page.tsx'],
  '/plumbing-software': ['src/app/plumbing-software/page.tsx'],
  '/hvac-software': ['src/app/hvac-software/page.tsx'],
  '/cleaning-business-software': ['src/app/cleaning-business-software/page.tsx'],
  '/electrical-contractor-software': ['src/app/electrical-contractor-software/page.tsx'],
  '/landscaping-software': ['src/app/landscaping-software/page.tsx'],
  '/lawn-care-software': ['src/app/lawn-care-software/page.tsx'],
  '/painting-software': ['src/app/painting-software/page.tsx'],
  '/handyman-software': ['src/app/handyman-software/page.tsx'],
  '/tree-care-software': ['src/app/tree-care-software/page.tsx'],
  '/snow-removal-software': ['src/app/snow-removal-software/page.tsx'],
  '/pest-control-software': ['src/app/pest-control-software/page.tsx'],
  '/roofing-software': ['src/app/roofing-software/page.tsx'],
  '/pool-service-software': ['src/app/pool-service-software/page.tsx'],
  '/window-cleaning-software': ['src/app/window-cleaning-software/page.tsx'],
  '/concrete-software': ['src/app/concrete-software/page.tsx'],
  '/garage-door-software': ['src/app/garage-door-software/page.tsx'],
  '/solar-software': ['src/app/solar-software/page.tsx'],
  '/pet-services-software': ['src/app/pet-services-software/page.tsx'],
  '/jobber-alternatives': ['src/app/jobber-alternatives/page.tsx'],
  '/housecall-pro-alternatives': ['src/app/housecall-pro-alternatives/page.tsx'],
  '/servicetitan-alternatives': ['src/app/servicetitan-alternatives/page.tsx'],
  '/best-field-service-software': ['src/app/best-field-service-software/page.tsx'],
  '/scheduling-and-dispatch': ['src/app/scheduling-and-dispatch/page.tsx'],
  '/invoicing-and-payments': ['src/app/invoicing-and-payments/page.tsx'],
  '/customer-crm': ['src/app/customer-crm/page.tsx'],
  '/technician-app': ['src/app/technician-app/page.tsx'],
  '/automations': ['src/app/automations/page.tsx'],
  '/services': ['src/app/services/page.tsx'],
  '/services/website-development': ['src/app/services/website-development/page.tsx'],
  '/services/seo': ['src/app/services/seo/page.tsx'],
  '/services/google-ads': ['src/app/services/google-ads/page.tsx'],
  '/services/get-a-quote': ['src/app/services/get-a-quote/page.tsx', 'src/app/services/get-a-quote/quote-form.tsx'],
  '/invoice-generator': ['src/app/invoice-generator/page.tsx', 'src/app/invoice-generator/invoice-generator-client.tsx'],
  '/blog': ['src/app/blog/page.tsx'],
  '/contact-us': ['src/app/contact-us/page.tsx'],
};

// Website development industry-specific pages
const WEB_DEV_INDUSTRIES = [
  'plumbing', 'hvac', 'electrical', 'cleaning-business', 'landscaping',
  'lawn-care', 'painting', 'handyman', 'tree-care', 'snow-removal',
  'pest-control', 'roofing', 'pool-service', 'window-cleaning',
  'concrete', 'garage-door', 'solar', 'pet-services',
];

for (const ind of WEB_DEV_INDUSTRIES) {
  ROUTE_SOURCE_MAP[`/services/website-development/${ind}`] = [
    'src/app/services/website-development/[industry]/page.tsx',
    'src/lib/services/industry-data.ts',
  ];
}

/**
 * Get the latest Git commit date (YYYY-MM-DD) for a list of file paths.
 */
function getGitLastMod(filePaths: string[]): string | null {
  for (const relPath of filePaths) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue;

    try {
      const out = execSync(`git log -1 --format="%as" -- "${relPath}"`, {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim();

      if (out && /^\d{4}-\d{2}-\d{2}$/.test(out)) {
        return out;
      }
    } catch {
      // Git command failed, try next path
    }
  }

  // Fallback to file system mtime if git is unavailable
  for (const relPath of filePaths) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (fs.existsSync(fullPath)) {
      try {
        const stats = fs.statSync(fullPath);
        return stats.mtime.toISOString().slice(0, 10);
      } catch {}
    }
  }

  return null;
}

export function extractAllStaticDates(): Record<string, string> {
  console.log('🔍 Extracting Git commit dates for static routes...');
  const result: Record<string, string> = {};
  const defaultFallback = '2026-08-20';

  for (const [route, sourceFiles] of Object.entries(ROUTE_SOURCE_MAP)) {
    const gitDate = getGitLastMod(sourceFiles);
    result[route] = gitDate || defaultFallback;
  }

  // Ensure output directory exists
  const outDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2), 'utf8');
  console.log(`✅ Saved ${Object.keys(result).length} route dates to ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
  return result;
}

// Execute if run directly
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.includes('extract-git-lastmod'))) {
  extractAllStaticDates();
}
