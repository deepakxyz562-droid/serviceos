const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Allow Metro to watch & resolve shared helpers imported from repo-root/shared/
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), workspaceRoot]));
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  '@': path.resolve(projectRoot, 'src'),
};

if (config.watcher && config.watcher.healthCheck) {
  config.watcher.healthCheck.enabled = false;
}

// Unused @expo/vector-icons sets (>3 MB of font assets + glyph tables); keep only MaterialIcons & MaterialCommunityIcons.
const UNUSED_VECTOR_ICON_MODULES = new Set([
  './AntDesign',
  './Entypo',
  './EvilIcons',
  './Feather',
  './FontAwesome',
  './FontAwesome5',
  './FontAwesome6',
  './Fontisto',
  './Foundation',
  './Ionicons',
  './MaterialSymbols',
  './Octicons',
  './SimpleLineIcons',
  './Zocial',
]);

const emptyIconStub = path.resolve(projectRoot, 'scripts', 'empty-icon-family.js');
const prevResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    context.originModulePath &&
    context.originModulePath.includes('@expo') &&
    context.originModulePath.includes('vector-icons') &&
    UNUSED_VECTOR_ICON_MODULES.has(moduleName)
  ) {
    return { type: 'sourceFile', filePath: emptyIconStub };
  }
  if (typeof prevResolveRequest === 'function') {
    return prevResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
