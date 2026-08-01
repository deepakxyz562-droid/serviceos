import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { shouldUseSupabaseDB, getMissingTables } from '@/lib/supabase-db';
import { randomUUID } from 'crypto';

/**
 * GET /api/admin/db-health-check
 *
 * Comprehensive database health-check endpoint that exercises the full
 * Supabase PostgREST adapter (or Prisma, depending on mode) across 5 phases:
 *
 *   Phase 1: Schema Discovery      — read Prisma DMMF (0 queries)
 *   Phase 2: Table Sweep           — findMany + count on every model (~4s)
 *   Phase 3: Bug Regression Suite  — 7 targeted probes for the exact bug
 *                                     shapes that caused ~3,218 errors
 *   Phase 4: CRUD Operation Matrix — create/find/update/upsert/delete cycle
 *   Phase 5: Filter + Relation Mx  — AND, OR, nested, Date, composite, include
 *
 * Query params:
 *   ?phase=all       (default) — run all phases
 *   ?phase=2         — run only phase 2
 *   ?phase=3,4,5     — run phases 3, 4, and 5
 *   ?phase=regression — alias for phase 3
 *
 * Output: one JSON report with per-probe pass/fail + timing + a unique
 * `logMarker` UUID for correlating with Supabase postgres_logs.
 *
 * Usage in production:
 *   curl -H "Cookie: <auth>" \
 *     "https://yourapp.com/api/admin/db-health-check?phase=all" | jq .
 *   Then run the Supabase Logs Explorer query filtered by the logMarker
 *   timestamp window to confirm zero Postgres errors.
 */

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for the full sweep

// ── Types ──────────────────────────────────────────────────────────────────

type ProbeStatus = 'pass' | 'fail' | 'skip';

interface ProbeResult {
  id: string;
  name: string;
  status: ProbeStatus;
  ms: number;
  error?: string;
  detail?: unknown;
}

interface PhaseResult {
  phase: number;
  name: string;
  status: ProbeStatus;
  ms: number;
  probes?: ProbeResult[];
  summary?: Record<string, unknown>;
  failures?: ProbeResult[]; // Only failed probes (for compact output on Phase 2)
}

