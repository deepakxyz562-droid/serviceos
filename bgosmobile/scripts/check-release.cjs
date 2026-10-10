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
