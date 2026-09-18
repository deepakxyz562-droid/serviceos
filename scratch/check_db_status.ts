import { db } from '../src/lib/db';

async function checkDatabase() {
  console.log('=== Checking Database Connection & Schema Status ===');
  try {
    // 1. Test basic query
    const tenantCount = await (db as any).tenant.count();
    console.log(`[DB Check] Connected successfully! Total Tenants: ${tenantCount}`);

    // 2. Check FormTemplate table
    try {
      const templateCount = await (db as any).formTemplate.count();
      console.log(`[DB Check] ✅ FormTemplate table exists in DB. Total rows: ${templateCount}`);
    } catch (err: any) {
      console.log(`[DB Check] ⚠️ FormTemplate table check failed: ${err.message}`);
    }

    // 3. Check Marketplace tables
    try {
      const requestCount = await (db as any).marketplaceRequest.count();
      console.log(`[DB Check] ✅ MarketplaceRequest table exists in DB. Total rows: ${requestCount}`);
    } catch (err: any) {
      console.log(`[DB Check] ⚠️ MarketplaceRequest table check failed: ${err.message}`);
    }

    console.log('=== DB Status Check Complete ===');
  } catch (error: any) {
    console.error(`[DB Check] Connection Error: ${error.message}`);
  } finally {
    process.exit(0);
  }
}

checkDatabase();
