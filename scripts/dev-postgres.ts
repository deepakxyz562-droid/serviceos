/**
 * Sandbox development database — PGlite (WASM PostgreSQL) exposed over the
 * real PostgreSQL wire protocol, so Prisma connects to it like any normal
 * Postgres server. Zero native dependencies, persistent data in db/pglite-data.
 *
 * Usage: nohup bun run scripts/dev-postgres.ts > db/postgres.log 2>&1 &
 */
import { PGlite } from '@electric-sql/pglite';
import { createRequire } from 'module';
import { mkdirSync } from 'fs';
import { pathToFileURL } from 'url';
import * as path from 'path';

async function loadSocketServer(): Promise<any> {
  const req = createRequire(import.meta.url);
  // The package "exports" map hides ./dist/*, so resolve the package root and
  // join the ESM entry manually.
  const pkgRoot = path.dirname(req.resolve('@electric-sql/pglite-socket/package.json'));
  const esmEntry = path.join(pkgRoot, 'dist', 'index.js');
  const mod: any = await import(pathToFileURL(esmEntry).href);
  const Ctor = mod.PGLiteSocketServer ?? mod.default?.PGLiteSocketServer;
  if (typeof Ctor !== 'function') throw new Error('PGLiteSocketServer not found in ' + esmEntry);
  return Ctor;
}

const PORT = 5432;
const DATA_DIR = 'db/pglite-data';

async function main() {
  const PGliteSocketServer = await loadSocketServer();

  mkdirSync(DATA_DIR, { recursive: true });
  const db = new PGlite(DATA_DIR);
  await db.waitReady;

  const server = new PGliteSocketServer({ db, host: '127.0.0.1', port: PORT, maxConnections: 8 });
  await server.start();
  console.log(`[pglite] PostgreSQL wire server listening on 127.0.0.1:${PORT}`);
  console.log(`[pglite] data dir: ${DATA_DIR} (persistent)`);

  setInterval(() => {}, 1 << 30);
}

main().catch((e) => {
  console.error('[pglite] fatal:', e);
  process.exit(1);
});
