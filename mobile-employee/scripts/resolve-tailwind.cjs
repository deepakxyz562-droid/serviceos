const Module = require('module');
const path = require('path');

const localNodeModules = path.resolve(__dirname, '..', 'node_modules');
const origResolveFilename = Module._resolveFilename;

Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'tailwindcss' || request.startsWith('tailwindcss/')) {
    return origResolveFilename.call(this, request, {
      ...parent,
      paths: [localNodeModules, ...(parent?.paths || [])],
    }, isMain, options);
  }
  return origResolveFilename.apply(this, arguments);
};
