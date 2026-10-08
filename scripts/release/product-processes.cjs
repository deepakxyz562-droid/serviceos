// PM2 configuration. Start the existing core service on port 3000 separately.
// CORE_API_URL is also consumed at build time by Next rewrites.
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
module.exports = {
  apps: ['bos', 'chatbotly', 'quoteflow', 'marketplace'].map(name => ({
    name: `serviceos-${name}`,
    cwd: path.join(root, 'apps', name),
    script: path.join(root, 'node_modules', 'next', 'dist', 'bin', 'next'),
    args: `start -p ${{ bos: 3001, chatbotly: 3002, quoteflow: 3004, marketplace: 3005 }[name]}`,
    env: { NODE_ENV: 'production' },
    autorestart: true,
    max_restarts: 10,
  })),
};
