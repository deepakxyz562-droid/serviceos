const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, 'dev.log');
const RESTART_LOG = path.join(__dirname, 'server-restarts.log');

function startServer() {
  const logStream = fs.createWriteStream(LOG_FILE, { flags: 'w' });
  
  const ts = () => new Date().toISOString();
  fs.appendFileSync(RESTART_LOG, `[${ts()}] Starting server...\n`);
  
  const child = spawn('node', [
    path.join(__dirname, 'server.js'),
  ], {
    cwd: __dirname,
    env: { 
      ...process.env, 
      NODE_OPTIONS: '--max-old-space-size=4096',
      DATABASE_URL: 'postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
      DIRECT_URL: 'postgresql://neondb_owner:npg_4QmItuyVeOR2@ep-small-dawn-apeemihn.c-7.us-east-1.aws.neon.tech/neondb?sslmode=require',
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.on('data', (data) => {
    process.stdout.write(data);
    logStream.write(data);
  });

  child.stderr.on('data', (data) => {
    process.stderr.write(data);
    logStream.write(data);
  });

  child.on('exit', (code, signal) => {
    const msg = `[${ts()}] Server exited (code=${code}, signal=${signal}). Restarting in 3s...\n`;
    fs.appendFileSync(RESTART_LOG, msg);
    process.stdout.write(msg);
    logStream.end();
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    const msg = `[${ts()}] Server error: ${err.message}. Restarting in 3s...\n`;
    fs.appendFileSync(RESTART_LOG, msg);
    process.stdout.write(msg);
    logStream.end();
    setTimeout(startServer, 3000);
  });
}

startServer();

// Keep process alive
process.stdin.resume();
process.on('SIGTERM', () => console.log('Received SIGTERM, ignoring'));
process.on('SIGINT', () => console.log('Received SIGINT, ignoring'));
