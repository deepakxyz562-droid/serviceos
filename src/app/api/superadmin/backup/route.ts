import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { isSuperAdminRequest } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { shouldUseSupabaseDB } from '@/lib/supabase-db';
import {
  BACKUP_MODEL_NAMES,
  prismaModelName,
} from '@/lib/backup-models';

// ─── Helpers ───────────────────────────────────────────────────────────────

function dbMode(): 'supabase' | 'prisma' {
  return shouldUseSupabaseDB() ? 'supabase' : 'prisma';
}

function timestampLabel(d = new Date()): string {
  // 2025-07-28T15-04-22-000Z (colons are unsafe in filenames)
  return d.toISOString().replace(/[:.]/g, '-');
}

// ─── GET: preview / pre-flight check ───────────────────────────────────────
//
// Returns a per-table row count + summary. The UI uses this to render a
// preview before the user triggers the actual JSON download.
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const tables: { name: string; camel: string; count: number; error?: string }[] = [];
    let totalRows = 0;
    let errorCount = 0;

    // Run counts concurrently in batches of 8 to keep latency reasonable
    // (158 sequential round-trips × ~30ms = ~5s — too slow on Vercel).
    const BATCH = 8;
    for (let i = 0; i < BACKUP_MODEL_NAMES.length; i += BATCH) {
      const slice = BACKUP_MODEL_NAMES.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map(async (pascal) => {
          const camel = prismaModelName(pascal);
          try {
            const count = await (db as any)[camel].count();
            return { name: pascal, camel, count: typeof count === 'number' ? count : 0 };
          } catch (err: any) {
            return {
              name: pascal,
              camel,
              count: 0,
              error: err?.message?.slice(0, 200) || 'Unknown error',
            };
          }
        }),
      );
      for (const r of results) {
        tables.push(r);
        totalRows += r.count;
        if (r.error) errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      mode: dbMode(),
      timestamp: new Date().toISOString(),
      totalTables: tables.length,
      totalRows,
      errorCount,
      tables: tables.sort((a, b) => b.count - a.count),
    });
  } catch (err: any) {
    console.error('[superadmin/backup] GET error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to build backup preview' },
      { status: 500 },
    );
  }
}

// ─── POST: stream the full JSON snapshot as a downloadable file ────────────
//
// We use a ReadableStream so the response is streamed table-by-table. This
// keeps peak memory low even for databases with hundreds of thousands of
// rows total — each table is fetched, serialized, enqueued, then released.
//
// The response has:
//   Content-Type: application/json
//   Content-Disposition: attachment; filename="fieseros-backup-<ts>.json"
//
// JSON shape:
// {
//   "metadata": {
//     "version": 1,
//     "format": "fieseros-json-backup",
//     "createdAt": "2025-07-28T15:04:22.000Z",
//     "mode": "supabase" | "prisma",
//     "totalTables": 158,
//     "totalRows": 12345,
//     "tables": [{ "name": "Tenant", "camel": "tenant", "count": 12 }, ...]
//   },
//   "tables": {
//     "Tenant": [ { ...row1 }, { ...row2 } ],
//     "User":   [ ... ],
//     ...
//   }
// }
//
// NOTE: because we stream, the metadata block is written first with
// placeholder values for `totalRows` and `tables`. The exact counts are
// available via the GET endpoint — the file's metadata is informational.
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(await isSuperAdminRequest())) {
      return NextResponse.json({ error: 'Forbidden - SuperAdmin access required' }, { status: 403 });
    }

    const startedAt = new Date();
    const mode = dbMode();
    const filename = `fieseros-backup-${timestampLabel(startedAt)}.json`;

    // Optional `?only=TableA,TableB` to back up just a subset (used by the
    // UI's per-table "Download this table" action).
    const onlyParam = request.nextUrl.searchParams.get('only');
    const onlySet = onlyParam
      ? new Set(
          onlyParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
        )
      : null;

    const modelsToBackup = onlySet
      ? BACKUP_MODEL_NAMES.filter((m) => onlySet.has(m))
      : BACKUP_MODEL_NAMES;

    if (modelsToBackup.length === 0) {
      return NextResponse.json(
        { error: 'No tables selected for backup' },
        { status: 400 },
      );
    }

    // ── Build the streaming response ──────────────────────────────────────
    //
    // We deliberately do NOT pre-fetch all tables into memory. Instead we
    // fetch one table at a time inside the stream's `start()` callback and
    // enqueue its serialized JSON immediately. This means a 200MB backup
    // only ever holds one table (~few MB) in memory at a time.

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        const enqueue = (s: string) => controller.enqueue(encoder.encode(s));

        // ── Header + metadata placeholder ──────────────────────────────────
        enqueue('{\n');
        enqueue('  "metadata": {\n');
        enqueue(`    "version": 1,\n`);
        enqueue(`    "format": "fieseros-json-backup",\n`);
        enqueue(`    "createdAt": ${JSON.stringify(startedAt.toISOString())},\n`);
        enqueue(`    "mode": ${JSON.stringify(mode)},\n`);
        enqueue(`    "totalTables": ${modelsToBackup.length},\n`);
        enqueue(`    "totalRows": 0,\n`);
        enqueue(`    "tables": []\n`);
        enqueue('  },\n');
        enqueue('  "tables": {\n');

        // ── Stream each table ──────────────────────────────────────────────
        let tablesWritten = 0;
        for (let i = 0; i < modelsToBackup.length; i++) {
          const pascal = modelsToBackup[i];
          const camel = prismaModelName(pascal);
          const isLast = i === modelsToBackup.length - 1;

          let rows: any[] = [];
          let errMsg: string | undefined;
          try {
            rows = await (db as any)[camel].findMany();
            if (!Array.isArray(rows)) rows = [];
          } catch (err: any) {
            errMsg = err?.message?.slice(0, 200) || 'Unknown error';
            console.error(`[superadmin/backup] findMany failed for ${pascal}:`, err);
            rows = [];
          }

          // Write the table key + rows. JSON.stringify is fine here because
          // each individual table is typically < few MB.
          enqueue(`    ${JSON.stringify(pascal)}: `);
          enqueue(JSON.stringify(rows));
          if (!isLast) enqueue(',');
          enqueue('\n');

          tablesWritten++;

          // Periodically yield to the event loop so the response flushes
          // to the client (prevents Vercel from buffering the whole thing).
          if (tablesWritten % 5 === 0) {
            await new Promise((r) => setTimeout(r, 0));
          }
        }

        enqueue('  }\n');
        enqueue('}\n');

        controller.close();
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Backup-Timestamp': startedAt.toISOString(),
        'X-Backup-Mode': mode,
      },
    });
  } catch (err: any) {
    console.error('[superadmin/backup] POST error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to generate backup' },
      { status: 500 },
    );
  }
}
