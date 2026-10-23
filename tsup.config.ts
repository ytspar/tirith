import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  clean: true,
  // The `#!/usr/bin/env node` shebang comes from src/index.ts (esbuild preserves it on
  // line 1). Deps (commander/ink/react) stay external — resolved from node_modules at
  // runtime via the realpath, same as claude-tabs.
});
