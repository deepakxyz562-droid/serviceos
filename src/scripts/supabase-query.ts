/**
 * Supabase Query / Diagnostic Script
 * ==================================
 *
 * Purpose:
 *   Run read-only diagnostic queries directly against the Supabase REST API
 *   (PostgREST) — bypassing the Prisma/Supabase adapter — so we can verify
 *   what is actually stored in production when a feature appears broken in
 *   the UI.
 *
 * Primary use case (Issue 1 — "complete job photo upload returns []"):
 *   The /api/jobs/[id]/photos GET endpoint returns {"photos":[]} even though
 *   the UI shows no upload error. We need to determine whether:
 *     (a) The JobPhoto table exists in Supabase
 *     (b) The POST handler is actually inserting rows
 *     (c) The POST handler is failing silently somewhere in the Supabase
 *         adapter path
 *
 * Usage:
 *   bun run src/scripts/supabase-query.ts <command> [args]
 *
 * Commands:
 *   tables                      List all tables visible to PostgREST
 *   photos                      List the 20 most recent JobPhoto rows
 *   photos-by-job <jobId>       List all JobPhoto rows for a specific job
 *   photos-count                Count JobPhoto rows grouped by photoType
 *   signatures                  List 20 most recent JobSignature rows (sanity check)
 *   timeline-by-job <jobId>     List CustomerTimelineEntry rows for a job
 *   inspect-job <jobId>         Show the Job row + its photo + timeline counts
 *   test-insert <jobId>         Insert a 1x1 test JobPhoto and immediately delete it
 *   schema-cache                Re-fetch and print the PostgREST OpenAPI spec
 *   raw <table> [limit]         SELECT * FROM <table> LIMIT <limit>
 *   raw-where <table> <col>=<val>  SELECT * FROM <table> WHERE <col>=<val> LIMIT 50
 *
 * Environment:
 *   Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env
 *   (these are the same vars the app uses at runtime).
 *
 * NOTE: This script uses fetch() directly (no @supabase/supabase-js dependency
 * in the script itself) so it can run in any Bun/Node context.
 */

// ── Load .env (Bun loads automatically; dotenv is a fallback for Node) ────
try {
  const { config } = await import('dotenv');
  config({ path: '.env' });
} catch {
  // dotenv not installed (or running under Bun which loads .env natively) — ignore
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('   Set these to the production Supabase project values to inspect live data.');
  process.exit(1);
}

// ── PostgREST fetch helpers ───────────────────────────────────────────────

const HEADERS = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

async function restGet<T = any>(
  table: string,
  opts: { select?: string; filter?: string; order?: string; limit?: number; head?: boolean } = {}
): Promise<{ data: T | null; error: any; status: number; count: number | null }> {
  const params = new URLSearchParams();
  params.set('select', opts.select || '*');
  if (opts.filter) params.set('filter', opts.filter); // PostgREST filter (already URL-encoded form e.g. "jobId=eq.xxx")
  if (opts.order) params.set('order', opts.order);
  if (opts.limit) params.set('limit', String(opts.limit));

  const url = `${SUPABASE_URL}/rest/v1/${table}?${params.toString()}`;
  const res = await fetch(url, {
    method: opts.head ? 'HEAD' : 'GET',
    headers: {
      ...HEADERS,
      ...(opts.head ? { Prefer: 'count=exact' } : {}),
      Range: opts.head ? '0-0' : `0-${(opts.limit || 50) - 1}`,
    },
  });

  let data: any = null;
  let error: any = null;
  if (!opts.head) {
    try {
      data = await res.json();
    } catch {
      data = null;
    }
  }
  if (!res.ok) {
    error = data || { status: res.status, statusText: res.statusText };
  }

  // Parse total count from Content-Range header
  const contentRange = res.headers.get('content-range') || '';
  let count: number | null = null;
  if (contentRange.includes('/')) {
    const total = contentRange.split('/')[1];
    if (total !== '*') count = parseInt(total, 10);
  }

  return { data, error, status: res.status, count };
}

