const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'dev.log');

function startServer() {
  fs.writeFileSync(logFile, '');
  const logStream = fs.createWriteStream(logFile, { flags: 'w' });
  
  const child = spawn('node', [
    './node_modules/next/dist/bin/next', 
    'start', '-p', '3000', '-H', '0.0.0.0'
  ], {
    cwd: __dirname,
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=384' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  
  console.log(`Server started with PID: ${child.pid}`);
  
  child.on('exit', (code, signal) => {
    const msg = `\n${new Date().toISOString()}: Server exited with code ${code}, signal ${signal}. Restarting in 3s...\n`;
    console.log(msg);
    fs.appendFileSync(logFile, msg);
    setTimeout(startServer, 3000);
  });
}

startServer();
