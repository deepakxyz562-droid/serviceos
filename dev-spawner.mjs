import { spawn } from 'child_process';
import { appendFileSync } from 'fs';

const LOG = '/home/z/my-project/dev.log';
const MAX_RESTARTS = 100;

const log = (msg) => {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};

let restartCount = 0;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log(`Max restarts (${MAX_RESTARTS}) reached, stopping`);
    process.exit(1);
  }

  log(`Starting Next.js dev server (attempt ${restartCount + 1})...`);

  const child = spawn('node', ['node_modules/.bin/next', 'dev', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=2048' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });
  child.stderr.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });

  child.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}`);
    restartCount++;
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}`);
    restartCount++;
    setTimeout(startServer, 3000);
  });

  log(`Server started with PID ${child.pid}`);
}

startServer();
