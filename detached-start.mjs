import { spawn } from 'child_process';
import { writeFileSync, appendFileSync, existsSync } from 'fs';

const LOG = '/home/z/my-project/dev.log';
const PID_FILE = '/tmp/next-server.pid';
const MAX_RESTARTS = 50;

const log = (msg) => {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};

let restartCount = 0;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    log(`Max restarts (${MAX_RESTARTS}) reached, stopping`);
    process.exit(1);
  }

  log(`Starting Next.js production server (attempt ${restartCount + 1})...`);

  const child = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Save PID
  try { writeFileSync(PID_FILE, String(child.pid)); } catch {}

  // Log output
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
  
  // Detach so this spawner can exit while server lives on
  child.unref();
  
  // Exit the spawner after a brief delay
  setTimeout(() => process.exit(0), 2000);
}

startServer();
