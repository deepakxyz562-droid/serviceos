import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT_DIR, 'src', 'lib', 'seo', 'static-page-dates.json');

/**
 * Static route to source file mapping in src/app/
 */
export const STATIC_ROUTE_FILE_MAP: Record<string, string> = {
  // Core & Hubs
  '': 'src/app/page.tsx',
  '/marketplace': 'src/app/marketplace/(browse)/page.tsx',
  '/features': 'src/app/features/page.tsx',
  '/industries': 'src/app/industries/page.tsx',

  // Industry Landing Pages
  '/field-service-software': 'src/app/field-service-software/page.tsx',
  '/plumbing-software': 'src/app/plumbing-software/page.tsx',
  '/hvac-software': 'src/app/hvac-software/page.tsx',
  '/cleaning-business-software': 'src/app/cleaning-business-software/page.tsx',
  '/electrical-contractor-software': 'src/app/electrical-contractor-software/page.tsx',
  '/landscaping-software': 'src/app/landscaping-software/page.tsx',
  '/lawn-care-software': 'src/app/lawn-care-software/page.tsx',
  '/painting-software': 'src/app/painting-software/page.tsx',
  '/handyman-software': 'src/app/handyman-software/page.tsx',
  '/tree-care-software': 'src/app/tree-care-software/page.tsx',
  '/snow-removal-software': 'src/app/snow-removal-software/page.tsx',
  '/pest-control-software': 'src/app/pest-control-software/page.tsx',
  '/roofing-software': 'src/app/roofing-software/page.tsx',
  '/pool-service-software': 'src/app/pool-service-software/page.tsx',
  '/window-cleaning-software': 'src/app/window-cleaning-software/page.tsx',
  '/concrete-software': 'src/app/concrete-software/page.tsx',
  '/garage-door-software': 'src/app/garage-door-software/page.tsx',
  '/solar-software': 'src/app/solar-software/page.tsx',
  '/pet-services-software': 'src/app/pet-services-software/page.tsx',

  // Comparison Pages
  '/jobber-alternatives': 'src/app/jobber-alternatives/page.tsx',
  '/housecall-pro-alternatives': 'src/app/housecall-pro-alternatives/page.tsx',
  '/servicetitan-alternatives': 'src/app/servicetitan-alternatives/page.tsx',
  '/best-field-service-software': 'src/app/best-field-service-software/page.tsx',

  // Feature Pages
  '/scheduling-and-dispatch': 'src/app/scheduling-and-dispatch/page.tsx',
  '/invoicing-and-payments': 'src/app/invoicing-and-payments/page.tsx',
  '/customer-crm': 'src/app/customer-crm/page.tsx',
  '/technician-app': 'src/app/technician-app/page.tsx',
  '/automations': 'src/app/automations/page.tsx',

  // Services Hub & Service Pages
  '/services': 'src/app/services/page.tsx',
  '/services/website-development': 'src/app/services/website-development/page.tsx',
  '/services/seo': 'src/app/services/seo/page.tsx',
  '/services/google-ads': 'src/app/services/google-ads/page.tsx',
  '/services/get-a-quote': 'src/app/services/get-a-quote/page.tsx',

  // Vertical Service Pages
  '/services/website-development/plumbing': 'src/app/services/website-development/plumbing/page.tsx',
  '/services/website-development/hvac': 'src/app/services/website-development/hvac/page.tsx',
  '/services/website-development/electrical': 'src/app/services/website-development/electrical/page.tsx',
  '/services/website-development/cleaning-business': 'src/app/services/website-development/cleaning-business/page.tsx',
  '/services/website-development/landscaping': 'src/app/services/website-development/landscaping/page.tsx',
  '/services/website-development/lawn-care': 'src/app/services/website-development/lawn-care/page.tsx',
  '/services/website-development/painting': 'src/app/services/website-development/painting/page.tsx',
  '/services/website-development/handyman': 'src/app/services/website-development/handyman/page.tsx',
  '/services/website-development/tree-care': 'src/app/services/website-development/tree-care/page.tsx',
  '/services/website-development/snow-removal': 'src/app/services/website-development/snow-removal/page.tsx',
  '/services/website-development/pest-control': 'src/app/services/website-development/pest-control/page.tsx',
  '/services/website-development/roofing': 'src/app/services/website-development/roofing/page.tsx',
  '/services/website-development/pool-service': 'src/app/services/website-development/pool-service/page.tsx',
  '/services/website-development/window-cleaning': 'src/app/services/website-development/window-cleaning/page.tsx',
  '/services/website-development/concrete': 'src/app/services/website-development/concrete/page.tsx',
  '/services/website-development/garage-door': 'src/app/services/website-development/garage-door/page.tsx',
  '/services/website-development/solar': 'src/app/services/website-development/solar/page.tsx',
  '/services/website-development/pet-services': 'src/app/services/website-development/pet-services/page.tsx',

  // Tools & Informational
  '/invoice-generator': 'src/app/invoice-generator/page.tsx',
  '/blog': 'src/app/blog/page.tsx',
  '/contact-us': 'src/app/contact-us/page.tsx',
};

/**
 * Extract the last git commit date (YYYY-MM-DD) for a given relative file path.
 */
export function getGitCommitDateForFile(relativeFilePath: string): string {
  const fullPath = path.join(ROOT_DIR, relativeFilePath);

  try {
    const stdout = execSync(`git log -1 --format="%as" -- "${relativeFilePath}"`, {
      cwd: ROOT_DIR,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (stdout && /^\d{4}-\d{2}-\d{2}$/.test(stdout)) {
      return stdout;
    }
  } catch {
    // Git command failed or shallow clone
  }

  // Fallback to filesystem mtime
  try {
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      return stat.mtime.toISOString().split('T')[0];
    }
  } catch {
    // Ignore fs errors
  }

  return '2026-08-01';
}

/**
 * Extract all static route dates and write to static-page-dates.json
 */
export function extractAllStaticDates(): Record<string, string> {
  const dates: Record<string, string> = {};

  for (const [route, filePath] of Object.entries(STATIC_ROUTE_FILE_MAP)) {
    dates[route] = getGitCommitDateForFile(filePath);
  }

  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(dates, null, 2), 'utf8');
  return dates;
}

// Run directly when executed as CLI script
if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('extract-git-lastmod.ts'))) {
  console.log('🔍 Extracting Git commit dates for static routes...');
  const result = extractAllStaticDates();
  console.log(`✅ Saved ${Object.keys(result).length} route dates to ${path.relative(ROOT_DIR, OUTPUT_FILE)}`);
}
