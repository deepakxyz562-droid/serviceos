// Spawn `next dev` with stdio redirected DIRECTLY to a log file (no pipe),
// so the child can keep writing logs even after the spawner exits.
import { spawn } from 'child_process';
import { openSync, writeFileSync, closeSync } from 'fs';

const CWD = '/home/z/my-project';
const LOG = `${CWD}/dev.log`;
const PID_FILE = `${CWD}/next-dev.pid`;
const MAX_RESTARTS = 10;

let restartCount = 0;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    process.exit(1);
  }

  // Truncate log on first attempt only
  let logFd;
  if (restartCount === 0) {
    logFd = openSync(LOG, 'w');  // 'w' = truncate
  } else {
    logFd = openSync(LOG, 'a');  // 'a' = append
  }

  // Open a second fd for stderr (same file, append mode)
  const errFd = openSync(LOG, 'a');

  const child = spawn('node', [
    'node_modules/.bin/next',
    'dev',
    '-p', '3000',
    '-H', '0.0.0.0'
  ], {
    cwd: CWD,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1536' },
    detached: true,
    // Pass file descriptors directly so the child writes to the log file,
    // NOT through a pipe that depends on the spawner being alive.
    stdio: ['ignore', logFd, errFd],
  });

  try { writeFileSync(PID_FILE, String(child.pid)); } catch {}

  // Close our copies of the fds in the parent; the child has its own dup'd copies.
  closeSync(logFd);
  closeSync(errFd);

  child.on('exit', (code, signal) => {
    restartCount++;
    setTimeout(startServer, 5000);
  });

  child.on('error', (err) => {
    restartCount++;
    setTimeout(startServer, 5000);
  });

  child.unref();

  // Exit the spawner — the child will continue running with its own log fds.
  setTimeout(() => process.exit(0), 2000);
}

startServer();
