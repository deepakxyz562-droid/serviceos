process.on('SIGTERM', () => { console.log('[server] SIGTERM ignored'); });
process.on('SIGUSR1', () => { console.log('[server] SIGUSR1'); });
process.on('SIGUSR2', () => { console.log('[server] SIGUSR2'); });

const { createServer } = require('http');
const next = require('next');

const dev = true;
const port = 3000;

console.log('Initializing Next.js...');
const app = next({ dev, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  console.log('Next.js prepared, starting server...');
  
  const server = createServer((req, res) => {
    handle(req, res).catch(err => {
      console.error('Handle error:', err.message);
      if (!res.headersSent) {
        res.writeHead(500);
        res.end('Internal Server Error');
      }
    });
  });
  
  server.listen(port, '0.0.0.0', () => {
    console.log(`> Server listening on http://0.0.0.0:${port}`);
  });
}).catch((err) => {
  console.error('Failed to prepare:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
