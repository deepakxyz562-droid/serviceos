// This script ensures the correct DATABASE_URL before starting Next.js
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/serviceos';

const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, 'node_modules', '.bin', 'next');
const child = spawn('node', [nextBin, 'dev', '-p', '3000'], {
  stdio: 'inherit',
  env: { ...process.env },
  cwd: __dirname
});

child.on('error', (err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
