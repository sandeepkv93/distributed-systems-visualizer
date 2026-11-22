/* eslint-disable @typescript-eslint/no-require-imports */
const Module = require('node:module');
const path = require('node:path');

const distDir = process.env.TEST_DIST_DIR;

if (distDir) {
  const originalResolveFilename = Module._resolveFilename;
  Module._resolveFilename = function resolveWithAlias(request, parent, isMain, options) {
    if (typeof request === 'string' && request.startsWith('@/')) {
      const mapped = path.join(distDir, request.slice(2));
      return originalResolveFilename.call(this, mapped, parent, isMain, options);
    }
    return originalResolveFilename.call(this, request, parent, isMain, options);
  };
}
