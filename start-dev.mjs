import { spawn } from 'child_process';
import { appendFileSync, writeFileSync } from 'fs';

const LOG = '/home/z/my-project/dev.log';
const PID_FILE = '/tmp/next-dev-server.pid';

const log = (msg) => {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};

function startServer() {
  log('Starting Next.js dev server...');

  const child = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try { writeFileSync(PID_FILE, String(child.pid)); } catch {}

  child.stdout.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });
  child.stderr.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });

  child.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}`);
    setTimeout(startServer, 3000);
  });

  log(`Server started with PID ${child.pid}`);
  child.unref();
  
  // Don't exit - keep the spawner alive
}

startServer();

// Keep this process alive
setInterval(() => {
  log('Spawner heartbeat');
}, 30000);
