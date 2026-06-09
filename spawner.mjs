import { spawn } from 'child_process';
import { appendFileSync, writeFileSync } from 'fs';

const LOG = '/home/z/my-project/dev.log';
const PID_FILE = '/tmp/next-server.pid';

const log = (msg) => {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};

let serverProcess = null;
let restartCount = 0;

function startServer() {
  log(`Starting server (restart #${restartCount})...`);
  serverProcess = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try { writeFileSync(PID_FILE, String(serverProcess.pid)); } catch {}
  serverProcess.stdout.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });
  serverProcess.stderr.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });
  serverProcess.on('exit', (code, signal) => {
    log(`Exit code=${code} signal=${signal}`);
    restartCount++;
    if (restartCount < 100) setTimeout(startServer, 3000);
  });
  serverProcess.on('error', (err) => {
    log(`Error: ${err.message}`);
    restartCount++;
    if (restartCount < 100) setTimeout(startServer, 3000);
  });
  log(`PID: ${serverProcess.pid}`);
}

startServer();
process.on('SIGTERM', () => log('SIGTERM'));
process.on('SIGINT', () => log('SIGINT'));
setInterval(() => log('heartbeat'), 60000);
