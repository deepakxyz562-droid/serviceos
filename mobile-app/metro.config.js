const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

if (config.watcher && config.watcher.healthCheck) {
  config.watcher.healthCheck.enabled = false;
}

module.exports = withNativeWind(config, { input: './global.css' });
