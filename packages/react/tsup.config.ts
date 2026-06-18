import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.tsx',
    nextjs: 'src/nextjs.tsx',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  external: ['react', 'react-dom', 'next'],
  treeshake: false,
  splitting: false,
  // Silence esbuild warnings about ignored "use client" directives
  esbuildOptions(options) {
    options.logOverride = {
      'this-is-ignored-during-bundling': 'silent',
    };
  },
  // Emit `.cjs` for the CommonJS build so consumers that `require()` this
  // package resolve a real CJS file (matching the `"main"`/`"require"`
  // exports in package.json) instead of a `.js` ESM file that Node treats
  // as ESM by default.
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
