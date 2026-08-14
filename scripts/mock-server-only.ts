// Preload script — mocks the `server-only` package for standalone bun scripts.
// In Next.js, the bundler replaces this module at build time. For standalone
// scripts (like our verification test), we mock it as an empty module so we
// can import server-only code directly.
import { plugin } from 'bun';

plugin({
  name: 'mock-server-only',
  setup(build) {
    // Intercept any import of 'server-only' and replace with an empty module
    build.onResolve({ filter: /^server-only$/ }, () => ({
      path: 'server-only-mock',
      namespace: 'mock-server-only-ns',
    }));
    build.onLoad({ filter: /.*/, namespace: 'mock-server-only-ns' }, () => ({
      contents: '// mocked: server-only is a no-op in standalone scripts',
      loader: 'js',
    }));
  },
});
