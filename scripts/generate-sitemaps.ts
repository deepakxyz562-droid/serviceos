import fs from 'fs';
import path from 'path';
import { 
  buildStaticSitemap, 
  serializeUrlSet, 
  serializeSitemapIndex,
  BUSINESS_PER_FILE
} from '../src/lib/sitemap-builder';
import { listAllIndexableBusinessUrls } from '../src/lib/public-business';

async function generate() {
  console.log('🏁 Starting sitemap generation...');

  const publicDir = path.resolve(__dirname, '../public');
  const sitemapDir = path.join(publicDir, 'sitemap');

  // Ensure directories exist
  if (!fs.existsSync(sitemapDir)) {
    fs.mkdirSync(sitemapDir, { recursive: true });
  }

  try {
    const now = new Date().toISOString();

    // 1. Fetch all indexable business URLs from the DB (queries in chunks of 1,000)
    console.log('⏳ Fetching all indexable business URLs from database...');
    const allUrls = await listAllIndexableBusinessUrls();
    const businessCount = allUrls.length;
    console.log(`📊 Total indexable businesses: ${businessCount}`);

    // Calculate total pages
    const businessFileCount = Math.max(
      1,
      Math.ceil(businessCount / BUSINESS_PER_FILE),
    );
    const ids = Array.from({ length: 1 + businessFileCount }, (_, i) => ({
      id: i,
    }));
    console.log(`📊 Sitemap IDs to generate:`, ids.map(item => item.id));

    // 2. Generate Sitemap Index
    const indexXml = serializeSitemapIndex(ids);
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), indexXml, 'utf-8');
    console.log(`✅ Generated sitemap index: public/sitemap.xml`);

    // 3. Generate each sitemap file
    for (const { id } of ids) {
      console.log(`⏳ Generating sitemap/${id}.xml...`);
      
      let entries;
      if (id === 0) {
        entries = await buildStaticSitemap();
      } else {
        const offset = (id - 1) * BUSINESS_PER_FILE;
        const pageUrls = allUrls.slice(offset, offset + BUSINESS_PER_FILE);
        entries = pageUrls.map((entry) => ({
          url: entry.url,
          lastModified: entry.lastModified || now,
        }));
      }

      const xml = serializeUrlSet(entries);
      fs.writeFileSync(path.join(sitemapDir, `${id}.xml`), xml, 'utf-8');
      console.log(`✅ Generated: public/sitemap/${id}.xml (${entries.length} URLs)`);
    }

    console.log('🎉 Sitemap generation completed successfully!');
    process.exit(0);
  } catch (error) {
    console.warn('⚠️ Sitemap generation skipped during build phase (DB not connected during image build):', error);
    process.exit(0);
  }
}

generate();
