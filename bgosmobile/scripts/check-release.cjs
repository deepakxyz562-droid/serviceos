const fs = require('fs');
const path = require('path');

// Load .env if present in project root
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  try {
    const content = fs.readFileSync(envPath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch {}
}

// Production release defaults
if (!process.env.EXPO_PUBLIC_API_URL) process.env.EXPO_PUBLIC_API_URL = 'https://bgos.fieseros.com';
if (!process.env.EXPO_PUBLIC_WEB_URL) process.env.EXPO_PUBLIC_WEB_URL = 'https://bgos.fieseros.com';
if (!process.env.EXPO_PUBLIC_EAS_PROJECT_ID) process.env.EXPO_PUBLIC_EAS_PROJECT_ID = '30078807-9b75-42c3-97c3-41fb166c40f2';

const errors = [];
for (const name of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL']) {
  try {
    const url = new URL(process.env[name] || '');
    if (url.protocol !== 'https:' || url.username || url.password || url.hostname === 'localhost' || url.hostname === '127.0.0.1') throw new Error();
  } catch { errors.push(`${name} must be a public HTTPS URL.`); }
}
if (!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(process.env.EXPO_PUBLIC_EAS_PROJECT_ID || '')) errors.push('EXPO_PUBLIC_EAS_PROJECT_ID must be the real BGOS project UUID.');
for (const name of Object.keys(process.env)) {
  if (name.startsWith('EXPO_PUBLIC_') && /SECRET|SERVICE_ROLE|PRIVATE_KEY/.test(name)) errors.push(`${name} must not be bundled into the app.`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('BGOS public release configuration passed. Provider credentials and signed-device checks are separate.');
