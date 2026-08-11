const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Limit file watching to project source only (not node_modules) to avoid
// hitting the inotify watcher limit on systems with restricted fs.inotify.max_user_watches.
config.watcher.watchPaths = [
  path.resolve(__dirname, 'app'),
  path.resolve(__dirname, 'src'),
  path.resolve(__dirname, 'global.css'),
  path.resolve(__dirname, 'app.config.ts'),
  path.resolve(__dirname, 'babel.config.js'),
  path.resolve(__dirname, 'metro.config.js'),
  path.resolve(__dirname, 'tailwind.config.ts'),
];
config.watcher.healthCheck.enabled = false;

module.exports = withNativeWind(config, { input: './global.css' });
