import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  // Emit `.cjs` for the CommonJS build so consumers that `require()` this
  // package resolve a real CJS file (matching the `"main"`/`"require"`
  // exports in package.json) instead of a `.js` ESM file that Node treats
  // as ESM by default.
  outExtension({ format }) {
    return { js: format === 'cjs' ? '.cjs' : '.js' };
  },
});