interface HealthReport {
  startedAt: string;
  endedAt: string;
  durationMs: number;
  backend: 'supabase_rest' | 'prisma_sql';
  logMarker: string;
  phases: PhaseResult[];
  totals: {
    probes: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** Convert PascalCase model name to camelCase for db accessor (Tenant → tenant). */
function toCamelCase(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

/** Run async fn and return { result, ms }. */
async function timed<T>(fn: () => Promise<T>): Promise<{ result: T; ms: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, ms: Date.now() - start };
}

/** Run items through fn with a concurrency limit. */
async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (index < items.length) {
        const current = index++;
        results[current] = await fn(items[current], current);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

/** Access a model dynamically: getModel('Tenant') → db.tenant */
function getModel(modelName: string): any {
  return (db as any)[toCamelCase(modelName)];
}

// ── Phase 1: Schema Discovery ──────────────────────────────────────────────

function phase1Discovery(): PhaseResult {
  const start = Date.now();
  const models = Prisma.dmmf.datamodel.models;
  const missingTables = new Set(getMissingTables());

  // Categorize models by whether they're in the adapter's "missing tables" set
  // (tables intentionally not in Supabase) vs. expected to exist.
  const expected = models.filter((m) => !missingTables.has(m.name));
  const skipped = models.filter((m) => missingTables.has(m.name));

  return {
    phase: 1,
    name: 'Schema Discovery (Prisma DMMF)',
    status: 'pass',
    ms: Date.now() - start,
    summary: {
      totalModels: models.length,
      modelsExpectedInDb: expected.length,
      modelsSkippedMissing: skipped.length,
      skippedModelNames: skipped.length > 0 ? skipped.map((m) => m.name) : undefined,
    },
  };
}

// ── Phase 2: Table Sweep ───────────────────────────────────────────────────

async function phase2TableSweep(): Promise<PhaseResult> {
  const start = Date.now();
  const models = Prisma.dmmf.datamodel.models;
  const missingTables = new Set(getMissingTables());

  const probes = await runWithConcurrency(models, 10, async (model): Promise<ProbeResult> => {
    const modelName = model.name;

    // Skip models that are intentionally not in Supabase
    if (missingTables.has(modelName)) {
      return {
        id: modelName,
        name: `findMany + count on ${modelName}`,
        status: 'skip',
        ms: 0,
        detail: { reason: 'in MISSING_TABLES set' },
      };
    }

    const scalarFields = model.fields.filter((f) => f.kind === 'scalar' && !f.isGenerated);
    const expectedFieldNames = scalarFields.map((f) => f.name);

    try {
      const modelClient = getModel(modelName);
      if (!modelClient) {
        return {
          id: modelName,
          name: `findMany + count on ${modelName}`,
          status: 'fail',
          ms: 0,
          error: `Model '${toCamelCase(modelName)}' not found on db client`,
        };
      }

      const { result, ms } = await timed(async () => {
        // findMany with take:1 to check table exists + get column shape
        const records = await modelClient.findMany({ take: 1 });
        const count = await modelClient.count();
        return { records: records as Record<string, unknown>[], count: count as number };
      });

      // If we got a row, compare response columns against Prisma scalar fields
      const missingColumns: string[] = [];
      if (result.records.length > 0) {
        const actualCols = new Set(Object.keys(result.records[0]));
        for (const fieldName of expectedFieldNames) {
          if (!actualCols.has(fieldName)) {
            missingColumns.push(fieldName);
          }
        }
      }

      const hasMissingCols = missingColumns.length > 0;
      return {
        id: modelName,
        name: `findMany + count on ${modelName}`,
        status: hasMissingCols ? 'fail' : 'pass',
        ms,
        detail: {
          rowCount: result.count,
          hasRows: result.records.length > 0,
          missingColumns: hasMissingCols ? missingColumns : undefined,
        },
      };
    } catch (err) {
      return {
        id: modelName,
        name: `findMany + count on ${modelName}`,
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  });

  const passed = probes.filter((p) => p.status === 'pass').length;
  const failed = probes.filter((p) => p.status === 'fail').length;
  const skipped = probes.filter((p) => p.status === 'skip').length;
  const failures = probes.filter((p) => p.status === 'fail');

  return {
    phase: 2,
    name: 'Table Sweep (all Prisma models)',
    status: failed === 0 ? 'pass' : passed > 0 ? 'partial' : 'fail',
    ms: Date.now() - start,
    failures, // Only include failures in detail — keeps response compact
    summary: {
      totalModels: models.length,
      passed,
      failed,
      skipped,
      failureRate: `${failed}/${passed + failed}`,
    },
  };
}

// ── Phase 3: Bug Regression Suite ──────────────────────────────────────────

async function phase3BugRegression(): Promise<PhaseResult> {
  const start = Date.now();
  const marker = randomUUID().substring(0, 8);
  const probes: ProbeResult[] = [];
  const cleanup: Array<() => Promise<void>> = [];

  // ── Bug #1: upsert() missing auto-id generation (Plan.id NOT NULL) ──
  // The old upsert() didn't auto-generate `id` for the INSERT path.
  // Fix: new upsert() delegates to create() which auto-generates id.
  {
    const code = `__hc_plan_${marker}__`;
    cleanup.push(async () => {
      try {
        await db.plan.delete({ where: { code } }).catch(() => {});
      } catch {
        /* ignore */
      }
    });

    try {
      const { ms } = await timed(async () => {
        // CREATE path: row doesn't exist → create() must auto-generate id
        await db.plan.upsert({
          where: { code },
          create: {
            code,
            name: 'HealthCheck Test Plan',
            monthlyPrice: 0,
            yearlyPrice: 0,
          },
          update: { name: 'HealthCheck Test Plan (updated)' },
        });
      });
      probes.push({
        id: 'bug-1',
        name: 'Plan.upsert CREATE path (auto-id generation)',
        status: 'pass',
        ms,
        detail: { code },
      });
    } catch (err) {
      probes.push({
        id: 'bug-1',
        name: 'Plan.upsert CREATE path (auto-id generation)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Bug #2 + #3: upsert() missing auto-updatedAt (Tenant, ChannelConfig) ──
  // The old upsert() didn't auto-set `updatedAt` for the UPDATE path.
  // Fix: new upsert() delegates to update() which auto-sets updatedAt.
  {
    const slug = `__hc_tenant_${marker}__`;
    cleanup.push(async () => {
      try {
        await db.tenant.delete({ where: { slug } }).catch(() => {});
      } catch {
        /* ignore */
      }
    });

    try {
      const { ms } = await timed(async () => {
        // Step 1: Create a test tenant (so the upsert hits UPDATE path)
        await db.tenant.create({
          data: {
            name: 'HealthCheck Tenant',
            slug,
          },
        });
        // Step 2: Upsert — row exists → UPDATE path → update() auto-sets updatedAt
        await db.tenant.upsert({
          where: { slug },
          create: { name: 'HealthCheck Tenant', slug },
          update: { name: 'HealthCheck Tenant (updated)' },
        });
      });
      probes.push({
        id: 'bug-2-3',
        name: 'Tenant.upsert UPDATE path (auto-updatedAt)',
        status: 'pass',
        ms,
        detail: { slug },
      });
    } catch (err) {
      probes.push({
        id: 'bug-2-3',
        name: 'Tenant.upsert UPDATE path (auto-updatedAt)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Bug #4: composite unique key not flattened (FeatureFlag) ──
  // Old upsert/findUnique passed `tenantId_featureKey` as a literal column.
  // Fix: flattenCompositeWhere() detects the composite shape and flattens.
  {
    try {
      const { result, ms } = await timed(async () => {
        // findUnique with composite key — should return null (no such row),
        // NOT error with "column tenantId_featureKey does not exist"
        return await db.featureFlag.findUnique({
          where: {
            tenantId_featureKey: {
              tenantId: `__hc_nonexistent_${marker}__`,
              featureKey: `__hc_feature_${marker}__`,
            },
          },
        });
      });
      probes.push({
        id: 'bug-4',
        name: 'FeatureFlag.findUnique (composite key flatten)',
        status: result === null ? 'pass' : 'fail',
        ms,
        detail: { result: result === null ? 'null (expected)' : 'unexpected row' },
      });
    } catch (err) {
      probes.push({
        id: 'bug-4',
        name: 'FeatureFlag.findUnique (composite key flatten)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Bug #5: customerEmail column doesn't exist (Conversation) ──
  // Old customer-context route selected customerEmail from Conversation,
  // but that column doesn't exist in the schema.
  // Fix: removed customerEmail from select, fetch via Customer relation.
  {
    try {
      const { result, ms } = await timed(async () => {
        // Query Conversation with the SAME select the fixed route uses
        // (no customerEmail). Should return null for nonexistent ID.
        return await db.conversation.findUnique({
          where: { id: `__hc_nonexistent_${marker}__` },
          select: {
            id: true,
            customerName: true,
            customerPhone: true,
            customerId: true,
            tenantId: true,
          },
        });
      });
      probes.push({
        id: 'bug-5',
        name: 'Conversation.findUnique (no customerEmail column)',
        status: result === null ? 'pass' : 'fail',
        ms,
        detail: { result: result === null ? 'null (expected)' : 'unexpected row' },
      });
    } catch (err) {
      probes.push({
        id: 'bug-5',
        name: 'Conversation.findUnique (no customerEmail column)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Bug #6: nested AND inside OR not handled ──
  // Old OR handler didn't recurse into nested AND arrays, treating 'AND'
  // as a column name → "column Tenant.AND does not exist".
  // Fix: buildOrConditionPart() recurses into nested AND/OR.
  {
    try {
      const { result, ms } = await timed(async () => {
        return await db.tenant.findMany({
          where: {
            OR: [
              {
                AND: [{ name: `__hc_nonexistent_${marker}__` }, { country: 'XX' }],
              },
            ],
          },
          take: 1,
        });
      });
      probes.push({
        id: 'bug-6',
        name: 'Tenant.findMany (nested AND inside OR)',
        status: Array.isArray(result) && result.length === 0 ? 'pass' : 'fail',
        ms,
        detail: { rowCount: result?.length ?? 0 },
      });
    } catch (err) {
      probes.push({
        id: 'bug-6',
        name: 'Tenant.findMany (nested AND inside OR)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Bug #7: Date.toString() in OR operator ──
  // Old OR handler stringified Date via template literals →
  // "Sat Aug 01 2026..." → 22007 invalid timestamp.
  // Fix: toOrLiteral() converts Date to ISO 8601.
  {
    try {
      const { result, ms } = await timed(async () => {
        return await db.featuredListing.findMany({
          where: {
            OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
          },
          take: 1,
        });
      });
      probes.push({
        id: 'bug-7',
        name: 'FeaturedListing.findMany (Date in OR clause)',
        status: Array.isArray(result) ? 'pass' : 'fail',
        ms,
        detail: { rowCount: result?.length ?? 0 },
      });
    } catch (err) {
      probes.push({
        id: 'bug-7',
        name: 'FeaturedListing.findMany (Date in OR clause)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Cleanup all test data ──
  await Promise.allSettled(cleanup.map((fn) => fn()));

  const passed = probes.filter((p) => p.status === 'pass').length;
  const failed = probes.filter((p) => p.status === 'fail').length;

  return {
    phase: 3,
    name: 'Bug Regression Suite (7 bugs)',
    status: failed === 0 ? 'pass' : passed > 0 ? 'partial' : 'fail',
    ms: Date.now() - start,
    probes,
    summary: { total: probes.length, passed, failed },
  };
}

// ── Phase 4: CRUD Operation Matrix ─────────────────────────────────────────

async function phase4CrudMatrix(): Promise<PhaseResult> {
  const start = Date.now();
  const marker = `__hc_crud_${randomUUID().substring(0, 8)}__`;
  const probes: ProbeResult[] = [];
  let createdId: string | null = null;

  // 4a: CREATE
  try {
    const { result, ms } = await timed(async () => {
      return await db.auditLog.create({
        data: {
          action: marker,
          resourceType: 'healthcheck',
          metadataJson: JSON.stringify({ marker, phase: 4 }),
        },
      });
    });
    createdId = (result as { id: string }).id;
    probes.push({
      id: 'crud-create',
      name: 'AuditLog.create',
      status: 'pass',
      ms,
      detail: { id: createdId },
    });
  } catch (err) {
    probes.push({
      id: 'crud-create',
      name: 'AuditLog.create',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 4b: findUnique
  if (createdId) {
    try {
      const { result, ms } = await timed(async () => {
        return await db.auditLog.findUnique({ where: { id: createdId! } });
      });
      probes.push({
        id: 'crud-find',
        name: 'AuditLog.findUnique',
        status: result !== null ? 'pass' : 'fail',
        ms,
        detail: { found: result !== null },
      });
    } catch (err) {
      probes.push({
        id: 'crud-find',
        name: 'AuditLog.findUnique',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4c: UPDATE
  if (createdId) {
    try {
      const { ms } = await timed(async () => {
        await db.auditLog.update({
          where: { id: createdId! },
          data: { action: `${marker}_updated` },
        });
      });
      probes.push({
        id: 'crud-update',
        name: 'AuditLog.update',
        status: 'pass',
        ms,
      });
    } catch (err) {
      probes.push({
        id: 'crud-update',
        name: 'AuditLog.update',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4d: UPSERT (update path — row exists)
  if (createdId) {
    try {
      const { ms } = await timed(async () => {
        await db.auditLog.upsert({
          where: { id: createdId! },
          create: { action: `${marker}_upsert_create` },
          update: { action: `${marker}_upsert_update` },
        });
      });
      probes.push({
        id: 'crud-upsert-update',
        name: 'AuditLog.upsert (UPDATE path)',
        status: 'pass',
        ms,
      });
    } catch (err) {
      probes.push({
        id: 'crud-upsert-update',
        name: 'AuditLog.upsert (UPDATE path)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // 4e: DELETE
  if (createdId) {
    try {
      const { ms } = await timed(async () => {
        await db.auditLog.delete({ where: { id: createdId! } });
      });
      probes.push({
        id: 'crud-delete',
        name: 'AuditLog.delete',
        status: 'pass',
        ms,
      });
    } catch (err) {
      probes.push({
        id: 'crud-delete',
        name: 'AuditLog.delete',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    // 4f: Verify deletion
    try {
      const { result, ms } = await timed(async () => {
        return await db.auditLog.findUnique({ where: { id: createdId! } });
      });
      probes.push({
        id: 'crud-verify-delete',
        name: 'AuditLog.findUnique (post-delete verify)',
        status: result === null ? 'pass' : 'fail',
        ms,
        detail: { result: result === null ? 'null (expected)' : 'row still exists!' },
      });
    } catch (err) {
      probes.push({
        id: 'crud-verify-delete',
        name: 'AuditLog.findUnique (post-delete verify)',
        status: 'fail',
        ms: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // Safety cleanup: if any step failed before delete, try to clean up
  if (createdId) {
    try {
      await db.auditLog.delete({ where: { id: createdId } }).catch(() => {});
    } catch {
      /* ignore */
    }
  }

  const passed = probes.filter((p) => p.status === 'pass').length;
  const failed = probes.filter((p) => p.status === 'fail').length;

  return {
    phase: 4,
    name: 'CRUD Operation Matrix (AuditLog)',
    status: failed === 0 ? 'pass' : passed > 0 ? 'partial' : 'fail',
    ms: Date.now() - start,
    probes,
    summary: { total: probes.length, passed, failed },
  };
}

// ── Phase 5: Filter + Relation Matrix ──────────────────────────────────────

async function phase5FilterMatrix(): Promise<PhaseResult> {
  const start = Date.now();
  const probes: ProbeResult[] = [];

  // 5a: Simple AND
  try {
    const { result, ms } = await timed(async () => {
      return await db.tenant.findMany({
        where: { AND: [{ country: 'US' }, { currency: 'USD' }] },
        take: 1,
      });
    });
    probes.push({
      id: 'filter-and',
      name: 'WHERE AND (simple)',
      status: Array.isArray(result) ? 'pass' : 'fail',
      ms,
      detail: { rowCount: result?.length ?? 0 },
    });
  } catch (err) {
    probes.push({
      id: 'filter-and',
      name: 'WHERE AND (simple)',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5b: Simple OR
  try {
    const { result, ms } = await timed(async () => {
      return await db.tenant.findMany({
        where: { OR: [{ country: 'US' }, { country: 'CA' }] },
        take: 1,
      });
    });
    probes.push({
      id: 'filter-or',
      name: 'WHERE OR (simple)',
      status: Array.isArray(result) ? 'pass' : 'fail',
      ms,
      detail: { rowCount: result?.length ?? 0 },
    });
  } catch (err) {
    probes.push({
      id: 'filter-or',
      name: 'WHERE OR (simple)',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5c: Null check
  try {
    const { result, ms } = await timed(async () => {
      return await db.tenant.findMany({
        where: { industry: null },
        take: 1,
      });
    });
    probes.push({
      id: 'filter-null',
      name: 'WHERE field = null',
      status: Array.isArray(result) ? 'pass' : 'fail',
      ms,
      detail: { rowCount: result?.length ?? 0 },
    });
  } catch (err) {
    probes.push({
      id: 'filter-null',
      name: 'WHERE field = null',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5d: Operator object (gte)
  try {
    const { result, ms } = await timed(async () => {
      return await db.plan.findMany({
        where: { monthlyPrice: { gte: 0 } },
        take: 1,
      });
    });
    probes.push({
      id: 'filter-gte',
      name: 'WHERE { field: { gte: N } }',
      status: Array.isArray(result) ? 'pass' : 'fail',
      ms,
      detail: { rowCount: result?.length ?? 0 },
    });
  } catch (err) {
    probes.push({
      id: 'filter-gte',
      name: 'WHERE { field: { gte: N } }',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5e: Date in where (gt)
  try {
    const { result, ms } = await timed(async () => {
      return await db.featuredListing.findMany({
        where: { endDate: { gt: new Date('2020-01-01') } },
        take: 1,
      });
    });
    probes.push({
      id: 'filter-date-gt',
      name: 'WHERE { dateField: { gt: Date } }',
      status: Array.isArray(result) ? 'pass' : 'fail',
      ms,
      detail: { rowCount: result?.length ?? 0 },
    });
  } catch (err) {
    probes.push({
      id: 'filter-date-gt',
      name: 'WHERE { dateField: { gt: Date } }',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5f: Composite key in findUnique (covers Bug #4 regression at adapter level)
  try {
    const { result, ms } = await timed(async () => {
      return await db.featureFlag.findUnique({
        where: {
          tenantId_featureKey: {
            tenantId: '__hc_nonexistent_filter__',
            featureKey: '__hc_nonexistent_key__',
          },
        },
      });
    });
    probes.push({
      id: 'filter-composite',
      name: 'findUnique with composite key',
      status: result === null ? 'pass' : 'fail',
      ms,
      detail: { result: result === null ? 'null (expected)' : 'unexpected' },
    });
  } catch (err) {
    probes.push({
      id: 'filter-composite',
      name: 'findUnique with composite key',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // 5g: include (relation)
  try {
    const { result, ms } = await timed(async () => {
      // Conversation has a `tenant` relation defined in RELATION_MAP
      return await db.conversation.findMany({
        include: { tenant: { select: { id: true, name: true } } },
        take: 1,
      });
    });
    probes.push({
      id: 'filter-include',
      name: 'findMany with include (relation)',
      status: Array.isArray(result) ? 'pass' : 'fail',
      ms,
      detail: { rowCount: result?.length ?? 0 },
    });
  } catch (err) {
    probes.push({
      id: 'filter-include',
      name: 'findMany with include (relation)',
      status: 'fail',
      ms: 0,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  const passed = probes.filter((p) => p.status === 'pass').length;
  const failed = probes.filter((p) => p.status === 'fail').length;

  return {
    phase: 5,
    name: 'Filter + Relation Matrix',
    status: failed === 0 ? 'pass' : passed > 0 ? 'partial' : 'fail',
    ms: Date.now() - start,
    probes,
    summary: { total: probes.length, passed, failed },
  };
}

// ── Main Handler ───────────────────────────────────────────────────────────

const PHASE_ALIASES: Record<string, number[]> = {
  regression: [3],
  sweep: [2],
  crud: [4],
  filters: [5],
  all: [1, 2, 3, 4, 5],
};

export async function GET(request: NextRequest) {
  // ── Auth: superadmin only ──
  if (!(await isSuperAdminRequest())) {
    return NextResponse.json(
      { error: 'Forbidden: Super admin access required' },
      { status: 403 },
    );
  }

  // ── Parse phase param ──
  const phaseParam = request.nextUrl.searchParams.get('phase') || 'all';
  const requestedPhases = PHASE_ALIASES[phaseParam]
    ? PHASE_ALIASES[phaseParam]
    : phaseParam.split(',').map((p) => parseInt(p.trim(), 10)).filter((n) => !isNaN(n) && n >= 1 && n <= 5);

  if (requestedPhases.length === 0) {
    return NextResponse.json(
      { error: `Invalid phase parameter: "${phaseParam}". Use: all, 1, 2, 3, 4, 5, regression, sweep, crud, filters` },
      { status: 400 },
    );
  }

  const logMarker = randomUUID();
  const startedAt = new Date().toISOString();
  console.log(`[DB-HEALTHCHECK] START marker=${logMarker} phases=[${requestedPhases.join(',')}]`);

  const phases: PhaseResult[] = [];

  // Run requested phases sequentially (Phase 2 uses concurrency internally)
  for (const phaseNum of requestedPhases.sort()) {
    try {
      let result: PhaseResult;
      switch (phaseNum) {
        case 1:
          result = phase1Discovery();
          break;
        case 2:
          result = await phase2TableSweep();
          break;
        case 3:
          result = await phase3BugRegression();
          break;
        case 4:
          result = await phase4CrudMatrix();
          break;
        case 5:
          result = await phase5FilterMatrix();
          break;
        default:
          continue;
      }
      phases.push(result);
      console.log(
        `[DB-HEALTHCHECK] Phase ${phaseNum} (${result.name}): ${result.status} in ${result.ms}ms`,
      );
    } catch (err) {
      phases.push({
        phase: phaseNum,
        name: `Phase ${phaseNum}`,
        status: 'fail',
        ms: 0,
        probes: [],
        summary: { error: err instanceof Error ? err.message : String(err) },
      });
    }
  }

  // ── Calculate totals ──
  let totalProbes = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  for (const phase of phases) {
    if (phase.probes) {
      totalProbes += phase.probes.length;
      totalPassed += phase.probes.filter((p) => p.status === 'pass').length;
      totalFailed += phase.probes.filter((p) => p.status === 'fail').length;
      totalSkipped += phase.probes.filter((p) => p.status === 'skip').length;
    } else if (phase.failures) {
      // Phase 2 only includes failures in probes
      totalProbes += (phase.summary?.totalModels as number) || 0;
      totalPassed += (phase.summary?.passed as number) || 0;
      totalFailed += (phase.summary?.failed as number) || 0;
      totalSkipped += (phase.summary?.skipped as number) || 0;
    }
  }

  const endedAt = new Date().toISOString();
  const report: HealthReport = {
    startedAt,
    endedAt,
    durationMs: new Date(endedAt).getTime() - new Date(startedAt).getTime(),
    backend: shouldUseSupabaseDB() ? 'supabase_rest' : 'prisma_sql',
    logMarker,
    phases,
    totals: {
      probes: totalProbes,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
    },
  };

  console.log(
    `[DB-HEALTHCHECK] END marker=${logMarker} passed=${totalPassed} failed=${totalFailed} duration=${report.durationMs}ms`,
  );

  return NextResponse.json(report, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  });
}
