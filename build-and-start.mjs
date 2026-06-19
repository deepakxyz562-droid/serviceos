import { spawn } from 'child_process';
import { appendFileSync, writeFileSync } from 'fs';

const CWD = '/home/z/my-project/serviceos';
const LOG = `${CWD}/prod.log`;

const log = (msg) => {
  try { appendFileSync(LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch {}
};

function runBuild() {
  return new Promise((resolve, reject) => {
    log('Starting production build...');
    const build = spawn('node', ['node_modules/.bin/next', 'build'], {
      cwd: CWD,
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=3072' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    build.stdout.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });
    build.stderr.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });

    build.on('exit', (code) => {
      if (code === 0) {
        log('Build completed successfully.');
        resolve();
      } else {
        log(`Build failed with code ${code}`);
        reject(new Error(`Build failed with code ${code}`));
      }
    });

    build.on('error', (err) => {
      log(`Build error: ${err.message}`);
      reject(err);
    });
  });
}

function startServer() {
  log('Starting Next.js production server...');
  const child = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000', '-H', '0.0.0.0'], {
    cwd: CWD,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=1024' },
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  try { writeFileSync(`${CWD}/prod.pid`, String(child.pid)); } catch {}

  child.stdout.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });
  child.stderr.on('data', (d) => { try { appendFileSync(LOG, d); } catch {} });

  child.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}`);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}`);
  });

  log(`Server started with PID ${child.pid}`);
  child.unref();

  // Exit spawner after a brief delay
  setTimeout(() => process.exit(0), 3000);
}

(async () => {
  try {
    writeFileSync(LOG, '');
    await runBuild();
    startServer();
  } catch (err) {
    log(`Fatal: ${err.message}`);
    process.exit(1);
  }
})();