async function restInsert<T = any>(
  table: string,
  row: Record<string, unknown>
): Promise<{ data: T | null; error: any; status: number }> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?select=*`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { ...HEADERS, Prefer: 'return=representation' },
    body: JSON.stringify(row),
  });
  let data: any = null;
  let error: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    error = data || { status: res.status, statusText: res.statusText };
  }
  return { data, error, status: res.status };
}

async function restDelete(
  table: string,
  filter: string // e.g. "id=eq.xxx"
): Promise<{ error: any; status: number; count: number }> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${filter}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { ...HEADERS, Prefer: 'return=representation' },
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { error: !res.ok ? data : null, status: res.status, count: Array.isArray(data) ? data.length : 0 };
}

// ── Pretty-print helpers ──────────────────────────────────────────────────

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') {
    // Truncate long strings (URLs, JSON, base64)
    return v.length > 80 ? v.substring(0, 77) + '...' : v;
  }
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function printTable(rows: any[], columns?: string[]) {
  if (!rows || rows.length === 0) {
    console.log('   (no rows)');
    return;
  }
  const cols = columns || Object.keys(rows[0]);
  // Compute column widths
  const widths: Record<string, number> = {};
  for (const c of cols) widths[c] = c.length;
  for (const r of rows) {
    for (const c of cols) {
      const v = fmt(r[c]);
      if (v.length > widths[c]) widths[c] = Math.min(v.length, 50);
    }
  }
  // Header
  const header = cols.map((c) => c.padEnd(widths[c])).join(' | ');
  console.log('   ' + header);
  console.log('   ' + cols.map((c) => '-'.repeat(widths[c])).join('-+-'));
  // Rows
  for (const r of rows) {
    const line = cols.map((c) => fmt(r[c]).padEnd(widths[c])).join(' | ');
    console.log('   ' + line);
  }
}

function printError(label: string, err: any) {
  console.error(`❌ ${label}:`);
  if (err && typeof err === 'object') {
    if (err.message) console.error(`   message: ${err.message}`);
    if (err.code) console.error(`   code:    ${err.code}`);
    if (err.details) console.error(`   details: ${err.details}`);
    if (err.hint) console.error(`   hint:    ${err.hint}`);
    if (err.status) console.error(`   status:  ${err.status}`);
  } else {
    console.error('   ', err);
  }
}

// ── Command implementations ───────────────────────────────────────────────

async function cmdTables() {
  console.log('📋 Fetching PostgREST OpenAPI spec (list of all tables)...\n');
  // The root /rest/v1/ endpoint returns an OpenAPI spec listing all tables.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: HEADERS,
  });
  if (!res.ok) {
    printError('Failed to fetch schema', { status: res.status, statusText: res.statusText });
    return;
  }
  const spec = await res.json();
  const tables = Object.keys(spec.paths || {}).filter((p) => p.startsWith('/'));
  console.log(`Found ${tables.length} tables/views:\n`);
  for (const t of tables.sort()) {
    console.log('  ' + t);
  }
  console.log(`\nTotal: ${tables.length}`);
}

async function cmdPhotos() {
  console.log('📸 Fetching 20 most recent JobPhoto rows...\n');
  const { data, error, status, count } = await restGet<any[]>('JobPhoto', {
    order: 'createdAt.desc',
    limit: 20,
  });
  if (error) {
    printError(`GET JobPhoto failed (HTTP ${status})`, error);
    return;
  }
  console.log(`✅ JobPhoto table EXISTS (HTTP ${status})`);
  console.log(`Total rows in table (from Content-Range): ${count ?? 'unknown'}\n`);
  printTable(data || [], ['id', 'jobId', 'photoType', 'tenantId', 'capturedBy', 'capturedAt', 'createdAt', 'url']);
}

async function cmdPhotosByJob(jobId: string) {
  console.log(`📸 Fetching JobPhoto rows for jobId="${jobId}"...\n`);
  const { data, error, status } = await restGet<any[]>('JobPhoto', {
    filter: `jobId=eq.${jobId}`,
    order: 'capturedAt.asc',
    limit: 100,
  });
  if (error) {
    printError(`GET JobPhoto?jobId=eq.${jobId} failed (HTTP ${status})`, error);
    return;
  }
  console.log(`✅ HTTP ${status}, ${data?.length || 0} row(s)\n`);
  printTable(data || [], ['id', 'photoType', 'capturedBy', 'capturedAt', 'url', 'syncStatus']);
}

async function cmdPhotosCount() {
  console.log('📊 Counting JobPhoto rows grouped by photoType...\n');
  // PostgREST doesn't support GROUP BY directly, so we fetch all and group client-side.
  const { data, error, status, count } = await restGet<any[]>('JobPhoto', {
    select: 'photoType',
    limit: 10000,
  });
  if (error) {
    printError(`GET JobPhoto failed (HTTP ${status})`, error);
    return;
  }
  const total = count ?? data?.length ?? 0;
  const byType: Record<string, number> = {};
  for (const r of data || []) {
    const t = r.photoType || '(null)';
    byType[t] = (byType[t] || 0) + 1;
  }
  console.log(`Total JobPhoto rows: ${total}\n`);
  console.log('   photoType     count');
  console.log('   ----------    -----');
  for (const [t, c] of Object.entries(byType).sort()) {
    console.log(`   ${t.padEnd(12)}  ${c}`);
  }
}

async function cmdSignatures() {
  console.log('✍️  Fetching 20 most recent JobSignature rows (sanity check)...\n');
  const { data, error, status, count } = await restGet<any[]>('JobSignature', {
    order: 'signedAt.desc',
    limit: 20,
  });
  if (error) {
    printError(`GET JobSignature failed (HTTP ${status})`, error);
    return;
  }
  console.log(`✅ JobSignature table EXISTS (HTTP ${status})`);
  console.log(`Total rows: ${count ?? 'unknown'}\n`);
  printTable(data || [], ['id', 'jobId', 'signatoryType', 'signatoryName', 'signedAt']);
}

async function cmdTimelineByJob(jobId: string) {
  console.log(`📅 Fetching CustomerTimelineEntry rows for sourceId="${jobId}"...\n`);
  // CustomerTimelineEntry uses sourceType+sourceId to link to Job
  const { data, error, status } = await restGet<any[]>('CustomerTimelineEntry', {
    filter: `sourceId=eq.${jobId}`,
    order: 'eventDate.desc',
    limit: 100,
  });
  if (error) {
    printError(`GET CustomerTimelineEntry?sourceId=eq.${jobId} failed (HTTP ${status})`, error);
    return;
  }
  console.log(`✅ HTTP ${status}, ${data?.length || 0} row(s)\n`);
  printTable(data || [], ['id', 'entryType', 'sourceType', 'actorType', 'actorName', 'eventDate', 'title']);
}

async function cmdInspectJob(jobId: string) {
  console.log(`🔍 Inspecting job "${jobId}"...\n`);

  // 1. Job row
  console.log('── Job row ──');
  const jobRes = await restGet<any[]>('Job', { filter: `id=eq.${jobId}`, limit: 1 });
  if (jobRes.error) {
    printError('GET Job failed', jobRes.error);
  } else if (!jobRes.data || jobRes.data.length === 0) {
    console.log('   ⚠️  No Job row found with this id — the GET /photos endpoint would return 404.');
  } else {
    const j = jobRes.data[0];
    console.log(`   id:           ${j.id}`);
    console.log(`   title:        ${j.title || '—'}`);
    console.log(`   customerId:   ${j.customerId || '—'}`);
    console.log(`   workspaceId:  ${j.workspaceId || '—'}`);
    console.log(`   tenantId:     ${j.tenantId || '—'}`);
    console.log(`   status:       ${j.status || '—'}`);
  }

  // 2. JobPhoto count for this job
  console.log('\n── JobPhoto count for this job ──');
  const photoRes = await restGet<any[]>('JobPhoto', {
    select: 'id',
    filter: `jobId=eq.${jobId}`,
    limit: 1,
    head: true,
  });
  if (photoRes.error) {
    printError('GET JobPhoto (head) failed', photoRes.error);
  } else {
    console.log(`   HTTP ${photoRes.status}, total rows: ${photoRes.count ?? 'unknown'}`);
  }

  // 3. JobPhoto rows for this job (sample)
  console.log('\n── JobPhoto sample (first 10) ──');
  const photoRowsRes = await restGet<any[]>('JobPhoto', {
    filter: `jobId=eq.${jobId}`,
    order: 'capturedAt.desc',
    limit: 10,
  });
  if (photoRowsRes.error) {
    printError('GET JobPhoto failed', photoRowsRes.error);
  } else {
    printTable(photoRowsRes.data || [], ['id', 'photoType', 'capturedBy', 'capturedAt', 'syncStatus']);
  }

  // 4. Timeline entries
  console.log('\n── CustomerTimelineEntry for this job ──');
  await cmdTimelineByJob(jobId);
}

async function cmdTestInsert(jobId: string) {
  console.log(`🧪 Test-inserting a JobPhoto row for jobId="${jobId}"...\n`);

  const testId = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();

  const testRow = {
    id: testId,
    tenantId: 'test-diagnostic',
    jobId,
    customerId: null,
    photoType: 'other',
    url: 'https://example.com/test-diagnostic.jpg',
    thumbnailUrl: 'https://example.com/test-diagnostic.jpg',
    fileName: 'test-diagnostic.jpg',
    mimeType: 'image/jpeg',
    size: 0,
    capturedBy: null,
    capturedByName: 'Diagnostic Script',
    capturedAt: now,
    syncStatus: 'synced',
    createdAt: now,
  };

  console.log('Attempting insert with row:');
  console.log(JSON.stringify(testRow, null, 2));
  console.log('');

  const { data, error, status } = await restInsert('JobPhoto', testRow);
  if (error) {
    printError(`INSERT into JobPhoto failed (HTTP ${status})`, error);
    console.log('\n💡 If the error is "Could not find the table" → the JobPhoto table does NOT exist in Supabase.');
    console.log('   Fix: run `bun run db:push` against the production DATABASE_URL to create missing tables.');
    console.log('   Or run the CREATE TABLE statement from prisma/schema.prisma via the Supabase SQL editor.');
    return;
  }

  console.log(`✅ INSERT succeeded (HTTP ${status})`);
  console.log('Returned row:');
  console.log(JSON.stringify(data, null, 2));

  // Clean up
  console.log('\n🧹 Cleaning up test row...');
  const delRes = await restDelete('JobPhoto', `id=eq.${testId}`);
  if (delRes.error) {
    printError('DELETE test row failed', delRes.error);
  } else {
    console.log(`✅ Deleted ${delRes.count} test row(s)`);
  }

  console.log('\n💡 If the production POST /api/jobs/[id]/photos still returns [] after this test passes,');
  console.log('   the issue is in the API route, not the table. Check server logs for:');
  console.log('   - "[SupabaseDB] create error on JobPhoto: ..."');
  console.log('   - "[PhotosAPI] POST error: ..."');
  console.log('   - Storage upload errors ("[Storage] S3 upload error: ...")');
}

async function cmdSchemaCache() {
  console.log('🔄 Re-fetching PostgREST schema cache...\n');
  // Sending an Accept header with application/openapi+json forces PostgREST
  // to return the OpenAPI spec, which also refreshes its schema cache.
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: { ...HEADERS, Accept: 'application/openapi+json' },
  });
  if (!res.ok) {
    printError('Failed', { status: res.status, statusText: res.statusText });
    return;
  }
  const spec = await res.json();
  const tables = Object.keys(spec.paths || {}).filter((p) => p.startsWith('/'));
  console.log(`Schema cache refreshed. ${tables.length} tables visible.`);
  console.log('\nSample tables:');
  for (const t of tables.sort().slice(0, 30)) {
    console.log('  ' + t);
  }
  if (tables.length > 30) console.log(`  ... and ${tables.length - 30} more`);
}

async function cmdRaw(table: string, limitStr?: string) {
  const limit = parseInt(limitStr || '50', 10);
  console.log(`📥 SELECT * FROM "${table}" LIMIT ${limit}\n`);
  const { data, error, status, count } = await restGet<any[]>(table, {
    order: 'createdAt.desc',
    limit,
  });
  if (error) {
    printError(`GET ${table} failed (HTTP ${status})`, error);
    return;
  }
  console.log(`✅ HTTP ${status}, ${(data as any[])?.length || 0} row(s), total: ${count ?? 'unknown'}\n`);
  printTable(data || []);
}

async function cmdRawWhere(table: string, filterExpr: string) {
  console.log(`📥 SELECT * FROM "${table}" WHERE ${filterExpr} LIMIT 50\n`);
  const { data, error, status } = await restGet<any[]>(table, {
    filter: filterExpr,
    limit: 50,
  });
  if (error) {
    printError(`GET ${table}?${filterExpr} failed (HTTP ${status})`, error);
    return;
  }
  console.log(`✅ HTTP ${status}, ${data?.length || 0} row(s)\n`);
  printTable(data || []);
}

// ── CLI entry point ───────────────────────────────────────────────────────

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  console.log(`\n🔧 Supabase Query / Diagnostic Script`);
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Service key: ${SERVICE_KEY.slice(0, 12)}...${SERVICE_KEY.slice(-4)}\n`);

  try {
    switch (cmd) {
      case 'tables':
        await cmdTables();
        break;
      case 'photos':
        await cmdPhotos();
        break;
      case 'photos-by-job':
        if (!args[0]) { console.error('Usage: photos-by-job <jobId>'); process.exit(1); }
        await cmdPhotosByJob(args[0]);
        break;
      case 'photos-count':
        await cmdPhotosCount();
        break;
      case 'signatures':
        await cmdSignatures();
        break;
      case 'timeline-by-job':
        if (!args[0]) { console.error('Usage: timeline-by-job <jobId>'); process.exit(1); }
        await cmdTimelineByJob(args[0]);
        break;
      case 'inspect-job':
        if (!args[0]) { console.error('Usage: inspect-job <jobId>'); process.exit(1); }
        await cmdInspectJob(args[0]);
        break;
      case 'test-insert':
        if (!args[0]) { console.error('Usage: test-insert <jobId>'); process.exit(1); }
        await cmdTestInsert(args[0]);
        break;
      case 'schema-cache':
        await cmdSchemaCache();
        break;
      case 'raw':
        if (!args[0]) { console.error('Usage: raw <table> [limit]'); process.exit(1); }
        await cmdRaw(args[0], args[1]);
        break;
      case 'raw-where':
        if (!args[0] || !args[1]) { console.error('Usage: raw-where <table> <col>=<val>'); process.exit(1); }
        await cmdRawWhere(args[0], args[1]);
        break;
      default:
        console.log('Usage: bun run src/scripts/supabase-query.ts <command> [args]\n');
        console.log('Commands:');
        console.log('  tables                       List all tables visible to PostgREST');
        console.log('  photos                       List 20 most recent JobPhoto rows');
        console.log('  photos-by-job <jobId>        List all JobPhoto rows for a job');
        console.log('  photos-count                 Count JobPhoto rows by photoType');
        console.log('  signatures                   List 20 most recent JobSignature rows (sanity check)');
        console.log('  timeline-by-job <jobId>      List CustomerTimelineEntry rows for a job');
        console.log('  inspect-job <jobId>          Inspect a job: row + photos + timeline');
        console.log('  test-insert <jobId>          Insert + delete a test JobPhoto (verifies table exists + is writable)');
        console.log('  schema-cache                 Re-fetch PostgREST schema cache');
        console.log('  raw <table> [limit]          SELECT * FROM <table>');
        console.log('  raw-where <table> <filter>   SELECT * FROM <table> WHERE <filter>');
        console.log('\nExamples:');
        console.log('  bun run src/scripts/supabase-query.ts tables');
        console.log('  bun run src/scripts/supabase-query.ts inspect-job dCRCPEL9PtOuQ3D7K5pTL-yz6');
        console.log('  bun run src/scripts/supabase-query.ts test-insert dCRCPEL9PtOuQ3D7K5pTL-yz6');
        console.log('  bun run src/scripts/supabase-query.ts raw-where JobPhoto jobId=eq.dCRCPEL9PtOuQ3D7K5pTL-yz6');
        process.exit(1);
    }
  } catch (err) {
    console.error('\n💥 Unhandled error:');
    console.error(err);
    process.exit(1);
  }
}

main();
