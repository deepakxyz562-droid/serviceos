/* eslint-disable @typescript-eslint/no-require-imports */
const path = require('path');

// NativeWind v4 requires Tailwind CSS v3.
// In this monorepo, root Next.js uses Tailwind v4 while mobile-employee uses Tailwind v3.
// Since NativeWind is hoisted to root node_modules, we register a resolver hook for this
// process and any child processes spawned by NativeWind.
const hookPath = path.resolve(__dirname, 'scripts', 'resolve-tailwind.cjs');
require(hookPath);

const requireFlag = `-r "${hookPath}"`;
if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes(hookPath)) {
  process.env.NODE_OPTIONS = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ${requireFlag}` : requireFlag;
}

const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

if (config.watcher && config.watcher.healthCheck) {
  config.watcher.healthCheck.enabled = false;
}

module.exports = withNativeWind(config, {
  input: './global.css',
  configPath: path.resolve(__dirname, 'tailwind.config.ts'),
  disableTypeScriptGeneration: true,
});
