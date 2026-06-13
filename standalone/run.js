// Custom runner that keeps the process alive
process.on('SIGTERM', () => { console.log('[run.js] SIGTERM received, ignoring'); });
process.on('SIGUSR1', () => { console.log('[run.js] SIGUSR1 received'); });
process.on('SIGUSR2', () => { console.log('[run.js] SIGUSR2 received'); });

const { spawn } = require('child_process');
const path = require('path');

function startServer() {
  console.log('[run.js] Starting server...');
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, PORT: '3000', HOSTNAME: '0.0.0.0' },
    stdio: ['ignore', 'inherit', 'inherit']
  });
  
  server.on('exit', (code, signal) => {
    console.log(`[run.js] Server exited with code=${code} signal=${signal}. Restarting in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  server.on('error', (err) => {
    console.error('[run.js] Server error:', err.message);
  });
}

startServer();
