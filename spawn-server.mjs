import { spawn } from 'child_process';
import { appendFileSync } from 'fs';

const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  appendFileSync('/home/z/my-project/dev.log', line);
};

const startServer = () => {
  log('Starting Next.js production server...');
  const child = spawn('node', ['node_modules/.bin/next', 'start', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=512' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    appendFileSync('/home/z/my-project/dev.log', data);
  });

  child.stderr.on('data', (data) => {
    appendFileSync('/home/z/my-project/dev.log', data);
  });

  child.on('exit', (code, signal) => {
    log(`Server exited with code=${code} signal=${signal}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    log(`Server error: ${err.message}, restarting in 3s...`);
    setTimeout(startServer, 3000);
  });

  log(`Server PID: ${child.pid}`);
  return child;
};

startServer();

// Keep the spawner alive
setInterval(() => {
  log('Spawner heartbeat');
}, 60000);
