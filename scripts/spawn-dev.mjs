#!/usr/bin/env node
/**
 * Robust dev-server spawner with auto-restart on crash.
 *
 * The Turbopack dev server can exceed the container's 4GB RAM limit during
 * heavy compilation (landing page = 1500+ lines). This script:
 *   1. Spawns `next dev` as a child process
 *   2. Monitors it and auto-restarts if it crashes (OOM kill, etc.)
 *   3. Restarts with a backoff to avoid rapid crash loops
 *   4. Uses a conservative memory limit to leave room for the OS
 */
import { spawn } from 'child_process';
import { createWriteStream } from 'fs';

const PORT = 3000;
const MAX_RESTARTS = 10;
const MAX_OLD_SPACE = 1024; // MB — conservative to avoid OOM on 4GB container
const RESTART_DELAY_MS = 3000;

let restartCount = 0;

function startServer() {
  console.log(`[spawn-dev] Starting Next.js dev server (attempt ${restartCount + 1})...`);

  const child = spawn(
    process.execPath,
    ['node_modules/.bin/next', 'dev', '-p', String(PORT), '-H', '0.0.0.0'],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_OPTIONS: `--max-old-space-size=${MAX_OLD_SPACE}`,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  );

  const logStream = createWriteStream('dev.log', { flags: 'w' });
  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);

  child.on('exit', (code, signal) => {
    console.log(`[spawn-dev] Server exited (code=${code}, signal=${signal})`);
    if (signal === 'SIGKILL') {
      console.log('[spawn-dev] Server was OOM-killed (SIGKILL)');
    }
    if (restartCount < MAX_RESTARTS) {
      restartCount++;
      console.log(`[spawn-dev] Auto-restarting in ${RESTART_DELAY_MS / 1000}s... (${restartCount}/${MAX_RESTARTS})`);
      setTimeout(startServer, RESTART_DELAY_MS);
    } else {
      console.error('[spawn-dev] Max restarts reached. Giving up.');
      process.exit(1);
    }
  });

  return child;
}

process.on('SIGINT', () => { console.log('[spawn-dev] Shutting down...'); process.exit(0); });
process.on('SIGTERM', () => { console.log('[spawn-dev] Shutting down...'); process.exit(0); });

startServer();
